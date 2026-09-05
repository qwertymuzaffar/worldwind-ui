import { DEFAULT_WORLDWIND_VERSION } from './assets';
import type { WorldWindStatic } from './worldwind-types';

let instance: WorldWindStatic | null = null;
let pending: Promise<WorldWindStatic> | null = null;

declare global {
  interface Window {
    WorldWind?: unknown;
  }
}

export interface LoadWorldWindOptions {
  /**
   * Custom loader. Defaults to `import('@nasaworldwind/worldwind')`. Use this to load a
   * different build (for example the `worldwindjs` community fork) or a CDN script.
   */
  loader?: () => Promise<unknown>;
}

function looksLikeWorldWind(candidate: unknown): candidate is WorldWindStatic {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof (candidate as { WorldWindow?: unknown }).WorldWindow === 'function'
  );
}

/** Accepts the raw module namespace, a default export, or the global and returns the namespace. */
export function unwrapWorldWindModule(mod: unknown): WorldWindStatic {
  if (looksLikeWorldWind(mod)) return mod;
  const withDefault = mod as { default?: unknown } | null | undefined;
  if (withDefault && looksLikeWorldWind(withDefault.default)) return withDefault.default;
  if (typeof window !== 'undefined' && looksLikeWorldWind(window.WorldWind)) return window.WorldWind;
  throw new Error(
    'worldwind-kit: the loaded module does not look like NASA WorldWind (no WorldWindow constructor found).',
  );
}

function defaultLoader(): Promise<unknown> {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error(
        'worldwind-kit: WorldWind needs a browser (window is undefined). Load it from a client-side effect, not during server rendering.',
      ),
    );
  }
  // A WorldWind that was already loaded through a <script> tag wins over a second copy.
  if (looksLikeWorldWind(window.WorldWind)) return Promise.resolve(window.WorldWind);
  return import('@nasaworldwind/worldwind');
}

/**
 * Loads NASA WorldWind lazily (browser only) and caches the namespace.
 * Safe to call many times; concurrent callers share one in-flight import.
 */
export function loadWorldWind(options: LoadWorldWindOptions = {}): Promise<WorldWindStatic> {
  if (instance) return Promise.resolve(instance);
  if (!pending) {
    const loader = options.loader ?? defaultLoader;
    pending = loader()
      .then((mod) => {
        instance = unwrapWorldWindModule(mod);
        return instance;
      })
      .catch((error: unknown) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}

/** Injects a WorldWind namespace directly (custom build, or the fake from `worldwind-kit/testing`). */
export function setWorldWind(worldWind: WorldWindStatic | null): void {
  instance = worldWind;
  pending = null;
}

/** Returns the loaded namespace, or throws if `loadWorldWind()` has not completed. */
export function getWorldWind(): WorldWindStatic {
  if (!instance) {
    throw new Error(
      'worldwind-kit: WorldWind is not loaded yet. Await loadWorldWind() first, or call setWorldWind() to inject a build.',
    );
  }
  return instance;
}

export function isWorldWindLoaded(): boolean {
  return instance !== null;
}

/** The official WorldWind bundle on a CDN, matching {@link DEFAULT_WORLDWIND_VERSION}. */
export const DEFAULT_WORLDWIND_SCRIPT_URL = `https://unpkg.com/@nasaworldwind/worldwind@${DEFAULT_WORLDWIND_VERSION}/build/dist/worldwind.min.js`;

/**
 * A loader that adds a `<script>` tag instead of bundling WorldWind. Use it with
 * `loadWorldWind({ loader: scriptLoader() })` (or a `loadOptions` prop) to keep the 1.7 MB
 * bundle out of your build, or as an alternative to the Vite plugin.
 */
export function scriptLoader(src: string = DEFAULT_WORLDWIND_SCRIPT_URL): () => Promise<unknown> {
  return () =>
    new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('worldwind-kit: scriptLoader needs a browser document.'));
        return;
      }
      if (looksLikeWorldWind(window.WorldWind)) {
        resolve(window.WorldWind);
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        if (looksLikeWorldWind(window.WorldWind)) resolve(window.WorldWind);
        else reject(new Error(`worldwind-kit: ${src} loaded but did not define window.WorldWind.`));
      };
      script.onerror = () => reject(new Error(`worldwind-kit: failed to load ${src}.`));
      document.head.appendChild(script);
    });
}
