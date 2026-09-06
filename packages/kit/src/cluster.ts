import { pushpinUrl } from './assets';
import { createEmitter, type Unsubscribe } from './events';
import type { LatLon } from './geo';
import type { GlobeController } from './globe';
import type { LayerOptions } from './layers';
import { createPlacemark } from './shapes';
import type { WWRenderable, WWRenderableLayer, WorldWindStatic } from './worldwind-types';

/** A group of nearby items drawn as one marker.
 * @category Clustering
 */
export interface Cluster<T> {
  latitude: number;
  longitude: number;
  count: number;
  items: T[];
}

/** @category Clustering */
export interface ClusterOptions<T> {
  /** Fewest items that form a cluster; cells with fewer are drawn individually. Default 2. */
  minPoints?: number;
  /** Reads an item's location. Defaults to its `latitude` and `longitude` fields. */
  getPosition?: (item: T) => LatLon;
}

/** @category Clustering */
export interface ClusterResult<T> {
  clusters: Cluster<T>[];
  /** Items that did not join a cluster. */
  singles: T[];
}

const DEG_TO_RAD = Math.PI / 180;
const METERS_PER_DEGREE = 111_320;

function defaultPosition<T>(item: T): LatLon {
  return item as unknown as LatLon;
}

/**
 * Groups items on a grid of `cellDegrees` (longitude cells widen with latitude so they stay
 * roughly square on screen). Pure and synchronous; {@link ClusterLayer} calls it on zoom.
 * @category Clustering
 */
export function clusterItems<T>(items: readonly T[], cellDegrees: number, options: ClusterOptions<T> = {}): ClusterResult<T> {
  const minPoints = Math.max(2, options.minPoints ?? 2);
  const getPosition = options.getPosition ?? defaultPosition;
  if (!(cellDegrees > 0)) return { clusters: [], singles: items.slice() };
  const cells = new Map<string, { latSum: number; lonSum: number; items: T[] }>();
  for (const item of items) {
    const { latitude, longitude } = getPosition(item);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const row = Math.floor((latitude + 90) / cellDegrees);
    const rowLatitude = Math.min(89.9, Math.max(-89.9, (row + 0.5) * cellDegrees - 90));
    const lonCell = cellDegrees / Math.max(Math.cos(rowLatitude * DEG_TO_RAD), 0.05);
    const key = `${row}:${Math.floor((longitude + 180) / lonCell)}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = { latSum: 0, lonSum: 0, items: [] };
      cells.set(key, cell);
    }
    cell.latSum += latitude;
    cell.lonSum += longitude;
    cell.items.push(item);
  }
  const clusters: Cluster<T>[] = [];
  const singles: T[] = [];
  for (const cell of cells.values()) {
    if (cell.items.length >= minPoints) {
      clusters.push({ latitude: cell.latSum / cell.items.length, longitude: cell.lonSum / cell.items.length, count: cell.items.length, items: cell.items });
    } else {
      singles.push(...cell.items);
    }
  }
  return { clusters, singles };
}

/** Grid cell size in degrees for a marker radius in pixels at a resolution, snapped to quarter octaves so tiny zoom changes do not re-cluster.
 * @category Clustering
 */
export function clusterCellDegrees(radiusPixels: number, metersPerPixel: number): number {
  const exact = (radiusPixels * metersPerPixel) / METERS_PER_DEGREE;
  if (!(exact > 0)) return 0;
  return 2 ** (Math.round(Math.log2(exact) * 4) / 4);
}

const iconCache = new Map<string, string>();

/** An SVG data URL of a circle with the count inside, as used by the default cluster marker.
 * @category Clustering
 */
export function clusterIconUrl(count: number, color = '#38bdf8', textColor = '#0f172a'): string {
  const size = count < 10 ? 32 : count < 100 ? 40 : 48;
  const label = count < 1000 ? String(count) : `${Math.round(count / 100) / 10}k`;
  const key = `${label}|${size}|${color}|${textColor}`;
  let url = iconCache.get(key);
  if (!url) {
    const half = size / 2;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<circle cx="${half}" cy="${half}" r="${half - 1}" fill="${color}" fill-opacity="0.35"/>` +
      `<circle cx="${half}" cy="${half}" r="${half - 5}" fill="${color}"/>` +
      `<text x="${half}" y="${half}" dy="0.36em" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${size < 40 ? 12 : 13}" font-weight="700" fill="${textColor}">${label}</text></svg>`;
    url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    iconCache.set(key, url);
  }
  return url;
}

