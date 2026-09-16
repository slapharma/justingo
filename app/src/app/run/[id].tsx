import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Flag, Pause, Play, TriangleAlert, Volume2, VolumeX } from '../../icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RouteMap from '../../components/RouteMap';
import type { MapLine } from '../../components/RouteMap.types';
import SimPanel from '../../components/SimPanel';
import TurnIcon from '../../components/TurnIcon';
import { Button, EmptyState, IconButton, Stat } from '../../components/ui';
import { NavEngine, turnPhrase, type NavState } from '../../core/engine';
import { RunSimulator } from '../../core/simulator';
import type { LocationSample, Route } from '../../core/types';
import { duration, km, pace, shortDistance } from '../../format';
import { getSim, setSim, useSim } from '../../simControls';
import { newId, useRoute, useRuns, type RunRecord } from '../../store';
import { font, radius, runTheme as t, space } from '../../theme';
import { onSpoken, setMuted, speak, stopSpeaking } from '../../voice';

const TICK_MS = 250;
/** Metres to the side when the demo runner goes off route, and how fast it drifts there. */
const OFF_ROUTE_SIDEWAYS = 45;
const DRIFT_METRES_PER_SECOND = 4;
const SKIP_METRES = 500;
/** Trace points kept in history; plenty for drawing, small enough for local storage. */
const TRACE_POINTS = 400;

type Mode = 'demo' | 'gps';

export default function RunScreen() {
  const { id, mode: modeParam } = useLocalSearchParams<{ id: string; mode?: Mode }>();
  const { route, loaded } = useRoute(id);
  if (!route) {
    return (
      <View style={[styles.screen, { justifyContent: 'center' }]}>
        {loaded && <EmptyState icon={Flag} title="Route not found" body="Pick a route to run." action={<Button label="Browse routes" onPress={() => router.replace('/')} />} />}
      </View>
    );
  }
  return <ActiveRun route={route} mode={modeParam === 'gps' ? 'gps' : 'demo'} />;
}

