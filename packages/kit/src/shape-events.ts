import type { Unsubscribe } from './events';
import type { GlobeController } from './globe';
import type { PickEvent, PickEventType, PickHandler } from './picking';

/**
 * Routes globe picks to handlers registered per renderable, so a hundred placemarks with
 * click handlers share one gesture recognizer instead of creating a hundred.
 *
 * `click` and `dblclick` handlers fire only when their object is among the picked items.
 * `hover` handlers fire for every hover event (so they can detect leave as well as enter).
 */
export class ShapeEventRegistry {
  private readonly handlers = new Map<PickEventType, Map<unknown, Set<PickHandler>>>();
  private readonly subscriptions = new Map<PickEventType, Unsubscribe>();

  constructor(private readonly globe: GlobeController) {}

  register(object: unknown, type: PickEventType, handler: PickHandler): Unsubscribe {
    let byObject = this.handlers.get(type);
    if (!byObject) {
      byObject = new Map();
      this.handlers.set(type, byObject);
    }
    let set = byObject.get(object);
    if (!set) {
      set = new Set();
      byObject.set(object, set);
    }
    set.add(handler);
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(
        type,
        this.globe.on(type, (event) => this.dispatch(type, event)),
      );
    }
    return () => {
      set.delete(handler);
      if (set.size === 0) byObject.delete(object);
      if (byObject.size === 0) {
        this.subscriptions.get(type)?.();
        this.subscriptions.delete(type);
        this.handlers.delete(type);
      }
    };
  }

  /** Number of objects with at least one handler for `type`. */
  size(type: PickEventType): number {
    return this.handlers.get(type)?.size ?? 0;
  }

  destroy(): void {
    for (const unsubscribe of this.subscriptions.values()) unsubscribe();
    this.subscriptions.clear();
    this.handlers.clear();
  }

  private dispatch(type: PickEventType, event: PickEvent): void {
    const byObject = this.handlers.get(type);
    if (!byObject) return;
    if (type === 'hover') {
      for (const set of Array.from(byObject.values())) for (const handler of Array.from(set)) handler(event);
      return;
    }
    const seen = new Set<unknown>();
    for (const item of event.items) {
      if (item.isTerrain || seen.has(item.object)) continue;
      seen.add(item.object);
      const set = byObject.get(item.object);
      if (set) for (const handler of Array.from(set)) handler(event);
    }
  }
}
