import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeWorldWind } from '../src/testing';
import { getWorldWind, isWorldWindLoaded, loadWorldWind, setWorldWind, unwrapWorldWindModule } from '../src/worldwind';

afterEach(() => setWorldWind(null));

describe('loadWorldWind', () => {
  it('throws a helpful error before loading', () => {
    expect(isWorldWindLoaded()).toBe(false);
    expect(() => getWorldWind()).toThrow(/not loaded yet/);
  });

  it('uses a custom loader and unwraps default exports', async () => {
    const fake = createFakeWorldWind();
    const loader = vi.fn().mockResolvedValue({ default: fake });
    const [a, b] = await Promise.all([loadWorldWind({ loader }), loadWorldWind({ loader })]);
    expect(a).toBe(fake);
    expect(b).toBe(fake);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(getWorldWind()).toBe(fake);
  });

  it('recovers after a failed load', async () => {
    const loader = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(createFakeWorldWind());
    await expect(loadWorldWind({ loader })).rejects.toThrow('offline');
    await expect(loadWorldWind({ loader })).resolves.toBeTruthy();
  });

  it('rejects modules that are not WorldWind', () => {
    expect(() => unwrapWorldWindModule({})).toThrow(/does not look like NASA WorldWind/);
  });

  it('prefers an injected namespace', async () => {
    const fake = createFakeWorldWind();
    setWorldWind(fake);
    await expect(loadWorldWind({ loader: () => Promise.reject(new Error('should not run')) })).resolves.toBe(fake);
  });
});

describe('scriptLoader', () => {
  it('adds a script tag and resolves with window.WorldWind once it loads', async () => {
    const { scriptLoader, DEFAULT_WORLDWIND_SCRIPT_URL } = await import('../src/worldwind');
    const fake = createFakeWorldWind();
    const promise = scriptLoader()();
    const script = document.head.querySelector('script')!;
    expect(script.src).toBe(DEFAULT_WORLDWIND_SCRIPT_URL);
    window.WorldWind = fake;
    script.dispatchEvent(new Event('load'));
    await expect(promise).resolves.toBe(fake);
    script.remove();
    delete window.WorldWind;
  });

  it('rejects when the script fails', async () => {
    const { scriptLoader } = await import('../src/worldwind');
    const promise = scriptLoader('https://cdn.example/ww.js')();
    const script = document.head.querySelector('script[src="https://cdn.example/ww.js"]')!;
    script.dispatchEvent(new Event('error'));
    await expect(promise).rejects.toThrow(/failed to load/);
    script.remove();
  });
});
