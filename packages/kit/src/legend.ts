import { LEGEND_KEY, type LayerLegend } from './layers';
import type { WWLayer } from './worldwind-types';

/** The legend image recorded for a layer, if any.
 * @category Legend
 */
export function layerLegend(layer: WWLayer): LayerLegend | null {
  const legend = layer[LEGEND_KEY];
  return legend && typeof legend.url === 'string' ? (legend as LayerLegend) : null;
}

/** @category Legend */
export interface LegendEntry {
  layer: WWLayer;
  legend: LayerLegend;
}

/** @category Legend */
export interface CollectLegendsOptions {
  /** Only layers that are switched on. Default true. */
  enabledOnly?: boolean;
  /** Top-most layer first. Default true. */
  topFirst?: boolean;
}

/** The layers that have a legend, with their legends.
 * @category Legend
 */
export function collectLegends(layers: readonly WWLayer[], options: CollectLegendsOptions = {}): LegendEntry[] {
  const enabledOnly = options.enabledOnly ?? true;
  const entries: LegendEntry[] = [];
  for (const layer of layers) {
    if (enabledOnly && !layer.enabled) continue;
    const legend = layerLegend(layer);
    if (legend) entries.push({ layer, legend });
  }
  return options.topFirst === false ? entries : entries.reverse();
}

/** @category Legend */
export interface LegendGraphicOptions {
  /** WMS endpoint. */
  service: string;
  /** WMS layer name. */
  layer: string;
  style?: string;
  /** Defaults to `image/png`. */
  format?: string;
  /** WMS version; defaults to `1.3.0`. */
  version?: string;
  width?: number;
  height?: number;
}

/**
 * Builds a WMS `GetLegendGraphic` URL for servers that support it (GeoServer, MapServer, ...),
 * for layers created without a capabilities document.
 * @category Legend
 */
export function wmsLegendGraphicUrl(options: LegendGraphicOptions): string {
  const url = new URL(options.service, typeof location === 'undefined' ? 'http://localhost/' : location.href);
  url.searchParams.set('SERVICE', 'WMS');
  url.searchParams.set('VERSION', options.version ?? '1.3.0');
  url.searchParams.set('REQUEST', 'GetLegendGraphic');
  url.searchParams.set('FORMAT', options.format ?? 'image/png');
  url.searchParams.set('LAYER', options.layer);
  if (options.style) url.searchParams.set('STYLE', options.style);
  if (options.width) url.searchParams.set('WIDTH', String(options.width));
  if (options.height) url.searchParams.set('HEIGHT', String(options.height));
  return url.toString();
}
