// Demo of health sync: charts and cards that show wearable data on runs and the profile. Every
// figure comes from healthDemo.ts, which is placeholder data, so each block carries a "Demo" badge.
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { duration, km } from '../format';
import { demoRunHealth, trendText, WELLNESS, ZONE_LIMITS, ZONE_NAMES, type WellnessMetric } from '../healthDemo';
import { HeartPulse, Watch } from '../icons';
import { font, radius, space, useTheme } from '../theme';
import { DemoButton } from './demo';
import { Badge, Card, Heading, Stat } from './ui';

const CHART_MIN = 80;
const CHART_MAX = 190;

/** Heart rate line over the run, drawn over alternating bands for the five zones. */
export function HeartRateChart({ series, height = 120 }: { series: number[]; height?: number }) {
  const theme = useTheme();
  if (series.length < 2) return null;
  const w = 300;
  const y = (bpm: number) => height - ((Math.min(CHART_MAX, Math.max(CHART_MIN, bpm)) - CHART_MIN) / (CHART_MAX - CHART_MIN)) * height;
  const x = (i: number) => (i / (series.length - 1)) * w;
  const line = series.map((b, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(b).toFixed(1)}`).join(' ');
  const bounds = [CHART_MIN, ...ZONE_LIMITS, CHART_MAX];

  return (
    <View accessible accessibilityLabel={`Heart rate chart, from ${Math.min(...series)} to ${Math.max(...series)} beats per minute`}>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
        {bounds.slice(0, -1).map((low, i) => (
          <Rect key={low} x={0} y={y(bounds[i + 1])} width={w} height={y(low) - y(bounds[i + 1])} fill={i % 2 ? theme.surfaceAlt : theme.surface} />
        ))}
        <Path d={line} fill="none" stroke={theme.accent} strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </Svg>
    </View>
  );
}

/** Time in each heart rate zone, hardest first. Zones are labelled in text, not only by shade. */
export function ZoneBars({ zoneMs }: { zoneMs: number[] }) {
  const theme = useTheme();
  const total = zoneMs.reduce((s, ms) => s + ms, 0) || 1;
  const shades = [theme.routeDim, theme.routeDim, theme.accent, theme.accent, theme.contrast];
  return (
    <View style={{ gap: space.sm }}>
      {zoneMs
        .map((ms, i) => ({ ms, i }))
        .reverse()
        .map(({ ms, i }) => {
          const share = ms / total;
          return (
            <View key={i} style={styles.zoneRow} accessible accessibilityLabel={`Zone ${i + 1}, ${ZONE_NAMES[i]}: ${duration(ms)}, ${Math.round(share * 100)} percent`}>
              <Text style={[styles.zoneLabel, { color: theme.ink }]}>
                Z{i + 1} <Text style={{ color: theme.muted, fontFamily: font.bodyMedium }}>{ZONE_NAMES[i]}</Text>
              </Text>
              <View style={[styles.zoneTrack, { backgroundColor: theme.surfaceAlt }]}>
                <View style={{ width: `${Math.round(share * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: shades[i] }} />
              </View>
              <Text style={[styles.zoneTime, { color: theme.ink }]}>{duration(ms)}</Text>
            </View>
          );
        })}
    </View>
  );
}

