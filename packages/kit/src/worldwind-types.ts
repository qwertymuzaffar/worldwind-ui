/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Typings for the parts of NASA WorldWind that worldwind-kit uses.
 *
 * WorldWind ships no TypeScript declarations. These interfaces describe the runtime
 * objects as they exist in `@nasaworldwind/worldwind` 0.9 through 0.11. They are
 * deliberately partial: anything not listed is still reachable through the index
 * signature on {@link WorldWindStatic}, typed as `any`.
 */

/** @category WorldWind types */
export interface WWLocation {
  latitude: number;
  longitude: number;
}

/** @category WorldWind types */
export interface WWPosition extends WWLocation {
  altitude: number;
}

/** WorldWind's Vec2 extends Float64Array; only indexed access is needed here.
 * @category WorldWind types
 */
export interface WWVec2 {
  0: number;
  1: number;
  readonly length: number;
}

/** @category WorldWind types */
export interface WWColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  clone(): WWColor;
  equals(color: WWColor): boolean;
  toHexString(includeAlpha?: boolean): string;
  toCssColorString(): string;
}

/** @category WorldWind types */
export interface WWOffset {
  x: number;
  y: number;
  xUnits: string;
  yUnits: string;
  clone(): WWOffset;
}

/** @category WorldWind types */
export interface WWSector {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

/** @category WorldWind types */
export interface WWFont {
  size: number;
  style: string;
  variant: string;
  weight: string;
  family: string;
  horizontalAlignment: string;
}

/** @category WorldWind types */
export interface WWImageSource {
  image: HTMLImageElement | HTMLCanvasElement;
  key: string;
}

/** @category WorldWind types */
export interface WWLayer {
  displayName: string;
  enabled: boolean;
  pickEnabled: boolean;
  opacity: number;
  minActiveAltitude: number;
  maxActiveAltitude: number;
  time: Date | null;
  inCurrentFrame: boolean;
  [key: string]: any;
}

/** @category WorldWind types */
export interface WWRenderable {
  displayName: string | null;
  enabled: boolean;
  pickDelegate: unknown;
  userProperties: unknown;
  [key: string]: any;
}

/** @category WorldWind types */
export interface WWRenderableLayer extends WWLayer {
  renderables: WWRenderable[];
  addRenderable(renderable: WWRenderable): void;
  addRenderables(renderables: WWRenderable[]): void;
  removeRenderable(renderable: WWRenderable): void;
  removeAllRenderables(): void;
}

/** @category WorldWind types */
export interface WWTextAttributes {
  color: WWColor;
  font: WWFont;
  scale: number;
  offset: WWOffset;
  depthTest: boolean;
  enableOutline: boolean;
  outlineWidth: number;
  outlineColor: WWColor;
}

/** @category WorldWind types */
export interface WWShapeAttributes {
  drawInterior: boolean;
  drawOutline: boolean;
  enableLighting: boolean;
  interiorColor: WWColor;
  outlineColor: WWColor;
  outlineWidth: number;
  outlineStippleFactor: number;
  outlineStipplePattern: number;
  imageSource: string | WWImageSource | null;
  depthTest: boolean;
  drawVerticals: boolean;
  applyLighting: boolean;
}

/** @category WorldWind types */
export interface WWPlacemarkAttributes {
  imageColor: WWColor;
  imageOffset: WWOffset;
  imageScale: number;
  imageSource: string | WWImageSource | null;
  depthTest: boolean;
  labelAttributes: WWTextAttributes;
  drawLeaderLine: boolean;
  leaderLineAttributes: WWShapeAttributes;
}

/** @category WorldWind types */
export interface WWPlacemark extends WWRenderable {
  position: WWPosition;
  label: string | null;
  attributes: WWPlacemarkAttributes;
  highlightAttributes: WWPlacemarkAttributes | null;
  highlighted: boolean;
  altitudeMode: string;
  alwaysOnTop: boolean;
  eyeDistanceScaling: boolean;
  eyeDistanceScalingThreshold: number;
  eyeDistanceScalingLabelThreshold: number;
  imageRotation: number;
  imageTilt: number;
  enableLeaderLinePicking: boolean;
}

/** @category WorldWind types */
export interface WWAbstractShape extends WWRenderable {
  attributes: WWShapeAttributes;
  highlightAttributes: WWShapeAttributes | null;
  highlighted: boolean;
  altitudeMode: string;
}

/** @category WorldWind types */
export interface WWPath extends WWAbstractShape {
  positions: WWPosition[];
  followTerrain: boolean;
  extrude: boolean;
  pathType: string;
  numSubSegments: number;
  terrainConformance: number;
}

/** @category WorldWind types */
export interface WWPolygon extends WWAbstractShape {
  boundaries: WWPosition[] | WWPosition[][];
  extrude: boolean;
}

/** @category WorldWind types */
export interface WWSurfaceShape extends WWRenderable {
  attributes: WWShapeAttributes;
  highlightAttributes: WWShapeAttributes | null;
  highlighted: boolean;
  pathType: string;
  maximumNumEdgeIntervals: number;
}

/** @category WorldWind types */
export interface WWSurfacePolyline extends WWSurfaceShape {
  locations: WWLocation[];
}

/** @category WorldWind types */
export interface WWSurfacePolygon extends WWSurfaceShape {
  boundaries: WWLocation[] | WWLocation[][];
}

/** @category WorldWind types */
export interface WWSurfaceCircle extends WWSurfaceShape {
  center: WWLocation;
  radius: number;
}

/** @category WorldWind types */
export interface WWGeographicText extends WWRenderable {
  text: string;
  position: WWPosition;
  attributes: WWTextAttributes;
  altitudeMode: string;
  alwaysOnTop: boolean;
}

/** @category WorldWind types */
export interface WWNavigator {
  lookAtLocation: WWLocation;
  range: number;
  heading: number;
  tilt: number;
  roll: number;
  enable2DLimits: boolean;
}

/** @category WorldWind types */
export interface WWGoToAnimator {
  travelTime: number;
  animationFrequency: number;
  cancelled: boolean;
  goTo(position: WWLocation | WWPosition, completionCallback?: () => void): void;
  cancel(): void;
}

/** @category WorldWind types */
export interface WWGlobe {
  elevationModel: unknown;
  projection: unknown;
  equatorialRadius: number;
  polarRadius: number;
  is2D(): boolean;
  [key: string]: any;
}

/** @category WorldWind types */
export interface WWPickedObject {
  userObject: any;
  position: WWPosition | null;
  parentLayer: WWLayer | null;
  isTerrain: boolean;
  isOnTop: boolean;
  color: WWColor;
}

/** @category WorldWind types */
export interface WWPickedObjectList {
  objects: WWPickedObject[];
  hasNonTerrainObjects(): boolean;
  terrainObject(): WWPickedObject | null;
  topPickedObject(): WWPickedObject | null;
}

/** @category WorldWind types */
export type WWRedrawCallback = (wwd: WWWorldWindow, stage: string) => void;

/** @category WorldWind types */
export interface WWWorldWindow {
  canvas: HTMLCanvasElement;
  layers: WWLayer[];
  navigator: WWNavigator;
  globe: WWGlobe;
  goToAnimator: WWGoToAnimator;
  worldWindowController: any;
  redrawCallbacks: WWRedrawCallback[];
  deepPicking: boolean;
  subsurfaceMode: boolean;
  pixelScale: number;
  verticalExaggeration: number;
  surfaceOpacity: number;
  redrawRequestId: number | null;
  drawContext: { currentGlContext: WebGLRenderingContext; [key: string]: any };
  frameStatistics: any;
  addLayer(layer: WWLayer): void;
  removeLayer(layer: WWLayer): void;
  insertLayer(index: number, layer: WWLayer): void;
  indexOfLayer(layer: WWLayer): number;
  redraw(): void;
  pick(point: WWVec2): WWPickedObjectList;
  pickTerrain(point: WWVec2): WWPickedObjectList;
  canvasCoordinates(clientX: number, clientY: number): WWVec2;
  goTo(position: WWLocation | WWPosition, completionCallback?: () => void): void;
  /** Metres per drawing-buffer pixel at a distance from the eye. */
  pixelSizeAtDistance?(distance: number): number;
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
  onGestureEvent(event: Event): void;
  [key: string]: any;
}

/** @category WorldWind types */
export interface WWGestureRecognizer {
  enabled: boolean;
  readonly state: string;
  readonly clientX: number;
  readonly clientY: number;
  target: unknown;
  /** Lets this recognizer recognize at the same time as `other` instead of one failing the other. */
  recognizeSimultaneouslyWith(other: WWGestureRecognizer): void;
  [key: string]: any;
}

/** @category WorldWind types */
export interface WWWmsLayerConfig {
  service: string;
  layerNames: string;
  sector: WWSector;
  levelZeroDelta: WWLocation;
  numLevels: number;
  format: string;
  size: number;
  coordinateSystem?: string;
  styleNames?: string;
  title?: string;
  version?: string;
}

/** @category WorldWind types */
export interface WWWmtsLayerConfig {
  identifier: string;
  service?: string;
  resourceUrl?: string;
  format: string;
  style?: string;
  tileMatrixSet: any;
  title?: string;
  [key: string]: any;
}

/** @category WorldWind types */
export interface WWWmsCapabilities {
  getNamedLayer(name: string): any | null;
  getNamedLayers(): any[];
  [key: string]: any;
}

/** @category WorldWind types */
export interface WWWmtsCapabilities {
  getLayer(identifier: string): any | null;
  contents: { layer: any[]; [key: string]: any };
  [key: string]: any;
}

/** @category WorldWind types */
export interface WWGeoJSONParser {
  load(
    completionCallback: ((layer: WWRenderableLayer) => void) | null,
    shapeConfigurationCallback: ((geometry: any, properties: any) => any) | null,
    layer: WWRenderableLayer | null,
  ): void;
}

/** @category WorldWind types */
export interface WWLengthMeasurer {
  getLength(positions: WWPosition[], followTerrain?: boolean, pathType?: string): number;
}

/** @category WorldWind types */
export interface WWAreaMeasurer {
  getArea(positions: WWPosition[], followTerrain?: boolean, pathType?: string): number;
}

/** Constructor helper: `WWCtor<Instance, ConstructorArgs>`.
 * @category WorldWind types
 */
export type WWCtor<T, A extends unknown[] = any[]> = new (...args: A) => T;

type LayerCtor<A extends unknown[] = []> = WWCtor<WWLayer, A>;

/** The `WorldWind` namespace object exported by `@nasaworldwind/worldwind`.
 * @category WorldWind types
 */
export interface WorldWindStatic {
  configuration: {
    baseUrl: string;
    gpuCacheSize: number;
    layerRetrievalQueueSize: number;
    coverageRetrievalQueueSize: number;
    bingLogoPlacement: WWOffset;
    bingLogoAlignment: WWOffset;
  };
  BingMapsKey: string | null;
  Logger: {
    setLoggingLevel(level: number): void;
    log(level: number, message: string): void;
    LEVEL_NONE: number;
    LEVEL_SEVERE: number;
    LEVEL_WARNING: number;
    LEVEL_INFO: number;
  };
  Angle: {
    DEGREES_TO_RADIANS: number;
    RADIANS_TO_DEGREES: number;
    normalizedDegreesLatitude(degrees: number): number;
    normalizedDegreesLongitude(degrees: number): number;
    [key: string]: any;
  };

