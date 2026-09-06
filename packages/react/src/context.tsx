import { createContext, useContext } from 'react';
import type { GlobeController, ShapeEventRegistry, WWRenderableLayer, WorldWindStatic } from 'worldwind-kit';

/** @category Context */
export interface GlobeContextValue {
  globe: GlobeController;
  shapeEvents: ShapeEventRegistry;
}

/** @category Context */
export const GlobeContext = createContext<GlobeContextValue | null>(null);

/** @category Context */
export function useGlobeContext(): GlobeContextValue {
  const value = useContext(GlobeContext);
  if (!value) {
    throw new Error('react-worldwind: this hook or component must be rendered inside <Globe>.');
  }
  return value;
}

/** The controller for the enclosing `<Globe>`. Throws outside one.
 * @category Context
 */
export function useGlobe(): GlobeController {
  return useGlobeContext().globe;
}

/** Like {@link useGlobe} but returns null outside a ready `<Globe>`.
 * @category Context
 */
export function useGlobeOptional(): GlobeController | null {
  return useContext(GlobeContext)?.globe ?? null;
}

/** The raw WorldWind namespace, for anything the components do not cover.
 * @category Context
 */
export function useWorldWind(): WorldWindStatic {
  return useGlobe().worldWind;
}

/** @category Context */
export const RenderableLayerContext = createContext<WWRenderableLayer | null>(null);

/** The enclosing `<RenderableLayer>`'s WorldWind layer. Throws outside one.
 * @category Context
 */
export function useRenderableLayer(): WWRenderableLayer {
  const layer = useContext(RenderableLayerContext);
  if (!layer) {
    throw new Error('react-worldwind: shapes such as <Placemark> must be rendered inside <RenderableLayer>.');
  }
  return layer;
}
