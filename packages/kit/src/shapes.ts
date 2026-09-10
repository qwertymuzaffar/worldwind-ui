/**
 * Shape factories, grouped by family. This module is the public entry: the `shapes/` modules
 * also export internal helpers that are deliberately not re-exported here.
 */
export {
  altitudeModeValue,
  applyShapeStyle,
  createShapeAttributes,
  pathTypeValue,
  toOffset,
  type AltitudeMode,
  type OffsetInput,
  type OffsetUnits,
  type PathType,
  type RenderableOptions,
  type ShapeStyle,
} from './shapes/attributes';
export {
  createPlacemark,
  updatePlacemark,
  type PlacemarkHighlight,
  type PlacemarkOptions,
} from './shapes/placemark';
export {
  createPath,
  createPolygon,
  updatePath,
  updatePolygon,
  type PathOptions,
  type PolygonBoundaries,
  type PolygonOptions,
} from './shapes/path-polygon';
export {
  createSurfaceCircle,
  createSurfacePolygon,
  createSurfacePolyline,
  updateSurfaceCircle,
  updateSurfacePolygon,
  updateSurfacePolyline,
  type SurfaceCircleOptions,
  type SurfacePolygonBoundaries,
  type SurfacePolygonOptions,
  type SurfacePolylineOptions,
  type SurfaceShapeOptions,
} from './shapes/surface';
export {
  createGeographicText,
  updateGeographicText,
  type GeographicTextOptions,
} from './shapes/text';
