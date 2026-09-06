import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlobeController } from '../src/globe';
import {
  captureScreenshot,
  captureScreenshotDataUrl,
  downloadScreenshot,
  fullscreenSupported,
  fullscreenTarget,
  isFullscreen,
  onFullscreenChange,
  toggleFullscreen,
} from '../src/screenshot';
import { createFakeWorldWind, type FakeWorldWindow } from '../src/testing';

function setup() {
  const ww = createFakeWorldWind();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const globe = new GlobeController(ww, host);
  return { globe, host, wwd: globe.wwd as unknown as FakeWorldWindow };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (document as { fullscreenElement?: unknown }).fullscreenElement;
});

describe('screenshots', () => {
  it('captures inside the redraw callback and cleans up', async () => {
    const { globe, wwd } = setup();
    const blob = new Blob(['png']);
    const calls: unknown[][] = [];
    globe.canvas.toBlob = (callback, type, quality) => {
      calls.push([type, quality]);
      callback(blob);
    };
    const before = wwd.redrawCallbacks.length;
    const pending = captureScreenshot(globe, { type: 'image/jpeg', quality: 0.8 });
    expect(wwd.redrawCallbacks).toHaveLength(before + 1);
    wwd.simulateFrame();
    expect(await pending).toBe(blob);
    expect(calls).toEqual([['image/jpeg', 0.8]]);
    expect(wwd.redrawCallbacks).toHaveLength(before);

    globe.canvas.toDataURL = () => 'data:image/png;base64,AAA';
    const url = captureScreenshotDataUrl(globe);
    wwd.simulateFrame();
    expect(await url).toBe('data:image/png;base64,AAA');

    globe.canvas.toBlob = (callback) => callback(null);
    const failing = captureScreenshot(globe);
    wwd.simulateFrame();
    await expect(failing).rejects.toThrow(/no image/);
  });

  it('downloads through a temporary link', async () => {
    const { globe, wwd } = setup();
    globe.canvas.toBlob = (callback) => callback(new Blob(['png']));
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL }));
    let download = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      download = this.download;
    });
    const pending = downloadScreenshot(globe, { filename: 'shot.png' });
    wwd.simulateFrame();
    await pending;
    expect(download).toBe('shot.png');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const auto = downloadScreenshot(globe, { type: 'image/jpeg' });
    wwd.simulateFrame();
    await auto;
    expect(download).toMatch(/^globe-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.jpg$/);
    vi.unstubAllGlobals();
  });
});

describe('fullscreen', () => {
  it('targets the globe host and reports state changes', async () => {
    const { globe, host } = setup();
    expect(fullscreenTarget(globe)).toBe(host);
    expect(isFullscreen(globe)).toBe(false);
    expect(fullscreenSupported()).toBe(typeof document.documentElement.requestFullscreen === 'function');
    if (!fullscreenSupported()) await expect(toggleFullscreen(globe)).rejects.toThrow(/not supported/);

    const seen: boolean[] = [];
    const stop = onFullscreenChange(globe, (fullscreen) => seen.push(fullscreen));
    host.requestFullscreen = vi.fn(async () => {
      Object.defineProperty(document, 'fullscreenElement', { value: host, configurable: true });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    document.exitFullscreen = vi.fn(async () => {
      Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(await toggleFullscreen(globe)).toBe(true);
    expect(isFullscreen(globe)).toBe(true);
    expect(await toggleFullscreen(globe)).toBe(false);
    expect(seen).toEqual([true, false]);
    stop();
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(seen).toHaveLength(2);
  });
});
