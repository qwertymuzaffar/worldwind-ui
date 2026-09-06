import { createEmitter, type Unsubscribe } from './events';
import type { WWLayer, WWWmsLayerConfig, WWWorldWindow, WorldWindStatic } from './worldwind-types';

/** Layers that WorldWind ships with, addressable by a short name. */
export type BuiltInLayerKind =
  | 'blue-marble'
  | 'blue-marble-image'
  | 'blue-marble-landsat'
  | 'bing-aerial'
  | 'bing-aerial-labels'
  | 'bing-roads'
  | 'osm'
  | 'atmosphere'
  | 'star-field'
  | 'compass'
  | 'coordinates'
  | 'view-controls'
  | 'frame-statistics'
  | 'tessellation'
  | 'tectonic-plates';

export const BUILT_IN_LAYER_KINDS: readonly BuiltInLayerKind[] = [
  'blue-marble',
  'blue-marble-image',
  'blue-marble-landsat',
  'bing-aerial',
  'bing-aerial-labels',
  'bing-roads',
  'osm',
  'atmosphere',
  'star-field',
  'compass',
  'coordinates',
  'view-controls',
  'frame-statistics',
  'tessellation',
  'tectonic-plates',
];

/** Screen-space layers (compass, coordinates, view controls, statistics) rather than map content. */
export const OVERLAY_LAYER_KINDS: readonly BuiltInLayerKind[] = [
  'compass',
  'coordinates',
  'view-controls',
  'frame-statistics',
];

export const BING_LAYER_KINDS: readonly BuiltInLayerKind[] = ['bing-aerial', 'bing-aerial-labels', 'bing-roads'];

export interface LayerOptions {
  displayName?: string;
  enabled?: boolean;
  /** 0..1 */
  opacity?: number;
  pickEnabled?: boolean;
  minActiveAltitude?: number;
  maxActiveAltitude?: number;
}

export function applyLayerOptions<L extends WWLayer>(layer: L, options: LayerOptions = {}): L {
  if (options.displayName !== undefined) layer.displayName = options.displayName;
  if (options.enabled !== undefined) layer.enabled = options.enabled;
  if (options.opacity !== undefined) layer.opacity = Math.max(0, Math.min(1, options.opacity));
  if (options.pickEnabled !== undefined) layer.pickEnabled = options.pickEnabled;
  if (options.minActiveAltitude !== undefined) layer.minActiveAltitude = options.minActiveAltitude;
  if (options.maxActiveAltitude !== undefined) layer.maxActiveAltitude = options.maxActiveAltitude;
  return layer;
}

/** Instantiates one of WorldWind's built-in layers. Bing layers need `WorldWind.BingMapsKey` to be set. */
export function createBuiltInLayer(
  worldWind: WorldWindStatic,
  wwd: WWWorldWindow,
  kind: BuiltInLayerKind,
  options: LayerOptions = {},
): WWLayer {
  let layer: WWLayer;
  switch (kind) {
    case 'blue-marble':
      layer = new worldWind.BMNGLayer();
      break;
    case 'blue-marble-image':
      layer = new worldWind.BMNGOneImageLayer();
      break;
    case 'blue-marble-landsat':
      layer = new worldWind.BMNGLandsatLayer();
      break;
    case 'bing-aerial':
      layer = new worldWind.BingAerialLayer(worldWind.BingMapsKey);
      break;
    case 'bing-aerial-labels':
      layer = new worldWind.BingAerialWithLabelsLayer(worldWind.BingMapsKey);
      break;
    case 'bing-roads':
      layer = new worldWind.BingRoadsLayer(worldWind.BingMapsKey);
      break;
    case 'osm':
      // Despite its docs, WorldWind uses the argument as the WMS layer name and throws without it.
      // Reported upstream: https://github.com/NASAWorldWind/WebWorldWind/issues/907
      layer = new worldWind.OpenStreetMapImageLayer('osm');
      break;
    case 'atmosphere':
      layer = new worldWind.AtmosphereLayer();
      break;
    case 'star-field':
      layer = new worldWind.StarFieldLayer();
      break;
    case 'compass':
      layer = new worldWind.CompassLayer();
      break;
    case 'coordinates':
      layer = new worldWind.CoordinatesDisplayLayer(wwd);
      break;
    case 'view-controls':
      layer = new worldWind.ViewControlsLayer(wwd);
      break;
    case 'frame-statistics':
      layer = new worldWind.FrameStatisticsLayer(wwd);
      break;
    case 'tessellation':
      layer = new worldWind.ShowTessellationLayer();
      break;
    case 'tectonic-plates':
      layer = new worldWind.TectonicPlatesLayer();
      break;
    default: {
      const unknown: never = kind;
      throw new Error(`worldwind-kit: unknown built-in layer kind "${String(unknown)}"`);
    }
  }
  layer[BUILT_IN_KIND_KEY] = kind;
  return applyLayerOptions(layer, options);
}