function ActiveRun({ route, mode }: { route: Route; mode: Mode }) {
  const insets = useSafeAreaInsets();
  const sim = useSim();
  const { saveRun } = useRuns();
  const engine = useRef(new NavEngine(route)).current;
  const startedAt = useRef(Date.now()).current;
  const [nav, setNav] = useState<NavState>(engine.state);
  const [caption, setCaption] = useState('');
  const [muted, setMutedState] = useState(false);
  const [gpsPaused, setGpsPaused] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const ended = useRef(false);
  /** Set when the route is finished, so leaving the screen doesn't cut off the finish cue. */
  const completedRef = useRef(false);

  const paused = mode === 'demo' ? !sim.playing : gpsPaused;

  const handle = (sample: LocationSample) => {
    if (ended.current) return;
    const { state, spoken } = engine.update(sample);
    spoken.forEach(speak);
    setNav(state);
    if (state.finished) finish(state, true);
  };

  const finish = async (state: NavState, completed: boolean) => {
    if (ended.current) return;
    ended.current = true;
    completedRef.current = completed;
    if (!completed) stopSpeaking();
    if (state.distanceRun < 50) {
      // Opened from a link or a refresh there is no screen to go back to.
      if (router.canGoBack()) router.back();
      else router.replace('/');
      return;
    }
    const step = Math.max(1, Math.ceil(state.trace.length / TRACE_POINTS));
    const run: RunRecord = {
      id: newId('run'),
      routeId: route.id,
      routeName: route.name,
      startedAt,
      elapsedMs: state.elapsedMs,
      distanceRun: state.distanceRun,
      routeDistance: route.distance,
      avgPace: state.avgPace,
      splits: state.splits,
      trace: state.trace.filter((_, i) => i % step === 0 || i === state.trace.length - 1),
      completed,
      demo: mode === 'demo',
    };
    await saveRun(run);
    router.replace({ pathname: '/summary/[id]', params: { id: run.id } });
  };

  useEffect(() => onSpoken(setCaption), []);
  useEffect(
    () => () => {
      if (!completedRef.current) stopSpeaking();
    },
    [],
  );

  // Demo: a virtual runner on a timer. Simulated time advances `speed` times faster than real time.
  useEffect(() => {
    if (mode !== 'demo') return;
    const runner = new RunSimulator(route.path, getSim().pace);
    let skips = getSim().skipRequest;
    setSim({ active: true, playing: true, offRoute: false });
    const timer = setInterval(() => {
      const c = getSim();
      if (c.skipRequest !== skips) {
        skips = c.skipRequest;
        // Keep the jump physically plausible so the engine treats it as running, not a GPS glitch.
        runner.time += (SKIP_METRES / 1000) * c.pace * 1000;
        runner.seek(runner.along + SKIP_METRES);
        handle(runner.sample());
      }
      if (!c.playing || runner.done) return;
      const seconds = (TICK_MS / 1000) * c.speed;
      runner.pace = c.pace;
      const target = c.offRoute ? OFF_ROUTE_SIDEWAYS : 0;
      const drift = DRIFT_METRES_PER_SECOND * seconds;
      runner.sideways += Math.max(-drift, Math.min(drift, target - runner.sideways));
      // Off route the runner stands still along the route (as if lost), drifting sideways.
      if (c.offRoute || runner.sideways > 1) {
        runner.time += seconds * 1000;
        handle(runner.sample());
      } else {
        handle(runner.advance(seconds));
      }
    }, TICK_MS);
    return () => {
      clearInterval(timer);
      setSim({ active: false, offRoute: false });
    };
    // One simulator per mounted run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GPS: foreground location updates. Background tracking with the screen locked is phase 5.
  useEffect(() => {
    if (mode !== 'gps') return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('Location permission is needed to guide you along the route.');
        return;
      }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 2 },
        (loc) => {
          // Fixes worse than 50 m would trigger false off-route warnings; wait for a better one.
          if ((loc.coords.accuracy ?? 0) > 50) return;
          handle({ lng: loc.coords.longitude, lat: loc.coords.latitude, time: loc.timestamp });
        },
      );
      if (cancelled) sub.remove();
    })().catch((e: unknown) => setGpsError(e instanceof Error ? e.message : 'Could not start GPS.'));
    return () => {
      cancelled = true;
      sub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePause = () => {
    if (mode === 'demo') {
      setSim({ playing: !sim.playing });
      return;
    }
    if (gpsPaused) engine.resume(Date.now());
    else engine.pause(Date.now());
    setGpsPaused(!gpsPaused);
  };

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  const lines = useMemo<MapLine[]>(
    () => [
      { id: route.id, path: route.path, emphasis: 'primary' },
      ...(nav.trace.length > 1 ? [{ id: 'trace', path: nav.trace, emphasis: 'trace' as const }] : []),
    ],
    [route, nav.trace],
  );

  const waiting = !nav.started;
  const next = nav.nextTurn;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.sm }]}>
      {/* Next instruction: the one thing a runner glances at. */}
      {nav.offRoute ? (
        <View style={[styles.instruction, { backgroundColor: t.danger }]} accessibilityLiveRegion="assertive">
          <TriangleAlert size={56} color={t.onDanger} strokeWidth={2.5} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.instructionBig, { color: t.onDanger }]}>Off route</Text>
            <Text style={[styles.instructionText, { color: t.onDanger }]}>Head back to the orange line · {shortDistance(nav.offset)} away</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.instruction, { backgroundColor: t.accent }]} accessibilityLiveRegion="polite">
          <TurnIcon direction={waiting ? 'straight' : next ? next.direction : 'finish'} size={64} color={t.onAccent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.instructionBig, { color: t.onAccent }]}>{waiting ? 'Find the route' : shortDistance(next ? nav.distanceToNextTurn : nav.remaining)}</Text>
            <Text numberOfLines={2} style={[styles.instructionText, { color: t.onAccent }]}>
              {waiting
                ? mode === 'gps'
                  ? 'Head to any point on the route to begin guidance'
                  : 'Starting…'
                : next
                  ? turnPhrase(next).replace(/^./, (c) => c.toUpperCase())
                  : 'To the finish'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.caption} accessibilityLiveRegion="polite">
        {muted ? <VolumeX size={16} color={t.muted} /> : <Volume2 size={16} color={t.accentText} />}
        <Text numberOfLines={2} style={styles.captionText}>
          {caption || (gpsError ?? 'Voice directions will play here.')}
        </Text>
      </View>

      <RouteMap
        dark
        lines={lines}
        pins={[{ id: 'start', at: route.path[0], kind: 'start' }]}
        runner={nav.trace.length ? nav.position : null}
        follow={nav.trace.length > 0}
        fitKey={route.id}
        style={styles.map}
        label="Map following your position along the route"
      />

      <View style={styles.stats}>
        <Stat theme={t} label="Time" value={duration(nav.elapsedMs)} large />
        <Stat theme={t} label="Distance" value={km(nav.distanceRun, 2)} unit="km" large />
      </View>
      <View style={styles.stats}>
        <Stat theme={t} label="Pace" value={pace(nav.currentPace ?? nav.avgPace)} unit="/km" />
        <Stat theme={t} label="Remaining" value={km(nav.remaining, 1)} unit="km" />
        <Stat theme={t} label="Finish in" value={nav.etaMs !== null ? duration(nav.etaMs) : '–'} />
      </View>

      {mode === 'demo' && !sim.panelVisible && (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          <SimPanel compact />
        </View>
      )}

      <View style={[styles.controls, { paddingBottom: insets.bottom + space.md }]}>
        {confirmEnd ? (
          <>
            <Button theme={t} variant="secondary" label="Keep going" onPress={() => setConfirmEnd(false)} style={{ flex: 1 }} size="lg" />
            <Button theme={t} variant="danger" label="End run" onPress={() => finish(engine.state, false)} style={{ flex: 1 }} size="lg" />
          </>
        ) : (
          <>
            <IconButton theme={t} icon={muted ? VolumeX : Volume2} onPress={toggleMute} label={muted ? 'Unmute voice' : 'Mute voice'} active={muted} />
            <Button theme={t} icon={paused ? Play : Pause} label={paused ? 'Resume' : 'Pause'} onPress={togglePause} style={{ flex: 1 }} size="lg" />
            <Button theme={t} variant="secondary" icon={Flag} label="End" accessibilityLabel="End run" onPress={() => setConfirmEnd(true)} size="lg" />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  instruction: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.md, padding: space.lg, borderRadius: radius.lg },
  instructionBig: { fontFamily: font.display, fontSize: 48, lineHeight: 50, textTransform: 'uppercase', fontVariant: ['tabular-nums'] },
  instructionText: { fontFamily: font.bodyBold, fontSize: 18, lineHeight: 23 },
  caption: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, minHeight: 52 },
  captionText: { flex: 1, fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 20, color: t.ink },
  map: { flex: 1, marginHorizontal: space.md, borderRadius: radius.lg },
  stats: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingTop: space.md },
});
