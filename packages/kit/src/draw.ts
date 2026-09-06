import { pushpinUrl, whiteDotUrl } from './assets';
import { createEmitter, type Unsubscribe } from './events';
import type { LatLonAlt } from './geo';
import type { GlobeController } from './globe';
import { markInternalLayer } from './layers';
import { pickAt, type PickEvent, type PickedItem } from './picking';
import {
  createPlacemark,
  createSurfacePolygon,
  createSurfacePolyline,
  updatePlacemark,
  updateSurfacePolygon,
  updateSurfacePolyline,
  type PathType,
  type ShapeStyle,
} from './shapes';
import type { WWPlacemark, WWRenderable, WWRenderableLayer, WWSurfacePolygon, WWSurfacePolyline } from './worldwind-types';

/** @category Tools */
export type DrawMode = 'point' | 'line' | 'polygon';

/** A feature drawn with the {@link DrawTool}.
 * @category Tools
 */
export interface DrawFeature {
  id: string;
  type: DrawMode;
  positions: readonly LatLonAlt[];
  properties: Record<string, unknown>;
}

/** @category Tools */
export interface DrawState {
  /** The kind of feature clicks create, or null while not drawing. */
  mode: DrawMode | null;
  /** Vertices of the line or polygon being drawn. */
  draft: readonly LatLonAlt[];
  features: readonly DrawFeature[];
  selectedId: string | null;
  /** Index of the selected vertex of the selected feature, if any. */
  selectedVertex: number | null;
  /** True while a vertex is being dragged. */
  dragging: boolean;
}

/** @category Tools */
export interface DrawToolOptions {
  layerName?: string;
  pathType?: PathType;
  /** Image for point features. Defaults to a red pushpin. */
  pointImage?: string | null;
  pointScale?: number;
  /** Style of lines. Defaults to an orange 3 px line. */
  line?: ShapeStyle;
  /** Style of polygons. Defaults to a translucent orange fill. */
  polygon?: ShapeStyle;
  /** Applied on top of the line or polygon style while a feature is selected. */
  selected?: ShapeStyle;
  /** Image for vertex handles. Defaults to WorldWind's white dot. */
  handleImage?: string | null;
  handleScale?: number;
  /** Let features be selected, dragged and deleted. Default true. */
  editable?: boolean;
  /** Finish a line or polygon on double-click. Default true. */
  finishOnDoubleClick?: boolean;
  /** On the focused canvas: Escape cancels, Enter finishes, Delete and Backspace remove. Default true. */
  keyboard?: boolean;
  /** Prefix of generated feature ids. Default `feature-`. */
  idPrefix?: string;
}

/** @category Tools */
export interface DrawGeoJsonGeometry {
  type: 'Point' | 'LineString' | 'Polygon';
  coordinates: number[] | number[][] | number[][][];
}

/** @category Tools */
export interface DrawGeoJsonFeature {
  type: 'Feature';
  id?: string | number;
  properties: Record<string, unknown> | null;
  geometry: DrawGeoJsonGeometry | null;
}

/** @category Tools */
export interface DrawFeatureCollection {
  type: 'FeatureCollection';
  features: DrawGeoJsonFeature[];
}

/** @category Tools */
export interface DrawFeatureInput {
  id?: string;
  type: DrawMode;
  positions: readonly LatLonAlt[];
  properties?: Record<string, unknown>;
}

/** Fewest vertices a feature of each kind needs.
 * @category Tools
 */
export const MIN_DRAW_VERTICES: Record<DrawMode, number> = { point: 1, line: 2, polygon: 3 };

const DEFAULT_LINE: ShapeStyle = { stroke: '#f97316', strokeWidth: 3 };
const DEFAULT_POLYGON: ShapeStyle = { fill: 'rgba(249, 115, 22, 0.25)', stroke: '#f97316', strokeWidth: 2 };
const DEFAULT_SELECTED: ShapeStyle = { stroke: '#fde047' };
const SAME_POINT = 1e-9;

interface Rendered {
  type: DrawMode;
  shape: WWSurfacePolyline | WWSurfacePolygon | null;
  marker: WWPlacemark | null;
  handles: WWPlacemark[];
}

interface Hit {
  id: string;
  vertex: number | null;
}

function clean(position: LatLonAlt): LatLonAlt {
  return { latitude: position.latitude, longitude: position.longitude, altitude: position.altitude ?? 0 };
}

