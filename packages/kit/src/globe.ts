import { configureAssetBaseUrl } from './assets';
import { CameraController, type CameraState } from './camera';
import { createEmitter, type Unsubscribe } from './events';
import {
  LayerManager,
  createBuiltInLayer,
  createWmsLayer,
  type BuiltInLayerKind,
  type LayerOptions,
  type WmsLayerOptions,
} from './layers';
import { PickDispatcher, pickAt, type PickEventType, type PickHandler, type PickOptions, type PickResult } from './picking';
import type { LatLonAlt } from './geo';
import { toScreen, trackScreenPosition, type ScreenPoint } from './screen';
import { loadWorldWind, type LoadWorldWindOptions } from './worldwind';
import type { WWLayer, WWRenderableLayer, WWWorldWindow, WorldWindStatic } from './worldwind-types';

/** @category Globe */
export type ProjectionKind = '3d' | 'equirectangular' | 'mercator' | 'north-polar' | 'south-polar';

/** @category Globe */
export const PROJECTION_KINDS: readonly ProjectionKind[] = ['3d', 'equirectangular', 'mercator', 'north-polar', 'south-polar'];

/** @category Globe */
export const PROJECTION_LABELS: Record<ProjectionKind, string> = {
  '3d': '3D',
  equirectangular: 'Equirectangular',
  mercator: 'Mercator',
  'north-polar': 'North polar',
  'south-polar': 'South polar',
};

/** @category Globe */
export type LogLevel = 'none' | 'severe' | 'warning' | 'info';

/** @category Globe */
export interface GlobeOptions {
  /**
   * Where WorldWind's image assets live. Defaults to a CDN copy matching the installed WorldWind.
   * Pass `null` to keep whatever WorldWind detected itself (only works when it was loaded from a
   * `<script>` tag).
   */
  assetBaseUrl?: string | null;
  /** Terrain elevation. Defaults to true; false gives a smooth ellipsoid and saves bandwidth. */
  elevation?: boolean;
  projection?: ProjectionKind;
  /** Pick every object under the cursor, not just the top one. */
  deepPicking?: boolean;
  /** Render scale; `window.devicePixelRatio` gives crisp output at a GPU cost. Defaults to 1. */
  pixelScale?: number;
  /** Required for the Bing layers. */
  bingMapsKey?: string;
  logLevel?: LogLevel;
  verticalExaggeration?: number;
  /** Initial camera. */
  view?: Partial<CameraState>;
  /** Built-in layers to add straight away, bottom to top. */
  layers?: BuiltInLayerKind[];
}

const LOG_LEVELS: Record<LogLevel, (worldWind: WorldWindStatic) => number> = {
  none: (ww) => ww.Logger.LEVEL_NONE,
  severe: (ww) => ww.Logger.LEVEL_SEVERE,
  warning: (ww) => ww.Logger.LEVEL_WARNING,
  info: (ww) => ww.Logger.LEVEL_INFO,
};

/**
 * Owns one WorldWindow: creates it on a host element, wires up layers, camera and picking, and
 * tears everything down in `destroy()` (something WorldWind itself cannot do).
  * @example
 * ```ts
 * const globe = await GlobeController.create(document.getElementById('map')!, {
 *   layers: ['blue-marble-landsat', 'atmosphere'],
 *   view: { latitude: 48.85, longitude: 2.35, range: 5e5 },
 * });
 * globe.on('click', (event) => console.log(event.position));
 * await globe.camera.goTo({ latitude: 51.5, longitude: -0.12, range: 1e6 }, { duration: 2000 });
 * globe.destroy();
 * ```
 * @category Globe
 */
export class GlobeController {
  readonly worldWind: WorldWindStatic;
  readonly wwd: WWWorldWindow;
  readonly canvas: HTMLCanvasElement;
  readonly layers: LayerManager;
  readonly camera: CameraController;

  private readonly ownsCanvas: boolean;
  private readonly cleanups: Unsubscribe[] = [];
  private readonly projectionEmitter = createEmitter<ProjectionKind>();
  private readonly picks: PickDispatcher;
  private currentProjection: ProjectionKind;
  private disposed = false;

  /** Loads WorldWind (once, lazily) and creates a globe. */
  static async create(
    host: HTMLElement,
    options: GlobeOptions = {},
    loadOptions?: LoadWorldWindOptions,
  ): Promise<GlobeController> {
    const worldWind = await loadWorldWind(loadOptions);
    return new GlobeController(worldWind, host, options);
  }

