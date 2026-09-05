import type { DependencyList, ReactNode } from 'react';
import {
  createBuiltInLayer,
  createWmsLayer,
  type BuiltInLayerKind,
  type GlobeController,
  type LayerOptions,
  type WWLayer,
  type WWRenderableLayer,
  type WmsLayerOptions,
} from 'worldwind-kit';
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
    ...config
  } = props;
  const configKey = JSON.stringify(config);
  useLayer(
    (globe) => createWmsLayer(globe.worldWind, { ...config, displayName }),
    [configKey],
    { index, displayName, enabled, opacity, pickEnabled, minActiveAltitude, maxActiveAltitude },
  );
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
