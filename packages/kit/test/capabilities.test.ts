import { describe, expect, it, vi } from 'vitest';
import {
  capabilitiesUrl,
  createWmsLayerFromCapabilities,
  createWmtsLayerFromCapabilities,
  fetchCapabilities,
} from '../src/capabilities';
import { FakeWmsLayer, FakeWmtsLayer, createFakeWorldWind } from '../src/testing';

const wmts = `<?xml version="1.0"?>
<Capabilities xmlns="http://www.opengis.net/wmts/1.0" xmlns:ows="http://www.opengis.net/ows/1.1">
  <Contents>
    <Layer><ows:Title>Imagery</ows:Title><ows:Identifier>imagery</ows:Identifier></Layer>
    <Layer><ows:Title>Roads</ows:Title><ows:Identifier>roads</ows:Identifier></Layer>
  </Contents>
</Capabilities>`;

const wms = `<?xml version="1.0"?>
<WMS_Capabilities version="1.3.0" xmlns="http://www.opengis.net/wms">
  <Capability><Layer><Title>Root</Title>
    <Layer><Name>weather</Name><Title>Weather radar</Title></Layer>
  </Layer></Capability>
</WMS_Capabilities>`;

const textResponse = (body: string, ok = true, status = 200) => ({ ok, status, text: async () => body }) as Response;

describe('capabilitiesUrl', () => {
  it('adds SERVICE and REQUEST unless the URL already asks for something', () => {
    expect(capabilitiesUrl('https://example.org/wmts', 'WMTS')).toBe('https://example.org/wmts?SERVICE=WMTS&REQUEST=GetCapabilities');
    expect(capabilitiesUrl('https://example.org/wms?request=GetCapabilities&service=WMS', 'WMS')).toBe(
      'https://example.org/wms?request=GetCapabilities&service=WMS',
    );
  });
});

describe('fetchCapabilities', () => {
  it('parses XML and rejects HTTP and parse errors', async () => {
    const good = vi.fn().mockResolvedValue(textResponse(wmts));
    const document = await fetchCapabilities('https://example.org/wmts', { fetch: good });
    expect(document.querySelectorAll('Layer')).toHaveLength(2);
    await expect(fetchCapabilities('https://x', { fetch: vi.fn().mockResolvedValue(textResponse('', false, 503)) })).rejects.toThrow(/HTTP 503/);
    await expect(fetchCapabilities('https://x', { fetch: vi.fn().mockResolvedValue(textResponse('<broken')) })).rejects.toThrow(/could not parse/);
  });
});

describe('createWmtsLayerFromCapabilities', () => {
  it('builds the layer from the matching capabilities entry', async () => {
    const ww = createFakeWorldWind();
    const fetchMock = vi.fn().mockResolvedValue(textResponse(wmts));
    const layer = (await createWmtsLayerFromCapabilities(ww, {
      service: 'https://example.org/wmts',
      layer: 'roads',
      style: 'night',
      format: 'image/jpeg',
      opacity: 0.5,
      fetch: fetchMock,
    })) as FakeWmtsLayer;
    expect(fetchMock.mock.calls[0]![0]).toBe('https://example.org/wmts?SERVICE=WMTS&REQUEST=GetCapabilities');
    expect(layer).toBeInstanceOf(FakeWmtsLayer);
    expect(layer.config).toMatchObject({ identifier: 'roads', title: 'Roads', style: 'night', format: 'image/jpeg' });
    expect(layer.displayName).toBe('Roads');
    expect(layer.opacity).toBe(0.5);
  });

  it('rejects unknown layers and honours displayName and time', async () => {
    const ww = createFakeWorldWind();
    const fetchMock = vi.fn().mockResolvedValue(textResponse(wmts));
    await expect(createWmtsLayerFromCapabilities(ww, { service: 's', layer: 'nope', fetch: fetchMock })).rejects.toThrow(/"nope" not found/);
    const layer = (await createWmtsLayerFromCapabilities(ww, { service: 's', layer: 'imagery', displayName: 'Sat', time: '2024', fetch: fetchMock })) as FakeWmtsLayer;
    expect(layer.displayName).toBe('Sat');
    expect(layer.timeString).toBe('2024');
  });
});

describe('createWmsLayerFromCapabilities', () => {
  it('builds the WMS layer from the named capabilities entry', async () => {
    const ww = createFakeWorldWind();
    const fetchMock = vi.fn().mockResolvedValue(textResponse(wms));
    const layer = (await createWmsLayerFromCapabilities(ww, { service: 'https://example.org/wms', layer: 'weather', fetch: fetchMock })) as FakeWmsLayer;
    expect(layer).toBeInstanceOf(FakeWmsLayer);
    expect(layer.config).toMatchObject({ layerNames: 'weather', title: 'Weather radar', numLevels: 19 });
    await expect(createWmsLayerFromCapabilities(ww, { service: 's', layer: 'missing', fetch: fetchMock })).rejects.toThrow(/not found/);
  });
});
