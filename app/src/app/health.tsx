import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DemoButton, ListRow, SectionTitle } from '../components/demo';
import { Sparkline, WellnessGrid } from '../components/health';
import ScreenHeader from '../components/ScreenHeader';
import { Badge, Body, Card, Stat } from '../components/ui';
import { HEALTH_SOURCES, TRAINING } from '../healthDemo';
import { HeartPulse, Upload, Watch } from '../icons';
import { font, space, useTheme } from '../theme';

/**
 * Demo health dashboard: daily wellness, training status and connected trackers. The figures are
 * placeholders from healthDemo.ts; real sync needs the native build (Apple Health, Health Connect)
 * and the phase 4 backend (Garmin, COROS, Polar and the other cloud APIs).
 */
export default function Health() {
  const theme = useTheme();
  const [low, high] = TRAINING.optimalLoad;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScreenHeader title="Health" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.sm }}>
        <View style={[styles.notice, { backgroundColor: theme.surfaceAlt }]}>
          <Body style={{ fontSize: 15 }}>Health sync is coming soon. The figures below are an example of what your watch will add.</Body>
        </View>

        <SectionTitle title="Today" />
        <WellnessGrid />

        <SectionTitle title="Training" />
        <Card style={{ gap: space.lg }}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { color: theme.ink }]}>Training status</Text>
            <Badge label={TRAINING.status} tone="accent" />
          </View>
          <View style={styles.row}>
            <Stat label="VO2 max" value={String(TRAINING.vo2max)} large />
            <Stat label="Recovery" value={String(TRAINING.recoveryHours)} unit="h" large />
          </View>
          <View style={styles.row}>
            <Stat label="7-day load" value={String(TRAINING.acuteLoad)} />
            <Stat label="Optimal" value={`${low}–${high}`} />
          </View>
          <View style={{ gap: 4 }}>
            <Text style={[styles.small, { color: theme.muted }]}>Weekly load, last six weeks</Text>
            <Sparkline values={TRAINING.weeklyLoad} width={280} height={48} />
          </View>
          <View style={styles.row}>
            <Stat label="Weight" value={TRAINING.weight.toFixed(1)} unit="kg" />
            <Stat label="Body fat" value={TRAINING.bodyFat.toFixed(1)} unit="%" />
          </View>
        </Card>

        <SectionTitle title="Sources" />
        {HEALTH_SOURCES.map((s) => (
          <ListRow
            key={s.id}
            icon={s.id === 'apple' || s.id === 'health-connect' ? HeartPulse : Watch}
            title={s.name}
            detail={s.status === 'connected' ? `Connected · ${s.detail}` : s.detail}
            right={s.status === 'connected' ? <Badge label="Connected" tone="accent" /> : <Badge label="Connect" />}
          />
        ))}
        <DemoButton label="Import a FIT, TCX or GPX file" icon={Upload} style={{ marginTop: space.md }} />
        <Text style={[styles.small, { color: theme.muted, marginTop: space.sm }]}>
          You’ll choose which data JustinGo reads from each source.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { borderRadius: 12, padding: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  cardTitle: { fontFamily: font.bodyBold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: space.md },
  small: { fontFamily: font.bodyMedium, fontSize: 13 },
});
