import { Component, signal, viewChild } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { FakePlacemark, FakeRenderableLayer, FakeWmsLayer, FakeWmtsLayer } from 'worldwind-kit/testing';
import { WwGlobeComponent } from '../src/lib/globe.component';
import { WwGeoJsonLayerComponent, WwKmlLayerComponent, WwWmsLayerComponent, WwWmtsLayerComponent } from '../src/lib/layers';
import { mount, settle } from './helpers';

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

@Component({
  imports: [WwGlobeComponent, WwWmtsLayerComponent, WwWmsLayerComponent, WwGeoJsonLayerComponent, WwKmlLayerComponent],
  template: `
    <ww-globe>
      <ww-wmts-layer service="https://tiles.example/wmts" layer="roads" styleName="night" [opacity]="0.7" (loadError)="errors.push($event)" />
      <ww-wms-layer service="https://maps.example/wms" layerNames="weather" [fromCapabilities]="true" displayName="Radar" />
      <ww-geojson-layer [source]="source()" name="Places" [featureStyle]="{ point: { pushpin: 'green', labelProperty: 'name' } }" (loaded)="loads = loads + 1" />
      <ww-kml-layer url="https://example.org/tour.kml" name="Tour" (loaded)="kml = $event" />
    </ww-globe>
  `,
})
class Host {
  readonly source = signal<object>(geojson);
  readonly globe = viewChild.required(WwGlobeComponent);
  errors: unknown[] = [];
  loads = 0;
  kml: unknown = null;
}

@Component({
  imports: [WwGlobeComponent, WwGeoJsonLayerComponent],
  template: `
    <ww-globe>
      <ww-geojson-layer [source]="source()" name="Places" (loaded)="loads = loads + 1" (loadError)="errors.push($event)" />
    </ww-globe>
  `,
})
class SlowSourceHost {
  readonly source = signal<string | object>('https://example.org/slow.geojson');
  errors: unknown[] = [];
  loads = 0;
}

describe('data layer components', () => {
  it('creates capabilities-based layers, GeoJSON and KML asynchronously', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve({ ok: true, status: 200, text: async () => (url.includes('WMTS') ? wmtsXml : wmsXml) } as Response)));
    try {
      const { fixture, wwd } = await mount(Host);
      await settle(fixture);
      await vi.waitFor(() => expect(wwd.layers).toHaveLength(4));
      const wmts = wwd.layers.find((l) => l.displayName === 'Roads') as FakeWmtsLayer;
      const wms = wwd.layers.find((l) => l.displayName === 'Radar') as FakeWmsLayer;
      const places = wwd.layers.find((l) => l.displayName === 'Places') as FakeRenderableLayer;
      const tour = wwd.layers.find((l) => l.displayName === 'Tour') as FakeRenderableLayer;
      expect(wmts.config).toMatchObject({ identifier: 'roads', style: 'night' });
      expect(wmts.opacity).toBe(0.7);
      expect(wms.config).toMatchObject({ layerNames: 'weather', title: 'Radar' });
      await vi.waitFor(() => expect(fixture.componentInstance.loads).toBe(1));
      expect(places.renderables).toHaveLength(2);
      expect((places.renderables[0] as FakePlacemark).label).toBe('A');
      expect((places.renderables[0] as FakePlacemark).attributes.imageSource).toContain('plain-green');
      await vi.waitFor(() => expect(fixture.componentInstance.kml).toMatchObject({ kind: 'kml' }));
      expect(tour.renderables).toHaveLength(1);
      expect(fixture.componentInstance.errors).toEqual([]);

      fixture.componentInstance.source.set({ type: 'FeatureCollection', features: [geojson.features[0]] });
      await settle(fixture);
      await vi.waitFor(() => expect(fixture.componentInstance.loads).toBe(2));
      expect(places.renderables).toHaveLength(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('emits loadError when a capabilities request fails and adds nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => '' } as Response));
    try {
      const { fixture, wwd } = await mount(Host);
      await vi.waitFor(() => expect(fixture.componentInstance.errors.length).toBeGreaterThan(0));
      expect(String((fixture.componentInstance.errors[0] as Error).message)).toMatch(/HTTP 500/);
      expect(wwd.layers.map((l) => l.displayName)).not.toContain('Roads');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('cancels an in-flight GeoJSON load when the source changes and reports only the latest', async () => {
    let fetchSignal: AbortSignal | null = null;
    // Like a real fetch, the pending request rejects with AbortError once its signal is aborted.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            fetchSignal = init?.signal ?? null;
            fetchSignal?.addEventListener('abort', () => reject(new DOMException('The load was aborted.', 'AbortError')));
          }),
      ),
    );
    try {
      const { fixture, wwd } = await mount(SlowSourceHost);
      await vi.waitFor(() => expect(fetchSignal).not.toBeNull());
      expect(fixture.componentInstance.loads).toBe(0);

      fixture.componentInstance.source.set({ type: 'FeatureCollection', features: [geojson.features[0]] });
      await settle(fixture);

      expect(fetchSignal!.aborted).toBe(true);
      await vi.waitFor(() => expect(fixture.componentInstance.loads).toBe(1));
      const places = wwd.layers.find((layer) => layer.displayName === 'Places') as FakeRenderableLayer;
      expect(places.renderables).toHaveLength(1);
      expect(fixture.componentInstance.errors).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
