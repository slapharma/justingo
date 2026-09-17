// Shared data shapes. Plain TypeScript with no React Native imports, so the navigation engine
// runs unchanged in the browser preview, on iOS and Android, and under `node --test`.

/** [longitude, latitude], the GeoJSON order. */
export type LngLat = [number, number];

export type TurnDirection =
  | 'left'
  | 'right'
  | 'slight left'
  | 'slight right'
  | 'sharp left'
  | 'sharp right'
  | 'uturn'
  | 'straight';

export interface Turn {
  /** Metres from the start of the route to the turn point. */
  at: number;
  direction: TurnDirection;
  /** Street or path name after the turn, empty when unnamed. */
  onto: string;
}

export interface VoiceMessage {
  /** Metres from the start of the route. */
  at: number;
  text: string;
}

export interface Route {
  id: string;
  name: string;
  area: string;
  /** Library region, e.g. "Kent" or "Thames Valley". Absent on routes the user created. */
  region?: string;
  description: string;
  /** Route geometry, first point is the start. */
  path: LngLat[];
  /** Metres. */
  distance: number;
  /** Total climb in metres. */
  ascent: number;
  /** Elevation samples evenly spaced along the route, metres. */
  elevation: number[];
  loop: boolean;
  surface: 'road' | 'park' | 'trail' | 'mixed';
  turns: Turn[];
  messages: VoiceMessage[];
  /** True for the built-in library, false for routes the user created. */
  verified: boolean;
}

export interface LocationSample {
  lng: number;
  lat: number;
  /** Epoch milliseconds. */
  time: number;
}
