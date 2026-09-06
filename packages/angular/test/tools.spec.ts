import { Component, viewChild } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { WwGlobeComponent } from '../src/lib/globe.component';
import { injectProjection } from '../src/lib/inject';
import { WwMeasureToolComponent } from '../src/lib/ui/measure-tool.component';
import { WwProjectionSwitcherComponent } from '../src/lib/ui/projection-switcher.component';
import { mount, query, settle } from './helpers';

const newYork = { latitude: 40.7128, longitude: -74.006 };
const london = { latitude: 51.5074, longitude: -0.1278 };
const paris = { latitude: 48.8566, longitude: 2.3522 };

@Component({ selector: 'test-projection', template: `{{ projection() }}` })
class ProjectionProbe {
  readonly projection = injectProjection();
}

@Component({
  imports: [WwGlobeComponent, WwProjectionSwitcherComponent, WwMeasureToolComponent, ProjectionProbe],
  template: `
    <ww-globe>
      <ww-projection-switcher [projections]="['3d', 'mercator']" [labels]="{ '3d': 'Globe' }" />
      <ww-measure-tool />
      <test-projection />
    </ww-globe>
  `,
})
class Host {
  readonly globe = viewChild.required(WwGlobeComponent);
}

describe('projection switcher', () => {
  it('switches the projection and reflects it through the signal', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const buttons = () => Array.from(element.querySelectorAll<HTMLButtonElement>('[aria-label="Projection"] button'));
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Globe', 'Mercator']);
    expect(buttons()[0]!.getAttribute('aria-pressed')).toBe('true');

    buttons()[1]!.click();
    await settle(fixture);
    expect(wwd.globe.is2D()).toBe(true);
    expect(buttons()[1]!.getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('test-projection')?.textContent).toBe('mercator');
  });
});

describe('measure tool widget', () => {
  it('measures clicks and shows length and area', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const click = (point: { latitude: number; longitude: number }) => {
      wwd.setPickResult([{ isTerrain: true, position: point }]);
      expect(wwd.click(1, 1).length).toBeGreaterThan(0);
    };
    const text = () => query(element, 'ww-measure-tool').textContent ?? '';
    expect(wwd.layers.map((l) => l.displayName)).toContain('Measurement');
    expect(text()).toContain('Press Measure, then click the globe');

    query<HTMLButtonElement>(element, '[aria-label="Measure"] button').click();
    await settle(fixture);
    expect(text()).toContain('Click the globe to add points');
    click(newYork);
    click(london);
    await vi.waitFor(() => expect(text()).toContain('5,576 km'));
    expect(text()).not.toContain('Area');

    click(paris);
    await vi.waitFor(() => expect(text()).toContain('km²'));

    query<HTMLButtonElement>(element, 'button[aria-label="Undo last point"]').click();
    await vi.waitFor(() => expect(text()).not.toContain('km²'));
    query<HTMLButtonElement>(element, 'button[aria-label="Clear measurement"]').click();
    await vi.waitFor(() => expect(query<HTMLButtonElement>(element, 'button[aria-label="Clear measurement"]').disabled).toBe(true));

    fixture.destroy();
    expect(wwd.layers.map((l) => l.displayName)).not.toContain('Measurement');
  });
});
