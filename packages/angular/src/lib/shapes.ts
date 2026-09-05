import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  type Signal,
} from '@angular/core';
import {
  createGeographicText,
  createPath,
  createPlacemark,
  createPolygon,
  createSurfaceCircle,
  createSurfacePolygon,
  createSurfacePolyline,
  pushpinUrl,
  updateGeographicText,
  updatePath,
  updatePlacemark,
  updatePolygon,
  updateSurfaceCircle,
  updateSurfacePolygon,
  updateSurfacePolyline,
  type AltitudeMode,
  type ColorInput,
  type GeographicTextOptions,
  type LatLon,
  type LatLonAlt,
  type OffsetInput,
  type PathOptions,
  type PathType,
  type PickEvent,
  type PlacemarkHighlight,
  type PlacemarkOptions,
  type PolygonBoundaries,
  type PolygonOptions,
  type PushpinColor,
  type PushpinStyle,
  type ShapeStyle,
  type SurfaceCircleOptions,
  type SurfacePolygonBoundaries,
  type SurfacePolygonOptions,
  type SurfacePolylineOptions,
  type WWGeographicText,
  type WWImageSource,
  type WWPath,
  type WWPlacemark,
  type WWPolygon,
  type WWRenderable,
  type WWSurfaceCircle,
  type WWSurfacePolygon,
  type WWSurfacePolyline,
  type WorldWindStatic,
} from 'worldwind-kit';
import { WwGlobeComponent } from './globe.component';
import { WwRenderableLayerComponent } from './layers';

type Highlightable = WWRenderable & { highlighted?: boolean };

/** Lifecycle and events shared by every shape component. */
@Directive()
export abstract class WwShapeBase<T extends Highlightable, O> {
  protected readonly globeHost = inject(WwGlobeComponent);
  protected readonly layerHost = inject(WwRenderableLayerComponent);

  readonly displayName = input<string | null | undefined>(undefined);
  readonly enabled = input<boolean | undefined>(undefined);
  /** Stored on the renderable's `userProperties`; comes back from picks. */
  readonly userData = input<unknown>(undefined);
  /** Toggle the shape's highlight attributes while the mouse is over it. */
  readonly highlightOnHover = input(false);
  /** Enable `mouseEnter` / `mouseLeave` (hover picking costs GPU time). */
  readonly hoverEvents = input(false);

  readonly shapeClick = output<PickEvent>();
  readonly shapeDoubleClick = output<PickEvent>();
  readonly mouseEnter = output<PickEvent>();
  readonly mouseLeave = output<PickEvent>();

  /** The live WorldWind renderable, null until created. */
  readonly renderable = signal<T | null>(null);

  /** Options assembled from the inputs. Subclasses provide it as a `computed`. */
  protected abstract readonly options: Signal<O>;
  private applied: O | null = null;

  constructor() {
    effect((onCleanup) => {
      const globe = this.globeHost.globe();
      const layer = this.layerHost.layer();
      if (!globe || !layer) return;
      const options = untracked(this.options);
      const renderable = this.create(globe.worldWind, options);
      this.applied = options;
      layer.addRenderable(renderable);
      globe.redraw();
      this.renderable.set(renderable);
      onCleanup(() => {
        layer.removeRenderable(renderable);
        if (!globe.isDisposed) globe.redraw();
        this.renderable.set(null);
      });
    });

    effect(() => {
      const renderable = this.renderable();
      const options = this.options();
      if (!renderable || options === this.applied) return;
      this.applied = options;
      untracked(() => {
        const globe = this.globeHost.globe();
        if (!globe || globe.isDisposed) return;
        this.update(globe.worldWind, renderable, options);
        globe.redraw();
      });
    });

    effect((onCleanup) => {
      const renderable = this.renderable();
      if (!renderable || !this.globeHost.globe()) return;
      const registry = this.globeHost.shapeEvents;
      const offClick = registry.register(renderable, 'click', (event) => this.shapeClick.emit(event));
      const offDouble = registry.register(renderable, 'dblclick', (event) => this.shapeDoubleClick.emit(event));
      onCleanup(() => {
        offClick();
        offDouble();
      });
    });

    effect((onCleanup) => {
      const renderable = this.renderable();
      const globe = this.globeHost.globe();
      const wanted = this.hoverEvents() || this.highlightOnHover();
      if (!renderable || !globe || !wanted) return;
      let over = false;
      const off = this.globeHost.shapeEvents.register(renderable, 'hover', (event) => {
        const now = event.items.some((item) => item.object === renderable);
        if (now === over) return;
        over = now;
        if (untracked(this.highlightOnHover)) {
          renderable.highlighted = now;
          globe.redraw();
        }
        (now ? this.mouseEnter : this.mouseLeave).emit(event);
      });
      onCleanup(() => {
        off();
        if (over && renderable.highlighted) {
          renderable.highlighted = false;
          if (!globe.isDisposed) globe.redraw();
        }
      });
    });
  }

