import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DemoButton, Placeholder, Rail, SectionTitle, Segmented } from '../../components/demo';
import RouteCard from '../../components/RouteCard';
import RouteMap from '../../components/RouteMap';
import type { MapLine } from '../../components/RouteMap.types';
import { Body, Card, Chip } from '../../components/ui';
import type { Route } from '../../core/types';
import { CITY_GUIDES, HOTELS } from '../../demoData';
import { Footprints, Hotel, Landmark, Search } from '../../icons';
import { useRoutes } from '../../store';
import { font, radius, space, useTheme } from '../../theme';

const FILTERS: { label: string; test: (r: Route) => boolean }[] = [
  { label: 'All', test: () => true },
  { label: 'Under 5 km', test: (r) => r.distance < 5000 },
  { label: '5–10 km', test: (r) => r.distance >= 5000 && r.distance <= 10000 },
  { label: '10 km+', test: (r) => r.distance > 10000 },
  { label: 'Loops', test: (r) => r.loop },
  { label: 'Trails', test: (r) => r.surface === 'trail' },
];

const SOURCES: Record<string, (r: Route) => boolean> = {
  All: () => true,
  'My routes': (r) => !r.verified,
  Verified: (r) => r.verified,
};

export default function Discover() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { routes } = useRoutes();
  const [filter, setFilter] = useState(0);
  const [source, setSource] = useState('All');
  const visible = useMemo(() => routes.filter((r) => SOURCES[source](r) && FILTERS[filter].test(r)), [routes, filter, source]);
  const lines = useMemo<MapLine[]>(() => visible.map((r) => ({ id: r.id, path: r.path, emphasis: 'dim' })), [visible]);
  const open = (id: string) => router.push({ pathname: '/route/[id]', params: { id } });
  // Only claim the user has no routes when that's true, not when a filter hides the ones they have.
  const noOwnRoutes = source === 'My routes' && routes.every((r) => r.verified);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <Text style={[styles.brand, { color: theme.ink }]} accessibilityRole="header">
          Justin<Text style={{ color: theme.accent }}>Go</Text>
        </Text>
        <Body muted style={{ fontSize: 15 }}>
          {routes.length} routes across Greater London
        </Body>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.sm }}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.xs }}>
            {/* Search is demo only: the field accepts text but doesn't filter yet. */}
            <View style={[styles.search, { borderColor: theme.contrast, backgroundColor: theme.surface }]}>
              <Search color={theme.ink} size={20} />
              <TextInput
                placeholder="Search a place or route"
                placeholderTextColor={theme.muted}
                accessibilityLabel="Search routes (demo)"
                style={[styles.searchInput, { color: theme.ink }]}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Free run without a route"
              aria-description="Demo only, not available yet"
              style={[styles.freeRun, { backgroundColor: theme.contrast }]}
            >
              <View style={[styles.freeRunIcon, { backgroundColor: theme.accent }]}>
                <Footprints color={theme.onAccent} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.freeRunTitle, { color: theme.onContrast }]}>Free run</Text>
                <Text style={[styles.freeRunSub, { color: '#CFCFCF' }]}>Track a run without a route, save it as one after</Text>
              </View>
            </Pressable>

            <SectionTitle title="City guides" />
            <Rail>
              {CITY_GUIDES.map((c) => (
                <Card key={c.id} onPress={() => router.push({ pathname: '/city/[id]', params: { id: c.id } })} accessibilityLabel={`${c.name} city guide`} style={{ width: 170, padding: space.sm, gap: space.xs }}>
                  <Placeholder label={c.name} ratio={4 / 3} icon={Landmark} />
                  <Text style={[styles.cardTitle, { color: theme.ink }]}>{c.name}</Text>
                  <Text style={[styles.meta, { color: theme.muted }]}>{c.routeIds.length} routes</Text>
                </Card>
              ))}
            </Rail>

            <SectionTitle title="Runner-friendly hotels" />
            <Card onPress={() => router.push('/hotels')} accessibilityLabel="Find runner-friendly hotels" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Placeholder label="Hotel" ratio={1} style={{ width: 64 }} icon={Hotel} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.ink }]}>{HOTELS.length} hotels with lobby routes</Text>
                <Text style={[styles.meta, { color: theme.muted }]}>Guided runs from the front door</Text>
              </View>
            </Card>

            <SectionTitle title="Routes" />
            <Segmented options={Object.keys(SOURCES)} value={source} onChange={setSource} label="Route source" />
            <RouteMap
              lines={lines}
              fitKey={`${source}-${filter}`}
              onLinePress={open}
              style={[styles.map, { borderColor: theme.border }]}
              label={`Map of ${visible.length} routes. Select a route line to open it.`}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {FILTERS.map((f, i) => (
                <Chip key={f.label} label={f.label} selected={i === filter} onPress={() => setFilter(i)} />
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => <RouteCard route={item} onPress={() => open(item.id)} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', gap: space.md, marginTop: space.xl }}>
            <Body muted style={{ textAlign: 'center' }}>{noOwnRoutes ? 'You haven’t made a route yet.' : 'No routes match this filter.'}</Body>
            {noOwnRoutes && <DemoButton label="Create a route" variant="dark" onPress={() => router.navigate('/create')} />}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: space.md },
  brand: { fontFamily: font.display, fontSize: 40, lineHeight: 42, textTransform: 'uppercase' },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 2, borderRadius: radius.md, paddingHorizontal: space.md, minHeight: 48 },
  searchInput: { flex: 1, fontFamily: font.body, fontSize: 16, minHeight: 44 },
  freeRun: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, padding: space.md, cursor: 'pointer' } as never,
  freeRunIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  freeRunTitle: { fontFamily: font.display, fontSize: 22, textTransform: 'uppercase' },
  freeRunSub: { fontFamily: font.body, fontSize: 14 },
  cardTitle: { fontFamily: font.displaySemi, fontSize: 18 },
  meta: { fontFamily: font.bodyMedium, fontSize: 13 },
  map: { height: 240, borderRadius: 20, borderWidth: 1.5 },
});
