import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClusterLayer, DrawTool, NavigationControls, useDrawTool, type Cluster, type DrawFeature } from '../src';
import { renderInGlobe } from './helpers';

describe('DrawTool widget', () => {
  it('draws from clicks, reports features, finishes and clears', async () => {
    const onChange = vi.fn();
    const { wwd } = await renderInGlobe(<DrawTool onChange={onChange} />);
    await waitFor(() => expect(wwd.layers.map((layer) => layer.displayName)).toContain('Drawings'));
    expect(screen.getByText('Pick a shape, or click a drawing to edit it')).toBeTruthy();
    expect(onChange).toHaveBeenLastCalledWith([]);

    fireEvent.click(screen.getByRole('button', { name: 'Polygon' }));
    await screen.findByText('Click the globe to start');
    expect(screen.getByRole('button', { name: 'Polygon' }).getAttribute('aria-pressed')).toBe('true');
    const click = (latitude: number, longitude: number) => {
      wwd.setPickResult([{ isTerrain: true, position: { latitude, longitude } }]);
      act(() => {
        wwd.click(1, 1);
      });
    };
    click(10, 10);
    click(11, 11);
    await screen.findByText('Click to add points, double-click or Enter to finish');
    expect((screen.getByRole('button', { name: 'Finish' }) as HTMLButtonElement).disabled).toBe(true);
    click(12, 9);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Finish' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ type: 'polygon' })]));
    expect(screen.getByText('1')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Polygon' })); // stop drawing
    await screen.findByText(/Selected polygon/);
    fireEvent.click(screen.getByRole('button', { name: 'Delete selection' }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([]));
    expect((screen.getByRole('button', { name: 'Clear drawings' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('exposes the tool through the hook', async () => {
    let seen: DrawFeature[] = [];
    function Probe() {
      const { state, add, toGeoJson } = useDrawTool({ layerName: 'Sketch' });
      seen = state.features as DrawFeature[];
      return (
        <button type="button" onClick={() => add({ type: 'point', positions: [{ latitude: 1, longitude: 2 }] })}>
          add {toGeoJson().features.length}
        </button>
      );
    }
    const { wwd } = await renderInGlobe(<Probe />);
    await waitFor(() => expect(wwd.layers.map((layer) => layer.displayName)).toContain('Sketch'));
    fireEvent.click(await screen.findByText('add 0'));
    await screen.findByText('add 1');
    expect(seen).toHaveLength(1);
  });
});

describe('ClusterLayer component', () => {
  // Two neighbours well inside one grid cell at the initial zoom, and one far away.
  const items = [
    { latitude: 1.0, longitude: 1.0, name: 'a' },
    { latitude: 1.2, longitude: 1.2, name: 'b' },
    { latitude: 50, longitude: 50, name: 'far' },
  ];

  it('clusters items, reacts to item changes, and reports clicks', async () => {
    const onClusterClick = vi.fn();
    const onItemClick = vi.fn();
    const { wwd, rerender } = await renderInGlobe(
      <ClusterLayer items={items} name="Stations" onClusterClick={onClusterClick} onItemClick={onItemClick} opacity={0.5} />,
      { view: { range: 10_000_000 } },
    );
    const layer = await waitFor(() => {
      const found = wwd.layers.find((l) => l.displayName === 'Stations');
      expect(found).toBeTruthy();
      return found!;
    });
    await waitFor(() => expect((layer as unknown as { renderables: unknown[] }).renderables).toHaveLength(2));
    expect(layer.opacity).toBe(0.5);
    const [marker, single] = (layer as unknown as { renderables: unknown[] }).renderables;

    wwd.setPickResult([{ userObject: marker, position: { latitude: 1.1, longitude: 1.1 } }, { isTerrain: true, position: { latitude: 1.1, longitude: 1.1 } }]);
    act(() => {
      wwd.click(1, 1);
    });
    expect(onClusterClick).toHaveBeenCalledTimes(1);
    expect((onClusterClick.mock.calls[0]![0] as Cluster<unknown>).count).toBe(2);
    wwd.setPickResult([{ userObject: single, position: { latitude: 50, longitude: 50 } }, { isTerrain: true, position: { latitude: 50, longitude: 50 } }]);
    act(() => {
      wwd.click(1, 1);
    });
    expect(onItemClick).toHaveBeenCalledWith(items[2], expect.anything());

    await rerender(<ClusterLayer items={items.slice(2)} name="Stations" onClusterClick={onClusterClick} onItemClick={onItemClick} opacity={0.5} />);
    await waitFor(() => expect((layer as unknown as { renderables: unknown[] }).renderables).toHaveLength(1));
  });
});

describe('NavigationControls extras', () => {
  it('offers fullscreen and screenshot buttons', async () => {
    const { wwd } = await renderInGlobe(<NavigationControls fullscreen screenshot={{ filename: 'globe.png' }} />);
    const full = screen.getByRole('button', { name: 'Fullscreen' });
    expect(full.getAttribute('aria-pressed')).toBe('false');
    const target = wwd.canvas.parentElement!;
    target.requestFullscreen = vi.fn(async () => {
      Object.defineProperty(document, 'fullscreenElement', { value: target, configurable: true });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    fireEvent.click(full);
    await screen.findByRole('button', { name: 'Exit fullscreen' });
    delete (document as { fullscreenElement?: unknown }).fullscreenElement;

    let download = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      download = this.download;
    });
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} }));
    wwd.canvas.toBlob = (callback) => callback(new Blob(['png']));
    fireEvent.click(screen.getByRole('button', { name: 'Save screenshot' }));
    act(() => wwd.simulateFrame());
    await waitFor(() => expect(download).toBe('globe.png'));
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
