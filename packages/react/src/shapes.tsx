import { useEffect, useRef, useState } from 'react';
import {
  createGeographicText,
  createPath,
  createPlacemark,
  createPolygon,
  createSurfaceCircle,
  createSurfacePolygon,
  createSurfacePolyline,
  pushpinUrl,
  updateGeographicText,
  updatePath,
  updatePlacemark,
  updatePolygon,
  updateSurfaceCircle,
  updateSurfacePolygon,
  updateSurfacePolyline,
  type GeographicTextOptions,
  type PathOptions,
  type PickHandler,
  type PlacemarkOptions,
  type PolygonOptions,
  type PushpinColor,
  type PushpinStyle,
  type SurfaceCircleOptions,
  type SurfacePolygonOptions,
  type SurfacePolylineOptions,
  type WWGeographicText,
  type WWPath,
  type WWPolygon,
  type WWRenderable,
  type WWSurfaceCircle,
  type WWSurfacePolygon,
  type WWSurfacePolyline,
  type WorldWindStatic,
} from 'worldwind-kit';
import { useGlobe, useGlobeContext, useRenderableLayer } from './context';
import { deepEqual, useLatest } from './internal/utils';

/** Event props shared by every shape component.
 * @category Shapes
 */
export interface ShapeEventProps {
  onClick?: PickHandler;
  onDoubleClick?: PickHandler;
  onMouseEnter?: PickHandler;
  onMouseLeave?: PickHandler;
  /** Toggle the shape's `highlightAttributes` while the mouse is over it. */
  highlightOnHover?: boolean;
}

const SHAPE_EVENT_KEYS = ['onClick', 'onDoubleClick', 'onMouseEnter', 'onMouseLeave', 'highlightOnHover'] as const;

function splitShapeProps<P extends ShapeEventProps>(props: P): [ShapeEventProps, Omit<P, keyof ShapeEventProps>] {
  const events: ShapeEventProps = {};
  const rest = { ...props } as Record<string, unknown>;
  for (const key of SHAPE_EVENT_KEYS) {
    if (key in rest) {
      (events as Record<string, unknown>)[key] = rest[key];
      delete rest[key];
    }
  }
  return [events, rest as Omit<P, keyof ShapeEventProps>];
}

/** Registers pick handlers for one renderable through the globe's shared registry.
 * @category Shapes
 */
export function useShapeEvents(object: (WWRenderable & { highlighted?: boolean }) | null, props: ShapeEventProps): void {
  const { shapeEvents, globe } = useGlobeContext();
  const latest = useLatest(props);
  const hasClick = props.onClick !== undefined;
  const hasDoubleClick = props.onDoubleClick !== undefined;
  const wantsHover = Boolean(props.onMouseEnter || props.onMouseLeave || props.highlightOnHover);

  useEffect(() => {
    if (!object || !hasClick) return;
    return shapeEvents.register(object, 'click', (event) => latest.current.onClick?.(event));
  }, [object, hasClick, shapeEvents, latest]);

  useEffect(() => {
    if (!object || !hasDoubleClick) return;
    return shapeEvents.register(object, 'dblclick', (event) => latest.current.onDoubleClick?.(event));
  }, [object, hasDoubleClick, shapeEvents, latest]);

  useEffect(() => {
    if (!object || !wantsHover) return;
    let over = false;
    const unregister = shapeEvents.register(object, 'hover', (event) => {
      const now = event.items.some((item) => item.object === object);
      if (now === over) return;
      over = now;
      const current = latest.current;
      if (current.highlightOnHover) {
        object.highlighted = now;
        globe.redraw();
      }
      (now ? current.onMouseEnter : current.onMouseLeave)?.(event);
    });
    return () => {
      unregister();
      if (over && object.highlighted) {
        object.highlighted = false;
        globe.redraw();
      }
    };
  }, [object, wantsHover, shapeEvents, globe, latest]);
}

/**
 * Creates a renderable once, keeps it in the enclosing `<RenderableLayer>`, and applies
 * option changes in place (structural comparison, so inline objects are fine).
  * @category Shapes
 */
