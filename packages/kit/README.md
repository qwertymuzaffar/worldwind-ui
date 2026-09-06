# worldwind-kit

Framework-agnostic TypeScript toolkit for [NASA WorldWind](https://worldwind.arc.nasa.gov/web/).
It is the core under [`react-worldwind`](https://www.npmjs.com/package/react-worldwind) and
[`ngx-worldwind`](https://www.npmjs.com/package/ngx-worldwind), and usable on its own.

**Docs:** https://qwertymuzaffar.github.io/worldwind-ui/guide/kit

**Live demos** (built on this kit): https://qwertymuzaffar.github.io/worldwind-ui/

```sh
npm install worldwind-kit @nasaworldwind/worldwind
```

## Usage

```ts
import { GlobeController } from 'worldwind-kit';

const globe = await GlobeController.create(document.getElementById('map')!, {
  layers: ['blue-marble-landsat', 'atmosphere', 'compass'],
  view: { latitude: 48.85, longitude: 2.35, range: 5e5 },
});

const pins = globe.addRenderableLayer('Pins');
pins.addRenderable(createPlacemark(globe.worldWind, {
  position: { latitude: 48.8584, longitude: 2.2945 },
  label: 'Eiffel Tower',
  imageSource: pushpinUrl(globe.worldWind, 'red'),
}));

globe.on('click', (event) => console.log(event.position, event.top?.object));
await globe.camera.goTo({ latitude: 51.5, longitude: -0.12, range: 1e6 }, { duration: 2000 });

globe.destroy(); // stops rendering, releases WebGL, removes listeners
```

WorldWind is loaded lazily with `import()` the first time a globe is created, so the kit is safe
to import during server rendering. Its image assets (pushpins, compass, Blue Marble) are served
from a CDN by default; pass `assetBaseUrl` to self-host them.

## What is inside

| Module | Highlights |
| --- | --- |
| `GlobeController` | Creates a `WorldWindow` on a host element, `layers`, `camera`, `pick()`, `on('click' \| 'dblclick' \| 'hover')`, `setProjection()` + `onProjectionChange()`, `destroy()` |
| `LayerManager` | `add / remove / move / update / toggle / setOpacity`, stable snapshots via `all`, `subscribe()` |
| `createBuiltInLayer`, `createWmsLayer` | WorldWind's bundled layers by short name (`'osm'`, `'bing-aerial'`, `'star-field'`, ...), WMS with sensible defaults |
| `CameraController` | `get / set / goTo / zoomBy / rotateBy / tiltBy / resetNorth`, `subscribe()` for changes, `snapshot()` for external stores |
| `pickAt`, `PickDispatcher` | Picks in client coordinates; click and tap through WorldWind's recognizers (one shared set per globe, since WorldWind lets only one recognizer claim a gesture), hover throttled to one pick per frame |
| `createWmtsLayerFromCapabilities`, `createWmsLayerFromCapabilities`, `fetchCapabilities` | OGC layers configured from a GetCapabilities document |
| `loadGeoJson`, `loadKml` | GeoJSON (URL, string or object) with per-feature styling, and KML/KMZ, into a renderable layer |
| `MeasureTool`, `formatArea` | Click-to-measure distances and areas in the tool's own layer |
| `createPlacemark`, `createPath`, `createPolygon`, `createSurface*`, `createGeographicText` (+ `update*`) | Shapes from plain options: CSS colours, altitude modes, highlight styles, `userData` |
| `ShapeEventRegistry` | Per-object click/hover routing sharing one recognizer per globe |
| `scriptLoader`, `loadWorldWind`, `setWorldWind` | Load WorldWind lazily by `import()` or a CDN script, or inject a custom build |
| `worldwind-kit/vite` | `worldwindVitePlugin()` and `unevalWebpackModules()` for production bundling |
| `geocode`, `parseLatLon`, `rangeForBoundingBox` | Nominatim search and coordinate parsing for "go to" boxes |
| `formatLatLon`, `formatDistance`, `greatCircleDistanceMeters`, `initialBearingDegrees` | Small geo helpers |
| `toColor`, `parseCssColor` | `#rgb`, `#rrggbbaa`, `rgba()`, tuples and named colours to WorldWind colours |
| `WorldWindStatic` and `WW*` types | Typings for the WorldWind objects the kit uses; everything else stays reachable as `any` |

## Bundling WorldWind

WorldWind's bundle contains webpack modules that use `eval`; rolldown (Vite 8) renames the
variables they read and WorldWind breaks at runtime with `utils.inherits is not a function`.
Either rewrite those modules at build time:

```ts
// vite.config.ts
import { worldwindVitePlugin } from 'worldwind-kit/vite';
export default defineConfig({ plugins: [worldwindVitePlugin()] });
```

or load WorldWind from a CDN `<script>` instead of bundling it:

```ts
import { GlobeController, scriptLoader } from 'worldwind-kit';
const globe = await GlobeController.create(host, options, { loader: scriptLoader() });
```

`unevalWebpackModules(code)` is the underlying transform, for other bundlers. The rolldown bug is
reported at https://github.com/rolldown/rolldown/issues/10826.

## Testing without WebGL

```ts
import { installFakeWorldWind } from 'worldwind-kit/testing';

const fake = installFakeWorldWind();          // loadWorldWind() now resolves to the fake
const globe = await GlobeController.create(document.createElement('div'));
fake.windows[0].setPickResult([{ isTerrain: true, position: { latitude: 1, longitude: 2 } }]);
fake.recognizers[0].simulate(10, 10);        // fires click handlers
fake.windows[0].simulateFrame();             // runs redraw callbacks (camera subscribers)
```

## Requirements

- `@nasaworldwind/worldwind` 0.9 or newer as a peer dependency (0.11 recommended).
- A browser with WebGL. The kit itself has no DOM dependency until a globe is created.

MIT licensed. Not affiliated with NASA.
