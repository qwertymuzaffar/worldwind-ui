# React

`react-worldwind` wraps the kit in components and hooks. Everything renders inside `<Globe>`, which creates the globe on mount, exposes it through context and destroys it on unmount.

## Globe

```tsx
<Globe
  style={{ height: '100vh' }}
  layers={['blue-marble-landsat', 'atmosphere', 'star-field']}   // creation only
  view={{ latitude: 20, longitude: 10, range: 1.6e7 }}           // creation only
  projection="3d"                                                // reactive
  onClick={(event) => console.log(event.position, event.top)}
  fallback={<span>Loading…</span>}
>
  …
</Globe>
```

Creation props (`layers`, `view`, `elevation`, `assetBaseUrl`, `bingMapsKey`, `pixelScale`, `deepPicking`, `logLevel`, `keyboard`) apply once. `projection` and the event handlers are reactive. `onReady` gives you the `GlobeController`; `onError` reports a failed WorldWind load.

## Layers

| Component | Purpose |
| --- | --- |
| `<Layer kind>` | A built-in layer: `blue-marble`, `blue-marble-landsat`, `osm`, `bing-aerial`, `atmosphere`, `star-field`, `compass`, `coordinates`, `view-controls`, … |
| `<WmsLayer>` | OGC WMS by hand, or with `fromCapabilities` from the service's GetCapabilities |
| `<WmtsLayer>` | OGC WMTS from GetCapabilities |
| `<GeoJsonLayer>` | GeoJSON from a URL, string or object, styled per feature |
| `<KmlLayer>` | KML or KMZ from a URL |
| `<RenderableLayer>` | Holds shapes |
| `<CustomLayer create>` | Any WorldWind layer |

`enabled`, `opacity`, `pickEnabled` and `displayName` are reactive on every layer; `index` places a layer in the stack on creation.

```tsx
<GeoJsonLayer
  source="/airports.geojson"
  style={({ properties, geometryType }) =>
    geometryType === 'Point'
      ? { point: { pushpin: properties.busy ? 'orange' : 'white', labelProperty: 'name' } }
      : { polygon: { fill: 'rgba(251, 191, 36, 0.15)', stroke: '#fbbf24' } }
  }
/>
```

## Shapes

Inside a `<RenderableLayer>`: `<Placemark>`, `<Path>`, `<Polygon>`, `<SurfacePolyline>`, `<SurfacePolygon>`, `<SurfaceCircle>` and `<GeographicText>`. Props are plain data (positions, CSS colours, altitude modes) and are compared structurally, so inline objects do not cause churn. Every shape accepts `onClick`, `onDoubleClick`, `onMouseEnter`, `onMouseLeave` and `highlightOnHover`; all shapes on a globe share one gesture recognizer.

```tsx
<RenderableLayer name="Cities">
  <Placemark position={{ latitude: 40.7128, longitude: -74.006 }} label="New York" pushpin="red" highlight={{ imageScale: 1.4 }} highlightOnHover onClick={select} />
  <Path positions={route} stroke="#38bdf8" strokeWidth={3} />
</RenderableLayer>
```

## Camera

`<Camera latitude longitude range heading tilt animate>` moves the globe whenever its props change. `useCamera()` returns the state plus `goTo`, `zoomIn`, `zoomOut`, `rotateBy`, `tiltBy` and `resetNorth`.

## Clustering

`<ClusterLayer items={points} name="Stations" radius={56} />` draws thousands of points as count markers that split as you zoom in. Items are anything with `latitude` and `longitude` (or pass `getPosition`); `renderItem` and `renderCluster` replace the default markers, and `onClusterClick` / `onItemClick` receive the pick. Clicking a cluster flies closer unless `zoomOnClick` is false.

## Widgets

`<LayerSwitcher>`, `<NavigationControls>`, `<GoToBox>`, `<CoordinatesReadout>`, `<MeasureTool>`, `<DrawTool>`, `<ProjectionSwitcher>`, `<ScaleBar>`, `<Compass>`, `<Attribution>`, `<Legend>` and `<TimeSlider>` each take a `position` and render into a `<Panel>`. They need `react-worldwind/styles.css`, and can be themed through the `--wwui-*` custom properties.

## Popups

`<Popup>` anchors ordinary React content to a geographic position and follows the globe as it moves, hiding when the point goes behind the globe. Combine it with a click or hover pick:

```tsx
const [popup, setPopup] = useState<PickEvent | null>(null);

<Globe onClick={(event) => setPopup(event.top ? event : null)}>
  {popup?.top?.position && (
    <Popup position={popup.top.position} title={String(popup.top.object.userProperties?.name)} onClose={() => setPopup(null)}>
      {formatLatLon(popup.top.position)}
    </Popup>
  )}
</Globe>
```

`anchor` (`bottom`, `top`, `left`, `right`, `center`) chooses the side, `offset` nudges in pixels. For a tooltip, drive the position from `useHoverPick()` instead.

## Hooks

`useGlobe`, `useWorldWind`, `useCamera`, `useCameraState`, `useLayers`, `useLayer`, `useGlobeEvent`, `useHoverPick`, `useProjection`, `useMeasureTool`, `useRenderable` and `useShapeEvents`. See the [API reference](/api/react-worldwind/).