  // Constants
  ABSOLUTE: string;
  CLAMP_TO_GROUND: string;
  RELATIVE_TO_GROUND: string;
  GREAT_CIRCLE: string;
  LINEAR: string;
  RHUMB_LINE: string;
  OFFSET_FRACTION: string;
  OFFSET_INSET_PIXELS: string;
  OFFSET_PIXELS: string;
  BEFORE_REDRAW: string;
  AFTER_REDRAW: string;
  POSSIBLE: string;
  BEGAN: string;
  CHANGED: string;
  ENDED: string;
  CANCELLED: string;
  FAILED: string;
  RECOGNIZED: string;
  REDRAW_EVENT_TYPE: string;
  WGS84_SEMI_MAJOR_AXIS: number;
  WGS84_SEMI_MINOR_AXIS: number;

  // Core
  WorldWindow: WWCtor<WWWorldWindow, [canvas: HTMLCanvasElement | string, elevationModel?: unknown]>;
  Position: WWCtor<WWPosition, [latitude: number, longitude: number, altitude: number]>;
  Location: WWCtor<WWLocation, [latitude: number, longitude: number]> & {
    /** Great-circle distance in radians. Multiply by the globe radius for metres. */
    greatCircleDistance(a: WWLocation, b: WWLocation): number;
    greatCircleAzimuth(a: WWLocation, b: WWLocation): number;
    greatCircleLocation(
      origin: WWLocation,
      azimuthDegrees: number,
      distanceRadians: number,
      result: WWLocation,
    ): WWLocation;
    rhumbDistance(a: WWLocation, b: WWLocation): number;
    linearDistance(a: WWLocation, b: WWLocation): number;
    interpolateGreatCircle(amount: number, a: WWLocation, b: WWLocation, result: WWLocation): WWLocation;
    [key: string]: any;
  };
  Color: WWCtor<WWColor, [red: number, green: number, blue: number, alpha: number]> & {
    WHITE: WWColor;
    BLACK: WWColor;
    RED: WWColor;
    GREEN: WWColor;
    BLUE: WWColor;
    CYAN: WWColor;
    YELLOW: WWColor;
    MAGENTA: WWColor;
    LIGHT_GRAY: WWColor;
    MEDIUM_GRAY: WWColor;
    DARK_GRAY: WWColor;
    TRANSPARENT: WWColor;
    colorFromHex(hex: string): WWColor;
    colorFromBytes(red: number, green: number, blue: number, alpha: number): WWColor;
    colorFromByteArray(bytes: number[]): WWColor;
  };
  Offset: WWCtor<WWOffset, [xUnits: string, x: number, yUnits: string, y: number]>;
  Font: WWCtor<
    WWFont,
    [size: number, style?: string, variant?: string, weight?: string, family?: string, horizontalAlignment?: string]
  >;
  Sector: WWCtor<WWSector, [minLatitude: number, maxLatitude: number, minLongitude: number, maxLongitude: number]> & {
    FULL_SPHERE: WWSector;
  };
  Vec2: WWCtor<WWVec2, [x: number, y: number]>;
  Vec3: WWCtor<any, [x: number, y: number, z: number]>;
  ImageSource: WWCtor<WWImageSource, [image: HTMLImageElement | HTMLCanvasElement]>;

