import { Component, signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { FakeVec3 } from 'worldwind-kit/testing';
import { WwGlobeComponent } from '../src/lib/globe.component';
import { WwPopupComponent } from '../src/lib/ui/popup.component';
import { mount, query, settle } from './helpers';

@Component({
  imports: [WwGlobeComponent, WwPopupComponent],
  template: `
    <ww-globe>
      @if (show()) {
        <ww-popup [position]="position()" [anchor]="anchor()" [offset]="offset()" heading="Origin" [closable]="true" (closed)="closes = closes + 1">
          <span class="body">body</span>
        </ww-popup>
      }
    </ww-globe>
  `,
})
class Host {
  readonly show = signal(true);
  readonly position = signal({ latitude: 0, longitude: 0 });
  readonly anchor = signal<'bottom' | 'right'>('bottom');
  readonly offset = signal<{ x?: number; y?: number } | undefined>(undefined);
  closes = 0;
}

describe('<ww-popup>', () => {
  it('follows its position, hides behind the globe, closes, and detaches', async () => {
    const { fixture, wwd, element } = await mount(Host);
    const popup = () => query(element, 'ww-popup');
    expect(popup().style.visibility).toBe('hidden');
    expect(popup().className).toContain('wwui-popup--bottom');
    wwd.simulateFrame();
    await vi.waitFor(() => expect(popup().style.visibility).toBe('visible'));
    expect(popup().style.transform).toBe('translate(400px, 300px)');
    expect(popup().textContent).toContain('Origin');
    expect(popup().textContent).toContain('body');

    query<HTMLButtonElement>(element, 'button[aria-label="Close"]').click();
    await settle(fixture);
    expect(fixture.componentInstance.closes).toBe(1);

    wwd.drawContext.eyePoint = new FakeVec3(0, 0, -1e7);
    wwd.simulateFrame();
    await vi.waitFor(() => expect(popup().style.visibility).toBe('hidden'));
    wwd.drawContext.eyePoint = new FakeVec3(0, 0, 1e7);

    fixture.componentInstance.position.set({ latitude: 90, longitude: -180 });
    fixture.componentInstance.anchor.set('right');
    fixture.componentInstance.offset.set({ x: 5, y: -5 });
    await settle(fixture);
    wwd.simulateFrame();
    await vi.waitFor(() => expect(popup().style.transform).toBe('translate(5px, -5px)'));
    expect(popup().className).toContain('wwui-popup--right');

    const before = wwd.redrawCallbacks.length;
    fixture.componentInstance.show.set(false);
    await settle(fixture);
    expect(wwd.redrawCallbacks.length).toBe(before - 1);
  });
});
