import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  GlobeController,
  ShapeEventRegistry,
  type CameraState,
  type GlobeOptions,
  type LoadWorldWindOptions,
  type PickEvent,
  type PickResult,
  type ProjectionKind,
  type WWLayer,
} from 'worldwind-kit';

/**
 * Renders a WorldWind globe. `options` apply on creation; `projection` is reactive. Project
 * layer, shape and widget components inside it; content marked `wwFallback` shows while
 * WorldWind loads.
 *
 * ```html
 * <ww-globe [options]="{ layers: ['blue-marble-landsat', 'atmosphere'] }" style="height: 480px">
 *   <span wwFallback>Loading…</span>
 *   <ww-layer-switcher />
 * </ww-globe>
 * ```
 */
@Component({
  selector: 'ww-globe',
  template: `
    <div #host class="wwui-globe__canvas" style="position: absolute; inset: 0"></div>
    @if (globe()) {
      <div class="wwui-overlay"><ng-content /></div>
    } @else if (errorMessage(); as message) {
      <div class="wwui-overlay">
        <div class="wwui-panel wwui-panel--top-left" role="alert">{{ message }}</div>
      </div>
    } @else {
      <div class="wwui-overlay"><ng-content select="[wwFallback]" /></div>
    }
  `,
  host: { class: 'wwui-globe', style: 'display: block; position: relative' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwGlobeComponent {
  /** Creation options (layers, view, elevation, asset URL, ...). Applied once. */
  readonly options = input<GlobeOptions>({});
  /** Reactive projection switch. */
  readonly projection = input<ProjectionKind | undefined>(undefined);
  readonly loadOptions = input<LoadWorldWindOptions | undefined>(undefined);
  /**
   * Pick under the mouse on every frame and expose it as `hoverPick` / `globeHover`.
   * Off by default because picking costs GPU time; widgets that need it turn it on themselves.
   */
  readonly hoverPicking = input(false);

  readonly ready = output<GlobeController>();
  readonly loadError = output<unknown>();
  readonly globeClick = output<PickEvent>();
  readonly globeDoubleClick = output<PickEvent>();
  readonly globeHover = output<PickEvent>();

  /** The controller, null until WorldWind has loaded. */
  readonly globe = signal<GlobeController | null>(null);
  readonly error = signal<unknown>(null);
  readonly errorMessage = computed(() => {
    const error = this.error();
    return error == null ? null : error instanceof Error ? error.message : String(error);
  });
  /** Camera state, updated after each frame in which it changed. */
  readonly cameraState = signal<CameraState | null>(null);
  /** Layers bottom to top, updated on every change. */
  readonly layers = signal<readonly WWLayer[]>([]);
  /** Latest hover pick while hover picking is active. */
  readonly hoverPick = signal<PickResult | null>(null);

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private registry: ShapeEventRegistry | null = null;
  private hoverUsers = 0;
  private releaseHover: (() => void) | null = null;
  private destroyed = false;

  constructor() {
    afterNextRender(() => {
      void this.init();
    });
    effect(() => {
      const projection = this.projection();
      const globe = this.globe();
      if (globe && projection && globe.projection !== projection) globe.setProjection(projection);
    });
    effect((onCleanup) => {
      if (!this.hoverPicking() || !this.globe()) return;
      const release = untracked(() => this.acquireHover());
      onCleanup(release);
    });
    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  /** Routes picks to shape components. Available once the globe is ready. */
  get shapeEvents(): ShapeEventRegistry {
    if (!this.registry) throw new Error('ngx-worldwind: the globe is not ready yet.');
    return this.registry;
  }

  /** Turns hover picking on until the returned function is called (reference counted). */
  acquireHover(): () => void {
    this.hoverUsers += 1;
    const globe = this.globe();
    if (this.hoverUsers === 1 && globe) {
      this.releaseHover = globe.on('hover', (event) => {
        if (this.destroyed) return;
        this.hoverPick.set(event);
        this.globeHover.emit(event);
      });
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.hoverUsers -= 1;
      if (this.hoverUsers === 0) {
        this.releaseHover?.();
        this.releaseHover = null;
      }
    };
  }

  private async init(): Promise<void> {
    try {
      const globe = await GlobeController.create(this.host().nativeElement, this.options(), this.loadOptions());
      if (this.destroyed) {
        globe.destroy();
        return;
      }
      this.registry = new ShapeEventRegistry(globe);
      globe.on('click', (event) => {
        if (!this.destroyed) this.globeClick.emit(event);
      });
      globe.on('dblclick', (event) => {
        if (!this.destroyed) this.globeDoubleClick.emit(event);
      });
      globe.camera.subscribe((state) => this.cameraState.set(state));
      globe.layers.subscribe((change) => this.layers.set(change.layers));
      this.cameraState.set(globe.camera.get());
      this.layers.set(globe.layers.all);
      this.globe.set(globe);
      this.ready.emit(globe);
    } catch (error) {
      if (this.destroyed) return;
      this.error.set(error);
      this.loadError.emit(error);
    }
  }

  private dispose(): void {
    this.destroyed = true;
    this.releaseHover?.();
    this.registry?.destroy();
    this.globe()?.destroy();
  }
}
