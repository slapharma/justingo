// Builds the whole Vercel deployment into ./out:
//   /            the one-page website (site/)
//   /app/        the app, exported for the web from app/ (base URL "/app", see app/app.json)
//   /routes.json the route library, read by the website's route list
//
//   node scripts/build.mjs
import { execSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = join(root, 'app');
const out = join(root, 'out');

execSync('npx expo export --platform web --output-dir dist --clear', { cwd: app, stdio: 'inherit' });

rmSync(out, { recursive: true, force: true });
cpSync(join(root, 'site'), out, { recursive: true });
cpSync(join(app, 'dist'), join(out, 'app'), { recursive: true });
cpSync(join(app, 'src', 'data', 'routes.json'), join(out, 'routes.json'));

for (const required of ['index.html', 'app/index.html', 'app/maplibre/maplibre-gl-worker.mjs', 'routes.json']) {
  if (!existsSync(join(out, required))) throw new Error(`Build output is missing ${required}`);
}
console.log('Built site and app into out/');