/** @category Clustering */
export interface ClusterLayerOptions<T> extends ClusterOptions<T> {
  /** Shown in layer switchers. Default `Clusters`. */
  layerName?: string;
  /** Marker radius in CSS pixels: items closer than this merge. Default 60. */
  radius?: number;
  /** Builds the renderable for an item drawn on its own. Defaults to a small red pushpin. */
  renderItem?: (item: T, worldWind: WorldWindStatic) => WWRenderable;
  /** Builds the renderable for a cluster. Defaults to a circle with the count. */
  renderCluster?: (cluster: Cluster<T>, worldWind: WorldWindStatic) => WWRenderable;
  /** Colour of the default cluster marker. */
  color?: string;
  textColor?: string;
  /** Fly closer to a cluster when it is clicked. Default true. */
  zoomOnClick?: boolean;
  /** Milliseconds between re-clusterings while the zoom keeps changing. Default 100. */
  throttle?: number;
  /** Options for the layer itself (`enabled`, `opacity`, `attribution`, ...). */
  layer?: LayerOptions;
}

/** @category Clustering */
export interface ClusterLayerState<T> extends ClusterResult<T> {
  /** Grid cell size used, in degrees; 0 before the first frame. */
  cellDegrees: number;
}

/**
 * A renderable layer that merges nearby items into count markers, re-clustering when the zoom
 * changes. Items are anything with a position; clicking a cluster flies closer.
 * @example
 * ```ts
 * const stations = new ClusterLayer(globe, points, { layerName: 'Stations', radius: 50 });
 * globe.on('click', (event) => {
 *   const item = stations.itemAt(event.top?.object);
 *   if (item) console.log('clicked', item);
 * });
 * ```
 * @category Clustering
 */
export class ClusterLayer<T = LatLon> {
  readonly layer: WWRenderableLayer;

  private readonly emitter = createEmitter<ClusterLayerState<T>>();
  private readonly options: ClusterLayerOptions<T> & Required<Pick<ClusterLayerOptions<T>, 'radius' | 'zoomOnClick' | 'throttle'>>;
  private readonly cleanups: Unsubscribe[] = [];
  private readonly itemRenderables = new Map<T, WWRenderable>();
  private readonly clusterByObject = new Map<unknown, Cluster<T>>();
  private readonly itemByObject = new Map<unknown, T>();
  private items: readonly T[];
  private cellDegrees = 0;
  private metersPerPixel: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  private snapshot: ClusterLayerState<T> = { clusters: [], singles: [], cellDegrees: 0 };

