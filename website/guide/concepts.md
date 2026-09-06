# Concepts

Five ideas explain how the libraries fit together.

## One globe, one controller

`GlobeController` owns a WorldWind `WorldWindow`. It creates the canvas inside your host element, exposes `layers`, `camera` and picking, and its `destroy()` does what WorldWind cannot: cancels the animation frame loop, neuters the window-level pointer listeners WorldWind installs and never removes, drops the layers, releases the WebGL context and removes the canvas. `<Globe>` (React) and `<ww-globe>` (Angular) create one controller on mount and destroy it on unmount; everything rendered inside them reaches the controller through context or dependency injection.

WorldWind is loaded lazily with `import()` from the first globe, so importing the libraries during server rendering is safe.

## Layers are a stack

`globe.layers` wraps WorldWind's layer list: bottom to top, with `add`, `remove`, `move`, `update`, `toggle` and `setOpacity`. Every change requests a redraw and notifies subscribers with a fresh snapshot, which is what the layer switcher and the `useLayers()` hook consume. Layer components add themselves on mount and remove themselves on unmount; their `enabled`, `opacity` and `displayName` inputs are reactive, and `index` chooses the stack position on creation.

Built-in layers come from short names (`'blue-marble-landsat'`, `'osm'`, `'atmosphere'`, …). WMS and WMTS layers can be configured from a GetCapabilities document. GeoJSON and KML load into a renderable layer of their own. Layers created by tools, such as the measuring tool, are marked internal and hidden from switchers.

## Shapes are plain data

`createPlacemark`, `createPath`, `createPolygon` and the surface-shape factories turn plain objects (positions, CSS colours, altitude modes, highlight styles) into WorldWind renderables, and each has an `update*` counterpart that mutates the existing renderable. The React and Angular shape components create the renderable once, add it to the enclosing renderable layer, and apply prop changes in place, comparing structurally so inline objects don't cause churn.

## Picking, and why recognizers are shared

A pick asks WorldWind what lies under a screen point: the terrain position plus any shapes. Clicks and taps go through WorldWind's gesture recognizers so drags are ignored; hover picks are throttled to one per frame.

WorldWind lets only the earliest-registered recognizer claim a gesture, so two independent click recognizers on a window never both fire. `GlobeController.on()` therefore keeps one recognizer set per event type and fans events out to every subscriber. On top of that, `ShapeEventRegistry` routes picks to per-shape handlers, so a hundred placemarks with `onClick` still share one recognizer.

## Screen positions

`globe.toScreen(position)` projects a geographic position to canvas pixels using the last rendered frame, and reports whether the point is inside the viewport and in front of the globe. `globe.trackPosition()` re-projects after every frame in which the point moved; the popup components are a thin layer over it.

## Assets and bundling

WorldWind loads its images (pushpins, compass, Blue Marble) relative to its own script location, which bundlers break. The kit points WorldWind at a CDN copy matching the installed version, and `assetBaseUrl` lets you self-host. WorldWind's bundle also contains `eval`-wrapped modules that rolldown (Vite 8) mishandles; [Bundling WorldWind](./bundling) covers the plugin that fixes it.
