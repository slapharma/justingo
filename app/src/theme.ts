import { useColorScheme } from 'react-native';

// JustinGo design tokens. Orange is a fill colour: text on it is dark ink (6.6:1), never white
// (3:1 fails WCAG). Orange *text* uses the deeper `accentText`, which passes 4.5:1 on its background.
const light = {
  scheme: 'light' as 'light' | 'dark',
  bg: '#FFF8F3',
  surface: '#FFFFFF',
  surfaceAlt: '#FFEDE0',
  ink: '#1A1410',
  muted: '#5C4F46',
  border: '#EADBD0',
  accent: '#FF5F1F',
  onAccent: '#1A1410',
  accentText: '#B93C0A',
  danger: '#C8261B',
  onDanger: '#FFFFFF',
  success: '#15803D',
  routeDim: '#B8A89C',
  mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

const dark: typeof light = {
  scheme: 'dark',
  bg: '#120E0B',
  surface: '#1E1814',
  surfaceAlt: '#2A211B',
  ink: '#FFF4EC',
  muted: '#BFAFA3',
  border: '#3A2E26',
  accent: '#FF6A2B',
  onAccent: '#1A1410',
  accentText: '#FF8F5A',
  danger: '#FF5A4E',
  onDanger: '#1A1410',
  success: '#4ADE80',
  routeDim: '#6B5B50',
  mapStyle: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

/** The run screen is always dark: higher contrast outdoors and kinder to the battery on OLED. */
export const runTheme = dark;

export const font = {
  display: 'BarlowCondensed_700Bold',
  displaySemi: 'BarlowCondensed_600SemiBold',
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodyBold: 'Barlow_700Bold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };
