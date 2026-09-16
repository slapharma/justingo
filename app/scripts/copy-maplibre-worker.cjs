// MapLibre GL starts its web worker from a file next to its own module. Metro bundles MapLibre
// into one script, so that file is never served and the map stays blank. Copy the worker (and the
// shared chunk it imports) into public/, and RouteMap.web.tsx points MapLibre at it.
const fs = require('node:fs');
const path = require('node:path');

const dist = path.dirname(require.resolve('maplibre-gl/package.json')) + '/dist';
const out = path.join(__dirname, '..', 'public', 'maplibre');
fs.mkdirSync(out, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  fs.copyFileSync(path.join(dist, file), path.join(out, file));
}
console.log('Copied MapLibre worker to public/maplibre');
