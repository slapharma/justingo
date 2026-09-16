import { BadgeCheck, ChevronRight } from '../icons';
import { StyleSheet, Text, View } from 'react-native';
import type { Route } from '../core/types';
import { estimate, km } from '../format';
import { font, space, useTheme } from '../theme';
import { Badge, Card } from './ui';

export default function RouteCard({ route, onPress }: { route: Route; onPress: () => void }) {
  const theme = useTheme();
  const summary = `${km(route.distance)} kilometres, ${route.ascent} metres climb, ${route.turns.length} turns`;
  return (
    <Card onPress={onPress} accessibilityLabel={`${route.name}, ${route.area}. ${summary}`} style={styles.card}>
      <View style={styles.distance}>
        <Text style={[styles.distanceValue, { color: theme.ink }]}>{km(route.distance)}</Text>
        <Text style={[styles.distanceUnit, { color: theme.muted }]}>KM</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[styles.name, { color: theme.ink }]}>
            {route.name}
          </Text>
          {route.verified && <BadgeCheck color={theme.accentText} size={18} strokeWidth={2.5} accessibilityLabel="Verified route" />}
        </View>
        <Text numberOfLines={1} style={[styles.meta, { color: theme.muted }]}>
          {route.area} · {route.ascent} m climb · {estimate(route.distance)}
        </Text>
        <View style={styles.badges}>
          <Badge label={route.loop ? 'Loop' : 'A to B'} />
          <Badge label={route.surface} />
          {!route.verified && <Badge label="Yours" tone="accent" />}
        </View>
      </View>
      <ChevronRight color={theme.muted} size={22} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  distance: { width: 56, alignItems: 'center' },
  distanceValue: { fontFamily: font.display, fontSize: 30, lineHeight: 32, fontVariant: ['tabular-nums'] },
  distanceUnit: { fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 1 },
  body: { flex: 1, minWidth: 0, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: font.displaySemi, fontSize: 20, flexShrink: 1 },
  meta: { fontFamily: font.body, fontSize: 14 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 4 },
});
