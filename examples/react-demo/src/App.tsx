import { useState } from 'react';
import {
  Camera,
  CoordinatesReadout,
  Globe,
  GoToBox,
  Layer,
  LayerSwitcher,
  NavigationControls,
  Panel,
  Path,
  Placemark,
  RenderableLayer,
  SurfaceCircle,
  formatLatLon,
  type PickEvent,
  type ProjectionKind,
} from 'react-worldwind';

const CITIES = [
  { name: 'New York', latitude: 40.7128, longitude: -74.006, pushpin: 'red' as const },
  { name: 'London', latitude: 51.5074, longitude: -0.1278, pushpin: 'blue' as const },
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, pushpin: 'green' as const },
  { name: 'Sydney', latitude: -33.8688, longitude: 151.2093, pushpin: 'orange' as const },
];

const ROUTE = CITIES.map((city) => ({ latitude: city.latitude, longitude: city.longitude, altitude: 300_000 }));

const PROJECTIONS: ProjectionKind[] = ['3d', 'equirectangular', 'mercator', 'north-polar'];

export function App() {
  const [projection, setProjection] = useState<ProjectionKind>('3d');
  const [selected, setSelected] = useState<(typeof CITIES)[number] | null>(null);
  const [lastClick, setLastClick] = useState<PickEvent | null>(null);
  const target = selected ?? { latitude: 20, longitude: 10 };

  return (
    <Globe
      style={{ height: '100vh' }}
      layers={['blue-marble-landsat', 'atmosphere', 'star-field', 'compass']}
      view={{ latitude: 20, longitude: 10, range: 1.6e7 }}
      projection={projection}
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

      <GoToBox position="top-left" />
      <LayerSwitcher position="bottom-right" />
      <NavigationControls position="top-right" home={{ latitude: 20, longitude: 10, range: 1.6e7, heading: 0, tilt: 0 }} />
      <CoordinatesReadout position="bottom-left" />

      <Panel position="top-right" heading="Projection" style={{ right: 64 }}>
        <div className="wwui-toolbar wwui-toolbar--horizontal" style={{ padding: 0 }}>
          {PROJECTIONS.map((kind) => (
            <button
              key={kind}
              type="button"
              className="wwui-button"
              style={{ width: 'auto', padding: '0 10px', outline: kind === projection ? '2px solid var(--wwui-accent)' : undefined }}
              onClick={() => setProjection(kind)}
            >
              {kind}
            </button>
          ))}
        </div>
        <p className="wwui-goto__status" style={{ marginTop: 8 }}>
          {selected ? `Selected: ${selected.name}` : 'Click a pin to fly there'}
          {lastClick?.position ? ` · last click ${formatLatLon(lastClick.position, { precision: 2 })}` : ''}
        </p>
      </Panel>
    </Globe>
  );
}
