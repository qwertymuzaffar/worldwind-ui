import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlobeController } from '../src/globe';
import { FakeGlobe2D, FakeRenderableLayer, createFakeWorldWind, installFakeWorldWind, uninstallWorldWind } from '../src/testing';

afterEach(() => {
  uninstallWorldWind();
  vi.unstubAllGlobals();
});

describe('GlobeController', () => {
  it('creates a canvas inside a host element and configures WorldWind', async () => {
    const fake = installFakeWorldWind();
    const host = document.createElement('div');
    const globe = await GlobeController.create(host, {
      assetBaseUrl: 'https://cdn.example/ww',
      bingMapsKey: 'bing',
      logLevel: 'warning',
      deepPicking: true,
      pixelScale: 2,
      layers: ['blue-marble', 'atmosphere'],
      view: { latitude: 10, longitude: 20, range: 5000 },
    });
    expect(globe.worldWind).toBe(fake);
    expect(host.querySelector('canvas')).toBe(globe.canvas);
    expect(fake.configuration.baseUrl).toBe('https://cdn.example/ww/');
    expect(fake.BingMapsKey).toBe('bing');
    expect((fake.Logger as unknown as { level: number }).level).toBe(2);
    expect(globe.wwd.deepPicking).toBe(true);
    expect(globe.wwd.pixelScale).toBe(2);
    expect(globe.layers.all.map((l) => l.displayName)).toEqual(['Blue Marble', 'Atmosphere']);
    expect(globe.camera.get()).toMatchObject({ latitude: 10, longitude: 20, range: 5000 });
    expect(fake.windows).toHaveLength(1);
  });

  it('renders into an existing canvas and leaves it in place on destroy', () => {
    const fake = createFakeWorldWind();
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    const globe = new GlobeController(fake, canvas, { elevation: false, assetBaseUrl: null });
    expect(globe.canvas).toBe(canvas);
    expect(fake.configuration.baseUrl).toBe('http://localhost/worldwind/');
    expect(globe.wwd.globe.elevationModel).toBeInstanceOf(fake.ElevationModel);
    globe.destroy();
    expect(canvas.isConnected).toBe(true);
    canvas.remove();
  });

  it('adds layers, renderable layers and WMS layers', () => {
    const fake = createFakeWorldWind();
    const globe = new GlobeController(fake, document.createElement('div'));
    globe.addLayer('osm', { opacity: 0.3 });
    const pins = globe.addRenderableLayer('Pins', { pickEnabled: false });
    globe.addWmsLayer({ service: 'https://wms', layerNames: 'x' });
    expect(pins).toBeInstanceOf(FakeRenderableLayer);
    expect(pins.pickEnabled).toBe(false);
    expect(globe.layers.all.map((l) => l.displayName)).toEqual(['OpenStreetMap', 'Pins', 'x']);
  });

  it('switches projections', () => {
    const fake = createFakeWorldWind();
    const globe = new GlobeController(fake, document.createElement('div'), { projection: 'mercator' });
    expect(globe.projection).toBe('mercator');
    expect(globe.wwd.globe).toBeInstanceOf(FakeGlobe2D);
    globe.setProjection('3d');
    expect(globe.wwd.globe.is2D()).toBe(false);
    globe.setProjection('north-polar');
    expect((globe.wwd.globe.projection as { pole?: string }).pole).toBe('North');
  });

  it('wires picking and DOM events, and detaches them on destroy', () => {
    const fake = createFakeWorldWind();
    const globe = new GlobeController(fake, document.createElement('div'));
    const wwd = fake.windows[0]!;
    wwd.setPickResult([{ isTerrain: true, position: { latitude: 1, longitude: 2 } }]);

    const onClick = vi.fn();
    const onWheel = vi.fn();
    globe.on('click', onClick);
    const offWheel = globe.addEventListener('wheel', onWheel);
    fake.recognizers[0]!.simulate(5, 5);
    wwd.dispatch('wheel', { deltaY: 1 });
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ position: { latitude: 1, longitude: 2, altitude: 0 } }));
    expect(onWheel).toHaveBeenCalledTimes(1);
    expect(globe.pick(5, 5).position).toEqual({ latitude: 1, longitude: 2, altitude: 0 });

    offWheel();
    expect(wwd.listenerCount('wheel')).toBe(0);

    globe.destroy();
    expect(fake.recognizers.every((r) => !r.enabled)).toBe(true);
  });

  it('tears everything down on destroy', () => {
    const cancel = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancel);
    const fake = createFakeWorldWind();
    const host = document.createElement('div');
    const globe = new GlobeController(fake, host, { layers: ['blue-marble', 'compass'] });
    const wwd = fake.windows[0]!;
    wwd.redrawRequestId = 42;

    globe.destroy();
    expect(globe.isDisposed).toBe(true);
    expect(cancel).toHaveBeenCalledWith(42);
    expect(wwd.layers).toHaveLength(0);
    expect(wwd.redrawCallbacks).toHaveLength(0);
    expect(wwd.contextLost).toBe(true);
    expect(host.querySelector('canvas')).toBeNull();
    wwd.onGestureEvent(new Event('pointerdown'));
    expect(wwd.gestureEvents).toHaveLength(0);

    globe.destroy();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
