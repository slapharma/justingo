// Generates src/data/routes.json: the built-in route library for London and South East England.
//
//   node scripts/build-routes.ts                    rebuild everything and write routes.json
//   node scripts/build-routes.ts kent               dry run one region (a file in scripts/seeds/), no elevation
//   node scripts/build-routes.ts hyde-park-loop     dry run one or more routes by id
//
// Each route is a list of waypoints we chose, snapped to footpaths by the OSRM foot router, with
// elevation from OpenTopoData. The output is committed so the app never calls these services for
// library routes. Re-run only when adding or changing a route; it is polite to the free services.
import { writeFileSync } from 'node:fs';
import { routeFromWaypoints } from '../src/core/build.ts';
import { cumulativeDistances, project } from '../src/core/geo.ts';
import type { LngLat, Route } from '../src/core/types.ts';
import type { Seed } from './seeds/types.ts';

/** Seed files in scripts/seeds/ and the region label each gives its routes, in library order. */
const REGION_LABELS: Record<string, string> = {
  london: 'London',
  kent: 'Kent',
  sussex: 'Sussex',
  surrey: 'Surrey',
  hampshire: 'Hampshire & Isle of Wight',
  'thames-valley': 'Thames Valley',
};
const REGIONS = Object.keys(REGION_LABELS);
/** A waypoint further than this from any path was probably dropped in a field, lake or garden. */
const MAX_SNAP_METRES = 75;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_ATTEMPTS = 14;
/**
 * Identifies us to the free services and backs off when they rate-limit. Waits cap at five minutes
 * and keep going for about 40, so a longer limit doesn't fail a full rebuild partway through.
 */
const politeFetch: typeof fetch = async (input, init) => {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(input, {
      ...init,
      headers: { 'User-Agent': 'JustinGo route builder (github.com/slapharma/justingo)' },
    }).catch((err: unknown) => {
      if (attempt === MAX_ATTEMPTS) throw err;
      return null; // dropped connection: retry
    });
    if (res && (res.status !== 429 || attempt === MAX_ATTEMPTS)) return res;
    const wait = Math.min(2500 * 2 ** attempt, 300_000);
    if (res) console.log(`  rate-limited by ${new URL(String(input)).host}, waiting ${wait / 1000} s`);
    await sleep(wait);
  }
};
const toLngLat = ([lat, lng]: [number, number]): LngLat => [lng, lat];

const args = process.argv.slice(2);
// Load only the regions asked for, so one half-edited seed file doesn't block dry runs of the others.
const regionArgs = args.filter((a) => REGIONS.includes(a));
if (regionArgs.length && regionArgs.length < args.length) throw new Error('Pass region names or route ids, not both');
const wantedRegions = regionArgs.length ? regionArgs : REGIONS;
const seeds: (Seed & { region: string })[] = [];
for (const region of wantedRegions) {
  const { SEEDS } = (await import(`./seeds/${region}.ts`)) as { SEEDS: Seed[] };
  seeds.push(...SEEDS.map((seed) => ({ ...seed, region: REGION_LABELS[region] })));
}
const seen = new Set<string>();
for (const seed of seeds) {
  if (seen.has(seed.id)) throw new Error(`Duplicate route id ${seed.id}`);
  seen.add(seed.id);
}
const ids = args.filter((a) => !REGIONS.includes(a));
const missing = ids.filter((id) => !seen.has(id));
if (missing.length) throw new Error(`No region or route id ${missing.join(', ')}. Regions: ${REGIONS.join(', ')}`);

// Dry runs check shape only: elevation is skipped (climb shows 0) to spare OpenTopoData's daily limit.
const writing = !args.length;
const routes: Route[] = [];
let warnings = 0;
for (const seed of seeds.filter((s) => !ids.length || ids.includes(s.id))) {
  const { route, snaps } = await routeFromWaypoints(
    { id: seed.id, name: seed.name, area: seed.area, region: seed.region, description: seed.description, surface: seed.surface, verified: true },
    seed.waypoints.map(toLngLat),
    politeFetch,
    writing,
  );
  const cumulative = cumulativeDistances(route.path);
  route.messages = seed.messages
    .map((m) => ({ at: Math.round(project(route.path, cumulative, toLngLat(m.near)).along), text: m.text }))
    .sort((a, b) => a.at - b.at);
  routes.push(route);
  const problems: string[] = [];
  const uturns = route.turns.filter((t) => t.direction === 'uturn');
  if (uturns.length) problems.push(`u-turn at ${uturns.map((t) => t.at).join(', ')} m`);
  const farSnaps = snaps.map((d, i) => [i, d]).filter(([, d]) => d > MAX_SNAP_METRES);
  if (farSnaps.length) problems.push(`waypoint ${farSnaps.map(([i, d]) => `#${i} ${d} m`).join(', ')} from a path`);
  warnings += problems.length;
  console.log(
    `${seed.id.padEnd(34)} ${(route.distance / 1000).toFixed(2).padStart(5)} km  ${String(route.turns.length).padStart(3)} turns  ${String(route.ascent).padStart(4)} m up` +
      (route.loop ? '  loop' : '  A to B') +
      problems.map((p) => `  WARNING ${p}`).join(''),
  );
  await sleep(1200);
}

console.log(`${routes.length} routes, ${warnings} warnings`);
if (writing) {
  writeFileSync(new URL('../src/data/routes.json', import.meta.url), JSON.stringify(routes));
  console.log(`Wrote ${routes.length} routes`);
}
