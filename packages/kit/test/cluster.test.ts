import { describe, expect, it } from 'vitest';
import { ClusterLayer, clusterCellDegrees, clusterIconUrl, clusterItems } from '../src/cluster';
import { GlobeController } from '../src/globe';
import { createFakeWorldWind, type FakeWorldWindow } from '../src/testing';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('clusterItems', () => {
  it('groups items by grid cell and leaves small cells as singles', () => {
    const items = [
      { latitude: 0.5, longitude: 0.5 },
      { latitude: 0.6, longitude: 0.6 },
      { latitude: 0.7, longitude: 0.55 },
      { latitude: 40, longitude: 40 },
    ];
    const result = clusterItems(items, 1);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0]).toMatchObject({ count: 3 });
    expect(result.clusters[0]!.latitude).toBeCloseTo(0.6);
    expect(result.clusters[0]!.longitude).toBeCloseTo(0.55);
    expect(result.singles).toEqual([items[3]]);
    expect(clusterItems(items, 1, { minPoints: 4 }).clusters).toHaveLength(0);
    expect(clusterItems(items, 0).singles).toHaveLength(4);
    const wrapped = [{ p: { latitude: 5, longitude: 5 } }, { p: { latitude: 5.2, longitude: 5.2 } }, { p: { latitude: NaN, longitude: 1 } }];
    expect(clusterItems(wrapped, 1, { getPosition: (item) => item.p }).clusters[0]?.count).toBe(2);
  });

  it('widens cells toward the poles so clusters stay round on screen', () => {
    const near = (latitude: number) => [
      { latitude, longitude: -3 },
      { latitude, longitude: 1 },
    ];
    expect(clusterItems(near(80), 1).clusters).toHaveLength(1);
    expect(clusterItems(near(0), 1).clusters).toHaveLength(0);
  });

  it('snaps cell sizes to quarter octaves', () => {
    const cell = clusterCellDegrees(60, 1000);
    expect(cell).toBeCloseTo(2 ** (Math.round(Math.log2(60_000 / 111_320) * 4) / 4));
    expect(clusterCellDegrees(60, 1000)).toBe(clusterCellDegrees(60, 990));
    expect(clusterCellDegrees(60, 1000)).toBe(clusterCellDegrees(60, 1010));
    expect(clusterCellDegrees(60, 2000)).toBeGreaterThan(cell);
    expect(clusterCellDegrees(60, 0)).toBe(0);
  });

  it('builds cached count icons', () => {
    const five = clusterIconUrl(5);
    expect(five.startsWith('data:image/svg+xml')).toBe(true);
    expect(clusterIconUrl(5)).toBe(five);
    expect(clusterIconUrl(500)).not.toBe(five);
    expect(decodeURIComponent(clusterIconUrl(1500))).toContain('1.5k');
    expect(decodeURIComponent(clusterIconUrl(7, '#ff0000'))).toContain('#ff0000');
  });
});

