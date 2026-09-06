# Angular

`ngx-worldwind` provides standalone components with signal inputs, `OnPush` change detection and no dependency on zone.js. Import them individually or all at once with `WORLDWIND_COMPONENTS`.

```ts
@Component({
  selector: 'app-map',
  imports: [...WORLDWIND_COMPONENTS],
  template: `
    <ww-globe [options]="options" [projection]="projection()" style="height: 100vh" (globeClick)="onClick($event)">
      <span wwFallback>Loading…</span>
      <ww-layer kind="osm" [enabled]="false" />
      <ww-renderable-layer name="Cities">
        <ww-placemark [position]="{ latitude: 40.7128, longitude: -74.006 }" label="New York" (shapeClick)="select($event)" />
      </ww-renderable-layer>
      <ww-layer-switcher />
      <ww-navigation-controls />
    </ww-globe>
  `,
})
export class MapComponent {
  options: GlobeOptions = { layers: ['blue-marble-landsat', 'atmosphere'] };
  projection = signal<ProjectionKind>('3d');
}
```

Add `@import 'ngx-worldwind/styles.css';` to your global styles.

## Components

| Selector | Purpose |
| --- | --- |
| `ww-globe` | Creates the globe. `options` (creation), `projection` (reactive), `hoverPicking`; outputs `ready`, `loadError`, `globeClick`, `globeDoubleClick`, `globeHover`; signals `globe`, `cameraState`, `layers`, `projectionState`, `hoverPick` |
| `ww-layer` | Built-in layer by `kind` |
| `ww-wms-layer` | OGC WMS by hand, or with `[fromCapabilities]="true"` |
| `ww-wmts-layer` | OGC WMTS from GetCapabilities (`styleName`, `matrixSet`, `format`) |
| `ww-geojson-layer` | GeoJSON styled per feature through `featureStyle` |
| `ww-kml-layer` | KML or KMZ |
| `ww-renderable-layer`, `ww-custom-layer` | Shape container, escape hatch |
| `ww-placemark`, `ww-path`, `ww-polygon`, `ww-surface-polyline`, `ww-surface-polygon`, `ww-surface-circle`, `ww-geographic-text` | Shapes with `shapeClick`, `shapeDoubleClick`, `mouseEnter`, `mouseLeave` outputs and `highlightOnHover` |
| `ww-camera` | Declarative camera |
| `ww-panel`, `ww-layer-switcher`, `ww-navigation-controls`, `ww-goto-box`, `ww-coordinates`, `ww-measure-tool`, `ww-projection-switcher` | Widgets |

Layer components accept asynchronous factories and emit `loadError`. Hover outputs on shapes need `[hoverEvents]="true"`, because picking on every frame costs GPU time.

## Injecting state

Inside `<ww-globe>`, `injectGlobe()`, `injectCameraState()`, `injectLayers()`, `injectProjection()` and `injectHoverPick()` return signals you can use in your own components.

## Two naming notes

- `styleName` and `featureStyle` are not called `style`: a static `style` attribute is consumed by the DOM before it can reach a component input.
- Shapes go inside `ww-renderable-layer`; the layer is injected, so nesting is required.

See the [API reference](/api/ngx-worldwind/).
