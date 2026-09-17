import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DemoButton, DemoPhoto, Rail, SectionTitle, Segmented } from '../../components/demo';
import { Card, Heading } from '../../components/ui';
import { BADGES, CHALLENGES, GROUPS, LEADERBOARD, VIRTUAL_RACES } from '../../demoData';
import { CirclePlus, Flag, Medal, Search, Trophy } from '../../icons';
import type { PhotoKey } from '../../photos';
import { font, radius, space, useTheme } from '../../theme';

const SECTIONS = ['Challenges', 'Groups', 'Races'];
const GROUP_PHOTOS: Record<string, PhotoKey> = { g1: 'clubs', g2: 'corporate', g3: 'race' };
const CLUB_FEATURES: { title: string; photo: PhotoKey }[] = [
  { title: 'Weekly route drops', photo: 'central' },
  { title: 'Club leaderboard', photo: 'corporate' },
  { title: 'Private club routes', photo: 'clubs' },
];

/** Demo: groups, challenges, leaderboards, badges and virtual races. Nothing here is wired yet. */
export default function Community() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState('Challenges');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md }}>
      <Heading size={40}>Community</Heading>
      <Segmented options={SECTIONS} value={section} onChange={setSection} label="Community section" />

      {section === 'Challenges' && (
        <>
          <SectionTitle title="Your challenges" />
          {CHALLENGES.map((c) => (
            <Card key={c.id} style={{ gap: space.sm }}>
              <View style={styles.rowBetween}>
                <Text style={[styles.cardTitle, { color: theme.ink }]}>{c.title}</Text>
                <Trophy color={theme.accent} size={20} />
              </View>
              <Text style={[styles.body, { color: theme.muted }]}>{c.detail}</Text>
              <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]} accessibilityRole="progressbar" aria-valuenow={Math.round(c.progress * 100)}>
                <View style={{ width: `${Math.round(c.progress * 100)}%`, height: '100%', backgroundColor: theme.accent, borderRadius: 4 }} />
              </View>
              <View style={styles.rowBetween}>
                <Text style={[styles.meta, { color: theme.muted }]}>{c.joined.toLocaleString('en-GB')} runners</Text>
                <DemoButton label={c.progress > 0 ? 'View' : 'Join'} variant={c.progress > 0 ? 'secondary' : 'dark'} />
              </View>
            </Card>
          ))}

          <SectionTitle title="Leaderboard" action="Royal Parks 50" />
          <Card style={{ paddingVertical: space.xs }}>
            {LEADERBOARD.map((row, i) => (
              <View key={row.rank} style={[styles.leader, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                <Text style={[styles.rank, { color: row.rank <= 3 ? theme.accentText : theme.muted }]}>{row.rank}</Text>
                <Text style={[styles.body, { flex: 1, color: theme.ink, fontFamily: row.name === 'You' ? font.bodyBold : font.body }]}>{row.name}</Text>
                <Text style={[styles.value, { color: theme.ink }]}>{row.value}</Text>
              </View>
            ))}
          </Card>

          <SectionTitle title="Badges" action="3 of 8" />
          <View style={styles.badges}>
            {BADGES.map((b, i) => {
              const earned = i < 3;
              return (
                <View key={b} style={styles.badge} accessible accessibilityLabel={`${b} badge, ${earned ? 'earned' : 'locked'}`}>
                  <View style={[styles.badgeIcon, { backgroundColor: earned ? theme.accent : theme.surfaceAlt, borderColor: earned ? theme.contrast : theme.border }]}>
                    <Medal color={earned ? theme.onAccent : theme.muted} size={24} />
                  </View>
                  <Text numberOfLines={2} style={[styles.badgeText, { color: earned ? theme.ink : theme.muted }]}>
                    {b}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {section === 'Groups' && (
        <>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <DemoButton label="Find groups" icon={Search} style={{ flex: 1 }} />
            <DemoButton label="Create group" icon={CirclePlus} variant="dark" style={{ flex: 1 }} />
          </View>
          <SectionTitle title="Nearby groups" />
          {GROUPS.map((g) => (
            <Card key={g.id} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
              <DemoPhoto photo={GROUP_PHOTOS[g.id] ?? 'clubs'} ratio={1} width={64} style={{ width: 64 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.cardTitle, { color: theme.ink }]}>{g.name}</Text>
                <Text style={[styles.meta, { color: theme.muted }]}>
                  {g.members.toLocaleString('en-GB')} members · {g.detail}
                </Text>
              </View>
              <DemoButton label="Join" />
            </Card>
          ))}
          <SectionTitle title="Run clubs" />
          <Rail>
            {CLUB_FEATURES.map(({ title: t, photo }) => (
              <Card key={t} style={{ width: 200, gap: space.sm }}>
                <DemoPhoto photo={photo} ratio={4 / 3} width={176} />
                <Text style={[styles.body, { color: theme.ink, fontFamily: font.bodyBold }]}>{t}</Text>
              </Card>
            ))}
          </Rail>
        </>
      )}

      {section === 'Races' && (
        <>
          <SectionTitle title="Virtual races" />
          {VIRTUAL_RACES.map((r) => (
            <Card key={r.id} style={{ gap: space.sm }}>
              <DemoPhoto photo={r.id === 'v1' ? 'race' : 'brands'} ratio={21 / 9} />
              <Text style={[styles.cardTitle, { color: theme.ink }]}>{r.title}</Text>
              <View style={{ flexDirection: 'row', gap: space.md }}>
                <Text style={[styles.meta, { color: theme.muted }]}>
                  {r.date}
                </Text>
                <Text style={[styles.meta, { color: theme.muted }]}>{r.mode}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <DemoButton label="Enter" variant="primary" style={{ flex: 1 }} />
                <DemoButton label="Submit a run" icon={Flag} style={{ flex: 1 }} />
              </View>
            </Card>
          ))}
          <Card style={{ gap: space.sm, backgroundColor: theme.contrast, borderColor: theme.contrast }}>
            <Text style={[styles.cardTitle, { color: theme.onContrast }]}>Live tracking on race day</Text>
            <Text style={[styles.body, { color: '#D6D6D6' }]}>Share a link so friends can follow you round the course. Free when your race turns it on.</Text>
            <DemoButton label="Share my tracking link" tier="premium" variant="primary" />
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  cardTitle: { fontFamily: font.displaySemi, fontSize: 20 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 21 },
  meta: { fontFamily: font.bodyMedium, fontSize: 13 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  leader: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  rank: { fontFamily: font.display, fontSize: 22, width: 24 },
  value: { fontFamily: font.bodyBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  badge: { width: 72, alignItems: 'center', gap: 4 },
  badgeIcon: { width: 56, height: 56, borderRadius: radius.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: font.bodyMedium, fontSize: 12, textAlign: 'center' },
});
