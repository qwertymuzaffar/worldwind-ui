import { Component } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { parseTimeDimension, type LayerAttribution, type TimeDimension } from 'worldwind-kit';
import type { FakeWmsLayer } from 'worldwind-kit/testing';
import { WwGlobeComponent } from '../src/lib/globe.component';
import { WwGeoJsonLayerComponent, WwLayerComponent, WwRenderableLayerComponent, WwWmsLayerComponent } from '../src/lib/layers';
import { WwAttributionComponent } from '../src/lib/ui/attribution.component';
import { WwCompassComponent } from '../src/lib/ui/compass.component';
import { WwLegendComponent } from '../src/lib/ui/legend.component';
import { WwScaleBarComponent } from '../src/lib/ui/scale-bar.component';
import { WwTimeSliderComponent } from '../src/lib/ui/time-slider.component';
import { mount, query, setInputValue, settle } from './helpers';

@Component({
  imports: [
    WwGlobeComponent,
    WwLayerComponent,
    WwRenderableLayerComponent,
    WwGeoJsonLayerComponent,
    WwWmsLayerComponent,
    WwScaleBarComponent,
    WwCompassComponent,
    WwAttributionComponent,
    WwLegendComponent,
    WwTimeSliderComponent,
  ],
  template: `
    <ww-globe [options]="{ layers: ['blue-marble', 'blue-marble-landsat'], view: { range: 10000000, heading: 90 } }">
      <ww-layer kind="osm" [enabled]="false" />
      <ww-renderable-layer name="Airports" legend="https://x/airports.png" attribution="Data: ACME" />
      <ww-renderable-layer name="Plain" />
      <ww-wms-layer service="https://wms.example" layerNames="radar" [timeDimension]="dimension" />
      <ww-scale-bar />
      <ww-compass (compassClick)="clicks.push($event)" />
      <ww-attribution [extra]="extra" />
      <ww-legend />
      <ww-time-slider [playInterval]="40" [loop]="false" (valueChange)="changes.push($event)" />
    </ww-globe>
  `,
})
class Host {
  readonly dimension: TimeDimension = parseTimeDimension('2024-01-01/2024-01-05/P1D')!;
  readonly extra: Array<string | LayerAttribution> = ['Data: ACME', { text: 'Made with worldwind-ui', url: 'https://example.org' }];
  clicks: number[] = [];
  changes: Date[] = [];
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('map widgets', () => {
  it('scale bar shows a round distance and follows the zoom', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const panel = query(element, '.wwui-scale-panel');
    expect(panel.getAttribute('aria-label')).toBe('Scale: 1,000 km');
    expect(query(element, '.wwui-scale__bar').style.width).toBe('100px');
    wwd.navigator.range = 1_000_000;
    wwd.simulateFrame();
    await settle(fixture);
    expect(panel.getAttribute('aria-label')).toBe('Scale: 100 km');
  });

  it('compass turns with the heading and resets north on click', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const button = query<HTMLButtonElement>(element, '.wwui-compass');
    expect(button.getAttribute('data-heading')).toBe('90');
    expect(query(element, '.wwui-compass__rose').style.transform).toBe('rotate(-90deg)');
    button.click();
    expect(wwd.navigator.heading).toBe(0);
    expect(fixture.componentInstance.clicks).toEqual([90]);
    wwd.simulateFrame();
    await settle(fixture);
    expect(button.getAttribute('data-heading')).toBe('0');
    expect(button.getAttribute('aria-label')).toBe('Compass, heading 0 degrees. Reset to north');
  });

