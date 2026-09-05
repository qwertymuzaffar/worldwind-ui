export interface GeocodeResult {
  displayName: string;
  latitude: number;
  longitude: number;
  /** Degrees. Present when the provider returns a bounding box. */
  boundingBox?: { south: number; north: number; west: number; east: number };
  /** Provider category, e.g. `city`, `country`. */
  type?: string;
  /** The untouched provider record. */
  raw: unknown;
}

export interface GeocodeOptions {
  /** A Nominatim-compatible search endpoint. Defaults to the public OpenStreetMap instance. */
  endpoint?: string;
  /** Maximum results. Defaults to 5. */
  limit?: number;
  /** BCP 47 language tag for result names. */
  language?: string;
  signal?: AbortSignal;
  /** Injectable for tests or custom transports. */
  fetch?: typeof fetch;
}

export const DEFAULT_GEOCODE_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

interface NominatimRecord {
  display_name?: string;
  lat?: string;
  lon?: string;
  boundingbox?: [string, string, string, string];
  type?: string;
}

/**
 * Geocodes a free-text query with a Nominatim-compatible service.
 *
 * The public OpenStreetMap instance is for light use only (at most one request per second,
 * with a valid Referer) - see https://operations.osmfoundation.org/policies/nominatim/.
 * Point `endpoint` at your own or a commercial Nominatim for anything heavier.
 */
export async function geocode(query: string, options: GeocodeOptions = {}): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const doFetch = options.fetch ?? globalThis.fetch;
  if (typeof doFetch !== 'function') throw new Error('worldwind-kit: fetch is not available in this environment');

  const url = new URL(options.endpoint ?? DEFAULT_GEOCODE_ENDPOINT);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', trimmed);
  url.searchParams.set('limit', String(options.limit ?? 5));
  if (options.language) url.searchParams.set('accept-language', options.language);

  const response = await doFetch(url.toString(), {
    signal: options.signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`worldwind-kit: geocoding failed with HTTP ${response.status}`);
  const records = (await response.json()) as NominatimRecord[];
  if (!Array.isArray(records)) return [];

  return records.flatMap((record) => {
    const latitude = Number(record.lat);
    const longitude = Number(record.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const result: GeocodeResult = {
      displayName: record.display_name ?? trimmed,
      latitude,
      longitude,
      raw: record,
    };
    if (record.type) result.type = record.type;
    if (record.boundingbox && record.boundingbox.length === 4) {
      const [south, north, west, east] = record.boundingbox.map(Number);
      if ([south, north, west, east].every(Number.isFinite)) {
        result.boundingBox = { south: south!, north: north!, west: west!, east: east! };
      }
    }
    return [result];
  });
}

/** A camera range (metres) that frames a bounding box, useful after geocoding. */
export function rangeForBoundingBox(box: { south: number; north: number; west: number; east: number }): number {
  const latSpan = Math.abs(box.north - box.south);
  const lonSpan = Math.abs(box.east - box.west) * Math.cos((((box.north + box.south) / 2) * Math.PI) / 180);
  const spanDegrees = Math.max(latSpan, lonSpan, 0.01);
  // ~111 km per degree; a range of roughly 1.5x the span keeps the box comfortably in view.
  return spanDegrees * 111_000 * 1.5;
}
