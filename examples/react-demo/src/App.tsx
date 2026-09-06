import { useState } from 'react';
import {
  Attribution,
  Camera,
  Compass,
  CoordinatesReadout,
  DAY_MS,
  GeoJsonLayer,
  Globe,
  GoToBox,
  Layer,
  LayerSwitcher,
  Legend,
  MeasureTool,
  NavigationControls,
  Panel,
  Path,
  Placemark,
  Popup,
  ProjectionSwitcher,
  RenderableLayer,
  ScaleBar,
  SurfaceCircle,
  TimeSlider,
  WmsLayer,
  formatLatLon,
  type GlobeController,
  type LatLonAlt,
  type PickEvent,
  type TimeDimension,
} from 'react-worldwind';

declare global {
  interface Window {
    /** Exposed for the browser tests and for poking around in devtools. */
    worldwindDemo?: { globe: GlobeController };
  }
}

interface PopupState {
  position: LatLonAlt;
  title: string;
  lines: string[];
}

/** Turns whatever was clicked (a city, an airport feature) into popup content. */
function describePick(event: PickEvent): PopupState | null {
  const data = (event.top?.object as { userProperties?: unknown } | undefined)?.userProperties as Record<string, unknown> | undefined;
  const position = event.top?.position ?? event.position;
  if (!data || !position || typeof data.name !== 'string') return null;
  const lines = [formatLatLon(position, { precision: 3 })];
  if ('busy' in data) lines.push(data.busy ? 'Busy airport' : 'Quiet airport');
  return { position, title: data.name, lines };
}

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

/** Legend for the airports layer: an inline SVG, so any image URL works. */
const AIRPORT_LEGEND = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="54" font-family="sans-serif" font-size="11" fill="#f1f5f9">` +
    `<circle cx="8" cy="10" r="5" fill="#f59e0b"/><text x="20" y="14">Busy airport</text>` +
    `<circle cx="8" cy="28" r="5" fill="#ffffff"/><text x="20" y="32">Quiet airport</text>` +
    `<rect x="3" y="41" width="10" height="10" fill="rgba(251,191,36,0.3)" stroke="#fbbf24"/><text x="20" y="50">Track area</text></svg>`,
)}`;

/** NASA GIBS serves daily MODIS imagery over WMS; the TIME parameter picks the day. */
const GIBS = {
  service: 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi',
  layerNames: 'MODIS_Terra_CorrectedReflectance_TrueColor',
  attribution: { text: 'NASA GIBS', url: 'https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api' },
};

/** The last 30 days up to yesterday (GIBS publishes with about a day of latency). */
function recentDays(): TimeDimension {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  return { start: new Date(end.getTime() - 29 * DAY_MS), end, stepMs: DAY_MS };
}
const MODIS_DAYS = recentDays();

export function App() {
  const [selected, setSelected] = useState<(typeof CITIES)[number] | null>(null);
  const [lastClick, setLastClick] = useState<PickEvent | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const target = selected ?? { latitude: 20, longitude: 10 };

  return (
    <Globe
      style={{ height: '100vh' }}
      layers={['blue-marble-landsat', 'atmosphere', 'star-field', 'compass']}
      view={{ latitude: 20, longitude: 10, range: 1.6e7 }}
      fallback={<div className="wwui-panel wwui-panel--top-left">Loading NASA WorldWind…</div>}
      onClick={(event) => {
        setLastClick(event);
        setPopup(describePick(event));
      }}
      onReady={(globe) => {
        window.worldwindDemo = { globe };
      }}
    >
      <Layer kind="osm" enabled={false} />
      <WmsLayer
        service={GIBS.service}
        layerNames={GIBS.layerNames}
        displayName="MODIS Terra (daily)"
        format="image/jpeg"
        numLevels={10}
        enabled={false}
        timeDimension={MODIS_DAYS}
        attribution={GIBS.attribution}
      />
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
            userData={{ name: city.name }}
            onClick={() => setSelected(city)}
          />
        ))}
        <Path positions={ROUTE} stroke="#38bdf8" strokeWidth={3} followTerrain={false} pathType="greatCircle" />
        {selected ? <SurfaceCircle center={selected} radius={150_000} fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" /> : null}
      </RenderableLayer>

      <GeoJsonLayer
        source={AIRPORTS}
        name="Airports"
        legend={{ url: AIRPORT_LEGEND, width: 150, height: 54 }}
        style={({ properties, geometryType }) =>
          geometryType === 'Point'
            ? { point: { pushpin: properties.busy ? 'orange' : 'white', labelProperty: 'name', imageScale: 0.8 } }
            : { polygon: { fill: 'rgba(251, 191, 36, 0.15)', stroke: '#fbbf24', strokeWidth: 2 } }
        }
      />

      {popup ? (
        <Popup position={popup.position} title={popup.title} onClose={() => setPopup(null)}>
          {popup.lines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </Popup>
      ) : null}

      <GoToBox position="top-left" />
      <MeasureTool position="top-left" className="wwui-panel--below-goto" />
      <LayerSwitcher position="bottom-right" />
      <NavigationControls position="top-right" home={{ latitude: 20, longitude: 10, range: 1.6e7, heading: 0, tilt: 0 }} />
      <CoordinatesReadout position="bottom-left" />
      <ProjectionSwitcher position="top-right" className="wwui-panel--beside-nav" />
      <Compass position="top-right" className="wwui-panel--below-nav" />
      <TimeSlider position="bottom-center" className="wwui-panel--above-scale" />
      <Legend position="bottom-left" className="wwui-panel--above-status" />
      <ScaleBar position="bottom-center" className="wwui-panel--above-attribution" />
      <Attribution position="bottom-center" extra={[{ text: 'worldwind-ui', url: 'https://github.com/qwertymuzaffar/worldwind-ui' }]} />

      <Panel position="bottom-left" className="wwui-panel--above-coords">
        <p className="wwui-goto__status" style={{ margin: 0 }}>
          {selected ? `Selected: ${selected.name}` : 'Click a pin to fly there'}
          {lastClick?.position ? ` · last click ${formatLatLon(lastClick.position, { precision: 2 })}` : ''}
        </p>
      </Panel>
    </Globe>
  );
}
