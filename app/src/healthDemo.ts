// Placeholder health and wearable data for the demo of health sync (Apple Health, Health Connect,
// Garmin and other trackers). Nothing here is read from a device: every number is invented, and run
// numbers are derived from the run's id so the same run always shows the same figures. Plain
// TypeScript with no React Native imports, so it is unit tested under `node --test`.

export type HeartRateZone = 1 | 2 | 3 | 4 | 5;

export interface RunHealth {
  device: string;
  avgHr: number;
  maxHr: number;
  /** Heart rate samples evenly spaced through the run, beats per minute. */
  hrSeries: number[];
  /** Milliseconds spent in each zone, Z1 to Z5. Sums to the run's elapsed time. */
  zoneMs: [number, number, number, number, number];
  /** Steps per minute. */
  cadence: number;
  calories: number;
  /** Watts, as reported by running power meters and newer watches. */
  power: number;
  trainingLoad: number;
  /** Aerobic training effect, 0 to 5. */
  aerobicEffect: number;
  vo2max: number;
  recoveryHours: number;
}

/** Upper bound (bpm) of zones 1 to 4, for a demo runner with a max heart rate of 190. Zone 5 is above. */
export const ZONE_LIMITS = [114, 133, 152, 171] as const;
/** Same names as the website's health section, so the preview and the app match. */
export const ZONE_NAMES = ['Warm-up', 'Easy', 'Aerobic', 'Threshold', 'Maximum'] as const;

export function zoneFor(bpm: number): HeartRateZone {
  const i = ZONE_LIMITS.findIndex((limit) => bpm < limit);
  return (i === -1 ? 5 : i + 1) as HeartRateZone;
}

/** Deterministic 0..1 generator seeded from a string (FNV-1a hash into mulberry32). */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HR_SAMPLES = 60;
const DEVICES_FOR_RUNS = ['Garmin Forerunner 265', 'Apple Watch Series 10', 'COROS Pace 3'];
/** Runs shorter than this get no health figures: a watch has nothing meaningful to report. */
export const MIN_HEALTH_MS = 60_000;

/** Invented but plausible health figures for one run, or null for a run under a minute. */
export function demoRunHealth(run: { id: string; elapsedMs: number; distanceRun: number }): RunHealth | null {
  if (!(run.elapsedMs >= MIN_HEALTH_MS)) return null;
  const rand = seeded(run.id);
  const minutes = Math.max(0, run.elapsedMs) / 60000;
  const km = Math.max(0, run.distanceRun) / 1000;

  // Warm up from resting towards a steady effort, with slow drift and small noise.
  const steady = 142 + Math.round(rand() * 16);
  const hrSeries = Array.from({ length: HR_SAMPLES }, (_, i) => {
    const p = i / (HR_SAMPLES - 1);
    const warmUp = 1 - Math.exp(-p * 8);
    const drift = p * 10;
    const wave = Math.sin(p * Math.PI * 6 + rand()) * 4;
    return Math.round(92 + (steady - 92) * warmUp + drift + wave + (rand() - 0.5) * 4);
  });

  const zoneCounts = [0, 0, 0, 0, 0];
  for (const bpm of hrSeries) zoneCounts[zoneFor(bpm) - 1]++;
  const elapsed = Math.max(0, run.elapsedMs);
  const zoneMs = zoneCounts.map((n) => Math.round((n / HR_SAMPLES) * elapsed)) as RunHealth['zoneMs'];
  // Rounding can leave a few milliseconds over or under; settle them on the busiest zone.
  const busiest = zoneMs.indexOf(Math.max(...zoneMs));
  zoneMs[busiest] += elapsed - zoneMs.reduce((s, ms) => s + ms, 0);

  const avgHr = Math.round(hrSeries.reduce((s, b) => s + b, 0) / HR_SAMPLES);
  return {
    device: DEVICES_FOR_RUNS[Math.floor(rand() * DEVICES_FOR_RUNS.length)],
    avgHr,
    maxHr: Math.max(...hrSeries),
    hrSeries,
    zoneMs,
    cadence: 164 + Math.round(rand() * 14),
    calories: Math.round(km * (62 + rand() * 8)),
    power: 238 + Math.round(rand() * 40),
    trainingLoad: Math.round(minutes * (1.6 + rand() * 0.8)),
    aerobicEffect: Math.min(5, Math.round((1.5 + minutes / 25 + rand() * 0.6) * 10) / 10),
    vo2max: 50 + Math.round(rand() * 3),
    recoveryHours: Math.min(72, Math.round(6 + minutes * 0.35)),
  };
}

