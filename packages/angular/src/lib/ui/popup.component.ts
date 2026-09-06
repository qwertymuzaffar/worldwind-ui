import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import type { LatLonAlt } from 'worldwind-kit';
import { WwGlobeComponent } from '../globe.component';

export type WwPopupAnchor = 'bottom' | 'top' | 'left' | 'right' | 'center';

/**
 * An HTML overlay anchored to a geographic position that follows the globe as it moves.
 * Project any content inside; emits `closed` from the close button when `closable` is set.
 *
 * ```html
 * <ww-popup [position]="{ latitude: 48.85, longitude: 2.35 }" title="Paris" [closable]="true" (closed)="popup.set(null)">
 *   <p>Population 2.1 million</p>
 * </ww-popup>
 * ```
 * @category Widgets
 */
@Component({
  selector: 'ww-popup',
  template: `
    <div class="wwui-popup__inner">
      @if (closable()) {
        <button type="button" class="wwui-popup__close" aria-label="Close" (click)="closed.emit()">×</button>
      }
      @if (heading()) {
        <div class="wwui-popup__title">{{ heading() }}</div>
      }
      <ng-content />
    </div>
  `,
  host: { '[class]': 'hostClass()', role: 'dialog', style: 'visibility: hidden' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwPopupComponent {
  private readonly globeHost = inject(WwGlobeComponent);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The geographic position the popup points at. */
  readonly position = input.required<LatLonAlt>();
  /** Which side of the position the popup sits on. `bottom` puts the popup above the point. */
  readonly anchor = input<WwPopupAnchor>('bottom');
  /** Extra offset in CSS pixels. */
  readonly offset = input<{ x?: number; y?: number } | undefined>(undefined);
  /** Optional bold first line (named `heading` because `title` is the DOM tooltip attribute). */
  readonly heading = input<string | null | undefined>(undefined);
  /** Show a close button. */
  readonly closable = input(false);
  /** Hide the popup while its position is behind the globe or off screen. */
  readonly hideWhenHidden = input(true);
  readonly closed = output<void>();

  protected readonly hostClass = computed(() => `wwui-popup wwui-popup--${this.anchor()}`);

  constructor() {
    effect((onCleanup) => {
      const globe = this.globeHost.globe();
      const { latitude, longitude, altitude } = this.position();
      if (!globe) return;
      const node = this.element.nativeElement;
      const stop = globe.trackPosition({ latitude, longitude, altitude }, (point) => {
        const offset = untracked(this.offset);
        if (!point || (untracked(this.hideWhenHidden) && !point.visible)) {
          node.style.visibility = 'hidden';
          return;
        }
        node.style.visibility = 'visible';
        node.style.transform = `translate(${point.x + (offset?.x ?? 0)}px, ${point.y + (offset?.y ?? 0)}px)`;
      });
      onCleanup(stop);
    });
  }
}
