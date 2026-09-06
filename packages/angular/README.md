# ngx-worldwind

Angular standalone components and directives for [NASA WorldWind](https://worldwind.arc.nasa.gov/web/),
built on [`worldwind-kit`](https://www.npmjs.com/package/worldwind-kit). Signal inputs, `OnPush`,
zoneless-ready.

**Live demo:** https://qwertymuzaffar.github.io/worldwind-ui/angular/

```sh
npm install ngx-worldwind @nasaworldwind/worldwind
```

Add the widget styles once, e.g. in `styles.css`:

```css
@import 'ngx-worldwind/styles.css';
```

```ts
import { Component, signal } from '@angular/core';
import { WORLDWIND_COMPONENTS, type PickEvent } from 'ngx-worldwind';

@Component({
  selector: 'app-map',
  imports: [...WORLDWIND_COMPONENTS],
  template: `
    <ww-globe
      [options]="{ layers: ['blue-marble-landsat', 'atmosphere', 'star-field'], view: { latitude: 20, longitude: 10, range: 1.6e7 } }"
      [projection]="projection()"
      style="height: 100vh"
      (globeClick)="lastClick.set($event)"
    >
      <span wwFallback class="wwui-panel wwui-panel--top-left">Loading…</span>
      <ww-layer kind="osm" [enabled]="false" />
      <ww-renderable-layer name="Cities">
        <ww-placemark [position]="{ latitude: 40.7128, longitude: -74.006 }" label="New York" [highlight]="{ imageScale: 1.4 }" [highlightOnHover]="true" (shapeClick)="select($event)" />
        <ww-path [positions]="route" stroke="#38bdf8" [strokeWidth]="3" />
      </ww-renderable-layer>
      <ww-goto-box />
      <ww-layer-switcher position="bottom-right" />
      <ww-navigation-controls />
      <ww-coordinates />
    </ww-globe>
  `,
})
export class MapComponent {
  projection = signal<'3d' | 'mercator'>('3d');
  lastClick = signal<PickEvent | null>(null);
  route = [{ latitude: 40.7, longitude: -74 }, { latitude: 51.5, longitude: -0.1 }];
  select(event: PickEvent) { console.log(event.top?.object); }
}
```

`<ww-globe>` needs a height; the canvas fills it. Everything else goes inside it.

## Components and directives

| Selector | Purpose |
| --- | --- |
| `ww-globe` | Creates the globe. Inputs: `options` (creation), `projection` (reactive), `loadOptions`, `hoverPicking`. Outputs: `ready`, `loadError`, `globeClick`, `globeDoubleClick`, `globeHover`. Signals: `globe`, `cameraState`, `layers`, `hoverPick`. |
| `ww-layer` | Built-in layer by `kind` (`blue-marble-landsat`, `osm`, `bing-aerial`*, `atmosphere`, `star-field`, `compass`, ...). `enabled`, `opacity`, `index`, ... |
| `ww-wms-layer` | OGC WMS: `service`, `layerNames`, `sector`, `numLevels`, `time`, ... |
| `ww-renderable-layer` | Holds shapes. |
| `ww-custom-layer` | Any WorldWind layer via `[factory]`. |
| `ww-placemark` | Pushpin (`pushpin="blue"`), image or label; `highlight`, `drawLeaderLine`, `altitudeMode`, ... |
| `ww-path`, `ww-polygon` | 3D lines and polygons; `stroke`, `fill`, `strokeWidth`, `extrude`, `followTerrain`. |
| `ww-surface-polyline`, `ww-surface-polygon`, `ww-surface-circle` | Shapes draped on the terrain. |
| `ww-geographic-text` | A label at a position. |
| `ww-camera` | Declarative camera: `latitude`, `longitude`, `range`, `heading`, `tilt`, `animate`. |
| `ww-panel` | A floating corner card (`position`, `heading`). |
| `ww-layer-switcher`, `ww-navigation-controls`, `ww-goto-box`, `ww-coordinates` | Ready-made widgets. |

\* Bing layers need `bingMapsKey` in `options`.

Every shape has `shapeClick`, `shapeDoubleClick`, `mouseEnter`, `mouseLeave` outputs and a
`highlightOnHover` input. Set `hoverEvents` to receive the mouse outputs, since hover picking
costs GPU time and is off unless something asks for it.

## Helpers

`injectGlobe()`, `injectCameraState()`, `injectLayers()` and `injectHoverPick()` return signals
for components rendered inside `<ww-globe>`. Everything from `worldwind-kit` is re-exported.

## Bundling

The Angular CLI's esbuild builder bundles WorldWind correctly. If you build with Vite 8 (for
example through Analog), add `worldwindVitePlugin()` from `worldwind-kit/vite`, or load
WorldWind from a CDN with `[loadOptions]="{ loader: scriptLoader() }"`.

## Demo

`examples/angular-demo` in the repository is a zoneless Angular CLI app using every component above.
Run it with `npm run dev -w angular-demo` from the repository root.

## Testing

The components run under Vitest with Angular's `TestBed` (JIT through Analog's Vite plugin) and
the kit's fake WorldWind, so no WebGL or browser is needed:

```ts
import { TestBed } from '@angular/core/testing';
import { installFakeWorldWind } from 'worldwind-kit/testing';

const fake = installFakeWorldWind();
const fixture = TestBed.createComponent(HostWithGlobe);
fixture.autoDetectChanges();
await fixture.whenStable();
fake.windows[0].simulateFrame();   // runs camera subscribers
fake.recognizers[0].simulate(1, 1); // fires click handlers
```

See `packages/angular/test` in the repository for the setup file and examples.

## Requirements

Angular 22, `@nasaworldwind/worldwind` 0.9 or newer. The library is compiled in partial Ivy mode.
Server rendering is safe: the globe is created in `afterNextRender`.

MIT licensed. Not affiliated with NASA.
