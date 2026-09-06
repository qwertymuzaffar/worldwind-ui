import type { Unsubscribe } from './events';
import type { GlobeController } from './globe';

/** @category Tools */
export interface ScreenshotOptions {
  /** `image/png` (default), `image/jpeg` or `image/webp`. */
  type?: string;
  /** JPEG or WebP quality, 0..1. */
  quality?: number;
}

/**
 * Renders a frame and captures the canvas as an image. WebGL clears its buffer after each
 * frame, so the capture happens inside WorldWind's redraw callback.
 * @category Tools
 */
export function captureScreenshot(globe: GlobeController, options: ScreenshotOptions = {}): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { worldWind, wwd, canvas } = globe;
    const callback = (_wwd: unknown, stage: string) => {
      if (stage !== worldWind.AFTER_REDRAW) return;
      const index = wwd.redrawCallbacks.indexOf(callback);
      if (index !== -1) wwd.redrawCallbacks.splice(index, 1);
      try {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('worldwind-kit: the canvas produced no image'))),
          options.type ?? 'image/png',
          options.quality,
        );
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };
    wwd.redrawCallbacks.push(callback);
    wwd.redraw();
  });
}

/** Like {@link captureScreenshot}, as a data URL.
 * @category Tools
 */
export function captureScreenshotDataUrl(globe: GlobeController, options: ScreenshotOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const { worldWind, wwd, canvas } = globe;
    const callback = (_wwd: unknown, stage: string) => {
      if (stage !== worldWind.AFTER_REDRAW) return;
      const index = wwd.redrawCallbacks.indexOf(callback);
      if (index !== -1) wwd.redrawCallbacks.splice(index, 1);
      try {
        resolve(canvas.toDataURL(options.type ?? 'image/png', options.quality));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };
    wwd.redrawCallbacks.push(callback);
    wwd.redraw();
  });
}

/** @category Tools */
export interface DownloadScreenshotOptions extends ScreenshotOptions {
  /** Defaults to `globe-<timestamp>.<ext>`. */
  filename?: string;
}

const EXTENSIONS: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/** Captures the globe and offers it as a file download.
 * @category Tools
 */
export async function downloadScreenshot(globe: GlobeController, options: DownloadScreenshotOptions = {}): Promise<Blob> {
  const blob = await captureScreenshot(globe, options);
  const type = options.type ?? 'image/png';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = options.filename ?? `globe-${stamp}.${EXTENSIONS[type] ?? 'png'}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return blob;
}

/** The element that goes fullscreen: the globe's host, so overlays and widgets come along.
 * @category Tools
 */
export function fullscreenTarget(globe: GlobeController): HTMLElement {
  return globe.canvas.parentElement ?? globe.canvas;
}

/** @category Tools */
export function isFullscreen(globe: GlobeController): boolean {
  if (typeof document === 'undefined') return false;
  const current = document.fullscreenElement;
  return current !== null && current !== undefined && current.contains(fullscreenTarget(globe));
}

/** @category Tools */
export function fullscreenSupported(): boolean {
  return typeof document !== 'undefined' && typeof document.documentElement.requestFullscreen === 'function';
}

/** Enters or leaves fullscreen for the globe. Resolves with the new state.
 * @category Tools
 */
export async function toggleFullscreen(globe: GlobeController): Promise<boolean> {
  if (isFullscreen(globe)) {
    await document.exitFullscreen();
    return false;
  }
  const target = fullscreenTarget(globe);
  if (typeof target.requestFullscreen !== 'function') throw new Error('worldwind-kit: fullscreen is not supported here');
  await target.requestFullscreen();
  return true;
}

/** Notifies when the globe enters or leaves fullscreen.
 * @category Tools
 */
export function onFullscreenChange(globe: GlobeController, listener: (fullscreen: boolean) => void): Unsubscribe {
  if (typeof document === 'undefined') return () => {};
  const handler = () => listener(isFullscreen(globe));
  document.addEventListener('fullscreenchange', handler);
  return () => document.removeEventListener('fullscreenchange', handler);
}
