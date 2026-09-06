import type { Unsubscribe } from './events';
import type { LatLonAlt } from './geo';
import type { WWWorldWindow, WorldWindStatic } from './worldwind-types';

/**
 * Where a geographic position lands on the canvas, in CSS pixels from the top-left corner.
 * @category Picking
 */
export interface ScreenPoint {
  x: number;
  y: number;
  /** Inside the viewport and not hidden by the globe. */
  visible: boolean;
  /** On the far side of the globe from the eye (always false for flat projections). */
  behind: boolean;
}

/**
 * Projects a geographic position to canvas coordinates using the last rendered frame.
 * Returns null before the first frame or when the point cannot be projected.
 * @category Picking
 */
export function toScreen(worldWind: WorldWindStatic, wwd: WWWorldWindow, position: LatLonAlt): ScreenPoint | null {
  const dc = wwd.drawContext;
  const viewport = dc.viewport;
  if (!dc.modelviewProjection || !viewport || !viewport.width || !viewport.height) return null;
  const globe = wwd.globe;
  const point = globe.computePointFromPosition(
    position.latitude,
    position.longitude,
    position.altitude ?? 0,
    new worldWind.Vec3(0, 0, 0),
  );
  const projected = new worldWind.Vec3(0, 0, 0);
  if (!dc.project(point, projected)) return null;
  const scale = wwd.pixelScale || 1;
  const x = projected[0] / scale;
  const y = (viewport.height - projected[1]) / scale;
  let behind = false;
  if (!globe.is2D() && dc.eyePoint) {
    const normal = globe.surfaceNormalAtPoint(point[0], point[1], point[2], new worldWind.Vec3(0, 0, 0));
    const toEye = new worldWind.Vec3(dc.eyePoint[0] - point[0], dc.eyePoint[1] - point[1], dc.eyePoint[2] - point[2]);
    behind = toEye.dot(normal) < 0;
  }
  const inside = x >= 0 && y >= 0 && x <= viewport.width / scale && y <= viewport.height / scale;
  return { x, y, visible: inside && !behind, behind };
}

/**
 * Calls `listener` after every frame in which the screen position of `position` changed, and
 * once after the next frame. Used by popups and tooltips to follow the globe.
 * @category Picking
 */
export function trackScreenPosition(
  worldWind: WorldWindStatic,
  wwd: WWWorldWindow,
  position: LatLonAlt,
  listener: (point: ScreenPoint | null) => void,
): Unsubscribe {
  let last: ScreenPoint | null | undefined;
  const callback = (_wwd: WWWorldWindow, stage: string) => {
    if (stage !== worldWind.AFTER_REDRAW) return;
    const next = toScreen(worldWind, wwd, position);
    if (
      last !== undefined &&
      ((last === null && next === null) ||
        (last !== null &&
          next !== null &&
          Math.abs(last.x - next.x) < 0.01 &&
          Math.abs(last.y - next.y) < 0.01 &&
          last.visible === next.visible))
    ) {
      return;
    }
    last = next;
    listener(next);
  };
  wwd.redrawCallbacks.push(callback);
  wwd.redraw();
  return () => {
    const index = wwd.redrawCallbacks.indexOf(callback);
    if (index !== -1) wwd.redrawCallbacks.splice(index, 1);
  };
}
