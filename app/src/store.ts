import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { LngLat, Route } from './core/types';
import library from './data/routes.json';

// Local persistence for the preview: the user's own routes and run history. AsyncStorage is
// localStorage on web and native storage on iOS/Android. Phase 4 swaps this for Supabase behind
// the same hooks.

export const LIBRARY = library as unknown as Route[];

export interface RunRecord {
  id: string;
  routeId: string;
  routeName: string;
  startedAt: number;
  elapsedMs: number;
  distanceRun: number;
  routeDistance: number;
  avgPace: number | null;
  /** Milliseconds per completed kilometre. */
  splits: number[];
  trace: LngLat[];
  completed: boolean;
  demo: boolean;
}

interface State {
  loaded: boolean;
  routes: Route[];
  runs: RunRecord[];
}

const ROUTES_KEY = 'justingo:routes:v1';
const RUNS_KEY = 'justingo:runs:v1';

let state: State = { loaded: false, routes: [], runs: [] };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    // Private browsing or blocked storage: the preview still works, it just won't remember.
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // See readJson.
  }
}

let loading: Promise<void> | null = null;
function load() {
  loading ??= (async () => {
    const [routes, runs] = await Promise.all([readJson<Route[]>(ROUTES_KEY, []), readJson<RunRecord[]>(RUNS_KEY, [])]);
    state = { loaded: true, routes, runs };
    emit();
  })();
  return loading;
}

function set(next: Partial<State>) {
  state = { ...state, ...next };
  emit();
}

function useStore(): State {
  useEffect(() => {
    load();
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export function useRoutes() {
  const { routes, loaded } = useStore();
  const all = [...routes, ...LIBRARY];
  const saveRoute = useCallback(async (route: Route) => {
    const next = [route, ...state.routes.filter((r) => r.id !== route.id)];
    set({ routes: next });
    await writeJson(ROUTES_KEY, next);
  }, []);
  const deleteRoute = useCallback(async (id: string) => {
    const next = state.routes.filter((r) => r.id !== id);
    set({ routes: next });
    await writeJson(ROUTES_KEY, next);
  }, []);
  return { routes: all, myRoutes: routes, loaded, saveRoute, deleteRoute };
}

export function useRoute(id: string | undefined) {
  const { routes, loaded } = useRoutes();
  return { route: routes.find((r) => r.id === id), loaded };
}

export function useRuns() {
  const { runs, loaded } = useStore();
  const saveRun = useCallback(async (run: RunRecord) => {
    const next = [run, ...state.runs.filter((r) => r.id !== run.id)];
    set({ runs: next });
    await writeJson(RUNS_KEY, next);
  }, []);
  const deleteRun = useCallback(async (id: string) => {
    const next = state.runs.filter((r) => r.id !== id);
    set({ runs: next });
    await writeJson(RUNS_KEY, next);
  }, []);
  return { runs, loaded, saveRun, deleteRun };
}

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
