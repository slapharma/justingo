import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Download, MessageSquare, Navigation, Play, Trash } from '../../icons';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ElevationChart from '../../components/ElevationChart';
import RouteMap from '../../components/RouteMap';
import type { MapPin } from '../../components/RouteMap.types';
import TurnIcon from '../../components/TurnIcon';
import { Badge, Body, Button, Card, EmptyState, Heading, IconButton, Stat } from '../../components/ui';
import { buildCues } from '../../core/engine';
import { cumulativeDistances, pointAlong } from '../../core/geo';
import { toGpx } from '../../core/gpx';
import { estimate, km, shortDistance } from '../../format';
import { useRoute, useRoutes } from '../../store';
import { font, space, useTheme } from '../../theme';

const CUE_PREVIEW = 6;

function downloadGpx(name: string, gpx: string) {
  // Web only; native export (share sheet) arrives with the native build.
  const url = URL.createObjectURL(new Blob([gpx], { type: 'application/gpx+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^\w-]+/g, '-').toLowerCase()}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RouteDetail() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { route, loaded } = useRoute(id);
  const { deleteRoute } = useRoutes();
  const [showAllCues, setShowAllCues] = useState(false);

  const cues = useMemo(() => (route ? buildCues(route).filter((c) => c.kind !== 'turn-far') : []), [route]);
  const pins = useMemo<MapPin[]>(() => {
    if (!route) return [];
    const cumulative = cumulativeDistances(route.path);
    return [
      ...route.messages.map((m, i) => ({ id: `m${i}`, at: pointAlong(route.path, cumulative, m.at), kind: 'message' as const })),
      ...(route.loop ? [] : [{ id: 'finish', at: route.path[route.path.length - 1], kind: 'finish' as const }]),
      { id: 'start', at: route.path[0], kind: 'start' as const },
    ];
  }, [route]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!route) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top, justifyContent: 'center' }}>
        {loaded && <EmptyState icon={Navigation} title="Route not found" body="It may have been deleted." action={<Button label="Browse routes" onPress={() => router.replace('/')} />} />}
      </View>
    );
  }

  const start = (mode: 'demo' | 'gps') => router.push({ pathname: '/run/[id]', params: { id: route.id, mode } });
  const shownCues = showAllCues ? cues : cues.slice(0, CUE_PREVIEW);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View>
          <RouteMap key={theme.scheme} lines={[{ id: route.id, path: route.path, emphasis: 'primary' }]} pins={pins} fitKey={route.id} style={styles.map} label={`Map of ${route.name}`} />
          <View style={[styles.backButton, { top: insets.top + space.md }]}>
            <IconButton icon={ChevronLeft} onPress={back} label="Back" />
          </View>
        </View>

        <View style={styles.content}>
          <View style={{ gap: space.xs }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {route.verified ? <Badge label="Verified" tone="accent" /> : <Badge label="Your route" tone="accent" />}
              <Badge label={route.loop ? 'Loop' : 'A to B'} />
              <Badge label={route.surface} />
            </View>
            <Heading size={34}>{route.name}</Heading>
            <Body muted>{route.area}</Body>
          </View>

          <Card style={styles.stats}>
            <Stat label="Distance" value={km(route.distance, 2)} unit="km" />
            <Stat label="Climb" value={String(route.ascent)} unit="m" />
            <Stat label="Turns" value={String(route.turns.length)} />
          </Card>

          {route.description ? <Body>{route.description}</Body> : null}
          <Body muted style={{ fontSize: 14 }}>About {estimate(route.distance)} at 5:30 per km.</Body>

          <View style={{ gap: space.sm }}>
            <Heading size={22}>Elevation</Heading>
            <ElevationChart elevation={route.elevation} />
          </View>

          <View style={{ gap: space.sm }}>
            <Heading size={22}>What you'll hear</Heading>
            <Card style={{ paddingVertical: space.xs }}>
              {shownCues.map((cue, i) => {
                const turn = cue.turn !== undefined ? route.turns[cue.turn] : null;
                return (
                  <View key={i} style={[styles.cue, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <View style={[styles.cueIcon, { backgroundColor: cue.kind === 'message' ? theme.surfaceAlt : theme.accent }]}>
                      {turn ? (
                        <TurnIcon direction={turn.direction} size={18} color={theme.onAccent} />
                      ) : cue.kind === 'message' ? (
                        <MessageSquare size={16} color={theme.accentText} strokeWidth={2.5} />
                      ) : (
                        <TurnIcon direction={cue.kind === 'finish' ? 'finish' : 'straight'} size={18} color={theme.onAccent} />
                      )}
                    </View>
                    <Body style={{ flex: 1, fontSize: 15 }}>{cue.text}</Body>
                    <Text style={[styles.cueAt, { color: theme.muted }]}>{shortDistance(cue.at)}</Text>
                  </View>
                );
              })}
            </Card>
            {cues.length > CUE_PREVIEW && (
              <Button variant="ghost" label={showAllCues ? 'Show fewer' : `Show all ${cues.length} cues`} onPress={() => setShowAllCues((v) => !v)} />
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            {Platform.OS === 'web' && <Button variant="secondary" icon={Download} label="GPX" accessibilityLabel="Download GPX file" onPress={() => downloadGpx(route.name, toGpx(route.name, route.path))} />}
            {!route.verified && (
              <Button
                variant="secondary"
                icon={Trash}
                label="Delete"
                accessibilityLabel="Delete this route"
                onPress={async () => {
                  await deleteRoute(route.id);
                  router.replace('/');
                }}
              />
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom + space.md }]}>
        <Button variant="secondary" icon={Navigation} label="GPS" accessibilityLabel="Start run using your GPS" onPress={() => start('gps')} size="lg" style={{ flex: 1 }} />
        <Button icon={Play} label="Demo run" accessibilityLabel="Start a demo run with a virtual runner" onPress={() => start('demo')} size="lg" style={{ flex: 2 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 300 },
  backButton: { position: 'absolute', left: space.lg },
  content: { padding: space.lg, gap: space.lg },
  stats: { flexDirection: 'row', gap: space.md },
  cue: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  cueIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cueAt: { fontFamily: font.bodyBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: space.sm, padding: space.md, borderTopWidth: 1 },
});
