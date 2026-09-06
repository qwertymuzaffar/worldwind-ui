import { useLayoutEffect, useRef, type RefObject } from 'react';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** A ref that always holds the latest value, for callbacks that must not re-subscribe. */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Structural equality for plain data (options objects). Non-plain objects compare by reference. */
export function deepEqual(a: unknown, b: unknown, depth = 8): boolean {
  if (Object.is(a, b)) return true;
  if (depth === 0 || typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) if (!deepEqual(a[i], b[i], depth - 1)) return false;
    return true;
  }
  const protoA = Object.getPrototypeOf(a);
  const protoB = Object.getPrototypeOf(b);
  if (protoA !== protoB) return false;
  if (protoA !== Object.prototype && protoA !== null) return false;
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], depth - 1)) return false;
  }
  return true;
}

let nextLayerKey = 1;
const layerKeys = new WeakMap<object, number>();

/** A stable React key for a WorldWind layer (or any object) across renders. */
export function layerKey(layer: object): number {
  let key = layerKeys.get(layer);
  if (key === undefined) {
    key = nextLayerKey;
    nextLayerKey += 1;
    layerKeys.set(layer, key);
  }
  return key;
}
