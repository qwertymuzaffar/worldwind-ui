import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_ATTRIBUTIONS, collectAttributions, layerAttribution } from '../src/attribution';
import { createWmsLayerFromCapabilities, createWmtsLayerFromCapabilities, wmsLayerMetadata, wmtsLayerMetadata } from '../src/capabilities';
import { LayerManager, applyLayerOptions, createBuiltInLayer, setLayerAttribution, setLayerLegend } from '../src/layers';
import { collectLegends, layerLegend, wmsLegendGraphicUrl } from '../src/legend';
import { FakeWmsLayer, FakeWmtsLayer, createFakeWorldWind } from '../src/testing';
import { DAY_MS, layerTimeDimension } from '../src/time';

function setup() {
  const ww = createFakeWorldWind();
  const wwd = new ww.WorldWindow(document.createElement('canvas'));
  return { ww, wwd };
}

describe('attribution', () => {
  it('gives built-in layers default credits that can be overridden or suppressed', () => {
    const { ww, wwd } = setup();
    const osm = createBuiltInLayer(ww, wwd, 'osm');
    expect(layerAttribution(osm)?.text).toContain('OpenStreetMap');
    const landsat = createBuiltInLayer(ww, wwd, 'blue-marble-landsat');
    expect(layerAttribution(landsat)).toEqual(DEFAULT_ATTRIBUTIONS['blue-marble']);
    expect(layerAttribution(createBuiltInLayer(ww, wwd, 'atmosphere'))).toBeNull();

    setLayerAttribution(osm, 'Custom');
    expect(layerAttribution(osm)).toEqual({ text: 'Custom' });
    applyLayerOptions(osm, { attribution: { text: 'Other', url: 'https://x' } });
    expect(layerAttribution(osm)).toEqual({ text: 'Other', url: 'https://x' });
    setLayerAttribution(landsat, null);
    expect(layerAttribution(landsat)).toBeNull();
  });

  it('collects distinct credits of enabled layers in stack order', () => {
    const { ww, wwd } = setup();
    const a = createBuiltInLayer(ww, wwd, 'blue-marble');
    const b = createBuiltInLayer(ww, wwd, 'blue-marble-landsat');
    const c = createBuiltInLayer(ww, wwd, 'osm', { enabled: false });
    const d = applyLayerOptions(new ww.RenderableLayer('Mine'), { attribution: 'ACME data' });
    expect(collectAttributions([a, b, c, d]).map((x) => x.text)).toEqual(['Imagery: NASA', 'ACME data']);
    expect(collectAttributions([a, b, c, d], { enabledOnly: false })).toHaveLength(3);
  });
});

describe('legend', () => {
  it('comes from options and lists the top-most layer first', () => {
    const { ww } = setup();
    const a = applyLayerOptions(new ww.RenderableLayer('A'), { legend: 'https://x/a.png' });
    const b = applyLayerOptions(new ww.RenderableLayer('B'), { legend: { url: 'https://x/b.png', width: 20, height: 10 } });
    const c = new ww.RenderableLayer('C');
    expect(layerLegend(c)).toBeNull();
    expect(collectLegends([a, b, c]).map((entry) => entry.layer.displayName)).toEqual(['B', 'A']);
    expect(collectLegends([a, b], { topFirst: false })[0]!.legend).toEqual({ url: 'https://x/a.png' });
    b.enabled = false;
    expect(collectLegends([a, b])).toHaveLength(1);
    expect(collectLegends([a, b], { enabledOnly: false })).toHaveLength(2);
    setLayerLegend(a, null);
    expect(layerLegend(a)).toBeNull();
  });

  it('builds GetLegendGraphic URLs', () => {
    expect(wmsLegendGraphicUrl({ service: 'https://maps.example/wms?map=x', layer: 'roads', style: 'night', width: 20 })).toBe(
      'https://maps.example/wms?map=x&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetLegendGraphic&FORMAT=image%2Fpng&LAYER=roads&STYLE=night&WIDTH=20',
    );
    expect(wmsLegendGraphicUrl({ service: 'https://maps.example/wms', layer: 'a', version: '1.1.1', format: 'image/jpeg', height: 8 })).toContain(
      'VERSION=1.1.1&REQUEST=GetLegendGraphic&FORMAT=image%2Fjpeg&LAYER=a&HEIGHT=8',
    );
  });
});

describe('LayerManager.setTime', () => {
  it('applies the time and notifies', () => {
    const { ww, wwd } = setup();
    const manager = new LayerManager(wwd);
    const layer = manager.add(new ww.WmsLayer({ service: 's', layerNames: 'l' })) as FakeWmsLayer;
    const changes: string[] = [];
    manager.subscribe((change) => changes.push(change.type));
    expect(manager.setTime(layer, '2024-01-01')).toBe('2024-01-01');
    expect(changes).toEqual(['update']);
    expect(layer.timeString).toBe('2024-01-01');
    expect(layer.cachePath).toBe('sl2024-01-01');
  });
});

