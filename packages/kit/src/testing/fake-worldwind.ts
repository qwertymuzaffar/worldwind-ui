/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * An in-memory stand-in for NASA WorldWind. It mirrors the constructors, fields and
 * constants that worldwind-kit and its framework adapters touch, needs no WebGL, and adds
 * a few test helpers (`simulateFrame`, `setPickResult`, `dispatch`, `simulate` on recognizers).
 */
import type { WorldWindStatic } from '../worldwind-types';

const DEG_TO_RAD = Math.PI / 180;

export class FakeLocation {
  constructor(
    public latitude: number,
    public longitude: number,
  ) {}

  /** Great-circle distance in radians, like WorldWind. */
  static greatCircleDistance(a: FakeLocation, b: FakeLocation): number {
    const lat1 = a.latitude * DEG_TO_RAD;
    const lat2 = b.latitude * DEG_TO_RAD;
    const dLat = lat2 - lat1;
    const dLon = (b.longitude - a.longitude) * DEG_TO_RAD;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  static greatCircleAzimuth(a: FakeLocation, b: FakeLocation): number {
    const lat1 = a.latitude * DEG_TO_RAD;
    const lat2 = b.latitude * DEG_TO_RAD;
    const dLon = (b.longitude - a.longitude) * DEG_TO_RAD;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return ((Math.atan2(y, x) / DEG_TO_RAD) + 360) % 360;
  }

  static rhumbDistance(a: FakeLocation, b: FakeLocation): number {
    return FakeLocation.greatCircleDistance(a, b);
  }

  static linearDistance(a: FakeLocation, b: FakeLocation): number {
    return FakeLocation.greatCircleDistance(a, b);
  }

  static interpolateGreatCircle(amount: number, a: FakeLocation, b: FakeLocation, result: FakeLocation): FakeLocation {
    result.latitude = a.latitude + (b.latitude - a.latitude) * amount;
    result.longitude = a.longitude + (b.longitude - a.longitude) * amount;
    return result;
  }

  static greatCircleLocation(origin: FakeLocation, _azimuth: number, _distance: number, result: FakeLocation) {
    result.latitude = origin.latitude;
    result.longitude = origin.longitude;
    return result;
  }
}

export class FakePosition extends FakeLocation {
  constructor(
    latitude: number,
    longitude: number,
    public altitude: number,
  ) {
    super(latitude, longitude);
  }
}

export class FakeColor {
  constructor(
    public red: number,
    public green: number,
    public blue: number,
    public alpha: number,
  ) {}

  static WHITE = new FakeColor(1, 1, 1, 1);
  static BLACK = new FakeColor(0, 0, 0, 1);
  static RED = new FakeColor(1, 0, 0, 1);
  static GREEN = new FakeColor(0, 1, 0, 1);
  static BLUE = new FakeColor(0, 0, 1, 1);
  static CYAN = new FakeColor(0, 1, 1, 1);
  static YELLOW = new FakeColor(1, 1, 0, 1);
  static MAGENTA = new FakeColor(1, 0, 1, 1);
  static LIGHT_GRAY = new FakeColor(0.75, 0.75, 0.75, 1);
  static MEDIUM_GRAY = new FakeColor(0.5, 0.5, 0.5, 1);
  static DARK_GRAY = new FakeColor(0.25, 0.25, 0.25, 1);
  static TRANSPARENT = new FakeColor(0, 0, 0, 0);

  static colorFromBytes(r: number, g: number, b: number, a: number): FakeColor {
    return new FakeColor(r / 255, g / 255, b / 255, a / 255);
  }

  static colorFromByteArray(bytes: number[]): FakeColor {
    return FakeColor.colorFromBytes(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 255);
  }

  static colorFromHex(hex: string): FakeColor {
    const clean = hex.replace('#', '');
    const channel = (i: number) => parseInt(clean.slice(i, i + 2), 16) / 255;
    return new FakeColor(channel(0), channel(2), channel(4), clean.length >= 8 ? channel(6) : 1);
  }

  clone(): FakeColor {
    return new FakeColor(this.red, this.green, this.blue, this.alpha);
  }

  equals(other: FakeColor): boolean {
    return (
      this.red === other.red && this.green === other.green && this.blue === other.blue && this.alpha === other.alpha
    );
  }

