import { router, useLocalSearchParams } from 'expo-router';
import { Activity, Check, Clock, PenLine, RotateCcw, Share2, Trash } from '../../icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RouteMap from '../../components/RouteMap';
import { DemoButton } from '../../components/demo';
import { Badge, Body, Button, Card, EmptyState, Heading, Stat } from '../../components/ui';
import { date, duration, km, pace } from '../../format';
import { useRoute, useRuns } from '../../store';
import { font, space, useTheme } from '../../theme';

export default function Summary() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { runs, loaded, deleteRun } = useRuns();
  const run = runs.find((r) => r.id === id);
  const { route } = useRoute(run?.routeId);

  if (!run) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center' }}>
        {loaded && <EmptyState icon={Clock} title="Run not found" body="It may have been deleted." action={<Button label="History" onPress={() => router.replace('/history')} />} />}
      </View>
    );
  }

  const fastest = run.splits.length ? Math.min(...run.splits) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: 120, gap: space.lg }}>
        <View style={{ gap: space.xs }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Badge label={run.completed ? 'Completed' : 'Ended early'} tone={run.completed ? 'accent' : 'neutral'} />
            {run.demo && <Badge label="Demo run" />}
          </View>
          <Heading size={36}>{run.completed ? 'Great run' : 'Run saved'}</Heading>
          <Body muted>
            {run.routeName} · {date(run.startedAt)}
          </Body>
        </View>

        <RouteMap
          lines={[
            ...(route ? [{ id: route.id, path: route.path, emphasis: 'dim' as const }] : []),
            ...(run.trace.length > 1 ? [{ id: 'trace', path: run.trace, emphasis: 'primary' as const }] : []),
          ]}
          fitKey={run.id}
          style={[styles.map, { borderColor: theme.border }]}
          label={`Map of your run on ${run.routeName}`}
        />

        <Card style={{ gap: space.lg }}>
          <View style={styles.row}>
            <Stat label="Distance" value={km(run.distanceRun, 2)} unit="km" large />
            <Stat label="Time" value={duration(run.elapsedMs)} large />
          </View>
          <View style={styles.row}>
            <Stat label="Avg pace" value={pace(run.avgPace)} unit="/km" />
            <Stat label="Route" value={km(run.routeDistance, 1)} unit="km" />
          </View>
        </Card>

        {run.splits.length > 0 && (
          <View style={{ gap: space.sm }}>
            <Heading size={22}>Splits</Heading>
            <Card style={{ paddingVertical: space.xs }}>
              {run.splits.map((ms, i) => {
                const share = fastest ? fastest / ms : 1;
                return (
                  <View key={i} style={[styles.split, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <Text style={[styles.splitKm, { color: theme.muted }]}>KM {i + 1}</Text>
                    <View style={[styles.bar, { backgroundColor: theme.surfaceAlt }]}>
                      <View style={{ width: `${Math.round(share * 100)}%`, height: '100%', borderRadius: 4, backgroundColor: ms === fastest ? theme.accent : theme.routeDim }} />
                    </View>
                    <Text style={[styles.splitTime, { color: theme.ink }]}>{pace(ms / 1000)}</Text>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <DemoButton label="Share image" icon={Share2} variant="dark" style={{ flexGrow: 1 }} />
          <DemoButton label="Save as route" icon={PenLine} style={{ flexGrow: 1 }} />
          <DemoButton label="Send to Strava" icon={Activity} tier="premium" style={{ flexGrow: 1 }} />
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {route && <Button variant="secondary" icon={RotateCcw} label="Run again" onPress={() => router.replace({ pathname: '/route/[id]', params: { id: route.id } })} style={{ flex: 1 }} />}
          <Button
            variant="secondary"
            icon={Trash}
            label="Delete"
            accessibilityLabel="Delete this run"
            onPress={async () => {
              await deleteRun(run.id);
              router.replace('/history');
            }}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom + space.md }]}>
        <Button icon={Check} label="Done" size="lg" onPress={() => router.replace('/history')} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 220, borderRadius: 20, borderWidth: 1.5 },
  row: { flexDirection: 'row', gap: space.md },
  split: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  splitKm: { fontFamily: font.bodyBold, fontSize: 13, width: 44 },
  bar: { flex: 1, height: 10, borderRadius: 4, overflow: 'hidden' },
  splitTime: { fontFamily: font.display, fontSize: 20, width: 52, textAlign: 'right', fontVariant: ['tabular-nums'] },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.md, borderTopWidth: 1 },
});
