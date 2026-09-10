import { whiteDotUrl } from './assets';
import {
  clean,
  DRAW_MODES,
  samePoint,
  strategyForGeometry,
  type DrawBody,
  type DrawContext,
  type ResolvedDrawOptions,
} from './draw-modes';
import { createEmitter, type Unsubscribe } from './events';
import type { LatLonAlt } from './geo';
import type { GlobeController } from './globe';
import { markInternalLayer } from './layers';
import { pickAt, type PickEvent, type PickedItem } from './picking';
import { createPlacemark, updatePlacemark, type PathType, type ShapeStyle } from './shapes';
import type { WWPlacemark, WWRenderable, WWRenderableLayer } from './worldwind-types';

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

interface Rendered extends DrawBody {
  type: DrawMode;
  handles: WWPlacemark[];
}

interface Hit {
  id: string;
  vertex: number | null;
}

function withoutTrailingDuplicate(points: readonly LatLonAlt[]): LatLonAlt[] {
  const result = points.slice();
  while (result.length >= 2 && samePoint(result[result.length - 1]!, result[result.length - 2]!))
    result.pop();
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
  private readonly options: ResolvedDrawOptions;
  private readonly rendered = new Map<string, Rendered>();
  private readonly objectIndex = new Map<unknown, Hit>();
  private readonly cleanups: Unsubscribe[] = [];
  private draftShape: DrawBody['shape'] = null;
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
    const given = Object.fromEntries(
      Object.entries(options).filter(([, value]) => value !== undefined),
    ) as DrawToolOptions;
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
    this.layer = markInternalLayer(
      globe.addRenderableLayer(options.layerName ?? 'Drawings', { pickEnabled: true }),
    );
    this.snapshot = this.buildState();
    this.cleanups.push(globe.on('click', (event) => this.onClick(event)));
    if (this.options.finishOnDoubleClick)
      this.cleanups.push(globe.on('dblclick', () => this.onDoubleClick()));
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
    if (!mode || !DRAW_MODES[mode].drafts) return null;
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
  update(
    id: string,
    changes: { positions?: readonly LatLonAlt[]; properties?: Record<string, unknown> },
  ): void {
    const index = this.features.findIndex((feature) => feature.id === id);
    if (index === -1) return;
    const current = this.features[index]!;
    const positions = changes.positions ? changes.positions.map(clean) : current.positions;
    if (positions.length < MIN_DRAW_VERTICES[current.type]) return;
    const next: DrawFeature = {
      ...current,
      positions,
      properties: changes.properties ?? current.properties,
    };
    this.features = this.features.map((feature) => (feature.id === id ? next : feature));
    this.renderFeature(next);
    this.globe.redraw();
    this.publish();
  }

  select(id: string | null, vertex: number | null = null): void {
    const feature = id ? this.find(id) : null;
    this.setSelection(
      feature ? feature.id : null,
      feature && vertex !== null && vertex < feature.positions.length ? vertex : null,
    );
    this.publish();
  }

  remove(id: string): boolean {
    const feature = this.find(id);
    if (!feature) return false;
    this.unrender(id);
    this.features = this.features.filter((f) => f.id !== id);
    if (this.selectedId === id) this.clearSelection();
    this.globe.redraw();
    this.publish();
    return true;
  }

  /** Removes the selected vertex when the feature can spare it, else the selected feature. */
  removeSelected(): void {
    const feature = this.selectedId ? this.find(this.selectedId) : null;
    if (!feature) return;
    if (
      this.selectedVertex !== null &&
      feature.positions.length > MIN_DRAW_VERTICES[feature.type]
    ) {
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
    this.clearSelection();
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
        const coordinates = feature.positions.map((p) => [
          p.longitude,
          p.latitude,
          p.altitude ?? 0,
        ]);
        const geometry = DRAW_MODES[feature.type].toGeometry(coordinates);
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
      const strategy = geometry ? strategyForGeometry(geometry.type) : undefined;
      if (!geometry || !strategy) continue;
      const input: DrawFeatureInput = {
        type: strategy.mode,
        positions: strategy.fromCoordinates(geometry.coordinates),
      };
      if (input.positions.length < MIN_DRAW_VERTICES[input.type]) continue;
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
      throw new Error(
        `worldwind-kit: a ${input.type} needs at least ${MIN_DRAW_VERTICES[input.type]} position(s)`,
      );
    }
    let id = input.id ?? `${this.options.idPrefix}${this.nextId}`;
    while (this.find(id)) {
      this.nextId += 1;
      id = `${this.options.idPrefix}${this.nextId}`;
    }
    if (id === `${this.options.idPrefix}${this.nextId}`) this.nextId += 1;
    const feature: DrawFeature = {
      id,
      type: input.type,
      positions,
      properties: { ...(input.properties ?? {}) },
    };
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
      if (!DRAW_MODES[this.mode].drafts) {
        const feature = this.insert({ type: this.mode, positions: [position] });
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
    if (!this.mode || !DRAW_MODES[this.mode].drafts) return;
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

    const onDown = (event: PointerEvent | MouseEvent) => {
      if (this.dragging) return;
      if (event.button !== undefined && event.button !== 0) return;
      if (typeof event.clientX !== 'number') return;
      const hit = this.hit(pickAt(this.globe.wwd, event.clientX, event.clientY).items);
      const feature = hit ? this.find(hit.id) : undefined;
      if (!hit || !feature) return;
      const vertex = DRAW_MODES[feature.type].dragVertex(hit);
      if (vertex === null) return;
      // Claims the gesture: WorldWind's navigator ignores a press whose default was prevented.
      event.preventDefault();
      this.beginDrag(feature.id, vertex, moveType, upTypes);
    };
    return this.globe.addEventListener(downType, onDown);
  }

  /** Follows the pointer over the terrain until it is released, then re-renders the feature. */
  private beginDrag(
    id: string,
    vertex: number,
    moveType: 'pointermove' | 'mousemove',
    upTypes: string[],
  ): void {
    this.setSelection(id, vertex);
    this.dragging = true;
    this.publish();

    const wwd = this.globe.wwd;
    const onMove = (move: PointerEvent | MouseEvent) => {
      const position = pickAt(wwd, move.clientX, move.clientY, { terrainOnly: true }).position;
      if (position) this.moveVertex(id, vertex, position);
    };
    const onUp = () => {
      window.removeEventListener(moveType, onMove);
      for (const type of upTypes) window.removeEventListener(type, onUp);
      this.endDrag = null;
      this.dragging = false;
      const current = this.find(id);
      if (current) this.renderFeature(current);
      this.globe.redraw();
      this.publish();
    };
    window.addEventListener(moveType, onMove);
    for (const type of upTypes) window.addEventListener(type, onUp);
    this.endDrag = onUp;
  }

  private moveVertex(id: string, vertex: number, position: LatLonAlt): void {
    const feature = this.find(id);
    if (!feature || vertex >= feature.positions.length) return;
    const positions = feature.positions.map((p, i) => (i === vertex ? clean(position) : p));
    const next: DrawFeature = { ...feature, positions };
    this.features = this.features.map((f) => (f.id === id ? next : f));
    const rendered = this.rendered.get(id);
    if (rendered) {
      DRAW_MODES[next.type].moveBody(this.context, rendered, positions);
      const handle = rendered.handles[vertex];
      if (handle) updatePlacemark(this.globe.worldWind, handle, { position: positions[vertex] });
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

  private clearSelection(): void {
    this.selectedId = null;
    this.selectedVertex = null;
  }

  private get context(): DrawContext {
    return { worldWind: this.globe.worldWind, options: this.options };
  }

  private renderFeature(feature: DrawFeature): void {
    const strategy = DRAW_MODES[feature.type];
    const selected = feature.id === this.selectedId;
    const positions = feature.positions.slice();
    let rendered = this.rendered.get(feature.id);
    if (rendered && rendered.type === feature.type) {
      // Update in place so picked objects stay valid across selection and dragging.
      this.removeHandles(rendered);
      strategy.updateBody(this.context, rendered, positions, selected);
    } else {
      this.unrender(feature.id);
      rendered = {
        type: feature.type,
        handles: [],
        ...strategy.createBody(this.context, feature, selected),
      };
      // A point is picked as its vertex 0; a line or polygon body is picked as a whole.
      if (rendered.marker) this.track(rendered.marker, { id: feature.id, vertex: 0 });
      if (rendered.shape) this.track(rendered.shape, { id: feature.id, vertex: null });
      this.rendered.set(feature.id, rendered);
    }
    if (strategy.vertexHandles && selected && this.options.editable) {
      positions.forEach((position, index) => {
        const handle = this.createHandle(position, index === this.selectedVertex);
        rendered.handles.push(handle);
        this.track(handle, { id: feature.id, vertex: index });
      });
    }
  }

  /** Shows a renderable and remembers which feature (and vertex) a pick on it means. */
  private track(renderable: WWRenderable, hit: Hit): void {
    this.layer.addRenderable(renderable);
    this.objectIndex.set(renderable, hit);
  }

  private removeHandles(rendered: Rendered): void {
    for (const handle of rendered.handles) {
      this.layer.removeRenderable(handle);
      this.objectIndex.delete(handle);
    }
    rendered.handles = [];
  }

  private createHandle(position: LatLonAlt, emphasized: boolean): WWPlacemark {
    const ww = this.globe.worldWind;
    return createPlacemark(ww, {
      position,
      imageSource:
        this.options.handleImage === undefined ? whiteDotUrl(ww) : this.options.handleImage,
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
    this.clearDraftRenderables();
    const strategy = this.mode ? DRAW_MODES[this.mode] : null;
    if (!strategy?.drafts) return;
    if (this.draft.length >= 2) {
      this.draftShape = strategy.createDraftShape(this.context, this.draft);
      if (this.draftShape) this.layer.addRenderable(this.draftShape);
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
