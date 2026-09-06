import { ATTRIBUTION_KEY, builtInLayerKind, type BuiltInLayerKind, type LayerAttribution } from './layers';
import type { WWLayer } from './worldwind-types';

const NASA: LayerAttribution = { text: 'Imagery: NASA', url: 'https://worldwind.arc.nasa.gov/' };
const BING: LayerAttribution = { text: '© Microsoft Bing Maps', url: 'https://www.microsoft.com/maps/product/terms.html' };

/** Credits shown for WorldWind's built-in layers unless a layer sets its own.
 * @category Attribution
 */
export const DEFAULT_ATTRIBUTIONS: Partial<Record<BuiltInLayerKind, LayerAttribution>> = {
  'blue-marble': NASA,
  'blue-marble-image': NASA,
  'blue-marble-landsat': NASA,
  'bing-aerial': BING,
  'bing-aerial-labels': BING,
  'bing-roads': BING,
  osm: { text: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright' },
};

/**
 * The credit a layer should display: what {@link setLayerAttribution} recorded, else the default
 * for its built-in kind, else null. A recorded `null` suppresses the default.
 * @category Attribution
 */
export function layerAttribution(layer: WWLayer): LayerAttribution | null {
  const explicit = layer[ATTRIBUTION_KEY];
  if (explicit !== undefined) return explicit as LayerAttribution | null;
  const kind = builtInLayerKind(layer);
  return (kind && DEFAULT_ATTRIBUTIONS[kind]) || null;
}

/** @category Attribution */
export interface CollectAttributionsOptions {
  /** Only credit layers that are switched on. Default true. */
  enabledOnly?: boolean;
}

/**
 * The distinct credits for a set of layers, bottom to top, each text once.
 * @category Attribution
 */
export function collectAttributions(layers: readonly WWLayer[], options: CollectAttributionsOptions = {}): LayerAttribution[] {
  const enabledOnly = options.enabledOnly ?? true;
  const seen = new Set<string>();
  const result: LayerAttribution[] = [];
  for (const layer of layers) {
    if (enabledOnly && !layer.enabled) continue;
    const attribution = layerAttribution(layer);
    if (!attribution || seen.has(attribution.text)) continue;
    seen.add(attribution.text);
    result.push(attribution);
  }
  return result;
}
