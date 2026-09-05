import type { WWLocation, WWPosition, WorldWindStatic } from './worldwind-types';

export interface LatLon {
  latitude: number;
  longitude: number;
}

export interface LatLonAlt extends LatLon {
  /** Metres. Defaults to 0 where a position is required. */
  altitude?: number;
}

/** WGS84 semi-major axis in metres, the radius WorldWind uses for the Earth. */
export const EARTH_RADIUS_METERS = 6378137;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function toLocation(worldWind: WorldWindStatic, point: LatLon): WWLocation {
  return new worldWind.Location(point.latitude, point.longitude);
}

export function toPosition(worldWind: WorldWindStatic, point: LatLonAlt): WWPosition {
  return new worldWind.Position(point.latitude, point.longitude, point.altitude ?? 0);
}

export function toPositions(worldWind: WorldWindStatic, points: LatLonAlt[]): WWPosition[] {
  return points.map((p) => toPosition(worldWind, p));
}

export function toLocations(worldWind: WorldWindStatic, points: LatLon[]): WWLocation[] {
  return points.map((p) => toLocation(worldWind, p));
}

/** Copies a WorldWind Location or Position into a plain object. */
export function fromPosition(point: WWLocation | WWPosition): LatLonAlt {
  const result: LatLonAlt = { latitude: point.latitude, longitude: point.longitude };
  if ('altitude' in point && typeof point.altitude === 'number') result.altitude = point.altitude;
  return result;
}

/** Wraps a longitude into [-180, 180]. */
export function normalizeLongitude(longitude: number): number {
  if (!Number.isFinite(longitude) || (longitude >= -180 && longitude <= 180)) return longitude;
  const wrapped = ((((longitude + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 && longitude > 0 ? 180 : wrapped;
}

/** Clamps a latitude into [-90, 90]. */
export function clampLatitude(latitude: number): number {
  return Math.max(-90, Math.min(90, latitude));
}

/** Haversine great-circle distance in metres. Pure math, no WorldWind needed. */
export function greatCircleDistanceMeters(
  a: LatLon,
  b: LatLon,
  radius: number = EARTH_RADIUS_METERS,
): number {
  const lat1 = a.latitude * DEG_TO_RAD;
  const lat2 = b.latitude * DEG_TO_RAD;
  const dLat = lat2 - lat1;
  const dLon = (b.longitude - a.longitude) * DEG_TO_RAD;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial great-circle bearing from `a` to `b`, in degrees clockwise from north [0, 360). */
export function initialBearingDegrees(a: LatLon, b: LatLon): number {
  const lat1 = a.latitude * DEG_TO_RAD;
  const lat2 = b.latitude * DEG_TO_RAD;
  const dLon = (b.longitude - a.longitude) * DEG_TO_RAD;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * RAD_TO_DEG + 360) % 360;
}

export interface FormatLatLonOptions {
  /** Decimal places for `decimal`, or seconds precision for `dms`. Default 4 / 1. */
  precision?: number;
  style?: 'decimal' | 'dms';
}

function toDms(value: number, positive: string, negative: string, precision: number): string {
  const hemisphere = value < 0 ? negative : positive;
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(precision);
  return `${degrees}°${String(minutes).padStart(2, '0')}'${seconds}"${hemisphere}`;
}

/** Formats a coordinate pair, e.g. `40.7128°N, 74.0060°W` or `40°42'46.1"N, 74°00'21.6"W`. */
export function formatLatLon(point: LatLon, options: FormatLatLonOptions = {}): string {
  const style = options.style ?? 'decimal';
  if (style === 'dms') {
    const precision = options.precision ?? 1;
    return `${toDms(point.latitude, 'N', 'S', precision)}, ${toDms(point.longitude, 'E', 'W', precision)}`;
  }
  const precision = options.precision ?? 4;
  const lat = `${Math.abs(point.latitude).toFixed(precision)}°${point.latitude < 0 ? 'S' : 'N'}`;
  const lon = `${Math.abs(point.longitude).toFixed(precision)}°${point.longitude < 0 ? 'W' : 'E'}`;
  return `${lat}, ${lon}`;
}

/** Formats metres as `m` or `km` with sensible precision, e.g. `340 m`, `1.25 km`, `10,200 km`. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '';
  const abs = Math.abs(meters);
  if (abs < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  const digits = Math.abs(km) < 100 ? 2 : 0;
  return `${km.toLocaleString('en-US', { maximumFractionDigits: digits })} km`;
}

/**
 * Parses user-typed coordinates such as `40.7, -74`, `40.7N 74W` or `-33.9;151.2`.
 * Returns null when the text is not a coordinate pair or is out of range.
 */
export function parseLatLon(text: string): LatLon | null {
  const match =
    /^\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*[,;\s]\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([EW])?\s*$/i.exec(text);
  if (!match) return null;
  let latitude = Number(match[1]);
  let longitude = Number(match[3]);
  if (match[2]?.toUpperCase() === 'S') latitude = -Math.abs(latitude);
  if (match[4]?.toUpperCase() === 'W') longitude = -Math.abs(longitude);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}