  // Layers
  Layer: LayerCtor<[displayName?: string]>;
  RenderableLayer: WWCtor<WWRenderableLayer, [displayName?: string]>;
  BMNGOneImageLayer: LayerCtor;
  BMNGLayer: LayerCtor;
  BMNGLandsatLayer: LayerCtor;
  BingAerialLayer: LayerCtor<[bingMapsKey?: string | null]>;
  BingAerialWithLabelsLayer: LayerCtor<[bingMapsKey?: string | null]>;
  BingRoadsLayer: LayerCtor<[bingMapsKey?: string | null]>;
  OpenStreetMapImageLayer: LayerCtor<[layerName?: string]>;
  AtmosphereLayer: LayerCtor<[nightImageSource?: string]>;
  StarFieldLayer: LayerCtor<[starDataSource?: string]>;
  CompassLayer: LayerCtor;
  CoordinatesDisplayLayer: LayerCtor<[wwd: WWWorldWindow]>;
  ViewControlsLayer: LayerCtor<[wwd: WWWorldWindow]>;
  FrameStatisticsLayer: LayerCtor<[wwd: WWWorldWindow]>;
  ShowTessellationLayer: LayerCtor;
  TectonicPlatesLayer: LayerCtor<[attributes?: WWShapeAttributes | null]>;
  WmsLayer: LayerCtor<[config: WWWmsLayerConfig, timeString?: string | null]> & {
    formLayerConfiguration(wmsLayerCapabilities: any): WWWmsLayerConfig;
  };
  WmtsLayer: LayerCtor<[config: WWWmtsLayerConfig, timeString?: string | null]> & {
    formLayerConfiguration(wmtsLayerCapabilities: any, style?: string, matrixSet?: string, imageFormat?: string): WWWmtsLayerConfig;
  };
  WmsCapabilities: WWCtor<WWWmsCapabilities, [xmlDom: Document]>;
  WmtsCapabilities: WWCtor<WWWmtsCapabilities, [xmlDom: Document]>;
  KmlFile: WWCtor<any, [url: string, controls?: unknown[]]>;
  HeatMapLayer: LayerCtor<[displayName: string, data: any[]]>;

