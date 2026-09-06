import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import {
  DrawTool,
  MIN_DRAW_VERTICES,
  type DrawFeature,
  type DrawMode,
  type DrawState,
  type PathType,
  type ShapeStyle,
} from 'worldwind-kit';
import { WwGlobeComponent } from '../globe.component';
import { WwPanelComponent, type WwPanelPosition } from './panel.component';

const IDLE: DrawState = { mode: null, draft: [], features: [], selectedId: null, selectedVertex: null, dragging: false };
const MODES: Array<{ mode: DrawMode; label: string }> = [
  { mode: 'point', label: 'Point' },
  { mode: 'line', label: 'Line' },
  { mode: 'polygon', label: 'Polygon' },
];

/** Draw points, lines and polygons; select, drag and delete them; export GeoJSON.
 * @category Widgets
 */
@Component({
  selector: 'ww-draw-tool',
  imports: [WwPanelComponent],
  template: `
    <ww-panel [position]="position()" [heading]="heading()" class="wwui-draw" [class]="panelClass()">
      <div class="wwui-toolbar wwui-toolbar--horizontal" style="padding: 0" role="group" aria-label="Draw">
        @for (entry of modes; track entry.mode) {
          <button
            type="button"
            class="wwui-button wwui-button--wide"
            [class.wwui-button--active]="state().mode === entry.mode"
            [attr.aria-pressed]="state().mode === entry.mode"
            (click)="toggleMode(entry.mode)"
          >
            {{ entry.label }}
          </button>
        }
      </div>
      <div class="wwui-toolbar wwui-toolbar--horizontal" style="padding: 0" role="group" aria-label="Edit drawing">
        <button type="button" class="wwui-button wwui-button--wide" [disabled]="!canFinish()" (click)="tool?.finish()">Finish</button>
        <button type="button" class="wwui-button" title="Undo last point" aria-label="Undo last point" [disabled]="state().draft.length === 0" (click)="tool?.undo()">↶</button>
        <button type="button" class="wwui-button wwui-button--wide" aria-label="Delete selection" [disabled]="!selected()" (click)="tool?.removeSelected()">Delete</button>
        <button
          type="button"
          class="wwui-button"
          title="Clear all"
          aria-label="Clear drawings"
          [disabled]="state().features.length === 0 && state().draft.length === 0"
          (click)="tool?.clear()"
        >
          ✕
        </button>
        @if (showDownload()) {
          <button type="button" class="wwui-button" title="Download GeoJSON" aria-label="Download GeoJSON" [disabled]="state().features.length === 0" (click)="download()">⤓</button>
        }
      </div>
      <div class="wwui-coords" aria-live="polite">
        <span><span class="wwui-coords__label">Features</span>{{ state().features.length }}</span>
        @if (state().draft.length) {
          <span><span class="wwui-coords__label">Draft</span>{{ state().draft.length }}</span>
        }
      </div>
      <div class="wwui-goto__status">{{ status() }}</div>
    </ww-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwDrawToolComponent {
  private readonly globeHost = inject(WwGlobeComponent);

  readonly position = input<WwPanelPosition>('top-left');
  readonly heading = input<string | null>('Draw');
  readonly layerName = input<string | undefined>(undefined);
  readonly pathType = input<PathType | undefined>(undefined);
  readonly pointImage = input<string | null | undefined>(undefined);
  readonly pointScale = input<number | undefined>(undefined);
  readonly line = input<ShapeStyle | undefined>(undefined);
  readonly polygon = input<ShapeStyle | undefined>(undefined);
  readonly selectedStyle = input<ShapeStyle | undefined>(undefined);
  readonly handleImage = input<string | null | undefined>(undefined);
  readonly handleScale = input<number | undefined>(undefined);
  /** Let features be selected, dragged and deleted. */
  readonly editable = input(true);
  readonly finishOnDoubleClick = input(true);
  readonly keyboard = input(true);
  /** Add a button that downloads the drawings as GeoJSON. */
  readonly showDownload = input(false);
  readonly downloadName = input('drawings.geojson');
  /** Extra classes for the panel. */
  readonly panelClass = input<string>('');
  /** Emits the features whenever they change. */
  readonly featuresChange = output<readonly DrawFeature[]>();

  /** The tool, once the globe is ready. */
  tool: DrawTool | null = null;
  readonly state = signal<DrawState>(IDLE);
  protected readonly modes = MODES;

  protected readonly selected = computed(() => {
    const { selectedId, features } = this.state();
    return selectedId ? features.find((feature) => feature.id === selectedId) : undefined;
  });
  protected readonly canFinish = computed(() => {
    const { mode, draft } = this.state();
    return mode !== null && mode !== 'point' && draft.length >= MIN_DRAW_VERTICES[mode];
  });
  protected readonly status = computed(() => {
    const { mode, draft, selectedVertex } = this.state();
    const selected = this.selected();
    if (mode === 'point') return 'Click the globe to place points';
    if (mode) return draft.length ? 'Click to add points, double-click or Enter to finish' : 'Click the globe to start';
    if (selected) return `Selected ${selected.type}${selectedVertex !== null ? `, vertex ${selectedVertex + 1}` : ''}: drag its handles or press Delete`;
    return 'Pick a shape, or click a drawing to edit it';
  });

  constructor() {
    effect((onCleanup) => {
      const globe = this.globeHost.globe();
      if (!globe) return;
      const tool = untracked(
        () =>
          new DrawTool(globe, {
            layerName: this.layerName(),
            pathType: this.pathType(),
            pointImage: this.pointImage(),
            pointScale: this.pointScale(),
            line: this.line(),
            polygon: this.polygon(),
            selected: this.selectedStyle(),
            handleImage: this.handleImage(),
            handleScale: this.handleScale(),
            editable: this.editable(),
            finishOnDoubleClick: this.finishOnDoubleClick(),
            keyboard: this.keyboard(),
          }),
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
    effect(() => {
      this.featuresChange.emit(this.state().features);
    });
    inject(DestroyRef).onDestroy(() => this.tool?.destroy());
  }

  protected toggleMode(mode: DrawMode): void {
    if (!this.tool) return;
    if (this.tool.state.mode === mode) this.tool.stop();
    else this.tool.start(mode);
  }

  protected download(): void {
    if (!this.tool) return;
    const blob = new Blob([JSON.stringify(this.tool.toGeoJson(), null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.downloadName();
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
