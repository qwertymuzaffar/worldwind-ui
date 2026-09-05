import { describe, expect, it } from 'vitest';
import {
  createGeographicText,
  createPath,
  createPlacemark,
  createPolygon,
  createSurfaceCircle,
  createSurfacePolygon,
  createSurfacePolyline,
  updatePath,
  updatePlacemark,
  updatePolygon,
  updateSurfaceCircle,
} from '../src/shapes';
import { createFakeWorldWind } from '../src/testing';

const ww = createFakeWorldWind();

describe('placemarks', () => {
  it('creates a placemark from plain options', () => {
    const placemark = createPlacemark(ww, {
      position: { latitude: 1, longitude: 2, altitude: 3 },
      label: 'Here',
      imageSource: 'pin.png',
      imageScale: 0.5,
      imageColor: '#ff0000',
      imageOffset: { x: 0.5, y: 0, xUnits: 'fraction', yUnits: 'pixels' },
      labelColor: [0, 0, 1],
      labelFontSize: 18,
      altitudeMode: 'clampToGround',
      drawLeaderLine: true,
      leaderLineColor: 'yellow',
      highlight: { imageScale: 1 },
      userData: { id: 7 },
      displayName: 'Pin',
    });
    expect(placemark.position).toMatchObject({ latitude: 1, longitude: 2, altitude: 3 });
    expect(placemark.label).toBe('Here');
    expect(placemark.eyeDistanceScaling).toBe(true);
    expect(placemark.altitudeMode).toBe('clampToGround');
    expect(placemark.attributes.imageSource).toBe('pin.png');
    expect(placemark.attributes.imageScale).toBe(0.5);
    expect(placemark.attributes.imageColor).toMatchObject({ red: 1, green: 0, blue: 0 });
    expect(placemark.attributes.imageOffset).toMatchObject({ xUnits: 'fraction', yUnits: 'pixels', x: 0.5 });
    expect(placemark.attributes.labelAttributes.color).toMatchObject({ blue: 1 });
    expect(placemark.attributes.labelAttributes.font.size).toBe(18);
    expect(placemark.attributes.drawLeaderLine).toBe(true);
    expect(placemark.attributes.leaderLineAttributes.outlineColor).toMatchObject({ red: 1, green: 1, blue: 0 });
    expect(placemark.highlightAttributes?.imageScale).toBe(1);
    expect(placemark.highlightAttributes?.imageSource).toBe('pin.png');
    expect(placemark.userProperties).toEqual({ id: 7 });
    expect(placemark.displayName).toBe('Pin');
  });

  it('updates only what is given', () => {
    const placemark = createPlacemark(ww, { position: { latitude: 0, longitude: 0 }, label: 'A', highlight: {} });
    updatePlacemark(ww, placemark, { position: { latitude: 5, longitude: 6 }, highlight: null, enabled: false });
    expect(placemark.position).toMatchObject({ latitude: 5, longitude: 6 });
    expect(placemark.label).toBe('A');
    expect(placemark.highlightAttributes).toBeNull();
    expect(placemark.enabled).toBe(false);
  });
});

describe('paths and polygons', () => {
  it('creates and updates a path', () => {
    const path = createPath(ww, {
      positions: [
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 1, altitude: 100 },
      ],
      stroke: '#00ff00',
      strokeWidth: 3,
      fill: null,
      followTerrain: true,
      pathType: 'linear',
      highlight: { stroke: 'white' },
    });
    expect(path.positions).toHaveLength(2);
    expect(path.attributes.outlineColor).toMatchObject({ green: 1 });
    expect(path.attributes.outlineWidth).toBe(3);
    expect(path.attributes.drawInterior).toBe(false);
    expect(path.followTerrain).toBe(true);
    expect(path.pathType).toBe('linear');
    expect(path.highlightAttributes?.outlineColor).toMatchObject({ red: 1, green: 1, blue: 1 });
    expect(path.highlightAttributes?.outlineWidth).toBe(3);

    updatePath(ww, path, { positions: [{ latitude: 9, longitude: 9 }], extrude: true, stroke: null });
    expect(path.positions[0]).toMatchObject({ latitude: 9 });
    expect(path.extrude).toBe(true);
    expect(path.attributes.drawOutline).toBe(false);
  });

  it('creates polygons with holes', () => {
    const polygon = createPolygon(ww, {
      boundaries: [
        [
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: 10 },
          { latitude: 10, longitude: 10 },
        ],
        [
          { latitude: 2, longitude: 2 },
          { latitude: 2, longitude: 4 },
          { latitude: 4, longitude: 4 },
        ],
      ],
      fill: 'rgba(255, 0, 0, 0.5)',
      extrude: true,
      altitudeMode: 'relativeToGround',
    });
    expect(Array.isArray(polygon.boundaries[0])).toBe(true);
    expect(polygon.extrude).toBe(true);
    expect(polygon.altitudeMode).toBe('relativeToGround');
    expect(polygon.attributes.interiorColor.alpha).toBe(0.5);

    updatePolygon(ww, polygon, { boundaries: [{ latitude: 1, longitude: 1 }] });
    expect(Array.isArray(polygon.boundaries[0])).toBe(false);
  });
});

describe('surface shapes and text', () => {
  it('creates surface shapes', () => {
    const line = createSurfacePolyline(ww, { locations: [{ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 1 }], stroke: 'red' });
    expect(line.locations).toHaveLength(2);
    expect(line.attributes.drawInterior).toBe(false);

    const area = createSurfacePolygon(ww, { boundaries: [{ latitude: 0, longitude: 0 }], fill: 'blue', pathType: 'rhumbLine' });
    expect(area.attributes.interiorColor).toMatchObject({ blue: 1 });
    expect(area.pathType).toBe('rhumbLine');

    const circle = createSurfaceCircle(ww, { center: { latitude: 3, longitude: 4 }, radius: 500, highlight: { fill: 'white' } });
    expect(circle.radius).toBe(500);
    updateSurfaceCircle(ww, circle, { radius: 900, center: { latitude: 1, longitude: 1 } });
    expect(circle.radius).toBe(900);
    expect(circle.center).toMatchObject({ latitude: 1 });
  });

  it('creates geographic text', () => {
    const text = createGeographicText(ww, {
      position: { latitude: 1, longitude: 2 },
      text: 'Label',
      color: 'cyan',
      fontSize: 20,
      outline: false,
      alwaysOnTop: true,
      offset: { x: 0, y: 1 },
    });
    expect(text.text).toBe('Label');
    expect(text.attributes.color).toMatchObject({ green: 1, blue: 1 });
    expect(text.attributes.font.size).toBe(20);
    expect(text.attributes.enableOutline).toBe(false);
    expect(text.alwaysOnTop).toBe(true);
    expect(text.attributes.offset.y).toBe(1);
  });
});