  // Shapes
  Placemark: WWCtor<
    WWPlacemark,
    [position: WWPosition, eyeDistanceScaling?: boolean, attributes?: WWPlacemarkAttributes | null]
  >;
  PlacemarkAttributes: WWCtor<WWPlacemarkAttributes, [attributes?: WWPlacemarkAttributes | null]>;
  ShapeAttributes: WWCtor<WWShapeAttributes, [attributes?: WWShapeAttributes | null]>;
  TextAttributes: WWCtor<WWTextAttributes, [attributes?: WWTextAttributes | null]>;
  Path: WWCtor<WWPath, [positions: WWPosition[], attributes?: WWShapeAttributes | null]>;
  Polygon: WWCtor<WWPolygon, [boundaries: WWPosition[] | WWPosition[][], attributes?: WWShapeAttributes | null]>;
  SurfacePolyline: WWCtor<WWSurfacePolyline, [locations: WWLocation[], attributes?: WWShapeAttributes | null]>;
  SurfacePolygon: WWCtor<
    WWSurfacePolygon,
    [boundaries: WWLocation[] | WWLocation[][], attributes?: WWShapeAttributes | null]
  >;
  SurfaceCircle: WWCtor<WWSurfaceCircle, [center: WWLocation, radius: number, attributes?: WWShapeAttributes | null]>;
  SurfaceEllipse: WWCtor<WWSurfaceShape, any[]>;
  SurfaceRectangle: WWCtor<WWSurfaceShape, any[]>;
  SurfaceSector: WWCtor<WWSurfaceShape, [sector: WWSector, attributes?: WWShapeAttributes | null]>;
  SurfaceImage: WWCtor<WWRenderable, [sector: WWSector, imageSource: string | WWImageSource]>;
  GeographicText: WWCtor<WWGeographicText, [position: WWPosition, text: string]>;
  ScreenText: WWCtor<WWRenderable, [screenOffset: WWOffset, text: string]>;
  ScreenImage: WWCtor<WWRenderable, [screenOffset: WWOffset, imageSource: string | WWImageSource]>;

