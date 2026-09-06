import { applyLayerOptions, type LayerOptions } from './layers';
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
  return applyLayerOptions(layer, options);
}
