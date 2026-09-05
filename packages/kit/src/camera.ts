import { createEmitter, type Unsubscribe } from './events';
import { clampLatitude, normalizeLongitude, type LatLon } from './geo';
import type { WWRedrawCallback, WWWorldWindow, WorldWindStatic } from './worldwind-types';

export interface CameraState {
  latitude: number;
  longitude: number;
  /** Distance from the eye to the look-at point, in metres. */
  range: number;
  /** Degrees clockwise from north. */
  heading: number;
  /** Degrees from straight down (0) towards the horizon (90). */
  tilt: number;
  roll: number;
}

export interface CameraTarget extends LatLon {
  range?: number;
  heading?: number;
  tilt?: number;
  roll?: number;
}

export interface GoToOptions {
  /** Animation length in milliseconds. `0` jumps immediately. Defaults to 3000. */
  duration?: number;
}

export const DEFAULT_GO_TO_DURATION = 3000;

const EPSILON = 1e-9;

function statesEqual(a: CameraState, b: CameraState): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < EPSILON &&
    Math.abs(a.longitude - b.longitude) < EPSILON &&
    Math.abs(a.range - b.range) < EPSILON &&
    Math.abs(a.heading - b.heading) < EPSILON &&
    Math.abs(a.tilt - b.tilt) < EPSILON &&
    Math.abs(a.roll - b.roll) < EPSILON
  );
}

/** Reads and drives the WorldWindow navigator, with animated `goTo` and change subscriptions. */
export class CameraController {
  private readonly emitter = createEmitter<CameraState>();
  private readonly redrawCallback: WWRedrawCallback;
  private last: CameraState;

  constructor(
    private readonly worldWind: WorldWindStatic,
    private readonly wwd: WWWorldWindow,
  ) {
    this.last = this.get();
    this.redrawCallback = (_wwd, stage) => {
      if (stage !== worldWind.AFTER_REDRAW || this.emitter.size === 0) return;
      const next = this.get();
      if (!statesEqual(next, this.last)) {
        this.last = next;
        this.emitter.emit(next);
      }
    };
    wwd.redrawCallbacks.push(this.redrawCallback);
  }

  /**
   * Like {@link get}, but returns the same object instance for as long as the camera has not
   * moved. Use it as an external-store snapshot (React's `useSyncExternalStore`, etc.).
   */
  snapshot(): CameraState {
    const next = this.get();
    if (!statesEqual(next, this.last)) this.last = next;
    return this.last;
  }

  get(): CameraState {
    const navigator = this.wwd.navigator;
    return {
      latitude: navigator.lookAtLocation.latitude,
      longitude: navigator.lookAtLocation.longitude,
      range: navigator.range,
      heading: navigator.heading,
      tilt: navigator.tilt,
      roll: navigator.roll,
    };
  }

  /** Applies the given fields immediately and requests a redraw. */
  set(target: Partial<CameraState>, options: { redraw?: boolean } = {}): CameraState {
    const navigator = this.wwd.navigator;
    if (target.latitude !== undefined) navigator.lookAtLocation.latitude = clampLatitude(target.latitude);
    if (target.longitude !== undefined) navigator.lookAtLocation.longitude = normalizeLongitude(target.longitude);
    if (target.range !== undefined) navigator.range = Math.max(1, target.range);
    if (target.heading !== undefined) navigator.heading = target.heading;
    if (target.tilt !== undefined) navigator.tilt = Math.max(0, Math.min(90, target.tilt));
    if (target.roll !== undefined) navigator.roll = target.roll;
    if (options.redraw !== false) this.wwd.redraw();
    return this.get();
  }

  /**
   * Flies to a location with WorldWind's GoToAnimator. Resolves with the final state when the
   * animation completes, or shortly after `duration` if the user interrupts it.
   */
  goTo(target: CameraTarget, options: GoToOptions = {}): Promise<CameraState> {
    const duration = options.duration ?? DEFAULT_GO_TO_DURATION;
    const { latitude, longitude, range, heading, tilt, roll } = target;
    if (duration <= 0) {
      return Promise.resolve(this.set({ latitude, longitude, range, heading, tilt, roll }));
    }
    return new Promise((resolve) => {
      const animator = this.wwd.goToAnimator;
      animator.travelTime = duration;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (heading !== undefined || tilt !== undefined || roll !== undefined) {
          this.set({ heading, tilt, roll });
        }
        resolve(this.get());
      };
      // WorldWind never calls the completion callback when a gesture cancels the animation.
      const timer = setTimeout(finish, duration + 250);
      const destination =
        range !== undefined
          ? new this.worldWind.Position(latitude, longitude, range)
          : new this.worldWind.Location(latitude, longitude);
      this.wwd.goTo(destination, finish);
    });
  }

  zoomBy(factor: number): CameraState {
    return this.set({ range: this.get().range * factor });
  }

  zoomIn(factor = 0.5): CameraState {
    return this.zoomBy(factor);
  }

  zoomOut(factor = 2): CameraState {
    return this.zoomBy(factor);
  }

  rotateBy(deltaHeadingDegrees: number): CameraState {
    return this.set({ heading: (this.get().heading + deltaHeadingDegrees) % 360 });
  }

  tiltBy(deltaTiltDegrees: number): CameraState {
    return this.set({ tilt: this.get().tilt + deltaTiltDegrees });
  }

  resetNorth(): CameraState {
    return this.set({ heading: 0 });
  }

  /** Heading, tilt and roll back to zero; position and range unchanged. */
  resetOrientation(): CameraState {
    return this.set({ heading: 0, tilt: 0, roll: 0 });
  }

  /** Notifies after any frame in which the camera changed (user gestures included). */
  subscribe(listener: (state: CameraState) => void): Unsubscribe {
    this.last = this.get();
    return this.emitter.on(listener);
  }

  destroy(): void {
    const index = this.wwd.redrawCallbacks.indexOf(this.redrawCallback);
    if (index !== -1) this.wwd.redrawCallbacks.splice(index, 1);
    this.emitter.clear();
  }
}
