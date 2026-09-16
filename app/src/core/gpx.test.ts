import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseGpx, toGpx } from './gpx.ts';

describe('parseGpx entity handling', () => {
  it('decodes the standard XML entities in a track name', () => {
    const xml =
      '<gpx><trk><name>Fish &amp; Chips &lt;3 &quot;Run&quot; &apos;s</name>' +
      '<trkseg><trkpt lat="51.5" lon="-0.1"/><trkpt lat="51.51" lon="-0.1"/></trkseg></trk></gpx>';
    assert.equal(parseGpx(xml).name, 'Fish & Chips <3 "Run" \'s');
  });

  it('round-trips a name containing special characters through toGpx', () => {
    const name = 'Fish & Chips <3 "Run"';
    const gpx = toGpx(name, [[-0.1, 51.5], [-0.1, 51.51]]);
    assert.equal(parseGpx(gpx).name, name);
  });

  it('only unescapes one level, so a double-escaped entity is left partly escaped', () => {
    // &amp;lt; is a literal ampersand followed by "lt;" -- as if a "<" had already been through
    // escapeXml twice. A single decode pass must turn it into "&lt;", not "<".
    const xml = '<gpx><trk><name>&amp;lt;title&amp;gt;</name>' +
      '<trkseg><trkpt lat="51.5" lon="-0.1"/><trkpt lat="51.51" lon="-0.1"/></trkseg></trk></gpx>';
    assert.equal(parseGpx(xml).name, '&lt;title&gt;');
  });

  it('falls back to a default name when the GPX has none', () => {
    const xml = '<gpx><trk><trkseg><trkpt lat="51.5" lon="-0.1"/><trkpt lat="51.51" lon="-0.1"/></trkseg></trk></gpx>';
    assert.equal(parseGpx(xml).name, 'Imported route');
  });
});
