import { pushpinUrl, type PushpinColor } from './assets';
import { toColor, type ColorInput } from './color';
import { applyShapeStyle, toOffset, type OffsetInput, type PlacemarkHighlight, type ShapeStyle } from './shapes';
import type { WWPlacemarkAttributes, WWRenderableLayer, WWShapeAttributes, WorldWindStatic } from './worldwind-types';

export type GeoJsonGeometryType =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'Unknown';

export interface GeoJsonPointStyle {
  /** Image URL, or null for label-only points. Defaults to a pushpin. */
  imageSource?: string | null;
  /** Pushpin colour used when no `imageSource` is given. */
  pushpin?: PushpinColor;
  imageScale?: number;
  imageColor?: ColorInput;
  imageOffset?: OffsetInput;
  /** Name of the feature property to use as the label. */
  labelProperty?: string;
  labelColor?: ColorInput;
  labelFontSize?: number;
}

export interface GeoJsonStyle {
  point?: GeoJsonPointStyle;
  line?: ShapeStyle;
  polygon?: ShapeStyle;
  highlight?: { point?: PlacemarkHighlight; line?: ShapeStyle; polygon?: ShapeStyle };
}

export interface GeoJsonFeatureInfo {
  properties: Record<string, unknown>;
  geometryType: GeoJsonGeometryType;
}

/** Returns the style for one feature; return undefined for the defaults. */
export type GeoJsonStyleResolver = (feature: GeoJsonFeatureInfo) => GeoJsonStyle | undefined;

export interface LoadGeoJsonOptions {
  style?: GeoJsonStyle | GeoJsonStyleResolver;
  /** Injectable for tests or custom transports. */
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

interface WWGeoJSONGeometry {
  isPointType(): boolean;
  isMultiPointType(): boolean;
  isLineStringType(): boolean;
  isMultiLineStringType(): boolean;
  isPolygonType(): boolean;
  isMultiPolygonType(): boolean;
}

export function geoJsonGeometryType(geometry: WWGeoJSONGeometry): GeoJsonGeometryType {
  if (geometry.isPointType()) return 'Point';
  if (geometry.isMultiPointType()) return 'MultiPoint';
  if (geometry.isLineStringType()) return 'LineString';
  if (geometry.isMultiLineStringType()) return 'MultiLineString';
  if (geometry.isPolygonType()) return 'Polygon';
  if (geometry.isMultiPolygonType()) return 'MultiPolygon';
  return 'Unknown';
}

interface ShapeConfiguration {
  attributes?: WWPlacemarkAttributes | WWShapeAttributes;
  highlightAttributes?: WWPlacemarkAttributes | WWShapeAttributes;
  name?: string;
  userProperties?: unknown;
}

/** Builds the callback WorldWind's GeoJSONParser calls for every geometry. */
export function geoJsonShapeConfiguration(
  worldWind: WorldWindStatic,
  style: GeoJsonStyle | GeoJsonStyleResolver | undefined,
): (geometry: WWGeoJSONGeometry, properties: Record<string, unknown>) => ShapeConfiguration {
  return (geometry, properties) => {
    const geometryType = geoJsonGeometryType(geometry);
    const resolved = (typeof style === 'function' ? style({ properties: properties ?? {}, geometryType }) : style) ?? {};
    const configuration: ShapeConfiguration = { userProperties: properties ?? {} };

    if (geometryType === 'Point' || geometryType === 'MultiPoint') {
      const point = resolved.point ?? {};
      const attributes = new worldWind.PlacemarkAttributes(null);
      attributes.imageSource =
        point.imageSource === undefined ? pushpinUrl(worldWind, point.pushpin ?? 'red') : point.imageSource;
      attributes.imageOffset = toOffset(worldWind, point.imageOffset ?? { x: 0.3, y: 0 });
      if (point.imageScale !== undefined) attributes.imageScale = point.imageScale;
      if (point.imageColor !== undefined) attributes.imageColor = toColor(worldWind, point.imageColor);
      const label = attributes.labelAttributes;
      label.offset = toOffset(worldWind, { x: 0.5, y: 1 });
      if (point.labelColor !== undefined) label.color = toColor(worldWind, point.labelColor);
      if (point.labelFontSize !== undefined) label.font = new worldWind.Font(point.labelFontSize);
      attributes.labelAttributes = label;
      configuration.attributes = attributes;
      if (point.labelProperty && properties && properties[point.labelProperty] != null) {
        configuration.name = String(properties[point.labelProperty]);
      }
      if (resolved.highlight?.point) {
        const highlight = new worldWind.PlacemarkAttributes(attributes);
        if (resolved.highlight.point.imageScale !== undefined) highlight.imageScale = resolved.highlight.point.imageScale;
        if (resolved.highlight.point.imageColor !== undefined) {
          highlight.imageColor = toColor(worldWind, resolved.highlight.point.imageColor);
        }
        configuration.highlightAttributes = highlight;
      }
      return configuration;
    }

    const isLine = geometryType === 'LineString' || geometryType === 'MultiLineString';
    const shapeStyle = isLine ? { fill: null, ...resolved.line } : (resolved.polygon ?? {});
    const attributes = applyShapeStyle(worldWind, new worldWind.ShapeAttributes(null), shapeStyle);
    configuration.attributes = attributes;
    const highlightStyle = isLine ? resolved.highlight?.line : resolved.highlight?.polygon;
    if (highlightStyle) {
      configuration.highlightAttributes = applyShapeStyle(
        worldWind,
        new worldWind.ShapeAttributes(attributes),
        highlightStyle,
      );
    }
    return configuration;
  };
}

/**
 * Loads GeoJSON (a URL, a JSON string, or an object) into a renderable layer with WorldWind's
 * parser. Points become placemarks, lines surface polylines, polygons surface polygons; every
 * shape carries the feature properties as `userProperties`, so picks return them.
 */
export async function loadGeoJson(
  worldWind: WorldWindStatic,
  source: string | object,
  layer: WWRenderableLayer,
  options: LoadGeoJsonOptions = {},
): Promise<WWRenderableLayer> {
  let data: object;
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      data = JSON.parse(trimmed) as object;
    } else {
      const doFetch = options.fetch ?? globalThis.fetch;
      if (typeof doFetch !== 'function') throw new Error('worldwind-kit: fetch is not available in this environment');
      const response = await doFetch(source, { signal: options.signal });
      if (!response.ok) throw new Error(`worldwind-kit: loading GeoJSON failed with HTTP ${response.status} for ${source}`);
      data = (await response.json()) as object;
    }
  } else {
    data = source;
  }
  return new Promise((resolve, reject) => {
    try {
      const parser = new worldWind.GeoJSONParser(data);
      parser.load((loaded) => resolve(loaded ?? layer), geoJsonShapeConfiguration(worldWind, options.style), layer);
    } catch (error) {
      reject(error);
    }
  });
}
