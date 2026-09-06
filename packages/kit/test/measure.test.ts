import { describe, expect, it, vi } from 'vitest';
import { GlobeController } from '../src/globe';
import { MeasureTool, formatArea } from '../src/measure';
import { isInternalLayer } from '../src/layers';
import { FakePlacemark, FakeSurfacePolyline, createFakeWorldWind } from '../src/testing';

const newYork = { latitude: 40.7128, longitude: -74.006 };
const london = { latitude: 51.5074, longitude: -0.1278 };
const paris = { latitude: 48.8566, longitude: 2.3522 };

function setup() {
  const fake = createFakeWorldWind();
  const globe = new GlobeController(fake, document.createElement('div'));
  const wwd = fake.windows[0]!;
  const tool = new MeasureTool(globe);
  // A globe-level click handler registered first, as an app would have, must not starve the tool.
  globe.on('click', () => {});
  const click = (point: { latitude: number; longitude: number }) => {
    wwd.setPickResult([{ isTerrain: true, position: point }]);
    wwd.click(1, 1);
  };
  return { fake, globe, wwd, tool, click };
}

describe('formatArea', () => {
  it('picks a unit by magnitude', () => {
    expect(formatArea(2500)).toBe('2,500 m²');
    expect(formatArea(250_000)).toBe('25 ha');
    expect(formatArea(2_500_000)).toBe('2.5 km²');
    expect(formatArea(Number.NaN)).toBe('');
  });
});

describe('MeasureTool', () => {
  it('owns a layer, and only collects points while active', () => {
    const { globe, tool, click } = setup();
    expect(globe.layers.all).toContain(tool.layer);
    expect(tool.layer.pickEnabled).toBe(false);
    expect(isInternalLayer(tool.layer)).toBe(true);
    click(newYork);
    expect(tool.state.points).toHaveLength(0);

    tool.start();
    expect(tool.state.active).toBe(true);
    click(newYork);
    click(london);
    expect(tool.state.points).toHaveLength(2);
    expect(tool.state.lengthMeters / 1000).toBeCloseTo(5576, 0);
    expect(tool.state.areaSquareMeters).toBeNull();
    expect(tool.layer.renderables.filter((r) => r instanceof FakePlacemark)).toHaveLength(2);
    expect(tool.layer.renderables.filter((r) => r instanceof FakeSurfacePolyline)).toHaveLength(1);

    click(paris);
    expect(tool.state.areaSquareMeters).toBeGreaterThan(0);

    tool.stop();
    expect(tool.state.active).toBe(false);
    click(paris);
    expect(tool.state.points).toHaveLength(3);
  });

  it('undoes, clears, notifies subscribers with stable snapshots, and destroys', () => {
    const { globe, tool, click } = setup();
    const listener = vi.fn();
    tool.subscribe(listener);
    tool.start();
    click(newYork);
    click(london);
    const snapshot = tool.state;
    expect(tool.state).toBe(snapshot);
    tool.undo();
    expect(tool.state.points).toHaveLength(1);
    expect(tool.state.lengthMeters).toBe(0);
    expect(tool.state).not.toBe(snapshot);
    tool.clear();
    expect(tool.state.points).toHaveLength(0);
    expect(tool.layer.renderables).toHaveLength(0);
    expect(listener).toHaveBeenCalled();

    tool.destroy();
    expect(globe.layers.all).not.toContain(tool.layer);
    expect(tool.state.active).toBe(false);
  });
});
