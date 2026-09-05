export type Listener<T> = (value: T) => void;
export type Unsubscribe = () => void;

export interface Emitter<T> {
  on(listener: Listener<T>): Unsubscribe;
  emit(value: T): void;
  clear(): void;
  readonly size: number;
}

/** Minimal synchronous emitter. Listeners added or removed during `emit` take effect on the next emit. */
export function createEmitter<T>(): Emitter<T> {
  const listeners = new Set<Listener<T>>();
  return {
    on(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(value) {
      for (const listener of Array.from(listeners)) listener(value);
    },
    clear() {
      listeners.clear();
    },
    get size() {
      return listeners.size;
    },
  };
}
