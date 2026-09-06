import { Component } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { Cluster, DrawFeature } from 'worldwind-kit';
import { WwClusterLayerComponent } from '../src/lib/cluster-layer.component';
import { WwGlobeComponent } from '../src/lib/globe.component';
import { WwDrawToolComponent } from '../src/lib/ui/draw-tool.component';
import { WwNavigationControlsComponent } from '../src/lib/ui/navigation-controls.component';
import { mount, query, settle } from './helpers';

interface Station {
  latitude: number;
  longitude: number;
  name: string;
}

@Component({
  imports: [WwGlobeComponent, WwDrawToolComponent, WwClusterLayerComponent, WwNavigationControlsComponent],
  template: `
    <ww-globe [options]="{ view: { range: 10000000 } }">
      <ww-draw-tool (featuresChange)="features = $event" />
      <ww-cluster-layer [items]="items" name="Stations" [opacity]="0.5" (clusterClick)="clusters.push($event.cluster)" (itemClick)="clicked.push($event.item)" />
      <ww-navigation-controls [fullscreen]="true" [screenshot]="{ filename: 'globe.png' }" />
    </ww-globe>
  `,
})
class Host {
  // Two neighbours well inside one grid cell at the initial zoom, and one far away.
  items: Station[] = [
    { latitude: 1.0, longitude: 1.0, name: 'a' },
    { latitude: 1.2, longitude: 1.2, name: 'b' },
    { latitude: 50, longitude: 50, name: 'far' },
  ];
  features: readonly DrawFeature[] = [];
  clusters: Cluster<Station>[] = [];
  clicked: Station[] = [];
}

describe('draw tool', () => {
  it('draws from clicks, reports features, finishes and deletes', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const button = (label: string) => query<HTMLButtonElement>(element, `.wwui-draw button[aria-label="${label}"]`);
    const byText = (text: string) => Array.from(element.querySelectorAll<HTMLButtonElement>('.wwui-draw button')).find((b) => b.textContent?.trim() === text)!;
    expect(wwd.layers.map((layer) => layer.displayName)).toContain('Drawings');
    expect(element.querySelector('.wwui-draw .wwui-goto__status')?.textContent).toBe('Pick a shape, or click a drawing to edit it');

    byText('Polygon').click();
    await settle(fixture);
    expect(byText('Polygon').getAttribute('aria-pressed')).toBe('true');
    const click = (latitude: number, longitude: number) => {
      wwd.setPickResult([{ isTerrain: true, position: { latitude, longitude } }]);
      wwd.click(1, 1);
    };
    click(10, 10);
    click(11, 11);
    await settle(fixture);
    expect(byText('Finish').disabled).toBe(true);
    click(12, 9);
    await settle(fixture);
    expect(byText('Finish').disabled).toBe(false);
    byText('Finish').click();
    await settle(fixture);
    expect(fixture.componentInstance.features).toHaveLength(1);
    expect(fixture.componentInstance.features[0]!.type).toBe('polygon');

    byText('Polygon').click(); // stop drawing
    await settle(fixture);
    expect(element.querySelector('.wwui-draw .wwui-goto__status')?.textContent).toContain('Selected polygon');
    button('Delete selection').click();
    await settle(fixture);
    expect(fixture.componentInstance.features).toHaveLength(0);
    expect(button('Clear drawings').disabled).toBe(true);
  });
});

describe('cluster layer', () => {
  it('clusters items, reacts to item changes, and reports clicks', async () => {
    const { fixture, wwd } = await mount(Host);
    const layer = wwd.layers.find((l) => l.displayName === 'Stations') as unknown as { renderables: unknown[]; opacity: number };
    expect(layer).toBeTruthy();
    expect(layer.renderables).toHaveLength(2);
    expect(layer.opacity).toBe(0.5);
    const [marker, single] = layer.renderables;
    wwd.setPickResult([{ userObject: marker, position: { latitude: 1.1, longitude: 1.1 } }, { isTerrain: true, position: { latitude: 1.1, longitude: 1.1 } }]);
    wwd.click(1, 1);
    expect(fixture.componentInstance.clusters[0]?.count).toBe(2);
    wwd.setPickResult([{ userObject: single, position: { latitude: 50, longitude: 50 } }, { isTerrain: true, position: { latitude: 50, longitude: 50 } }]);
    wwd.click(1, 1);
    expect(fixture.componentInstance.clicked[0]?.name).toBe('far');

    fixture.componentInstance.items = fixture.componentInstance.items.slice(2);
    fixture.changeDetectorRef.markForCheck();
    await settle(fixture);
    expect(layer.renderables).toHaveLength(1);
  });
});

describe('navigation extras', () => {
  it('offers fullscreen and screenshot buttons', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const full = query<HTMLButtonElement>(element, 'button[aria-label="Fullscreen"]');
    expect(full.getAttribute('aria-pressed')).toBe('false');
    const target = wwd.canvas.parentElement!;
    target.requestFullscreen = vi.fn(async () => {
      Object.defineProperty(document, 'fullscreenElement', { value: target, configurable: true });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    full.click();
    await settle(fixture);
    expect(full.getAttribute('aria-label')).toBe('Exit fullscreen');
    delete (document as { fullscreenElement?: unknown }).fullscreenElement;

    let download = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      download = this.download;
    });
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }));
    wwd.canvas.toBlob = (callback) => callback(new Blob(['png']));
    query<HTMLButtonElement>(element, 'button[aria-label="Save screenshot"]').click();
    wwd.simulateFrame();
    await settle(fixture);
    expect(download).toBe('globe.png');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
