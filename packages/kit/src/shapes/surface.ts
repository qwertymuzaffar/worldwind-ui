import { toLocation, toLocations, type LatLon } from '../geo';
import type {
  WWRenderable,
  WWShapeAttributes,
  WWSurfaceCircle,
  WWSurfacePolygon,
  WWSurfacePolyline,
  WorldWindStatic,
} from '../worldwind-types';
import {
  applyHighlight,
  applyRenderableOptions,
  applyShapeStyle,
  createShapeAttributes,
  pathTypeValue,
  type PathType,
  type RenderableOptions,
  type ShapeStyle,
} from './attributes';

// Surface shapes (draped on the terrain) ----------------------------------------------------------

/** @category Shapes */
export interface SurfaceShapeOptions extends RenderableOptions, ShapeStyle {
  pathType?: PathType;
  highlight?: ShapeStyle | null;
}

function updateSurfaceShape(
  worldWind: WorldWindStatic,
  shape: {
    attributes: WWShapeAttributes;
    highlightAttributes: WWShapeAttributes | null;
    pathType: string;
  } & WWRenderable,
  options: Partial<SurfaceShapeOptions>,
): void {
  if (options.pathType !== undefined) shape.pathType = pathTypeValue(worldWind, options.pathType);
  applyShapeStyle(worldWind, shape.attributes, options);
  applyHighlight(worldWind, shape, options.highlight);
  applyRenderableOptions(shape, options);
}

/** @category Shapes */
export interface SurfacePolylineOptions extends SurfaceShapeOptions {
  locations: LatLon[];
}

/** @category Shapes */
export function createSurfacePolyline(
  worldWind: WorldWindStatic,
  options: SurfacePolylineOptions,
): WWSurfacePolyline {
  const shape = new worldWind.SurfacePolyline(
    toLocations(worldWind, options.locations),
    createShapeAttributes(worldWind, { fill: null }),
  );
  updateSurfacePolyline(worldWind, shape, options);
  return shape;
}

/** @category Shapes */
export function updateSurfacePolyline(
  worldWind: WorldWindStatic,
  shape: WWSurfacePolyline,
  options: Partial<SurfacePolylineOptions>,
): void {
  if (options.locations) shape.locations = toLocations(worldWind, options.locations);
  updateSurfaceShape(worldWind, shape, options);
}

/** @category Shapes */
export type SurfacePolygonBoundaries = LatLon[] | LatLon[][];

/** @category Shapes */
export interface SurfacePolygonOptions extends SurfaceShapeOptions {
  boundaries: SurfacePolygonBoundaries;
}

function toSurfaceBoundaries(worldWind: WorldWindStatic, boundaries: SurfacePolygonBoundaries) {
  return Array.isArray(boundaries[0])
    ? (boundaries as LatLon[][]).map((ring) => toLocations(worldWind, ring))
    : toLocations(worldWind, boundaries as LatLon[]);
}

/** @category Shapes */
export function createSurfacePolygon(
  worldWind: WorldWindStatic,
  options: SurfacePolygonOptions,
): WWSurfacePolygon {
  const shape = new worldWind.SurfacePolygon(
    toSurfaceBoundaries(worldWind, options.boundaries),
    createShapeAttributes(worldWind),
  );
  updateSurfacePolygon(worldWind, shape, options);
  return shape;
}

/** @category Shapes */
export function updateSurfacePolygon(
  worldWind: WorldWindStatic,
  shape: WWSurfacePolygon,
  options: Partial<SurfacePolygonOptions>,
): void {
  if (options.boundaries) shape.boundaries = toSurfaceBoundaries(worldWind, options.boundaries);
  updateSurfaceShape(worldWind, shape, options);
}

/** @category Shapes */
export interface SurfaceCircleOptions extends SurfaceShapeOptions {
  center: LatLon;
  /** Radius in metres. */
  radius: number;
}

/** @category Shapes */
export function createSurfaceCircle(
  worldWind: WorldWindStatic,
  options: SurfaceCircleOptions,
): WWSurfaceCircle {
  const shape = new worldWind.SurfaceCircle(
    toLocation(worldWind, options.center),
    options.radius,
    createShapeAttributes(worldWind),
  );
  updateSurfaceCircle(worldWind, shape, options);
  return shape;
}

/** @category Shapes */
export function updateSurfaceCircle(
  worldWind: WorldWindStatic,
  shape: WWSurfaceCircle,
  options: Partial<SurfaceCircleOptions>,
): void {
  if (options.center) shape.center = toLocation(worldWind, options.center);
  if (options.radius !== undefined) shape.radius = options.radius;
  updateSurfaceShape(worldWind, shape, options);
}
