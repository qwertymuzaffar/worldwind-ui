# react-worldwind

## 0.5.0

### Minor Changes

- dc202ed: A drawing tool (`DrawTool`, `<DrawTool>`, `ww-draw-tool`): draw points, lines and polygons, select them, drag their vertices, delete, and round-trip GeoJSON. A clustering layer (`ClusterLayer`, `<ClusterLayer>`, `ww-cluster-layer`) that shows thousands of points as count markers which split on zoom. Fullscreen and screenshot buttons on the navigation controls, backed by `toggleFullscreen`, `captureScreenshot` and `downloadScreenshot` in the kit.
  
  Changing a WMS or WMTS layer's TIME now gives the layer a tile set per instant, so stepping back to an instant already fetched is immediate. The go-to box placeholder no longer clips.

### Patch Changes

- Updated dependencies [dc202ed]
  - worldwind-kit@0.5.0

## 0.4.0

### Minor Changes

- f3156bb: Five new widgets: ScaleBar, Compass, Attribution, Legend and TimeSlider (`ww-scale-bar`, `ww-compass`, `ww-attribution`, `ww-legend`, `ww-time-slider` in Angular), plus `top-center` and `bottom-center` panel positions.
  
  Layers gained `attribution`, `legend` and `timeDimension` options; layers created from WMS/WMTS capabilities fill them in from the document. The kit adds `setLayerTime` / `LayerManager.setTime` (change a WMS or WMTS layer's TIME after creation), `globe.trackScale`, `computeScaleBar`, `collectAttributions`, `collectLegends`, `parseTimeDimension`, `resolveTimeDimension` and friends. React adds `useScaleBar`, `useAttributions` and `useLegends`.

### Patch Changes

- Updated dependencies [f3156bb]
  - worldwind-kit@0.4.0

## 0.3.0

### Minor Changes

- f91bb5a: Keyboard navigation on the globe, on by default: the canvas is focusable and announced as an application; arrow keys pan relative to the heading, `+` and `-` zoom, Shift with the arrows rotates and tilts, PageUp/PageDown tilt, Home resets the orientation. Configure or disable it with the `keyboard` globe option; `handleNavigationKey` is exported for custom bindings.
- d5ec877: Add popups anchored to geographic positions: `globe.toScreen(position)` and `globe.trackPosition(position, listener)` in the kit, `<Popup>` in React and `<ww-popup>` in Angular, following the globe every frame and hiding when the point is behind it.

### Patch Changes

- Updated dependencies [f91bb5a]
- Updated dependencies [d5ec877]
  - worldwind-kit@0.3.0

## 0.2.1

### Patch Changes

- 7542bf7: The shared widget stylesheet now keeps panels inside the viewport on small screens, wraps the coordinates readout and lets a long layer switcher scroll. Doc comments gained categories and examples, which show up in editor tooltips.
- Updated dependencies [7542bf7]
  - worldwind-kit@0.2.1

## 0.2.0

### Minor Changes

- 83befdd: Add WMTS layers and WMS layers configured from GetCapabilities, GeoJSON and KML layers with per-feature styling, a click-to-measure tool for distances and areas, a projection switcher widget, projection change events, and asynchronous layer factories in `useLayer` and the Angular layer base class. `react-worldwind` exports `WmtsLayer`, `GeoJsonLayer`, `KmlLayer`, `MeasureTool`, `ProjectionSwitcher`, `useMeasureTool` and `useProjection`; `ngx-worldwind` adds `ww-wmts-layer`, `ww-geojson-layer`, `ww-kml-layer`, `ww-measure-tool`, `ww-projection-switcher` and `injectProjection`. The Angular inputs are named `styleName` and `featureStyle` because `style` is the DOM attribute.
  
  Fixed: a second click or double-click subscription on the same globe (for example a shape `onClick` next to the globe's `onClick`, or the new measurement tool) never fired in a real browser, because WorldWind lets only the earliest recognizer claim a gesture. `GlobeController.on` now shares one recognizer set per event type through a `PickDispatcher`, and the testing fake models WorldWind's arbitration (`window.click()`), so the case is covered by unit tests as well as the browser suite.

### Patch Changes

- Updated dependencies [83befdd]
  - worldwind-kit@0.2.0

## 0.1.2

### Patch Changes

- ef5abca: Link the package pages to the live demos at https://qwertymuzaffar.github.io/worldwind-ui/.
- Updated dependencies [ef5abca]
  - worldwind-kit@0.1.2

## 0.1.1

### Patch Changes

- 7cd8d56: Document the Vite plugin and CDN script loader for bundling WorldWind, the React and Angular demo apps, and the test setup. No runtime changes.
- Updated dependencies [7cd8d56]
  - worldwind-kit@0.1.1
