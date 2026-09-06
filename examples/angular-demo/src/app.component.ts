import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  DAY_MS,
  WORLDWIND_COMPONENTS,
  formatLatLon,
  type CameraTarget,
  type GeoJsonStyleResolver,
  type GlobeController,
  type GlobeOptions,
  type LatLonAlt,
  type LayerAttribution,
  type LayerLegend,
  type PickEvent,
  type PushpinColor,
  type TimeDimension,
} from 'ngx-worldwind';

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

interface City {
  name: string;
  latitude: number;
  longitude: number;
  pushpin: PushpinColor;
}

/** A few GeoJSON features, styled per feature through the featureStyle resolver. */
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
const AIRPORT_LEGEND: LayerLegend = {
  url: `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="54" font-family="sans-serif" font-size="11" fill="#f1f5f9">` +
      `<circle cx="8" cy="10" r="5" fill="#f59e0b"/><text x="20" y="14">Busy airport</text>` +
      `<circle cx="8" cy="28" r="5" fill="#ffffff"/><text x="20" y="32">Quiet airport</text>` +
      `<rect x="3" y="41" width="10" height="10" fill="rgba(251,191,36,0.3)" stroke="#fbbf24"/><text x="20" y="50">Track area</text></svg>`,
  )}`,
  width: 150,
  height: 54,
};

/** NASA GIBS serves daily MODIS imagery over WMS; the TIME parameter picks the day. */
const GIBS_SERVICE = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
const GIBS_CREDIT: LayerAttribution = {
  text: 'NASA GIBS',
  url: 'https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api',
};

/** The last 30 days up to yesterday (GIBS publishes with about a day of latency). */
function recentDays(): TimeDimension {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  return { start: new Date(end.getTime() - 29 * DAY_MS), end, stepMs: DAY_MS };
}

const CITIES: City[] = [
  { name: 'New York', latitude: 40.7128, longitude: -74.006, pushpin: 'red' },
  { name: 'London', latitude: 51.5074, longitude: -0.1278, pushpin: 'blue' },
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, pushpin: 'green' },
  { name: 'Sydney', latitude: -33.8688, longitude: 151.2093, pushpin: 'orange' },
];

@Component({
  selector: 'app-root',
  imports: [...WORLDWIND_COMPONENTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ww-globe [options]="options" style="height: 100vh" (globeClick)="onGlobeClick($event)" (ready)="expose($event)">
      <div wwFallback class="wwui-panel wwui-panel--top-left">Loading NASA WorldWind…</div>

      <ww-layer kind="osm" [enabled]="false" />
      <ww-wms-layer
        [service]="gibsService"
        layerNames="MODIS_Terra_CorrectedReflectance_TrueColor"
        displayName="MODIS Terra (daily)"
        format="image/jpeg"
        [numLevels]="10"
        [enabled]="false"
        [timeDimension]="modisDays"
        [attribution]="gibsCredit"
      />
      <ww-camera
        [latitude]="target().latitude"
        [longitude]="target().longitude"
        [range]="selected() ? 1.5e6 : 1.6e7"
        [animate]="2000"
      />

      <ww-renderable-layer name="Cities">
        @for (city of cities; track city.name) {
          <ww-placemark
            [position]="city"
            [label]="city.name"
            [pushpin]="city.pushpin"
            [highlight]="{ imageScale: 1.4 }"
            [highlightOnHover]="true"
            [userData]="{ name: city.name }"
            (shapeClick)="selected.set(city)"
          />
        }
        <ww-path [positions]="route" stroke="#38bdf8" [strokeWidth]="3" [followTerrain]="false" pathType="greatCircle" />
        @if (selected(); as city) {
          <ww-surface-circle [center]="city" [radius]="150000" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" />
        }
      </ww-renderable-layer>

      <ww-geojson-layer [source]="airports" name="Airports" [featureStyle]="airportStyle" [legend]="airportLegend" />

      @if (popup(); as p) {
        <ww-popup [position]="p.position" [heading]="p.title" [closable]="true" (closed)="popup.set(null)">
          @for (line of p.lines; track line) {
            <div>{{ line }}</div>
          }
        </ww-popup>
      }

      <ww-goto-box position="top-left" />
      <ww-measure-tool position="top-left" panelClass="wwui-panel--below-goto" />
      <ww-layer-switcher position="bottom-right" />
      <ww-navigation-controls position="top-right" [home]="home" />
      <ww-coordinates position="bottom-left" />
      <ww-projection-switcher position="top-right" panelClass="wwui-panel--beside-nav" />
      <ww-compass position="top-right" panelClass="wwui-panel--below-nav" />
      <ww-time-slider position="bottom-center" panelClass="wwui-panel--above-scale" />
      <ww-legend position="bottom-left" panelClass="wwui-panel--above-status" />
      <ww-scale-bar position="bottom-center" panelClass="wwui-panel--above-attribution" />
      <ww-attribution position="bottom-center" [extra]="credits" />

      <ww-panel position="bottom-left" class="wwui-panel--above-coords">
        <p class="wwui-goto__status" style="margin: 0">{{ status() }}</p>
      </ww-panel>
    </ww-globe>
  `,
})
export class AppComponent {
  readonly cities = CITIES;
  readonly route: LatLonAlt[] = CITIES.map((city) => ({ latitude: city.latitude, longitude: city.longitude, altitude: 300_000 }));
  readonly airports = AIRPORTS;
  readonly airportLegend = AIRPORT_LEGEND;
  readonly gibsService = GIBS_SERVICE;
  readonly gibsCredit = GIBS_CREDIT;
  readonly modisDays = recentDays();
  readonly credits: LayerAttribution[] = [{ text: 'worldwind-ui', url: 'https://github.com/qwertymuzaffar/worldwind-ui' }];
  readonly airportStyle: GeoJsonStyleResolver = ({ properties, geometryType }) =>
    geometryType === 'Point'
      ? { point: { pushpin: properties['busy'] ? 'orange' : 'white', labelProperty: 'name', imageScale: 0.8 } }
      : { polygon: { fill: 'rgba(251, 191, 36, 0.15)', stroke: '#fbbf24', strokeWidth: 2 } };
  readonly options: GlobeOptions = {
    layers: ['blue-marble-landsat', 'atmosphere', 'star-field', 'compass'],
    view: { latitude: 20, longitude: 10, range: 1.6e7 },
  };
  readonly home: CameraTarget = { latitude: 20, longitude: 10, range: 1.6e7, heading: 0, tilt: 0 };

  readonly selected = signal<City | null>(null);
  readonly lastClick = signal<PickEvent | null>(null);
  readonly popup = signal<PopupState | null>(null);

  expose(globe: GlobeController): void {
    window.worldwindDemo = { globe };
  }

  onGlobeClick(event: PickEvent): void {
    this.lastClick.set(event);
    const data = (event.top?.object as { userProperties?: unknown } | undefined)?.userProperties as Record<string, unknown> | undefined;
    const position = event.top?.position ?? event.position;
    if (!data || !position || typeof data['name'] !== 'string') {
      this.popup.set(null);
      return;
    }
    const lines = [formatLatLon(position, { precision: 3 })];
    if ('busy' in data) lines.push(data['busy'] ? 'Busy airport' : 'Quiet airport');
    this.popup.set({ position, title: data['name'], lines });
  }
  readonly target = computed(() => this.selected() ?? { latitude: 20, longitude: 10 });
  readonly status = computed(() => {
    const selected = this.selected();
    const click = this.lastClick();
    const base = selected ? `Selected: ${selected.name}` : 'Click a pin to fly there';
    return click?.position ? `${base} · last click ${formatLatLon(click.position, { precision: 2 })}` : base;
  });
}
