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

export interface PickSubscription {
  stop: Unsubscribe;
  /** The gesture recognizers created for click-like subscriptions (none for hover). */
  recognizers: WWGestureRecognizer[];
}

/**
 * Low-level subscription. Prefer {@link PickDispatcher} (used by `GlobeController.on`): WorldWind
 * lets only one recognizer claim a gesture, so a second independent click recognizer on the same
 * window never fires unless the two are told to recognize simultaneously.
 */
export function subscribePick(
  worldWind: WorldWindStatic,
  wwd: WWWorldWindow,
  type: PickEventType,
  handler: PickHandler,
): PickSubscription {
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
    return {
      stop: () => {
        wwd.removeEventListener('mousemove', listener);
        if (frame !== null) cancelFrame(frame);
      },
      recognizers: [],
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
  return {
    stop: () => {
      click.enabled = false;
      tap.enabled = false;
    },
    recognizers: [click, tap],
  };
}

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
  return subscribePick(worldWind, wwd, type, handler).stop;
}

/**
 * One set of recognizers per event type for a window, fanning each pick out to every handler.
 * The recognizers it creates are allowed to recognize simultaneously with each other, so clicks
 * and double-clicks coexist. Recognizers stay registered (disabled while unused) because
 * WorldWind favours the earliest-registered recognizer for a gesture.
 */
export class PickDispatcher {
  private readonly handlers = new Map<PickEventType, Set<PickHandler>>();
  private readonly subscriptions = new Map<PickEventType, PickSubscription>();
  private readonly recognizers: WWGestureRecognizer[] = [];

  constructor(
    private readonly worldWind: WorldWindStatic,
    private readonly wwd: WWWorldWindow,
  ) {}

  on(type: PickEventType, handler: PickHandler): Unsubscribe {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
    this.ensureSubscribed(type);
    return () => {
      const current = this.handlers.get(type);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) this.pause(type);
    };
  }

  /** Number of handlers registered for `type`. */
  size(type: PickEventType): number {
    return this.handlers.get(type)?.size ?? 0;
  }

  destroy(): void {
    for (const subscription of this.subscriptions.values()) subscription.stop();
    this.subscriptions.clear();
    this.handlers.clear();
    this.recognizers.length = 0;
  }

  private ensureSubscribed(type: PickEventType): void {
    const existing = this.subscriptions.get(type);
    if (existing) {
      for (const recognizer of existing.recognizers) recognizer.enabled = true;
      return;
    }
    const subscription = subscribePick(this.worldWind, this.wwd, type, (event) => {
      const set = this.handlers.get(type);
      if (!set) return;
      for (const handler of Array.from(set)) handler(event);
    });
    for (const recognizer of subscription.recognizers) {
      for (const other of this.recognizers) {
        recognizer.recognizeSimultaneouslyWith(other);
        other.recognizeSimultaneouslyWith(recognizer);
      }
      this.recognizers.push(recognizer);
    }
    this.subscriptions.set(type, subscription);
  }

  private pause(type: PickEventType): void {
    const subscription = this.subscriptions.get(type);
    if (!subscription) return;
    if (subscription.recognizers.length === 0) {
      // Hover: a mousemove listener costs a pick per frame, so drop it and recreate later.
      subscription.stop();
      this.subscriptions.delete(type);
    } else {
      for (const recognizer of subscription.recognizers) recognizer.enabled = false;
    }
  }
}
