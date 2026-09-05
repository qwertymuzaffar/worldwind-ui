import { describe, expect, it, vi } from 'vitest';
import { BUILT_IN_LAYER_KINDS, LayerManager, createBuiltInLayer, createWmsLayer } from '../src/layers';
import { FakeWmsLayer, createFakeWorldWind } from '../src/testing';

function setup() {
  const ww = createFakeWorldWind();
  const canvas = document.createElement('canvas');
  const wwd = new ww.WorldWindow(canvas);
  return { ww, wwd, manager: new LayerManager(wwd) };
}

describe('createBuiltInLayer', () => {
  it('creates every documented kind and applies options', () => {
    const { ww, wwd } = setup();
    for (const kind of BUILT_IN_LAYER_KINDS) {
      const layer = createBuiltInLayer(ww, wwd, kind, { opacity: 0.5, enabled: false });
      expect(layer.opacity).toBe(0.5);
      expect(layer.enabled).toBe(false);
    }
  });

  it('passes the Bing key and the window through', () => {
    const { ww, wwd } = setup();
    ww.BingMapsKey = 'key';
    expect(createBuiltInLayer(ww, wwd, 'bing-aerial').constructorArgs).toEqual(['key']);
    expect(createBuiltInLayer(ww, wwd, 'coordinates').constructorArgs).toEqual([wwd]);
    expect(createBuiltInLayer(ww, wwd, 'osm').constructorArgs).toEqual(['osm']);
  });
});

describe('createWmsLayer', () => {
  it('fills in WorldWind defaults', () => {
    const { ww } = setup();
    const layer = createWmsLayer(ww, { service: 'https://wms.example', layerNames: 'a,b', displayName: 'Demo' });
    expect(layer).toBeInstanceOf(FakeWmsLayer);
    expect((layer as FakeWmsLayer).config).toMatchObject({
      service: 'https://wms.example',
      layerNames: 'a,b',
      numLevels: 19,
      format: 'image/png',
      size: 256,
      title: 'Demo',
      sector: ww.Sector.FULL_SPHERE,
      levelZeroDelta: { latitude: 36, longitude: 36 },
    });
    expect(layer.displayName).toBe('Demo');
  });

  it('honours a custom sector, time and version', () => {
    const { ww } = setup();
    const layer = createWmsLayer(ww, {
      service: 's',
      layerNames: 'l',
      sector: { minLatitude: -10, maxLatitude: 10, minLongitude: -20, maxLongitude: 20 },
      time: '2024-01-01',
      version: '1.3.0',
      levelZeroDelta: 90,
    }) as FakeWmsLayer;
    expect(layer.config.sector).toMatchObject({ minLatitude: -10, maxLongitude: 20 });
    expect(layer.config.levelZeroDelta).toMatchObject({ latitude: 90 });
    expect(layer.config.version).toBe('1.3.0');
    expect(layer.timeString).toBe('2024-01-01');
  });
});

describe('LayerManager', () => {
  it('adds, inserts, moves and removes layers with notifications and redraws', () => {
    const { ww, wwd, manager } = setup();
    const listener = vi.fn();
    manager.subscribe(listener);

    const a = manager.add(new ww.Layer('A'));
    const b = manager.add(new ww.Layer('B'));
    const c = manager.add(new ww.Layer('C'), { index: 0 });
    expect(manager.all.map((l) => l.displayName)).toEqual(['C', 'A', 'B']);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'add', layer: c }));

    manager.add(a);
    expect(listener).toHaveBeenCalledTimes(3);

    manager.moveUp(c);
    expect(manager.all.map((l) => l.displayName)).toEqual(['A', 'C', 'B']);
    manager.moveDown(b);
    expect(manager.all.map((l) => l.displayName)).toEqual(['A', 'B', 'C']);
    manager.move(c, 0);
    expect(manager.indexOf(c)).toBe(0);

    expect(manager.remove(b)).toBe(true);
    expect(manager.remove(b)).toBe(false);
    expect(manager.count).toBe(2);
    expect(wwd.redrawCount).toBeGreaterThanOrEqual(7);
  });

  it('updates, toggles and finds layers', () => {
    const { ww, manager } = setup();
    const layer = manager.add(new ww.Layer('Base'));
    manager.setOpacity(layer, 2);
    expect(layer.opacity).toBe(1);
    expect(manager.toggle(layer)).toBe(false);
    expect(manager.find('Base')).toBe(layer);
    expect(manager.find((l) => l.enabled)).toBeUndefined();
    manager.clear();
    expect(manager.count).toBe(0);
  });

  it('stops notifying after destroy', () => {
    const { ww, manager } = setup();
    const listener = vi.fn();
    manager.subscribe(listener);
    manager.destroy();
    manager.add(new ww.Layer());
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('LayerManager.all', () => {
  it('returns a stable frozen array until the layers change', () => {
    const { ww, wwd, manager } = setup();
    const empty = manager.all;
    expect(manager.all).toBe(empty);
    const layer = manager.add(new ww.Layer('A'));
    const one = manager.all;
    expect(one).not.toBe(empty);
    expect(one).toEqual([layer]);
    expect(Object.isFrozen(one)).toBe(true);
    manager.setOpacity(layer, 0.5);
    expect(manager.all).not.toBe(one);
    wwd.layers.push(new ww.Layer('outside'));
    expect(manager.all).toHaveLength(2);
  });
});
