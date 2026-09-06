# Widgets

Every widget renders into a floating panel at an edge of the globe (`position`: `top-left`, `top-right`, `bottom-left`, `bottom-right`, `top-center`, `bottom-center`) and needs the shared stylesheet. React names are shown; the Angular selectors are `ww-layer-switcher`, `ww-navigation-controls`, `ww-goto-box`, `ww-coordinates`, `ww-measure-tool`, `ww-projection-switcher`, `ww-scale-bar`, `ww-compass`, `ww-attribution`, `ww-legend` and `ww-time-slider`, with the same inputs.

<div class="wwui-gallery">
  <figure><img src="/widgets/layer-switcher.png" alt="Layer switcher" width="216" /><figcaption>LayerSwitcher</figcaption></figure>
  <figure><img src="/widgets/navigation-controls.png" alt="Navigation controls" width="48" /><figcaption>NavigationControls</figcaption></figure>
  <figure><img src="/widgets/goto-box.png" alt="Go-to box" width="246" /><figcaption>GoToBox</figcaption></figure>
  <figure><img src="/widgets/coordinates-readout.png" alt="Coordinates readout" width="413" /><figcaption>CoordinatesReadout</figcaption></figure>
  <figure><img src="/widgets/measure-tool.png" alt="Measure tool" width="220" /><figcaption>MeasureTool</figcaption></figure>
  <figure><img src="/widgets/projection-switcher.png" alt="Projection switcher" width="498" /><figcaption>ProjectionSwitcher</figcaption></figure>
  <figure><img src="/widgets/popup.png" alt="Popup anchored to a pin" width="240" /><figcaption>Popup</figcaption></figure>
  <figure><img src="/widgets/scale-bar.png" alt="Scale bar" width="140" /><figcaption>ScaleBar</figcaption></figure>
  <figure><img src="/widgets/compass.png" alt="Compass" width="66" /><figcaption>Compass</figcaption></figure>
  <figure><img src="/widgets/attribution.png" alt="Attribution strip" width="330" /><figcaption>Attribution</figcaption></figure>
  <figure><img src="/widgets/legend.png" alt="Legend" width="180" /><figcaption>Legend</figcaption></figure>
  <figure><img src="/widgets/time-slider.png" alt="Time slider" width="330" /><figcaption>TimeSlider</figcaption></figure>
</div>

## LayerSwitcher

A checkbox and an opacity slider per layer, top-most layer first. Screen-space layers (compass, coordinates, view controls) and tool-owned layers are hidden by default.

| Prop | Default | Purpose |
| --- | --- | --- |
| `heading` | `'Layers'` | Panel heading; `null` hides it |
| `showOpacity` | `true` | Opacity slider per layer |
| `hideOverlays` | `true` | Hide screen-space and tool-owned layers |
| `topFirst` | `true` | List order |
| `filter` | | `(layer) => boolean` |

## NavigationControls

Zoom in and out, reset to north, tilt up and down, and a home button.

| Prop | Default | Purpose |
| --- | --- | --- |
| `zoomFactor` | `2` | Range multiplier per step |
| `tiltStep` | `15` | Degrees per tilt step |
| `showTilt` | `true` | Tilt buttons |
| `home` | whole globe | `CameraTarget`, or `false` to hide |
| `animate` | `1500` | Home flight in ms |
| `orientation` | `'vertical'` | Or `'horizontal'` |

## GoToBox

Type `lat, lon` (`40.7, -74`, `40.7N 74W`) or a place name. Coordinates fly immediately; names are geocoded with a Nominatim-compatible service and multiple matches are listed.

| Prop | Default | Purpose |
| --- | --- | --- |
| `duration` | `2000` | Flight in ms |
| `defaultRange` | `200 000` | Metres, when a result has no bounding box |
| `geocoding` | public Nominatim | `GeocodeOptions` (`endpoint`, `limit`, `language`, `fetch`), or `false` for coordinates only |
| `onNavigate` | | `(target, result?) => void` |

The public OpenStreetMap Nominatim is for light use only; point `endpoint` at your own for anything heavier.

## CoordinatesReadout

Latitude, longitude and terrain altitude under the mouse, plus the camera range. Turns hover picking on while mounted.

| Prop | Default | Purpose |
| --- | --- | --- |
| `format` | `'decimal'` | Or `'dms'` |
| `precision` | `4` / `1` | Decimals, or seconds precision for `dms` |
| `showAltitude`, `showRange` | `true` | Fields |

## MeasureTool

Press Measure, click the globe to add points: the line and vertex markers live in the tool's own layer, the readout shows the path length and, from three points, the polygon area. Undo and Clear do what they say.

| Prop | Default | Purpose |
| --- | --- | --- |
| `pathType` | `'greatCircle'` | Or `'rhumbLine'`, `'linear'` |
| `followTerrain` | `true` | Measure along the terrain |
| `line` | cyan, 2 px | `ShapeStyle` for the line |

The hook `useMeasureTool()` (React) or the `MeasureTool` class (kit) gives you the same state without the panel.

## Popup

