import { effect, inject, untracked, type Signal } from '@angular/core';
import type { CameraState, GlobeController, PickResult, WWLayer } from 'worldwind-kit';
import { WwGlobeComponent } from './globe.component';

/** The enclosing `<ww-globe>`'s controller signal (null until ready). Call from an injection context. */
export function injectGlobe(): Signal<GlobeController | null> {
  return inject(WwGlobeComponent).globe;
}

/** Camera state of the enclosing globe. */
export function injectCameraState(): Signal<CameraState | null> {
  return inject(WwGlobeComponent).cameraState;
}

/** Layers of the enclosing globe, bottom to top. */
export function injectLayers(): Signal<readonly WWLayer[]> {
  return inject(WwGlobeComponent).layers;
}

/** The latest hover pick. Turns hover picking on for the lifetime of the caller. */
export function injectHoverPick(): Signal<PickResult | null> {
  const host = inject(WwGlobeComponent);
  effect((onCleanup) => {
    if (!host.globe()) return;
    const release = untracked(() => host.acquireHover());
    onCleanup(release);
  });
  return host.hoverPick;
}