const wms = `<?xml version="1.0"?>
<WMS_Capabilities version="1.3.0" xmlns="http://www.opengis.net/wms" xmlns:xlink="http://www.w3.org/1999/xlink">
  <Capability><Layer><Title>Root</Title>
    <Layer><Name>weather</Name><Title>Weather radar</Title>
      <Attribution><Title>Met Office</Title><OnlineResource xlink:href="https://met.example/" /></Attribution>
      <Dimension name="time" units="ISO8601" default="2024-01-03">2024-01-01/2024-01-03/P1D</Dimension>
      <Style><Name>default</Name><Title>Default</Title>
        <LegendURL width="20" height="10"><Format>image/png</Format><OnlineResource xlink:href="https://met.example/legend.png" /></LegendURL>
      </Style>
    </Layer>
    <Layer><Name>plain</Name><Title>Plain</Title></Layer>
  </Layer></Capability>
</WMS_Capabilities>`;

const wmts = `<?xml version="1.0"?>
<Capabilities xmlns="http://www.opengis.net/wmts/1.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xlink="http://www.w3.org/1999/xlink">
  <Contents>
    <Layer><ows:Title>Imagery</ows:Title><ows:Identifier>imagery</ows:Identifier>
      <Style isDefault="true"><ows:Identifier>default</ows:Identifier>
        <LegendURL format="image/png" xlink:href="https://tiles.example/legend.png" width="30" height="12" />
      </Style>
      <Style><ows:Identifier>night</ows:Identifier><LegendURL format="image/png" xlink:href="https://tiles.example/night.png" /></Style>
      <Dimension><ows:Identifier>Time</ows:Identifier><Default>2024-01-02</Default><Value>2024-01-01</Value><Value>2024-01-02</Value></Dimension>
    </Layer>
  </Contents>
</Capabilities>`;

const textResponse = (body: string) => ({ ok: true, status: 200, text: async () => body }) as Response;

describe('metadata from capabilities', () => {
  it('reads WMS attribution, legend and time dimension, letting options override', async () => {
    const { ww } = setup();
    const fetchMock = vi.fn().mockResolvedValue(textResponse(wms));
    const layer = (await createWmsLayerFromCapabilities(ww, { service: 'https://met.example/wms', layer: 'weather', fetch: fetchMock })) as FakeWmsLayer;
    expect(layerAttribution(layer)).toEqual({ text: 'Met Office', url: 'https://met.example/' });
    expect(layerLegend(layer)).toEqual({ url: 'https://met.example/legend.png', width: 20, height: 10, format: 'image/png' });
    const dimension = layerTimeDimension(layer)!;
    expect(dimension.stepMs).toBe(DAY_MS);
    expect(dimension.defaultValue?.toISOString()).toBe('2024-01-03T00:00:00.000Z');

    const custom = (await createWmsLayerFromCapabilities(ww, { service: 's', layer: 'weather', fetch: fetchMock, attribution: 'Mine', legend: null })) as FakeWmsLayer;
    expect(layerAttribution(custom)).toEqual({ text: 'Mine' });
    expect(layerLegend(custom)).toBeNull();
    expect(layerTimeDimension(custom)).not.toBeNull();

    const plain = (await createWmsLayerFromCapabilities(ww, { service: 's', layer: 'plain', fetch: fetchMock })) as FakeWmsLayer;
    expect(layerAttribution(plain)).toBeNull();
    expect(layerLegend(plain)).toBeNull();
    expect(layerTimeDimension(plain)).toBeNull();
    expect(wmsLayerMetadata(undefined)).toEqual({});
  });

  it('reads WMTS legends from the chosen or default style, plus the time dimension', async () => {
    const { ww } = setup();
    const fetchMock = vi.fn().mockResolvedValue(textResponse(wmts));
    const layer = (await createWmtsLayerFromCapabilities(ww, { service: 's', layer: 'imagery', fetch: fetchMock })) as FakeWmtsLayer;
    expect(layerLegend(layer)).toEqual({ url: 'https://tiles.example/legend.png', width: 30, height: 12, format: 'image/png' });
    expect(layerTimeDimension(layer)?.values).toHaveLength(2);
    expect(layerTimeDimension(layer)?.defaultValue?.toISOString()).toBe('2024-01-02T00:00:00.000Z');

    const night = (await createWmtsLayerFromCapabilities(ww, { service: 's', layer: 'imagery', style: 'night', fetch: fetchMock })) as FakeWmtsLayer;
    expect(layerLegend(night)?.url).toBe('https://tiles.example/night.png');
    expect(wmtsLayerMetadata({ style: [{ identifier: 'x' }] })).toEqual({});
  });
});