  protected abstract create(worldWind: WorldWindStatic, options: O): T;
  protected abstract update(worldWind: WorldWindStatic, renderable: T, options: Partial<O>): void;

  protected renderableOptions(): { displayName?: string | null; enabled?: boolean; userData?: unknown } {
    const base: { displayName?: string | null; enabled?: boolean; userData?: unknown } = {
      displayName: this.displayName(),
      enabled: this.enabled(),
    };
    const userData = this.userData();
    if (userData !== undefined) base.userData = userData;
    return base;
  }
}

/** Adds the fill/stroke style inputs. */
@Directive()
export abstract class WwStyledShapeBase<T extends Highlightable, O> extends WwShapeBase<T, O> {
  readonly fill = input<ColorInput | null | undefined>(undefined);
  readonly stroke = input<ColorInput | null | undefined>(undefined);
  readonly strokeWidth = input<number | undefined>(undefined);
  readonly drawVerticals = input<boolean | undefined>(undefined);
  readonly applyLighting = input<boolean | undefined>(undefined);
  readonly depthTest = input<boolean | undefined>(undefined);
  readonly imageSource = input<string | null | undefined>(undefined);
  readonly highlight = input<ShapeStyle | null | undefined>(undefined);

  protected styleOptions(): ShapeStyle & { highlight?: ShapeStyle | null } {
    return {
      fill: this.fill(),
      stroke: this.stroke(),
      strokeWidth: this.strokeWidth(),
      drawVerticals: this.drawVerticals(),
      applyLighting: this.applyLighting(),
      depthTest: this.depthTest(),
      imageSource: this.imageSource(),
      highlight: this.highlight(),
    };
  }
}

