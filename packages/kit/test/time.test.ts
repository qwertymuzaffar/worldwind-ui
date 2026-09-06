import { describe, expect, it } from 'vitest';
import { FakeLayer, FakeWmsLayer } from '../src/testing';
import {
  DAY_MS,
  formatTimeLabel,
  formatWmsTime,
  layerTime,
  layerTimeDimension,
  mergeTimeDimensions,
  parseIsoDuration,
  parseTimeDimension,
  resolveTimeDimension,
  setLayerTime,
  setLayerTimeDimension,
  timeDimensionCount,
  timeDimensionFromCapabilities,
  timeDimensionIndexOf,
  timeDimensionValueAt,
  timeDimensionValues,
} from '../src/time';

const day = (date: Date) => date.toISOString().slice(0, 10);

describe('parseIsoDuration', () => {
  it('reads days, hours, mixed and calendar durations', () => {
    expect(parseIsoDuration('P1D')).toBe(DAY_MS);
    expect(parseIsoDuration('PT6H')).toBe(6 * 3_600_000);
    expect(parseIsoDuration('P1DT12H')).toBe(1.5 * DAY_MS);
    expect(parseIsoDuration('P1M')).toBe(30 * DAY_MS);
    expect(parseIsoDuration('P1W')).toBe(7 * DAY_MS);
    expect(parseIsoDuration('PT90S')).toBe(90_000);
    expect(parseIsoDuration('P')).toBeNull();
    expect(parseIsoDuration('1 day')).toBeNull();
  });
});

