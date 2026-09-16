import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DemoButton, Placeholder } from '../components/demo';
import ScreenHeader from '../components/ScreenHeader';
import { Body, Card } from '../components/ui';
import { BUSINESS } from '../demoData';
import { Building, Check } from '../icons';
import { font, space, useTheme } from '../theme';

/** Demo: how JustinGo earns money beyond subscriptions. */
export default function Business() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScreenHeader title="For business" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md }}>
        <Body muted>Guided routes and challenges for the places and events runners go to.</Body>
        {BUSINESS.map((b) => (
          <Card key={b.id} style={{ gap: space.sm }}>
            <Placeholder label={b.image} icon={Building} />
            <Text style={[styles.title, { color: theme.ink }]}>{b.title}</Text>
            <Text style={[styles.pitch, { color: theme.ink }]}>{b.pitch}</Text>
            {b.bullets.map((x) => (
              <View key={x} style={styles.bullet}>
                <Check color={theme.accent} size={16} strokeWidth={3} />
                <Text style={[styles.bulletText, { color: theme.muted }]}>{x}</Text>
              </View>
            ))}
            <DemoButton label="Book a demo" variant="dark" style={{ marginTop: space.xs }} />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.display, fontSize: 26, textTransform: 'uppercase' },
  pitch: { fontFamily: font.bodyBold, fontSize: 16, lineHeight: 22 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bulletText: { fontFamily: font.body, fontSize: 15, flex: 1 },
});
