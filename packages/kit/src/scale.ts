import type { Unsubscribe } from './events';
import type { WWWorldWindow, WorldWindStatic } from './worldwind-types';

/** @category Scale */
export type ScaleUnits = 'metric' | 'imperial' | 'nautical';

/** @category Scale */
export interface ScaleBarOptions {
  /** The longest bar to draw, in CSS pixels. Defaults to 120. */
  maxWidth?: number;
  /** Defaults to `metric`. */
  units?: ScaleUnits;
}

/** @category Scale */
export interface ScaleBarState {
  /** Ground metres covered by one CSS pixel at the centre of the view. */
  metersPerPixel: number;
  /** Ground distance the bar represents, in metres. */
  meters: number;
  /** Bar length in CSS pixels. */
  pixels: number;
  /** `500 m`, `2 km`, `5 mi`, `10 nmi`, ... */
  label: string;
  units: ScaleUnits;
}

interface Unit {
  meters: number;
  label: string;
}

const UNITS: Record<ScaleUnits, { large: Unit; small: Unit }> = {
  metric: { large: { meters: 1000, label: 'km' }, small: { meters: 1, label: 'm' } },
  imperial: { large: { meters: 1609.344, label: 'mi' }, small: { meters: 0.3048, label: 'ft' } },
  nautical: { large: { meters: 1852, label: 'nmi' }, small: { meters: 1, label: 'm' } },
};

const NICE_FACTORS = [1, 2, 5];

/**
 * Ground metres per CSS pixel at the look-at point, from the last frame WorldWind drew. Null
 * before the first frame.
 * @category Scale
 */
export function metersPerPixel(wwd: WWWorldWindow): number | null {
  const range = wwd.navigator?.range;
  if (!Number.isFinite(range) || range <= 0) return null;
  const dc = wwd.drawContext;
  let size: number | null = null;
  if (dc && typeof dc.pixelSizeFactor === 'number' && dc.pixelSizeFactor > 0) {
    size = dc.pixelSizeFactor * range + (typeof dc.pixelSizeOffset === 'number' ? dc.pixelSizeOffset : 0);
  } else if (typeof wwd.pixelSizeAtDistance === 'function') {
    try {
      size = wwd.pixelSizeAtDistance(range);
    } catch {
      size = null;
    }
  }
  if (size === null || !Number.isFinite(size) || size <= 0) return null;
  return size * (wwd.pixelScale || 1);
}

/**
 * Picks a round distance (1, 2 or 5 times a power of ten in the chosen unit) that fits in
 * `maxWidth` pixels at the given resolution.
 * @example
 * ```ts
 * computeScaleBar(10, { maxWidth: 120 }); // { meters: 1000, pixels: 100, label: '1 km', ... }
 * ```
 * @category Scale
 */
export function computeScaleBar(metersPerPixelValue: number, options: ScaleBarOptions = {}): ScaleBarState | null {
  const maxWidth = options.maxWidth ?? 120;
  const units = options.units ?? 'metric';
  if (!(metersPerPixelValue > 0) || !(maxWidth > 0)) return null;
  const maxMeters = metersPerPixelValue * maxWidth;
  const { large, small } = UNITS[units];
  const unit = maxMeters >= large.meters ? large : small;
  const maxInUnit = maxMeters / unit.meters;
  const exponent = Math.floor(Math.log10(maxInUnit));
  let best = 10 ** exponent;
  for (const factor of NICE_FACTORS) {
    const candidate = factor * 10 ** exponent;
    if (candidate <= maxInUnit) best = candidate;
  }
  const meters = best * unit.meters;
  return {
    metersPerPixel: metersPerPixelValue,
    meters,
    pixels: meters / metersPerPixelValue,
    label: `${best.toLocaleString('en-US', { maximumFractionDigits: 3 })} ${unit.label}`,
    units,
  };
}

/** The scale bar for the last frame, or null before the first one.
 * @category Scale
 */
export function scaleBar(wwd: WWWorldWindow, options: ScaleBarOptions = {}): ScaleBarState | null {
  const resolution = metersPerPixel(wwd);
  return resolution === null ? null : computeScaleBar(resolution, options);
}

function sameScale(a: ScaleBarState | null, b: ScaleBarState | null): boolean {
  if (a === null || b === null) return a === b;
  return a.meters === b.meters && a.label === b.label && Math.abs(a.pixels - b.pixels) < 0.5;
}

/**
 * Calls `listener` now and after every frame in which the scale changed (zooming, tilting,
 * resizing, switching projection).
 * @category Scale
 */
export function trackScaleBar(
  worldWind: WorldWindStatic,
  wwd: WWWorldWindow,
  listener: (state: ScaleBarState | null) => void,
  options: ScaleBarOptions = {},
): Unsubscribe {
  let last = scaleBar(wwd, options);
  listener(last);
  const callback = (_wwd: WWWorldWindow, stage: string) => {
    if (stage !== worldWind.AFTER_REDRAW) return;
    const next = scaleBar(wwd, options);
    if (sameScale(last, next)) return;
    last = next;
    listener(next);
  };
  wwd.redrawCallbacks.push(callback);
  return () => {
    const index = wwd.redrawCallbacks.indexOf(callback);
    if (index !== -1) wwd.redrawCallbacks.splice(index, 1);
  };
}
