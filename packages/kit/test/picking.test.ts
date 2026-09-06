import { afterEach, describe, expect, it, vi } from 'vitest';
import { PickDispatcher, onPick, pickAt } from '../src/picking';
import { createFakeWorldWind } from '../src/testing';

function setup() {
  const ww = createFakeWorldWind();
  const wwd = new ww.WorldWindow(document.createElement('canvas'));
  return { ww, wwd };
}

afterEach(() => vi.unstubAllGlobals());

describe('pickAt', () => {
  it('maps picked objects and finds terrain and top items', () => {
    const { ww, wwd } = setup();
    const layer = new ww.Layer('Pins');
    const pin = { id: 'pin' };
    wwd.setPickResult([
      { isTerrain: true, position: { latitude: 10, longitude: 20, altitude: 5 } },
      { userObject: { id: 'under' }, layer },
      { userObject: pin, layer, isOnTop: true, position: { latitude: 10, longitude: 20 } },
    ]);
    const result = pickAt(wwd, 100, 50);
    expect(result).toMatchObject({ clientX: 100, clientY: 50, position: { latitude: 10, longitude: 20, altitude: 5 } });
    expect(result.items).toHaveLength(3);
    expect(result.top?.object).toBe(pin);
    expect(result.top?.layer).toBe(layer);
  });

  it('falls back to the first non-terrain item and supports terrain-only picks', () => {
    const { wwd } = setup();
    wwd.setPickResult([{ userObject: 'a' }, { userObject: 'b' }, { isTerrain: true, position: { latitude: 1, longitude: 2 } }]);
    expect(pickAt(wwd, 0, 0).top?.object).toBe('a');
    const terrain = pickAt(wwd, 0, 0, { terrainOnly: true });
    expect(terrain.items).toHaveLength(1);
    expect(terrain.top).toBeNull();
    expect(terrain.position).toEqual({ latitude: 1, longitude: 2, altitude: 0 });
  });

  it('returns no position off the globe', () => {
    const { wwd } = setup();
    expect(pickAt(wwd, 0, 0)).toMatchObject({ position: null, items: [], top: null });
  });
});

describe('onPick', () => {
  it('routes clicks and taps through recognizers and can be disabled', () => {
    const { ww, wwd } = setup();
    wwd.setPickResult([{ isTerrain: true, position: { latitude: 3, longitude: 4 } }]);
    const handler = vi.fn();
    const off = onPick(ww, wwd, 'click', handler);
    expect(ww.recognizers.map((r) => r.kind)).toEqual(['click', 'tap']);

    ww.recognizers[0]!.simulate(10, 20);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'click', clientX: 10, clientY: 20, position: { latitude: 3, longitude: 4, altitude: 0 } }));

    off();
    ww.recognizers[1]!.simulate(1, 1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('uses two clicks for dblclick', () => {
    const { ww, wwd } = setup();
    const handler = vi.fn();
    onPick(ww, wwd, 'dblclick', handler);
    expect(ww.recognizers[0]!.numberOfClicks).toBe(2);
    expect(ww.recognizers[1]!.numberOfTaps).toBe(2);
    expect(ww.recognizers[0]!.simulate(0, 0, 1)).toBe(false);
    expect(ww.recognizers[0]!.simulate(0, 0, 2)).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('throttles hover to one pick per frame and unsubscribes cleanly', () => {
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => setTimeout(cb, 0) as unknown as number);
    vi.stubGlobal('cancelAnimationFrame', (h: number) => clearTimeout(h));
    vi.useFakeTimers();
    try {
      const { ww, wwd } = setup();
      const handler = vi.fn();
      const off = onPick(ww, wwd, 'hover', handler);
      expect(wwd.listenerCount('mousemove')).toBe(1);

      wwd.dispatch('mousemove', { clientX: 1, clientY: 1 });
      wwd.dispatch('mousemove', { clientX: 2, clientY: 2 });
      vi.runAllTimers();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'hover', clientX: 2 }));

      off();
      expect(wwd.listenerCount('mousemove')).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('PickDispatcher', () => {
  it('shares one recognizer set per type and fans out to every handler', () => {
    const { ww, wwd } = setup();
    const dispatcher = new PickDispatcher(ww, wwd);
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = dispatcher.on('click', first);
    dispatcher.on('click', second);
    expect(ww.recognizers.filter((r) => r.kind === 'click')).toHaveLength(1);

    wwd.setPickResult([{ isTerrain: true, position: { latitude: 1, longitude: 2 } }]);
    expect(wwd.click(3, 4)).toHaveLength(1);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    offFirst();
    wwd.click(3, 4);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('lets clicks and double-clicks coexist, pauses unused recognizers and reuses them', () => {
    const { ww, wwd } = setup();
    const dispatcher = new PickDispatcher(ww, wwd);
    const click = vi.fn();
    const dblclick = vi.fn();
    const offClick = dispatcher.on('click', click);
    dispatcher.on('dblclick', dblclick);
    const [single, double] = ww.recognizers.filter((r) => r.kind === 'click');
    expect(single!.recognizesWith.has(double!)).toBe(true);
    expect(double!.recognizesWith.has(single!)).toBe(true);

    offClick();
    expect(single!.enabled).toBe(false);
    expect(wwd.click(1, 1)).toHaveLength(0);
    dispatcher.on('click', click);
    expect(single!.enabled).toBe(true);
    expect(ww.recognizers.filter((r) => r.kind === 'click')).toHaveLength(2);
    wwd.click(1, 1);
    expect(click).toHaveBeenCalledTimes(1);

    dispatcher.destroy();
    expect(ww.recognizers.every((r) => !r.enabled)).toBe(true);
  });

  it('drops the hover listener when the last hover handler leaves', () => {
    const { ww, wwd } = setup();
    const dispatcher = new PickDispatcher(ww, wwd);
    const off = dispatcher.on('hover', () => {});
    expect(wwd.listenerCount('mousemove')).toBe(1);
    off();
    expect(wwd.listenerCount('mousemove')).toBe(0);
  });
});

describe('a second independent click recognizer never fires (WorldWind arbitration)', () => {
  it('is modelled by the fake so the dispatcher stays necessary', () => {
    const { ww, wwd } = setup();
    const first = vi.fn();
    const second = vi.fn();
    onPick(ww, wwd, 'click', first);
    onPick(ww, wwd, 'click', second);
    wwd.click(1, 1);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});