function samePoint(a: LatLonAlt, b: LatLonAlt): boolean {
  return Math.abs(a.latitude - b.latitude) < SAME_POINT && Math.abs(a.longitude - b.longitude) < SAME_POINT;
}

function withoutTrailingDuplicate(points: readonly LatLonAlt[]): LatLonAlt[] {
  const result = points.slice();
  while (result.length >= 2 && samePoint(result[result.length - 1]!, result[result.length - 2]!)) result.pop();
  return result;
}

/**
 * Draws and edits points, lines and polygons on the globe.
 *
 * Call `start('polygon')` and clicks add vertices; a double-click, `finish()` or Enter completes
 * the shape. Finished features can be clicked to select them, their vertices dragged, and
 * removed with Delete. Everything lives in the tool's own layer and round-trips through GeoJSON.
 * @example
 * ```ts
 * const draw = new DrawTool(globe);
 * draw.subscribe((state) => console.log(state.features.length, 'features'));
 * draw.start('polygon');
 * // ... user clicks three times and presses Enter ...
 * console.log(draw.toGeoJson());
 * ```
 * @category Tools
 */
export class DrawTool {
  readonly layer: WWRenderableLayer;

  private readonly emitter = createEmitter<DrawState>();
  private readonly options: Required<
    Pick<DrawToolOptions, 'pathType' | 'pointScale' | 'handleScale' | 'editable' | 'finishOnDoubleClick' | 'keyboard' | 'idPrefix'>
  > &
    DrawToolOptions;
  private readonly rendered = new Map<string, Rendered>();
  private readonly objectIndex = new Map<unknown, Hit>();
  private readonly cleanups: Unsubscribe[] = [];
  private draftShape: WWSurfacePolyline | WWSurfacePolygon | null = null;
  private draftHandles: WWPlacemark[] = [];
  private mode: DrawMode | null = null;
  private draft: LatLonAlt[] = [];
  private features: DrawFeature[] = [];
  private selectedId: string | null = null;
  private selectedVertex: number | null = null;
  private dragging = false;
  private endDrag: (() => void) | null = null;
  private nextId = 1;
  private snapshot: DrawState;

