# worldwind-kit

## 0.2.0

### Minor Changes

- 83befdd: Add WMTS layers and WMS layers configured from GetCapabilities, GeoJSON and KML layers with per-feature styling, a click-to-measure tool for distances and areas, a projection switcher widget, projection change events, and asynchronous layer factories in `useLayer` and the Angular layer base class. `react-worldwind` exports `WmtsLayer`, `GeoJsonLayer`, `KmlLayer`, `MeasureTool`, `ProjectionSwitcher`, `useMeasureTool` and `useProjection`; `ngx-worldwind` adds `ww-wmts-layer`, `ww-geojson-layer`, `ww-kml-layer`, `ww-measure-tool`, `ww-projection-switcher` and `injectProjection`. The Angular inputs are named `styleName` and `featureStyle` because `style` is the DOM attribute.
  
  Fixed: a second click or double-click subscription on the same globe (for example a shape `onClick` next to the globe's `onClick`, or the new measurement tool) never fired in a real browser, because WorldWind lets only the earliest recognizer claim a gesture. `GlobeController.on` now shares one recognizer set per event type through a `PickDispatcher`, and the testing fake models WorldWind's arbitration (`window.click()`), so the case is covered by unit tests as well as the browser suite.

## 0.1.2

### Patch Changes

- ef5abca: Link the package pages to the live demos at https://qwertymuzaffar.github.io/worldwind-ui/.

## 0.1.1

### Patch Changes

- 7cd8d56: Document the Vite plugin and CDN script loader for bundling WorldWind, the React and Angular demo apps, and the test setup. No runtime changes.
