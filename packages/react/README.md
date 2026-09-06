# react-worldwind

React components and hooks for [NASA WorldWind](https://worldwind.arc.nasa.gov/web/), built on
[`worldwind-kit`](https://www.npmjs.com/package/worldwind-kit).

**Docs:** https://qwertymuzaffar.github.io/worldwind-ui/guide/react

**Live demo:** https://qwertymuzaffar.github.io/worldwind-ui/react/

```sh
npm install react-worldwind @nasaworldwind/worldwind
```

```tsx
import 'react-worldwind/styles.css';
import { Globe, Layer, RenderableLayer, Placemark, Path, LayerSwitcher, NavigationControls, GoToBox, CoordinatesReadout } from 'react-worldwind';

export function Map() {
  return (
    <Globe style={{ height: '100vh' }} layers={['blue-marble-landsat', 'atmosphere', 'star-field']} view={{ latitude: 20, longitude: 10, range: 1.6e7 }}>
      <Layer kind="osm" enabled={false} />
      <RenderableLayer name="Cities">
        <Placemark position={{ latitude: 40.7128, longitude: -74.006 }} label="New York" highlight={{ imageScale: 1.4 }} highlightOnHover onClick={(e) => console.log(e.top)} />
        <Path positions={[{ latitude: 40.7, longitude: -74 }, { latitude: 51.5, longitude: -0.1 }]} stroke="#38bdf8" strokeWidth={3} />
      </RenderableLayer>
      <GoToBox />
      <LayerSwitcher position="bottom-right" />
      <NavigationControls />
      <CoordinatesReadout />
    </Globe>
  );
}
```

`<Globe>` needs a height; the canvas fills it. Everything else renders inside `<Globe>`.

## Components

| Component | Purpose |
| --- | --- |
| `<Globe>` | Creates the globe. Creation props: `layers`, `view`, `elevation`, `assetBaseUrl`, `bingMapsKey`, `pixelScale`, `deepPicking`, `logLevel`. Reactive: `projection`, `onClick`, `onDoubleClick`, `onHover`. Also `fallback`, `onReady`, `onError`, `loadOptions`. |
| `<Layer kind>` | A built-in layer (`blue-marble`, `blue-marble-landsat`, `osm`, `bing-aerial`*, `atmosphere`, `star-field`, `compass`, `coordinates`, `view-controls`, ...). `enabled`, `opacity`, `index`, ... are reactive. |
| `<WmsLayer>` | OGC WMS layer: `service`, `layerNames`, `sector`, `numLevels`, `time`, ...; with `fromCapabilities` the tiling comes from GetCapabilities |
| `<WmtsLayer>` | OGC WMTS layer from GetCapabilities: `service`, `layer`, `style`, `matrixSet`, `format` |
| `<GeoJsonLayer>` | GeoJSON from a URL, string or object, styled per feature (`style` object or resolver), in its own layer |
| `<KmlLayer>` | KML or KMZ from a URL, in its own layer |
| `<RenderableLayer>` | Holds shapes. Provides the layer to its children. |
| `<CustomLayer create>` | Any WorldWind layer via a factory. |
| `<Placemark>` | Pushpin (`pushpin="blue"`), image or label at a position; `highlight`, `drawLeaderLine`, `altitudeMode`, ... |
| `<Path>`, `<Polygon>` | 3D lines and polygons; `stroke`, `fill`, `strokeWidth`, `extrude`, `followTerrain`, `pathType`. |
| `<SurfacePolyline>`, `<SurfacePolygon>`, `<SurfaceCircle>` | Shapes draped on the terrain. |
| `<GeographicText>` | A label at a position. |
| `<Camera>` | Declarative camera: `latitude`, `longitude`, `range`, `heading`, `tilt`, `animate`. |
| `<Panel>` | A floating card in a corner (`position`, `heading`). |
| `<LayerSwitcher>` | Checkbox and opacity slider per layer. |
| `<NavigationControls>` | Zoom, north, tilt, home. |
| `<GoToBox>` | `lat, lon` or place-name search (Nominatim). |
| `<CoordinatesReadout>` | Position under the mouse and camera range. |
| `<MeasureTool>` | Click-to-measure distances and areas. |
| `<ProjectionSwitcher>` | Buttons for the 3D globe and the flat projections. |

\* Bing layers need `bingMapsKey` on `<Globe>`.

Every shape accepts `onClick`, `onDoubleClick`, `onMouseEnter`, `onMouseLeave` and
`highlightOnHover`. Shapes share one gesture recognizer per globe, so hundreds of handlers cost
nothing extra. Shape props are compared structurally, so inline objects do not cause churn.

## Hooks

| Hook | Returns |
| --- | --- |
| `useGlobe()` | The `GlobeController` (throws outside `<Globe>`); `useGlobeOptional()` returns null instead |
| `useWorldWind()` | The raw WorldWind namespace |
| `useCamera()` | `{ state, set, goTo, zoomIn, zoomOut, rotateBy, tiltBy, resetNorth, ... }`; `useCameraState()` for the state alone |
| `useLayers()` | Layer snapshot, bottom to top |
| `useLayer(create, deps, options)` | Adds any layer for the component's lifetime; `create` may return a promise |
| `useGlobeEvent(type, handler)` | Globe-wide pick events |
| `useHoverPick()` | The latest hover pick |
| `useProjection()` | The current projection |
| `useMeasureTool(options)` | `{ state, start, stop, toggle, undo, clear, tool }` for a click-to-measure tool |
| `useRenderable(create, update, options)`, `useShapeEvents(object, props)` | Building blocks for your own shape components |

Everything from `worldwind-kit` is re-exported, so one import covers both.

## Bundling with Vite 8

Add the kit's plugin, otherwise WorldWind's bundle breaks after `vite build`
(`utils.inherits is not a function`):

```ts
// vite.config.ts
import { worldwindVitePlugin } from 'worldwind-kit/vite';
export default defineConfig({ plugins: [react(), worldwindVitePlugin()] });
```

Or skip bundling WorldWind and load it from a CDN: `<Globe loadOptions={{ loader: scriptLoader() }}>`.

## Testing

Use the fake WorldWind from the kit; no WebGL needed:

```tsx
import { render, screen } from '@testing-library/react';
import { installFakeWorldWind } from 'worldwind-kit/testing';

const fake = installFakeWorldWind();
render(<Globe><Placemark position={{ latitude: 1, longitude: 2 }} /></Globe>);
await screen.findByText(/.../);
fake.windows[0].simulateFrame();
```

## Requirements

React 18 or 19, `@nasaworldwind/worldwind` 0.9 or newer. Server rendering is safe: WorldWind is
loaded in an effect, and the library is marked `'use client'`.

MIT licensed. Not affiliated with NASA.
