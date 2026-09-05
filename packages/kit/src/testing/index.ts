import { setWorldWind } from '../worldwind';
import { createFakeWorldWind, type FakeWorldWind } from './fake-worldwind';

export * from './fake-worldwind';

/**
 * Creates a fake WorldWind and registers it as the loaded WorldWind, so `loadWorldWind()` and
 * `GlobeController.create()` resolve to it without WebGL. Returns the fake for assertions.
 */
export function installFakeWorldWind(): FakeWorldWind {
  const fake = createFakeWorldWind();
  setWorldWind(fake);
  return fake;
}

/** Removes any installed (fake or real) WorldWind so the next load starts fresh. */
export function uninstallWorldWind(): void {
  setWorldWind(null);
}
