import { applyLayerOptions, type LayerOptions } from './layers';
import { timeDimensionFromCapabilities, type LayerCapabilitiesInfo } from './time';
import type { WWLayer, WorldWindStatic } from './worldwind-types';

/** @category Layers */
export interface FetchOptions {
  /** Injectable for tests or custom transports. */
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

function hasRequestParameter(url: URL): boolean {
  for (const key of url.searchParams.keys()) if (key.toLowerCase() === 'request') return true;
  return false;
}

/** Turns a service endpoint into a GetCapabilities URL (leaves URLs that already ask for capabilities alone).
 * @category Layers
 */
export function capabilitiesUrl(service: string, kind: 'WMS' | 'WMTS'): string {
  const url = new URL(service, typeof location === 'undefined' ? 'http://localhost/' : location.href);
  if (!hasRequestParameter(url)) {
    url.searchParams.set('SERVICE', kind);
    url.searchParams.set('REQUEST', 'GetCapabilities');
  }
  return url.toString();
}

/** Fetches and parses an OGC GetCapabilities document.
 * @category Layers
 */
export async function fetchCapabilities(url: string, options: FetchOptions = {}): Promise<Document> {
  const doFetch = options.fetch ?? globalThis.fetch;
  if (typeof doFetch !== 'function') throw new Error('worldwind-kit: fetch is not available in this environment');
  const response = await doFetch(url, { signal: options.signal });
  if (!response.ok) throw new Error(`worldwind-kit: GetCapabilities failed with HTTP ${response.status} for ${url}`);
  const text = await response.text();
  const document = new DOMParser().parseFromString(text, 'text/xml');
  const error = document.querySelector('parsererror');
  if (error) throw new Error(`worldwind-kit: could not parse the capabilities document from ${url}`);
  return document;
}

function integer(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Attribution, legend and time dimension declared by a WorldWind `WmsLayerCapabilities` object,
 * as layer options.
 * @category Layers
 */
export function wmsLayerMetadata(layerCapabilities: LayerCapabilitiesInfo | null | undefined): LayerOptions {
  const meta: LayerOptions = {};
  const attribution = layerCapabilities?.attribution;
  if (attribution && typeof attribution.title === 'string' && attribution.title) {
    meta.attribution = typeof attribution.url === 'string' ? { text: attribution.title, url: attribution.url } : { text: attribution.title };
  }
  for (const style of layerCapabilities?.styles ?? []) {
    const legend = style?.legendUrls?.find((l) => typeof l?.url === 'string' && l.url);
    if (legend && legend.url) {
      meta.legend = { url: legend.url, width: integer(legend.width), height: integer(legend.height), format: legend.format ?? undefined };
      break;
    }
  }
  const time = timeDimensionFromCapabilities(layerCapabilities);
  if (time) meta.timeDimension = time;
  return meta;
}

/**
 * Legend and time dimension declared by a WorldWind `WmtsLayerCapabilities` object, as layer
 * options. The legend comes from `style` when given, else the default style.
 * @category Layers
 */
export function wmtsLayerMetadata(layerCapabilities: LayerCapabilitiesInfo | null | undefined, style?: string): LayerOptions {
  const meta: LayerOptions = {};
  const styles = layerCapabilities?.style ?? [];
  const chosen =
    (style !== undefined ? styles.find((s) => s?.identifier === style) : undefined) ??
    styles.find((s) => s?.isDefault === true || s?.isDefault === 'true') ??
    styles[0];
  const legend = chosen?.legendUrl?.find((l) => typeof l?.href === 'string' && l.href);
  if (legend && legend.href) meta.legend = { url: legend.href, width: integer(legend.width), height: integer(legend.height), format: legend.format ?? undefined };
  const time = timeDimensionFromCapabilities(layerCapabilities);
  if (time) meta.timeDimension = time;
  return meta;
}

/** @category Layers */
export interface WmtsLayerFromCapabilitiesOptions extends LayerOptions, FetchOptions {
  /** The WMTS endpoint or a full GetCapabilities URL. */
  service: string;
  /** The layer identifier as listed in the capabilities. */
  layer: string;
  /** Style identifier; defaults to the layer's default style. */
  style?: string;
  /** Tile matrix set identifier; defaults to the first one WorldWind supports. */
  matrixSet?: string;
  /** Image format; defaults to the first one the layer offers. */
  format?: string;
  /** Value for the TIME dimension. */
  time?: string | null;
}

/** Creates a WMTS layer from the service's capabilities document.
 * @category Layers
 */
export async function createWmtsLayerFromCapabilities(
  worldWind: WorldWindStatic,
  options: WmtsLayerFromCapabilitiesOptions,
): Promise<WWLayer> {
  const document = await fetchCapabilities(capabilitiesUrl(options.service, 'WMTS'), options);
  const capabilities = new worldWind.WmtsCapabilities(document);
  const layerCapabilities = capabilities.getLayer(options.layer);
  if (!layerCapabilities) throw new Error(`worldwind-kit: WMTS layer "${options.layer}" not found at ${options.service}`);
  const config = worldWind.WmtsLayer.formLayerConfiguration(
    layerCapabilities,
    options.style,
    options.matrixSet,
    options.format,
  );
  if (options.displayName !== undefined) config.title = options.displayName;
  const layer = new worldWind.WmtsLayer(config, options.time ?? null);
  applyLayerOptions(layer, wmtsLayerMetadata(layerCapabilities, options.style));
  return applyLayerOptions(layer, options);
}

/** @category Layers */
export interface WmsLayerFromCapabilitiesOptions extends LayerOptions, FetchOptions {
  /** The WMS endpoint or a full GetCapabilities URL. */
  service: string;
  /** The layer name as listed in the capabilities. */
  layer: string;
  /** Value for the TIME dimension. */
  time?: string | null;
}

/**
 * Creates a WMS layer from the service's capabilities document, which supplies the sector,
 * formats and tiling that {@link createWmsLayer} otherwise needs by hand.
  * @category Layers
 */
export async function createWmsLayerFromCapabilities(
  worldWind: WorldWindStatic,
  options: WmsLayerFromCapabilitiesOptions,
): Promise<WWLayer> {
  const document = await fetchCapabilities(capabilitiesUrl(options.service, 'WMS'), options);
  const capabilities = new worldWind.WmsCapabilities(document);
  const layerCapabilities = capabilities.getNamedLayer(options.layer);
  if (!layerCapabilities) throw new Error(`worldwind-kit: WMS layer "${options.layer}" not found at ${options.service}`);
  const config = worldWind.WmsLayer.formLayerConfiguration(layerCapabilities);
  if (options.displayName !== undefined) config.title = options.displayName;
  const layer = new worldWind.WmsLayer(config, options.time ?? null);
  applyLayerOptions(layer, wmsLayerMetadata(layerCapabilities));
  return applyLayerOptions(layer, options);
}