  it('attribution credits enabled layers once each, plus extras, and follows toggles', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const strip = query(element, '.wwui-attribution');
    expect(strip.textContent?.replace(/\s+/g, ' ').trim()).toBe('Imagery: NASA · Data: ACME · Made with worldwind-ui');
    expect(query<HTMLAnchorElement>(element, '.wwui-attribution a').getAttribute('href')).toBe('https://worldwind.arc.nasa.gov/');
    const globe = fixture.debugElement.query((node) => node.componentInstance instanceof WwGlobeComponent).componentInstance as WwGlobeComponent;
    const osm = wwd.layers.find((layer) => layer.displayName === 'OpenStreetMap')!;
    globe.globe()!.layers.setEnabled(osm, true);
    await settle(fixture);
    expect(strip.textContent).toContain('© OpenStreetMap contributors');
  });

  it('legend lists layers with legends and hides when they are switched off', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const image = query<HTMLImageElement>(element, '.wwui-legend__image');
    expect(image.getAttribute('src')).toBe('https://x/airports.png');
    expect(image.getAttribute('alt')).toBe('Airports legend');
    expect(element.querySelector('.wwui-legend')?.textContent).toContain('Airports');
    expect(element.querySelector('.wwui-legend')?.textContent).not.toContain('Plain');
    const globe = fixture.debugElement.query((node) => node.componentInstance instanceof WwGlobeComponent).componentInstance as WwGlobeComponent;
    globe.globe()!.layers.setEnabled(wwd.layers.find((layer) => layer.displayName === 'Airports')!, false);
    await settle(fixture);
    expect(element.querySelector('.wwui-legend')).toBeNull();
  });

  it('time slider drives time-enabled layers, reports changes and plays', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const slider = query<HTMLInputElement>(element, '.wwui-time__slider');
    const label = query(element, '.wwui-time__label');
    expect(slider.max).toBe('4');
    expect(slider.value).toBe('4');
    expect(label.textContent).toBe('2024-01-05');
    const layer = wwd.layers.find((l) => l.displayName === 'radar') as FakeWmsLayer;
    expect(layer.timeString).toBe('2024-01-05');
    expect(layer.urlBuilder.timeString).toBe('2024-01-05');

    setInputValue(slider, '1');
    await settle(fixture);
    expect(label.textContent).toBe('2024-01-02');
    expect(layer.timeString).toBe('2024-01-02');
    expect(fixture.componentInstance.changes.map((date) => date.toISOString())).toEqual(['2024-01-02T00:00:00.000Z']);

    const play = query<HTMLButtonElement>(element, '.wwui-time__play');
    play.click();
    await settle(fixture);
    expect(play.getAttribute('aria-label')).toBe('Pause');
    await wait(200);
    await settle(fixture);
    expect(label.textContent).toBe('2024-01-05');
    expect(play.getAttribute('aria-label')).toBe('Play');
    expect(layer.timeString).toBe('2024-01-05');
    expect(fixture.componentInstance.changes).toHaveLength(4);
  });
});

@Component({
  imports: [WwGlobeComponent, WwTimeSliderComponent],
  template: `
    <ww-globe [options]="{}">
      <ww-time-slider [start]="start" end="2024-03-03T12:00:00Z" [step]="43200000" [defaultValue]="initial" />
    </ww-globe>
  `,
})
class RangeHost {
  readonly start = new Date('2024-03-01T00:00:00Z');
  readonly initial = new Date('2024-03-02T00:00:00Z');
}

@Component({
  imports: [WwGlobeComponent, WwTimeSliderComponent],
  template: `<ww-globe [options]="{}"><ww-time-slider /></ww-globe>`,
})
class IdleHost {}

describe('time slider without layers', () => {
  it('accepts an explicit range', async () => {
    const { element } = await mount(RangeHost);
    const slider = query<HTMLInputElement>(element, '.wwui-time__slider');
    expect(slider.max).toBe('5');
    expect(slider.value).toBe('2');
    expect(query(element, '.wwui-time__label').textContent).toBe('2024-03-02 00:00 UTC');
  });

  it('shows idle text without a range', async () => {
    const { element } = await mount(IdleHost);
    expect(query(element, '.wwui-time__status').textContent).toBe('No time-enabled layers');
  });
});
