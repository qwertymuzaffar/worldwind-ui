import { useEffect, type DependencyList, type ReactNode } from 'react';
import {
  createBuiltInLayer,
  createWmsLayer,
  createWmsLayerFromCapabilities,
  createWmtsLayerFromCapabilities,
  loadGeoJson,
  loadKml,
  type BuiltInLayerKind,
  type GeoJsonStyle,
  type GeoJsonStyleResolver,
  type GlobeController,
  type LayerOptions,
  type WWLayer,
  type WWRenderableLayer,
  type WmsLayerOptions,
  type WmtsLayerFromCapabilitiesOptions,
} from 'worldwind-kit';
import { useGlobe } from './context';
import { useLatest } from './internal/utils';
import { RenderableLayerContext } from './context';
import { useLayer, type UseLayerOptions } from './hooks';

export interface LayerProps extends UseLayerOptions {
  /** One of WorldWind's built-in layers, e.g. `blue-marble-landsat`, `osm`, `atmosphere`, `compass`. */
  kind: BuiltInLayerKind;
}

/** Adds a built-in WorldWind layer. Changing `kind` recreates it. */
export function Layer({ kind, ...options }: LayerProps) {
  useLayer((globe) => createBuiltInLayer(globe.worldWind, globe.wwd, kind), [kind], options);
  return null;
}

export interface WmsLayerProps extends WmsLayerOptions {
  index?: number;
  /**
   * Read the sector, formats and tiling from the service's GetCapabilities document instead of
   * the props; `layerNames` is then the single layer name to look up.
   */
  fromCapabilities?: boolean;
  onError?: (error: unknown) => void;
}

/** Adds an OGC WMS layer. Changing the service configuration recreates it. */
export function WmsLayer(props: WmsLayerProps) {
  const {
    index,
    displayName,
    enabled,
    opacity,
    pickEnabled,
    minActiveAltitude,
    maxActiveAltitude,
    fromCapabilities,
    onError,
    ...config
  } = props;
  const configKey = JSON.stringify({ ...config, fromCapabilities });
  useLayer(
    (globe) =>
      fromCapabilities
        ? createWmsLayerFromCapabilities(globe.worldWind, {
            service: config.service,
            layer: config.layerNames,
            time: config.time,
            displayName,
          })
        : createWmsLayer(globe.worldWind, { ...config, displayName }),
    [configKey],
    { index, displayName, enabled, opacity, pickEnabled, minActiveAltitude, maxActiveAltitude, onError },
  );
  return null;
}

export interface WmtsLayerProps extends Omit<WmtsLayerFromCapabilitiesOptions, 'fetch' | 'signal'> {
  index?: number;
  onError?: (error: unknown) => void;
}

/** Adds an OGC WMTS layer, configured from the service's GetCapabilities document. */
export function WmtsLayer(props: WmtsLayerProps) {
  const {
    index,
    displayName,
    enabled,
    opacity,
    pickEnabled,
    minActiveAltitude,
    maxActiveAltitude,
    onError,
    ...source
  } = props;
  const sourceKey = JSON.stringify(source);
  useLayer(
    (globe) => createWmtsLayerFromCapabilities(globe.worldWind, { ...source, displayName }),
    [sourceKey],
    { index, displayName, enabled, opacity, pickEnabled, minActiveAltitude, maxActiveAltitude, onError },
  );
  return null;
}

export interface GeoJsonLayerProps extends UseLayerOptions {
  /** A URL, a JSON string, or a GeoJSON object. */
  source: string | object;
  style?: GeoJsonStyle | GeoJsonStyleResolver;
  /** Shown in layer switchers. */
  name?: string;
  onLoad?: (layer: WWRenderableLayer) => void;
}

/** Loads GeoJSON into its own renderable layer; reloads when `source` or `style` change. */
export function GeoJsonLayer({ source, style, name = 'GeoJSON', onLoad, onError, ...options }: GeoJsonLayerProps) {
  const globe = useGlobe();
  const layer = useLayer<WWRenderableLayer>((g) => new g.worldWind.RenderableLayer(name), [], { displayName: name, ...options });
  const latest = useLatest({ style, onLoad, onError });
  const sourceKey = typeof source === 'string' ? source : JSON.stringify(source);
  const styleKey = typeof style === 'function' ? 'fn' : JSON.stringify(style ?? null);

  useEffect(() => {
    if (!layer) return;
    let cancelled = false;
    const controller = new AbortController();
    layer.removeAllRenderables();
    loadGeoJson(globe.worldWind, source, layer, { style: latest.current.style, signal: controller.signal }).then(
      () => {
        if (cancelled) return;
        globe.redraw();
        latest.current.onLoad?.(layer);
      },
      (error: unknown) => {
        if (!cancelled) (latest.current.onError ?? console.error)(error);
      },
    );
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globe, layer, sourceKey, styleKey, latest]);
  return null;
}

export interface KmlLayerProps extends UseLayerOptions {
  url: string;
  name?: string;
  onLoad?: (document: unknown) => void;
}

/** Loads a KML or KMZ document into its own renderable layer. */
export function KmlLayer({ url, name = 'KML', onLoad, onError, ...options }: KmlLayerProps) {
  const globe = useGlobe();
  const layer = useLayer<WWRenderableLayer>((g) => new g.worldWind.RenderableLayer(name), [], { displayName: name, ...options });
  const latest = useLatest({ onLoad, onError });

  useEffect(() => {
    if (!layer) return;
    let cancelled = false;
    layer.removeAllRenderables();
    loadKml(globe.worldWind, url, layer).then(
      (document) => {
        if (cancelled) return;
        globe.redraw();
        latest.current.onLoad?.(document);
      },
      (error: unknown) => {
        if (!cancelled) (latest.current.onError ?? console.error)(error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [globe, layer, url, latest]);
  return null;
}

export interface RenderableLayerProps extends UseLayerOptions {
  /** Shown in layer switchers. */
  name?: string;
  children?: ReactNode;
}

/** A layer that holds shapes: render `<Placemark>`, `<Path>`, `<Polygon>` and friends inside it. */
export function RenderableLayer({ name = 'Renderables', children, ...options }: RenderableLayerProps) {
  const layer = useLayer<WWRenderableLayer>(
    (globe) => new globe.worldWind.RenderableLayer(name),
    [],
    { displayName: name, ...options },
  );
  if (!layer) return null;
  return <RenderableLayerContext.Provider value={layer}>{children}</RenderableLayerContext.Provider>;
}

export interface CustomLayerProps<L extends WWLayer> extends UseLayerOptions {
  /** Builds any WorldWind layer, e.g. `new globe.worldWind.WmtsLayer(config)`. */
  create: (globe: GlobeController) => L;
  /** Recreate the layer when these change. */
  deps?: DependencyList;
  children?: (layer: L) => ReactNode;
}

/** Escape hatch for layers the library has no component for. */
export function CustomLayer<L extends WWLayer>({ create, deps = [], children, ...options }: CustomLayerProps<L>) {
  const layer = useLayer(create, deps, options);
  return layer && children ? <>{children(layer)}</> : null;
}

export type { LayerOptions };
