import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../theme';
import { Body } from './ui';

/** Elevation profile. Samples are evenly spaced along the route. */
export default function ElevationChart({ elevation, height = 96 }: { elevation: number[]; height?: number }) {
  const theme = useTheme();
  if (elevation.length < 2) return null;
  const min = Math.min(...elevation);
  const max = Math.max(...elevation);
  // Flat routes would otherwise be scaled up into dramatic-looking hills; keep at least 20 m range.
  const range = Math.max(20, max - min);
  const w = 300;
  const x = (i: number) => (i / (elevation.length - 1)) * w;
  const y = (e: number) => height - 4 - ((e - min) / range) * (height - 12);
  const line = elevation.map((e, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(e).toFixed(1)}`).join(' ');

  return (
    <View
      accessible
      accessibilityLabel={`Elevation profile, lowest ${min} metres, highest ${max} metres`}
    >
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.accent} stopOpacity={0.45} />
            <Stop offset="1" stopColor={theme.accent} stopOpacity={0.05} />
          </LinearGradient>
        </Defs>
        <Path d={`${line} L${w},${height} L0,${height} Z`} fill="url(#fill)" />
        <Path d={line} fill="none" stroke={theme.accent} strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Body muted style={{ fontSize: 13 }}>Low {min} m</Body>
        <Body muted style={{ fontSize: 13 }}>High {max} m</Body>
      </View>
    </View>
  );
}
