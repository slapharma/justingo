import type { StyleProp, ViewStyle } from 'react-native';
import type { LngLat } from '../core/types';

export interface MapLine {
  id: string;
  path: LngLat[];
  /** primary = the route in focus, dim = other routes, trace = where the runner actually went. */
  emphasis: 'primary' | 'dim' | 'trace';
}

export interface MapPin {
  id: string;
  at: LngLat;
  kind: 'start' | 'finish' | 'message' | 'waypoint';
}

export interface RouteMapProps {
  lines: MapLine[];
  pins?: MapPin[];
  runner?: LngLat | null;
  /** Keep the camera centred on the runner. */
  follow?: boolean;
  /** Change this to refit the camera to the lines (e.g. when the selected route changes). */
  fitKey?: string;
  dark?: boolean;
  /** Camera before anything is fitted. Defaults to all of London. */
  initialView?: { center: LngLat; zoom: number };
  onPress?: (at: LngLat) => void;
  onLinePress?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
  /** Accessible description of what the map shows. */
  label: string;
}
