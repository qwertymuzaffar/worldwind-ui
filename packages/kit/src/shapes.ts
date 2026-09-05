import { toColor, type ColorInput } from './color';
import { toLocation, toLocations, toPosition, toPositions, type LatLon, type LatLonAlt } from './geo';
import type {
  WWGeographicText,
  WWImageSource,
  WWOffset,
  WWPath,
  WWPlacemark,
  WWPlacemarkAttributes,
  WWPolygon,
  WWRenderable,
  WWShapeAttributes,
  WWSurfaceCircle,
  WWSurfacePolygon,
  WWSurfacePolyline,
  WWTextAttributes,
  WorldWindStatic,
} from './worldwind-types';

export type AltitudeMode = 'absolute' | 'clampToGround' | 'relativeToGround';
export type PathType = 'greatCircle' | 'linear' | 'rhumbLine';

export function altitudeModeValue(worldWind: WorldWindStatic, mode: AltitudeMode | undefined): string {
  switch (mode) {
    case 'clampToGround':
      return worldWind.CLAMP_TO_GROUND;
    case 'relativeToGround':
      return worldWind.RELATIVE_TO_GROUND;
    default:
      return worldWind.ABSOLUTE;
  }
}

export function pathTypeValue(worldWind: WorldWindStatic, type: PathType | undefined): string {
  switch (type) {
    case 'linear':
      return worldWind.LINEAR;
    case 'rhumbLine':
      return worldWind.RHUMB_LINE;
    default:
      return worldWind.GREAT_CIRCLE;
  }
}

export type OffsetUnits = 'fraction' | 'pixels' | 'insetPixels';

export interface OffsetInput {
  x: number;
  y: number;
  /** Defaults to `fraction`. */
  xUnits?: OffsetUnits;
  yUnits?: OffsetUnits;
}

function offsetUnitsValue(worldWind: WorldWindStatic, units: OffsetUnits | undefined): string {
  switch (units) {
    case 'pixels':
      return worldWind.OFFSET_PIXELS;
    case 'insetPixels':
      return worldWind.OFFSET_INSET_PIXELS;
    default:
      return worldWind.OFFSET_FRACTION;
  }
}

export function toOffset(worldWind: WorldWindStatic, offset: OffsetInput): WWOffset {
  return new worldWind.Offset(
    offsetUnitsValue(worldWind, offset.xUnits),
    offset.x,
    offsetUnitsValue(worldWind, offset.yUnits),
    offset.y,
  );
}

export interface RenderableOptions {
  displayName?: string | null;
  enabled?: boolean;
  /** Stored on the renderable's `userProperties`; comes back from picks. */
  userData?: unknown;
}

function applyRenderableOptions(renderable: WWRenderable, options: RenderableOptions): void {
  if (options.displayName !== undefined) renderable.displayName = options.displayName;
  if (options.enabled !== undefined) renderable.enabled = options.enabled;
  if ('userData' in options) renderable.userProperties = options.userData;
}

/** Visual style shared by paths, polygons and surface shapes. `null` disables a fill or stroke. */
export interface ShapeStyle {
  fill?: ColorInput | null;
  stroke?: ColorInput | null;
  /** Outline width in pixels. */
  strokeWidth?: number;
  drawVerticals?: boolean;
  applyLighting?: boolean;
  depthTest?: boolean;
  imageSource?: string | null;
}

export function applyShapeStyle(
  worldWind: WorldWindStatic,
  attributes: WWShapeAttributes,
  style: ShapeStyle,
): WWShapeAttributes {
  if (style.fill !== undefined) {
    if (style.fill === null) {
      attributes.drawInterior = false;
    } else {
      attributes.drawInterior = true;
      attributes.interiorColor = toColor(worldWind, style.fill);
    }
  }
  if (style.stroke !== undefined) {
    if (style.stroke === null) {
      attributes.drawOutline = false;
    } else {
      attributes.drawOutline = true;
      attributes.outlineColor = toColor(worldWind, style.stroke);
    }
  }
  if (style.strokeWidth !== undefined) attributes.outlineWidth = style.strokeWidth;
  if (style.drawVerticals !== undefined) attributes.drawVerticals = style.drawVerticals;
  if (style.applyLighting !== undefined) attributes.applyLighting = style.applyLighting;
  if (style.depthTest !== undefined) attributes.depthTest = style.depthTest;
  if (style.imageSource !== undefined) attributes.imageSource = style.imageSource;
  return attributes;
}

