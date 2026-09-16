import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DemoButton } from '../components/demo';
import ScreenHeader from '../components/ScreenHeader';
import { Body, Card } from '../components/ui';
import { PLANS } from '../demoData';
import { Check } from '../icons';
import { font, radius, space, useTheme } from '../theme';

/** Demo paywall. Purchases arrive with the native build (App Store and Google Play billing). */
export default function Premium() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScreenHeader title="Plans" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md }}>
        <View style={[styles.notice, { backgroundColor: theme.surfaceAlt }]}>
          <Body style={{ fontSize: 15 }}>Everything is free during the preview. Plans below show what’s coming.</Body>
        </View>
        {PLANS.map((plan) => {
          const featured = plan.id === 'premium';
          const dark = plan.id === 'creator';
          const fg = dark ? theme.onContrast : theme.ink;
          return (
            <Card
              key={plan.id}
              style={[
                { gap: space.sm, borderWidth: featured ? 3 : 1.5 },
                featured && { borderColor: theme.accent },
                dark && { backgroundColor: theme.contrast, borderColor: theme.contrast },
              ]}
            >
              {featured && (
                <View style={[styles.flag, { backgroundColor: theme.accent }]}>
                  <Text style={[styles.flagText, { color: theme.onAccent }]}>Most popular</Text>
                </View>
              )}
              <Text style={[styles.name, { color: fg }]}>{plan.name}</Text>
              <Text style={[styles.price, { color: fg }]}>{plan.price}</Text>
              <Text style={[styles.sub, { color: dark ? '#D6D6D6' : theme.muted }]}>{plan.sub}</Text>
              {plan.features.map((f) => (
                <View key={f} style={styles.feature}>
                  <Check color={theme.accent} size={18} strokeWidth={3} />
                  <Text style={[styles.featureText, { color: fg }]}>{f}</Text>
                </View>
              ))}
              <DemoButton
                label={plan.id === 'free' ? 'Current plan' : `Choose ${plan.name}`}
                variant={featured ? 'primary' : dark ? 'primary' : 'secondary'}
                style={{ marginTop: space.sm }}
              />
            </Card>
          );
        })}
        <DemoButton label="Restore purchases" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { borderRadius: radius.md, padding: space.md },
  flag: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  flagText: { fontFamily: font.bodyBold, fontSize: 12, textTransform: 'uppercase' },
  name: { fontFamily: font.display, fontSize: 28, textTransform: 'uppercase' },
  price: { fontFamily: font.display, fontSize: 48, lineHeight: 50 },
  sub: { fontFamily: font.bodyMedium, fontSize: 14 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  featureText: { fontFamily: font.body, fontSize: 15, flex: 1 },
});
