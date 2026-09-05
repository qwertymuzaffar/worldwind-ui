import { useEffect, useMemo, useState, useSyncExternalStore, type DependencyList } from 'react';
import {
  applyLayerOptions,
  type CameraController,
  type CameraState,
  type GlobeController,
  type LayerOptions,
  type PickEventType,
  type PickHandler,
  type PickResult,
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

/** The camera state, updated after every frame in which it changed. */
export function useCameraState(): CameraState {
  const globe = useGlobe();
  const store = useCameraStore(globe);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

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

/** Camera state plus bound controls. */
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

/** Snapshot of the globe's layers (bottom to top), updated on every layer change. */
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

/** Subscribes to globe-wide click, double-click or hover picks. */
export function useGlobeEvent(type: PickEventType, handler: PickHandler | undefined): void {
  const globe = useGlobe();
  const latest = useLatest(handler);
  const active = handler !== undefined;
  useEffect(() => {
    if (!active) return;
    return globe.on(type, (event) => latest.current?.(event));
  }, [globe, type, active, latest]);
}

/** The most recent hover pick, or null before the mouse first moves over the globe. */
export function useHoverPick(): PickResult | null {
  const [pick, setPick] = useState<PickResult | null>(null);
  useGlobeEvent('hover', setPick);
  return pick;
}

export interface UseLayerOptions extends LayerOptions {
  /** Position in the layer stack (0 = bottom). Applied on creation only. */
  index?: number;
}

/**
 * Creates a WorldWind layer with `create`, adds it to the globe, and removes it on unmount or
 * whenever `deps` change. The {@link LayerOptions} are reactive.
 */
export function useLayer<L extends WWLayer>(
  create: (globe: GlobeController) => L,
  deps: DependencyList,
  options: UseLayerOptions = {},
): L | null {
  const globe = useGlobe();
  const [layer, setLayer] = useState<L | null>(null);
  const latest = useLatest({ create, options });

  useEffect(() => {
    const { create, options } = latest.current;
    const created = applyLayerOptions(create(globe), options);
    globe.layers.add(created, { index: options.index });
    setLayer(created);
    return () => {
      globe.layers.remove(created);
      setLayer(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globe, latest, ...deps]);

  const { displayName, enabled, opacity, pickEnabled, minActiveAltitude, maxActiveAltitude } = options;
  useEffect(() => {
    if (!layer) return;
    globe.layers.update(layer, { displayName, enabled, opacity, pickEnabled, minActiveAltitude, maxActiveAltitude });
  }, [globe, layer, displayName, enabled, opacity, pickEnabled, minActiveAltitude, maxActiveAltitude]);

  return layer;
}
