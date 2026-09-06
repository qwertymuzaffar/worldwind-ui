import { Component } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { CameraTarget, GeocodeOptions, GeocodeResult } from 'worldwind-kit';
import { WwGlobeComponent } from '../src/lib/globe.component';
import { WwCoordinatesComponent } from '../src/lib/ui/coordinates.component';
import { WwGoToBoxComponent } from '../src/lib/ui/goto-box.component';
import { WwLayerSwitcherComponent } from '../src/lib/ui/layer-switcher.component';
import { WwNavigationControlsComponent } from '../src/lib/ui/navigation-controls.component';
import { WwPanelComponent } from '../src/lib/ui/panel.component';
import { mount, query, setInputValue, settle } from './helpers';

const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => [
    { display_name: 'Paris, France', lat: '48.85', lon: '2.35', boundingbox: ['48.8', '48.9', '2.2', '2.4'] },
    { display_name: 'Paris, Texas', lat: '33.66', lon: '-95.55' },
  ],
});

@Component({
  imports: [
    WwGlobeComponent,
    WwLayerSwitcherComponent,
    WwNavigationControlsComponent,
    WwGoToBoxComponent,
    WwCoordinatesComponent,
    WwPanelComponent,
  ],
  template: `
    <ww-globe [options]="{ layers: ['blue-marble', 'osm', 'compass'], view: { range: 2500000, heading: 45 } }">
      <ww-layer-switcher />
      <ww-navigation-controls [home]="home" [animate]="10" />
      <ww-goto-box [geocoding]="geocoding" [duration]="0" (navigated)="navigated.push($event)" />
      <ww-coordinates />
      <ww-panel position="bottom-right" heading="Legend">legend body</ww-panel>
    </ww-globe>
  `,
})
class Host {
  readonly home: CameraTarget = { latitude: 1, longitude: 2, range: 300 };
  readonly geocoding: GeocodeOptions = { fetch: fetchMock as unknown as typeof fetch };
  navigated: Array<{ target: CameraTarget; result?: GeocodeResult }> = [];
}

describe('UI widgets', () => {
  it('panel renders a heading and positions itself', async () => {
    const { element } = await mount(Host);
    // Widgets render their own ww-panel elements; find ours by its heading.
    const panel = Array.from(element.querySelectorAll('ww-panel')).find(
      (p) => p.querySelector('.wwui-panel__title')?.textContent === 'Legend',
    )!;
    expect(panel.className).toContain('wwui-panel--bottom-right');
    expect(panel.querySelector('.wwui-panel__title')?.textContent).toBe('Legend');
    expect(panel.textContent).toContain('legend body');
  });

  it('layer switcher lists layers top-first without overlays, toggles and sets opacity', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const boxes = () => Array.from(element.querySelectorAll<HTMLInputElement>('.wwui-layer-switcher input[type=checkbox]'));
    expect(boxes().map((b) => b.parentElement?.textContent?.trim())).toEqual(['OpenStreetMap', 'Blue Marble']);

    boxes()[1]!.click();
    await settle(fixture);
    expect(wwd.layers[0]!.enabled).toBe(false);
    expect(boxes()[1]!.checked).toBe(false);

    const slider = query<HTMLInputElement>(element, 'input[aria-label="OpenStreetMap opacity"]');
    setInputValue(slider, '0.25');
    await settle(fixture);
    expect(wwd.layers[1]!.opacity).toBe(0.25);
  });

  it('navigation controls drive the camera', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const button = (label: string) => query<HTMLButtonElement>(element, `button[aria-label="${label}"]`);
    button('Zoom in').click();
    expect(wwd.navigator.range).toBe(1_250_000);
    button('Zoom out').click();
    expect(wwd.navigator.range).toBe(2_500_000);
    button('Reset to north').click();
    expect(wwd.navigator.heading).toBe(0);
    button('Tilt up').click();
    expect(wwd.navigator.tilt).toBe(15);
    button('Home').click();
    await settle(fixture);
    expect(wwd.navigator.lookAtLocation).toMatchObject({ latitude: 1, longitude: 2 });
    expect(wwd.navigator.range).toBe(300);
  });

  it('go-to box accepts coordinates and geocodes place names', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const input = query<HTMLInputElement>(element, 'input[aria-label="Go to location"]');
    const form = query<HTMLFormElement>(element, 'form.wwui-goto');

    setInputValue(input, '10, 20');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle(fixture);
    expect(wwd.navigator.lookAtLocation).toMatchObject({ latitude: 10, longitude: 20 });
    expect(fetchMock).not.toHaveBeenCalled();

    setInputValue(input, 'Paris');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(element.querySelectorAll('.wwui-goto__result')).toHaveLength(2));
    const results = Array.from(element.querySelectorAll<HTMLButtonElement>('.wwui-goto__result'));
    expect(results.map((r) => r.textContent?.trim())).toEqual(['Paris, France', 'Paris, Texas']);
    results[0]!.click();
    await settle(fixture);
    expect(wwd.navigator.lookAtLocation).toMatchObject({ latitude: 48.85, longitude: 2.35 });
    expect(fixture.componentInstance.navigated.at(-1)?.result?.displayName).toBe('Paris, France');
    expect(element.querySelectorAll('.wwui-goto__result')).toHaveLength(0);
  });

  it('coordinates readout follows the mouse and shows the range', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const coords = () => query(element, '.wwui-coords').textContent ?? '';
    expect(coords()).toContain('Move the mouse over the globe');
    expect(coords()).toContain('2,500 km');

    wwd.setPickResult([{ isTerrain: true, position: { latitude: 40.7128, longitude: -74.006, altitude: 12 } }]);
    wwd.dispatch('mousemove', { clientX: 1, clientY: 1 });
    await vi.waitFor(() => expect(coords()).toContain('40.7128°N, 74.0060°W'));
    expect(coords()).toContain('12 m');
    await settle(fixture);
  });
});