export function useRenderable<T extends WWRenderable, O>(
  create: (worldWind: WorldWindStatic, options: O) => T,
  update: (worldWind: WorldWindStatic, renderable: T, options: Partial<O>) => void,
  options: O,
): T {
  const globe = useGlobe();
  const layer = useRenderableLayer();
  const [renderable] = useState(() => create(globe.worldWind, options));
  const applied = useRef(options);

  useEffect(() => {
    if (deepEqual(applied.current, options)) return;
    applied.current = options;
    update(globe.worldWind, renderable, options);
    globe.redraw();
  });

  useEffect(() => {
    layer.addRenderable(renderable);
    globe.redraw();
    return () => {
      layer.removeRenderable(renderable);
      globe.redraw();
    };
  }, [layer, globe, renderable]);

  return renderable;
}

/** A shape component's props without the event handlers: what its `create` and `update` take. */
type ShapeOptions<P extends ShapeEventProps> = Omit<P, keyof ShapeEventProps>;

/**
 * Builds a shape component from a kit create/update pair: one renderable kept in the enclosing
 * `<RenderableLayer>`, options applied in place, and the shared event props wired up.
 */
function defineShape<P extends ShapeEventProps, T extends WWRenderable & { highlighted?: boolean }>(
  displayName: string,
  create: (worldWind: WorldWindStatic, options: ShapeOptions<P>) => T,
  update: (worldWind: WorldWindStatic, renderable: T, options: Partial<ShapeOptions<P>>) => void,
): (props: P) => null {
  function Shape(props: P) {
    const [events, options] = splitShapeProps(props);
    const shape = useRenderable(create, update, options);
    useShapeEvents(shape, events);
    return null;
  }
  Shape.displayName = displayName;
  return Shape;
}

// Components --------------------------------------------------------------------------------------

/** @category Shapes */
export interface PlacemarkProps extends PlacemarkOptions, ShapeEventProps {
  /** Use one of WorldWind's bundled pushpins. Defaults to `red` when no `imageSource` is given; `false` disables. */
  pushpin?: PushpinColor | false;
  pushpinStyle?: PushpinStyle;
}

/** @category Shapes */
export function Placemark(props: PlacemarkProps) {
  const [events, { pushpin, pushpinStyle, ...rest }] = splitShapeProps(props);
  const globe = useGlobe();
  let options: PlacemarkOptions = rest;
  if (rest.imageSource === undefined && pushpin !== false) {
    options = {
      ...rest,
      imageSource: pushpinUrl(globe.worldWind, pushpin ?? 'red', pushpinStyle),
      imageOffset: rest.imageOffset ?? { x: 0.3, y: 0 },
      labelOffset: rest.labelOffset ?? { x: 0.5, y: 1 },
    };
  }
  const placemark = useRenderable(createPlacemark, updatePlacemark, options);
  useShapeEvents(placemark, events);
  return null;
}

/** @category Shapes */
export type PathProps = PathOptions & ShapeEventProps;

/** @category Shapes */
export const Path = defineShape<PathProps, WWPath>('Path', createPath, updatePath);

/** @category Shapes */
export type PolygonProps = PolygonOptions & ShapeEventProps;

/** @category Shapes */
export const Polygon = defineShape<PolygonProps, WWPolygon>(
  'Polygon',
  createPolygon,
  updatePolygon,
);

/** @category Shapes */
export type SurfacePolylineProps = SurfacePolylineOptions & ShapeEventProps;

/** @category Shapes */
export const SurfacePolyline = defineShape<SurfacePolylineProps, WWSurfacePolyline>(
  'SurfacePolyline',
  createSurfacePolyline,
  updateSurfacePolyline,
);

/** @category Shapes */
export type SurfacePolygonProps = SurfacePolygonOptions & ShapeEventProps;

/** @category Shapes */
export const SurfacePolygon = defineShape<SurfacePolygonProps, WWSurfacePolygon>(
  'SurfacePolygon',
  createSurfacePolygon,
  updateSurfacePolygon,
);

/** @category Shapes */
export type SurfaceCircleProps = SurfaceCircleOptions & ShapeEventProps;

/** @category Shapes */
export const SurfaceCircle = defineShape<SurfaceCircleProps, WWSurfaceCircle>(
  'SurfaceCircle',
  createSurfaceCircle,
  updateSurfaceCircle,
);

/** @category Shapes */
export type GeographicTextProps = GeographicTextOptions & ShapeEventProps;

/** @category Shapes */
export const GeographicText = defineShape<GeographicTextProps, WWGeographicText>(
  'GeographicText',
  createGeographicText,
  updateGeographicText,
);
