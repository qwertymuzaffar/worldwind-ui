import { effect, inject, untracked, type Signal } from '@angular/core';
import type { CameraState, GlobeController, PickResult, ProjectionKind, WWLayer } from 'worldwind-kit';
import { WwGlobeComponent } from './globe.component';

/** The enclosing `<ww-globe>`'s controller signal (null until ready). Call from an injection context.
 * @category Signals
 */
export function injectGlobe(): Signal<GlobeController | null> {
  return inject(WwGlobeComponent).globe;
}

/** Camera state of the enclosing globe.
 * @example
 * ```ts
 * @Component({ selector: 'app-range', template: `Range: {{ camera()?.range | number }} m` })
 * export class RangeComponent {
 *   readonly camera = injectCameraState();
 * }
 * ```
 * @category Signals
 */
export function injectCameraState(): Signal<CameraState | null> {
  return inject(WwGlobeComponent).cameraState;
}

/** The enclosing globe's projection.
 * @category Signals
 */
export function injectProjection(): Signal<ProjectionKind> {
  return inject(WwGlobeComponent).projectionState;
}

/** Layers of the enclosing globe, bottom to top.
 * @category Signals
 */
export function injectLayers(): Signal<readonly WWLayer[]> {
  return inject(WwGlobeComponent).layers;
}

/** The latest hover pick. Turns hover picking on for the lifetime of the caller.
 * @category Signals
 */
export function injectHoverPick(): Signal<PickResult | null> {
  const host = inject(WwGlobeComponent);
  effect((onCleanup) => {
    if (!host.globe()) return;
    const release = untracked(() => host.acquireHover());
    onCleanup(release);
  });
  return host.hoverPick;
}
