import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { runTheme, useTheme } from '../theme';
import type { RouteMapProps } from './RouteMap.types';

// iOS and Android placeholder: draws the route shape without map tiles. The browser preview uses
// MapLibre GL (RouteMap.web.tsx); phase 5 replaces this file with @maplibre/maplibre-react-native,
// which needs a development build rather than Expo Go.
export default function RouteMap({ lines, pins = [], runner, dark, style, label }: RouteMapProps) {
  const appTheme = useTheme();
  const theme = dark ? runTheme : appTheme;
  const points = [...lines.flatMap((l) => l.path), ...pins.map((p) => p.at), ...(runner ? [runner] : [])];
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxY = Math.max(...ys);
  // Longitude degrees shrink with latitude; scale x so shapes are not stretched.
  const kx = Math.cos(((Math.min(...ys) + maxY) / 2) * (Math.PI / 180));
  const w = Math.max(1e-6, (Math.max(...xs) - minX) * kx);
  const h = Math.max(1e-6, maxY - Math.min(...ys));
  const size = Math.max(w, h);
  const project = ([x, y]: [number, number]) => `${(((x - minX) * kx) / size) * 100},${((maxY - y) / size) * 100}`;
  const xy = (p: [number, number]) => project(p).split(',').map(Number);

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surfaceAlt }, style]} accessible accessibilityLabel={label}>
      {points.length > 0 && (
        <Svg viewBox={`-5 -5 ${(w / size) * 100 + 10} ${(h / size) * 100 + 10}`} style={StyleSheet.absoluteFill}>
          {lines.map((l) => (
            <Polyline
              key={l.id}
              points={l.path.map(project).join(' ')}
              fill="none"
              stroke={l.emphasis === 'trace' ? '#2F80ED' : theme.accent}
              strokeOpacity={l.emphasis === 'dim' ? 0.5 : 1}
              strokeWidth={l.emphasis === 'primary' ? 1.2 : 0.8}
              strokeLinejoin="round"
            />
          ))}
          {pins.map((p) => {
            const [cx, cy] = xy(p.at);
            return <Circle key={p.id} cx={cx} cy={cy} r={1.5} fill={p.kind === 'start' ? theme.success : theme.accent} />;
          })}
          {runner && (() => {
            const [cx, cy] = xy(runner);
            return <Circle cx={cx} cy={cy} r={2} fill="#2F80ED" stroke="#FFFFFF" strokeWidth={0.6} />;
          })()}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
});
