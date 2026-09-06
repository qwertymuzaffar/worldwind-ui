import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type { GlobeOptions, LoadWorldWindOptions, PickEvent, ProjectionKind } from 'worldwind-kit';
import { WwGlobeComponent } from '../src/lib/globe.component';
import { mount, settle } from './helpers';

@Component({
  imports: [WwGlobeComponent],
  template: `
    <ww-globe
      [options]="options"
      [projection]="projection()"
      [loadOptions]="loadOptions"
      (ready)="readyCount = readyCount + 1"
      (loadError)="error = $event"
      (globeClick)="clicks.push($event)"
    >
      <span wwFallback class="fallback">loading</span>
      <span class="content">content</span>
    </ww-globe>
  `,
})
class Host {
  options: GlobeOptions = { layers: ['blue-marble'], view: { range: 1234 } };
  loadOptions: LoadWorldWindOptions | undefined;
  readonly projection = signal<ProjectionKind | undefined>(undefined);
  readonly globe = viewChild.required(WwGlobeComponent);
  readyCount = 0;
  error: unknown = null;
  clicks: PickEvent[] = [];
}

describe('<ww-globe>', () => {
  it('shows the fallback, then projects content once the globe exists', async () => {
    const { fixture, fake, element } = await mount(Host);
    const host = fixture.componentInstance;
    expect(element.querySelector('.fallback')).toBeNull();
    expect(element.querySelector('.content')?.textContent).toBe('content');
    expect(host.readyCount).toBe(1);
    expect(fake.windows).toHaveLength(1);
    expect(fake.windows[0]!.canvas.parentElement?.className).toBe('wwui-globe__canvas');
    expect(host.globe().layers().map((l) => l.displayName)).toEqual(['Blue Marble']);
    expect(host.globe().cameraState()?.range).toBe(1234);
  });

  it('renders the fallback before WorldWind has loaded', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.loadOptions = { loader: () => new Promise(() => {}) };
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.fallback')?.textContent).toBe('loading');
    expect(element.querySelector('.content')).toBeNull();
  });

  it('reports load failures', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.loadOptions = { loader: () => Promise.reject(new Error('boom')) };
    fixture.autoDetectChanges();
    await settle(fixture);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role=alert]')?.textContent?.trim()).toBe('boom');
    expect(fixture.componentInstance.error).toBeInstanceOf(Error);
    expect(element.querySelector('.content')).toBeNull();
  });

  it('switches projection reactively', async () => {
    const { fixture, wwd } = await mount(Host);
    expect(wwd.globe.is2D()).toBe(false);
    fixture.componentInstance.projection.set('mercator');
    await settle(fixture);
    expect(wwd.globe.is2D()).toBe(true);
    expect(fixture.componentInstance.globe().globe()?.projection).toBe('mercator');
  });

  it('emits globe clicks with the pick result', async () => {
    const { fixture, fake, wwd } = await mount(Host);
    wwd.setPickResult([{ isTerrain: true, position: { latitude: 1, longitude: 2 } }]);
    const click = fake.recognizers.find((r) => r.kind === 'click')!;
    click.simulate(5, 5);
    await settle(fixture);
    expect(fixture.componentInstance.clicks).toHaveLength(1);
    expect(fixture.componentInstance.clicks[0]!.position).toEqual({ latitude: 1, longitude: 2, altitude: 0 });
  });

  it('turns hover picking on while requested and destroys the globe with the component', async () => {
    const { fixture, wwd } = await mount(Host);
    const globe = fixture.componentInstance.globe();
    expect(wwd.listenerCount('mousemove')).toBe(0);
    const release = globe.acquireHover();
    const again = globe.acquireHover();
    expect(wwd.listenerCount('mousemove')).toBe(1);
    release();
    expect(wwd.listenerCount('mousemove')).toBe(1);
    again();
    expect(wwd.listenerCount('mousemove')).toBe(0);

    fixture.destroy();
    expect(wwd.contextLost).toBe(true);
    expect(globe.globe()?.isDisposed).toBe(true);
    vi.restoreAllMocks();
  });
});
