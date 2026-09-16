import { cumulativeDistances, haversine, pointAlong, project } from './geo.ts';
import type { LngLat, LocationSample, Route, Turn, TurnDirection } from './types.ts';

export type CueKind = 'start' | 'turn-far' | 'turn-near' | 'message' | 'halfway' | 'finish';

export interface Cue {
  /** Metres along the route at which the cue is spoken. */
  at: number;
  kind: CueKind;
  text: string;
  /** Index into route.turns for turn cues. */
  turn?: number;
}

export const FAR_CUE_METRES = 200;
export const NEAR_CUE_METRES = 30;
/** A second turn this close after the first is announced together with it ("then turn right"). */
export const CHAIN_METRES = 80;
export const OFF_ROUTE_METRES = 30;
export const BACK_ON_ROUTE_METRES = 20;
/** A cue we passed by more than this (a GPS jump, a rejoin) is dropped rather than spoken late. */
const STALE_CUE_METRES = 60;
const OFF_ROUTE_REMINDER_MS = 45_000;
/** Faster than this between two samples is a GPS glitch, not running. */
const MAX_PLAUSIBLE_SPEED = 12;

const PHRASES: Record<TurnDirection, string> = {
  left: 'turn left',
  right: 'turn right',
  'slight left': 'bear left',
  'slight right': 'bear right',
  'sharp left': 'turn sharp left',
  'sharp right': 'turn sharp right',
  uturn: 'turn around',
  straight: 'continue straight',
};

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function turnPhrase(turn: Turn): string {
  const phrase = PHRASES[turn.direction];
  return turn.onto && turn.direction !== 'uturn' ? `${phrase} onto ${turn.onto}` : phrase;
}

/** Speakable distance: "200 metres", "1.5 kilometres". Rounded to what a runner can use. */
export function spokenDistance(metres: number): string {
  if (metres >= 1000) {
    const km = Math.round(metres / 100) / 10;
    return `${km} ${km === 1 ? 'kilometre' : 'kilometres'}`;
  }
  const rounded = metres >= 100 ? Math.round(metres / 50) * 50 : Math.round(metres / 10) * 10;
  return `${rounded} metres`;
}

/** Pace for speech, "5 minutes 30 per kilometre". */
export function spokenPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return s === 0 ? `${m} minutes per kilometre` : `${m} minutes ${s} per kilometre`;
}

/**
 * Every cue on the route, in order of distance. Pure function of the route, so the same list is
 * shown on the route detail screen and spoken during the run.
 */
export function buildCues(route: Route): Cue[] {
  const cues: Cue[] = [];
  const { turns, distance } = route;

  cues.push({
    at: 0,
    kind: 'start',
    text: `Starting ${route.name}. ${spokenDistance(distance)}. Enjoy your run.`,
  });

  // Turns already announced as the "then ..." half of a chained cue.
  const chained = new Set<number>();

  turns.forEach((turn, i) => {
    const prev = turns[i - 1];
    const next = turns[i + 1];

    // Already spoken as the tail of the previous turn's cue: no cue of its own, and it does not
    // start a chain, so chains stay in pairs and the next turn is announced normally.
    if (chained.has(i)) return;

    // The far warning must not land before the previous turn is behind the runner, or it would
    // describe a turn two turns away.
    const earliest = prev ? prev.at + NEAR_CUE_METRES : 0;
    const farAt = Math.max(earliest, turn.at - FAR_CUE_METRES);
    const lead = turn.at - farAt;
    if (lead >= 80 && turn.at > FAR_CUE_METRES / 2) {
      cues.push({
        at: farAt,
        kind: 'turn-far',
        turn: i,
        text: `In ${spokenDistance(lead)}, ${turnPhrase(turn)}.`,
      });
    }

    let text = capitalise(turnPhrase(turn));
    if (next && next.at - turn.at <= CHAIN_METRES) {
      text += `, then ${PHRASES[next.direction]}`;
      chained.add(i + 1);
    }
    cues.push({ at: Math.max(0, turn.at - NEAR_CUE_METRES), kind: 'turn-near', turn: i, text: `${text}.` });
  });

  if (distance >= 1500) {
    cues.push({ at: distance / 2, kind: 'halfway', text: 'Halfway there. Keep it up.' });
  }
  for (const m of route.messages) cues.push({ at: m.at, kind: 'message', text: m.text });
  cues.push({
    at: Math.max(0, distance - 15),
    kind: 'finish',
    text: `You've finished ${route.name}. Great run.`,
  });

  // Stable sort keeps a turn's far cue ahead of its near cue when they share a distance.
  return cues.map((c, i) => ({ c, i })).sort((a, b) => a.c.at - b.c.at || a.i - b.i).map((x) => x.c);
}