/** A pushpin, icon or label at a position. Defaults to WorldWind's red pushpin. */
@Component({
  selector: 'ww-placemark',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwPlacemarkComponent extends WwShapeBase<WWPlacemark, PlacemarkOptions> {
  readonly position = input.required<LatLonAlt>();
  readonly label = input<string | null | undefined>(undefined);
  readonly imageSource = input<string | WWImageSource | null | undefined>(undefined);
  /** One of WorldWind's bundled pushpins; `false` for no image. */
  readonly pushpin = input<PushpinColor | false | undefined>(undefined);
  readonly pushpinStyle = input<PushpinStyle | undefined>(undefined);
  readonly imageScale = input<number | undefined>(undefined);
  readonly imageColor = input<ColorInput | undefined>(undefined);
  readonly imageOffset = input<OffsetInput | undefined>(undefined);
  readonly imageRotation = input<number | undefined>(undefined);
  readonly imageTilt = input<number | undefined>(undefined);
  readonly labelColor = input<ColorInput | undefined>(undefined);
  readonly labelFontSize = input<number | undefined>(undefined);
  readonly labelOffset = input<OffsetInput | undefined>(undefined);
  readonly labelOutline = input<boolean | undefined>(undefined);
  readonly altitudeMode = input<AltitudeMode | undefined>(undefined);
  readonly eyeDistanceScaling = input<boolean | undefined>(undefined);
  readonly eyeDistanceScalingThreshold = input<number | undefined>(undefined);
  readonly alwaysOnTop = input<boolean | undefined>(undefined);
  readonly drawLeaderLine = input<boolean | undefined>(undefined);
  readonly leaderLineColor = input<ColorInput | undefined>(undefined);
  readonly depthTest = input<boolean | undefined>(undefined);
  readonly highlight = input<PlacemarkHighlight | null | undefined>(undefined);

  protected override readonly options = computed<PlacemarkOptions>(() => {
    const options: PlacemarkOptions = {
      ...this.renderableOptions(),
      position: this.position(),
      label: this.label(),
      imageSource: this.imageSource(),
      imageScale: this.imageScale(),
      imageColor: this.imageColor(),
      imageOffset: this.imageOffset(),
      imageRotation: this.imageRotation(),
      imageTilt: this.imageTilt(),
      labelColor: this.labelColor(),
      labelFontSize: this.labelFontSize(),
      labelOffset: this.labelOffset(),
      labelOutline: this.labelOutline(),
      altitudeMode: this.altitudeMode(),
      eyeDistanceScaling: this.eyeDistanceScaling(),
      eyeDistanceScalingThreshold: this.eyeDistanceScalingThreshold(),
      alwaysOnTop: this.alwaysOnTop(),
      drawLeaderLine: this.drawLeaderLine(),
      leaderLineColor: this.leaderLineColor(),
      depthTest: this.depthTest(),
      highlight: this.highlight(),
    };
    const pushpin = this.pushpin();
    const globe = this.globeHost.globe();
    if (options.imageSource === undefined && pushpin !== false && globe) {
      options.imageSource = pushpinUrl(globe.worldWind, pushpin ?? 'red', this.pushpinStyle());
      options.imageOffset ??= { x: 0.3, y: 0 };
      options.labelOffset ??= { x: 0.5, y: 1 };
    }
    return options;
  });

  protected override create(worldWind: WorldWindStatic, options: PlacemarkOptions): WWPlacemark {
    return createPlacemark(worldWind, options);
  }

  protected override update(worldWind: WorldWindStatic, renderable: WWPlacemark, options: Partial<PlacemarkOptions>): void {
    updatePlacemark(worldWind, renderable, options);
  }
}

/** A 3D line through positions. */
@Component({
  selector: 'ww-path',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwPathComponent extends WwStyledShapeBase<WWPath, PathOptions> {
  readonly positions = input.required<LatLonAlt[]>();
  readonly altitudeMode = input<AltitudeMode | undefined>(undefined);
  readonly followTerrain = input<boolean | undefined>(undefined);
  readonly extrude = input<boolean | undefined>(undefined);
  readonly pathType = input<PathType | undefined>(undefined);
  readonly numSubSegments = input<number | undefined>(undefined);
  readonly terrainConformance = input<number | undefined>(undefined);

  protected override readonly options = computed<PathOptions>(() => ({
    ...this.renderableOptions(),
    ...this.styleOptions(),
    positions: this.positions(),
    altitudeMode: this.altitudeMode(),
    followTerrain: this.followTerrain(),
    extrude: this.extrude(),
    pathType: this.pathType(),
    numSubSegments: this.numSubSegments(),
    terrainConformance: this.terrainConformance(),
  }));

  protected override create(worldWind: WorldWindStatic, options: PathOptions): WWPath {
    return createPath(worldWind, options);
  }

  protected override update(worldWind: WorldWindStatic, renderable: WWPath, options: Partial<PathOptions>): void {
    updatePath(worldWind, renderable, options);
  }
}

/** A 3D polygon, optionally extruded to the ground. */
@Component({
  selector: 'ww-polygon',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwPolygonComponent extends WwStyledShapeBase<WWPolygon, PolygonOptions> {
  readonly boundaries = input.required<PolygonBoundaries>();
  readonly altitudeMode = input<AltitudeMode | undefined>(undefined);
  readonly extrude = input<boolean | undefined>(undefined);

  protected override readonly options = computed<PolygonOptions>(() => ({
    ...this.renderableOptions(),
    ...this.styleOptions(),
    boundaries: this.boundaries(),
    altitudeMode: this.altitudeMode(),
    extrude: this.extrude(),
  }));

  protected override create(worldWind: WorldWindStatic, options: PolygonOptions): WWPolygon {
    return createPolygon(worldWind, options);
  }

  protected override update(worldWind: WorldWindStatic, renderable: WWPolygon, options: Partial<PolygonOptions>): void {
    updatePolygon(worldWind, renderable, options);
  }
}

/** A line draped on the terrain. */
@Component({
  selector: 'ww-surface-polyline',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwSurfacePolylineComponent extends WwStyledShapeBase<WWSurfacePolyline, SurfacePolylineOptions> {
  readonly locations = input.required<LatLon[]>();
  readonly pathType = input<PathType | undefined>(undefined);

  protected override readonly options = computed<SurfacePolylineOptions>(() => ({
    ...this.renderableOptions(),
    ...this.styleOptions(),
    locations: this.locations(),
    pathType: this.pathType(),
  }));

  protected override create(worldWind: WorldWindStatic, options: SurfacePolylineOptions): WWSurfacePolyline {
    return createSurfacePolyline(worldWind, options);
  }

  protected override update(
    worldWind: WorldWindStatic,
    renderable: WWSurfacePolyline,
    options: Partial<SurfacePolylineOptions>,
  ): void {
    updateSurfacePolyline(worldWind, renderable, options);
  }
}

/** A polygon draped on the terrain. */
@Component({
  selector: 'ww-surface-polygon',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwSurfacePolygonComponent extends WwStyledShapeBase<WWSurfacePolygon, SurfacePolygonOptions> {
  readonly boundaries = input.required<SurfacePolygonBoundaries>();
  readonly pathType = input<PathType | undefined>(undefined);

  protected override readonly options = computed<SurfacePolygonOptions>(() => ({
    ...this.renderableOptions(),
    ...this.styleOptions(),
    boundaries: this.boundaries(),
    pathType: this.pathType(),
  }));

  protected override create(worldWind: WorldWindStatic, options: SurfacePolygonOptions): WWSurfacePolygon {
    return createSurfacePolygon(worldWind, options);
  }

  protected override update(
    worldWind: WorldWindStatic,
    renderable: WWSurfacePolygon,
    options: Partial<SurfacePolygonOptions>,
  ): void {
    updateSurfacePolygon(worldWind, renderable, options);
  }
}

/** A circle draped on the terrain. */
@Component({
  selector: 'ww-surface-circle',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwSurfaceCircleComponent extends WwStyledShapeBase<WWSurfaceCircle, SurfaceCircleOptions> {
  readonly center = input.required<LatLon>();
  /** Metres. */
  readonly radius = input.required<number>();
  readonly pathType = input<PathType | undefined>(undefined);

  protected override readonly options = computed<SurfaceCircleOptions>(() => ({
    ...this.renderableOptions(),
    ...this.styleOptions(),
    center: this.center(),
    radius: this.radius(),
    pathType: this.pathType(),
  }));

  protected override create(worldWind: WorldWindStatic, options: SurfaceCircleOptions): WWSurfaceCircle {
    return createSurfaceCircle(worldWind, options);
  }

  protected override update(
    worldWind: WorldWindStatic,
    renderable: WWSurfaceCircle,
    options: Partial<SurfaceCircleOptions>,
  ): void {
    updateSurfaceCircle(worldWind, renderable, options);
  }
}

/** A text label anchored to a position. */
@Component({
  selector: 'ww-geographic-text',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwGeographicTextComponent extends WwShapeBase<WWGeographicText, GeographicTextOptions> {
  readonly position = input.required<LatLonAlt>();
  readonly text = input.required<string>();
  readonly color = input<ColorInput | undefined>(undefined);
  readonly fontSize = input<number | undefined>(undefined);
  readonly outline = input<boolean | undefined>(undefined);
  readonly outlineColor = input<ColorInput | undefined>(undefined);
  readonly offset = input<OffsetInput | undefined>(undefined);
  readonly altitudeMode = input<AltitudeMode | undefined>(undefined);
  readonly alwaysOnTop = input<boolean | undefined>(undefined);
  readonly depthTest = input<boolean | undefined>(undefined);

  protected override readonly options = computed<GeographicTextOptions>(() => ({
    ...this.renderableOptions(),
    position: this.position(),
    text: this.text(),
    color: this.color(),
    fontSize: this.fontSize(),
    outline: this.outline(),
    outlineColor: this.outlineColor(),
    offset: this.offset(),
    altitudeMode: this.altitudeMode(),
    alwaysOnTop: this.alwaysOnTop(),
    depthTest: this.depthTest(),
  }));

  protected override create(worldWind: WorldWindStatic, options: GeographicTextOptions): WWGeographicText {
    return createGeographicText(worldWind, options);
  }

  protected override update(
    worldWind: WorldWindStatic,
    renderable: WWGeographicText,
    options: Partial<GeographicTextOptions>,
  ): void {
    updateGeographicText(worldWind, renderable, options);
  }
}
