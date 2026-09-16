import { router } from 'expo-router';
import { MessageSquare, PenLine, Repeat, Save, Trash, Undo2, Upload, X } from '../../icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RouteMap from '../../components/RouteMap';
import type { MapLine, MapPin } from '../../components/RouteMap.types';
import { Body, Button, Card, Heading, IconButton, Stat } from '../../components/ui';
import { assembleRoute, ELEVATION_SAMPLES, samplePath } from '../../core/build';
import { cumulativeDistances, pathLength, project } from '../../core/geo';
import { parseGpx } from '../../core/gpx';
import { fetchElevation, fetchFootRoute, type FootRoute } from '../../core/osrm';
import { detectTurns } from '../../core/turns';
import type { LngLat } from '../../core/types';
import { km } from '../../format';
import { newId, useRoutes } from '../../store';
import { font, radius, space, useTheme } from '../../theme';

type Mode = 'draw' | 'message';

interface PlacedMessage {
  point: LngLat;
  text: string;
}

/** Start drawing zoomed in on Hyde Park: close enough to see individual paths. */
const START_VIEW = { center: [-0.1657, 51.5073] as LngLat, zoom: 14 };

/** Waits this long after the last tap before asking the router, so quick taps make one request. */
const ROUTE_DEBOUNCE_MS = 350;