export function Sparkline({ values, width = 72, height = 24, color }: { values: number[]; width?: number; height?: number; color?: string }) {
  const theme = useTheme();
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * (width - 4) + 2).toFixed(1)},${(height - 2 - ((v - min) / range) * (height - 4)).toFixed(1)}`).join(' ');
  return (
    <View aria-hidden>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={d} fill="none" stroke={color ?? theme.accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function metricValue(m: WellnessMetric) {
  const v = m.week[m.week.length - 1];
  if (m.id === 'sleep') return `${Math.floor(v)} h ${String(Math.round((v % 1) * 60)).padStart(2, '0')} m`;
  return v.toLocaleString('en-GB');
}

/** Today's wellness figures from the connected tracker, each with a seven-day sparkline. */
export function WellnessGrid() {
  const theme = useTheme();
  return (
    <View style={styles.grid}>
      {WELLNESS.map((m) => {
        const trend = trendText(m);
        return (
          <Card key={m.id} style={styles.tile}>
            <Text style={[styles.tileLabel, { color: theme.muted }]}>{m.label}</Text>
            <Text style={[styles.tileValue, { color: theme.ink }]}>
              {metricValue(m)}
              {m.unit && m.id !== 'sleep' ? <Text style={[styles.tileUnit, { color: theme.muted }]}> {m.unit}</Text> : null}
            </Text>
            <Sparkline values={m.week} width={120} />
            <Text style={[styles.tileTrend, { color: trend.good ? theme.success : theme.muted }]}>{trend.text}</Text>
          </Card>
        );
      })}
    </View>
  );
}

/** Wearable data attached to a finished run: heart rate, zones, cadence, power and training effect. */
export function RunHealthSection({ run }: { run: { id: string; elapsedMs: number; distanceRun: number } }) {
  const theme = useTheme();
  const h = demoRunHealth(run);
  if (!h) return null;
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.titleRow}>
        <Heading size={22}>Health data</Heading>
        <Badge label="Demo" />
      </View>
      <View style={styles.source}>
        <Watch color={theme.muted} size={16} />
        <Text style={[styles.sourceText, { color: theme.muted }]}>
          From {h.device} · {km(run.distanceRun, 2)} km matched to this run
        </Text>
      </View>

      <Card style={{ gap: space.lg }}>
        <View style={styles.row}>
          <Stat label="Avg HR" value={String(h.avgHr)} unit="bpm" large />
          <Stat label="Max HR" value={String(h.maxHr)} unit="bpm" large />
        </View>
        <HeartRateChart series={h.hrSeries} />
        <View style={styles.row}>
          <Stat label="Cadence" value={String(h.cadence)} unit="spm" />
          <Stat label="Power" value={String(h.power)} unit="W" />
          <Stat label="Calories" value={String(h.calories)} />
        </View>
      </Card>

      <Card style={{ gap: space.md }}>
        <Text style={[styles.cardTitle, { color: theme.ink }]}>Time in heart rate zones</Text>
        <ZoneBars zoneMs={h.zoneMs} />
      </Card>

      <Card style={{ gap: space.lg }}>
        <Text style={[styles.cardTitle, { color: theme.ink }]}>Training effect</Text>
        <View style={styles.row}>
          <Stat label="Load" value={String(h.trainingLoad)} />
          <Stat label="Aerobic" value={h.aerobicEffect.toFixed(1)} unit="/ 5" />
        </View>
        <View style={styles.row}>
          <Stat label="VO2 max" value={String(h.vo2max)} />
          <Stat label="Recovery" value={String(h.recoveryHours)} unit="h" />
        </View>
      </Card>

      <DemoButton label="Change health source" icon={HeartPulse} />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceText: { fontFamily: font.bodyMedium, fontSize: 14, flexShrink: 1 },
  row: { flexDirection: 'row', gap: space.md },
  cardTitle: { fontFamily: font.bodyBold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  zoneLabel: { fontFamily: font.bodyBold, fontSize: 13, width: 104 },
  zoneTrack: { flex: 1, height: 10, borderRadius: 4, overflow: 'hidden' },
  zoneTime: { fontFamily: font.display, fontSize: 18, width: 56, textAlign: 'right', fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { flexBasis: '47%', flexGrow: 1, gap: 4, padding: space.md, borderRadius: radius.md },
  tileLabel: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  tileValue: { fontFamily: font.display, fontSize: 30, fontVariant: ['tabular-nums'] },
  tileUnit: { fontFamily: font.bodyMedium, fontSize: 14 },
  tileTrend: { fontFamily: font.bodyMedium, fontSize: 13 },
});
