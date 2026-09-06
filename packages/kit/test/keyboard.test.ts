import { describe, expect, it } from 'vitest';
import { GlobeController } from '../src/globe';
import { attachKeyboardNavigation, handleNavigationKey } from '../src/keyboard';
import { createFakeWorldWind } from '../src/testing';

function press(target: HTMLElement, key: string, init: KeyboardEventInit = {}): boolean {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('keyboard navigation', () => {
  it('is attached by default: the canvas is focusable and announced', () => {
    const fake = createFakeWorldWind();
    const globe = new GlobeController(fake, document.createElement('div'), { view: { latitude: 0, longitude: 0, range: 1_000_000 } });
    expect(globe.canvas.tabIndex).toBe(0);
    expect(globe.canvas.getAttribute('role')).toBe('application');
    expect(globe.canvas.getAttribute('aria-label')).toMatch(/Arrow keys pan/);

    expect(press(globe.canvas, 'ArrowUp')).toBe(true);
    expect(globe.camera.get().latitude).toBeCloseTo(0.898, 2); // 10% of 1000 km, in degrees of arc
    expect(press(globe.canvas, 'ArrowRight')).toBe(true);
    expect(globe.camera.get().longitude).toBeCloseTo(0.898, 2);
    expect(press(globe.canvas, '+')).toBe(true);
    expect(globe.camera.get().range).toBeCloseTo(666_667, -2);
    expect(press(globe.canvas, '-')).toBe(true);
    expect(globe.camera.get().range).toBeCloseTo(1_000_000, -2);
    expect(press(globe.canvas, 'ArrowRight', { shiftKey: true })).toBe(true);
    expect(globe.camera.get().heading).toBe(10);
    expect(press(globe.canvas, 'ArrowDown', { shiftKey: true })).toBe(true);
    expect(globe.camera.get().tilt).toBe(5);
    expect(press(globe.canvas, 'Home')).toBe(true);
    expect(globe.camera.get()).toMatchObject({ heading: 0, tilt: 0, roll: 0 });
    expect(press(globe.canvas, 'a')).toBe(false);
    expect(press(globe.canvas, 'ArrowUp', { ctrlKey: true })).toBe(false);
  });

  it('pans relative to the heading', () => {
    const fake = createFakeWorldWind();
    const globe = new GlobeController(fake, document.createElement('div'), { view: { latitude: 0, longitude: 0, range: 1_000_000, heading: 90 } });
    press(globe.canvas, 'ArrowUp');
    const state = globe.camera.get();
    expect(state.longitude).toBeCloseTo(0.898, 2);
    expect(state.latitude).toBeCloseTo(0, 3);
  });

  it('can be disabled, tuned, and is detached on destroy', () => {
    const fake = createFakeWorldWind();
    const off = new GlobeController(fake, document.createElement('div'), { keyboard: false });
    expect(off.canvas.hasAttribute('tabindex')).toBe(false);
    expect(press(off.canvas, 'ArrowUp')).toBe(false);

    const tuned = new GlobeController(fake, document.createElement('div'), {
      view: { range: 1000 },
      keyboard: { zoomFactor: 2, rotateStep: 45, label: 'Map' },
    });
    expect(tuned.canvas.getAttribute('aria-label')).toBe('Map');
    press(tuned.canvas, '-');
    expect(tuned.camera.get().range).toBe(2000);
    press(tuned.canvas, 'ArrowLeft', { shiftKey: true });
    expect(tuned.camera.get().heading).toBe(-45);
    tuned.destroy();
    expect(press(tuned.canvas, '+')).toBe(false);
  });

  it('exposes the key handler for custom bindings', () => {
    const fake = createFakeWorldWind();
    const globe = new GlobeController(fake, document.createElement('div'), { keyboard: false, view: { range: 100 } });
    expect(handleNavigationKey(globe, { key: 'PageUp', shiftKey: false, altKey: false, ctrlKey: false, metaKey: false })).toBe(true);
    expect(globe.camera.get().tilt).toBe(5);
    const detach = attachKeyboardNavigation(globe, { focusable: false });
    expect(globe.canvas.hasAttribute('tabindex')).toBe(false);
    detach();
  });
});
