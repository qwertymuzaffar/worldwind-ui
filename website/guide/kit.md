# The kit

`worldwind-kit` is the framework-agnostic core the adapters are built on. Use it directly with vanilla JavaScript, Vue, Svelte, or to write your own components.

```ts
import { GlobeController, createPlacemark, pushpinUrl, MeasureTool } from 'worldwind-kit';

const globe = await GlobeController.create(host, { layers: ['blue-marble-landsat', 'atmosphere'] });

const pins = globe.addRenderableLayer('Pins');
pins.addRenderable(createPlacemark(globe.worldWind, {
  position: { latitude: 48.8584, longitude: 2.2945 },
  label: 'Eiffel Tower',
  imageSource: pushpinUrl(globe.worldWind, 'red'),
}));

globe.on('click', (event) => console.log(event.position, event.top?.object));
await globe.camera.goTo({ latitude: 51.5, longitude: -0.12, range: 1e6 }, { duration: 2000 });

const measure = new MeasureTool(globe);
measure.subscribe((state) => console.log(state.lengthMeters, state.areaSquareMeters));
measure.start();

globe.destroy();
```

## Vue

The kit has no framework dependency, so a Vue component is a `ref` on the host element and one effect:

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { GlobeController } from 'worldwind-kit';

const host = ref<HTMLElement | null>(null);
let globe: GlobeController | null = null;

onMounted(async () => {
  globe = await GlobeController.create(host.value!, { layers: ['blue-marble-landsat', 'atmosphere'] });
  globe.on('click', (event) => console.log(event.position));
});
onBeforeUnmount(() => globe?.destroy());
</script>

<template>
  <div ref="host" style="height: 480px"></div>
</template>
```

## Vanilla JavaScript

```html
<div id="map" style="height: 480px"></div>
<script type="module">
  import { GlobeController } from 'https://esm.sh/worldwind-kit';

  const globe = await GlobeController.create(document.getElementById('map'), {
    layers: ['blue-marble-landsat', 'atmosphere', 'compass'],
  });
</script>
```

(`esm.sh` resolves the WorldWind peer dependency for you; with a bundler, install `@nasaworldwind/worldwind` alongside the kit.)

## What is inside

- **`GlobeController`**: creates a `WorldWindow` on a host element and owns `layers`, `camera` and picking. `destroy()` stops the render loop, neuters the window-level listeners WorldWind never removes, drops the layers and releases the WebGL context.
- **`LayerManager`**: `add`, `remove`, `move`, `update`, `toggle`, `setOpacity`, with stable snapshots (`all`) and `subscribe`.
- **Layer factories**: `createBuiltInLayer`, `createWmsLayer`, `createWmsLayerFromCapabilities`, `createWmtsLayerFromCapabilities`.
- **Data**: `loadGeoJson` with per-feature styling and `loadKml`.
- **`CameraController`**: `get`, `set`, animated `goTo`, zoom, rotate, tilt, `subscribe`, and `snapshot()` for external stores.
- **Picking**: `pickAt` and `PickDispatcher`. WorldWind lets only one gesture recognizer claim a click, so the dispatcher shares one recognizer set per event type across every subscriber.
- **Shapes**: `createPlacemark`, `createPath`, `createPolygon`, `createSurfacePolyline`, `createSurfacePolygon`, `createSurfaceCircle`, `createGeographicText`, each with an `update*` counterpart that changes the shape in place.
- **Tools**: `MeasureTool`, `ShapeEventRegistry`, `geocode`, `parseLatLon`, `rangeForBoundingBox`.
- **Widget data**: `trackScaleBar`, `computeScaleBar`, `layerAttribution`, `collectAttributions`, `layerLegend`, `collectLegends`, `parseTimeDimension`, `resolveTimeDimension`, `setLayerTime`.
- **Helpers**: `formatLatLon`, `formatDistance`, `formatArea`, `greatCircleDistanceMeters`, `toColor`, `parseCssColor`.
- **Types**: `WorldWindStatic` and the `WW*` interfaces describe the WorldWind objects the kit uses; everything else stays reachable as `any`.

WorldWind itself is loaded lazily with `import()` from the first globe, so the kit is safe to import during server rendering. Use `scriptLoader()` to load it from a CDN `<script>` instead, or `setWorldWind()` to inject a build.

See the [API reference](/api/worldwind-kit/).
