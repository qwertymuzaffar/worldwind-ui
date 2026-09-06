import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import {
  MeasureTool,
  formatArea,
  formatDistance,
  type MeasurementState,
  type PathType,
  type ShapeStyle,
} from 'worldwind-kit';
import { WwGlobeComponent } from '../globe.component';
import { WwPanelComponent, type WwPanelPosition } from './panel.component';

const IDLE: MeasurementState = { points: [], lengthMeters: 0, areaSquareMeters: null, active: false };

/** Click-to-measure distances and areas, with start/stop, undo and clear. */
@Component({
  selector: 'ww-measure-tool',
  imports: [WwPanelComponent],
  template: `
    <ww-panel [position]="position()" [heading]="heading()" class="wwui-measure" [class]="panelClass()">
      <div class="wwui-toolbar wwui-toolbar--horizontal" style="padding: 0" role="group" aria-label="Measure">
        <button
          type="button"
          class="wwui-button wwui-button--wide"
          [class.wwui-button--active]="state().active"
          [attr.aria-pressed]="state().active"
          (click)="tool?.toggle()"
        >
          {{ state().active ? 'Stop' : 'Measure' }}
        </button>
        <button type="button" class="wwui-button" title="Undo last point" aria-label="Undo last point" [disabled]="state().points.length === 0" (click)="tool?.undo()">↶</button>
        <button type="button" class="wwui-button" title="Clear" aria-label="Clear measurement" [disabled]="state().points.length === 0" (click)="tool?.clear()">✕</button>
      </div>
      <div class="wwui-coords" aria-live="polite">
        <span><span class="wwui-coords__label">Points</span>{{ state().points.length }}</span>
        <span><span class="wwui-coords__label">Length</span>{{ length() }}</span>
        @if (state().areaSquareMeters !== null) {
          <span><span class="wwui-coords__label">Area</span>{{ area() }}</span>
        }
      </div>
      <div class="wwui-goto__status">{{ state().active ? 'Click the globe to add points' : 'Press Measure, then click the globe' }}</div>
    </ww-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwMeasureToolComponent {
  private readonly globeHost = inject(WwGlobeComponent);

  readonly position = input<WwPanelPosition>('top-left');
  readonly heading = input<string | null>('Measure');
  readonly pathType = input<PathType | undefined>(undefined);
  readonly followTerrain = input<boolean | undefined>(undefined);
  readonly line = input<ShapeStyle | undefined>(undefined);
  /** Extra classes for the panel (the widget's host element renders nothing itself). */
  readonly panelClass = input<string>('');

  /** The tool, once the globe is ready. */
  tool: MeasureTool | null = null;
  protected readonly state = signal<MeasurementState>(IDLE);

  constructor() {
    effect((onCleanup) => {
      const globe = this.globeHost.globe();
      if (!globe) return;
      const tool = untracked(
        () => new MeasureTool(globe, { pathType: this.pathType(), followTerrain: this.followTerrain(), line: this.line() }),
      );
      this.tool = tool;
      this.state.set(tool.state);
      const unsubscribe = tool.subscribe((state) => this.state.set(state));
      onCleanup(() => {
        unsubscribe();
        tool.destroy();
        this.tool = null;
        this.state.set(IDLE);
      });
    });
    inject(DestroyRef).onDestroy(() => this.tool?.destroy());
  }

  protected length(): string {
    return formatDistance(this.state().lengthMeters);
  }

  protected area(): string {
    const area = this.state().areaSquareMeters;
    return area === null ? '' : formatArea(area);
  }
}