export interface NavState {
  started: boolean;
  finished: boolean;
  /** Metres along the route the runner has reached. Never goes backwards. */
  along: number;
  /** Metres from the runner to the route. */
  offset: number;
  offRoute: boolean;
  /** Snapped position on the route. */
  snapped: LngLat;
  position: LngLat;
  nextTurn: Turn | null;
  nextTurnIndex: number;
  distanceToNextTurn: number;
  remaining: number;
  /** Metres actually covered, from raw GPS, including any detour. */
  distanceRun: number;
  elapsedMs: number;
  /** Seconds per km over the whole run, null until there is enough distance to mean anything. */
  avgPace: number | null;
  /** Seconds per km over the last ~30 s. */
  currentPace: number | null;
  /** Estimated milliseconds to finish at average pace. */
  etaMs: number | null;
  /** Milliseconds taken for each completed kilometre. */
  splits: number[];
  trace: LngLat[];
}

export interface UpdateResult {
  state: NavState;
  /** Phrases to speak now, in order. */
  spoken: string[];
}

export class NavEngine {
  readonly route: Route;
  readonly cues: Cue[];
  private readonly cumulative: number[];
  private readonly fired: boolean[];
  private samples: LocationSample[] = [];
  private offStreak = 0;
  private lastOffReminder = 0;
  private splitsAnnounced = 0;
  private pausedAt: number | null = null;
  private pausedTotal = 0;
  /** The next sample follows a pause, so the gap since the last one is not distance run. */
  private resumed = false;
  state: NavState;

  constructor(route: Route) {
    this.route = route;
    this.cues = buildCues(route);
    this.fired = this.cues.map(() => false);
    this.cumulative = cumulativeDistances(route.path);
    this.state = {
      started: false,
      finished: false,
      along: 0,
      offset: 0,
      offRoute: false,
      snapped: route.path[0],
      position: route.path[0],
      nextTurn: route.turns[0] ?? null,
      nextTurnIndex: 0,
      distanceToNextTurn: route.turns[0]?.at ?? route.distance,
      remaining: route.distance,
      distanceRun: 0,
      elapsedMs: 0,
      avgPace: null,
      currentPace: null,
      etaMs: null,
      splits: [],
      trace: [],
    };
  }

  /** Stop the clock. Samples arriving while paused are ignored. */
  pause(time: number) {
    this.pausedAt ??= time;
  }

  resume(time: number) {
    if (this.pausedAt === null) return;
    // Elapsed counts from the first fix, so a pause taken before it (waiting for GPS) must not be
    // subtracted from time that was never counted.
    if (this.samples.length > 0) this.pausedTotal += time - this.pausedAt;
    this.pausedAt = null;
    // Whatever the runner did while paused is not part of the run: restart distance from here.
    this.resumed = true;
  }

  get paused() {
    return this.pausedAt !== null;
  }

