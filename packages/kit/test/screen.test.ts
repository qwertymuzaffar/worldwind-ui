import { describe, expect, it, vi } from 'vitest';
import { toScreen, trackScreenPosition } from '../src/screen';
import { FakeVec3, createFakeWorldWind } from '../src/testing';

function setup() {
  const ww = createFakeWorldWind();
  const wwd = new ww.WorldWindow(document.createElement('canvas'));
  return { ww, wwd };
}

describe('toScreen', () => {
  it('maps a position to CSS pixels from the top-left corner', () => {
    const { ww, wwd } = setup();
    expect(toScreen(ww, wwd, { latitude: 0, longitude: 0 })).toEqual({ x: 400, y: 300, visible: true, behind: false });
    expect(toScreen(ww, wwd, { latitude: 90, longitude: -180 })).toMatchObject({ x: 0, y: 0, visible: true });
  });

  it('accounts for pixelScale and flags points outside the viewport or behind the globe', () => {
    const { ww, wwd } = setup();
    wwd.pixelScale = 2;
    expect(toScreen(ww, wwd, { latitude: 0, longitude: 0 })).toMatchObject({ x: 200, y: 150, visible: true });
    wwd.pixelScale = 1;
    wwd.drawContext.viewport.width = 300;
    expect(toScreen(ww, wwd, { latitude: 0, longitude: 170 })).toMatchObject({ visible: true });
    wwd.drawContext.viewport.width = 800;
    wwd.drawContext.eyePoint = new FakeVec3(0, 0, -1e7);
    expect(toScreen(ww, wwd, { latitude: 0, longitude: 0 })).toMatchObject({ visible: false, behind: true });
    wwd.globe = new ww.Globe2D();
    expect(toScreen(ww, wwd, { latitude: 0, longitude: 0 })).toMatchObject({ visible: true, behind: false });
  });

  it('returns null before the first frame', () => {
    const { ww, wwd } = setup();
    wwd.drawContext.viewport = { x: 0, y: 0, width: 0, height: 0 };
    expect(toScreen(ww, wwd, { latitude: 0, longitude: 0 })).toBeNull();
  });
});

describe('trackScreenPosition', () => {
  it('reports after frames in which the point moved, and stops on unsubscribe', () => {
    const { ww, wwd } = setup();
    const listener = vi.fn();
    const off = trackScreenPosition(ww, wwd, { latitude: 0, longitude: 0 }, listener);
    expect(wwd.redrawCount).toBe(1);
    wwd.simulateFrame();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ x: 400, y: 300 }));
    wwd.simulateFrame();
    expect(listener).toHaveBeenCalledTimes(1);
    wwd.drawContext.viewport.width = 400;
    wwd.simulateFrame();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ x: 200 }));
    off();
    wwd.drawContext.viewport.width = 800;
    wwd.simulateFrame();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(wwd.redrawCallbacks).toHaveLength(0);
  });
});
