import { router } from 'expo-router';
import { ChevronRight, Clock } from '../../icons';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Body, Button, Card, EmptyState, Heading } from '../../components/ui';
import { date, duration, km, pace } from '../../format';
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

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  date: { fontFamily: font.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  name: { fontFamily: font.displaySemi, fontSize: 20 },
  stats: { fontFamily: font.bodyMedium, fontSize: 15, fontVariant: ['tabular-nums'] },
});
