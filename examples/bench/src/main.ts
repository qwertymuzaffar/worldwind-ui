/**
 * Benchmark page for worldwind-kit. `window.bench.run(scenario)` builds a scenario, then measures
 * draw time per frame while the camera orbits. Driven by scripts/bench.mjs.
 */
import { ClusterLayer, GlobeController, createPath, createPlacemark, loadGeoJson, pushpinUrl, type LatLonAlt } from 'worldwind-kit';

const status = document.getElementById('status')!;
const say = (text: string) => (status.textContent = text);

/** Deterministic pseudo-random numbers so every run places the same objects. */
function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randomPoint(random: () => number): LatLonAlt {
  return { latitude: random() * 160 - 80, longitude: random() * 360 - 180 };
}

export interface BenchResult {
  scenario: string;
  objects: number;
  setupMs: number;
  frameMsAvg: number;
  frameMsP95: number;
  fps: number;
  heapMb: number | null;
  renderer: string;
}

const SCENARIOS: Record<string, { objects: number; build: (globe: GlobeController) => Promise<void> | void }> = {
  baseline: { objects: 0, build: () => {} },
  'placemarks-1k': { objects: 1_000, build: (globe) => placemarks(globe, 1_000) },
  'placemarks-10k': { objects: 10_000, build: (globe) => placemarks(globe, 10_000) },
  'placemarks-50k': { objects: 50_000, build: (globe) => placemarks(globe, 50_000) },
  'clustered-10k': { objects: 10_000, build: (globe) => clustered(globe, 10_000) },
  'clustered-50k': { objects: 50_000, build: (globe) => clustered(globe, 50_000) },
  'geojson-10k': { objects: 10_500, build: (globe) => geojson(globe, 10_000, 500) },
  'paths-500': { objects: 500, build: (globe) => paths(globe, 500) },
};

function placemarks(globe: GlobeController, count: number) {
  const layer = globe.addRenderableLayer(`Placemarks ${count}`);
  const random = rng(42);
  const image = pushpinUrl(globe.worldWind, 'red');
  for (let i = 0; i < count; i += 1) {
    layer.addRenderable(createPlacemark(globe.worldWind, { position: randomPoint(random), imageSource: image, imageScale: 0.5 }));
  }
}

/** The same points as the placemark scenarios, drawn through a ClusterLayer instead. */
function clustered(globe: GlobeController, count: number) {
  const random = rng(42);
  const items: LatLonAlt[] = [];
  for (let i = 0; i < count; i += 1) items.push(randomPoint(random));
  new ClusterLayer(globe, items, { layerName: `Clustered ${count}`, zoomOnClick: false });
}

function paths(globe: GlobeController, count: number) {
  const layer = globe.addRenderableLayer(`Paths ${count}`);
  const random = rng(7);
  for (let i = 0; i < count; i += 1) {
    layer.addRenderable(
      createPath(globe.worldWind, {
        positions: [randomPoint(random), randomPoint(random)].map((p) => ({ ...p, altitude: 200_000 })),
        stroke: '#38bdf8',
        strokeWidth: 2,
      }),
    );
  }
}

async function geojson(globe: GlobeController, points: number, polygons: number) {
  const random = rng(99);
  const features: object[] = [];
  for (let i = 0; i < points; i += 1) {
    const p = randomPoint(random);
    features.push({ type: 'Feature', properties: { name: `P${i}` }, geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] } });
  }
  for (let i = 0; i < polygons; i += 1) {
    const c = randomPoint(random);
    const d = 0.5 + random() * 2;
    features.push({
      type: 'Feature',
      properties: { name: `Z${i}` },
      geometry: { type: 'Polygon', coordinates: [[[c.longitude, c.latitude], [c.longitude + d, c.latitude], [c.longitude + d, c.latitude + d], [c.longitude, c.latitude + d], [c.longitude, c.latitude]]] },
    });
  }
  const layer = globe.addRenderableLayer('GeoJSON');
  await loadGeoJson(globe.worldWind, { type: 'FeatureCollection', features }, layer, {
    style: { point: { imageScale: 0.5 }, polygon: { fill: 'rgba(56, 189, 248, 0.3)', stroke: '#38bdf8' } },
  });
}

function rendererName(canvas: HTMLCanvasElement): string {
  const gl = canvas.getContext('webgl');
  const info = gl?.getExtension('WEBGL_debug_renderer_info');
  return info && gl ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown';
}

/** Heap in use after a forced collection (Chrome with --js-flags=--expose-gc), else null. */
const heap = () => {
  const gc = (window as unknown as { gc?: () => void }).gc;
  if (!gc) return null;
  gc();
  gc();
  return (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? null;
};
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run(scenario: string, frames = 120): Promise<BenchResult> {
  const spec = SCENARIOS[scenario];
  if (!spec) throw new Error(`unknown scenario ${scenario}`);
  say(`creating globe for ${scenario}`);
  const globe = await GlobeController.create(document.getElementById('globe')!, {
    layers: ['blue-marble-landsat', 'atmosphere', 'star-field'],
    view: { latitude: 20, longitude: 10, range: 1.2e7 },
    keyboard: false,
  });
  const ww = globe.worldWind;
  const wwd = globe.wwd;
  // Let the imagery settle so tile loading does not dominate the numbers.
  await wait(8000);
  const heapBefore = heap();

  const setupStart = performance.now();
  await spec.build(globe);
  globe.redraw();
  await new Promise<void>((resolve) => {
    const cb = (_w: unknown, stage: string) => {
      if (stage !== ww.AFTER_REDRAW) return;
      wwd.redrawCallbacks.splice(wwd.redrawCallbacks.indexOf(cb), 1);
      resolve();
    };
    wwd.redrawCallbacks.push(cb);
  });
  const setupMs = performance.now() - setupStart;
  await wait(1500);

  say(`measuring ${scenario}`);
  const draws: number[] = [];
  let before = 0;
  const measure = (_w: unknown, stage: string) => {
    if (stage === ww.BEFORE_REDRAW) before = performance.now();
    else if (stage === ww.AFTER_REDRAW && before) draws.push(performance.now() - before);
  };
  wwd.redrawCallbacks.push(measure);
  const wallStart = performance.now();
  for (let i = 0; i < frames; i += 1) {
    globe.camera.rotateBy(1);
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  const wallMs = performance.now() - wallStart;
  wwd.redrawCallbacks.splice(wwd.redrawCallbacks.indexOf(measure), 1);

  const sorted = draws.slice().sort((a, b) => a - b);
  const avg = draws.reduce((sum, value) => sum + value, 0) / Math.max(draws.length, 1);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;
  const heapAfter = heap();
  const result: BenchResult = {
    scenario,
    objects: spec.objects,
    setupMs: Math.round(setupMs),
    frameMsAvg: Math.round(avg * 10) / 10,
    frameMsP95: Math.round(p95 * 10) / 10,
    fps: Math.round((draws.length / wallMs) * 1000),
    heapMb: heapBefore !== null && heapAfter !== null ? Math.round(((heapAfter - heapBefore) / 1048576) * 10) / 10 : null,
    renderer: rendererName(globe.canvas),
  };
  say(JSON.stringify(result, null, 1));
  globe.destroy();
  return result;
}

declare global {
  interface Window {
    bench: { run: typeof run; scenarios: string[] };
  }
}
window.bench = { run, scenarios: Object.keys(SCENARIOS) };
say(`ready: ${Object.keys(SCENARIOS).join(', ')}`);
