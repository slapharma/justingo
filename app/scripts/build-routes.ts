// Generates src/data/routes.json: the built-in Greater London route library.
//
//   node scripts/build-routes.ts
//
// Each route is a list of waypoints we chose, snapped to footpaths by the OSRM foot router, with
// elevation from Open-Meteo. The output is committed so the app never calls these services for
// library routes. Re-run only when adding or changing a route; it is polite to the free services.
import { writeFileSync } from 'node:fs';
import { routeFromWaypoints } from '../src/core/build.ts';
import { cumulativeDistances, project } from '../src/core/geo.ts';
import type { LngLat, Route } from '../src/core/types.ts';

interface Seed {
  id: string;
  name: string;
  area: string;
  description: string;
  surface: Route['surface'];
  /** [lat, lng] as read off a map, converted below. */
  waypoints: [number, number][];
  /** Spoken when the runner passes the nearest point on the route to `near` ([lat, lng]). */
  messages: { near: [number, number]; text: string }[];
}

const SEEDS: Seed[] = [
  {
    id: 'hyde-park-loop',
    name: 'Hyde Park & Kensington Gardens',
    area: 'Westminster',
    description: 'The classic central London loop: the Serpentine, Kensington Palace and the Italian Gardens.',
    surface: 'park',
    waypoints: [[51.5028, -0.1527], [51.5053, -0.1745], [51.5075, -0.1845], [51.5105, -0.176], [51.513, -0.159], [51.5028, -0.1527]],
    messages: [
      { near: [51.5053, -0.1745], text: 'The Serpentine lake was created in 1730 for Queen Caroline.' },
      { near: [51.5058, -0.187], text: 'Kensington Palace is just here, where Queen Victoria was born.' },
      { near: [51.513, -0.159], text: "Speakers' Corner. People have gathered to speak their minds here since the 1870s." },
    ],
  },
  {
    id: 'regents-park-primrose-hill',
    name: "Regent's Park & Primrose Hill",
    area: 'Camden',
    description: "Round the Outer Circle and up Primrose Hill for one of London's best skyline views.",
    surface: 'park',
    waypoints: [[51.5232, -0.153], [51.5268, -0.164], [51.5395, -0.1608], [51.533, -0.15], [51.5232, -0.153]],
    messages: [
      { near: [51.5395, -0.1608], text: 'Top of Primrose Hill. Take a second for the view across London. You earned it.' },
    ],
  },
  {
    id: 'thames-bridges-loop',
    name: 'Thames Bridges Loop',
    area: 'Southwark & City',
    description: 'South Bank out to Tower Bridge, back along the north bank to Westminster.',
    surface: 'road',
    waypoints: [[51.5008, -0.1219], [51.5063, -0.1164], [51.5076, -0.0994], [51.5058, -0.086], [51.5055, -0.0754], [51.5081, -0.0759], [51.511, -0.114], [51.501, -0.1245]],
    messages: [
      { near: [51.5076, -0.0994], text: 'Tate Modern, once Bankside Power Station, opened as a gallery in 2000.' },
      { near: [51.5033, -0.0754], text: 'Crossing Tower Bridge, opened in 1894. Mind the tourists.' },
    ],
  },
  {
    id: 'richmond-park-gates',
    name: 'Richmond Park Gates Loop',
    area: 'Richmond upon Thames',
    description: "A big loop linking the park's gates. Rolling hills, open grassland and deer.",
    surface: 'trail',
    waypoints: [[51.4468, -0.2961], [51.4589, -0.2672], [51.454, -0.253], [51.4278, -0.246], [51.415, -0.289], [51.43, -0.306], [51.4468, -0.2961]],
    messages: [
      { near: [51.4589, -0.2672], text: 'Richmond Park is home to hundreds of red and fallow deer. Give them plenty of space.' },
    ],
  },
  {
    id: 'hampstead-heath',
    name: 'Hampstead Heath Hills',
    area: 'Camden',
    description: 'Parliament Hill, the heath and the ponds. Hilly, green and a proper workout.',
    surface: 'trail',
    waypoints: [[51.5553, -0.1508], [51.56, -0.161], [51.5665, -0.1585], [51.5605, -0.164], [51.5553, -0.1508]],
    messages: [
      { near: [51.56, -0.161], text: "Parliament Hill. Look for St Paul's Cathedral on the skyline." },
    ],
  },
  {
    id: 'victoria-park',
    name: 'Victoria Park Loop',
    area: 'Tower Hamlets',
    description: "Flat, fast laps of the East End's People's Park.",
    surface: 'park',
    waypoints: [[51.533, -0.0515], [51.5405, -0.038], [51.5388, -0.027], [51.532, -0.0345], [51.533, -0.0515]],
    messages: [{ near: [51.5388, -0.027], text: "Victoria Park opened in 1845 and is known as the People's Park." }],
  },
  {
    id: 'greenwich-park',
    name: 'Greenwich Park & Cutty Sark',
    area: 'Greenwich',
    description: 'From the Cutty Sark up to the Royal Observatory and round the park.',
    surface: 'park',
    waypoints: [[51.4826, -0.0096], [51.4769, -0.0005], [51.4722, 0.0012], [51.478, 0.005], [51.481, -0.0035], [51.4826, -0.0096]],
    messages: [
      { near: [51.4826, -0.0096], text: 'The Cutty Sark, a tea clipper built in 1869.' },
      { near: [51.4769, -0.0005], text: 'The Royal Observatory, home of the Prime Meridian, longitude zero.' },
    ],
  },
  {
    id: 'battersea-park',
    name: 'Battersea Park',
    area: 'Wandsworth',
    description: 'A flat riverside loop past the Peace Pagoda.',
    surface: 'park',
    waypoints: [[51.4815, -0.158], [51.479, -0.148], [51.4745, -0.152], [51.477, -0.162], [51.4815, -0.158]],
    messages: [{ near: [51.4815, -0.158], text: 'The Peace Pagoda by the river was built in 1985.' }],
  },
  {
    id: 'clapham-common',
    name: 'Clapham Common',
    area: 'Lambeth',
    description: 'A short, flat loop of the common. Good for an easy run or intervals.',
    surface: 'park',
    waypoints: [[51.4618, -0.1384], [51.4575, -0.16], [51.453, -0.147], [51.4618, -0.1384]],
    messages: [],
  },
  {
    id: 'wimbledon-common',
    name: 'Wimbledon Common Trails',
    area: 'Merton',
    description: 'Woodland and heath trails from the Windmill.',
    surface: 'trail',
    waypoints: [[51.4379, -0.2335], [51.426, -0.238], [51.427, -0.222], [51.4379, -0.2335]],
    messages: [{ near: [51.4379, -0.2335], text: 'Wimbledon Windmill dates from 1817.' }],
  },
  {
    id: 'olympic-park',
    name: 'Queen Elizabeth Olympic Park',
    area: 'Newham',
    description: 'Past the stadium, the Orbit and the Velodrome of the London 2012 Games.',
    surface: 'mixed',
    waypoints: [[51.5416, -0.0034], [51.5386, -0.0166], [51.55, -0.015], [51.5405, -0.0105], [51.5416, -0.0034]],
    messages: [{ near: [51.5386, -0.0166], text: 'The London Stadium, centrepiece of the 2012 Olympic Games.' }],
  },
  {
    id: 'bushy-park',
    name: 'Bushy Park',
    area: 'Richmond upon Thames',
    description: 'Wide open paths, the Diana Fountain and Chestnut Avenue.',
    surface: 'park',
    waypoints: [[51.4088, -0.334], [51.4165, -0.3295], [51.423, -0.347], [51.4088, -0.334]],
    messages: [{ near: [51.4165, -0.3295], text: 'The Diana Fountain, on Chestnut Avenue, laid out by Christopher Wren.' }],
  },
  {
    id: 'crystal-palace',
    name: 'Crystal Palace Park',
    area: 'Bromley',
    description: 'A hilly little loop with Victorian dinosaurs.',
    surface: 'park',
    waypoints: [[51.4211, -0.0716], [51.416, -0.066], [51.4225, -0.068], [51.4211, -0.0716]],
    messages: [{ near: [51.416, -0.066], text: 'The Crystal Palace dinosaur sculptures were unveiled in 1854.' }],
  },
  {
    id: 'regents-canal',
    name: "Regent's Canal Towpath",
    area: 'Westminster to Islington',
    description: "Little Venice to King's Cross along the canal, via Camden Lock.",
    surface: 'mixed',
    waypoints: [[51.5215, -0.1845], [51.527, -0.17], [51.5335, -0.159], [51.541, -0.146], [51.5357, -0.125]],
    messages: [
      { near: [51.541, -0.146], text: 'Camden Lock. Watch for walkers and bikes on the narrow towpath.' },
      { near: [51.5357, -0.125], text: "Nearly there. The Regent's Canal opened in 1820." },
    ],
  },
  {
    id: 'kew-richmond-thames',
    name: 'Kew to Richmond Thames Path',
    area: 'Richmond upon Thames',
    description: 'A riverside run from Kew Bridge, past Kew Gardens, to Richmond Bridge.',
    surface: 'trail',
    waypoints: [[51.4875, -0.2885], [51.48, -0.298], [51.465, -0.306], [51.4575, -0.306]],
    messages: [{ near: [51.4575, -0.306], text: "Richmond Bridge, the oldest surviving bridge across the Thames in London." }],
  },
  {
    id: 'alexandra-palace',
    name: 'Alexandra Palace Park',
    area: 'Haringey',
    description: 'Hill repeats with a view: a loop of the park below Ally Pally.',
    surface: 'park',
    waypoints: [[51.5942, -0.13], [51.5905, -0.1245], [51.5925, -0.1175], [51.597, -0.123], [51.5942, -0.13]],
    messages: [{ near: [51.5942, -0.13], text: 'Alexandra Palace hosted the first regular BBC television broadcasts in 1936.' }],
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Identifies us to the free services and backs off when they rate-limit. */
const politeFetch: typeof fetch = async (input, init) => {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(input, {
      ...init,
      headers: { 'User-Agent': 'JustinGo route builder (github.com/slapharma/justingo)' },
    }).catch((err: unknown) => {
      if (attempt === 5) throw err;
      return null; // dropped connection: retry
    });
    if (res && (res.status !== 429 || attempt === 5)) return res;
    await sleep(5000 * 2 ** attempt);
  }
};
const toLngLat = ([lat, lng]: [number, number]): LngLat => [lng, lat];

const only = process.argv[2];
const routes: Route[] = [];
for (const seed of SEEDS.filter((s) => !only || s.id === only)) {
  const route = await routeFromWaypoints(
    { id: seed.id, name: seed.name, area: seed.area, description: seed.description, surface: seed.surface, verified: true },
    seed.waypoints.map(toLngLat),
    politeFetch,
  );
  const cumulative = cumulativeDistances(route.path);
  route.messages = seed.messages
    .map((m) => ({ at: Math.round(project(route.path, cumulative, toLngLat(m.near)).along), text: m.text }))
    .sort((a, b) => a.at - b.at);
  routes.push(route);
  const uturns = route.turns.filter((t) => t.direction === 'uturn').length;
  console.log(
    `${seed.id.padEnd(28)} ${(route.distance / 1000).toFixed(2)} km  ${String(route.turns.length).padStart(3)} turns  ${route.ascent} m up` +
      (uturns ? `  WARNING u-turn at ${route.turns.filter((t) => t.direction === 'uturn').map((t) => t.at).join(', ')} m` : ''),
  );
  await sleep(1200);
}

if (!only) {
  writeFileSync(new URL('../src/data/routes.json', import.meta.url), JSON.stringify(routes));
  console.log(`Wrote ${routes.length} routes`);
}