  // Gestures
  GestureRecognizer: WWCtor<WWGestureRecognizer, [target: unknown, callback: ((r: any) => void) | null]>;
  ClickRecognizer: WWCtor<
    WWGestureRecognizer & { numberOfClicks: number; button: number },
    [target: unknown, callback: ((r: any) => void) | null]
  >;
  TapRecognizer: WWCtor<
    WWGestureRecognizer & { numberOfTaps: number; numberOfTouches: number },
    [target: unknown, callback: ((r: any) => void) | null]
  >;
  DragRecognizer: WWCtor<WWGestureRecognizer, [target: unknown, callback: ((r: any) => void) | null]>;
  PanRecognizer: WWCtor<WWGestureRecognizer, [target: unknown, callback: ((r: any) => void) | null]>;
  PinchRecognizer: WWCtor<WWGestureRecognizer, [target: unknown, callback: ((r: any) => void) | null]>;
  RotationRecognizer: WWCtor<WWGestureRecognizer, [target: unknown, callback: ((r: any) => void) | null]>;
  TiltRecognizer: WWCtor<WWGestureRecognizer, [target: unknown, callback: ((r: any) => void) | null]>;

  // Data, tools, globe
  GeoJSONParser: WWCtor<WWGeoJSONParser, [dataSource: string | object]>;
  HighlightController: WWCtor<unknown, [wwd: WWWorldWindow]>;
  LengthMeasurer: WWCtor<WWLengthMeasurer, [wwd: WWWorldWindow]>;
  AreaMeasurer: WWCtor<WWAreaMeasurer, [wwd: WWWorldWindow]>;
  ElevationModel: WWCtor<unknown, []>;
  EarthElevationModel: WWCtor<unknown, []>;
  Globe: WWCtor<WWGlobe, [elevationModel: unknown, projection?: unknown]>;
  Globe2D: WWCtor<WWGlobe, []>;
  ProjectionEquirectangular: WWCtor<unknown, []>;
  ProjectionMercator: WWCtor<unknown, []>;
  ProjectionPolarEquidistant: WWCtor<unknown, [pole?: string]>;
  ProjectionUPS: WWCtor<unknown, [pole?: string]>;
  ProjectionGnomonic: WWCtor<unknown, [pole?: string]>;
  ProjectionWgs84: WWCtor<unknown, []>;
  GoToAnimator: WWCtor<WWGoToAnimator, [wwd: WWWorldWindow]>;
  LookAtNavigator: WWCtor<WWNavigator, []>;
  BasicWorldWindowController: WWCtor<any, [wwd: WWWorldWindow]>;
  WWUtil: any;
  WWMath: any;

  /** Everything else WorldWind exports, untyped. */
  [key: string]: any;
}