  constructor(
    private readonly globe: GlobeController,
    options: DrawToolOptions = {},
  ) {
    // Adapters pass unset inputs as explicit undefined, which must not override the defaults.
    const given = Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)) as DrawToolOptions;
    this.options = {
      pathType: 'greatCircle',
      pointScale: 1,
      handleScale: 0.5,
      editable: true,
      finishOnDoubleClick: true,
      keyboard: true,
      idPrefix: 'feature-',
      ...given,
    };
    this.layer = markInternalLayer(globe.addRenderableLayer(options.layerName ?? 'Drawings', { pickEnabled: true }));
    this.snapshot = this.buildState();
    this.cleanups.push(globe.on('click', (event) => this.onClick(event)));
    if (this.options.finishOnDoubleClick) this.cleanups.push(globe.on('dblclick', () => this.onDoubleClick()));
    if (this.options.editable) this.cleanups.push(this.attachDragging());
    if (this.options.keyboard) this.cleanups.push(this.attachKeyboard());
  }

  /** Current state; the same object until something changes. */
  get state(): DrawState {
    return this.snapshot;
  }

  /** Starts drawing features of a kind; clicks on the globe now add points. */
  start(mode: DrawMode): void {
    if (this.mode === mode) return;
    this.discardDraft();
    this.mode = mode;
    this.setSelection(null, null);
    this.publish();
  }

  /** Stops drawing (finished features stay); an unfinished draft is discarded. */
  stop(): void {
    if (!this.mode) return;
    this.discardDraft();
    this.mode = null;
    this.publish();
  }

  /** Completes the line or polygon being drawn, when it has enough vertices. */
  finish(): DrawFeature | null {
    const mode = this.mode;
    if (!mode || mode === 'point') return null;
    const positions = withoutTrailingDuplicate(this.draft);
    if (positions.length < MIN_DRAW_VERTICES[mode]) return null;
    this.discardDraft();
    const feature = this.insert({ type: mode, positions });
    this.setSelection(feature.id, null);
    this.publish();
    return feature;
  }

  /** Throws the current draft away. */
  cancel(): void {
    if (this.draft.length === 0) return;
    this.discardDraft();
    this.publish();
  }

  /** Removes the last draft vertex. */
  undo(): void {
    if (this.draft.length === 0) return;
    this.draft = this.draft.slice(0, -1);
    this.renderDraft();
    this.publish();
  }

  /** Adds a finished feature programmatically. */
  add(input: DrawFeatureInput): DrawFeature {
    const feature = this.insert(input);
    this.publish();
    return feature;
  }

  /** Replaces a feature's positions or properties. */
  update(id: string, changes: { positions?: readonly LatLonAlt[]; properties?: Record<string, unknown> }): void {
    const index = this.features.findIndex((feature) => feature.id === id);
    if (index === -1) return;
    const current = this.features[index]!;
    const positions = changes.positions ? changes.positions.map(clean) : current.positions;
    if (positions.length < MIN_DRAW_VERTICES[current.type]) return;
    const next: DrawFeature = { ...current, positions, properties: changes.properties ?? current.properties };
    this.features = this.features.map((feature) => (feature.id === id ? next : feature));
    this.renderFeature(next);
    this.globe.redraw();
    this.publish();
  }

  select(id: string | null, vertex: number | null = null): void {
    const feature = id ? this.find(id) : null;
    this.setSelection(feature ? feature.id : null, feature && vertex !== null && vertex < feature.positions.length ? vertex : null);
    this.publish();
  }

  remove(id: string): boolean {
    const feature = this.find(id);
    if (!feature) return false;
    this.unrender(id);
    this.features = this.features.filter((f) => f.id !== id);
    if (this.selectedId === id) {
      this.selectedId = null;
      this.selectedVertex = null;
    }
    this.globe.redraw();
    this.publish();
    return true;
  }

  /** Removes the selected vertex when the feature can spare it, else the selected feature. */
  removeSelected(): void {
    const feature = this.selectedId ? this.find(this.selectedId) : null;
    if (!feature) return;
    if (this.selectedVertex !== null && feature.positions.length > MIN_DRAW_VERTICES[feature.type]) {
      const positions = feature.positions.filter((_, i) => i !== this.selectedVertex);
      this.selectedVertex = null;
      this.update(feature.id, { positions });
      return;
    }
    this.remove(feature.id);
  }

  clear(): void {
    if (this.features.length === 0 && this.draft.length === 0) return;
    this.discardDraft();
    for (const id of Array.from(this.rendered.keys())) this.unrender(id);
    this.features = [];
    this.selectedId = null;
    this.selectedVertex = null;
    this.globe.redraw();
    this.publish();
  }

  find(id: string): DrawFeature | undefined {
    return this.features.find((feature) => feature.id === id);
  }

  /** The feature a picked renderable belongs to, if it is one of the tool's. */
  featureAt(object: unknown): DrawFeature | null {
    const hit = this.objectIndex.get(object);
    return hit ? (this.find(hit.id) ?? null) : null;
  }

  toGeoJson(): DrawFeatureCollection {
    return {
      type: 'FeatureCollection',
      features: this.features.map((feature) => {
        const coordinates = feature.positions.map((p) => [p.longitude, p.latitude, p.altitude ?? 0]);
        const geometry: DrawGeoJsonGeometry =
          feature.type === 'point'
            ? { type: 'Point', coordinates: coordinates[0]! }
            : feature.type === 'line'
              ? { type: 'LineString', coordinates }
              : { type: 'Polygon', coordinates: [[...coordinates, coordinates[0]!]] };
        return { type: 'Feature', id: feature.id, properties: { ...feature.properties }, geometry };
      }),
    };
  }

  /** Adds Point, LineString and Polygon features from GeoJSON (other geometries are skipped). */
  load(collection: DrawFeatureCollection, options: { replace?: boolean } = {}): DrawFeature[] {
    if (options.replace) this.clear();
    const added: DrawFeature[] = [];
    for (const feature of collection.features ?? []) {
      const geometry = feature.geometry;
      if (!geometry) continue;
      const toPositions = (ring: number[][]) =>
        ring
          .filter((c) => Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
          .map(([longitude, latitude, altitude]) => ({ latitude: latitude!, longitude: longitude!, altitude: Number.isFinite(altitude) ? altitude! : 0 }));
      let input: DrawFeatureInput | null = null;
      if (geometry.type === 'Point') {
        input = { type: 'point', positions: toPositions([geometry.coordinates as number[]]) };
      } else if (geometry.type === 'LineString') {
        input = { type: 'line', positions: toPositions(geometry.coordinates as number[][]) };
      } else if (geometry.type === 'Polygon') {
        const ring = toPositions(((geometry.coordinates as number[][][])[0] ?? []) as number[][]);
        if (ring.length >= 2 && samePoint(ring[0]!, ring[ring.length - 1]!)) ring.pop();
        input = { type: 'polygon', positions: ring };
      }
      if (!input || input.positions.length < MIN_DRAW_VERTICES[input.type]) continue;
      input.properties = { ...(feature.properties ?? {}) };
      if (feature.id !== undefined && !this.find(String(feature.id))) input.id = String(feature.id);
      added.push(this.insert(input));
    }
    if (added.length) this.publish();
    return added;
  }

  subscribe(listener: (state: DrawState) => void): Unsubscribe {
    return this.emitter.on(listener);
  }

  /** Stops the tool and removes its layer from the globe. */
  destroy(): void {
    this.endDrag?.();
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.emitter.clear();
    if (!this.globe.isDisposed) this.globe.layers.remove(this.layer);
  }

  private insert(input: DrawFeatureInput): DrawFeature {
    const positions = input.positions.map(clean);
    if (positions.length < MIN_DRAW_VERTICES[input.type]) {
      throw new Error(`worldwind-kit: a ${input.type} needs at least ${MIN_DRAW_VERTICES[input.type]} position(s)`);
    }
    let id = input.id ?? `${this.options.idPrefix}${this.nextId}`;
    while (this.find(id)) {
      this.nextId += 1;
      id = `${this.options.idPrefix}${this.nextId}`;
    }
    if (id === `${this.options.idPrefix}${this.nextId}`) this.nextId += 1;
    const feature: DrawFeature = { id, type: input.type, positions, properties: { ...(input.properties ?? {}) } };
    this.features = [...this.features, feature];
    this.renderFeature(feature);
    this.globe.redraw();
    return feature;
  }

  private onClick(event: PickEvent): void {
    if (this.dragging) return;
    if (this.mode) {
      if (!event.position) return;
      const position = clean(event.position);
      if (this.mode === 'point') {
        const feature = this.insert({ type: 'point', positions: [position] });
        this.setSelection(feature.id, null);
        this.publish();
        return;
      }
      this.draft = [...this.draft, position];
      this.renderDraft();
      this.publish();
      return;
    }
    if (!this.options.editable) return;
    const hit = this.hit(event.items);
    this.setSelection(hit?.id ?? null, hit?.vertex ?? null);
    this.publish();
  }

  private onDoubleClick(): void {
    if (this.mode !== 'line' && this.mode !== 'polygon') return;
    // WorldWind reports two quick clicks as a double-click even when they are far apart; only a
    // double-click on one spot (both clicks added the same vertex) finishes the shape.
    const count = this.draft.length;
    if (count >= 2 && samePoint(this.draft[count - 1]!, this.draft[count - 2]!)) this.finish();
  }

  private hit(items: readonly PickedItem[]): Hit | null {
    for (const item of items) {
      if (item.isTerrain) continue;
      const hit = this.objectIndex.get(item.object);
      if (hit) return hit;
    }
    return null;
  }

  private attachDragging(): Unsubscribe {
    const pointer = typeof PointerEvent !== 'undefined';
    const downType = pointer ? 'pointerdown' : 'mousedown';
    const moveType = pointer ? 'pointermove' : 'mousemove';
    const upTypes = pointer ? ['pointerup', 'pointercancel'] : ['mouseup'];
    const wwd = this.globe.wwd;

    const onDown = (event: PointerEvent | MouseEvent) => {
      if (this.dragging) return;
      if (event.button !== undefined && event.button !== 0) return;
      if (typeof event.clientX !== 'number') return;
      const hit = this.hit(pickAt(wwd, event.clientX, event.clientY).items);
      const feature = hit ? this.find(hit.id) : undefined;
      if (!hit || !feature) return;
      const vertex = feature.type === 'point' ? 0 : hit.vertex;
      // Lines and polygons are dragged by their handles, which exist once the feature is selected.
      if (vertex === null) return;
      // Claims the gesture: WorldWind's navigator ignores a press whose default was prevented.
      event.preventDefault();
      this.setSelection(feature.id, vertex);
      this.dragging = true;
      this.publish();

      const onMove = (move: PointerEvent | MouseEvent) => {
        const position = pickAt(wwd, move.clientX, move.clientY, { terrainOnly: true }).position;
        if (position) this.moveVertex(feature.id, vertex, position);
      };
      const onUp = () => {
        window.removeEventListener(moveType, onMove);
        for (const type of upTypes) window.removeEventListener(type, onUp);
        this.endDrag = null;
        this.dragging = false;
        const current = this.find(feature.id);
        if (current) this.renderFeature(current);
        this.globe.redraw();
        this.publish();
      };
      window.addEventListener(moveType, onMove);
      for (const type of upTypes) window.addEventListener(type, onUp);
      this.endDrag = onUp;
    };
    return this.globe.addEventListener(downType, onDown);
  }

  private moveVertex(id: string, vertex: number, position: LatLonAlt): void {
    const feature = this.find(id);
    if (!feature || vertex >= feature.positions.length) return;
    const positions = feature.positions.map((p, i) => (i === vertex ? clean(position) : p));
    const next: DrawFeature = { ...feature, positions };
    this.features = this.features.map((f) => (f.id === id ? next : f));
    const ww = this.globe.worldWind;
    const rendered = this.rendered.get(id);
    if (rendered) {
      if (rendered.marker) updatePlacemark(ww, rendered.marker, { position: positions[0] });
      if (rendered.shape) {
        if (next.type === 'line') updateSurfacePolyline(ww, rendered.shape as WWSurfacePolyline, { locations: positions });
        else updateSurfacePolygon(ww, rendered.shape as WWSurfacePolygon, { boundaries: positions });
      }
      const handle = rendered.handles[vertex];
      if (handle) updatePlacemark(ww, handle, { position: positions[vertex] });
    }
    this.globe.redraw();
    this.publish();
  }

  private attachKeyboard(): Unsubscribe {
    const canvas = this.globe.canvas;
    const onKey = (event: KeyboardEvent) => {
      let handled = false;
      if (event.key === 'Escape') {
        if (this.draft.length) this.cancel();
        else if (this.mode) this.stop();
        else if (this.selectedId) this.select(null);
        else return;
        handled = true;
      } else if (event.key === 'Enter' && this.mode) {
        handled = this.finish() !== null;
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        if (this.draft.length) this.undo();
        else if (this.selectedId && this.options.editable) this.removeSelected();
        else return;
        handled = true;
      }
      if (handled) event.preventDefault();
    };
    canvas.addEventListener('keydown', onKey);
    return () => canvas.removeEventListener('keydown', onKey);
  }

  private setSelection(id: string | null, vertex: number | null): void {
    const previous = this.selectedId;
    this.selectedId = id;
    this.selectedVertex = id === null ? null : vertex;
    if (previous && previous !== id) {
      const feature = this.find(previous);
      if (feature) this.renderFeature(feature);
    }
    if (id) {
      const feature = this.find(id);
      if (feature) this.renderFeature(feature);
    }
    this.globe.redraw();
  }

  private renderFeature(feature: DrawFeature): void {
    const ww = this.globe.worldWind;
    const selected = feature.id === this.selectedId;
    const positions = feature.positions.slice();
    const style: ShapeStyle | null =
      feature.type === 'point'
        ? null
        : {
            ...(feature.type === 'line' ? DEFAULT_LINE : DEFAULT_POLYGON),
            ...(feature.type === 'line' ? this.options.line : this.options.polygon),
            ...(selected ? { ...DEFAULT_SELECTED, ...this.options.selected } : {}),
          };
    const pointScale = this.options.pointScale * (selected ? 1.3 : 1);
    let rendered = this.rendered.get(feature.id);
    if (rendered && rendered.type === feature.type) {
      // Update in place so picked objects stay valid across selection and dragging.
      for (const handle of rendered.handles) {
        this.layer.removeRenderable(handle);
        this.objectIndex.delete(handle);
      }
      rendered.handles = [];
      if (rendered.marker) updatePlacemark(ww, rendered.marker, { position: positions[0], imageScale: pointScale });
      if (rendered.shape && style) {
        if (feature.type === 'line') updateSurfacePolyline(ww, rendered.shape as WWSurfacePolyline, { locations: positions, ...style });
        else updateSurfacePolygon(ww, rendered.shape as WWSurfacePolygon, { boundaries: positions, ...style });
      }
    } else {
      this.unrender(feature.id);
      rendered = { type: feature.type, shape: null, marker: null, handles: [] };
      if (feature.type === 'point') {
        rendered.marker = createPlacemark(ww, {
          position: positions[0]!,
          imageSource: this.options.pointImage === undefined ? pushpinUrl(ww, 'red') : this.options.pointImage,
          imageScale: pointScale,
          altitudeMode: 'clampToGround',
          userData: { drawFeatureId: feature.id },
        });
        this.layer.addRenderable(rendered.marker);
        this.objectIndex.set(rendered.marker, { id: feature.id, vertex: 0 });
      } else if (style) {
        rendered.shape =
          feature.type === 'line'
            ? createSurfacePolyline(ww, { locations: positions, pathType: this.options.pathType, ...style, userData: { drawFeatureId: feature.id } })
            : createSurfacePolygon(ww, { boundaries: positions, pathType: this.options.pathType, ...style, userData: { drawFeatureId: feature.id } });
        this.layer.addRenderable(rendered.shape);
        this.objectIndex.set(rendered.shape, { id: feature.id, vertex: null });
      }
      this.rendered.set(feature.id, rendered);
    }
    if (feature.type !== 'point' && selected && this.options.editable) {
      positions.forEach((position, index) => {
        const handle = this.createHandle(position, index === this.selectedVertex);
        rendered!.handles.push(handle);
        this.layer.addRenderable(handle);
        this.objectIndex.set(handle, { id: feature.id, vertex: index });
      });
    }
  }

  private createHandle(position: LatLonAlt, emphasized: boolean): WWPlacemark {
    const ww = this.globe.worldWind;
    return createPlacemark(ww, {
      position,
      imageSource: this.options.handleImage === undefined ? whiteDotUrl(ww) : this.options.handleImage,
      imageScale: this.options.handleScale * (emphasized ? 1.5 : 1),
      imageOffset: { x: 0.5, y: 0.5 },
      altitudeMode: 'clampToGround',
      eyeDistanceScaling: false,
      alwaysOnTop: true,
    });
  }

  private unrender(id: string): void {
    const rendered = this.rendered.get(id);
    if (!rendered) return;
    for (const renderable of [rendered.shape, rendered.marker, ...rendered.handles]) {
      if (!renderable) continue;
      this.layer.removeRenderable(renderable as WWRenderable);
      this.objectIndex.delete(renderable);
    }
    this.rendered.delete(id);
  }

  private renderDraft(): void {
    const ww = this.globe.worldWind;
    this.clearDraftRenderables();
    const mode = this.mode;
    if (!mode || mode === 'point') return;
    if (this.draft.length >= 2) {
      const style: ShapeStyle = { ...(mode === 'line' ? DEFAULT_LINE : DEFAULT_POLYGON), ...(mode === 'line' ? this.options.line : this.options.polygon) };
      this.draftShape =
        mode === 'polygon' && this.draft.length >= 3
          ? createSurfacePolygon(ww, { boundaries: this.draft, pathType: this.options.pathType, ...style })
          : createSurfacePolyline(ww, { locations: this.draft, pathType: this.options.pathType, ...style, fill: null });
      this.layer.addRenderable(this.draftShape);
    }
    for (const position of this.draft) {
      const handle = this.createHandle(position, false);
      this.draftHandles.push(handle);
      this.layer.addRenderable(handle);
    }
    this.globe.redraw();
  }

  private clearDraftRenderables(): void {
    if (this.draftShape) this.layer.removeRenderable(this.draftShape);
    for (const handle of this.draftHandles) this.layer.removeRenderable(handle);
    this.draftShape = null;
    this.draftHandles = [];
  }

  private discardDraft(): void {
    this.draft = [];
    this.clearDraftRenderables();
    this.globe.redraw();
  }

  private buildState(): DrawState {
    return {
      mode: this.mode,
      draft: this.draft,
      features: this.features,
      selectedId: this.selectedId,
      selectedVertex: this.selectedVertex,
      dragging: this.dragging,
    };
  }

  private publish(): void {
    this.snapshot = this.buildState();
    this.emitter.emit(this.snapshot);
  }
}
