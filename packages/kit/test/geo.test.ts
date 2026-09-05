import { describe, expect, it } from 'vitest';
import {
  formatDistance,
  formatLatLon,
  fromPosition,
  greatCircleDistanceMeters,
  initialBearingDegrees,
  normalizeLongitude,
  toPosition,
} from '../src/geo';
import { createFakeWorldWind } from '../src/testing';

const newYork = { latitude: 40.7128, longitude: -74.006 };
const london = { latitude: 51.5074, longitude: -0.1278 };

describe('geo', () => {
  it('measures great-circle distance', () => {
    expect(greatCircleDistanceMeters(newYork, london) / 1000).toBeCloseTo(5576, 0);
    expect(greatCircleDistanceMeters(newYork, newYork)).toBe(0);
  });

  it('computes an initial bearing', () => {
    expect(initialBearingDegrees(newYork, london)).toBeCloseTo(51.2, 0);
  });

  it('normalizes longitudes', () => {
    expect(normalizeLongitude(190)).toBe(-170);
    expect(normalizeLongitude(-190)).toBe(170);
    expect(normalizeLongitude(180)).toBe(180);
    expect(normalizeLongitude(-180)).toBe(-180);
    expect(normalizeLongitude(540)).toBe(180);
  });

  it('formats coordinates', () => {
    expect(formatLatLon(newYork)).toBe('40.7128°N, 74.0060°W');
    expect(formatLatLon(newYork, { style: 'dms' })).toBe('40°42\'46.1"N, 74°00\'21.6"W');
    expect(formatLatLon({ latitude: -33.9, longitude: 151.2 }, { precision: 1 })).toBe('33.9°S, 151.2°E');
  });

  it('formats distances', () => {
    expect(formatDistance(340.4)).toBe('340 m');
    expect(formatDistance(1250)).toBe('1.25 km');
    expect(formatDistance(10_200_000)).toBe('10,200 km');
    expect(formatDistance(Number.NaN)).toBe('');
  });

  it('converts to and from WorldWind positions', () => {
    const ww = createFakeWorldWind();
    const position = toPosition(ww, { latitude: 1, longitude: 2 });
    expect(position).toMatchObject({ latitude: 1, longitude: 2, altitude: 0 });
    expect(fromPosition(position)).toEqual({ latitude: 1, longitude: 2, altitude: 0 });
    expect(fromPosition(new ww.Location(3, 4))).toEqual({ latitude: 3, longitude: 4 });
  });
});

describe('parseLatLon', () => {
  it('accepts common notations', async () => {
    const { parseLatLon } = await import('../src/geo');
    expect(parseLatLon('40.7, -74')).toEqual({ latitude: 40.7, longitude: -74 });
    expect(parseLatLon('40.7N 74W')).toEqual({ latitude: 40.7, longitude: -74 });
    expect(parseLatLon(' -33.9 ; 151.2 ')).toEqual({ latitude: -33.9, longitude: 151.2 });
    expect(parseLatLon('12°S, 45°E')).toEqual({ latitude: -12, longitude: 45 });
    expect(parseLatLon('Paris')).toBeNull();
    expect(parseLatLon('95, 0')).toBeNull();
  });
});

describe('normalizeLongitude precision', () => {
  it('returns in-range values untouched', async () => {
    const { normalizeLongitude } = await import('../src/geo');
    expect(normalizeLongitude(2.35)).toBe(2.35);
    expect(normalizeLongitude(-0.1278)).toBe(-0.1278);
  });
});
