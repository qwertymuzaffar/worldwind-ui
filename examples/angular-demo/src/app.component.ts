import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  WORLDWIND_COMPONENTS,
  formatLatLon,
  type CameraTarget,
  type GeoJsonStyleResolver,
  type GlobeOptions,
  type LatLonAlt,
  type PickEvent,
  type PushpinColor,
} from 'ngx-worldwind';

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
    <ww-globe [options]="options" style="height: 100vh" (globeClick)="lastClick.set($event)">
      <div wwFallback class="wwui-panel wwui-panel--top-left">Loading NASA WorldWind…</div>

      <ww-layer kind="osm" [enabled]="false" />
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
            (shapeClick)="selected.set(city)"
          />
        }
        <ww-path [positions]="route" stroke="#38bdf8" [strokeWidth]="3" [followTerrain]="false" pathType="greatCircle" />
        @if (selected(); as city) {
          <ww-surface-circle [center]="city" [radius]="150000" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" />
        }
      </ww-renderable-layer>

      <ww-geojson-layer [source]="airports" name="Airports" [featureStyle]="airportStyle" />

      <ww-goto-box position="top-left" />
      <ww-measure-tool position="top-left" panelClass="wwui-panel--below-goto" />
      <ww-layer-switcher position="bottom-right" />
      <ww-navigation-controls position="top-right" [home]="home" />
      <ww-coordinates position="bottom-left" />
      <ww-projection-switcher position="top-right" panelClass="wwui-panel--beside-nav" />

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
  readonly target = computed(() => this.selected() ?? { latitude: 20, longitude: 10 });
  readonly status = computed(() => {
    const selected = this.selected();
    const click = this.lastClick();
    const base = selected ? `Selected: ${selected.name}` : 'Click a pin to fly there';
    return click?.position ? `${base} · last click ${formatLatLon(click.position, { precision: 2 })}` : base;
  });
}
