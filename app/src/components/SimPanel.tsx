import { FastForward, Pause, Play, TriangleAlert } from '../icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PACES, SPEEDS, setSim, useSim } from '../simControls';
import { font, radius, runTheme, space } from '../theme';

const t = runTheme;

function Segmented<T extends number>({ options, value, onChange, label }: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            aria-checked={selected}
            style={[styles.segment, selected && { backgroundColor: t.accent }]}
          >
            <Text style={[styles.segmentText, { color: selected ? t.onAccent : t.ink }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Drives the virtual runner. `compact` is the single-row version shown inside the run screen when
 * there is no room for the side panel (narrow windows, phones opening the web preview).
 */
export default function SimPanel({ compact }: { compact?: boolean }) {
  const sim = useSim();

  const playButton = (
    <Pressable
      onPress={() => setSim({ playing: !sim.playing })}
      accessibilityRole="button"
      accessibilityLabel={sim.playing ? 'Pause the virtual runner' : 'Play the virtual runner'}
      style={[styles.round, { backgroundColor: t.accent }]}
    >
      {sim.playing ? <Pause color={t.onAccent} size={20} strokeWidth={2.5} /> : <Play color={t.onAccent} size={20} strokeWidth={2.5} />}
    </Pressable>
  );
  const offRouteButton = (
    <Pressable
      onPress={() => setSim({ offRoute: !sim.offRoute })}
      accessibilityRole="switch"
      aria-checked={sim.offRoute}
      accessibilityLabel="Take the runner off route"
      style={[styles.pill, sim.offRoute && { backgroundColor: t.danger, borderColor: t.danger }]}
    >
      <TriangleAlert color={sim.offRoute ? t.onDanger : t.ink} size={16} strokeWidth={2.5} />
      <Text style={[styles.pillText, { color: sim.offRoute ? t.onDanger : t.ink }]}>{compact ? 'Off route' : sim.offRoute ? 'Rejoin route' : 'Go off route'}</Text>
    </Pressable>
  );
  const skipButton = (
    <Pressable
      onPress={() => setSim({ skipRequest: sim.skipRequest + 1 })}
      accessibilityRole="button"
      accessibilityLabel="Skip ahead 500 metres"
      style={styles.pill}
    >
      <FastForward color={t.ink} size={16} strokeWidth={2.5} />
      <Text style={styles.pillText}>500 m</Text>
    </Pressable>
  );
  const speeds = SPEEDS.map((s) => ({ label: `${s}x`, value: s }));

  if (compact) {
    return (
      <View style={styles.compact}>
        <Text style={styles.compactLabel}>DEMO</Text>
        {playButton}
        <Segmented options={speeds} value={sim.speed} onChange={(speed) => setSim({ speed })} label="Simulation speed" />
        {offRouteButton}
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>Virtual runner</Text>
      <Text style={styles.title}>Demo controls</Text>
      {!sim.active ? (
        <Text style={styles.help}>
          Open any route in the phone and press <Text style={{ fontFamily: font.bodyBold, color: t.ink }}>Demo run</Text>. A virtual runner
          follows the route and you'll hear the voice directions, exactly as on a real run.
        </Text>
      ) : (
        <>
          <View style={styles.row}>
            {playButton}
            <Text style={styles.help}>{sim.playing ? 'Running' : 'Paused'}</Text>
          </View>
          <Text style={styles.label}>Speed</Text>
          <Segmented options={speeds} value={sim.speed} onChange={(speed) => setSim({ speed })} label="Simulation speed" />
          <Text style={styles.label}>Pace (min/km)</Text>
          <Segmented options={PACES} value={sim.pace} onChange={(pace) => setSim({ pace })} label="Runner pace" />
          <Text style={styles.label}>Test the guidance</Text>
          <View style={[styles.row, { flexWrap: 'wrap' }]}>
            {offRouteButton}
            {skipButton}
          </View>
          <Text style={[styles.help, { marginTop: space.md }]}>
            Going off route moves the runner 45 m to the side. You'll get a warning, then a confirmation when you rejoin.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: 300, padding: space.xl, backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border, gap: space.sm },
  eyebrow: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: t.accentText },
  title: { fontFamily: font.display, fontSize: 30, color: t.ink, textTransform: 'uppercase', marginBottom: space.sm },
  help: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: t.muted, flexShrink: 1 },
  label: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: t.muted, marginTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as never,
  segmented: { flexDirection: 'row', backgroundColor: t.surfaceAlt, borderRadius: radius.sm, padding: 3, gap: 2 },
  segment: { minWidth: 44, minHeight: 36, paddingHorizontal: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as never,
  segmentText: { fontFamily: font.bodyBold, fontSize: 14, fontVariant: ['tabular-nums'] },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1.5, borderColor: t.border, cursor: 'pointer' } as never,
  pillText: { fontFamily: font.bodyBold, fontSize: 14, color: t.ink },
  compact: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, flexWrap: 'wrap' },
  compactLabel: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1, color: t.accentText },
});
