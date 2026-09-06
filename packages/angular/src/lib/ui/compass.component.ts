import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { WwGlobeComponent } from '../globe.component';
import { WwPanelComponent, type WwPanelPosition } from './panel.component';

/** A compass rose that turns with the camera heading; click it to face north again.
 * @category Widgets
 */
@Component({
  selector: 'ww-compass',
  imports: [WwPanelComponent],
  template: `
    <ww-panel [position]="position()" class="wwui-compass-panel" [class]="panelClass()">
      <button
        type="button"
        class="wwui-compass"
        [style.width.px]="size()"
        [style.height.px]="size()"
        title="Reset to north"
        [attr.aria-label]="'Compass, heading ' + rounded() + ' degrees. Reset to north'"
        [attr.data-heading]="rounded()"
        (click)="onClick()"
      >
        <svg viewBox="0 0 100 100" class="wwui-compass__rose" [style.transform]="'rotate(' + -heading() + 'deg)'" aria-hidden="true" focusable="false">
          <circle cx="50" cy="50" r="46" class="wwui-compass__ring" />
          <line x1="86" y1="50" x2="92" y2="50" class="wwui-compass__tick" />
          <line x1="50" y1="86" x2="50" y2="92" class="wwui-compass__tick" />
          <line x1="8" y1="50" x2="14" y2="50" class="wwui-compass__tick" />
          <text x="50" y="23" text-anchor="middle" class="wwui-compass__label">N</text>
          <path d="M50 27 L59 50 L50 46 L41 50 Z" class="wwui-compass__north" />
          <path d="M50 73 L59 50 L50 54 L41 50 Z" class="wwui-compass__south" />
        </svg>
      </button>
    </ww-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwCompassComponent {
  private readonly globeHost = inject(WwGlobeComponent);

  readonly position = input<WwPanelPosition>('top-right');
  /** Diameter in CSS pixels. */
  readonly size = input(56);
  /** Reset the heading to north when clicked. */
  readonly resetOnClick = input(true);
  /** Extra classes for the panel. */
  readonly panelClass = input<string>('');
  /** Emits the heading (degrees clockwise from north) that was showing when clicked. */
  readonly compassClick = output<number>();

  /** Heading in degrees, 0..360. */
  readonly heading = computed(() => {
    const heading = this.globeHost.cameraState()?.heading ?? 0;
    return ((heading % 360) + 360) % 360;
  });
  protected readonly rounded = computed(() => Math.round(this.heading()) % 360);

  protected onClick(): void {
    if (this.resetOnClick()) this.globeHost.globe()?.camera.resetNorth();
    this.compassClick.emit(this.heading());
  }
}
