import { router } from 'expo-router';
import { ChevronRight, Clock, HeartPulse, Watch } from '../../icons';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionTitle } from '../../components/demo';
import { Badge, Body, Button, Card, EmptyState, Heading } from '../../components/ui';
import { date, duration, km, pace } from '../../format';
import { demoRunHealth, WATCH_RUNS } from '../../healthDemo';
import { useRuns } from '../../store';
import { font, space, useTheme } from '../../theme';

export default function History() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { runs, loaded } = useRuns();
  const totalDistance = runs.reduce((sum, r) => sum + r.distanceRun, 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <Heading size={40}>History</Heading>
        {runs.length > 0 && (
          <Body muted>
            {runs.length} {runs.length === 1 ? 'run' : 'runs'} · {km(totalDistance)} km in total
          </Body>
        )}
      </View>
      <FlatList
        data={runs}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.sm, flexGrow: 1 }}
        ListHeaderComponent={<WatchRuns />}
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              icon={Clock}
              title="No runs yet"
              body="Pick a route, press start and follow the voice. Your runs will show up here."
              action={<Button label="Find a route" onPress={() => router.navigate('/')} />}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Card
            onPress={() => router.push({ pathname: '/summary/[id]', params: { id: item.id } })}
            accessibilityLabel={`${item.routeName}, ${date(item.startedAt)}, ${km(item.distanceRun, 2)} kilometres in ${duration(item.elapsedMs)}`}
            style={styles.card}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.date, { color: theme.muted }]}>{date(item.startedAt)}</Text>
              <Text numberOfLines={1} style={[styles.name, { color: theme.ink }]}>
                {item.routeName}
              </Text>
              <Text style={[styles.stats, { color: theme.ink }]}>
                {km(item.distanceRun, 2)} km · {duration(item.elapsedMs)} · {pace(item.avgPace)} /km
              </Text>
              <View style={styles.hr}>
                <HeartPulse color={theme.accentText} size={14} />
                <Text style={[styles.hrText, { color: theme.muted }]}>{demoRunHealth(item).avgHr} bpm avg · demo</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {!item.completed && <Badge label="Ended early" />}
                {item.demo && <Badge label="Demo" />}
              </View>
            </View>
            <ChevronRight color={theme.muted} size={22} />
          </Card>
        )}
      />
    </View>
  );
}

/** Demo of health sync: runs recorded on a watch without JustinGo, as they would appear after a sync. */
function WatchRuns() {
  const theme = useTheme();
  const day = 24 * 60 * 60 * 1000;
  return (
    <View style={{ gap: space.sm, marginBottom: space.md }}>
      <SectionTitle title="Synced from your watch" action="Demo" />
      {WATCH_RUNS.map((w) => (
        <Card key={w.id} style={styles.card} accessibilityLabel={`${w.name} from ${w.device}`}>
          <View style={[styles.watchIcon, { backgroundColor: theme.surfaceAlt }]}>
            <Watch color={theme.ink} size={20} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.date, { color: theme.muted }]}>
              {date(Date.now() - w.daysAgo * day)} · {w.device}
            </Text>
            <Text numberOfLines={1} style={[styles.name, { color: theme.ink }]}>
              {w.name}
            </Text>
            <Text style={[styles.stats, { color: theme.ink }]}>
              {km(w.distance, 2)} km · {duration(w.elapsedMs)} · {pace(w.elapsedMs / w.distance)} /km · {w.avgHr} bpm
            </Text>
          </View>
        </Card>
      ))}
      <SectionTitle title="JustinGo runs" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  date: { fontFamily: font.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  name: { fontFamily: font.displaySemi, fontSize: 20 },
  stats: { fontFamily: font.bodyMedium, fontSize: 15, fontVariant: ['tabular-nums'] },
  hr: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hrText: { fontFamily: font.bodyMedium, fontSize: 13 },
  watchIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
