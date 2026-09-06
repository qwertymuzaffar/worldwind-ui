import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import type { ScaleBarState, ScaleUnits } from 'worldwind-kit';
import { WwGlobeComponent } from '../globe.component';
import { WwPanelComponent, type WwPanelPosition } from './panel.component';

/** A bar showing a round ground distance at the current zoom.
 * @category Widgets
 */
@Component({
  selector: 'ww-scale-bar',
  imports: [WwPanelComponent],
  template: `
    <ww-panel
      [position]="position()"
      class="wwui-panel--compact wwui-scale-panel"
      [class]="panelClass()"
      role="img"
      [attr.aria-label]="state() ? 'Scale: ' + state()!.label : 'Scale'"
    >
      <div class="wwui-scale" [style.width.px]="maxWidth()">
        <div class="wwui-scale__bar" [style.width.px]="state() ? state()!.pixels : 0"></div>
        <div class="wwui-scale__label">{{ state()?.label ?? '' }}</div>
      </div>
    </ww-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwScaleBarComponent {
  private readonly globeHost = inject(WwGlobeComponent);

  readonly position = input<WwPanelPosition>('bottom-left');
  /** Longest bar in CSS pixels. */
  readonly maxWidth = input(120);
  /** `metric`, `imperial` or `nautical`. */
  readonly units = input<ScaleUnits>('metric');
  /** Extra classes for the panel. */
  readonly panelClass = input<string>('');

  /** The scale for the last frame, null before the first one. */
  readonly state = signal<ScaleBarState | null>(null);

  constructor() {
    effect((onCleanup) => {
      const globe = this.globeHost.globe();
      const maxWidth = this.maxWidth();
      const units = this.units();
      if (!globe) return;
      onCleanup(globe.trackScale((state) => this.state.set(state), { maxWidth, units }));
    });
  }
}