describe('parseTimeDimension', () => {
  it('parses periodic ranges with a default', () => {
    const dimension = parseTimeDimension('2024-01-01/2024-01-10/P1D', '2024-01-05')!;
    expect(dimension.start.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(dimension.end.toISOString()).toBe('2024-01-10T00:00:00.000Z');
    expect(dimension.stepMs).toBe(DAY_MS);
    expect(dimension.values).toBeUndefined();
    expect(day(dimension.defaultValue!)).toBe('2024-01-05');
    expect(timeDimensionCount(dimension)).toBe(10);
  });

  it('parses instant lists, sorted and deduplicated', () => {
    const dimension = parseTimeDimension('2024-02-01, 2024-01-01,2024-02-01')!;
    expect(dimension.values!.map(day)).toEqual(['2024-01-01', '2024-02-01']);
    expect(dimension.stepMs).toBeUndefined();
    expect(day(dimension.start)).toBe('2024-01-01');
    expect(day(dimension.end)).toBe('2024-02-01');
  });

  it('treats present as now, keeps the finest period, and rejects junk', () => {
    const before = Date.now();
    const open = parseTimeDimension('2020-01-01/present/P1D')!;
    expect(open.end.getTime()).toBeGreaterThanOrEqual(before);
    const mixed = parseTimeDimension('2024-01-01/2024-01-02/PT6H,2024-01-02/2024-01-10/P1D')!;
    expect(mixed.stepMs).toBe(6 * 3_600_000);
    expect(day(mixed.end)).toBe('2024-01-10');
    expect(parseTimeDimension('nonsense')).toBeNull();
    expect(parseTimeDimension('')).toBeNull();
  });
});

describe('timeDimensionFromCapabilities', () => {
  it('reads WMS dimensions and extents and WMTS dimensions', () => {
    expect(
      timeDimensionFromCapabilities({
        dimensions: [
          { name: 'elevation', content: '0,10' },
          { name: 'time', units: 'ISO8601', default: '2024-01-02', content: '2024-01-01/2024-01-03/P1D' },
        ],
      })?.stepMs,
    ).toBe(DAY_MS);
    expect(timeDimensionFromCapabilities({ extents: [{ name: 'TIME', content: '2024-01-01,2024-01-02' }] })?.values).toHaveLength(2);
    const wmts = timeDimensionFromCapabilities({ dimension: [{ identifier: 'Time', default: '2024-01-02', value: ['2024-01-01', '2024-01-02'] }] })!;
    expect(day(wmts.defaultValue!)).toBe('2024-01-02');
    expect(wmts.values).toHaveLength(2);
    expect(timeDimensionFromCapabilities({})).toBeNull();
    expect(timeDimensionFromCapabilities(null)).toBeNull();
  });
});

describe('stepping through a dimension', () => {
  it('indexes, clamps and enumerates', () => {
    const daily = parseTimeDimension('2024-01-01/2024-01-10/P1D')!;
    expect(day(timeDimensionValueAt(daily, 2))).toBe('2024-01-03');
    expect(day(timeDimensionValueAt(daily, 99))).toBe('2024-01-10');
    expect(day(timeDimensionValueAt(daily, -5))).toBe('2024-01-01');
    expect(timeDimensionIndexOf(daily, new Date('2024-01-04T11:00:00Z'))).toBe(3);
    expect(timeDimensionIndexOf(daily, new Date('2030-01-01'))).toBe(9);
    expect(timeDimensionValues(daily, 3).map(day)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
    expect(timeDimensionValues(daily)).toHaveLength(10);

    const listed = parseTimeDimension('2024-01-01,2024-03-01')!;
    expect(timeDimensionCount(listed)).toBe(2);
    expect(timeDimensionIndexOf(listed, new Date('2024-02-20'))).toBe(1);
    expect(day(timeDimensionValueAt(listed, 0))).toBe('2024-01-01');

    // No period and no list: one-day steps.
    const range = parseTimeDimension('2024-01-01/2024-01-03')!;
    expect(timeDimensionCount(range)).toBe(3);
  });
});

describe('merging and resolving', () => {
  it('merges to the widest range and finest step', () => {
    const a = parseTimeDimension('2024-01-01/2024-01-10/P1D')!;
    const b = parseTimeDimension('2023-12-01/2024-01-05/PT6H')!;
    const merged = mergeTimeDimensions([a, b])!;
    expect(merged.start).toEqual(b.start);
    expect(merged.end).toEqual(a.end);
    expect(merged.stepMs).toBe(6 * 3_600_000);
    expect(mergeTimeDimensions([])).toBeNull();
    expect(mergeTimeDimensions([a])).toBe(a);
    const lists = mergeTimeDimensions([parseTimeDimension('2024-01-01')!, parseTimeDimension('2024-02-01,2024-01-01')!])!;
    expect(lists.values!.map(day)).toEqual(['2024-01-01', '2024-02-01']);
  });

  it('resolves layers and overrides', () => {
    const layer = new FakeLayer('Radar');
    expect(layerTimeDimension(layer)).toBeNull();
    setLayerTimeDimension(layer, parseTimeDimension('2024-01-01/2024-01-10/P1D'));
    expect(layerTimeDimension(layer)?.stepMs).toBe(DAY_MS);
    expect(day(resolveTimeDimension([layer])!.end)).toBe('2024-01-10');

    const overridden = resolveTimeDimension([layer], { end: '2024-01-03', stepMs: 12 * 3_600_000 })!;
    expect(timeDimensionCount(overridden)).toBe(5);
    expect(resolveTimeDimension([new FakeLayer()])).toBeNull();
    expect(resolveTimeDimension([], { start: new Date('2024-01-01'), end: '2024-01-04' })?.stepMs).toBeUndefined();
    const listed = resolveTimeDimension([], { values: [new Date('2024-02-01'), new Date('2024-01-01')] })!;
    expect(listed.values!.map(day)).toEqual(['2024-01-01', '2024-02-01']);
    expect(day(listed.start)).toBe('2024-01-01');
  });
});

describe('formatting', () => {
  it('writes dates, datetimes and labels', () => {
    const midnight = new Date('2024-05-01T00:00:00Z');
    const noon = new Date('2024-05-01T12:00:00Z');
    expect(formatWmsTime(midnight)).toBe('2024-05-01');
    expect(formatWmsTime(noon)).toBe('2024-05-01T12:00:00Z');
    expect(formatWmsTime(midnight, 'auto', 3_600_000)).toBe('2024-05-01T00:00:00Z');
    expect(formatWmsTime(noon, 'date')).toBe('2024-05-01');
    expect(formatWmsTime(midnight, 'datetime')).toBe('2024-05-01T00:00:00Z');
    expect(formatWmsTime(noon, (date) => String(date.getUTCHours()))).toBe('12');
    expect(formatTimeLabel(midnight)).toBe('2024-05-01');
    expect(formatTimeLabel(noon)).toBe('2024-05-01 12:00 UTC');
    expect(formatTimeLabel(midnight, 3_600_000)).toBe('2024-05-01 00:00 UTC');
  });
});

describe('setLayerTime', () => {
  it('updates the URL builder, starts a tile set per instant and reports the value', () => {
    const layer = new FakeWmsLayer({ service: 's', layerNames: 'l' }, '2024-01-01');
    expect(layer.cachePath).toBe('sl2024-01-01');
    expect(setLayerTime(layer, new Date('2024-01-02T00:00:00Z'))).toBe('2024-01-02');
    expect(layer.timeString).toBe('2024-01-02');
    expect(layer.urlBuilder.timeString).toBe('2024-01-02');
    expect(layer.time?.toISOString()).toBe('2024-01-02T00:00:00.000Z');
    expect(layerTime(layer)).toBe('2024-01-02');
    // Tiled layers get a fresh tile set under a time-specific cache path instead of an expiry.
    expect(layer.cachePath).toBe('sl2024-01-02');
    expect(layer.topLevelTiles).toEqual([]);
    expect(layer.tileCache.cleared).toBe(1);
    expect(layer.currentTilesInvalid).toBe(true);
    expect(layer.refreshCount).toBe(0);

    setLayerTimeDimension(layer, parseTimeDimension('2024-01-01/2024-01-02/PT1H'));
    expect(setLayerTime(layer, new Date('2024-01-02T00:00:00Z'))).toBe('2024-01-02T00:00:00Z');
    expect(setLayerTime(layer, '2024-03-01T06:00:00Z')).toBe('2024-03-01T06:00:00Z');
    expect(layer.time?.toISOString()).toBe('2024-03-01T06:00:00.000Z');
    expect(layer.cachePath).toBe('sl2024-03-01T06:00:00Z');

    setLayerTime(layer, null);
    expect(layerTime(layer)).toBeNull();
    expect(layer.time).toBeNull();
    expect(layer.cachePath).toBe('sl');
    expect(layer.tileCache.cleared).toBe(4);

    // Layers without tiles are refreshed instead.
    const plain = new FakeLayer('Plain');
    expect(setLayerTime(plain, '2024')).toBe('2024');
    expect(plain.timeString).toBe('2024');
    expect(plain.refreshCount).toBe(1);
  });
});
