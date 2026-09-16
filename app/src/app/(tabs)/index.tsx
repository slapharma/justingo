import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RouteCard from '../../components/RouteCard';
import RouteMap from '../../components/RouteMap';
import type { MapLine } from '../../components/RouteMap.types';
import { Body, Chip } from '../../components/ui';
import type { Route } from '../../core/types';
import { useRoutes } from '../../store';
import { font, space, useTheme } from '../../theme';

const FILTERS: { label: string; test: (r: Route) => boolean }[] = [
  { label: 'All', test: () => true },
  { label: 'Under 5 km', test: (r) => r.distance < 5000 },
  { label: '5–10 km', test: (r) => r.distance >= 5000 && r.distance <= 10000 },
  { label: '10 km+', test: (r) => r.distance > 10000 },
  { label: 'Loops', test: (r) => r.loop },
  { label: 'Trails', test: (r) => r.surface === 'trail' },
];

export default function Discover() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { routes } = useRoutes();
  const [filter, setFilter] = useState(0);
  const visible = useMemo(() => routes.filter(FILTERS[filter].test), [routes, filter]);
  const lines = useMemo<MapLine[]>(() => visible.map((r) => ({ id: r.id, path: r.path, emphasis: 'dim' })), [visible]);
  const open = (id: string) => router.push({ pathname: '/route/[id]', params: { id } });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <Text style={[styles.brand, { color: theme.ink }]} accessibilityRole="header">
          Justin<Text style={{ color: theme.accentText }}>Go</Text>
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
            <RouteMap
              key={theme.scheme}
              lines={lines}
              fitKey={String(filter)}
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
        ListEmptyComponent={<Body muted style={{ textAlign: 'center', marginTop: space.xl }}>No routes match this filter.</Body>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: space.md },
  brand: { fontFamily: font.display, fontSize: 40, lineHeight: 42, textTransform: 'uppercase' },
  map: { height: 240, borderRadius: 20, borderWidth: 1.5 },
});
