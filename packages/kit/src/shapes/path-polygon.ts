import { toPositions, type LatLonAlt } from '../geo';
import type { WWPath, WWPolygon, WorldWindStatic } from '../worldwind-types';
import {
  altitudeModeValue,
  applyHighlight,
  applyRenderableOptions,
  applyShapeStyle,
  createShapeAttributes,
  pathTypeValue,
  type AltitudeMode,
  type PathType,
  type RenderableOptions,
  type ShapeStyle,
} from './attributes';

// Path --------------------------------------------------------------------------------------------

/** @category Shapes */
export interface PathOptions extends RenderableOptions, ShapeStyle {
  positions: LatLonAlt[];
  altitudeMode?: AltitudeMode;
  followTerrain?: boolean;
  extrude?: boolean;
  pathType?: PathType;
  numSubSegments?: number;
  terrainConformance?: number;
  highlight?: ShapeStyle | null;
}

/** @category Shapes */
export function createPath(worldWind: WorldWindStatic, options: PathOptions): WWPath {
  const path = new worldWind.Path(
    toPositions(worldWind, options.positions),
    createShapeAttributes(worldWind),
  );
  updatePath(worldWind, path, options);
  return path;
}

/** @category Shapes */
export function updatePath(
  worldWind: WorldWindStatic,
  path: WWPath,
  options: Partial<PathOptions>,
): void {
  if (options.positions) path.positions = toPositions(worldWind, options.positions);
  if (options.altitudeMode !== undefined)
    path.altitudeMode = altitudeModeValue(worldWind, options.altitudeMode);
  if (options.followTerrain !== undefined) path.followTerrain = options.followTerrain;
  if (options.extrude !== undefined) path.extrude = options.extrude;
  if (options.pathType !== undefined) path.pathType = pathTypeValue(worldWind, options.pathType);
  if (options.numSubSegments !== undefined) path.numSubSegments = options.numSubSegments;
  if (options.terrainConformance !== undefined)
    path.terrainConformance = options.terrainConformance;
  applyShapeStyle(worldWind, path.attributes, options);
  applyHighlight(worldWind, path, options.highlight);
  applyRenderableOptions(path, options);
}

// Polygon -----------------------------------------------------------------------------------------

/** @category Shapes */
export type PolygonBoundaries = LatLonAlt[] | LatLonAlt[][];

function isMultiRing(boundaries: PolygonBoundaries): boundaries is LatLonAlt[][] {
  return Array.isArray(boundaries[0]);
}

/** @category Shapes */
export interface PolygonOptions extends RenderableOptions, ShapeStyle {
  /** One ring, or an outer ring followed by holes. */
  boundaries: PolygonBoundaries;
  altitudeMode?: AltitudeMode;
  extrude?: boolean;
  highlight?: ShapeStyle | null;
}

function toPolygonBoundaries(worldWind: WorldWindStatic, boundaries: PolygonBoundaries) {
  return isMultiRing(boundaries)
    ? boundaries.map((ring) => toPositions(worldWind, ring))
    : toPositions(worldWind, boundaries);
}

/** @category Shapes */
export function createPolygon(worldWind: WorldWindStatic, options: PolygonOptions): WWPolygon {
  const polygon = new worldWind.Polygon(
    toPolygonBoundaries(worldWind, options.boundaries),
    createShapeAttributes(worldWind),
  );
  updatePolygon(worldWind, polygon, options);
  return polygon;
}

/** @category Shapes */
export function updatePolygon(
  worldWind: WorldWindStatic,
  polygon: WWPolygon,
  options: Partial<PolygonOptions>,
): void {
  if (options.boundaries) polygon.boundaries = toPolygonBoundaries(worldWind, options.boundaries);
  if (options.altitudeMode !== undefined)
    polygon.altitudeMode = altitudeModeValue(worldWind, options.altitudeMode);
  if (options.extrude !== undefined) polygon.extrude = options.extrude;
  applyShapeStyle(worldWind, polygon.attributes, options);
  applyHighlight(worldWind, polygon, options.highlight);
  applyRenderableOptions(polygon, options);
}
