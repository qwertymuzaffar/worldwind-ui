import type { WorldWindStatic } from './worldwind-types';

/** The WorldWind version whose assets are used when no base URL is configured. */
export const DEFAULT_WORLDWIND_VERSION = '0.11.1';

/** Builds a CDN base URL for WorldWind's bundled images (pushpins, compass, view controls, Blue Marble). */
export function cdnAssetBaseUrl(version: string = DEFAULT_WORLDWIND_VERSION): string {
  return `https://unpkg.com/@nasaworldwind/worldwind@${version}/build/dist/`;
}

export const DEFAULT_ASSET_BASE_URL = cdnAssetBaseUrl();

/**
 * Points WorldWind at its image assets. When WorldWind is bundled (rather than loaded
 * from a `<script>` tag) it cannot discover its own location, so this must be set before
 * any layer that uses images is created. Returns the normalized URL.
 */
export function configureAssetBaseUrl(
  worldWind: WorldWindStatic,
  baseUrl: string = DEFAULT_ASSET_BASE_URL,
): string {
  const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  worldWind.configuration.baseUrl = normalized;
  return normalized;
}

/** Resolves a path relative to the configured asset base URL. */
export function assetUrl(worldWind: WorldWindStatic, relativePath: string): string {
  return worldWind.configuration.baseUrl + relativePath.replace(/^\/+/, '');
}

export type PushpinColor =
  | 'black'
  | 'blue'
  | 'brown'
  | 'gray'
  | 'green'
  | 'orange'
  | 'purple'
  | 'red'
  | 'teal'
  | 'white'
  | 'yellow';

/** `plain` pins come in every colour; `castshadow` pins have no `yellow`. */
export type PushpinStyle = 'plain' | 'castshadow';

/** URL of one of the pushpin images that ship with WorldWind. */
export function pushpinUrl(
  worldWind: WorldWindStatic,
  color: PushpinColor = 'red',
  style: PushpinStyle = 'plain',
): string {
  return assetUrl(worldWind, `images/pushpins/${style}-${color}.png`);
}

/** URL of WorldWind's small white dot image, handy as a neutral marker. */
export function whiteDotUrl(worldWind: WorldWindStatic): string {
  return assetUrl(worldWind, 'images/white-dot.png');
}