/** Property under which {@link createBuiltInLayer} records a layer's kind. */
export const BUILT_IN_KIND_KEY = '__wwuiKind';

/** The built-in kind a layer was created with, if it came from {@link createBuiltInLayer}. */
export function builtInLayerKind(layer: WWLayer): BuiltInLayerKind | undefined {
  return layer[BUILT_IN_KIND_KEY] as BuiltInLayerKind | undefined;
}

/** True for screen-space layers such as the compass or view controls. */
export function isOverlayLayer(layer: WWLayer): boolean {
  const kind = builtInLayerKind(layer);
  return kind !== undefined && OVERLAY_LAYER_KINDS.includes(kind);
}

export interface SectorInput {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

export interface WmsLayerOptions extends LayerOptions {
  /** WMS endpoint, e.g. `https://example.org/geoserver/wms`. */
  service: string;
  /** Comma-separated WMS layer names. */
  layerNames: string;
  styleNames?: string;
  /** Defaults to `image/png`. */
  format?: string;
  /** Tile size in pixels. Defaults to 256. */
  size?: number;
  /** Defaults to 19. */
  numLevels?: number;
  /** Coverage of the layer. Defaults to the whole globe. */
  sector?: SectorInput;
  /** Tile delta in degrees at level 0. Defaults to 36. */
  levelZeroDelta?: number;
  coordinateSystem?: string;
  /** WMS protocol version, e.g. `1.3.0`. */
  version?: string;
  /** Value for the WMS TIME dimension. */
  time?: string | null;
}

export function createWmsLayer(worldWind: WorldWindStatic, options: WmsLayerOptions): WWLayer {
  const delta = options.levelZeroDelta ?? 36;
  const sector = options.sector
    ? new worldWind.Sector(
        options.sector.minLatitude,
        options.sector.maxLatitude,
        options.sector.minLongitude,
        options.sector.maxLongitude,
      )
    : worldWind.Sector.FULL_SPHERE;
  const config: WWWmsLayerConfig = {
    service: options.service,
    layerNames: options.layerNames,
    sector,
    levelZeroDelta: new worldWind.Location(delta, delta),
    numLevels: options.numLevels ?? 19,
    format: options.format ?? 'image/png',
    size: options.size ?? 256,
    title: options.displayName ?? options.layerNames,
  };
  if (options.styleNames !== undefined) config.styleNames = options.styleNames;
  if (options.coordinateSystem !== undefined) config.coordinateSystem = options.coordinateSystem;
  if (options.version !== undefined) config.version = options.version;
  const layer = new worldWind.WmsLayer(config, options.time ?? null);
  return applyLayerOptions(layer, options);
}

export type LayerChangeType = 'add' | 'remove' | 'move' | 'update' | 'clear';

export interface LayerChange {
  type: LayerChangeType;
  /** The affected layer, or null for `clear`. */
  layer: WWLayer | null;
  /** Snapshot of the layer list after the change, bottom to top. */
  layers: readonly WWLayer[];
}

/**
 * Observable wrapper around `WorldWindow.layers`. Every mutation requests a redraw and
 * notifies subscribers, which is what UI such as a layer switcher needs.
 */
export class LayerManager {
  private readonly emitter = createEmitter<LayerChange>();
  private cache: readonly WWLayer[] = [];

