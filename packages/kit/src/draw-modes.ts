import { pushpinUrl } from './assets';
import type { DrawFeature, DrawGeoJsonGeometry, DrawMode, DrawToolOptions } from './draw';
import type { LatLonAlt } from './geo';
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
import type {
  WWPlacemark,
  WWSurfacePolygon,
  WWSurfacePolyline,
  WorldWindStatic,
} from './worldwind-types';

/** The tool's options with every default filled in. */
export type ResolvedDrawOptions = Required<
  Pick<
    DrawToolOptions,
    | 'pathType'
    | 'pointScale'
    | 'handleScale'
    | 'editable'
    | 'finishOnDoubleClick'
    | 'keyboard'
    | 'idPrefix'
  >
> &
  DrawToolOptions;

/** What a strategy needs to build renderables. */
export interface DrawContext {
  worldWind: WorldWindStatic;
  options: ResolvedDrawOptions;
}

/** The renderables that stand for one feature; a point has a marker, the others a surface shape. */
export interface DrawBody {
  shape: WWSurfacePolyline | WWSurfacePolygon | null;
  marker: WWPlacemark | null;
}

/**
 * Everything about a feature that depends on its kind: how it is drawn and updated, how a press
 * on it starts a drag, how it drafts, and how it round-trips through GeoJSON. The tool itself only
 * keeps state and wiring, so a new kind of feature is one more strategy.
 */
export interface DrawModeStrategy {
  readonly mode: DrawMode;
  readonly geometryType: DrawGeoJsonGeometry['type'];
  /** Clicks add vertices to a draft that `finish()` completes; otherwise every click places a feature. */
  readonly drafts: boolean;
  /** Selected features show a draggable handle per vertex. */
  readonly vertexHandles: boolean;
  /** The vertex a press on a picked object drags, or null to leave the press to the navigator. */
  dragVertex(hit: { vertex: number | null }): number | null;
  /** Creates the feature's renderables. */
  createBody(context: DrawContext, feature: DrawFeature, selected: boolean): DrawBody;
  /** Updates positions and selection styling in place, so picked objects stay valid. */
  updateBody(context: DrawContext, body: DrawBody, positions: LatLonAlt[], selected: boolean): void;
  /** Moves the body to new positions while a vertex is dragged; styling is left alone. */
  moveBody(context: DrawContext, body: DrawBody, positions: LatLonAlt[]): void;
  /** The shape shown for a draft of at least two vertices. */
  createDraftShape(
    context: DrawContext,
    draft: LatLonAlt[],
  ): WWSurfacePolyline | WWSurfacePolygon | null;
  toGeometry(coordinates: number[][]): DrawGeoJsonGeometry;
  /** Positions from a geometry's coordinates; unusable coordinates are dropped. */
  fromCoordinates(coordinates: DrawGeoJsonGeometry['coordinates']): LatLonAlt[];
}

const DEFAULT_LINE: ShapeStyle = { stroke: '#f97316', strokeWidth: 3 };
const DEFAULT_POLYGON: ShapeStyle = {
  fill: 'rgba(249, 115, 22, 0.25)',
  stroke: '#f97316',
  strokeWidth: 2,
};
const DEFAULT_SELECTED: ShapeStyle = { stroke: '#fde047' };
const SAME_POINT = 1e-9;

export function clean(position: LatLonAlt): LatLonAlt {
  return {
    latitude: position.latitude,
    longitude: position.longitude,
    altitude: position.altitude ?? 0,
  };
}

export function samePoint(a: LatLonAlt, b: LatLonAlt): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < SAME_POINT &&
    Math.abs(a.longitude - b.longitude) < SAME_POINT
  );
}

/** GeoJSON `[longitude, latitude, altitude?]` tuples as positions; malformed entries are skipped. */
function coordinatesToPositions(ring: number[][]): LatLonAlt[] {
  return ring
    .filter(
      (coordinate) =>
        Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        Number.isFinite(coordinate[0]) &&
        Number.isFinite(coordinate[1]),
    )
    .map(([longitude, latitude, altitude]) => ({
      latitude: latitude!,
      longitude: longitude!,
      altitude: Number.isFinite(altitude) ? altitude! : 0,
    }));
}

function pointScale(options: ResolvedDrawOptions, selected: boolean): number {
  return options.pointScale * (selected ? 1.3 : 1);
}

const pointStrategy: DrawModeStrategy = {
  mode: 'point',
  geometryType: 'Point',
  drafts: false,
  vertexHandles: false,
  // A point is dragged by its marker.
  dragVertex: () => 0,
  createBody({ worldWind, options }, feature, selected) {
    const marker = createPlacemark(worldWind, {
      position: feature.positions[0]!,
      imageSource:
        options.pointImage === undefined ? pushpinUrl(worldWind, 'red') : options.pointImage,
      imageScale: pointScale(options, selected),
      altitudeMode: 'clampToGround',
      userData: { drawFeatureId: feature.id },
    });
    return { shape: null, marker };
  },
  updateBody({ worldWind, options }, body, positions, selected) {
    if (body.marker)
      updatePlacemark(worldWind, body.marker, {
        position: positions[0],
        imageScale: pointScale(options, selected),
      });
  },
  moveBody({ worldWind }, body, positions) {
    if (body.marker) updatePlacemark(worldWind, body.marker, { position: positions[0] });
  },
  createDraftShape: () => null,
  toGeometry: (coordinates) => ({ type: 'Point', coordinates: coordinates[0]! }),
  fromCoordinates: (coordinates) => coordinatesToPositions([coordinates as number[]]),
};

