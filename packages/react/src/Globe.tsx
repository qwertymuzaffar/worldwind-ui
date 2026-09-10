import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import {
  GlobeController,
  ShapeEventRegistry,
  type GlobeOptions,
  type LoadWorldWindOptions,
  type PickEventType,
  type PickHandler,
  type ProjectionKind,
} from 'worldwind-kit';
import { GlobeContext, type GlobeContextValue } from './context';
import { cx, useLatest } from './internal/utils';

/** @category Globe */
export interface GlobeProps extends Omit<GlobeOptions, 'projection'> {
  /** Reactive: changing it switches projection on the live globe. */
  projection?: ProjectionKind;
  className?: string;
  style?: CSSProperties;
  /** Rendered while WorldWind loads. */
  fallback?: ReactNode;
  loadOptions?: LoadWorldWindOptions;
  onReady?: (globe: GlobeController) => void;
  onError?: (error: unknown) => void;
  onClick?: PickHandler;
  onDoubleClick?: PickHandler;
  onHover?: PickHandler;
  children?: ReactNode;
}

function usePickSubscription(globe: GlobeController | null, type: PickEventType, handler: PickHandler | undefined) {
  const latest = useLatest(handler);
  const active = handler !== undefined;
  useEffect(() => {
    if (!globe || !active) return;
    return globe.on(type, (event) => latest.current?.(event));
  }, [globe, type, active, latest]);
}

/** What the globe is created with: read once, at mount, from the latest props. */
interface GlobeInit {
  options: GlobeOptions;
  loadOptions?: LoadWorldWindOptions;
  onReady?: (globe: GlobeController) => void;
  onError?: (error: unknown) => void;
}

/**
 * Creates the globe in the host element once and destroys it on unmount. A creation that
 * resolves after unmount is destroyed straight away; a rejection surfaces as `error`.
 */
function useGlobeController(
  hostRef: RefObject<HTMLDivElement | null>,
  init: GlobeInit,
): { value: GlobeContextValue | null; error: unknown } {
  const latest = useLatest(init);
  const [value, setValue] = useState<GlobeContextValue | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let controller: GlobeController | null = null;
    let registry: ShapeEventRegistry | null = null;
    const { options, loadOptions } = latest.current;

    GlobeController.create(host, options, loadOptions).then(
      (globe) => {
        if (cancelled) {
          globe.destroy();
          return;
        }
        controller = globe;
        registry = new ShapeEventRegistry(globe);
        setValue({ globe, shapeEvents: registry });
        latest.current.onReady?.(globe);
      },
      (reason: unknown) => {
        if (cancelled) return;
        setError(reason);
        latest.current.onError?.(reason);
      },
    );

    return () => {
      cancelled = true;
      registry?.destroy();
      controller?.destroy();
      setValue(null);
    };
  }, [hostRef, latest]);

  return { value, error };
}

/** Switches the live globe's projection whenever the prop changes. */
function useProjectionSync(globe: GlobeController | null, projection: ProjectionKind | undefined) {
  useEffect(() => {
    if (globe && projection && globe.projection !== projection) globe.setProjection(projection);
  }, [globe, projection]);
}

/** The globe-wide pick handlers; each subscription is active only while its prop is set. */
function usePickHandlers(
  globe: GlobeController | null,
  { onClick, onDoubleClick, onHover }: Pick<GlobeProps, 'onClick' | 'onDoubleClick' | 'onHover'>,
) {
  usePickSubscription(globe, 'click', onClick);
  usePickSubscription(globe, 'dblclick', onDoubleClick);
  usePickSubscription(globe, 'hover', onHover);
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="wwui-overlay">
      <div className="wwui-panel wwui-panel--top-left" role="alert">
        {message}
      </div>
    </div>
  );
}

/**
 * Renders a WorldWind globe. Creation options (`layers`, `view`, `elevation`, ...) apply on
 * mount; `projection` and the event handlers are reactive. Children render inside an overlay
 * above the canvas once the globe is ready, with the globe available through context.
 *
 * Give the element a height (via `className` or `style`); the canvas fills it.
  * @example
 * ```tsx
 * <Globe style={{ height: 480 }} layers={['blue-marble-landsat', 'atmosphere']} view={{ latitude: 40, longitude: -74, range: 2e6 }}>
 *   <RenderableLayer name="Cities">
 *     <Placemark position={{ latitude: 40.7128, longitude: -74.006 }} label="New York" />
 *   </RenderableLayer>
 *   <LayerSwitcher />
 * </Globe>
 * ```
 * @category Globe
 */
export function Globe(props: GlobeProps) {
  const {
    projection,
    className,
    style,
    fallback,
    loadOptions,
    onReady,
    onError,
    onClick,
    onDoubleClick,
    onHover,
    children,
    ...creationOptions
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const options = { ...creationOptions, projection };
  const { value, error } = useGlobeController(hostRef, { options, loadOptions, onReady, onError });
  const globe = value?.globe ?? null;
  useProjectionSync(globe, projection);
  usePickHandlers(globe, { onClick, onDoubleClick, onHover });

  const message = error instanceof Error ? error.message : error != null ? String(error) : null;

  return (
    <div className={cx('wwui-globe', className)} style={{ position: 'relative', ...style }}>
      <div ref={hostRef} className="wwui-globe__canvas" style={{ position: 'absolute', inset: 0 }} />
      {value ? (
        <GlobeContext.Provider value={value}>
          <div className="wwui-overlay">{children}</div>
        </GlobeContext.Provider>
      ) : fallback != null && message == null ? (
        <div className="wwui-overlay">{fallback}</div>
      ) : null}
      {message != null ? <ErrorPanel message={message} /> : null}
    </div>
  );
}