export interface HealthSource {
  id: string;
  name: string;
  /** What the connection brings in. */
  detail: string;
  status: 'connected' | 'available';
}

/** Trackers the demo shows. Names only, no logos. Garmin is shown as already connected. */
export const HEALTH_SOURCES: HealthSource[] = [
  { id: 'garmin', name: 'Garmin Connect', detail: 'Runs, heart rate, training load, sleep and HRV', status: 'connected' },
  { id: 'apple', name: 'Apple Health and Apple Watch', detail: 'Workouts, heart rate, VO2 max, sleep and steps', status: 'available' },
  { id: 'health-connect', name: 'Health Connect', detail: 'Samsung, Pixel Watch and other Android wearables', status: 'available' },
  { id: 'coros', name: 'COROS', detail: 'Runs, heart rate and training load', status: 'available' },
  { id: 'polar', name: 'Polar', detail: 'Runs, heart rate, recovery and sleep', status: 'available' },
  { id: 'suunto', name: 'Suunto', detail: 'Runs, heart rate and recovery', status: 'available' },
  { id: 'fitbit', name: 'Fitbit', detail: 'Heart rate, sleep and steps', status: 'available' },
  { id: 'whoop', name: 'WHOOP', detail: 'Strain, recovery, HRV and sleep', status: 'available' },
  { id: 'oura', name: 'Oura', detail: 'Readiness, HRV, resting heart rate and sleep', status: 'available' },
];

export interface WellnessMetric {
  id: string;
  label: string;
  unit: string;
  /** Last seven days, oldest first. The last value is today. */
  week: number[];
  /** Whether a lower number is the better direction, for the trend wording. */
  lowerIsBetter: boolean;
}

export const WELLNESS: WellnessMetric[] = [
  { id: 'resting-hr', label: 'Resting HR', unit: 'bpm', week: [51, 50, 50, 49, 50, 48, 48], lowerIsBetter: true },
  { id: 'hrv', label: 'HRV', unit: 'ms', week: [55, 58, 54, 60, 59, 61, 62], lowerIsBetter: false },
  { id: 'sleep', label: 'Sleep', unit: 'h', week: [6.8, 7.1, 6.4, 7.6, 7.2, 8.1, 7.5], lowerIsBetter: false },
  { id: 'steps', label: 'Steps', unit: '', week: [8420, 12050, 6980, 10400, 9120, 14300, 11240], lowerIsBetter: false },
];

export const TRAINING = {
  status: 'Productive',
  vo2max: 51,
  /** Seven-day acute load and the range that counts as optimal for this runner. */
  acuteLoad: 612,
  optimalLoad: [480, 720] as [number, number],
  recoveryHours: 22,
  /** Weekly load for the last six weeks, oldest first. */
  weeklyLoad: [410, 455, 520, 380, 575, 612],
  weight: 71.4,
  bodyFat: 14.2,
};

export interface WatchRun {
  id: string;
  name: string;
  device: string;
  /** Days before today. */
  daysAgo: number;
  distance: number;
  elapsedMs: number;
  avgHr: number;
}

/** Runs recorded on a watch without JustinGo, as they would appear after a sync. */
export const WATCH_RUNS: WatchRun[] = [
  { id: 'watch-1', name: 'Morning run', device: 'Garmin Forerunner 265', daysAgo: 1, distance: 8120, elapsedMs: 2_690_000, avgHr: 149 },
  { id: 'watch-2', name: 'Intervals', device: 'Garmin Forerunner 265', daysAgo: 3, distance: 6400, elapsedMs: 1_980_000, avgHr: 163 },
  { id: 'watch-3', name: 'Long run', device: 'Apple Watch Series 10', daysAgo: 6, distance: 16_250, elapsedMs: 5_560_000, avgHr: 144 },
];

/** "Up 3 on last week" style wording for a seven-day series, comparing today with the first day. */
export function trendText(metric: WellnessMetric): { text: string; good: boolean } {
  const first = metric.week[0];
  const last = metric.week[metric.week.length - 1];
  const diff = Math.round((last - first) * 10) / 10;
  if (diff === 0) return { text: 'Steady this week', good: true };
  const good = metric.lowerIsBetter ? diff < 0 : diff > 0;
  const unit = metric.unit ? ` ${metric.unit}` : '';
  return { text: `${diff > 0 ? 'Up' : 'Down'} ${Math.abs(diff).toLocaleString('en-GB')}${unit} this week`, good };
}
