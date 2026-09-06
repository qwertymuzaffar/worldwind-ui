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
  type WWRenderable,
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
export function Path(props: PathProps) {
  const [events, options] = splitShapeProps(props);
  const path = useRenderable(createPath, updatePath, options);
  useShapeEvents(path, events);
  return null;
}

/** @category Shapes */
export type PolygonProps = PolygonOptions & ShapeEventProps;

/** @category Shapes */
export function Polygon(props: PolygonProps) {
  const [events, options] = splitShapeProps(props);
  const polygon = useRenderable(createPolygon, updatePolygon, options);
  useShapeEvents(polygon, events);
  return null;
}

/** @category Shapes */
export type SurfacePolylineProps = SurfacePolylineOptions & ShapeEventProps;

/** @category Shapes */
export function SurfacePolyline(props: SurfacePolylineProps) {
  const [events, options] = splitShapeProps(props);
  const shape = useRenderable(createSurfacePolyline, updateSurfacePolyline, options);
  useShapeEvents(shape, events);
  return null;
}

/** @category Shapes */
export type SurfacePolygonProps = SurfacePolygonOptions & ShapeEventProps;

/** @category Shapes */
export function SurfacePolygon(props: SurfacePolygonProps) {
  const [events, options] = splitShapeProps(props);
  const shape = useRenderable(createSurfacePolygon, updateSurfacePolygon, options);
  useShapeEvents(shape, events);
  return null;
}

/** @category Shapes */
export type SurfaceCircleProps = SurfaceCircleOptions & ShapeEventProps;

/** @category Shapes */
export function SurfaceCircle(props: SurfaceCircleProps) {
  const [events, options] = splitShapeProps(props);
  const shape = useRenderable(createSurfaceCircle, updateSurfaceCircle, options);
  useShapeEvents(shape, events);
  return null;
}

/** @category Shapes */
export type GeographicTextProps = GeographicTextOptions & ShapeEventProps;

/** @category Shapes */
export function GeographicText(props: GeographicTextProps) {
  const [events, options] = splitShapeProps(props);
  const text = useRenderable(createGeographicText, updateGeographicText, options);
  useShapeEvents(text, events);
  return null;
}
