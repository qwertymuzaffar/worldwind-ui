import { describe, expect, it, vi } from 'vitest';
import { CameraController } from '../src/camera';
import { createFakeWorldWind } from '../src/testing';

function setup() {
  const ww = createFakeWorldWind();
  const wwd = new ww.WorldWindow(document.createElement('canvas'));
  return { ww, wwd, camera: new CameraController(ww, wwd) };
}

describe('CameraController', () => {
  it('reads and writes the navigator with clamping', () => {
    const { wwd, camera } = setup();
    expect(camera.get()).toEqual({ latitude: 30, longitude: -110, range: 10e6, heading: 0, tilt: 0, roll: 0 });
    camera.set({ latitude: 95, longitude: 200, range: -5, tilt: 120, heading: 45 });
    expect(camera.get()).toMatchObject({ latitude: 90, longitude: -160, range: 1, tilt: 90, heading: 45 });
    expect(wwd.redrawCount).toBe(1);
  });

  it('jumps when duration is 0 and animates otherwise', async () => {
    const { wwd, camera } = setup();
    await expect(camera.goTo({ latitude: 1, longitude: 2, range: 3000 }, { duration: 0 })).resolves.toMatchObject({
      latitude: 1,
      longitude: 2,
      range: 3000,
    });
    expect(wwd.goToAnimator.calls).toHaveLength(0);

    const state = await camera.goTo({ latitude: 10, longitude: 20, range: 5000, heading: 90 }, { duration: 500 });
    expect(wwd.goToAnimator.travelTime).toBe(500);
    expect(wwd.goToAnimator.calls[0]).toEqual({ latitude: 10, longitude: 20, altitude: 5000 });
    expect(state).toMatchObject({ latitude: 10, longitude: 20, range: 5000, heading: 90 });
  });

  it('keeps the current range when none is given', async () => {
    const { wwd, camera } = setup();
    await camera.goTo({ latitude: 5, longitude: 6 }, { duration: 10 });
    expect(wwd.goToAnimator.calls[0]).toEqual({ latitude: 5, longitude: 6 });
    expect(camera.get().range).toBe(10e6);
  });

  it('resolves even if WorldWind never calls back', async () => {
    vi.useFakeTimers();
    try {
      const { wwd, camera } = setup();
      wwd.goToAnimator.goTo = () => {};
      const promise = camera.goTo({ latitude: 0, longitude: 0 }, { duration: 100 });
      vi.advanceTimersByTime(400);
      await expect(promise).resolves.toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers zoom, rotate, tilt and reset helpers', () => {
    const { camera } = setup();
    expect(camera.zoomIn().range).toBe(5e6);
    expect(camera.zoomOut().range).toBe(10e6);
    expect(camera.rotateBy(370).heading).toBe(10);
    expect(camera.tiltBy(30).tilt).toBe(30);
    expect(camera.resetNorth().heading).toBe(0);
    expect(camera.resetOrientation()).toMatchObject({ heading: 0, tilt: 0, roll: 0 });
  });

  it('notifies subscribers only when a frame changed the camera', () => {
    const { wwd, camera } = setup();
    const listener = vi.fn();
    const unsubscribe = camera.subscribe(listener);

    wwd.simulateFrame();
    expect(listener).not.toHaveBeenCalled();

    wwd.navigator.range = 1234;
    wwd.simulateFrame();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ range: 1234 }));

    wwd.simulateFrame();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    wwd.navigator.range = 1;
    wwd.simulateFrame();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('detaches from the window on destroy', () => {
    const { wwd, camera } = setup();
    expect(wwd.redrawCallbacks).toHaveLength(1);
    camera.destroy();
    expect(wwd.redrawCallbacks).toHaveLength(0);
  });
});

describe('CameraController.snapshot', () => {
  it('is referentially stable until the camera moves', () => {
    const { wwd, camera } = setup();
    const a = camera.snapshot();
    expect(camera.snapshot()).toBe(a);
    wwd.navigator.heading = 12;
    const b = camera.snapshot();
    expect(b).not.toBe(a);
    expect(b.heading).toBe(12);
    expect(camera.snapshot()).toBe(b);
  });
});
