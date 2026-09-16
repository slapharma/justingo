# JustinGo

JustinGo is a running app with turn-by-turn voice directions for routes across Greater London.
Pick a route, press start, and it tells you every turn before you reach it — no need to check a
map mid-run. It's a personal project of Justin, modelled on the feature set of the RunGo app, with
its own code, design, copy and routes.

The repo holds three things: the app itself (Expo, TypeScript), a static marketing site, and a
build script that combines both into one Vercel deployment.

## Repo layout

```
app/            Expo Router app (TypeScript). The product itself.
  src/core/     Pure TypeScript navigation engine — no React Native imports, runs under Node.
  src/app/      Screens (file-based routing via Expo Router).
  src/data/     routes.json, the built-in Greater London route library (committed, not fetched live).
  scripts/      build-routes.ts (regenerates routes.json), copy-maplibre-worker.cjs (postinstall).
site/           The static one-page marketing site (plain HTML/CSS/JS, no build step).
scripts/        build.mjs and serve-out.mjs, which assemble the Vercel deployment from app/ and site/.
vercel.json     Install/build/output config and routing for the Vercel project (slapharma/justingo).
```

There is no root `package.json` — the site has no dependencies, and `scripts/build.mjs` uses only
Node's built-in modules. All npm dependencies live in `app/`.

## Try it

Local development produces a live app you can run in a browser (see **Develop** below). At a
window width of 1080px or more, it renders inside a phone frame next to a "virtual runner" demo
panel — press **Demo run** on any route to watch a simulated run, complete with voice cues, without
needing real GPS or to leave your desk. Narrower windows get the app full-screen, with a compact
demo bar inside the run screen instead of the side panel.

The production build is a Vercel deployment (project `slapharma/justingo`): the marketing site at
`/`, the app at `/app`, and the route library at `/routes.json`.

## Develop

