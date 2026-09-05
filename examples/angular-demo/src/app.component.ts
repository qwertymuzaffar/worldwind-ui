import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  WORLDWIND_COMPONENTS,
  formatLatLon,
  type CameraTarget,
  type GlobeOptions,
  type LatLonAlt,
  type PickEvent,
  type ProjectionKind,
  type PushpinColor,
} from 'ngx-worldwind';

interface City {
  name: string;
  latitude: number;
  longitude: number;
  pushpin: PushpinColor;
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
    <ww-globe [options]="options" [projection]="projection()" style="height: 100vh" (globeClick)="lastClick.set($event)">
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

      <ww-goto-box position="top-left" />
      <ww-layer-switcher position="bottom-right" />
      <ww-navigation-controls position="top-right" [home]="home" />
      <ww-coordinates position="bottom-left" />

      <ww-panel position="top-right" heading="Projection" style="right: 64px">
        <div class="wwui-toolbar wwui-toolbar--horizontal" style="padding: 0">
          @for (kind of projections; track kind) {
            <button
              type="button"
              class="wwui-button"
              style="width: auto; padding: 0 10px"
              [style.outline]="kind === projection() ? '2px solid var(--wwui-accent)' : null"
              (click)="projection.set(kind)"
            >
              {{ kind }}
            </button>
          }
        </div>
        <p class="wwui-goto__status" style="margin-top: 8px">{{ status() }}</p>
      </ww-panel>
    </ww-globe>
  `,
})
export class AppComponent {
  readonly cities = CITIES;
  readonly route: LatLonAlt[] = CITIES.map((city) => ({ latitude: city.latitude, longitude: city.longitude, altitude: 300_000 }));
  readonly projections: ProjectionKind[] = ['3d', 'equirectangular', 'mercator', 'north-polar'];
  readonly options: GlobeOptions = {
    layers: ['blue-marble-landsat', 'atmosphere', 'star-field', 'compass'],
    view: { latitude: 20, longitude: 10, range: 1.6e7 },
  };
  readonly home: CameraTarget = { latitude: 20, longitude: 10, range: 1.6e7, heading: 0, tilt: 0 };

  readonly projection = signal<ProjectionKind>('3d');
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
