import type { Unsubscribe } from './events';
import { fromPosition, type LatLonAlt } from './geo';
import type { WWGestureRecognizer, WWLayer, WWPickedObject, WWWorldWindow, WorldWindStatic } from './worldwind-types';

export interface PickedItem {
  /** The picked renderable (Placemark, Path, ...) or the terrain object. */
  object: unknown;
  layer: WWLayer | null;
  position: LatLonAlt | null;
  isTerrain: boolean;
  isOnTop: boolean;
}

export interface PickResult {
  clientX: number;
  clientY: number;
  /** Terrain position under the point, or null when the point is off the globe. */
  position: LatLonAlt | null;
  items: PickedItem[];
  /** The top-most non-terrain item, if any. */
  top: PickedItem | null;
}

export interface PickOptions {
  /** Only pick the terrain, which is much cheaper than a full pick. */
  terrainOnly?: boolean;
}

function toItem(picked: WWPickedObject): PickedItem {
  return {
    object: picked.userObject,
    layer: picked.parentLayer ?? null,
    position: picked.position ? fromPosition(picked.position) : null,
    isTerrain: picked.isTerrain,
    isOnTop: picked.isOnTop,
  };
}

/** Picks whatever is under a point given in client (viewport) coordinates. */
export function pickAt(
  wwd: WWWorldWindow,
  clientX: number,
  clientY: number,
  options: PickOptions = {},
): PickResult {
  const point = wwd.canvasCoordinates(clientX, clientY);
  const list = options.terrainOnly ? wwd.pickTerrain(point) : wwd.pick(point);
  const items = list.objects.map(toItem);
  const terrain = items.find((item) => item.isTerrain) ?? null;
  const top = items.find((item) => item.isOnTop && !item.isTerrain) ?? items.find((item) => !item.isTerrain) ?? null;
  return { clientX, clientY, position: terrain?.position ?? null, items, top };
}

export type PickEventType = 'click' | 'dblclick' | 'hover';

export interface PickEvent extends PickResult {
  type: PickEventType;
}

export type PickHandler = (event: PickEvent) => void;

const requestFrame: (callback: () => void) => number =
  typeof requestAnimationFrame === 'function'
    ? (callback) => requestAnimationFrame(callback)
    : (callback) => setTimeout(callback, 16) as unknown as number;

const cancelFrame: (handle: number) => void =
  typeof cancelAnimationFrame === 'function' ? (handle) => cancelAnimationFrame(handle) : (handle) => clearTimeout(handle);

/**
 * Subscribes to picks. `click` and `dblclick` use WorldWind's gesture recognizers, so drags are
 * ignored and touch taps count; `hover` follows the mouse, throttled to one pick per frame.
 */
export function onPick(
  worldWind: WorldWindStatic,
  wwd: WWWorldWindow,
  type: PickEventType,
  handler: PickHandler,
): Unsubscribe {
  if (type === 'hover') {
    let frame: number | null = null;
    let latest: MouseEvent | null = null;
    const listener = (event: MouseEvent) => {
      latest = event;
      if (frame !== null) return;
      frame = requestFrame(() => {
        frame = null;
        const event = latest;
        latest = null;
        if (event) handler({ type, ...pickAt(wwd, event.clientX, event.clientY) });
      });
    };
    wwd.addEventListener('mousemove', listener);
    return () => {
      wwd.removeEventListener('mousemove', listener);
      if (frame !== null) cancelFrame(frame);
    };
  }

  const count = type === 'dblclick' ? 2 : 1;
  const callback = (recognizer: WWGestureRecognizer) => {
    if (recognizer.state === worldWind.RECOGNIZED) {
      handler({ type, ...pickAt(wwd, recognizer.clientX, recognizer.clientY) });
    }
  };
  const click = new worldWind.ClickRecognizer(wwd, callback);
  click.numberOfClicks = count;
  const tap = new worldWind.TapRecognizer(wwd, callback);
  tap.numberOfTaps = count;
  // WorldWind offers no way to detach a recognizer; disabling it is the supported route.
  return () => {
    click.enabled = false;
    tap.enabled = false;
  };
}
