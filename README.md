# worldwind-ui

[![CI](https://github.com/qwertymuzaffar/worldwind-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/qwertymuzaffar/worldwind-ui/actions/workflows/ci.yml)

UI libraries for [NASA WorldWind](https://worldwind.arc.nasa.gov/web/), the open-source WebGL
virtual globe. One framework-agnostic core, thin idiomatic adapters per framework.

| Package | What it is | Install |
| --- | --- | --- |
| [`worldwind-kit`](packages/kit) | Typed TypeScript toolkit: globe controller with a real `destroy()`, layer manager, camera, picking, shapes, geocoding, and a WebGL-free fake for tests | `npm i worldwind-kit @nasaworldwind/worldwind` |
| [`react-worldwind`](packages/react) | React components and hooks: `<Globe>`, `<Layer>`, `<Placemark>`, `useCamera()`, plus ready-made widgets | `npm i react-worldwind @nasaworldwind/worldwind` |
| [`ngx-worldwind`](packages/angular) | Angular standalone components with signal inputs: `<ww-globe>`, `<ww-layer>`, `<ww-placemark>`, plus the same widgets | `npm i ngx-worldwind @nasaworldwind/worldwind` |

All three share one stylesheet for the widgets (`<package>/styles.css`) and one version number.

## Why

WorldWind's own API is imperative, untyped and has no teardown. These packages add:

- **Lifecycle.** `GlobeController.destroy()` stops the render loop, neuters the window-level
  listeners WorldWind never removes, drops the layers and releases the WebGL context.
- **Types.** A documented `WorldWindStatic` surface for everything the adapters touch, with an
  escape hatch to the rest.
- **Lazy, SSR-safe loading.** WorldWind touches `window` at import time; the kit imports it
  from a client-side effect and points it at a CDN for its image assets, which bundlers break.
- **Declarative shapes.** Placemarks, paths, polygons and surface shapes from plain data,
  updated in place when props change.
- **Shared event routing.** One gesture recognizer per globe, not one per placemark.
- **Testability.** `worldwind-kit/testing` ships a fake WorldWind so component tests run in
  jsdom without WebGL.

## Quick start (React)

```tsx
import 'react-worldwind/styles.css';
import { Globe, Layer, RenderableLayer, Placemark, LayerSwitcher, NavigationControls } from 'react-worldwind';

export function Map() {
  return (
    <Globe style={{ height: 480 }} layers={['blue-marble-landsat', 'atmosphere']} view={{ latitude: 40, longitude: -74, range: 2e6 }}>
      <Layer kind="osm" enabled={false} />
      <RenderableLayer name="Cities">
        <Placemark position={{ latitude: 40.7128, longitude: -74.006 }} label="New York" onClick={(e) => console.log(e)} />
      </RenderableLayer>
      <LayerSwitcher />
      <NavigationControls />
    </Globe>
  );
}
```

## Quick start (Angular)

```ts
import { Component } from '@angular/core';
import { WORLDWIND_COMPONENTS } from 'ngx-worldwind';

@Component({
  selector: 'app-map',
  imports: [...WORLDWIND_COMPONENTS],
  template: `
    <ww-globe [options]="{ layers: ['blue-marble-landsat', 'atmosphere'], view: { latitude: 40, longitude: -74, range: 2e6 } }" style="height: 480px">
      <ww-renderable-layer name="Cities">
        <ww-placemark [position]="{ latitude: 40.7128, longitude: -74.006 }" label="New York" (shapeClick)="onClick($event)" />
      </ww-renderable-layer>
      <ww-layer-switcher />
      <ww-navigation-controls />
    </ww-globe>
  `,
})
export class MapComponent {
  onClick(event: unknown) { console.log(event); }
}
```

Add `@import 'ngx-worldwind/styles.css';` to your global styles.

## Bundling WorldWind

WorldWind's npm bundle wraps an internal copy of jszip in webpack modules that use `eval`.
Vite 8 (rolldown) renames the variables those modules read, and the globe fails at runtime
with `utils.inherits is not a function`. Two fixes, pick one:

```ts
// vite.config.ts - rewrite the eval'd modules so the bundler sees them
import { worldwindVitePlugin } from 'worldwind-kit/vite';
export default defineConfig({ plugins: [react(), worldwindVitePlugin()] });
```

```tsx
// or keep WorldWind out of the bundle and load it from a CDN <script>
import { scriptLoader } from 'worldwind-kit';
<Globe loadOptions={{ loader: scriptLoader() }} />
```

`unevalWebpackModules()` from `worldwind-kit/vite` is the plain string transform, usable from
any other bundler's loader or plugin API. Webpack and the Vite dev server need neither.

## Repository

```
packages/kit       worldwind-kit      (tsup, vitest)
packages/react     react-worldwind    (tsup, vitest + Testing Library)
packages/angular   ngx-worldwind      (ng-packagr, partial Ivy)
examples/react-demo                   (Vite playground)
```

Requires Node 22.22 or newer (Angular 22 and Vitest 5 need it; `.nvmrc` is set).

```sh
npm install
npm run build        # kit -> react -> angular
npm test             # kit + react suites
npm run lint && npm run typecheck
npm run pack:check   # what would be published
npm run dev -w react-demo
```

Releases use [Changesets](.changeset/README.md): `npm run changeset`, then `npm run version-packages`
and `npm run release`, or let the release workflow open the version PR.

## Status

Early (0.1). The public API may still change before 1.0. Not affiliated with NASA; WorldWind
is NASA's Apache-2.0 library and is a peer dependency, not bundled.

## License

MIT