describe('ClusterLayer', () => {
  function setup(throttle = 0) {
    const ww = createFakeWorldWind();
    const globe = new GlobeController(ww, document.createElement('div'));
    const wwd = globe.wwd as unknown as FakeWorldWindow;
    wwd.navigator.range = 10_000_000; // 10 km per pixel in the fake
    const items: Array<{ latitude: number; longitude: number; name: string }> = [];
    for (let i = 0; i < 100; i += 1) items.push({ latitude: Math.floor(i / 10) * 0.05, longitude: (i % 10) * 0.05, name: `p${i}` });
    items.push({ latitude: 50, longitude: 50, name: 'far' }, { latitude: -50, longitude: -50, name: 'farther' });
    const layer = new ClusterLayer(globe, items, { layerName: 'Stations', throttle });
    return { ww, globe, wwd, items, layer };
  }

  it('clusters on creation, re-clusters when the zoom changes, and maps renderables back', () => {
    const { wwd, items, layer } = setup();
    expect(wwd.layers.find((l) => l.displayName === 'Stations')).toBe(layer.layer);
    expect(layer.state.clusters).toHaveLength(1);
    expect(layer.state.clusters[0]!.count).toBe(100);
    expect(layer.state.singles).toHaveLength(2);
    expect(layer.layer.renderables).toHaveLength(3);
    const marker = layer.layer.renderables[0];
    expect(layer.clusterAt(marker)?.count).toBe(100);
    expect(items).toContain(layer.itemAt(layer.layer.renderables[1]));
    expect(layer.itemAt(marker)).toBeNull();

    wwd.navigator.range = 1000; // 1 m per pixel: every point stands alone
    wwd.simulateFrame();
    expect(layer.state.clusters).toHaveLength(0);
    expect(layer.layer.renderables).toHaveLength(102);
    const single = layer.layer.renderables[5];
    wwd.simulateFrame();
    expect(layer.layer.renderables[5]).toBe(single); // item renderables are reused
  });

  it('throttles while zooming and applies the last zoom', async () => {
    const { wwd, layer } = setup(40);
    await wait(60); // let the throttle window of the initial pass close
    const seen: number[] = [];
    layer.subscribe((state) => seen.push(state.clusters.length));
    wwd.navigator.range = 5_000_000;
    wwd.simulateFrame();
    wwd.navigator.range = 1000;
    wwd.simulateFrame();
    expect(layer.state.clusters).toHaveLength(1); // deferred
    await wait(80);
    expect(layer.state.clusters).toHaveLength(0);
    expect(seen).toEqual([1, 0]);
  });

  it('flies to a clicked cluster and replaces items', () => {
    const { wwd, layer, globe } = setup();
    const marker = layer.layer.renderables[0];
    wwd.setPickResult([{ userObject: marker, position: { latitude: 0.2, longitude: 0.2 } }, { isTerrain: true, position: { latitude: 0.2, longitude: 0.2 } }]);
    wwd.click(1, 1);
    expect(wwd.goToAnimator.calls).toHaveLength(1);
    expect(wwd.goToAnimator.calls[0]).toMatchObject({ altitude: 2_500_000 });
    expect(globe.camera.get().latitude).toBeCloseTo(0.225);

    layer.setItems([{ latitude: 1, longitude: 1, name: 'only' }]);
    expect(layer.layer.renderables).toHaveLength(1);
    expect(layer.state.singles).toHaveLength(1);
    layer.destroy();
    expect(wwd.layers.map((l) => l.displayName)).not.toContain('Stations');
  });

  it('keeps its defaults when options are passed as undefined', () => {
    const ww = createFakeWorldWind();
    const globe = new GlobeController(ww, document.createElement('div'));
    (globe.wwd as unknown as FakeWorldWindow).navigator.range = 10_000_000;
    const layer = new ClusterLayer(globe, [{ latitude: 1, longitude: 1 }, { latitude: 1.2, longitude: 1.2 }], {
      radius: undefined,
      minPoints: undefined,
      throttle: undefined,
      zoomOnClick: undefined,
    });
    expect(layer.state.clusters).toHaveLength(1);
  });

  it('accepts custom renderers and positions', () => {
    const ww = createFakeWorldWind();
    const globe = new GlobeController(ww, document.createElement('div'));
    const wwd = globe.wwd as unknown as FakeWorldWindow;
    wwd.navigator.range = 10_000_000;
    const items = [{ at: [0, 0] }, { at: [0.1, 0.1] }, { at: [60, 60] }];
    const layer = new ClusterLayer(globe, items, {
      getPosition: (item) => ({ latitude: item.at[0]!, longitude: item.at[1]! }),
      renderCluster: (cluster, worldWind) => new worldWind.Placemark(new worldWind.Position(cluster.latitude, cluster.longitude, 0), false, null),
      renderItem: (item, worldWind) => new worldWind.Placemark(new worldWind.Position(item.at[0]!, item.at[1]!, 0), false, null),
      zoomOnClick: false,
      layer: { opacity: 0.5 },
    });
    expect(layer.state.clusters[0]?.count).toBe(2);
    expect(layer.layer.renderables).toHaveLength(2);
    expect(layer.layer.opacity).toBe(0.5);
  });
});
