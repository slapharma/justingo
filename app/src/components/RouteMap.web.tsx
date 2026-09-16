import { Map as MapLibreMap, setWorkerUrl, type GeoJSONSource, type LngLatBoundsLike, type MapMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LngLat } from '../core/types';
import { runTheme, useTheme } from '../theme';
import type { RouteMapProps } from './RouteMap.types';

const LONDON: LngLat = [-0.1276, 51.5072];

// Served from public/ (see scripts/copy-maplibre-worker.cjs). The exported site lives under the
// "/app" base URL; the dev server ignores the base URL and serves public/ from the root.
const base = __DEV__ ? '' : (process.env.EXPO_BASE_URL ?? '');
setWorkerUrl(`${location.origin}${base}/maplibre/maplibre-gl-worker.mjs`);

function boundsOf(paths: LngLat[][]): LngLatBoundsLike | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const path of paths)
    for (const [x, y] of path) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  return isFinite(minX) ? [minX, minY, maxX, maxY] : null;
}

const featureCollection = (features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features,
});

export default function RouteMap(props: RouteMapProps) {
  const { lines, pins = [], runner, follow, fitKey, dark, initialView, onPress, onLinePress, style, label } = props;
  const appTheme = useTheme();
  const theme = dark ? runTheme : appTheme;
  const container = useRef<HTMLDivElement>(null);
  // The map instance once its style has loaded and our sources exist. A removed map has no style;
  // effects check for it because a fast refresh can run them once more against the old instance.
  const [map, setMap] = useState<MapLibreMap | null>(null);
  // Handlers change every render; the map listens once and reads the latest through refs.
  const handlers = useRef({ onPress, onLinePress });
  handlers.current = { onPress, onLinePress };

  useEffect(() => {
    if (!container.current) return;
    const m = new MapLibreMap({
      container: container.current,
      style: theme.mapStyle,
      center: initialView?.center ?? LONDON,
      zoom: initialView?.zoom ?? 10,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    m.on('load', () => {
      m.addSource('lines', { type: 'geojson', data: featureCollection([]) });
      m.addSource('pins', { type: 'geojson', data: featureCollection([]) });
      m.addSource('runner', { type: 'geojson', data: featureCollection([]) });
      m.addLayer({
        id: 'lines-dim',
        type: 'line',
        source: 'lines',
        filter: ['==', ['get', 'emphasis'], 'dim'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': theme.accent, 'line-width': 3, 'line-opacity': 0.55 },
      });
      m.addLayer({
        id: 'lines-casing',
        type: 'line',
        source: 'lines',
        filter: ['==', ['get', 'emphasis'], 'primary'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': theme.scheme === 'dark' ? '#000000' : '#FFFFFF', 'line-width': 9 },
      });
      m.addLayer({
        id: 'lines-primary',
        type: 'line',
        source: 'lines',
        filter: ['==', ['get', 'emphasis'], 'primary'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': theme.accent, 'line-width': 5 },
      });
      m.addLayer({
        id: 'lines-trace',
        type: 'line',
        source: 'lines',
        filter: ['==', ['get', 'emphasis'], 'trace'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2F80ED', 'line-width': 4, 'line-dasharray': [1, 1.5] },
      });
      m.addLayer({
        id: 'pins',
        type: 'circle',
        source: 'pins',
        paint: {
          'circle-radius': ['match', ['get', 'kind'], 'message', 5, 'waypoint', 6, 8],
          'circle-color': [
            'match',
            ['get', 'kind'],
            'start',
            '#15803D',
            'finish',
            '#1A1410',
            'message',
            '#FFFFFF',
            theme.accent,
          ],
          'circle-stroke-color': ['match', ['get', 'kind'], 'message', theme.accent, '#FFFFFF'],
          'circle-stroke-width': ['match', ['get', 'kind'], 'message', 3, 2],
        },
      });
      m.addLayer({
        id: 'runner-halo',
        type: 'circle',
        source: 'runner',
        paint: { 'circle-radius': 18, 'circle-color': '#2F80ED', 'circle-opacity': 0.2 },
      });
      m.addLayer({
        id: 'runner',
        type: 'circle',
        source: 'runner',
        paint: {
          'circle-radius': 8,
          'circle-color': '#2F80ED',
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 3,
        },
      });
      setMap(m);
    });
    m.on('click', (e: MapMouseEvent) => {
      const hit = m.queryRenderedFeatures(
        [
          [e.point.x - 8, e.point.y - 8],
          [e.point.x + 8, e.point.y + 8],
        ],
        { layers: ['lines-primary', 'lines-dim'] },
      )[0];
      const id = hit?.properties?.id as string | undefined;
      if (id && handlers.current.onLinePress) handlers.current.onLinePress(id);
      else handlers.current.onPress?.([e.lngLat.lng, e.lngLat.lat]);
    });
    m.on('mousemove', (e: MapMouseEvent) => {
      if (!m.getLayer('lines-dim')) return;
      const overLine =
        !!handlers.current.onLinePress &&
        m.queryRenderedFeatures(e.point, { layers: ['lines-primary', 'lines-dim'] }).length > 0;
      m.getCanvas().style.cursor = overLine ? 'pointer' : handlers.current.onPress ? 'crosshair' : '';
    });
    // The phone frame and tab switches resize the container without a window resize event.
    const observer = new ResizeObserver(() => m.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      m.remove();
      setMap(null);
    };
    // The style is fixed at creation; the parent remounts the map (via key) when the theme flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map;
    if (!m?.style) return;
    (m.getSource('lines') as GeoJSONSource).setData(
      featureCollection(
        // Dim first so primary routes draw on top within the shared source.
        [...lines]
          .sort((a, b) => (a.emphasis === 'dim' ? -1 : 0) - (b.emphasis === 'dim' ? -1 : 0))
          .map((l) => ({
            type: 'Feature',
            properties: { id: l.id, emphasis: l.emphasis },
            geometry: { type: 'LineString', coordinates: l.path },
          })),
      ),
    );
  }, [map, lines]);

  useEffect(() => {
    const m = map;
    if (!m?.style) return;
    (m.getSource('pins') as GeoJSONSource).setData(
      featureCollection(
        pins.map((p) => ({
          type: 'Feature',
          properties: { id: p.id, kind: p.kind },
          geometry: { type: 'Point', coordinates: p.at },
        })),
      ),
    );
  }, [map, pins]);

  useEffect(() => {
    const m = map;
    if (!m?.style) return;
    (m.getSource('runner') as GeoJSONSource).setData(
      featureCollection(runner ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: runner } }] : []),
    );
    if (runner && follow) {
      // Updates arrive faster than an ease takes, and each new ease cancels the last, so a zoom-in
      // would never finish. Jump in once, then only pan.
      if (m.getZoom() < 15) m.jumpTo({ center: runner, zoom: 16 });
      else m.easeTo({ center: runner, duration: 200 });
    }
  }, [map, runner, follow]);

  useEffect(() => {
    const m = map;
    if (!m?.style || follow) return;
    const focus = lines.filter((l) => l.emphasis !== 'dim');
    const bounds = boundsOf((focus.length ? focus : lines).map((l) => l.path));
    if (bounds) m.fitBounds(bounds, { padding: 40, duration: 0, maxZoom: 16 });
    // Refit only when the caller says the subject changed, not on every line update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey]);

  return (
    <View style={[styles.wrap, style]} accessible accessibilityLabel={label} accessibilityRole="image">
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', position: 'relative' },
});
