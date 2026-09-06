import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { formatDistance, formatLatLon, type LatLon } from 'worldwind-kit';
import { WwGlobeComponent } from '../globe.component';
import { injectHoverPick } from '../inject';
import { WwPanelComponent, type WwPanelPosition } from './panel.component';

/** Latitude, longitude and terrain altitude under the mouse, plus the camera range.
 * @category Widgets
 */
@Component({
  selector: 'ww-coordinates',
  imports: [WwPanelComponent],
  template: `
    <ww-panel [position]="position()" class="wwui-coords-panel">
      <div class="wwui-coords" aria-live="polite">
        @if (point(); as p) {
          <span><span class="wwui-coords__label">Lat/Lon</span>{{ formatPoint(p) }}</span>
          @if (showAltitude() && p.altitude !== undefined) {
            <span><span class="wwui-coords__label">Alt</span>{{ distance(p.altitude) }}</span>
          }
        } @else {
          <span class="wwui-coords__label">{{ idleText() }}</span>
        }
        @if (showRange()) {
          @if (camera(); as c) {
            <span><span class="wwui-coords__label">Range</span>{{ distance(c.range) }}</span>
          }
        }
      </div>
    </ww-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwCoordinatesComponent {
  private readonly globeHost = inject(WwGlobeComponent);
  private readonly hover = injectHoverPick();

  readonly position = input<WwPanelPosition>('bottom-left');
  readonly format = input<'decimal' | 'dms'>('decimal');
  readonly precision = input<number | undefined>(undefined);
  readonly showAltitude = input(true);
  readonly showRange = input(true);
  readonly idleText = input('Move the mouse over the globe');

  protected readonly point = computed(() => this.hover()?.position ?? null);
  protected readonly camera = this.globeHost.cameraState;

  protected formatPoint(point: LatLon): string {
    return formatLatLon(point, { style: this.format(), precision: this.precision() });
  }

  protected distance(meters: number): string {
    return formatDistance(meters);
  }
}
