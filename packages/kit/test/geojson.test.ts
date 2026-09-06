import { describe, expect, it, vi } from 'vitest';
import { geoJsonGeometryType, loadGeoJson } from '../src/geojson';
import { FakePlacemark, FakeSurfacePolygon, FakeSurfacePolyline, createFakeWorldWind } from '../src/testing';

const collection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Paris', kind: 'city' }, geometry: { type: 'Point', coordinates: [2.35, 48.85] } },
    { type: 'Feature', properties: { name: 'Route' }, geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } },
    { type: 'Feature', properties: { name: 'Zone' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [0, 0]]] } },
    { type: 'Feature', properties: {}, geometry: { type: 'MultiPoint', coordinates: [[10, 10], [11, 11]] } },
  ],
};

describe('geoJsonGeometryType', () => {
  it('maps WorldWind geometry predicates to names', () => {
    const geometry = { isPointType: () => false, isMultiPointType: () => false, isLineStringType: () => false, isMultiLineStringType: () => true, isPolygonType: () => false, isMultiPolygonType: () => false };
    expect(geoJsonGeometryType(geometry)).toBe('MultiLineString');
    expect(geoJsonGeometryType({ ...geometry, isMultiLineStringType: () => false })).toBe('Unknown');
  });
});

describe('loadGeoJson', () => {
  it('creates styled shapes with the feature properties attached', async () => {
    const ww = createFakeWorldWind();
    const layer = new ww.RenderableLayer('Data');
    await loadGeoJson(ww, collection, layer, {
      style: {
        point: { pushpin: 'blue', labelProperty: 'name', imageScale: 0.8 },
        line: { stroke: '#00ff00', strokeWidth: 3 },
        polygon: { fill: 'rgba(255, 0, 0, 0.5)', stroke: 'red' },
        highlight: { point: { imageScale: 1.2 }, polygon: { fill: 'white' } },
      },
    });
    expect(layer.renderables).toHaveLength(5);
    const [paris, route, zone] = layer.renderables as [FakePlacemark, FakeSurfacePolyline, FakeSurfacePolygon];
    expect(paris.label).toBe('Paris');
    expect(paris.attributes.imageSource).toContain('plain-blue');
    expect(paris.attributes.imageScale).toBe(0.8);
    expect(paris.highlightAttributes?.imageScale).toBe(1.2);
    expect(paris.userProperties).toEqual({ name: 'Paris', kind: 'city' });
    expect(route.attributes.outlineColor).toMatchObject({ green: 1 });
    expect(route.attributes.outlineWidth).toBe(3);
    expect(route.attributes.drawInterior).toBe(false);
    expect(zone.attributes.interiorColor.alpha).toBe(0.5);
    expect(zone.highlightAttributes?.interiorColor).toMatchObject({ red: 1, green: 1, blue: 1 });
    expect(layer.renderables[3]).toBeInstanceOf(FakePlacemark);
  });

  it('supports a style resolver per feature and JSON strings', async () => {
    const ww = createFakeWorldWind();
    const layer = new ww.RenderableLayer();
    const seen: string[] = [];
    await loadGeoJson(ww, JSON.stringify(collection), layer, {
      style: ({ properties, geometryType }) => {
        seen.push(`${geometryType}:${String(properties.name ?? '')}`);
        return properties.kind === 'city' ? { point: { pushpin: 'green' } } : undefined;
      },
    });
    expect(seen).toEqual(['Point:Paris', 'LineString:Route', 'Polygon:Zone', 'MultiPoint:']);
    expect((layer.renderables[0] as FakePlacemark).attributes.imageSource).toContain('plain-green');
    expect((layer.renderables[3] as FakePlacemark).attributes.imageSource).toContain('plain-red');
  });

  it('fetches URLs and reports HTTP errors', async () => {
    const ww = createFakeWorldWind();
    const layer = new ww.RenderableLayer();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => collection } as Response);
    await loadGeoJson(ww, 'https://example.org/data.geojson', layer, { fetch: fetchMock });
    expect(fetchMock).toHaveBeenCalledWith('https://example.org/data.geojson', expect.anything());
    expect(layer.renderables).toHaveLength(5);
    const failing = vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response);
    await expect(loadGeoJson(ww, 'https://example.org/missing', layer, { fetch: failing })).rejects.toThrow(/HTTP 404/);
  });
});
