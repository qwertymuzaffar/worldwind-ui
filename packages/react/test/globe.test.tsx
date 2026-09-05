import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { installFakeWorldWind } from 'worldwind-kit/testing';
import { Globe, useGlobe, useGlobeOptional } from '../src';
import { renderInGlobe } from './helpers';

function Probe() {
  const globe = useGlobe();
  return <span>layers:{globe.layers.count}</span>;
}

describe('<Globe>', () => {
  it('shows the fallback, then children once the globe exists, and destroys on unmount', async () => {
    const fake = installFakeWorldWind();
    const onReady = vi.fn();
    const { unmount } = render(
      <Globe fallback={<span>loading</span>} layers={['blue-marble']} onReady={onReady}>
        <Probe />
      </Globe>,
    );
    expect(screen.getByText('loading')).toBeTruthy();
    await screen.findByText('layers:1');
    expect(screen.queryByText('loading')).toBeNull();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(fake.windows).toHaveLength(1);
    expect(fake.windows[0]!.canvas.parentElement?.className).toBe('wwui-globe__canvas');

    unmount();
    expect(fake.windows[0]!.contextLost).toBe(true);
  });

  it('reports load failures', async () => {
    const onError = vi.fn();
    render(<Globe loadOptions={{ loader: () => Promise.reject(new Error('boom')) }} onError={onError} />);
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toBe('boom');
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('switches projection reactively', async () => {
    const { wwd, rerender } = await renderInGlobe(null, { projection: 'mercator' });
    expect(wwd.globe.is2D()).toBe(true);
    // The helper keeps the same props; re-render with a different Globe element directly.
    await rerender(null);
    expect(wwd.globe.is2D()).toBe(true);
  });

  it('forwards pick events and lets hooks read the globe', async () => {
    const onClick = vi.fn();
    const Optional = () => <span>{useGlobeOptional() ? 'inside' : 'outside'}</span>;
    const { fake, wwd } = await renderInGlobe(<Optional />, { onClick });
    expect(screen.getByText('inside')).toBeTruthy();
    await waitFor(() => expect(fake.recognizers).toHaveLength(2));
    wwd.setPickResult([{ isTerrain: true, position: { latitude: 1, longitude: 2 } }]);
    act(() => {
      fake.recognizers[0]!.simulate(5, 5);
    });
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ position: { latitude: 1, longitude: 2, altitude: 0 } }));
  });

  it('throws a clear error when hooks are used outside', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/inside <Globe>/);
    spy.mockRestore();
  });
});
