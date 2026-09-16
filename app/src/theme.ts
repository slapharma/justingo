// JustinGo design tokens: white backgrounds, black type and accents, orange as the single highlight.
// Orange is a fill colour: text on it is black (7:1), never white (3:1 fails WCAG). Orange *text*
// uses the deeper `accentText`, which passes 4.5:1 on white.
//
// One light theme everywhere, including the run screen: the brand is white, and a white screen
// with black type is the most legible option in daylight.
const light = {
  scheme: 'light' as 'light' | 'dark',
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F4F4',
  ink: '#0A0A0A',
  muted: '#5A5A5A',
  border: '#E4E4E4',
  accent: '#FF5F1F',
  onAccent: '#0A0A0A',
  accentText: '#B93C0A',
  /** Black blocks: primary buttons on white, badges, the stats bar. */
  contrast: '#0A0A0A',
  onContrast: '#FFFFFF',
  danger: '#C8261B',
  onDanger: '#FFFFFF',
  success: '#15803D',
  routeDim: '#9A9A9A',
  mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return light;
}

export const runTheme = light;

export const font = {
  display: 'BarlowCondensed_700Bold',
  displaySemi: 'BarlowCondensed_600SemiBold',
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodyBold: 'Barlow_700Bold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };
