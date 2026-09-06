import type { WWLayer } from './worldwind-types';

/**
 * The instants a layer can show, as declared by a WMS `Dimension`/`Extent` or a WMTS `Dimension`.
 * Periodic ranges carry `stepMs`; enumerated ones carry `values`.
 * @category Time
 */
export interface TimeDimension {
  /** Earliest instant. */
  start: Date;
  /** Latest instant. */
  end: Date;
  /** Interval between instants in milliseconds, for periodic ranges such as `start/end/P1D`. */
  stepMs?: number;
  /** The instants themselves, for enumerated dimensions. */
  values?: Date[];
  /** The value the service uses when a request names none. */
  defaultValue?: Date;
}

/** Overrides for {@link resolveTimeDimension}.
 * @category Time
 */
export interface TimeDimensionOverrides {
  start?: Date | string;
  end?: Date | string;
  /** Interval in milliseconds. */
  stepMs?: number;
  values?: Date[];
}

/**
 * How a `TIME` request value is written: `date` gives `2024-05-01`, `datetime` gives
 * `2024-05-01T12:00:00Z`, `auto` picks `date` for midnight UTC instants of daily or coarser steps.
 * @category Time
 */
export type TimeFormat = 'auto' | 'date' | 'datetime' | ((date: Date) => string);

/** Milliseconds in one day.
 * @category Time
 */
export const DAY_MS = 86_400_000;

/** Property under which the kit records a layer's {@link TimeDimension}.
 * @category Time
 */
export const TIME_DIMENSION_KEY = '__wwuiTimeDimension';

/** A WMS `Dimension`/`Extent` or WMTS `Dimension` as WorldWind's capabilities parsers assemble it.
 * @category Time
 */
export interface CapabilitiesDimension {
  /** WMS dimension name. */
  name?: string | null;
  /** WMTS dimension identifier. */
  identifier?: string | null;
  units?: string | null;
  default?: string | null;
  /** WMS: the element text. */
  content?: string | null;
  /** WMTS: the `Value` elements. */
  value?: string[] | null;
}

/** The parts of WorldWind's `WmsLayerCapabilities` and `WmtsLayerCapabilities` objects the kit reads.
 * @category Time
 */
export interface LayerCapabilitiesInfo {
  attribution?: { title?: string | null; url?: string | null } | null;
  /** WMS styles with their legends. */
  styles?: Array<{ legendUrls?: Array<{ url?: string | null; width?: unknown; height?: unknown; format?: string | null }> | null }> | null;
  /** WMTS styles with their legends. */
  style?: Array<{
    identifier?: string | null;
    isDefault?: unknown;
    legendUrl?: Array<{ href?: string | null; width?: unknown; height?: unknown; format?: string | null }> | null;
  }> | null;
  /** WMS 1.3.0 dimensions. */
  dimensions?: CapabilitiesDimension[] | null;
  /** WMS 1.1.1 extents. */
  extents?: CapabilitiesDimension[] | null;
  /** WMTS dimensions. */
  dimension?: CapabilitiesDimension[] | null;
  [key: string]: unknown;
}

const DURATION =
  /^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i;

/**
 * Parses an ISO 8601 duration (`P1D`, `PT6H`, `P1M`) into milliseconds. Months count as 30 days
 * and years as 365, which is what a slider step needs. Returns null for anything else.
 * @category Time
 */
export function parseIsoDuration(text: string): number | null {
  const match = DURATION.exec(text.trim());
  if (!match || /^PT?$/i.test(match[0])) return null;
  const [years, months, weeks, days, hours, minutes, seconds] = match.slice(1).map((v) => (v === undefined ? 0 : Number(v)));
  const total =
    years! * 365 * DAY_MS +
    months! * 30 * DAY_MS +
    weeks! * 7 * DAY_MS +
    days! * DAY_MS +
    hours! * 3_600_000 +
    minutes! * 60_000 +
    seconds! * 1000;
  return Number.isFinite(total) ? total : null;
}

function parseInstant(text: string): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/^(current|present|now)$/i.test(trimmed)) return new Date();
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dedupeSorted(values: Date[]): Date[] {
  values.sort((a, b) => a.getTime() - b.getTime());
  return values.filter((date, i) => i === 0 || date.getTime() !== values[i - 1]!.getTime());
}

/**
 * Parses the text of a WMS time dimension: comma-separated instants, `start/end/period` ranges,
 * or a mix. `present` and `current` mean now.
 * @example
 * ```ts
 * parseTimeDimension('2024-01-01/2024-12-31/P1D'); // { start, end, stepMs: 86400000 }
 * parseTimeDimension('2024-01-01,2024-02-01');     // { start, end, values: [...] }
 * ```
 * @category Time
 */
export function parseTimeDimension(content: string, defaultValue?: string | null): TimeDimension | null {
  let start: Date | undefined;
  let end: Date | undefined;
  let stepMs: number | undefined;
  const values: Date[] = [];
  const extend = (from: Date, to: Date) => {
    if (!start || from < start) start = from;
    if (!end || to > end) end = to;
  };
  for (const part of content.split(',')) {
    const pieces = part.trim().split('/');
    if (pieces.length >= 2) {
      const from = parseInstant(pieces[0]!);
      const to = parseInstant(pieces[1]!);
      if (!from || !to) continue;
      extend(from, to);
      const step = pieces[2] ? parseIsoDuration(pieces[2]) : null;
      if (step && step > 0) stepMs = stepMs === undefined ? step : Math.min(stepMs, step);
    } else {
      const instant = parseInstant(part);
      if (instant) values.push(instant);
    }
  }
  const instants = dedupeSorted(values);
  if (instants.length) extend(instants[0]!, instants[instants.length - 1]!);
  if (!start || !end) return null;
  const dimension: TimeDimension = { start, end };
  if (stepMs !== undefined) dimension.stepMs = stepMs;
  else if (instants.length) dimension.values = instants;
  const fallback = defaultValue ? parseInstant(defaultValue) : null;
  if (fallback) dimension.defaultValue = fallback;
  return dimension;
}

/**
 * The time dimension declared by a WorldWind `WmsLayerCapabilities` (`dimensions` / `extents`)
 * or `WmtsLayerCapabilities` (`dimension`) object, or null when the layer has none.
 * @category Time
 */
export function timeDimensionFromCapabilities(layerCapabilities: LayerCapabilitiesInfo | null | undefined): TimeDimension | null {
  const wms = layerCapabilities?.extents ?? layerCapabilities?.dimensions;
  if (Array.isArray(wms)) {
    for (const dimension of wms) {
      if (typeof dimension?.name === 'string' && dimension.name.toLowerCase() === 'time' && typeof dimension.content === 'string') {
        return parseTimeDimension(dimension.content, dimension.default);
      }
    }
  }
  const wmts = layerCapabilities?.dimension;
  if (Array.isArray(wmts)) {
    for (const dimension of wmts) {
      if (typeof dimension?.identifier === 'string' && dimension.identifier.toLowerCase() === 'time' && Array.isArray(dimension.value)) {
        return parseTimeDimension(dimension.value.join(','), dimension.default);
      }
    }
  }
  return null;
}

/** Records the time dimension of a layer (done automatically for layers built from capabilities).
 * @category Time
 */
export function setLayerTimeDimension(layer: WWLayer, dimension: TimeDimension | null): void {
  layer[TIME_DIMENSION_KEY] = dimension;
}

/** @category Time */
export function layerTimeDimension(layer: WWLayer): TimeDimension | null {
  const dimension = layer[TIME_DIMENSION_KEY];
  return dimension && dimension.start instanceof Date && dimension.end instanceof Date ? (dimension as TimeDimension) : null;
}

/**
 * Combines several dimensions into one covering all of them: the earliest start, the latest end,
 * the finest step (or the union of the values when none is periodic).
 * @category Time
 */
export function mergeTimeDimensions(dimensions: readonly TimeDimension[]): TimeDimension | null {
  if (dimensions.length === 0) return null;
  if (dimensions.length === 1) return dimensions[0]!;
  let start = dimensions[0]!.start;
  let end = dimensions[0]!.end;
  let stepMs: number | undefined;
  const values: Date[] = [];
  for (const dimension of dimensions) {
    if (dimension.start < start) start = dimension.start;
    if (dimension.end > end) end = dimension.end;
    if (dimension.stepMs) stepMs = stepMs === undefined ? dimension.stepMs : Math.min(stepMs, dimension.stepMs);
    if (dimension.values) values.push(...dimension.values);
  }
  const merged: TimeDimension = { start, end };
  if (stepMs !== undefined) merged.stepMs = stepMs;
  else if (values.length) merged.values = dedupeSorted(values);
  return merged;
}

/**
 * The dimension a time control should offer for a set of layers: their merged dimensions,
 * adjusted by any overrides. Overrides alone are enough when the layers declare nothing.
 * @category Time
 */
export function resolveTimeDimension(layers: readonly WWLayer[], overrides: TimeDimensionOverrides = {}): TimeDimension | null {
  const declared = layers.map(layerTimeDimension).filter((d): d is TimeDimension => d !== null);
  const merged = mergeTimeDimensions(declared);
  const toDate = (value: Date | string | undefined) => (value instanceof Date ? value : value === undefined ? null : parseInstant(value));
  const start = overrides.start !== undefined ? toDate(overrides.start) : merged?.start;
  const end = overrides.end !== undefined ? toDate(overrides.end) : merged?.end;
  if (overrides.values && overrides.values.length) {
    const values = dedupeSorted(overrides.values.slice());
    return { start: start ?? values[0]!, end: end ?? values[values.length - 1]!, values };
  }
  if (!start || !end) return null;
  const resolved: TimeDimension = { start, end };
  if (overrides.stepMs && overrides.stepMs > 0) resolved.stepMs = overrides.stepMs;
  else if (merged?.stepMs) resolved.stepMs = merged.stepMs;
  else if (merged?.values && overrides.start === undefined && overrides.end === undefined) resolved.values = merged.values;
  if (merged?.defaultValue) resolved.defaultValue = merged.defaultValue;
  return resolved;
}

/** The step a control should use for a dimension without one: one day.
 * @category Time
 */
export function timeDimensionStep(dimension: TimeDimension): number {
  return dimension.stepMs && dimension.stepMs > 0 ? dimension.stepMs : DAY_MS;
}

/** How many instants the dimension offers.
 * @category Time
 */
export function timeDimensionCount(dimension: TimeDimension): number {
  if (dimension.values) return dimension.values.length;
  const span = dimension.end.getTime() - dimension.start.getTime();
  if (span < 0) return 0;
  return Math.floor(span / timeDimensionStep(dimension)) + 1;
}

/** The instant at a zero-based step index, clamped to the dimension.
 * @category Time
 */
export function timeDimensionValueAt(dimension: TimeDimension, index: number): Date {
  const count = timeDimensionCount(dimension);
  const clamped = Math.max(0, Math.min(count - 1, Math.round(index)));
  if (dimension.values) return dimension.values[clamped] ?? dimension.start;
  return new Date(dimension.start.getTime() + clamped * timeDimensionStep(dimension));
}

/** The step index nearest to an instant.
 * @category Time
 */
export function timeDimensionIndexOf(dimension: TimeDimension, date: Date): number {
  const time = date.getTime();
  if (dimension.values) {
    let best = 0;
    for (let i = 1; i < dimension.values.length; i += 1) {
      if (Math.abs(dimension.values[i]!.getTime() - time) < Math.abs(dimension.values[best]!.getTime() - time)) best = i;
    }
    return best;
  }
  const count = timeDimensionCount(dimension);
  const index = Math.round((time - dimension.start.getTime()) / timeDimensionStep(dimension));
  return Math.max(0, Math.min(count - 1, index));
}