export function createShapeAttributes(worldWind: WorldWindStatic, style: ShapeStyle = {}): WWShapeAttributes {
  return applyShapeStyle(worldWind, new worldWind.ShapeAttributes(null), style);
}

interface Highlightable {
  attributes: WWShapeAttributes;
  highlightAttributes: WWShapeAttributes | null;
}

function applyHighlight(worldWind: WorldWindStatic, shape: Highlightable, highlight: ShapeStyle | null | undefined): void {
  if (highlight === undefined) return;
  if (highlight === null) {
    shape.highlightAttributes = null;
    return;
  }
  shape.highlightAttributes = applyShapeStyle(worldWind, new worldWind.ShapeAttributes(shape.attributes), highlight);
}

// Placemark ---------------------------------------------------------------------------------------

export interface PlacemarkHighlight {
  imageScale?: number;
  imageColor?: ColorInput;
}

export interface PlacemarkOptions extends RenderableOptions {
  position: LatLonAlt;
  label?: string | null;
  /** Image URL, an `ImageSource`, or null for a label-only placemark. */
  imageSource?: string | WWImageSource | null;
  imageScale?: number;
  imageColor?: ColorInput;
  imageOffset?: OffsetInput;
  imageRotation?: number;
  imageTilt?: number;
  labelColor?: ColorInput;
  labelFontSize?: number;
  labelOffset?: OffsetInput;
  labelOutline?: boolean;
  altitudeMode?: AltitudeMode;
  /** Shrink the image with distance. Defaults to true. */
  eyeDistanceScaling?: boolean;
  eyeDistanceScalingThreshold?: number;
  alwaysOnTop?: boolean;
  drawLeaderLine?: boolean;
  leaderLineColor?: ColorInput;
  depthTest?: boolean;
  /** Attributes applied while `highlighted` is true. `null` removes them. */
  highlight?: PlacemarkHighlight | null;
}

export function createPlacemark(worldWind: WorldWindStatic, options: PlacemarkOptions): WWPlacemark {
  const placemark = new worldWind.Placemark(
    toPosition(worldWind, options.position),
    options.eyeDistanceScaling ?? true,
    null,
  );
  updatePlacemark(worldWind, placemark, options);
  return placemark;
}

export function updatePlacemark(
  worldWind: WorldWindStatic,
  placemark: WWPlacemark,
  options: Partial<PlacemarkOptions>,
): void {
  if (options.position) placemark.position = toPosition(worldWind, options.position);
  if (options.label !== undefined) placemark.label = options.label;
  if (options.altitudeMode !== undefined) placemark.altitudeMode = altitudeModeValue(worldWind, options.altitudeMode);
  if (options.eyeDistanceScaling !== undefined) placemark.eyeDistanceScaling = options.eyeDistanceScaling;
  if (options.eyeDistanceScalingThreshold !== undefined) {
    placemark.eyeDistanceScalingThreshold = options.eyeDistanceScalingThreshold;
  }
  if (options.alwaysOnTop !== undefined) placemark.alwaysOnTop = options.alwaysOnTop;
  if (options.imageRotation !== undefined) placemark.imageRotation = options.imageRotation;
  if (options.imageTilt !== undefined) placemark.imageTilt = options.imageTilt;

  const attributes = placemark.attributes;
  if (options.imageSource !== undefined) attributes.imageSource = options.imageSource;
  if (options.imageScale !== undefined) attributes.imageScale = options.imageScale;
  if (options.imageColor !== undefined) attributes.imageColor = toColor(worldWind, options.imageColor);
  if (options.imageOffset !== undefined) attributes.imageOffset = toOffset(worldWind, options.imageOffset);
  if (options.depthTest !== undefined) attributes.depthTest = options.depthTest;
  if (options.drawLeaderLine !== undefined) attributes.drawLeaderLine = options.drawLeaderLine;
  if (options.leaderLineColor !== undefined) {
    attributes.leaderLineAttributes.outlineColor = toColor(worldWind, options.leaderLineColor);
  }

  const label = attributes.labelAttributes;
  let labelChanged = false;
  if (options.labelColor !== undefined) {
    label.color = toColor(worldWind, options.labelColor);
    labelChanged = true;
  }
  if (options.labelFontSize !== undefined) {
    label.font = new worldWind.Font(options.labelFontSize);
    labelChanged = true;
  }
  if (options.labelOffset !== undefined) {
    label.offset = toOffset(worldWind, options.labelOffset);
    labelChanged = true;
  }
  if (options.labelOutline !== undefined) {
    label.enableOutline = options.labelOutline;
    labelChanged = true;
  }
  // Re-assigning through the setter refreshes the attributes' state key so WorldWind re-renders the label.
  if (labelChanged) attributes.labelAttributes = label;

  if (options.highlight !== undefined) {
    if (options.highlight === null) {
      placemark.highlightAttributes = null;
    } else {
      const highlight: WWPlacemarkAttributes = new worldWind.PlacemarkAttributes(attributes);
      if (options.highlight.imageScale !== undefined) highlight.imageScale = options.highlight.imageScale;
      if (options.highlight.imageColor !== undefined) {
        highlight.imageColor = toColor(worldWind, options.highlight.imageColor);
      }
      placemark.highlightAttributes = highlight;
    }
  }
  applyRenderableOptions(placemark, options);
}

