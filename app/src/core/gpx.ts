import type { LngLat } from './types.ts';

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// &amp; last, so "&amp;lt;" decodes to "&lt;" rather than "<".
const unescapeXml = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

export function toGpx(name: string, path: LngLat[]): string {
  const points = path
    .map(([lng, lat]) => `      <trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"></trkpt>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="JustinGo" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}

/**
 * Reads track points, falling back to route points, from a GPX file. Attribute order varies
 * between exporters, so lat and lon are matched independently.
 */
export function parseGpx(xml: string): { name: string; path: LngLat[] } {
  const read = (tag: string): LngLat[] => {
    const out: LngLat[] = [];
    const re = new RegExp(`<${tag}\\b([^>]*)>`, 'g');
    for (const m of xml.matchAll(re)) {
      const lat = /\blat\s*=\s*["']([-\d.]+)["']/.exec(m[1]);
      const lon = /\blon\s*=\s*["']([-\d.]+)["']/.exec(m[1]);
      if (lat && lon) out.push([Number(lon[1]), Number(lat[1])]);
    }
    return out;
  };
  let path = read('trkpt');
  if (path.length < 2) path = read('rtept');
  if (path.length < 2) throw new Error('No track or route points found in this GPX file.');
  const rawName = /<name>([^<]*)<\/name>/.exec(xml)?.[1]?.trim();
  const name = rawName ? unescapeXml(rawName) : 'Imported route';
  return { name, path };
}