  /**
   * @param host A `<canvas>` to render into, or any element that should receive a new canvas.
   */
  constructor(worldWind: WorldWindStatic, host: HTMLElement, options: GlobeOptions = {}) {
    this.worldWind = worldWind;

    if (options.assetBaseUrl !== null) configureAssetBaseUrl(worldWind, options.assetBaseUrl);
    if (options.bingMapsKey) worldWind.BingMapsKey = options.bingMapsKey;
    if (options.logLevel) worldWind.Logger.setLoggingLevel(LOG_LEVELS[options.logLevel](worldWind));

    if (host instanceof HTMLCanvasElement) {
      this.canvas = host;
      this.ownsCanvas = false;
    } else {
      this.canvas = host.ownerDocument.createElement('canvas');
      this.canvas.style.display = 'block';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      host.appendChild(this.canvas);
      this.ownsCanvas = true;
    }

    const elevationModel = options.elevation === false ? new worldWind.ElevationModel() : undefined;
    this.wwd = new worldWind.WorldWindow(this.canvas, elevationModel);
    if (options.deepPicking !== undefined) this.wwd.deepPicking = options.deepPicking;
    if (options.pixelScale !== undefined) this.wwd.pixelScale = options.pixelScale;
    if (options.verticalExaggeration !== undefined) this.wwd.verticalExaggeration = options.verticalExaggeration;

    this.layers = new LayerManager(this.wwd);
    this.camera = new CameraController(worldWind, this.wwd);
    this.picks = new PickDispatcher(worldWind, this.wwd);

    this.currentProjection = '3d';
    if (options.projection && options.projection !== '3d') this.setProjection(options.projection);
    for (const kind of options.layers ?? []) this.addLayer(kind);
    if (options.view) this.camera.set(options.view, { redraw: false });
    this.wwd.redraw();
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  get projection(): ProjectionKind {
    return this.currentProjection;
  }

  redraw(): void {
    this.wwd.redraw();
  }

  /** Creates and adds a built-in layer. */
  addLayer(kind: BuiltInLayerKind, options: LayerOptions = {}): WWLayer {
    return this.layers.add(createBuiltInLayer(this.worldWind, this.wwd, kind, options));
  }

  addWmsLayer(options: WmsLayerOptions): WWLayer {
    return this.layers.add(createWmsLayer(this.worldWind, options));
  }

  /** Creates and adds an empty RenderableLayer for placemarks, paths and other shapes. */
  addRenderableLayer(displayName = 'Renderables', options: LayerOptions = {}): WWRenderableLayer {
    const layer = new this.worldWind.RenderableLayer(displayName);
    Object.assign(layer, options);
    return this.layers.add(layer);
  }

  pick(clientX: number, clientY: number, options?: PickOptions): PickResult {
    return pickAt(this.wwd, clientX, clientY, options);
  }

  /**
   * Subscribes to click, double-click or hover picks. All subscribers of a type share one set of
   * WorldWind recognizers (see {@link PickDispatcher}). Unsubscribed automatically on destroy.
   */
  on(type: PickEventType, handler: PickHandler): Unsubscribe {
    return this.picks.on(type, handler);
  }

  /** Where a position lands on the canvas after the last frame, or null if it cannot be projected. */
  toScreen(position: LatLonAlt): ScreenPoint | null {
    return toScreen(this.worldWind, this.wwd, position);
  }

  /** Follows a position across frames; the listener fires whenever its screen point changes. */
  trackPosition(position: LatLonAlt, listener: (point: ScreenPoint | null) => void): Unsubscribe {
    return this.track(trackScreenPosition(this.worldWind, this.wwd, position, listener));
  }

  /** Raw DOM events on the canvas (`wheel`, `mousemove`, `touchstart`, ...). */
  addEventListener<E extends Event = Event>(type: string, listener: (event: E) => void): Unsubscribe {
    this.wwd.addEventListener(type, listener);
    return this.track(() => this.wwd.removeEventListener(type, listener));
  }

  /** Switches between the 3D globe and flat projections. */
  setProjection(kind: ProjectionKind): void {
    const ww = this.worldWind;
    const elevationModel = this.wwd.globe.elevationModel;
    if (kind === '3d') {
      this.wwd.globe = new ww.Globe(elevationModel);
    } else {
      const globe = new ww.Globe2D();
      globe.elevationModel = elevationModel;
      switch (kind) {
        case 'mercator':
          globe.projection = new ww.ProjectionMercator();
          break;
        case 'north-polar':
          globe.projection = new ww.ProjectionPolarEquidistant('North');
          break;
        case 'south-polar':
          globe.projection = new ww.ProjectionPolarEquidistant('South');
          break;
        default:
          globe.projection = new ww.ProjectionEquirectangular();
      }
      this.wwd.globe = globe;
    }
    this.currentProjection = kind;
    this.wwd.redraw();
    this.projectionEmitter.emit(kind);
  }

  /** Notifies whenever {@link setProjection} changes the projection. */
  onProjectionChange(listener: (projection: ProjectionKind) => void): Unsubscribe {
    return this.projectionEmitter.on(listener);
  }

  /**
   * Stops rendering, removes layers and listeners, releases the WebGL context, and removes the
   * canvas if this controller created it. The controller is unusable afterwards.
   */
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;

    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.picks.destroy();
    this.projectionEmitter.clear();
    this.camera.destroy();
    this.layers.destroy();

    const wwd = this.wwd;
    if (wwd.redrawRequestId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(wwd.redrawRequestId);
    }
    // WorldWind installs window-level pointer listeners it never removes; make them inert.
    wwd.onGestureEvent = () => {};
    wwd.redrawCallbacks.length = 0;
    for (const layer of wwd.layers.slice()) wwd.removeLayer(layer);

    const gl = wwd.drawContext?.currentGlContext;
    const loseContext = gl?.getExtension?.('WEBGL_lose_context') as { loseContext(): void } | null | undefined;
    loseContext?.loseContext();

    if (this.ownsCanvas) this.canvas.remove();
  }

  private track(unsubscribe: Unsubscribe): Unsubscribe {
    this.cleanups.push(unsubscribe);
    return () => {
      const index = this.cleanups.indexOf(unsubscribe);
      if (index !== -1) this.cleanups.splice(index, 1);
      unsubscribe();
    };
  }
}
