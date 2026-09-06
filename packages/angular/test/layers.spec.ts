import { Component, signal, viewChild } from '@angular/core';
import { describe, expect, it } from 'vitest';
import type { BuiltInLayerKind, GlobeController, WWLayer } from 'worldwind-kit';
import type { FakeWmsLayer } from 'worldwind-kit/testing';
import { WwGlobeComponent } from '../src/lib/globe.component';
import {
  WwCustomLayerComponent,
  WwLayerComponent,
  WwRenderableLayerComponent,
  WwWmsLayerComponent,
} from '../src/lib/layers';
import { mount, settle } from './helpers';

@Component({
  imports: [WwGlobeComponent, WwLayerComponent, WwWmsLayerComponent, WwRenderableLayerComponent, WwCustomLayerComponent],
  template: `
    <ww-globe>
      <ww-layer [kind]="kind()" [opacity]="opacity()" [enabled]="enabled()" />
      @if (showStars()) {
        <ww-layer kind="star-field" [index]="0" />
      }
      <ww-wms-layer service="https://wms" layerNames="a" displayName="Weather" [numLevels]="5" [time]="'2024-01-01'" />
      <ww-renderable-layer name="Pins" [pickEnabled]="false" />
      <ww-custom-layer [factory]="factory" />
    </ww-globe>
  `,
})
class Host {
  readonly kind = signal<BuiltInLayerKind>('osm');
  readonly opacity = signal(0.4);
  readonly enabled = signal(true);
  readonly showStars = signal(false);
  readonly globe = viewChild.required(WwGlobeComponent);
  factoryCalls: GlobeController[] = [];
  readonly factory = (globe: GlobeController): WWLayer => {
    this.factoryCalls.push(globe);
    return new globe.worldWind.Layer('Custom');
  };
}

describe('layer components', () => {
  it('adds layers in template order with their options', async () => {
    const { fixture, fake, wwd } = await mount(Host);
    expect(wwd.layers.map((l) => l.displayName)).toEqual(['OpenStreetMap', 'Weather', 'Pins', 'Custom']);
    expect(wwd.layers[0]!.opacity).toBe(0.4);
    expect((wwd.layers[1] as FakeWmsLayer).config).toMatchObject({ service: 'https://wms', layerNames: 'a', numLevels: 5, title: 'Weather' });
    expect((wwd.layers[1] as FakeWmsLayer).timeString).toBe('2024-01-01');
    expect(wwd.layers[2]).toBeInstanceOf(fake.RenderableLayer);
    expect(wwd.layers[2]!.pickEnabled).toBe(false);
    expect(fixture.componentInstance.factoryCalls).toHaveLength(1);
    expect(fixture.componentInstance.globe().layers()).toHaveLength(4);
  });

  it('applies option changes in place and recreates on kind change', async () => {
    const { fixture, wwd } = await mount(Host);
    const host = fixture.componentInstance;
    const osm = wwd.layers[0]!;
    host.opacity.set(0.9);
    host.enabled.set(false);
    await settle(fixture);
    expect(wwd.layers[0]).toBe(osm);
    expect(osm.opacity).toBe(0.9);
    expect(osm.enabled).toBe(false);

    host.kind.set('atmosphere');
    await settle(fixture);
    expect(wwd.layers.map((l) => l.displayName)).toEqual(['Weather', 'Pins', 'Custom', 'Atmosphere']);
    expect(wwd.layers[3]!.opacity).toBe(0.9);
  });

  it('inserts at an index and removes layers with their component', async () => {
    const { fixture, wwd } = await mount(Host);
    fixture.componentInstance.showStars.set(true);
    await settle(fixture);
    expect(wwd.layers[0]!.displayName).toBe('StarField');
    expect(wwd.layers).toHaveLength(5);
    fixture.componentInstance.showStars.set(false);
    await settle(fixture);
    expect(wwd.layers.map((l) => l.displayName)).not.toContain('StarField');
    expect(fixture.componentInstance.globe().layers()).toHaveLength(4);
  });
});
