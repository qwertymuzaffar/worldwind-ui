import { describe, expect, it, vi } from 'vitest';
import { GlobeController } from '../src/globe';
import { ShapeEventRegistry } from '../src/shape-events';
import { createFakeWorldWind } from '../src/testing';
import { isOverlayLayer } from '../src/layers';

describe('ShapeEventRegistry', () => {
  it('shares one recognizer pair per event type and routes to picked objects', () => {
    const fake = createFakeWorldWind();
    const globe = new GlobeController(fake, document.createElement('div'));
    const registry = new ShapeEventRegistry(globe);
    const a = { id: 'a' };
    const b = { id: 'b' };
    const onA = vi.fn();
    const onB = vi.fn();
    const offA = registry.register(a, 'click', onA);
    registry.register(b, 'click', onB);
    expect(fake.recognizers).toHaveLength(2);
    expect(registry.size('click')).toBe(2);

    fake.windows[0]!.setPickResult([{ isTerrain: true }, { userObject: a }, { userObject: a }]);
    fake.recognizers[0]!.simulate(1, 1);
    expect(onA).toHaveBeenCalledTimes(1);
    expect(onB).not.toHaveBeenCalled();

    offA();
    expect(registry.size('click')).toBe(1);
    fake.recognizers[0]!.simulate(1, 1);
    expect(onA).toHaveBeenCalledTimes(1);

    registry.destroy();
    expect(fake.recognizers.every((r) => !r.enabled)).toBe(true);
  });

  it('delivers hover events to every hover handler', () => {
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => { cb(); return 1; });
    try {
      const fake = createFakeWorldWind();
      const globe = new GlobeController(fake, document.createElement('div'));
      const registry = new ShapeEventRegistry(globe);
      const handler = vi.fn();
      registry.register({ id: 'x' }, 'hover', handler);
      fake.windows[0]!.dispatch('mousemove', { clientX: 3, clientY: 4 });
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'hover', clientX: 3 }));
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('isOverlayLayer', () => {
  it('recognizes built-in overlay kinds only', () => {
    const fake = createFakeWorldWind();
    const globe = new GlobeController(fake, document.createElement('div'));
    expect(isOverlayLayer(globe.addLayer('compass'))).toBe(true);
    expect(isOverlayLayer(globe.addLayer('osm'))).toBe(false);
    expect(isOverlayLayer(new fake.Layer('custom'))).toBe(false);
  });
});
