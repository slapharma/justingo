import { useSyncExternalStore } from 'react';

// Controls for the simulated runner, shared between the desktop preview panel beside the phone
// frame and the compact bar inside the run screen (used when there is no room for the panel).

export interface SimControls {
  playing: boolean;
  speed: number;
  /** Seconds per km. */
  pace: number;
  offRoute: boolean;
  /** Set by the run screen while a demo run is active, so the panel knows to show controls. */
  active: boolean;
  /** Set by the desktop panel while it is on screen, so the run screen hides its own bar. */
  panelVisible: boolean;
  /** Incremented to request a skip ahead; the run screen watches it. */
  skipRequest: number;
}

let controls: SimControls = {
  playing: true,
  speed: 5,
  pace: 330,
  offRoute: false,
  active: false,
  panelVisible: false,
  skipRequest: 0,
};
const listeners = new Set<() => void>();

export function setSim(patch: Partial<SimControls>) {
  controls = { ...controls, ...patch };
  listeners.forEach((l) => l());
}

export function getSim() {
  return controls;
}

export function useSim(): SimControls {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => controls,
    () => controls,
  );
}

export const SPEEDS = [1, 5, 10, 20];
export const PACES = [
  { label: '4:30', value: 270 },
  { label: '5:30', value: 330 },
  { label: '6:30', value: 390 },
];