Not a panel but an overlay anchored to a geographic position: it follows the globe every frame and hides while the point is behind the globe or off screen. Content is ordinary markup; `title` (React) or `heading` (Angular) adds a bold first line and `onClose` / `closable` a close button. The demos open one when you click a city pin or an airport.

| Prop | Default | Purpose |
| --- | --- | --- |
| `position` | | `{ latitude, longitude, altitude? }` |
| `anchor` | `'bottom'` | Side of the point the popup sits on (`bottom` means above the point) |
| `offset` | | `{ x, y }` in pixels |
| `hideWhenHidden` | `true` | Hide when behind the globe or outside the viewport |

The kit exposes the same machinery as `globe.toScreen(position)` and `globe.trackPosition(position, listener)`.

## ProjectionSwitcher

Buttons for the 3D globe and the flat projections (equirectangular, Mercator, north and south polar). `projections` limits the choice, `labels` renames buttons.

## ScaleBar

A bar showing a round ground distance (1, 2 or 5 times a power of ten) at the current zoom. The resolution comes from WorldWind's own pixel size at the look-at point, so tilt, projection and device pixel ratio are all accounted for.

| Prop | Default | Purpose |
| --- | --- | --- |
| `maxWidth` | `120` | Longest bar in pixels |
| `units` | `'metric'` | Or `'imperial'` (ft, mi), `'nautical'` (m, nmi) |

The kit exposes the same numbers as `globe.trackScale(listener, options)`, `scaleBar(wwd)` and `computeScaleBar(metersPerPixel, options)`; React also has `useScaleBar()`.

## Compass

A rose that turns with the camera heading. Clicking it resets the heading to north (`resetOnClick`, default true); `onClick` (React) or `(compassClick)` (Angular) receives the heading that was showing. `size` sets the diameter in pixels (56).

## Attribution

A slim strip crediting the data behind the visible layers. Credits come from three places: defaults for WorldWind's built-in layers (NASA imagery, OpenStreetMap, Bing Maps), the `<Attribution>` element of a WMS capabilities document, and the `attribution` option any layer can set (`'Data: ACME'` or `{ text, url }`; `null` suppresses a default). Renders nothing when there is nothing to credit.

| Prop | Default | Purpose |
| --- | --- | --- |
| `position` | `'bottom-center'` | Any panel position |
| `extra` | | Credits shown after the layers' own |
| `includeDisabled` | `false` | Credit layers that are switched off too |
| `separator` | `' · '` | Text between credits |

Kit: `layerAttribution(layer)`, `collectAttributions(layers)`, `setLayerAttribution(layer, credit)` and `DEFAULT_ATTRIBUTIONS`; React: `useAttributions()`.

## Legend

Legend images of the visible layers, top-most first. Layers built from capabilities carry the `LegendURL` of their WMS style or WMTS style; any other layer can set `legend` to an image URL or `{ url, width, height }`. Renders nothing when no visible layer has one.

| Prop | Default | Purpose |
| --- | --- | --- |
| `heading` | `'Legend'` | Panel heading; `null` hides it |
| `showNames` | `true` | Layer name above each image |
| `includeDisabled` | `false` | Include layers that are switched off |

Kit: `layerLegend(layer)`, `collectLegends(layers)`, `setLayerLegend(layer, legend)` and `wmsLegendGraphicUrl(options)` for servers that answer `GetLegendGraphic`; React: `useLegends()`.

## TimeSlider

A slider with play and pause that steps time-enabled WMS and WMTS layers through their time dimension. Layers built from capabilities know their dimension (`Dimension` / `Extent` with `name="time"`, or a WMTS `Time` dimension); other layers take one through the `timeDimension` option, and the slider itself accepts `start`, `end`, `step` and `values` when the layers declare nothing. By default it drives every layer with a dimension; `layers` narrows that.

| Prop | Default | Purpose |
| --- | --- | --- |
| `start`, `end` | from the layers | `Date` or ISO string |
| `step` | finest declared step, else one day | Milliseconds |
| `values` | | Explicit instants instead of a range |
| `value`, `defaultValue` | the layers' default, else `end` | Controlled or initial instant |
| `onChange` / `(valueChange)` | | Called with the instant |
| `timeFormat` | `'auto'` | How `TIME` is written: `'date'`, `'datetime'`, or a function |
| `playInterval` | `1000` | Milliseconds between steps |
| `loop` | `true` | Start over at the end |
| `showPlay` | `true` | Play and pause button |

WorldWind only reads `TIME` when a layer is constructed, so the kit's `setLayerTime(layer, date)` (also `globe.layers.setTime`) updates the layer's URL builder and expires its imagery: the old tiles stay on screen until the new ones arrive. The demos drive NASA GIBS daily MODIS imagery this way:

```tsx
<WmsLayer
  service="https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
  layerNames="MODIS_Terra_CorrectedReflectance_TrueColor"
  format="image/jpeg"
  timeDimension={{ start: new Date('2024-01-01'), end: new Date('2024-01-31'), stepMs: DAY_MS }}
/>
<TimeSlider position="top-center" />
```

The kit's `parseTimeDimension('2024-01-01/2024-01-31/P1D')`, `timeDimensionFromCapabilities(layerCapabilities)` and `resolveTimeDimension(layers, overrides)` give you the same data without the widget.
