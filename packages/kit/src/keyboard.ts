import type { Unsubscribe } from './events';
import { EARTH_RADIUS_METERS } from './geo';
import type { GlobeController } from './globe';

/**
 * @category Globe
 */
export interface KeyboardNavigationOptions {
  /** Fraction of the current range the arrow keys pan per press. Default 0.1. */
  panFraction?: number;
  /** Range multiplier for `-`; `+` divides by it. Default 1.5. */
  zoomFactor?: number;
  /** Degrees of heading per Shift+Left/Right press. Default 10. */
  rotateStep?: number;
  /** Degrees of tilt per Shift+Up/Down or PageUp/PageDown press. Default 5. */
  tiltStep?: number;
  /** Make the canvas focusable with Tab (`tabindex="0"`). Default true. */
  focusable?: boolean;
  /** Accessible name for the canvas. */
  label?: string;
}

const DEFAULT_LABEL =
  'Interactive globe. Arrow keys pan, plus and minus zoom, Shift with the arrow keys rotates and tilts, Home resets the orientation.';

const DEG_PER_RAD = 180 / Math.PI;
const RAD_PER_DEG = Math.PI / 180;

/**
 * Applies one key press to the camera. Returns true when the key was handled.
 * Arrow keys pan relative to the current heading; `+`/`-` zoom; Shift+arrows rotate and tilt;
 * PageUp/PageDown tilt; Home resets heading, tilt and roll.
 * @category Globe
 */
export function handleNavigationKey(
  globe: GlobeController,
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'>,
  options: KeyboardNavigationOptions = {},
): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey) return false;
  const panFraction = options.panFraction ?? 0.1;
  const zoomFactor = options.zoomFactor ?? 1.5;
  const rotateStep = options.rotateStep ?? 10;
  const tiltStep = options.tiltStep ?? 5;
  const camera = globe.camera;

  const pan = (screenDirectionDegrees: number) => {
    const state = camera.get();
    const bearing = (state.heading + screenDirectionDegrees) * RAD_PER_DEG;
    const step = (state.range * panFraction) / EARTH_RADIUS_METERS; // radians of arc
    const latitude = state.latitude + step * Math.cos(bearing) * DEG_PER_RAD;
    const cosLat = Math.max(Math.cos(state.latitude * RAD_PER_DEG), 0.01);
    const longitude = state.longitude + ((step * Math.sin(bearing)) / cosLat) * DEG_PER_RAD;
    camera.set({ latitude, longitude });
  };

  switch (event.key) {
    case 'ArrowUp':
      if (event.shiftKey) camera.tiltBy(-tiltStep);
      else pan(0);
      return true;
    case 'ArrowDown':
      if (event.shiftKey) camera.tiltBy(tiltStep);
      else pan(180);
      return true;
    case 'ArrowLeft':
      if (event.shiftKey) camera.rotateBy(-rotateStep);
      else pan(270);
      return true;
    case 'ArrowRight':
      if (event.shiftKey) camera.rotateBy(rotateStep);
      else pan(90);
      return true;
    case '+':
    case '=':
      camera.zoomBy(1 / zoomFactor);
      return true;
    case '-':
    case '_':
      camera.zoomBy(zoomFactor);
      return true;
    case 'PageUp':
      camera.tiltBy(tiltStep);
      return true;
    case 'PageDown':
      camera.tiltBy(-tiltStep);
      return true;
    case 'Home':
      camera.resetOrientation();
      return true;
    default:
      return false;
  }
}

/**
 * Makes the globe's canvas keyboard-navigable: focusable, announced as an application, and
 * driven by {@link handleNavigationKey}. `GlobeController` attaches this by default; pass
 * `keyboard: false` in the globe options to opt out, or an options object to tune it.
 * @category Globe
 */
export function attachKeyboardNavigation(globe: GlobeController, options: KeyboardNavigationOptions = {}): Unsubscribe {
  const canvas = globe.canvas;
  if (options.focusable !== false && !canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;
  if (!canvas.hasAttribute('role')) canvas.setAttribute('role', 'application');
  if (!canvas.hasAttribute('aria-label')) canvas.setAttribute('aria-label', options.label ?? DEFAULT_LABEL);
  const listener = (event: KeyboardEvent) => {
    if (handleNavigationKey(globe, event, options)) event.preventDefault();
  };
  canvas.addEventListener('keydown', listener);
  return () => canvas.removeEventListener('keydown', listener);
}