// Path --------------------------------------------------------------------------------------------

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

export function createPath(worldWind: WorldWindStatic, options: PathOptions): WWPath {
  const path = new worldWind.Path(toPositions(worldWind, options.positions), createShapeAttributes(worldWind));
  updatePath(worldWind, path, options);
  return path;
}

export function updatePath(worldWind: WorldWindStatic, path: WWPath, options: Partial<PathOptions>): void {
  if (options.positions) path.positions = toPositions(worldWind, options.positions);
  if (options.altitudeMode !== undefined) path.altitudeMode = altitudeModeValue(worldWind, options.altitudeMode);
  if (options.followTerrain !== undefined) path.followTerrain = options.followTerrain;
  if (options.extrude !== undefined) path.extrude = options.extrude;
  if (options.pathType !== undefined) path.pathType = pathTypeValue(worldWind, options.pathType);
  if (options.numSubSegments !== undefined) path.numSubSegments = options.numSubSegments;
  if (options.terrainConformance !== undefined) path.terrainConformance = options.terrainConformance;
  applyShapeStyle(worldWind, path.attributes, options);
  applyHighlight(worldWind, path, options.highlight);
  applyRenderableOptions(path, options);
}

// Polygon -----------------------------------------------------------------------------------------

export type PolygonBoundaries = LatLonAlt[] | LatLonAlt[][];

function isMultiRing(boundaries: PolygonBoundaries): boundaries is LatLonAlt[][] {
  return Array.isArray(boundaries[0]);
}

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

export function createPolygon(worldWind: WorldWindStatic, options: PolygonOptions): WWPolygon {
  const polygon = new worldWind.Polygon(
    toPolygonBoundaries(worldWind, options.boundaries),
    createShapeAttributes(worldWind),
  );
  updatePolygon(worldWind, polygon, options);
  return polygon;
}

export function updatePolygon(worldWind: WorldWindStatic, polygon: WWPolygon, options: Partial<PolygonOptions>): void {
  if (options.boundaries) polygon.boundaries = toPolygonBoundaries(worldWind, options.boundaries);
  if (options.altitudeMode !== undefined) polygon.altitudeMode = altitudeModeValue(worldWind, options.altitudeMode);
  if (options.extrude !== undefined) polygon.extrude = options.extrude;
  applyShapeStyle(worldWind, polygon.attributes, options);
  applyHighlight(worldWind, polygon, options.highlight);
  applyRenderableOptions(polygon, options);
}

// Surface shapes (draped on the terrain) ----------------------------------------------------------

export interface SurfaceShapeOptions extends RenderableOptions, ShapeStyle {
  pathType?: PathType;
  highlight?: ShapeStyle | null;
}

function updateSurfaceShape(
  worldWind: WorldWindStatic,
  shape: { attributes: WWShapeAttributes; highlightAttributes: WWShapeAttributes | null; pathType: string } & WWRenderable,
  options: Partial<SurfaceShapeOptions>,
): void {
  if (options.pathType !== undefined) shape.pathType = pathTypeValue(worldWind, options.pathType);
  applyShapeStyle(worldWind, shape.attributes, options);
  applyHighlight(worldWind, shape, options.highlight);
  applyRenderableOptions(shape, options);
}

export interface SurfacePolylineOptions extends SurfaceShapeOptions {
  locations: LatLon[];
}

export function createSurfacePolyline(worldWind: WorldWindStatic, options: SurfacePolylineOptions): WWSurfacePolyline {
  const shape = new worldWind.SurfacePolyline(
    toLocations(worldWind, options.locations),
    createShapeAttributes(worldWind, { fill: null }),
  );
  updateSurfacePolyline(worldWind, shape, options);
  return shape;
}