  constructor(
    private readonly globe: GlobeController,
    items: readonly T[],
    options: ClusterLayerOptions<T> = {},
  ) {
    // Adapters pass unset inputs as explicit undefined, which must not override the defaults.
    const given = Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)) as ClusterLayerOptions<T>;
    this.options = { radius: 60, zoomOnClick: true, throttle: 100, ...given };
    this.items = items;
    this.layer = globe.addRenderableLayer(options.layerName ?? 'Clusters', options.layer);
    this.cleanups.push(globe.trackScale((state) => this.onScale(state?.metersPerPixel ?? null)));
    if (this.options.zoomOnClick) {
      this.cleanups.push(
        globe.on('click', (event) => {
          const cluster = this.clusterAt(event.top?.object);
          if (cluster) void this.zoomTo(cluster);
        }),
      );
    }
  }

  /** Clusters and singles of the last pass; the same object until it changes. */
  get state(): ClusterLayerState<T> {
    return this.snapshot;
  }

  setItems(items: readonly T[]): void {
    this.items = items;
    this.itemRenderables.clear();
    this.rebuild();
  }

  /** The cluster a picked renderable stands for, if any. */
  clusterAt(object: unknown): Cluster<T> | null {
    return this.clusterByObject.get(object) ?? null;
  }

  /** The item a picked renderable stands for, if it is drawn on its own. */
  itemAt(object: unknown): T | null {
    return this.itemByObject.get(object) ?? null;
  }

  /** Flies to a cluster at a quarter of the current range. */
  zoomTo(cluster: Cluster<T>, options: { duration?: number; minRange?: number } = {}): Promise<unknown> {
    const range = Math.max(options.minRange ?? 20_000, this.globe.camera.get().range / 4);
    return this.globe.camera.goTo({ latitude: cluster.latitude, longitude: cluster.longitude, range }, { duration: options.duration ?? 800 });
  }

  /** Re-clusters now with the current zoom. */
  update(): void {
    this.rebuild();
  }

  subscribe(listener: (state: ClusterLayerState<T>) => void): Unsubscribe {
    return this.emitter.on(listener);
  }

  destroy(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.emitter.clear();
    if (!this.globe.isDisposed) this.globe.layers.remove(this.layer);
  }

  private onScale(metersPerPixel: number | null): void {
    if (metersPerPixel === null) return;
    this.metersPerPixel = metersPerPixel;
    const cell = clusterCellDegrees(this.options.radius, metersPerPixel);
    if (cell === this.cellDegrees && this.snapshot.cellDegrees !== 0) return;
    if (this.options.throttle <= 0) {
      this.rebuild();
      return;
    }
    if (this.timer !== null) {
      this.dirty = true;
      return;
    }
    this.rebuild();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.dirty) {
        this.dirty = false;
        this.onScale(this.metersPerPixel);
      }
    }, this.options.throttle);
  }

  private rebuild(): void {
    const ww = this.globe.worldWind;
    if (this.metersPerPixel === null) return;
    this.cellDegrees = clusterCellDegrees(this.options.radius, this.metersPerPixel);
    const result = clusterItems(this.items, this.cellDegrees, { minPoints: this.options.minPoints, getPosition: this.options.getPosition });
    this.clusterByObject.clear();
    this.itemByObject.clear();
    const renderables: WWRenderable[] = [];
    for (const cluster of result.clusters) {
      const renderable = (this.options.renderCluster ?? this.defaultCluster)(cluster, ww);
      this.clusterByObject.set(renderable, cluster);
      renderables.push(renderable);
    }
    for (const item of result.singles) {
      let renderable = this.itemRenderables.get(item);
      if (!renderable) {
        renderable = (this.options.renderItem ?? this.defaultItem)(item, ww);
        this.itemRenderables.set(item, renderable);
      }
      this.itemByObject.set(renderable, item);
      renderables.push(renderable);
    }
    this.layer.removeAllRenderables();
    this.layer.addRenderables(renderables);
    this.globe.redraw();
    this.snapshot = { ...result, cellDegrees: this.cellDegrees };
    this.emitter.emit(this.snapshot);
  }

  private readonly defaultCluster = (cluster: Cluster<T>, ww: WorldWindStatic): WWRenderable =>
    createPlacemark(ww, {
      position: { latitude: cluster.latitude, longitude: cluster.longitude },
      imageSource: clusterIconUrl(cluster.count, this.options.color, this.options.textColor),
      imageOffset: { x: 0.5, y: 0.5 },
      altitudeMode: 'clampToGround',
      eyeDistanceScaling: false,
      alwaysOnTop: true,
      userData: cluster,
    });

  private readonly defaultItem = (item: T, ww: WorldWindStatic): WWRenderable => {
    const position = (this.options.getPosition ?? defaultPosition)(item);
    return createPlacemark(ww, {
      position,
      imageSource: pushpinUrl(ww, 'red'),
      imageScale: 0.6,
      altitudeMode: 'clampToGround',
      userData: item,
    });
  };
}
