import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FakePlacemark, FakeRenderableLayer, FakeWmsLayer, FakeWmtsLayer } from 'worldwind-kit/testing';
import { GeoJsonLayer, KmlLayer, WmsLayer, WmtsLayer } from '../src';
import { renderInGlobe } from './helpers';

const wmtsXml = `<Capabilities xmlns="http://www.opengis.net/wmts/1.0" xmlns:ows="http://www.opengis.net/ows/1.1"><Contents>
  <Layer><ows:Title>Roads</ows:Title><ows:Identifier>roads</ows:Identifier></Layer></Contents></Capabilities>`;
const wmsXml = `<WMS_Capabilities xmlns="http://www.opengis.net/wms"><Capability><Layer><Layer><Name>weather</Name><Title>Weather</Title></Layer></Layer></Capability></WMS_Capabilities>`;

const geojson = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'A' }, geometry: { type: 'Point', coordinates: [1, 2] } },
    { type: 'Feature', properties: { name: 'B' }, geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } },
  ],
};

describe('data layers', () => {
  it('creates WMTS and capabilities-based WMS layers asynchronously', async () => {
    const fetchMock = vi.fn((url: string) => Promise.resolve({ ok: true, status: 200, text: async () => (url.includes('WMTS') ? wmtsXml : wmsXml) } as Response));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const { wwd } = await renderInGlobe(
        <>
          <WmtsLayer service="https://tiles.example/wmts" layer="roads" style="night" opacity={0.7} />
          <WmsLayer service="https://maps.example/wms" layerNames="weather" fromCapabilities displayName="Radar" />
        </>,
      );
      await waitFor(() => expect(wwd.layers).toHaveLength(2));
      const wmts = wwd.layers.find((l) => l.displayName === 'Roads') as FakeWmtsLayer;
      const wms = wwd.layers.find((l) => l.displayName === 'Radar') as FakeWmsLayer;
      expect(wmts.config).toMatchObject({ identifier: 'roads', style: 'night' });
      expect(wmts.opacity).toBe(0.7);
      expect(wms.config).toMatchObject({ layerNames: 'weather', title: 'Radar' });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('reports asynchronous failures through onError and never adds the layer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => '' } as Response));
    try {
      const onError = vi.fn();
      const { wwd } = await renderInGlobe(<WmtsLayer service="https://down.example/wmts" layer="x" onError={onError} />);
      await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/HTTP 500/) })));
      expect(wwd.layers).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('loads GeoJSON into its own layer and reloads on source change', async () => {
    const onLoad = vi.fn();
    const { wwd, rerender } = await renderInGlobe(
      <GeoJsonLayer source={geojson} name="Places" style={{ point: { pushpin: 'green', labelProperty: 'name' } }} onLoad={onLoad} />,
    );
    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1));
    const layer = wwd.layers[0] as FakeRenderableLayer;
    expect(layer.displayName).toBe('Places');
    expect(layer.renderables).toHaveLength(2);
    const point = layer.renderables[0] as FakePlacemark;
    expect(point.label).toBe('A');
    expect(point.attributes.imageSource).toContain('plain-green');

    const smaller = { type: 'FeatureCollection', features: [geojson.features[0]] };
    await rerender(<GeoJsonLayer source={smaller} name="Places" style={{ point: { pushpin: 'green', labelProperty: 'name' } }} onLoad={onLoad} />);
    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(2));
    expect(layer.renderables).toHaveLength(1);
  });

  it('loads KML into its own layer', async () => {
    const onLoad = vi.fn();
    const { wwd } = await renderInGlobe(<KmlLayer url="https://example.org/tour.kml" name="Tour" onLoad={onLoad} />);
    await waitFor(() => expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ kind: 'kml', url: 'https://example.org/tour.kml' })));
    const layer = wwd.layers[0] as FakeRenderableLayer;
    expect(layer.displayName).toBe('Tour');
    expect(layer.renderables).toHaveLength(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
