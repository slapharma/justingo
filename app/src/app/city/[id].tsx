import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DemoButton, Placeholder, Rail, SectionTitle } from '../../components/demo';
import RouteCard from '../../components/RouteCard';
import ScreenHeader from '../../components/ScreenHeader';
import { Badge, Body, Card, EmptyState } from '../../components/ui';
import { CITY_GUIDES, HOTELS, VIRTUAL_RACES } from '../../demoData';
import { Hotel, Landmark, MapPin } from '../../icons';
import { LIBRARY } from '../../store';
import { font, space, useTheme } from '../../theme';

/** City guide: real routes for the area, plus demo neighbourhoods, hotels and races. */
export default function CityGuide() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const guide = CITY_GUIDES.find((c) => c.id === id);

  if (!guide) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <ScreenHeader title="City guide" />
        <EmptyState icon={MapPin} title="Guide not found" body="Pick an area from Discover." />
      </View>
    );
  }

  const routes = guide.routeIds.map((rid) => LIBRARY.find((r) => r.id === rid)).filter((r) => r !== undefined);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScreenHeader title={guide.name} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md }}>
        <Placeholder label={`${guide.name} skyline`} ratio={16 / 9} icon={Landmark} />
        <Body>{guide.blurb}</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {guide.neighbourhoods.map((n) => (
            <Badge key={n} label={n} />
          ))}
        </View>

        <SectionTitle title="Popular routes" action={`${routes.length}`} />
        {routes.map((r) => (
          <RouteCard key={r.id} route={r} onPress={() => router.push({ pathname: '/route/[id]', params: { id: r.id } })} />
        ))}

        <SectionTitle title="Runner-friendly hotels" />
        <Rail>
          {HOTELS.slice(0, 3).map((h) => (
            <Card key={h.id} style={{ width: 220, gap: space.xs }}>
              <Placeholder label="Hotel photo" ratio={4 / 3} icon={Hotel} />
              <Text style={[styles.cardTitle, { color: theme.ink }]}>{h.name}</Text>
              <Text style={[styles.meta, { color: theme.muted }]}>{h.routes}</Text>
            </Card>
          ))}
        </Rail>

        <SectionTitle title="Races and events" />
        {VIRTUAL_RACES.map((r) => (
          <Card key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.ink }]}>{r.title}</Text>
              <Text style={[styles.meta, { color: theme.muted }]}>{r.date}</Text>
            </View>
            <DemoButton label="Details" />
          </Card>
        ))}

        <SectionTitle title="Unique runs" />
        <Rail>
          {['Airport layover run', 'Sunrise photo route', 'Family park walk'].map((t) => (
            <Card key={t} style={{ width: 200, gap: space.xs }}>
              <Placeholder label={t} ratio={4 / 3} />
              <Text style={[styles.cardTitle, { color: theme.ink, fontSize: 17 }]}>{t}</Text>
            </Card>
          ))}
        </Rail>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontFamily: font.displaySemi, fontSize: 19 },
  meta: { fontFamily: font.bodyMedium, fontSize: 13 },
});
