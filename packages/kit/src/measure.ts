import { whiteDotUrl } from './assets';
import { createEmitter, type Unsubscribe } from './events';
import { toPositions, type LatLonAlt } from './geo';
import type { GlobeController } from './globe';
import { markInternalLayer } from './layers';
import {
  createPlacemark,
  createSurfacePolyline,
  pathTypeValue,
  type PathType,
  type ShapeStyle,
  updateSurfacePolyline,
} from './shapes';
import type { WWPlacemark, WWRenderableLayer, WWSurfacePolyline } from './worldwind-types';

export interface MeasurementState {
  points: readonly LatLonAlt[];
  /** Length of the path through the points, in metres. */
  lengthMeters: number;
  /** Area of the polygon closed through the points (three or more), in square metres, else null. */
  areaSquareMeters: number | null;
  /** Whether clicks on the globe add points. */
  active: boolean;
}

export interface MeasureToolOptions {
  pathType?: PathType;
  followTerrain?: boolean;
  /** Style of the measured line. Defaults to a cyan 2 px line. */
  line?: ShapeStyle;
  /** Image for the vertex markers. Defaults to WorldWind's white dot. */
  markerImage?: string | null;
  markerScale?: number;
  layerName?: string;
}

/** Square metres as `m²`, `ha` or `km²`. */
export function formatArea(squareMeters: number): string {
  if (!Number.isFinite(squareMeters)) return '';
  if (squareMeters < 10_000) return `${Math.round(squareMeters).toLocaleString('en-US')} m²`;
  if (squareMeters < 1_000_000) return `${(squareMeters / 10_000).toLocaleString('en-US', { maximumFractionDigits: 2 })} ha`;
  return `${(squareMeters / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })} km²`;
}

/**
 * Click-to-measure distances and areas. Points are added by clicking the globe while the tool
 * is active; the line and vertex markers live in the tool's own layer.
 */
export class MeasureTool {
  readonly layer: WWRenderableLayer;

  private readonly emitter = createEmitter<MeasurementState>();
  private readonly options: Required<Pick<MeasureToolOptions, 'pathType' | 'followTerrain' | 'markerScale'>> & MeasureToolOptions;
  private points: LatLonAlt[] = [];
  private line: WWSurfacePolyline | null = null;
  private markers: WWPlacemark[] = [];
  private stopClicks: Unsubscribe | null = null;
  private snapshot: MeasurementState;

  constructor(
    private readonly globe: GlobeController,
    options: MeasureToolOptions = {},
  ) {
    this.options = { pathType: 'greatCircle', followTerrain: true, markerScale: 0.5, ...options };
    this.layer = markInternalLayer(globe.addRenderableLayer(options.layerName ?? 'Measurement', { pickEnabled: false }));
    this.snapshot = { points: [], lengthMeters: 0, areaSquareMeters: null, active: false };
  }

  /** Current measurement; the same object until something changes. */
  get state(): MeasurementState {
    return this.snapshot;
  }

  start(): void {
    if (this.stopClicks) return;
    this.stopClicks = this.globe.on('click', (event) => {
      if (event.position) this.add(event.position);
    });
    this.publish();
  }

  stop(): void {
    this.stopClicks?.();
    this.stopClicks = null;
    this.publish();
  }

  toggle(): void {
    if (this.stopClicks) this.stop();
    else this.start();
  }

  add(point: LatLonAlt): void {
    this.points = [...this.points, { latitude: point.latitude, longitude: point.longitude, altitude: point.altitude ?? 0 }];
    this.render();
  }

  undo(): void {
    if (this.points.length === 0) return;
    this.points = this.points.slice(0, -1);
    this.render();
  }

  clear(): void {
    if (this.points.length === 0) return;
    this.points = [];
    this.render();
  }

  subscribe(listener: (state: MeasurementState) => void): Unsubscribe {
    return this.emitter.on(listener);
  }

  /** Stops measuring and removes the tool's layer from the globe. */
  destroy(): void {
    this.stop();
    this.emitter.clear();
    if (!this.globe.isDisposed) this.globe.layers.remove(this.layer);
  }

  private render(): void {
    const ww = this.globe.worldWind;
    this.layer.removeAllRenderables();
    this.markers = [];
    this.line = null;

    if (this.points.length >= 2) {
      const style: ShapeStyle = { stroke: '#38bdf8', strokeWidth: 2, ...this.options.line };
      this.line = createSurfacePolyline(ww, { locations: this.points, pathType: this.options.pathType, ...style });
      updateSurfacePolyline(ww, this.line, {});
      this.layer.addRenderable(this.line);
    }
    for (const point of this.points) {
      const marker = createPlacemark(ww, {
        position: point,
        imageSource: this.options.markerImage === undefined ? whiteDotUrl(ww) : this.options.markerImage,
        imageScale: this.options.markerScale,
        imageOffset: { x: 0.5, y: 0.5 },
        altitudeMode: 'clampToGround',
        eyeDistanceScaling: false,
      });
      this.markers.push(marker);
      this.layer.addRenderable(marker);
    }
    this.globe.redraw();
    this.publish();
  }

  private measure(): { lengthMeters: number; areaSquareMeters: number | null } {
    const ww = this.globe.worldWind;
    const wwd = this.globe.wwd;
    const pathType = pathTypeValue(ww, this.options.pathType);
    const positions = toPositions(ww, this.points);
    const lengthMeters =
      positions.length >= 2 ? new ww.LengthMeasurer(wwd).getLength(positions, this.options.followTerrain, pathType) : 0;
    const areaSquareMeters =
      positions.length >= 3 ? new ww.AreaMeasurer(wwd).getArea(positions, this.options.followTerrain, pathType) : null;
    return { lengthMeters, areaSquareMeters };
  }

  private publish(): void {
    this.snapshot = { points: this.points, ...this.measure(), active: this.stopClicks !== null };
    this.emitter.emit(this.snapshot);
  }
}