export function updateSurfacePolyline(
  worldWind: WorldWindStatic,
  shape: WWSurfacePolyline,
  options: Partial<SurfacePolylineOptions>,
): void {
  if (options.locations) shape.locations = toLocations(worldWind, options.locations);
  updateSurfaceShape(worldWind, shape, options);
}

export type SurfacePolygonBoundaries = LatLon[] | LatLon[][];

export interface SurfacePolygonOptions extends SurfaceShapeOptions {
  boundaries: SurfacePolygonBoundaries;
}

function toSurfaceBoundaries(worldWind: WorldWindStatic, boundaries: SurfacePolygonBoundaries) {
  return Array.isArray(boundaries[0])
    ? (boundaries as LatLon[][]).map((ring) => toLocations(worldWind, ring))
    : toLocations(worldWind, boundaries as LatLon[]);
}

export function createSurfacePolygon(worldWind: WorldWindStatic, options: SurfacePolygonOptions): WWSurfacePolygon {
  const shape = new worldWind.SurfacePolygon(
    toSurfaceBoundaries(worldWind, options.boundaries),
    createShapeAttributes(worldWind),
  );
  updateSurfacePolygon(worldWind, shape, options);
  return shape;
}

export function updateSurfacePolygon(
  worldWind: WorldWindStatic,
  shape: WWSurfacePolygon,
  options: Partial<SurfacePolygonOptions>,
): void {
  if (options.boundaries) shape.boundaries = toSurfaceBoundaries(worldWind, options.boundaries);
  updateSurfaceShape(worldWind, shape, options);
}

export interface SurfaceCircleOptions extends SurfaceShapeOptions {
  center: LatLon;
  /** Radius in metres. */
  radius: number;
}

export function createSurfaceCircle(worldWind: WorldWindStatic, options: SurfaceCircleOptions): WWSurfaceCircle {
  const shape = new worldWind.SurfaceCircle(
    toLocation(worldWind, options.center),
    options.radius,
    createShapeAttributes(worldWind),
  );
  updateSurfaceCircle(worldWind, shape, options);
  return shape;
}

export function updateSurfaceCircle(
  worldWind: WorldWindStatic,
  shape: WWSurfaceCircle,
  options: Partial<SurfaceCircleOptions>,
): void {
  if (options.center) shape.center = toLocation(worldWind, options.center);
  if (options.radius !== undefined) shape.radius = options.radius;
  updateSurfaceShape(worldWind, shape, options);
}

// Text --------------------------------------------------------------------------------------------

export interface GeographicTextOptions extends RenderableOptions {
  position: LatLonAlt;
  text: string;
  color?: ColorInput;
  fontSize?: number;
  outline?: boolean;
  outlineColor?: ColorInput;
  offset?: OffsetInput;
  altitudeMode?: AltitudeMode;
  alwaysOnTop?: boolean;
  depthTest?: boolean;
}

export function createGeographicText(worldWind: WorldWindStatic, options: GeographicTextOptions): WWGeographicText {
  const text = new worldWind.GeographicText(toPosition(worldWind, options.position), options.text);
  updateGeographicText(worldWind, text, options);
  return text;
}

export function updateGeographicText(
  worldWind: WorldWindStatic,
  text: WWGeographicText,
  options: Partial<GeographicTextOptions>,
): void {
  if (options.position) text.position = toPosition(worldWind, options.position);
  if (options.text !== undefined) text.text = options.text;
  if (options.altitudeMode !== undefined) text.altitudeMode = altitudeModeValue(worldWind, options.altitudeMode);
  if (options.alwaysOnTop !== undefined) text.alwaysOnTop = options.alwaysOnTop;
  const attributes: WWTextAttributes = text.attributes;
  if (options.color !== undefined) attributes.color = toColor(worldWind, options.color);
  if (options.fontSize !== undefined) attributes.font = new worldWind.Font(options.fontSize);
  if (options.outline !== undefined) attributes.enableOutline = options.outline;
  if (options.outlineColor !== undefined) attributes.outlineColor = toColor(worldWind, options.outlineColor);
  if (options.offset !== undefined) attributes.offset = toOffset(worldWind, options.offset);
  if (options.depthTest !== undefined) attributes.depthTest = options.depthTest;
  applyRenderableOptions(text, options);
}
