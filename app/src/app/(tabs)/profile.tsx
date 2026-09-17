import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DemoButton, ListRow, Placeholder, SectionTitle, Segmented } from '../../components/demo';
import { WellnessGrid } from '../../components/health';
import { HEALTH_SOURCES } from '../../healthDemo';
import { Card, Heading } from '../../components/ui';
import { km } from '../../format';
import {
  Accessibility,
  Activity,
  Briefcase,
  CircleHelp,
  Crown,
  Globe,
  HeartPulse,
  LogIn,
  Ruler,
  Trash,
  User,
  Vibrate,
  Volume2,
  Watch,
} from '../../icons';
import { useRuns } from '../../store';
import { font, space, useTheme } from '../../theme';

/**
 * Account, plan, integrations and settings. The settings controls keep local state so they feel real
 * in a demo, but nothing reads them yet: the voice engine still uses its built-in defaults.
 */
export default function Profile() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { runs } = useRuns();
  const [cueDistance, setCueDistance] = useState('200 m');
  const [speakStats, setSpeakStats] = useState('Every km');
  const [units, setUnits] = useState('km');
  const [streetNames, setStreetNames] = useState(true);
  const [haptics, setHaptics] = useState(true);

  const total = runs.reduce((s, r) => s + r.distanceRun, 0);

  const toggle = (value: boolean, onChange: (v: boolean) => void, label: string) => (
    <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: theme.accent, false: theme.border }} thumbColor={theme.surface} />
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.sm }}>
      <View style={styles.header}>
        <Placeholder label="Photo" ratio={1} style={{ width: 72, borderRadius: 36 }} icon={User} />
        <View style={{ flex: 1 }}>
          <Heading size={30}>Guest runner</Heading>
          <Text style={[styles.meta, { color: theme.muted }]}>
            {runs.length} runs · {km(total)} km · Free plan
          </Text>
        </View>
      </View>
      <DemoButton label="Sign in with Apple, Google or email" icon={LogIn} variant="dark" />

      <Card style={[styles.plan, { backgroundColor: theme.accent, borderColor: theme.accent }]}>
        <Crown color={theme.onAccent} size={28} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.planTitle, { color: theme.onAccent }]}>Go Premium</Text>
          <Text style={[styles.meta, { color: theme.onAccent }]}>Topo maps, live tracking, Strava and more</Text>
        </View>
        <DemoButton label="See plans" variant="dark" style={{ paddingHorizontal: space.md }} onPress={() => router.push('/premium')} />
      </Card>
      <ListRow icon={Crown} title="Plans and pricing" detail="Free, Premium and Creator" onPress={() => router.push('/premium')} />

      <SectionTitle title="Health" action="Demo" />
      <WellnessGrid />
      <ListRow icon={HeartPulse} title="Health dashboard" detail="Training status, VO2 max, recovery and your sources" onPress={() => router.push('/health')} />
      <ListRow icon={Watch} title="Health sources" detail={`Garmin Connect connected · ${HEALTH_SOURCES.length - 1} more available`} onPress={() => router.push('/health')} />

      <SectionTitle title="Connected" />
      <ListRow icon={Watch} title="Apple Watch" detail="Guidance and stats on your wrist, phone optional" />
      <ListRow icon={HeartPulse} title="Apple Health / Health Connect" detail="Save workouts, read heart rate, sleep and HRV" />
      <ListRow icon={Activity} title="Strava" detail="Import routes and segments, upload runs" tier="premium" />
      <ListRow icon={Watch} title="Garmin and COROS" detail="Send routes as GPX or TCX courses" />

      <SectionTitle title="Voice guidance" />
      <Text style={[styles.label, { color: theme.muted }]}>Announce turns before</Text>
      <Segmented options={['100 m', '200 m', '400 m']} value={cueDistance} onChange={setCueDistance} label="Announce turns before" />
      <Text style={[styles.label, { color: theme.muted }]}>Speak stats</Text>
      <Segmented options={['Off', 'Every km', 'Every 5 min']} value={speakStats} onChange={setSpeakStats} label="Speak stats" />
      <ListRow icon={Volume2} title="Speak street names" right={toggle(streetNames, setStreetNames, 'Speak street names')} />
      <ListRow icon={Globe} title="Voice language" detail="English (UK) · 9 languages" />
      <ListRow icon={Volume2} title="Enhanced voices" detail="More natural speech" tier="premium" />
      <ListRow icon={Vibrate} title="Haptic turn alerts" right={toggle(haptics, setHaptics, 'Haptic turn alerts')} />

      <SectionTitle title="General" />
      <Text style={[styles.label, { color: theme.muted }]}>Units</Text>
      <Segmented options={['km', 'miles']} value={units} onChange={setUnits} label="Units" />
      <ListRow icon={Ruler} title="Pace and distance display" detail="Minutes per km" />
      <ListRow icon={Accessibility} title="Accessibility" detail="Designed for screen readers and eyes-free running" />
      <ListRow icon={CircleHelp} title="Help and tutorials" />

      <SectionTitle title="For business" />
      <ListRow icon={Briefcase} title="JustinGo for business" detail="Hotels, races, tourism, wellness, brands and clubs" onPress={() => router.push('/business')} />

      <SectionTitle title="Account" />
      <ListRow icon={Crown} title="Manage subscription" />
      <ListRow icon={Trash} title="Delete account" detail="Removes your routes and runs" />
      <Text style={[styles.meta, { color: theme.muted, marginTop: space.md }]}>JustinGo preview · everything is free during the preview</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  meta: { fontFamily: font.bodyMedium, fontSize: 14 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md },
  planTitle: { fontFamily: font.display, fontSize: 22, textTransform: 'uppercase' },
  label: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: space.sm },
});
