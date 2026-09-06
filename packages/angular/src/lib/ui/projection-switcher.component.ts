import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { PROJECTION_KINDS, PROJECTION_LABELS, type ProjectionKind } from 'worldwind-kit';
import { WwGlobeComponent } from '../globe.component';
import { WwPanelComponent, type WwPanelPosition } from './panel.component';

/** Buttons that switch between the 3D globe and the flat projections.
 * @category Widgets
 */
@Component({
  selector: 'ww-projection-switcher',
  imports: [WwPanelComponent],
  template: `
    <ww-panel [position]="position()" [heading]="heading()" [class]="panelClass()">
      <div class="wwui-toolbar wwui-toolbar--horizontal" style="padding: 0; flex-wrap: wrap" role="group" aria-label="Projection">
        @for (kind of projections(); track kind) {
          <button
            type="button"
            class="wwui-button wwui-button--wide"
            [class.wwui-button--active]="kind === current()"
            [attr.aria-pressed]="kind === current()"
            (click)="select(kind)"
          >
            {{ label(kind) }}
          </button>
        }
      </div>
    </ww-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwProjectionSwitcherComponent {
  private readonly globeHost = inject(WwGlobeComponent);

  readonly position = input<WwPanelPosition>('top-left');
  readonly heading = input<string | null>('Projection');
  /** Which projections to offer. Defaults to all of them. */
  readonly projections = input<readonly ProjectionKind[]>(PROJECTION_KINDS);
  /** Button labels per projection. */
  readonly labels = input<Partial<Record<ProjectionKind, string>> | undefined>(undefined);
  /** Extra classes for the panel (the widget's host element renders nothing itself). */
  readonly panelClass = input<string>('');

  protected readonly current = computed(() => this.globeHost.projectionState());

  protected label(kind: ProjectionKind): string {
    return this.labels()?.[kind] ?? PROJECTION_LABELS[kind];
  }

  protected select(kind: ProjectionKind): void {
    this.globeHost.globe()?.setProjection(kind);
  }
}