Prerequisites: Node.js and npm. The navigation-engine scripts run TypeScript directly via Node's
built-in support (there's no `ts-node` or `tsx` dependency), so use a recent Node.js version.

Install cannot complete on a synced/cloud drive (e.g. a Google Drive folder) — work from a normal
local disk checkout.

```
cd C:\dev\justingo\app
npm install
npm run web
```

`npm install` also runs `postinstall`, which copies MapLibre's web worker into `app/public/maplibre`
(`app/scripts/copy-maplibre-worker.cjs`). This is needed because Metro bundles MapLibre into a
single script, which breaks the worker's own URL if the file isn't served separately.

`npm run web` starts the Expo dev server and serves the app at the root of whatever URL it prints
(it ignores the `/app` base URL that the production build uses).

Other app-level scripts (run from `app/`, or with `npm run <script> --prefix app` from the repo
root):

| Script | What it does |
|---|---|
| `npm start` | `expo start` — pick a platform from the interactive menu. |
| `npm run android` / `npm run ios` | `expo start --android` / `--ios`. |
| `npm run web` | `expo start --web`, the browser preview described above. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Runs the core engine's test suite (see **Test**). |
| `npm run export:web` | `expo export -p web --output-dir dist` — used internally by the production build, not usually run by hand. |

## Test

The navigation engine in `app/src/core` is plain TypeScript with no React Native imports, so it's
tested with Node's built-in test runner rather than a React Native test setup:

```
cd C:\dev\justingo\app
npm test
```

This runs `node --test src/core/*.test.ts src/*.test.ts`, covering geometry (`geo.test.ts`), turn
detection (`turns.test.ts`), cue building and the `NavEngine` state machine (`engine.test.ts`),
route assembly (`build.test.ts`), GPX import/export (`gpx.test.ts`), OSRM response parsing
(`osrm.test.ts`), and formatting helpers (`format.test.ts`, `core.test.ts`).

## Build & deploy

`scripts/build.mjs`, run from the repo root, produces the whole Vercel deployment in `out/`:

```
cd C:\dev\justingo
node scripts/build.mjs
```

It runs `npx expo export --platform web --output-dir dist --clear` inside `app/`, then assembles:

- `out/` (site root) — a copy of `site/`
- `out/app/` — the exported Expo web build
- `out/routes.json` — a copy of `app/src/data/routes.json`, which the website's route list fetches

It then checks that `index.html`, `app/index.html`, `app/maplibre/maplibre-gl-worker.mjs` and
`routes.json` all exist in `out/`, and fails loudly if any are missing.

To check a production build locally before deploying:

```
cd C:\dev\justingo
node scripts/build.mjs
node scripts/serve-out.mjs 4173
```

Then open `http://localhost:4173`. `serve-out.mjs` serves `out/` the same way `vercel.json` does:
static files first, and any unmatched path under `/app` falls back to `app/index.html` (so
client-side routes like `/app/route/hyde-park-loop` work on a hard refresh). The port defaults to
4173 if you omit the argument.

On Vercel itself, `vercel.json` sets:

- **Install:** `npm ci --prefix app`
- **Build:** `node scripts/build.mjs`
- **Output directory:** `out`
- **Rewrite:** `/app/:path*` → `/app/index.html` (so the exported single-page app handles its own routes)
- **Headers:** long-lived immutable caching for `/app/_expo/static/*`, plus `X-Content-Type-Options`,
  `Referrer-Policy`, and a `Permissions-Policy` that allows geolocation only for the site's own
  origin and blocks camera and microphone entirely

## Regenerating routes

The 16 built-in Greater London routes live in `app/src/data/routes.json`, committed so the app
never has to call the routing or elevation services for its own library. To rebuild it from the
waypoints in `app/scripts/build-routes.ts`:

```
cd C:\dev\justingo\app
node scripts/build-routes.ts
```

Each route is a hand-picked list of waypoints, snapped to real footpaths by the OSRM foot router,
with elevation added from Open-Meteo and turns detected from the resulting geometry. Pass a route
ID as an argument to rebuild just one route without touching the committed file (useful for
checking a change before regenerating everything):

```
cd C:\dev\justingo\app
node scripts/build-routes.ts hyde-park-loop
```

Only re-run this when adding or changing a route — it calls two free, rate-limited public services,
so running it needlessly is inconsiderate to them. The script identifies itself with a `User-Agent`
and backs off on HTTP 429.

## Services & attribution

The app and the route builder rely on keyless, free-tier third-party services. All are fine for a
preview or personal project; a production app serving real traffic should move to paid or
self-hosted alternatives.

| Service | Used for | Notes |
|---|---|---|
| OSRM demo server (`routing.openstreetmap.de`, foot profile) | Snapping waypoints to footpaths, park paths and trails when building routes | Run by FOSSGIS under a fair-use policy — keyless, but not for heavy or commercial use. A production app should move to a paid host (e.g. OpenRouteService) or a self-hosted OSRM instance. |
| Open-Meteo elevation API | Elevation samples along each route (Copernicus 90 m DEM) | Free tier is for non-commercial use. |
| CARTO basemaps (`basemaps.cartocdn.com`, Positron / Dark Matter styles) | Map tiles in the browser preview and app map (via MapLibre GL) | Free tier has usage limits; a production app should move to a paid tile provider (e.g. MapTiler). |

Attribution shown on the site and required by the map data: **© OpenStreetMap contributors, © CARTO**.

## Roadmap

- **Website** — done (this is `site/`, plus the `/app` and `/routes.json` build outputs described above).
- **Backend** — a Supabase backend for auth, saved routes and run history.
- **Native apps** — iOS and Android builds via EAS. This replaces the SVG-based map placeholder in
  `app/src/components/RouteMap.tsx` with `@maplibre/maplibre-react-native` (the current placeholder
  draws the route shape without tiles and says so in its own comment), adds background location
  tracking (currently the run screen only tracks GPS in the foreground) and audio ducking, and adds
  offline support. A development build is needed for this, not Expo Go.
- **Store launch.**

Free for now.