/** The style of a line or polygon: its defaults, the tool's options, and the selection accent. */
function surfaceStyle(
  base: ShapeStyle,
  custom: ShapeStyle | undefined,
  options: ResolvedDrawOptions,
  selected: boolean,
): ShapeStyle {
  return { ...base, ...custom, ...(selected ? { ...DEFAULT_SELECTED, ...options.selected } : {}) };
}

type SurfaceShape = WWSurfacePolyline | WWSurfacePolygon;

/** Shape options shared by every surface shape the tool draws. */
interface SurfaceOptions extends ShapeStyle {
  pathType: PathType;
  userData?: unknown;
}

/** What differs between the line and polygon kinds: their shape calls, defaults and GeoJSON. */
interface SurfaceKind {
  mode: DrawMode;
  geometryType: DrawGeoJsonGeometry['type'];
  defaults: ShapeStyle;
  customStyle(options: ResolvedDrawOptions): ShapeStyle | undefined;
  create(worldWind: WorldWindStatic, positions: LatLonAlt[], options: SurfaceOptions): SurfaceShape;
  update(
    worldWind: WorldWindStatic,
    shape: SurfaceShape,
    positions: LatLonAlt[],
    style: ShapeStyle,
  ): void;
  createDraftShape(
    worldWind: WorldWindStatic,
    draft: LatLonAlt[],
    options: SurfaceOptions,
  ): SurfaceShape;
  toGeometry(coordinates: number[][]): DrawGeoJsonGeometry;
  fromCoordinates(coordinates: DrawGeoJsonGeometry['coordinates']): LatLonAlt[];
}

/** Lines and polygons share everything but their shape calls: drafted click by click, dragged by handles. */
function surfaceStrategy(kind: SurfaceKind): DrawModeStrategy {
  const styleFor = (options: ResolvedDrawOptions, selected: boolean) =>
    surfaceStyle(kind.defaults, kind.customStyle(options), options, selected);
  return {
    mode: kind.mode,
    geometryType: kind.geometryType,
    drafts: true,
    vertexHandles: true,
    // Dragged by their handles, which exist once the feature is selected.
    dragVertex: (hit) => hit.vertex,
    createBody({ worldWind, options }, feature, selected) {
      const shapeOptions = {
        pathType: options.pathType,
        ...styleFor(options, selected),
        userData: { drawFeatureId: feature.id },
      };
      return {
        shape: kind.create(worldWind, feature.positions.slice(), shapeOptions),
        marker: null,
      };
    },
    updateBody({ worldWind, options }, body, positions, selected) {
      if (body.shape) kind.update(worldWind, body.shape, positions, styleFor(options, selected));
    },
    moveBody({ worldWind }, body, positions) {
      if (body.shape) kind.update(worldWind, body.shape, positions, {});
    },
    createDraftShape({ worldWind, options }, draft) {
      return kind.createDraftShape(worldWind, draft, {
        pathType: options.pathType,
        ...styleFor(options, false),
      });
    },
    toGeometry: kind.toGeometry,
    fromCoordinates: kind.fromCoordinates,
  };
}

const lineStrategy = surfaceStrategy({
  mode: 'line',
  geometryType: 'LineString',
  defaults: DEFAULT_LINE,
  customStyle: (options) => options.line,
  create: (worldWind, positions, options) =>
    createSurfacePolyline(worldWind, { locations: positions, ...options }),
  update: (worldWind, shape, positions, style) =>
    updateSurfacePolyline(worldWind, shape as WWSurfacePolyline, {
      locations: positions,
      ...style,
    }),
  createDraftShape: (worldWind, draft, options) =>
    createSurfacePolyline(worldWind, { locations: draft, ...options, fill: null }),
  toGeometry: (coordinates) => ({ type: 'LineString', coordinates }),
  fromCoordinates: (coordinates) => coordinatesToPositions(coordinates as number[][]),
});

const polygonStrategy = surfaceStrategy({
  mode: 'polygon',
  geometryType: 'Polygon',
  defaults: DEFAULT_POLYGON,
  customStyle: (options) => options.polygon,
  create: (worldWind, positions, options) =>
    createSurfacePolygon(worldWind, { boundaries: positions, ...options }),
  update: (worldWind, shape, positions, style) =>
    updateSurfacePolygon(worldWind, shape as WWSurfacePolygon, { boundaries: positions, ...style }),
  // Two vertices show as a line; the polygon appears with the third.
  createDraftShape: (worldWind, draft, options) =>
    draft.length >= 3
      ? createSurfacePolygon(worldWind, { boundaries: draft, ...options })
      : createSurfacePolyline(worldWind, { locations: draft, ...options, fill: null }),
  toGeometry: (coordinates) => ({
    type: 'Polygon',
    coordinates: [[...coordinates, coordinates[0]!]],
  }),
  // The outer ring only, without the closing point GeoJSON repeats.
  fromCoordinates(coordinates) {
    const ring = coordinatesToPositions(((coordinates as number[][][])[0] ?? []) as number[][]);
    if (ring.length >= 2 && samePoint(ring[0]!, ring[ring.length - 1]!)) ring.pop();
    return ring;
  },
});

export const DRAW_MODES: Record<DrawMode, DrawModeStrategy> = {
  point: pointStrategy,
  line: lineStrategy,
  polygon: polygonStrategy,
};

/** The strategy whose features a GeoJSON geometry type maps to, if any. */
export function strategyForGeometry(type: string): DrawModeStrategy | undefined {
  return Object.values(DRAW_MODES).find((strategy) => strategy.geometryType === type);
}
