# Widgets

Every widget renders into a floating panel in one corner of the globe (`position`: `top-left`, `top-right`, `bottom-left`, `bottom-right`) and needs the shared stylesheet. React names are shown; the Angular selectors are `ww-layer-switcher`, `ww-navigation-controls`, `ww-goto-box`, `ww-coordinates`, `ww-measure-tool` and `ww-projection-switcher`, with the same inputs.

<div class="wwui-gallery">
  <figure><img src="/widgets/layer-switcher.png" alt="Layer switcher" width="216" /><figcaption>LayerSwitcher</figcaption></figure>
  <figure><img src="/widgets/navigation-controls.png" alt="Navigation controls" width="48" /><figcaption>NavigationControls</figcaption></figure>
  <figure><img src="/widgets/goto-box.png" alt="Go-to box" width="246" /><figcaption>GoToBox</figcaption></figure>
  <figure><img src="/widgets/coordinates-readout.png" alt="Coordinates readout" width="413" /><figcaption>CoordinatesReadout</figcaption></figure>
  <figure><img src="/widgets/measure-tool.png" alt="Measure tool" width="220" /><figcaption>MeasureTool</figcaption></figure>
  <figure><img src="/widgets/projection-switcher.png" alt="Projection switcher" width="498" /><figcaption>ProjectionSwitcher</figcaption></figure>
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

## ProjectionSwitcher

Buttons for the 3D globe and the flat projections (equirectangular, Mercator, north and south polar). `projections` limits the choice, `labels` renames buttons.
