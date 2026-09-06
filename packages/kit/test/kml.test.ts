import { describe, expect, it } from 'vitest';
import { loadKml } from '../src/kml';
import { createFakeWorldWind, type FakeKmlDocument } from '../src/testing';

describe('loadKml', () => {
  it('loads the document and adds it to the layer', async () => {
    const ww = createFakeWorldWind();
    const layer = new ww.RenderableLayer('KML');
    const document = (await loadKml(ww, 'https://example.org/places.kml', layer)) as FakeKmlDocument;
    expect(document).toMatchObject({ kind: 'kml', url: 'https://example.org/places.kml' });
    expect(layer.renderables).toEqual([document]);
  });
});