  constructor(private readonly wwd: WWWorldWindow) {}

  /**
   * Snapshot of the layers, bottom to top. The same array instance is returned until the
   * layers change, which makes it safe to use as an external-store snapshot.
   */
  get all(): readonly WWLayer[] {
    const live = this.wwd.layers;
    const cache = this.cache;
    if (cache.length === live.length && cache.every((layer, i) => layer === live[i])) return cache;
    this.cache = Object.freeze(live.slice());
    return this.cache;
  }

  get count(): number {
    return this.wwd.layers.length;
  }

  has(layer: WWLayer): boolean {
    return this.wwd.layers.indexOf(layer) !== -1;
  }

  indexOf(layer: WWLayer): number {
    return this.wwd.layers.indexOf(layer);
  }

  find(match: string | ((layer: WWLayer) => boolean)): WWLayer | undefined {
    const predicate = typeof match === 'string' ? (l: WWLayer) => l.displayName === match : match;
    return this.wwd.layers.find(predicate);
  }

  /** Adds a layer on top, or at `index` (0 = bottom). Adding an existing layer is a no-op. */
  add<L extends WWLayer>(layer: L, options: { index?: number } = {}): L {
    if (this.has(layer)) return layer;
    if (options.index !== undefined) {
      this.wwd.insertLayer(Math.max(0, Math.min(this.count, options.index)), layer);
    } else {
      this.wwd.addLayer(layer);
    }
    this.notify('add', layer);
    return layer;
  }

  remove(layer: WWLayer): boolean {
    if (!this.has(layer)) return false;
    this.wwd.removeLayer(layer);
    this.notify('remove', layer);
    return true;
  }

  /** Moves a layer to `index` (0 = bottom). */
  move(layer: WWLayer, index: number): void {
    if (!this.has(layer)) return;
    this.wwd.removeLayer(layer);
    this.wwd.insertLayer(Math.max(0, Math.min(this.count, index)), layer);
    this.notify('move', layer);
  }

  moveUp(layer: WWLayer): void {
    const index = this.indexOf(layer);
    if (index !== -1 && index < this.count - 1) this.move(layer, index + 1);
  }

  moveDown(layer: WWLayer): void {
    const index = this.indexOf(layer);
    if (index > 0) this.move(layer, index - 1);
  }

  update(layer: WWLayer, options: LayerOptions): void {
    applyLayerOptions(layer, options);
    this.notify('update', layer);
  }

  setEnabled(layer: WWLayer, enabled: boolean): void {
    this.update(layer, { enabled });
  }

  toggle(layer: WWLayer): boolean {
    this.setEnabled(layer, !layer.enabled);
    return layer.enabled;
  }

  setOpacity(layer: WWLayer, opacity: number): void {
    this.update(layer, { opacity });
  }

  clear(): void {
    for (const layer of this.all) this.wwd.removeLayer(layer);
    this.notify('clear', null);
  }

  subscribe(listener: (change: LayerChange) => void): Unsubscribe {
    return this.emitter.on(listener);
  }

  destroy(): void {
    this.emitter.clear();
  }

  private notify(type: LayerChangeType, layer: WWLayer | null): void {
    // A fresh snapshot on every change (including property updates) so observers comparing
    // snapshot identity re-render.
    this.cache = Object.freeze(this.wwd.layers.slice());
    this.wwd.redraw();
    this.emitter.emit({ type, layer, layers: this.cache });
  }
}
