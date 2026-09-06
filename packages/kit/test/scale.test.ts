import { describe, expect, it } from 'vitest';
import { computeScaleBar, metersPerPixel, scaleBar, trackScaleBar, type ScaleBarState } from '../src/scale';
import { createFakeWorldWind } from '../src/testing';

describe('computeScaleBar', () => {
  it('picks round metric distances that fit the width', () => {
    expect(computeScaleBar(10, { maxWidth: 120 })).toMatchObject({ meters: 1000, pixels: 100, label: '1 km', units: 'metric' });
    expect(computeScaleBar(1)).toMatchObject({ meters: 100, pixels: 100, label: '100 m' });
    expect(computeScaleBar(25)).toMatchObject({ label: '2 km', pixels: 80 });
    expect(computeScaleBar(0.004, { maxWidth: 100 })).toMatchObject({ label: '0.2 m' });
    expect(computeScaleBar(10_000)).toMatchObject({ label: '1,000 km' });
    expect(computeScaleBar(0)).toBeNull();
    expect(computeScaleBar(10, { maxWidth: 0 })).toBeNull();
  });

  it('supports imperial and nautical units', () => {
    expect(computeScaleBar(20, { units: 'imperial' })).toMatchObject({ label: '1 mi', meters: 1609.344 });
    expect(computeScaleBar(1, { units: 'imperial' })).toMatchObject({ label: '200 ft' });
    expect(computeScaleBar(100, { units: 'nautical' })).toMatchObject({ label: '5 nmi', meters: 9260 });
    expect(computeScaleBar(2, { units: 'nautical' })).toMatchObject({ label: '200 m' });
  });
});

describe('metersPerPixel and tracking', () => {
  it('reads the draw context, scales by pixelScale and follows the camera', () => {
    const ww = createFakeWorldWind();
    const wwd = new ww.WorldWindow(document.createElement('canvas'));
    wwd.navigator.range = 10_000_000;
    expect(metersPerPixel(wwd)).toBe(10_000);
    wwd.pixelScale = 2;
    expect(metersPerPixel(wwd)).toBe(20_000);
    wwd.pixelScale = 1;
    expect(scaleBar(wwd)?.label).toBe('1,000 km');

    const seen: Array<string | null> = [];
    const stop = trackScaleBar(ww, wwd, (state: ScaleBarState | null) => seen.push(state?.label ?? null));
    expect(seen).toEqual(['1,000 km']);
    wwd.simulateFrame();
    expect(seen).toHaveLength(1);
    wwd.navigator.range = 1_000_000;
    wwd.simulateFrame();
    expect(seen).toEqual(['1,000 km', '100 km']);
    stop();
    wwd.navigator.range = 500_000;
    wwd.simulateFrame();
    expect(seen).toHaveLength(2);

    wwd.drawContext.pixelSizeFactor = 0;
    expect(metersPerPixel(wwd)).toBeNull();
    wwd.pixelSizeAtDistance = (distance: number) => distance / 2000;
    expect(metersPerPixel(wwd)).toBe(250);
    wwd.navigator.range = 0;
    expect(metersPerPixel(wwd)).toBeNull();
  });
});
