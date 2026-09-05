import { describe, expect, it, vi } from 'vitest';
import { geocode, rangeForBoundingBox } from '../src/geocode';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe('geocode', () => {
  it('queries a Nominatim endpoint and normalizes results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([
        { display_name: 'Paris, France', lat: '48.85', lon: '2.35', type: 'city', boundingbox: ['48.8', '48.9', '2.2', '2.4'] },
        { display_name: 'bad', lat: 'x', lon: 'y' },
      ]),
    );
    const results = await geocode(' Paris ', { fetch: fetchMock, limit: 3, language: 'fr', endpoint: 'https://geo.example/search' });
    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.origin + url.pathname).toBe('https://geo.example/search');
    expect(url.searchParams.get('q')).toBe('Paris');
    expect(url.searchParams.get('limit')).toBe('3');
    expect(url.searchParams.get('accept-language')).toBe('fr');
    expect(url.searchParams.get('format')).toBe('jsonv2');
    expect(results).toEqual([
      expect.objectContaining({
        displayName: 'Paris, France',
        latitude: 48.85,
        longitude: 2.35,
        type: 'city',
        boundingBox: { south: 48.8, north: 48.9, west: 2.2, east: 2.4 },
      }),
    ]);
  });

  it('short-circuits empty queries and reports HTTP errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 503));
    await expect(geocode('   ', { fetch: fetchMock })).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(geocode('x', { fetch: fetchMock })).rejects.toThrow(/HTTP 503/);
  });

  it('suggests a range for a bounding box', () => {
    expect(rangeForBoundingBox({ south: 48.8, north: 48.9, west: 2.2, east: 2.4 })).toBeGreaterThan(15_000);
    expect(rangeForBoundingBox({ south: 0, north: 0, west: 0, east: 0 })).toBeCloseTo(1665, 0);
  });
});
