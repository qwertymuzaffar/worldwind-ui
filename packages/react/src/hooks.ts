import { useEffect, useMemo, useState, useSyncExternalStore, type DependencyList } from 'react';
import {
  MeasureTool,
  applyLayerOptions,
  collectAttributions,
  collectLegends,
  type CollectAttributionsOptions,
  type CollectLegendsOptions,
  type CameraController,
  type CameraState,
  type GlobeController,
  type LayerAttribution,
  type LayerOptions,
  type LegendEntry,
  type MeasureToolOptions,
  type MeasurementState,
  type PickEventType,
  type PickHandler,
  type PickResult,
  type ProjectionKind,
  type ScaleBarOptions,
  type ScaleBarState,
  type WWLayer,
} from 'worldwind-kit';
import { useGlobe } from './context';
import { useLatest } from './internal/utils';

function useCameraStore(globe: GlobeController) {
  return useMemo(
    () => ({
      subscribe: (notify: () => void) => globe.camera.subscribe(() => notify()),
      getSnapshot: () => globe.camera.snapshot(),
    }),
    [globe],
  );
}

/** The camera state, updated after every frame in which it changed.
 * @category Hooks
 */
export function useCameraState(): CameraState {
  const globe = useGlobe();
  const store = useCameraStore(globe);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** @category Hooks */
export interface UseCameraResult {
  state: CameraState;
  controller: CameraController;
  set: CameraController['set'];
  goTo: CameraController['goTo'];
  zoomBy: CameraController['zoomBy'];
  zoomIn: CameraController['zoomIn'];
  zoomOut: CameraController['zoomOut'];
  rotateBy: CameraController['rotateBy'];
  tiltBy: CameraController['tiltBy'];
  resetNorth: CameraController['resetNorth'];
  resetOrientation: CameraController['resetOrientation'];
}

/** Camera state plus bound controls.
 * @category Hooks
 */
export function useCamera(): UseCameraResult {
  const globe = useGlobe();
  const state = useCameraState();
  const controls = useMemo(() => {
    const camera = globe.camera;
    return {
      controller: camera,
      set: camera.set.bind(camera),
      goTo: camera.goTo.bind(camera),
      zoomBy: camera.zoomBy.bind(camera),
      zoomIn: camera.zoomIn.bind(camera),
      zoomOut: camera.zoomOut.bind(camera),
      rotateBy: camera.rotateBy.bind(camera),
      tiltBy: camera.tiltBy.bind(camera),
      resetNorth: camera.resetNorth.bind(camera),
      resetOrientation: camera.resetOrientation.bind(camera),
    };
  }, [globe]);
  return useMemo(() => ({ state, ...controls }), [state, controls]);
}

/** Snapshot of the globe's layers (bottom to top), updated on every layer change.
 * @category Hooks
 */
export function useLayers(): readonly WWLayer[] {
  const globe = useGlobe();
  const store = useMemo(
    () => ({
      subscribe: (notify: () => void) => globe.layers.subscribe(() => notify()),
      getSnapshot: () => globe.layers.all,
    }),
    [globe],
  );
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** Subscribes to globe-wide click, double-click or hover picks.
 * @category Hooks
 */
export function useGlobeEvent(type: PickEventType, handler: PickHandler | undefined): void {
  const globe = useGlobe();
  const latest = useLatest(handler);
  const active = handler !== undefined;
  useEffect(() => {
    if (!active) return;
    return globe.on(type, (event) => latest.current?.(event));
  }, [globe, type, active, latest]);
}

/** The most recent hover pick, or null before the mouse first moves over the globe.
 * @category Hooks
 */
export function useHoverPick(): PickResult | null {
  const [pick, setPick] = useState<PickResult | null>(null);
  useGlobeEvent('hover', setPick);
  return pick;
}

/** @category Hooks */
export interface UseLayerOptions extends LayerOptions {
  /** Position in the layer stack (0 = bottom). Applied on creation only. */
  index?: number;
  /** Called when an asynchronous `create` rejects. Defaults to `console.error`. */
  onError?: (error: unknown) => void;
}

/**
 * Creates a WorldWind layer with `create` (synchronously or from a promise), adds it to the
 * globe, and removes it on unmount or whenever `deps` change. The {@link LayerOptions} are reactive.
  * @example
 * ```tsx
 * const layer = useLayer((globe) => new globe.worldWind.TectonicPlatesLayer(), [], { opacity: 0.6 });
 * ```
 * @category Hooks
 */
export function useLayer<L extends WWLayer>(
  create: (globe: GlobeController) => L | Promise<L>,
  deps: DependencyList,
  options: UseLayerOptions = {},
): L | null {
  const globe = useGlobe();
  const [layer, setLayer] = useState<L | null>(null);
  const latest = useLatest({ create, options });

  useEffect(() => {
    const { create, options } = latest.current;
    let cancelled = false;
    let added: L | null = null;
    const attach = (created: L) => {
      applyLayerOptions(created, options);
      globe.layers.add(created, { index: options.index });
      added = created;
      setLayer(created);
    };
    const result = create(globe);
    if (result instanceof Promise) {
      result.then(
        (created) => {
          if (!cancelled) attach(created);
        },
        (error: unknown) => {
          if (!cancelled) (latest.current.options.onError ?? console.error)(error);
        },
      );
    } else {
      attach(result);
    }
    return () => {
      cancelled = true;
      if (added) globe.layers.remove(added);
      setLayer(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globe, latest, ...deps]);

  const { displayName, enabled, opacity, pickEnabled, minActiveAltitude, maxActiveAltitude, attribution, legend, timeDimension } = options;
  // Object-valued options are compared by content so inline literals do not churn the effect.
  const metadataKey = JSON.stringify([attribution ?? null, legend ?? null, timeDimension ?? null]);
  useEffect(() => {
    if (!layer) return;
    globe.layers.update(layer, {
      displayName,
      enabled,
      opacity,
      pickEnabled,
      minActiveAltitude,
      maxActiveAltitude,
      attribution,
      legend,
      timeDimension,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globe, layer, displayName, enabled, opacity, pickEnabled, minActiveAltitude, maxActiveAltitude, metadataKey]);

  return layer;
}

/** The globe's current projection, updated whenever it changes.
 * @category Hooks
 */
export function useProjection(): ProjectionKind {
  const globe = useGlobe();
  const store = useMemo(
    () => ({
      subscribe: (notify: () => void) => globe.onProjectionChange(() => notify()),
      getSnapshot: () => globe.projection,
    }),
    [globe],
  );
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** @category Hooks */
export interface UseMeasureToolResult {
  state: MeasurementState;
  /** The tool, or null until the globe effect has created it. */
  tool: MeasureTool | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  undo: () => void;
  clear: () => void;
}

const IDLE_MEASUREMENT: MeasurementState = { points: [], lengthMeters: 0, areaSquareMeters: null, active: false };

/** A click-to-measure tool bound to the globe for the component's lifetime.
 * @example
 * ```tsx
 * const { state, toggle } = useMeasureTool();
 * return <button onClick={toggle}>{state.active ? 'Stop' : 'Measure'} ({formatDistance(state.lengthMeters)})</button>;
 * ```
 * @category Hooks
 */
export function useMeasureTool(options: MeasureToolOptions = {}): UseMeasureToolResult {
  const globe = useGlobe();
  const latest = useLatest(options);
  const [tool, setTool] = useState<MeasureTool | null>(null);

  useEffect(() => {
    const created = new MeasureTool(globe, latest.current);
    setTool(created);
    return () => {
      created.destroy();
      setTool(null);
    };
  }, [globe, latest]);

  const store = useMemo(
    () => ({
      subscribe: (notify: () => void) => (tool ? tool.subscribe(() => notify()) : () => {}),
      getSnapshot: () => (tool ? tool.state : IDLE_MEASUREMENT),
    }),
    [tool],
  );
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  return useMemo(
    () => ({
      state,
      tool,
      start: () => tool?.start(),
      stop: () => tool?.stop(),
      toggle: () => tool?.toggle(),
      undo: () => tool?.undo(),
      clear: () => tool?.clear(),
    }),
    [state, tool],
  );
}

/** The map scale at the view centre, updated after every frame in which it changed. Null before the first frame.
 * @category Hooks
 */
export function useScaleBar(options: ScaleBarOptions = {}): ScaleBarState | null {
  const globe = useGlobe();
  const { maxWidth, units } = options;
  const [state, setState] = useState<ScaleBarState | null>(null);
  useEffect(() => globe.trackScale(setState, { maxWidth, units }), [globe, maxWidth, units]);
  return state;
}

/** The distinct credits of the globe's layers (enabled ones by default), updated on every layer change.
 * @category Hooks
 */
export function useAttributions(options: CollectAttributionsOptions = {}): LayerAttribution[] {
  const layers = useLayers();
  const { enabledOnly } = options;
  return useMemo(() => collectAttributions(layers, { enabledOnly }), [layers, enabledOnly]);
}

/** The layers that have a legend (enabled ones by default, top-most first), updated on every layer change.
 * @category Hooks
 */
export function useLegends(options: CollectLegendsOptions = {}): LegendEntry[] {
  const layers = useLayers();
  const { enabledOnly, topFirst } = options;
  return useMemo(() => collectLegends(layers, { enabledOnly, topFirst }), [layers, enabledOnly, topFirst]);
}
