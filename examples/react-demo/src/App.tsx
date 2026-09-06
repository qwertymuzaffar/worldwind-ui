import { useState } from 'react';
import {
  Camera,
  CoordinatesReadout,
  GeoJsonLayer,
  Globe,
  GoToBox,
  Layer,
  LayerSwitcher,
  MeasureTool,
  NavigationControls,
  Panel,
  Path,
  Placemark,
  ProjectionSwitcher,
  RenderableLayer,
  SurfaceCircle,
  formatLatLon,
  type PickEvent,
} from 'react-worldwind';

const CITIES = [
  { name: 'New York', latitude: 40.7128, longitude: -74.006, pushpin: 'red' as const },
  { name: 'London', latitude: 51.5074, longitude: -0.1278, pushpin: 'blue' as const },
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, pushpin: 'green' as const },
  { name: 'Sydney', latitude: -33.8688, longitude: 151.2093, pushpin: 'orange' as const },
];

const ROUTE = CITIES.map((city) => ({ latitude: city.latitude, longitude: city.longitude, altitude: 300_000 }));

/** A few GeoJSON features, styled per feature through the GeoJsonLayer callback. */
const AIRPORTS = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'JFK', busy: true }, geometry: { type: 'Point', coordinates: [-73.7781, 40.6413] } },
    { type: 'Feature', properties: { name: 'LHR', busy: true }, geometry: { type: 'Point', coordinates: [-0.4543, 51.47] } },
    { type: 'Feature', properties: { name: 'HND', busy: false }, geometry: { type: 'Point', coordinates: [139.7798, 35.5494] } },
    {
      type: 'Feature',
      properties: { name: 'North Atlantic tracks' },
      geometry: { type: 'Polygon', coordinates: [[[-60, 40], [-10, 50], [-10, 60], [-60, 55], [-60, 40]]] },
    },
  ],
};

export function App() {
  const [selected, setSelected] = useState<(typeof CITIES)[number] | null>(null);
  const [lastClick, setLastClick] = useState<PickEvent | null>(null);
  const target = selected ?? { latitude: 20, longitude: 10 };

  return (
    <Globe
      style={{ height: '100vh' }}
      layers={['blue-marble-landsat', 'atmosphere', 'star-field', 'compass']}
      view={{ latitude: 20, longitude: 10, range: 1.6e7 }}
      fallback={<div className="wwui-panel wwui-panel--top-left">Loading NASA WorldWind…</div>}
      onClick={setLastClick}
    >
      <Layer kind="osm" enabled={false} />
      <Camera latitude={target.latitude} longitude={target.longitude} range={selected ? 1.5e6 : 1.6e7} animate={2000} />

      <RenderableLayer name="Cities">
        {CITIES.map((city) => (
          <Placemark
            key={city.name}
            position={city}
            label={city.name}
            pushpin={city.pushpin}
            highlight={{ imageScale: 1.4 }}
            highlightOnHover
            onClick={() => setSelected(city)}
          />
        ))}
        <Path positions={ROUTE} stroke="#38bdf8" strokeWidth={3} followTerrain={false} pathType="greatCircle" />
        {selected ? <SurfaceCircle center={selected} radius={150_000} fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" /> : null}
      </RenderableLayer>

      <GeoJsonLayer
        source={AIRPORTS}
        name="Airports"
        style={({ properties, geometryType }) =>
          geometryType === 'Point'
            ? { point: { pushpin: properties.busy ? 'orange' : 'white', labelProperty: 'name', imageScale: 0.8 } }
            : { polygon: { fill: 'rgba(251, 191, 36, 0.15)', stroke: '#fbbf24', strokeWidth: 2 } }
        }
      />

      <GoToBox position="top-left" />
      <MeasureTool position="top-left" className="wwui-panel--below-goto" />
      <LayerSwitcher position="bottom-right" />
      <NavigationControls position="top-right" home={{ latitude: 20, longitude: 10, range: 1.6e7, heading: 0, tilt: 0 }} />
      <CoordinatesReadout position="bottom-left" />
      <ProjectionSwitcher position="top-right" className="wwui-panel--beside-nav" />

      <Panel position="bottom-left" className="wwui-panel--above-coords">
        <p className="wwui-goto__status" style={{ margin: 0 }}>
          {selected ? `Selected: ${selected.name}` : 'Click a pin to fly there'}
          {lastClick?.position ? ` · last click ${formatLatLon(lastClick.position, { precision: 2 })}` : ''}
        </p>
      </Panel>
    </Globe>
  );
}