  update(sample: LocationSample): UpdateResult {
    const spoken: string[] = [];
    if (this.pausedAt !== null) return { state: this.state, spoken };
    const s = { ...this.state };
    const p: LngLat = [sample.lng, sample.lat];
    const last = this.resumed ? undefined : this.samples[this.samples.length - 1];
    this.resumed = false;

    if (last) {
      const d = haversine([last.lng, last.lat], p);
      const dt = (sample.time - last.time) / 1000;
      if (dt <= 0 || d / dt > MAX_PLAUSIBLE_SPEED) return { state: this.state, spoken };
      s.distanceRun += d;
    }
    this.samples.push(sample);
    s.trace = [...s.trace, p];
    s.position = p;
    s.elapsedMs = sample.time - this.samples[0].time - this.pausedTotal;

    // Once started, search just behind and ahead of progress, so the return leg of an out-and-back
    // is not matched to the outbound leg. Off route, look further ahead so a runner who detours
    // round a closed path can rejoin later on without being dragged back.
    // Before the run starts, the runner can join anywhere: prefer the start of the route (on a loop
    // the finish is right beside it, and matching that would end the run at once), and search the
    // whole route only if they are not near the start.
    let proj;
    if (s.started) {
      const ahead = s.offRoute ? 1500 : 150;
      proj = project(this.route.path, this.cumulative, p, s.along - 30, s.along + ahead);
    } else {
      proj = project(this.route.path, this.cumulative, p, -30, 300);
      if (proj.offset > OFF_ROUTE_METRES) proj = project(this.route.path, this.cumulative, p);
    }
    s.offset = proj.offset;

    if (proj.offset > OFF_ROUTE_METRES) {
      this.offStreak++;
      // Two samples in a row, so a single noisy fix doesn't trigger a warning.
      if (this.offStreak >= 2 && !s.offRoute && s.started) {
        s.offRoute = true;
        this.lastOffReminder = sample.time;
        spoken.push("You're off route. Head back to the route.");
      } else if (s.offRoute && sample.time - this.lastOffReminder >= OFF_ROUTE_REMINDER_MS) {
        this.lastOffReminder = sample.time;
        spoken.push('Still off route.');
      }
    } else {
      this.offStreak = 0;
      if (s.offRoute && proj.offset <= BACK_ON_ROUTE_METRES) {
        s.offRoute = false;
        spoken.push('Back on route.');
      }
      if (!s.offRoute) {
        s.along = Math.max(s.along, proj.along);
        s.snapped = pointAlong(this.route.path, this.cumulative, s.along);
        s.started = true;
      }
    }

    if (s.started) {
      this.cues.forEach((cue, i) => {
        if (this.fired[i] || cue.at > s.along) return;
        this.fired[i] = true;
        const stale = s.along - cue.at > STALE_CUE_METRES && cue.kind !== 'finish';
        if (!stale) spoken.push(cue.text);
      });
    }

    const km = Math.floor(s.distanceRun / 1000);
    const elapsedSec = s.elapsedMs / 1000;
    s.avgPace = s.distanceRun >= 100 ? elapsedSec / (s.distanceRun / 1000) : null;
    if (km > this.splitsAnnounced && s.avgPace) {
      this.splitsAnnounced = km;
      const previous = s.splits.reduce((a, b) => a + b, 0);
      s.splits = [...s.splits, s.elapsedMs - previous];
      spoken.push(`${spokenDistance(km * 1000)}. Average pace ${spokenPace(s.avgPace)}.`);
    }

    const windowStart = this.samples.findIndex((x) => sample.time - x.time <= 30_000);
    const recent = this.samples.slice(windowStart);
    if (recent.length >= 2) {
      let d = 0;
      for (let i = 1; i < recent.length; i++) {
        d += haversine([recent[i - 1].lng, recent[i - 1].lat], [recent[i].lng, recent[i].lat]);
      }
      const t = (recent[recent.length - 1].time - recent[0].time) / 1000;
      s.currentPace = d >= 20 ? t / (d / 1000) : null;
    }

    s.remaining = Math.max(0, this.route.distance - s.along);
    s.etaMs = s.avgPace ? (s.remaining / 1000) * s.avgPace * 1000 : null;
    const idx = this.route.turns.findIndex((t) => t.at > s.along);
    s.nextTurnIndex = idx;
    s.nextTurn = idx >= 0 ? this.route.turns[idx] : null;
    s.distanceToNextTurn = idx >= 0 ? this.route.turns[idx].at - s.along : s.remaining;
    if (s.along >= this.route.distance - 15) s.finished = true;

    this.state = s;
    return { state: s, spoken };
  }
}
