import { Component, signal, viewChild } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { WwCameraDirective } from '../src/lib/camera.directive';
import { WwGlobeComponent } from '../src/lib/globe.component';
import { injectCameraState, injectGlobe, injectHoverPick, injectLayers } from '../src/lib/inject';
import { WwLayerComponent } from '../src/lib/layers';
import { mount, settle } from './helpers';

@Component({
  selector: 'test-probe',
  template: `{{ layers().length }}|{{ camera()?.range }}|{{ hover()?.position?.latitude ?? 'none' }}|{{ globe() ? 'ready' : 'pending' }}`,
})
class Probe {
  readonly layers = injectLayers();
  readonly camera = injectCameraState();
  readonly hover = injectHoverPick();
  readonly globe = injectGlobe();
}

@Component({
  imports: [WwGlobeComponent, WwCameraDirective, WwLayerComponent, Probe],
  template: `
    <ww-globe [options]="{ view: { range: 1000 } }">
      <ww-layer kind="blue-marble" />
      <ww-camera [latitude]="latitude()" [longitude]="20" [range]="5000" [animate]="500" />
      <test-probe />
    </ww-globe>
  `,
})
class Host {
  readonly latitude = signal(10);
  readonly globe = viewChild.required(WwGlobeComponent);
}

describe('camera', () => {
  it('applies the declarative camera immediately on first render, then animates changes', async () => {
    const { fixture, wwd } = await mount(Host);
    expect(wwd.navigator.lookAtLocation).toMatchObject({ latitude: 10, longitude: 20 });
    expect(wwd.navigator.range).toBe(5000);
    expect(wwd.goToAnimator.calls).toHaveLength(0);

    fixture.componentInstance.latitude.set(30);
    await settle(fixture);
    expect(wwd.goToAnimator.calls).toEqual([{ latitude: 30, longitude: 20, altitude: 5000 }]);
    expect(wwd.goToAnimator.travelTime).toBe(500);
  });

  it('exposes camera state, layers and hover picks as signals', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const probe = () => element.querySelector('test-probe')!.textContent;
    // The camera signal refreshes after a frame, as it would in a browser.
    wwd.simulateFrame();
    await settle(fixture);
    expect(probe()).toBe('1|5000|none|ready');

    wwd.navigator.range = 777;
    wwd.simulateFrame();
    await settle(fixture);
    expect(probe()).toBe('1|777|none|ready');

    // injectHoverPick turned hover picking on for the probe's lifetime
    expect(wwd.listenerCount('mousemove')).toBe(1);
    wwd.setPickResult([{ isTerrain: true, position: { latitude: 42, longitude: 1 } }]);
    wwd.dispatch('mousemove', { clientX: 3, clientY: 3 });
    // Hover picks are throttled to one per animation frame.
    await vi.waitFor(() => expect(probe()).toBe('1|777|42|ready'));
    expect(fixture.componentInstance.globe().hoverPick()?.position?.latitude).toBe(42);
  });
});