  toHexString(includeAlpha = false): string {
    const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${hex(this.red)}${hex(this.green)}${hex(this.blue)}${includeAlpha ? hex(this.alpha) : ''}`;
  }

  toCssColorString(): string {
    return `rgba(${Math.round(this.red * 255)}, ${Math.round(this.green * 255)}, ${Math.round(this.blue * 255)}, ${this.alpha})`;
  }
}

export class FakeOffset {
  constructor(
    public xUnits: string,
    public x: number,
    public yUnits: string,
    public y: number,
  ) {}

  clone(): FakeOffset {
    return new FakeOffset(this.xUnits, this.x, this.yUnits, this.y);
  }
}

export class FakeFont {
  constructor(
    public size: number,
    public style = 'normal',
    public variant = 'normal',
    public weight = 'normal',
    public family = 'sans-serif',
    public horizontalAlignment = 'center',
  ) {}
}

export class FakeSector {
  static FULL_SPHERE = new FakeSector(-90, 90, -180, 180);

  constructor(
    public minLatitude: number,
    public maxLatitude: number,
    public minLongitude: number,
    public maxLongitude: number,
  ) {}
}

export class FakeVec2 {
  0: number;
  1: number;
  readonly length = 2;

  constructor(x: number, y: number) {
    this[0] = x;
    this[1] = y;
  }
}

export class FakeVec3 extends FakeVec2 {
  2: number;

  constructor(x: number, y: number, z: number) {
    super(x, y);
    this[2] = z;
  }

  dot(other: FakeVec3): number {
    return this[0] * other[0] + this[1] * other[1] + this[2] * other[2];
  }
}

let imageSourceCounter = 0;

export class FakeImageSource {
  key: string;

  constructor(public image: HTMLImageElement | HTMLCanvasElement) {
    this.key = `fake-image-source-${++imageSourceCounter}`;
  }
}

// Layers ------------------------------------------------------------------------------------------

export class FakeLayer {
  enabled = true;
  pickEnabled = true;
  opacity = 1;
  minActiveAltitude = -Number.MAX_VALUE;
  maxActiveAltitude = Number.MAX_VALUE;
  time: Date | null = null;
  inCurrentFrame = false;
  /** Constructor arguments, so tests can assert what a layer was created with. */
  constructorArgs: unknown[] = [];
  /** How often `refresh()` was called (WorldWind expires the layer's imagery on refresh). */
  refreshCount = 0;

  constructor(public displayName = 'Layer') {}

  refresh(): void {
    this.refreshCount += 1;
  }
}

export class FakeRenderableLayer extends FakeLayer {
  renderables: unknown[] = [];

  constructor(displayName = 'Renderables') {
    super(displayName);
  }

  addRenderable(renderable: unknown): void {
    this.renderables.push(renderable);
  }

  addRenderables(renderables: unknown[]): void {
    this.renderables.push(...renderables);
  }

  removeRenderable(renderable: unknown): void {
    const index = this.renderables.indexOf(renderable);
    if (index !== -1) this.renderables.splice(index, 1);
  }

  removeAllRenderables(): void {
    this.renderables = [];
  }
}

function builtInLayer(displayName: string) {
  return class extends FakeLayer {
    constructor(...args: unknown[]) {
      super(displayName);
      this.constructorArgs = args;
    }
  };
}

export class FakeWmsLayer extends FakeLayer {
  /** Like WorldWind's WmsUrlBuilder, holds the TIME value used in requests. */
  urlBuilder: { timeString: string | null };
  cachePath: string;
  /** Tile bookkeeping as in WorldWind's TiledImageLayer, so tests can see a tile set being reset. */
  topLevelTiles: unknown[] = [{ fake: 'tile' }];
  tileCache = {
    cleared: 0,
    clear() {
      this.cleared += 1;
    },
  };
  currentTilesInvalid = false;

  constructor(
    public config: any,
    public timeString: string | null = null,
  ) {
    super(config?.title ?? config?.layerNames ?? 'WMS');
    this.constructorArgs = [config, timeString];
    this.urlBuilder = { timeString };
    this.cachePath = `${config?.service ?? ''}${config?.layerNames ?? ''}${timeString ?? ''}`;
  }

  /** Mirrors WorldWind: builds a layer config from a capabilities layer. */
  static formLayerConfiguration(layerCapabilities: any): any {
    return {
      service: layerCapabilities.service ?? 'https://fake.example/wms',
      layerNames: layerCapabilities.name,
      title: layerCapabilities.title || layerCapabilities.name,
      sector: FakeSector.FULL_SPHERE,
      levelZeroDelta: new FakeLocation(36, 36),
      numLevels: 19,
      format: 'image/png',
      size: 256,
    };
  }
}

export class FakeWmtsLayer extends FakeLayer {
  constructor(
    public config: any,
    public timeString: string | null = null,
  ) {
    super(config?.title ?? config?.identifier ?? 'WMTS');
    this.constructorArgs = [config, timeString];
  }

  static formLayerConfiguration(layerCapabilities: any, style?: string, matrixSet?: string, imageFormat?: string): any {
    return {
      identifier: layerCapabilities.identifier,
      title: layerCapabilities.title || layerCapabilities.identifier,
      style: style ?? 'default',
      matrixSet: matrixSet ?? 'EPSG:3857',
      format: imageFormat ?? 'image/png',
      tileMatrixSet: {},
    };
  }
}

function childText(element: Element, localName: string): string {
  for (const child of Array.from(element.children)) {
    if (child.localName === localName) return child.textContent?.trim() ?? '';
  }
  return '';
}

function childElements(element: Element, localName: string): Element[] {
  return Array.from(element.children).filter((child) => child.localName === localName);
}

function href(element: Element | undefined): string | undefined {
  return element?.getAttribute('xlink:href') ?? element?.getAttribute('href') ?? undefined;
}

export interface FakeWmsLayerCapabilities {
  name: string;
  title: string;
  /** Like WorldWind: each style lists `legendUrls` of `{ url, width, height, format }`. */
  styles?: Array<{ name: string; title: string; legendUrls?: Array<{ url?: string; width?: number; height?: number; format?: string }> }>;
  attribution?: { title?: string; url?: string };
  /** WMS 1.3.0 `<Dimension>` elements with content. */
  dimensions?: Array<{ name: string | null; units: string | null; default: string | null; content: string }>;
  /** WMS 1.1.1 `<Extent>` elements. */
  extents?: Array<{ name: string | null; units: string | null; default: string | null; content: string }>;
}

/** Reads `<Layer>` names, titles, styles with legends, attribution and time dimensions from a WMS capabilities document. */
export class FakeWmsCapabilities {
  readonly layers: FakeWmsLayerCapabilities[];

  constructor(public xmlDom: Document) {
    this.layers = Array.from(xmlDom.querySelectorAll('Layer'))
      .map((layer): FakeWmsLayerCapabilities => {
        const result: FakeWmsLayerCapabilities = { name: childText(layer, 'Name'), title: childText(layer, 'Title') };
        const styles = childElements(layer, 'Style').map((style) => ({
          name: childText(style, 'Name'),
          title: childText(style, 'Title'),
          legendUrls: childElements(style, 'LegendURL').map((legend) => ({
            url: href(childElements(legend, 'OnlineResource')[0]),
            width: Number(legend.getAttribute('width')) || undefined,
            height: Number(legend.getAttribute('height')) || undefined,
            format: childText(legend, 'Format') || undefined,
          })),
        }));
        if (styles.length) result.styles = styles;
        const attribution = childElements(layer, 'Attribution')[0];
        if (attribution) {
          result.attribution = { title: childText(attribution, 'Title') || undefined, url: href(childElements(attribution, 'OnlineResource')[0]) };
        }
        const dimension = (element: Element) => ({
          name: element.getAttribute('name'),
          units: element.getAttribute('units'),
          default: element.getAttribute('default'),
          content: element.textContent?.trim() ?? '',
        });
        const dimensions = childElements(layer, 'Dimension').filter((d) => d.textContent?.trim()).map(dimension);
        if (dimensions.length) result.dimensions = dimensions;
        const extents = childElements(layer, 'Extent').map(dimension);
        if (extents.length) result.extents = extents;
        return result;
      })
      .filter((layer) => layer.name);
  }

  getNamedLayers() {
    return this.layers;
  }

  getNamedLayer(name: string) {
    return this.layers.find((layer) => layer.name === name) ?? null;
  }
}

export interface FakeWmtsLayerCapabilities {
  identifier: string;
  title: string;
  /** Like WorldWind: `style[].legendUrl[]` entries with `href`. */
  style?: Array<{ identifier: string; isDefault: string | null; legendUrl?: Array<{ href?: string; width?: string | null; height?: string | null; format?: string | null }> }>;
  dimension?: Array<{ identifier: string; default: string | null; value?: string[] }>;
}

/** Reads `<Layer>` identifiers, titles, styles with legends and dimensions from a WMTS capabilities document. */
export class FakeWmtsCapabilities {
  readonly contents: { layer: FakeWmtsLayerCapabilities[] };

  constructor(public xmlDom: Document) {
    this.contents = {
      layer: Array.from(xmlDom.querySelectorAll('Layer'))
        .map((layer): FakeWmtsLayerCapabilities => {
          const result: FakeWmtsLayerCapabilities = { identifier: childText(layer, 'Identifier'), title: childText(layer, 'Title') };
          const style = childElements(layer, 'Style').map((element) => ({
            identifier: childText(element, 'Identifier'),
            isDefault: element.getAttribute('isDefault'),
            legendUrl: childElements(element, 'LegendURL').map((legend) => ({
              href: href(legend),
              width: legend.getAttribute('width'),
              height: legend.getAttribute('height'),
              format: legend.getAttribute('format'),
            })),
          }));
          if (style.length) result.style = style;
          const dimension = childElements(layer, 'Dimension').map((element) => ({
            identifier: childText(element, 'Identifier'),
            default: childText(element, 'Default') || null,
            value: childElements(element, 'Value').map((value) => value.textContent?.trim() ?? ''),
          }));
          if (dimension.length) result.dimension = dimension;
          return result;
        })
        .filter((layer) => layer.identifier),
    };
  }

  getLayer(identifier: string) {
    return this.contents.layer.find((layer) => layer.identifier === identifier) ?? null;
  }
}

export interface FakeKmlDocument {
  kind: 'kml';
  url: string;
  displayName: string;
  enabled: boolean;
}

/** Like WorldWind's KmlFile, the constructor returns a promise for the loaded document. */
export class FakeKmlFile {
  constructor(url: string) {
    const document: FakeKmlDocument = { kind: 'kml', url, displayName: url, enabled: true };
    return Promise.resolve(document) as unknown as FakeKmlFile;
  }
}

// Attributes and shapes ---------------------------------------------------------------------------

export class FakeTextAttributes {
  color: FakeColor;
  font: FakeFont;
  scale: number;
  offset: FakeOffset;
  depthTest: boolean;
  enableOutline: boolean;
  outlineWidth: number;
  outlineColor: FakeColor;

  constructor(attributes?: FakeTextAttributes | null) {
    this.color = attributes ? attributes.color.clone() : FakeColor.WHITE.clone();
    this.font = attributes ? attributes.font : new FakeFont(14);
    this.scale = attributes ? attributes.scale : 1;
    this.offset = attributes ? attributes.offset.clone() : new FakeOffset('fraction', 0.5, 'fraction', 0);
    this.depthTest = attributes ? attributes.depthTest : false;
    this.enableOutline = attributes ? attributes.enableOutline : true;
    this.outlineWidth = attributes ? attributes.outlineWidth : 4;
    this.outlineColor = attributes ? attributes.outlineColor.clone() : new FakeColor(0, 0, 0, 0.5);
  }
}

export class FakeShapeAttributes {
  drawInterior: boolean;
  drawOutline: boolean;
  enableLighting: boolean;
  interiorColor: FakeColor;
  outlineColor: FakeColor;
  outlineWidth: number;
  outlineStippleFactor: number;
  outlineStipplePattern: number;
  imageSource: string | FakeImageSource | null;
  depthTest: boolean;
  drawVerticals: boolean;
  applyLighting: boolean;

  constructor(attributes?: FakeShapeAttributes | null) {
    this.drawInterior = attributes ? attributes.drawInterior : true;
    this.drawOutline = attributes ? attributes.drawOutline : true;
    this.enableLighting = attributes ? attributes.enableLighting : false;
    this.interiorColor = attributes ? attributes.interiorColor.clone() : FakeColor.WHITE.clone();
    this.outlineColor = attributes ? attributes.outlineColor.clone() : FakeColor.RED.clone();
    this.outlineWidth = attributes ? attributes.outlineWidth : 1;
    this.outlineStippleFactor = attributes ? attributes.outlineStippleFactor : 0;
    this.outlineStipplePattern = attributes ? attributes.outlineStipplePattern : 0xf0f0;
    this.imageSource = attributes ? attributes.imageSource : null;
    this.depthTest = attributes ? attributes.depthTest : true;
    this.drawVerticals = attributes ? attributes.drawVerticals : false;
    this.applyLighting = attributes ? attributes.applyLighting : false;
  }
}

export class FakePlacemarkAttributes {
  imageColor: FakeColor;
  imageOffset: FakeOffset;
  imageScale: number;
  imageSource: string | FakeImageSource | null;
  depthTest: boolean;
  labelAttributes: FakeTextAttributes;
  drawLeaderLine: boolean;
  leaderLineAttributes: FakeShapeAttributes;

  constructor(attributes?: FakePlacemarkAttributes | null) {
    this.imageColor = attributes ? attributes.imageColor.clone() : FakeColor.WHITE.clone();
    this.imageOffset = attributes ? attributes.imageOffset.clone() : new FakeOffset('fraction', 0.5, 'fraction', 0);
    this.imageScale = attributes ? attributes.imageScale : 1;
    this.imageSource = attributes ? attributes.imageSource : null;
    this.depthTest = attributes ? attributes.depthTest : true;
    this.labelAttributes = new FakeTextAttributes(attributes ? attributes.labelAttributes : null);
    this.drawLeaderLine = attributes ? attributes.drawLeaderLine : false;
    this.leaderLineAttributes = new FakeShapeAttributes(attributes ? attributes.leaderLineAttributes : null);
  }
}

export class FakeRenderable {
  displayName: string | null = null;
  enabled = true;
  pickDelegate: unknown = null;
  userProperties: unknown = null;
}

export class FakePlacemark extends FakeRenderable {
  attributes: FakePlacemarkAttributes;
  highlightAttributes: FakePlacemarkAttributes | null = null;
  highlighted = false;
  label: string | null = null;
  altitudeMode = 'absolute';
  alwaysOnTop = false;
  eyeDistanceScalingThreshold = 1e6;
  eyeDistanceScalingLabelThreshold = 1.5e6;
  imageRotation = 0;
  imageTilt = 0;
  enableLeaderLinePicking = false;

  constructor(
    public position: FakePosition,
    public eyeDistanceScaling = false,
    attributes?: FakePlacemarkAttributes | null,
  ) {
    super();
    this.attributes = attributes ?? new FakePlacemarkAttributes(null);
  }
}

export class FakePath extends FakeRenderable {
  attributes: FakeShapeAttributes;
  highlightAttributes: FakeShapeAttributes | null = null;
  highlighted = false;
  altitudeMode = 'absolute';
  followTerrain = false;
  extrude = false;
  pathType = 'greatCircle';
  numSubSegments = 10;
  terrainConformance = 10;

  constructor(
    public positions: FakePosition[],
    attributes?: FakeShapeAttributes | null,
  ) {
    super();
    this.attributes = attributes ?? new FakeShapeAttributes(null);
  }
}

export class FakePolygon extends FakeRenderable {
  attributes: FakeShapeAttributes;
  highlightAttributes: FakeShapeAttributes | null = null;
  highlighted = false;
  altitudeMode = 'absolute';
  extrude = false;

  constructor(
    public boundaries: FakePosition[] | FakePosition[][],
    attributes?: FakeShapeAttributes | null,
  ) {
    super();
    this.attributes = attributes ?? new FakeShapeAttributes(null);
  }
}

class FakeSurfaceShape extends FakeRenderable {
  attributes: FakeShapeAttributes;
  highlightAttributes: FakeShapeAttributes | null = null;
  highlighted = false;
  pathType = 'greatCircle';
  maximumNumEdgeIntervals = 128;

  constructor(attributes?: FakeShapeAttributes | null) {
    super();
    this.attributes = attributes ?? new FakeShapeAttributes(null);
  }
}

export class FakeSurfacePolyline extends FakeSurfaceShape {
  constructor(
    public locations: FakeLocation[],
    attributes?: FakeShapeAttributes | null,
  ) {
    super(attributes);
  }
}

export class FakeSurfacePolygon extends FakeSurfaceShape {
  constructor(
    public boundaries: FakeLocation[] | FakeLocation[][],
    attributes?: FakeShapeAttributes | null,
  ) {
    super(attributes);
  }
}

export class FakeSurfaceCircle extends FakeSurfaceShape {
  constructor(
    public center: FakeLocation,
    public radius: number,
    attributes?: FakeShapeAttributes | null,
  ) {
    super(attributes);
  }
}

export class FakeSurfaceSector extends FakeSurfaceShape {
  constructor(
    public sector: FakeSector,
    attributes?: FakeShapeAttributes | null,
  ) {
    super(attributes);
  }
}

export class FakeGeographicText extends FakeRenderable {
  attributes = new FakeTextAttributes(null);
  altitudeMode = 'absolute';
  alwaysOnTop = false;

  constructor(
    public position: FakePosition,
    public text: string,
  ) {
    super();
  }
}

export class FakeScreenText extends FakeRenderable {
  attributes = new FakeTextAttributes(null);

  constructor(
    public screenOffset: FakeOffset,
    public text: string,
  ) {
    super();
  }
}

export class FakeScreenImage extends FakeRenderable {
  constructor(
    public screenOffset: FakeOffset,
    public imageSource: string | FakeImageSource,
  ) {
    super();
  }
}

// Picking -----------------------------------------------------------------------------------------

export class FakePickedObject {
  isOnTop = false;

  constructor(
    public color: FakeColor,
    public userObject: any,
    public position: FakePosition | null,
    public parentLayer: FakeLayer | null,
    public isTerrain: boolean,
  ) {}
}

export class FakePickedObjectList {
  objects: FakePickedObject[] = [];

  add(object: FakePickedObject): void {
    this.objects.push(object);
  }

  clear(): void {
    this.objects = [];
  }

  hasNonTerrainObjects(): boolean {
    return this.objects.some((o) => !o.isTerrain);
  }

  terrainObject(): FakePickedObject | null {
    return this.objects.find((o) => o.isTerrain) ?? null;
  }

  topPickedObject(): FakePickedObject | null {
    return this.objects.find((o) => o.isOnTop) ?? null;
  }
}

export interface FakePickItem {
  userObject?: unknown;
  position?: { latitude: number; longitude: number; altitude?: number } | null;
  layer?: FakeLayer | null;
  isTerrain?: boolean;
  isOnTop?: boolean;
}

// Globe, navigator, window ------------------------------------------------------------------------

export class FakeElevationModel {}
export class FakeEarthElevationModel extends FakeElevationModel {}
export class FakeProjection {
  constructor(public pole?: string) {}
}

export class FakeGlobe {
  equatorialRadius = 6378137;
  polarRadius = 6356752.3;

  constructor(
    public elevationModel: unknown = new FakeEarthElevationModel(),
    public projection: unknown = null,
  ) {}

  is2D(): boolean {
    return this.projection !== null;
  }

  /** Fake model space: x = longitude, y = latitude, z = altitude. */
  computePointFromPosition(latitude: number, longitude: number, altitude: number, result: FakeVec3): FakeVec3 {
    result[0] = longitude;
    result[1] = latitude;
    result[2] = altitude;
    return result;
  }

  surfaceNormalAtPoint(_x: number, _y: number, _z: number, result: FakeVec3): FakeVec3 {
    result[0] = 0;
    result[1] = 0;
    result[2] = 1;
    return result;
  }
}

export class FakeGlobe2D extends FakeGlobe {
  constructor() {
    super(new FakeElevationModel(), new FakeProjection());
  }
}

export class FakeNavigator {
  lookAtLocation = new FakeLocation(30, -110);
  range = 10e6;
  heading = 0;
  tilt = 0;
  roll = 0;
  enable2DLimits = true;
}

export class FakeGoToAnimator {
  travelTime = 3000;
  animationFrequency = 20;
  cancelled = false;
  /** Every goTo call, for assertions. */
  calls: Array<{ latitude: number; longitude: number; altitude?: number }> = [];

  constructor(private readonly wwd: FakeWorldWindow) {}

  goTo(position: { latitude: number; longitude: number; altitude?: number }, completionCallback?: () => void): void {
    this.cancelled = false;
    this.calls.push({ ...position });
    const navigator = this.wwd.navigator;
    navigator.lookAtLocation.latitude = position.latitude;
    navigator.lookAtLocation.longitude = position.longitude;
    if (typeof position.altitude === 'number') navigator.range = position.altitude;
    completionCallback?.();
  }

  cancel(): void {
    this.cancelled = true;
  }
}

export class FakeWorldWindow {
  canvas: HTMLCanvasElement;
  layers: FakeLayer[] = [];
  navigator = new FakeNavigator();
  globe: FakeGlobe;
  goToAnimator: FakeGoToAnimator;
  worldWindowController: any = {};
  redrawCallbacks: Array<(wwd: FakeWorldWindow, stage: string) => void> = [];
  deepPicking = false;
  subsurfaceMode = false;
  pixelScale = 1;
  verticalExaggeration = 1;
  surfaceOpacity = 1;
  redrawRequestId: number | null = 1;
  frameStatistics: any = {};
  drawContext: any;

  /** Every recognizer created through the same fake namespace (set by createFakeWorldWind). */
  recognizers: FakeRecognizer[] = [];

  /** Test state. */
  redrawCount = 0;
  contextLost = false;
  gestureEvents: Event[] = [];
  private listeners = new Map<string, Set<(event: any) => void>>();
  private pickResult: FakePickedObjectList | ((point: FakeVec2) => FakePickedObjectList) = new FakePickedObjectList();

  constructor(canvasElem: HTMLCanvasElement | string, elevationModel?: unknown) {
    const canvas =
      typeof canvasElem === 'string'
        ? (document.getElementById(canvasElem) as HTMLCanvasElement | null)
        : canvasElem;
    if (!canvas) throw new Error(`FakeWorldWindow: no canvas "${String(canvasElem)}"`);
    this.canvas = canvas;
    this.globe = new FakeGlobe(elevationModel ?? new FakeEarthElevationModel());
    this.goToAnimator = new FakeGoToAnimator(this);
    this.drawContext = {
      /** Fake viewport in drawing-buffer pixels; `project` maps longitude/latitude linearly onto it. */
      viewport: { x: 0, y: 0, width: 800, height: 600 },
      /** Metres per pixel = range / 1000, so a 10,000 km range gives 10 km per pixel. */
      pixelSizeFactor: 1e-3,
      pixelSizeOffset: 0,
      modelviewProjection: 'fake',
      eyePoint: new FakeVec3(0, 0, 1e7),
      project: (point: FakeVec3, result: FakeVec3) => {
        const viewport = this.drawContext.viewport;
        result[0] = ((point[0] + 180) / 360) * viewport.width;
        result[1] = ((point[1] + 90) / 180) * viewport.height;
        result[2] = 0;
        return true;
      },
      currentGlContext: {
        isContextLost: () => this.contextLost,
        getExtension: (name: string) =>
          name === 'WEBGL_lose_context'
            ? {
                loseContext: () => {
                  this.contextLost = true;
                },
                restoreContext: () => {
                  this.contextLost = false;
                },
              }
            : null,
      },
    };
  }

  addLayer(layer: FakeLayer): void {
    this.layers.push(layer);
  }

  removeLayer(layer: FakeLayer): void {
    const index = this.layers.indexOf(layer);
    if (index !== -1) this.layers.splice(index, 1);
  }

  insertLayer(index: number, layer: FakeLayer): void {
    this.layers.splice(index, 0, layer);
  }

  indexOfLayer(layer: FakeLayer): number {
    return this.layers.indexOf(layer);
  }

  redraw(): void {
    this.redrawCount += 1;
  }

  pick(point: FakeVec2): FakePickedObjectList {
    return typeof this.pickResult === 'function' ? this.pickResult(point) : this.pickResult;
  }

  pickTerrain(point: FakeVec2): FakePickedObjectList {
    const full = this.pick(point);
    const list = new FakePickedObjectList();
    for (const object of full.objects) if (object.isTerrain) list.add(object);
    return list;
  }

  canvasCoordinates(x: number, y: number): FakeVec2 {
    return new FakeVec2(x, y);
  }

  goTo(position: { latitude: number; longitude: number; altitude?: number }, completionCallback?: () => void): void {
    this.goToAnimator.goTo(position, completionCallback);
  }

  addEventListener(type: string, listener: (event: any) => void): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  onGestureEvent(event: Event): void {
    this.gestureEvents.push(event);
  }

  // Test helpers ---------------------------------------------------------------------------------

  /** Runs the redraw callbacks as one frame would (`beforeRedraw` then `afterRedraw`). */
  simulateFrame(): void {
    for (const callback of this.redrawCallbacks.slice()) callback(this, 'beforeRedraw');
    for (const callback of this.redrawCallbacks.slice()) callback(this, 'afterRedraw');
  }

  /** Defines what the next `pick()` calls return. Items become PickedObjects, terrain first is not required. */
  setPickResult(items: FakePickItem[] | ((point: FakeVec2) => FakePickItem[])): void {
    const build = (list: FakePickItem[]) => {
      const result = new FakePickedObjectList();
      for (const item of list) {
        const position = item.position
          ? new FakePosition(item.position.latitude, item.position.longitude, item.position.altitude ?? 0)
          : null;
        const picked = new FakePickedObject(
          FakeColor.WHITE.clone(),
          item.userObject ?? null,
          position,
          item.layer ?? null,
          item.isTerrain ?? false,
        );
        picked.isOnTop = item.isOnTop ?? false;
        result.add(picked);
      }
      return result;
    };
    this.pickResult = typeof items === 'function' ? (point) => build(items(point)) : build(items);
  }

  /**
   * Clicks the globe the way WorldWind arbitrates it: the earliest enabled click recognizer for
   * this window wins, plus any recognizer allowed to recognize simultaneously with it. Returns the
   * recognizers that fired.
   */
  click(clientX: number, clientY: number, count = 1): FakeRecognizer[] {
    const candidates = this.recognizers.filter(
      (r) => r.target === this && r.enabled && r.kind === 'click' && r.numberOfClicks === count,
    );
    const winner = candidates[0];
    if (!winner) return [];
    const fired = candidates.filter((r) => r === winner || winner.recognizesWith.has(r) || r.recognizesWith.has(winner));
    for (const recognizer of fired) recognizer.simulate(clientX, clientY, count);
    return fired;
  }

  /** Delivers an event to listeners registered through `addEventListener`. */
  dispatch(type: string, event: any): void {
    for (const listener of Array.from(this.listeners.get(type) ?? [])) listener(event);
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

// Gestures ----------------------------------------------------------------------------------------

export type FakeRecognizerKind = 'click' | 'tap' | 'drag' | 'pan' | 'pinch' | 'rotation' | 'tilt' | 'generic';

export class FakeRecognizer {
  enabled = true;
  state = 'possible';
  clientX = 0;
  clientY = 0;
  numberOfClicks = 1;
  numberOfTaps = 1;
  numberOfTouches = 1;
  button = 0;

  /** Recognizers allowed to recognize at the same time as this one. */
  readonly recognizesWith = new Set<FakeRecognizer>();

  constructor(
    public target: unknown,
    public callback: ((recognizer: FakeRecognizer) => void) | null,
    public kind: FakeRecognizerKind,
  ) {}

  recognizeSimultaneouslyWith(other: FakeRecognizer): void {
    this.recognizesWith.add(other);
  }

  /** Fires the callback in the RECOGNIZED state, as a real click or tap would. */
  simulate(clientX: number, clientY: number, count = 1): boolean {
    const expected = this.kind === 'tap' ? this.numberOfTaps : this.numberOfClicks;
    if (!this.enabled || count !== expected) return false;
    this.clientX = clientX;
    this.clientY = clientY;
    this.state = 'recognized';
    this.callback?.(this);
    this.state = 'possible';
    return true;
  }
}

// Misc --------------------------------------------------------------------------------------------

type GeoJsonGeometryTypeName =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon';

function fakeGeometry(type: string) {
  return {
    type,
    isPointType: () => type === 'Point',
    isMultiPointType: () => type === 'MultiPoint',
    isLineStringType: () => type === 'LineString',
    isMultiLineStringType: () => type === 'MultiLineString',
    isPolygonType: () => type === 'Polygon',
    isMultiPolygonType: () => type === 'MultiPolygon',
  };
}

const toFakeLocations = (coordinates: number[][]) => coordinates.map(([lon, lat]) => new FakeLocation(lat!, lon!));

/**
 * Walks a GeoJSON object (Feature or FeatureCollection) the way WorldWind's parser does:
 * points become placemarks, lines surface polylines, polygons surface polygons, with the
 * attributes, name and userProperties from the shape configuration callback.
 */
export class FakeGeoJSONParser {
  constructor(public dataSource: unknown) {}

  load(
    completionCallback: ((layer: unknown) => void) | null,
    shapeConfigurationCallback: ((geometry: unknown, properties: Record<string, unknown>) => any) | null,
    layer: FakeRenderableLayer | null,
  ): void {
    const data: any = typeof this.dataSource === 'string' ? JSON.parse(this.dataSource) : this.dataSource;
    const features: any[] = data?.type === 'FeatureCollection' ? data.features : data?.type === 'Feature' ? [data] : [];
    for (const feature of features) {
      const geometry = feature.geometry;
      if (!geometry) continue;
      const type = geometry.type as GeoJsonGeometryTypeName;
      const configuration = shapeConfigurationCallback?.(fakeGeometry(type), feature.properties ?? {}) ?? {};
      const renderables: FakeRenderable[] = [];
      if (type === 'Point' || type === 'MultiPoint') {
        const points: number[][] = type === 'Point' ? [geometry.coordinates] : geometry.coordinates;
        for (const [lon, lat, alt] of points) {
          const placemark = new FakePlacemark(new FakePosition(lat!, lon!, alt ?? 0), false, configuration.attributes ?? null);
          if (configuration.name) placemark.label = configuration.name;
          renderables.push(placemark);
        }
      } else if (type === 'LineString' || type === 'MultiLineString') {
        const lines: number[][][] = type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
        for (const line of lines) renderables.push(new FakeSurfacePolyline(toFakeLocations(line), configuration.attributes ?? null));
      } else if (type === 'Polygon' || type === 'MultiPolygon') {
        const polygons: number[][][][] = type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        for (const rings of polygons) {
          renderables.push(new FakeSurfacePolygon(rings.map(toFakeLocations), configuration.attributes ?? null));
        }
      }
      for (const renderable of renderables) {
        if (configuration.highlightAttributes) (renderable as any).highlightAttributes = configuration.highlightAttributes;
        if (configuration.userProperties) renderable.userProperties = configuration.userProperties;
        if (configuration.pickDelegate) renderable.pickDelegate = configuration.pickDelegate;
        layer?.addRenderable(renderable);
      }
    }
    completionCallback?.(layer);
  }
}

export class FakeLengthMeasurer {
  constructor(public wwd: FakeWorldWindow) {}

  getLength(positions: FakeLocation[]): number {
    let total = 0;
    for (let i = 1; i < positions.length; i += 1) {
      total += FakeLocation.greatCircleDistance(positions[i - 1]!, positions[i]!) * this.wwd.globe.equatorialRadius;
    }
    return total;
  }
}

export class FakeAreaMeasurer {
  constructor(public wwd: FakeWorldWindow) {}

  /** Planar shoelace area on an equirectangular approximation; good enough to be non-zero and stable. */
  getArea(positions: FakeLocation[]): number {
    if (positions.length < 3) return 0;
    const metersPerDegree = 111_320;
    let sum = 0;
    for (let i = 0; i < positions.length; i += 1) {
      const a = positions[i]!;
      const b = positions[(i + 1) % positions.length]!;
      sum += a.longitude * b.latitude - b.longitude * a.latitude;
    }
    return Math.abs(sum / 2) * metersPerDegree * metersPerDegree;
  }
}

export class FakeHighlightController {
  constructor(public worldWindow: FakeWorldWindow) {}
}

export class FakeNominatimGeocoder {
  lookup(_query: string, callback: (results: unknown[]) => void): void {
    callback([]);
  }
}

export interface FakeWorldWind extends WorldWindStatic {
  /** Every WorldWindow created through this fake, oldest first. */
  windows: FakeWorldWindow[];
  /** Every gesture recognizer created, oldest first. */
  recognizers: FakeRecognizer[];
}

/** Builds a fresh fake WorldWind namespace. Each call is independent. */
export function createFakeWorldWind(): FakeWorldWind {
  const windows: FakeWorldWindow[] = [];
  const recognizers: FakeRecognizer[] = [];

  class WorldWindow extends FakeWorldWindow {
    constructor(canvasElem: HTMLCanvasElement | string, elevationModel?: unknown) {
      super(canvasElem, elevationModel);
      this.recognizers = recognizers;
      windows.push(this);
    }
  }

  const recognizer = (kind: FakeRecognizerKind) =>
    class extends FakeRecognizer {
      constructor(target: unknown, callback: ((r: FakeRecognizer) => void) | null) {
        super(target, callback, kind);
        recognizers.push(this);
      }
    };

  const fake = {
    windows,
    recognizers,
    configuration: {
      baseUrl: 'http://localhost/worldwind/',
      gpuCacheSize: 250e6,
      layerRetrievalQueueSize: 16,
      coverageRetrievalQueueSize: 16,
      bingLogoPlacement: new FakeOffset('insetPixels', 7, 'pixels', 7),
      bingLogoAlignment: new FakeOffset('fraction', 1, 'fraction', 0),
    },
    BingMapsKey: null,
    Logger: {
      level: 1,
      setLoggingLevel(level: number) {
        this.level = level;
      },
      log() {},
      LEVEL_NONE: 0,
      LEVEL_SEVERE: 1,
      LEVEL_WARNING: 2,
      LEVEL_INFO: 3,
    },
    Angle: {
      DEGREES_TO_RADIANS: DEG_TO_RAD,
      RADIANS_TO_DEGREES: 1 / DEG_TO_RAD,
      normalizedDegreesLatitude: (d: number) => Math.max(-90, Math.min(90, d)),
      normalizedDegreesLongitude: (d: number) => ((((d + 180) % 360) + 360) % 360) - 180,
    },

    ABSOLUTE: 'absolute',
    CLAMP_TO_GROUND: 'clampToGround',
    RELATIVE_TO_GROUND: 'relativeToGround',
    GREAT_CIRCLE: 'greatCircle',
    LINEAR: 'linear',
    RHUMB_LINE: 'rhumbLine',
    OFFSET_FRACTION: 'fraction',
    OFFSET_INSET_PIXELS: 'insetPixels',
    OFFSET_PIXELS: 'pixels',
    BEFORE_REDRAW: 'beforeRedraw',
    AFTER_REDRAW: 'afterRedraw',
    POSSIBLE: 'possible',
    BEGAN: 'began',
    CHANGED: 'changed',
    ENDED: 'ended',
    CANCELLED: 'cancelled',
    FAILED: 'failed',
    RECOGNIZED: 'recognized',
    REDRAW_EVENT_TYPE: 'WorldWindRedraw',
    WGS84_SEMI_MAJOR_AXIS: 6378137,
    WGS84_SEMI_MINOR_AXIS: 6356752.3,

    WorldWindow,
    Position: FakePosition,
    Location: FakeLocation,
    Color: FakeColor,
    Offset: FakeOffset,
    Font: FakeFont,
    Sector: FakeSector,
    Vec2: FakeVec2,
    Vec3: FakeVec3,
    ImageSource: FakeImageSource,

    Layer: FakeLayer,
    RenderableLayer: FakeRenderableLayer,
    BMNGOneImageLayer: builtInLayer('Blue Marble Image'),
    BMNGLayer: builtInLayer('Blue Marble'),
    BMNGLandsatLayer: builtInLayer('Blue Marble & Landsat'),
    BingAerialLayer: builtInLayer('Bing Aerial'),
    BingAerialWithLabelsLayer: builtInLayer('Bing Aerial with Labels'),
    BingRoadsLayer: builtInLayer('Bing Roads'),
    OpenStreetMapImageLayer: class extends FakeLayer {
      constructor(layerName?: string) {
        if (!layerName) throw new Error('WmsUrlBuilder.constructor: The WMS layer names are not specified.');
        super('OpenStreetMap');
        this.constructorArgs = [layerName];
      }
    },
    AtmosphereLayer: builtInLayer('Atmosphere'),
    StarFieldLayer: builtInLayer('StarField'),
    CompassLayer: builtInLayer('Compass'),
    CoordinatesDisplayLayer: builtInLayer('Coordinates'),
    ViewControlsLayer: builtInLayer('View Controls'),
    FrameStatisticsLayer: builtInLayer('Frame Statistics'),
    ShowTessellationLayer: builtInLayer('Show Tessellation'),
    TectonicPlatesLayer: builtInLayer('Tectonic Plates'),
    WmsLayer: FakeWmsLayer,
    WmtsLayer: FakeWmtsLayer,
    WmsCapabilities: FakeWmsCapabilities,
    WmtsCapabilities: FakeWmtsCapabilities,
    KmlFile: FakeKmlFile,
    HeatMapLayer: builtInLayer('HeatMap'),

    Placemark: FakePlacemark,
    PlacemarkAttributes: FakePlacemarkAttributes,
    ShapeAttributes: FakeShapeAttributes,
    TextAttributes: FakeTextAttributes,
    Path: FakePath,
    Polygon: FakePolygon,
    SurfacePolyline: FakeSurfacePolyline,
    SurfacePolygon: FakeSurfacePolygon,
    SurfaceCircle: FakeSurfaceCircle,
    SurfaceEllipse: FakeSurfaceCircle,
    SurfaceRectangle: FakeSurfaceCircle,
    SurfaceSector: FakeSurfaceSector,
    SurfaceImage: FakeScreenImage,
    GeographicText: FakeGeographicText,
    ScreenText: FakeScreenText,
    ScreenImage: FakeScreenImage,

    GestureRecognizer: recognizer('generic'),
    ClickRecognizer: recognizer('click'),
    TapRecognizer: recognizer('tap'),
    DragRecognizer: recognizer('drag'),
    PanRecognizer: recognizer('pan'),
    PinchRecognizer: recognizer('pinch'),
    RotationRecognizer: recognizer('rotation'),
    TiltRecognizer: recognizer('tilt'),

    GeoJSONParser: FakeGeoJSONParser,
    HighlightController: FakeHighlightController,
    LengthMeasurer: FakeLengthMeasurer,
    AreaMeasurer: FakeAreaMeasurer,
    ElevationModel: FakeElevationModel,
    EarthElevationModel: FakeEarthElevationModel,
    Globe: FakeGlobe,
    Globe2D: FakeGlobe2D,
    ProjectionEquirectangular: FakeProjection,
    ProjectionMercator: FakeProjection,
    ProjectionPolarEquidistant: FakeProjection,
    ProjectionUPS: FakeProjection,
    ProjectionGnomonic: FakeProjection,
    ProjectionWgs84: FakeProjection,
    GoToAnimator: FakeGoToAnimator,
    LookAtNavigator: FakeNavigator,
    BasicWorldWindowController: class {
      constructor(public wwd: FakeWorldWindow) {}
    },
    NominatimGeocoder: FakeNominatimGeocoder,
    WWUtil: {},
    WWMath: {},
  };

  return fake as unknown as FakeWorldWind;
}
