import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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

/**
 * Renders a WorldWind globe. Creation options (`layers`, `view`, `elevation`, ...) apply on
 * mount; `projection` and the event handlers are reactive. Children render inside an overlay
 * above the canvas once the globe is ready, with the globe available through context.
 *
 * Give the element a height (via `className` or `style`); the canvas fills it.
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
  const [value, setValue] = useState<GlobeContextValue | null>(null);
  const [error, setError] = useState<unknown>(null);
  const latest = useLatest({ options: { ...creationOptions, projection }, loadOptions, onReady, onError });

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
  }, [latest]);

  const globe = value?.globe ?? null;

  useEffect(() => {
    if (globe && projection && globe.projection !== projection) globe.setProjection(projection);
  }, [globe, projection]);

  usePickSubscription(globe, 'click', onClick);
  usePickSubscription(globe, 'dblclick', onDoubleClick);
  usePickSubscription(globe, 'hover', onHover);

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
      {message != null ? (
        <div className="wwui-overlay">
          <div className="wwui-panel wwui-panel--top-left" role="alert">
            {message}
          </div>
        </div>
      ) : null}
    </div>
  );
}