export default function Create() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { saveRoute } = useRoutes();
  const [waypoints, setWaypoints] = useState<LngLat[]>([]);
  const [loop, setLoop] = useState(false);
  const [snapped, setSnapped] = useState<FootRoute | null>(null);
  const [imported, setImported] = useState(false);
  const [routing, setRouting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('draw');
  const [messages, setMessages] = useState<PlacedMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState<{ point: LngLat; text: string } | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const request = useRef(0);
  const fileInput = useRef<HTMLInputElement | null>(null);

  // Snap waypoints to footpaths whenever they change. The request counter drops responses that
  // arrive after a newer request was made, so a slow reply can't overwrite a newer route.
  useEffect(() => {
    if (imported) return;
    const points = loop && waypoints.length >= 2 ? [...waypoints, waypoints[0]] : waypoints;
    if (points.length < 2) {
      setSnapped(null);
      setRouting(false);
      return;
    }
    const mine = ++request.current;
    setRouting(true);
    const timer = setTimeout(() => {
      fetchFootRoute(points)
        .then((r) => {
          if (mine !== request.current) return;
          setSnapped(r);
          setError(null);
        })
        .catch((e: unknown) => {
          if (mine !== request.current) return;
          setError(e instanceof Error ? e.message : 'Could not find a path between those points.');
        })
        .finally(() => mine === request.current && setRouting(false));
    }, ROUTE_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      // Invalidate a request already in flight: its reply belongs to waypoints that have changed.
      request.current++;
    };
  }, [waypoints, loop, imported]);

  const path = snapped?.path ?? [];
  const distance = path.length > 1 ? pathLength(path) : 0;
  const turns = useMemo(() => (snapped ? detectTurns(snapped.path, snapped.names) : []), [snapped]);

  const lines = useMemo<MapLine[]>(() => (path.length > 1 ? [{ id: 'draft', path, emphasis: 'primary' }] : []), [path]);
  const pins = useMemo<MapPin[]>(
    () => [
      ...waypoints.map((p, i) => ({ id: `w${i}`, at: p, kind: i === 0 ? ('start' as const) : ('waypoint' as const) })),
      ...messages.map((m, i) => ({ id: `m${i}`, at: m.point, kind: 'message' as const })),
      ...(draftMessage ? [{ id: 'draft-message', at: draftMessage.point, kind: 'message' as const }] : []),
      ...(imported && path.length ? [{ id: 'start', at: path[0], kind: 'start' as const }] : []),
    ],
    [waypoints, messages, draftMessage, imported, path],
  );

  const onMapPress = (p: LngLat) => {
    if (mode === 'draw') {
      if (imported) return;
      setWaypoints((w) => [...w, p]);
      return;
    }
    if (path.length < 2) return;
    // Pin the message to the nearest point on the route, not wherever the tap landed.
    const at = project(path, cumulativeDistances(path), p);
    setDraftMessage({ point: at.point, text: '' });
  };

  const reset = () => {
    request.current++;
    setWaypoints([]);
    setSnapped(null);
    setImported(false);
    setMessages([]);
    setDraftMessage(null);
    setError(null);
    setRouting(false);
    setName('');
    setMode('draw');
  };

  const importGpx = async (file: File) => {
    try {
      const { name: gpxName, path: gpxPath } = parseGpx(await file.text());
      reset();
      setImported(true);
      setSnapped({ path: gpxPath, names: [] });
      setName(gpxName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that GPX file.');
    }
  };

  const save = async () => {
    if (path.length < 2) return;
    setSaving(true);
    try {
      // Elevation is nice to have; a failed lookup still saves a usable route.
      const elevation = await fetchElevation(samplePath(path, ELEVATION_SAMPLES)).catch(() => new Array(ELEVATION_SAMPLES).fill(0));
      const cumulative = cumulativeDistances(path);
      const route = assembleRoute({
        id: newId('route'),
        name: name.trim() || 'My route',
        area: 'My routes',
        description: '',
        path,
        names: snapped?.names,
        elevation,
        messages: messages.map((m) => ({ at: Math.round(project(path, cumulative, m.point).along), text: m.text })).sort((a, b) => a.at - b.at),
        surface: 'mixed',
        verified: false,
      });
      await saveRoute(route);
      reset();
      router.push({ pathname: '/route/[id]', params: { id: route.id } });
    } finally {
      setSaving(false);
    }
  };

  const hint = imported
    ? 'Imported from GPX. Add voice messages, name it and save.'
    : mode === 'message'
      ? path.length > 1
        ? 'Tap the route where the message should play.'
        : 'Draw a route first.'
      : waypoints.length === 0
        ? 'Tap the map to set your start point.'
        : waypoints.length === 1
          ? 'Tap again to add the next point. The route follows paths and parks.'
          : 'Keep tapping to extend the route.';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <Heading size={40}>Create</Heading>
        <View accessibilityLiveRegion="polite">
          <Body muted style={{ fontSize: 15 }}>
            {hint}
          </Body>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <RouteMap key={theme.scheme} lines={lines} pins={pins} fitKey={imported ? 'imported' : 'draw'} initialView={START_VIEW} onPress={onMapPress} style={StyleSheet.absoluteFill} label="Route drawing map. Tap to add points." />
        <View style={styles.tools}>
          <IconButton icon={PenLine} label="Draw mode" active={mode === 'draw'} onPress={() => setMode('draw')} />
          <IconButton icon={MessageSquare} label="Add voice message mode" active={mode === 'message'} onPress={() => setMode('message')} />
          <IconButton icon={Repeat} label={loop ? 'Loop back to start: on' : 'Loop back to start: off'} active={loop} onPress={() => setLoop((v) => !v)} />
          <IconButton icon={Undo2} label="Undo last point" onPress={() => setWaypoints((w) => w.slice(0, -1))} />
          <IconButton icon={Trash} label="Clear route" onPress={reset} />
          {Platform.OS === 'web' && (
            <>
              <IconButton icon={Upload} label="Import GPX file" onPress={() => fileInput.current?.click()} />
              <input
                ref={fileInput}
                type="file"
                accept=".gpx,application/gpx+xml"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) importGpx(file);
                  e.currentTarget.value = '';
                }}
              />
            </>
          )}
        </View>
      </View>

      <View style={[styles.sheet, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        {draftMessage ? (
          <View style={{ gap: space.sm }}>
            <Text style={[styles.label, { color: theme.muted }]}>Voice message at this point</Text>
            <TextInput
              autoFocus
              value={draftMessage.text}
              onChangeText={(text) => setDraftMessage({ ...draftMessage, text })}
              placeholder="e.g. Water fountain on your right"
              placeholderTextColor={theme.muted}
              accessibilityLabel="Voice message text"
              maxLength={140}
              style={[styles.input, { color: theme.ink, borderColor: theme.border, backgroundColor: theme.bg }]}
            />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button variant="secondary" icon={X} label="Cancel" onPress={() => setDraftMessage(null)} style={{ flex: 1 }} />
              <Button
                label="Add"
                disabled={!draftMessage.text.trim()}
                onPress={() => {
                  setMessages((m) => [...m, { point: draftMessage.point, text: draftMessage.text.trim() }]);
                  setDraftMessage(null);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ gap: space.md }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Stat label="Distance" value={km(distance, 2)} unit="km" />
              <Stat label="Turns" value={String(turns.length)} />
              <Stat label="Messages" value={String(messages.length)} />
            </View>
            {error && <Text style={{ fontFamily: font.bodyMedium, color: theme.danger, fontSize: 14 }}>{error}</Text>}
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Route name"
                placeholderTextColor={theme.muted}
                accessibilityLabel="Route name"
                maxLength={60}
                style={[styles.input, { flex: 1, color: theme.ink, borderColor: theme.border, backgroundColor: theme.bg }]}
              />
              <Button icon={Save} label="Save" onPress={save} loading={saving || routing} disabled={path.length < 2} />
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: 2 },
  tools: { position: 'absolute', top: space.md, right: space.md, gap: space.sm },
  sheet: { padding: space.lg, borderTopWidth: 1, maxHeight: 220 },
  label: { fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase' },
  input: { minHeight: 48, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: space.md, fontFamily: font.body, fontSize: 16 },
});
