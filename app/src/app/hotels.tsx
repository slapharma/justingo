import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DemoButton, DemoPhoto } from '../components/demo';
import ScreenHeader from '../components/ScreenHeader';
import { Badge, Body, Card } from '../components/ui';
import { HOTELS } from '../demoData';
import { QrCode, Search } from '../icons';
import { font, space, useTheme } from '../theme';

/** Demo hotel finder: hotels with guided routes from the lobby. Hotel names are invented. */
export default function Hotels() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScreenHeader title="Hotels" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md }}>
        <Body muted>Stay somewhere with guided runs from the front door.</Body>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <DemoButton label="Search near a place" icon={Search} style={{ flex: 1 }} />
          <DemoButton label="Scan room card" icon={QrCode} />
        </View>
        {HOTELS.map((h) => (
          <Card key={h.id} style={{ gap: space.sm }}>
            <DemoPhoto photo={h.photo} />
            <Text style={[styles.title, { color: theme.ink }]}>{h.name}</Text>
            <Text style={[styles.meta, { color: theme.muted }]}>
              {h.area} · {h.routes}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {h.perks.map((p) => (
                <Badge key={p} label={p} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <DemoButton label="View routes" variant="dark" style={{ flex: 1 }} />
              <DemoButton label="Hotel guide" style={{ flex: 1 }} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.display, fontSize: 24, textTransform: 'uppercase' },
  meta: { fontFamily: font.bodyMedium, fontSize: 14 },
});