/** Every instant of the dimension, capped at `max` entries (periodic ranges can be huge).
 * @category Time
 */
export function timeDimensionValues(dimension: TimeDimension, max = 1000): Date[] {
  const count = Math.min(max, timeDimensionCount(dimension));
  const values: Date[] = [];
  for (let i = 0; i < count; i += 1) values.push(timeDimensionValueAt(dimension, i));
  return values;
}

/** Writes an instant the way a `TIME` request parameter expects it (see {@link TimeFormat}).
 * @category Time
 */
export function formatWmsTime(date: Date, format: TimeFormat = 'auto', stepMs?: number): string {
  if (typeof format === 'function') return format(date);
  const iso = date.toISOString();
  const dateOnly = iso.slice(0, 10);
  const dateTime = iso.replace(/\.\d{3}Z$/, 'Z');
  if (format === 'date') return dateOnly;
  if (format === 'datetime') return dateTime;
  const midnight = iso.endsWith('T00:00:00.000Z');
  return midnight && (stepMs === undefined || stepMs >= DAY_MS) ? dateOnly : dateTime;
}

/** A short UTC label for widgets: `2024-05-01`, or `2024-05-01 12:00 UTC` for sub-daily steps.
 * @category Time
 */
export function formatTimeLabel(date: Date, stepMs?: number): string {
  const iso = date.toISOString();
  const midnight = iso.endsWith('T00:00:00.000Z');
  if (midnight && (stepMs === undefined || stepMs >= DAY_MS)) return iso.slice(0, 10);
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** The `TIME` value a layer currently requests, or null.
 * @category Time
 */
export function layerTime(layer: WWLayer): string | null {
  return typeof layer.timeString === 'string' && layer.timeString ? layer.timeString : null;
}

/** Property under which {@link setLayerTime} remembers a tiled layer's cache path without a time.
 * @category Time
 */
export const BASE_CACHE_PATH_KEY = '__wwuiBaseCachePath';

/**
 * Changes the `TIME` a WMS or WMTS layer requests. WorldWind only takes the time at
 * construction, so this updates the layer's URL builder and gives the layer a tile set of its
 * own per instant: the imagery already fetched for an instant stays in WorldWind's texture
 * cache, so stepping back to it is immediate. Layers without tiles are simply refreshed.
 * @returns The request value that was applied.
 * @category Time
 */
export function setLayerTime(layer: WWLayer, time: Date | string | null, options: { format?: TimeFormat } = {}): string | null {
  const value = time === null ? null : typeof time === 'string' ? time : formatWmsTime(time, options.format, layerTimeDimension(layer)?.stepMs);
  if (typeof layer.cachePath === 'string') {
    let base = layer[BASE_CACHE_PATH_KEY];
    if (typeof base !== 'string') {
      base = layer.cachePath;
      const initial = layer.timeString;
      if (typeof initial === 'string' && initial && base.endsWith(initial)) base = base.slice(0, -initial.length);
      layer[BASE_CACHE_PATH_KEY] = base;
    }
    layer.cachePath = value ? base + value : base;
    // Tiles keep the image path they were created with, so start a fresh tile set under the new path.
    layer.topLevelTiles = [];
    if (layer.tileCache && typeof layer.tileCache.clear === 'function') layer.tileCache.clear();
    layer.currentTilesInvalid = true;
  } else if (typeof layer.refresh === 'function') {
    layer.refresh();
  }
  layer.timeString = value;
  if (layer.urlBuilder && typeof layer.urlBuilder === 'object') layer.urlBuilder.timeString = value;
  const instant = time instanceof Date ? time : value ? new Date(value) : null;
  layer.time = instant && !Number.isNaN(instant.getTime()) ? instant : null;
  return value;
}
