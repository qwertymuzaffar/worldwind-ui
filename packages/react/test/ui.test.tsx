import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CoordinatesReadout, GoToBox, Layer, LayerSwitcher, NavigationControls } from '../src';
import { renderInGlobe } from './helpers';

describe('UI widgets', () => {
  it('LayerSwitcher lists layers top-first, hides overlays, toggles and sets opacity', async () => {
    const { wwd } = await renderInGlobe(
      <>
        <Layer kind="blue-marble" />
        <Layer kind="osm" />
        <Layer kind="compass" />
        <LayerSwitcher />
      </>,
    );
    await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(2));
    const labels = screen.getAllByRole('checkbox').map((box) => box.parentElement?.textContent);
    expect(labels).toEqual(['OpenStreetMap', 'Blue Marble']);

    fireEvent.click(screen.getAllByRole('checkbox')[1]!);
    await waitFor(() => expect(wwd.layers[0]!.enabled).toBe(false));
    expect((screen.getAllByRole('checkbox')[1] as HTMLInputElement).checked).toBe(false);

    fireEvent.change(screen.getByLabelText('OpenStreetMap opacity'), { target: { value: '0.25' } });
    await waitFor(() => expect(wwd.layers[1]!.opacity).toBe(0.25));
  });

  it('NavigationControls zoom, reset north, tilt and fly home', async () => {
    const { wwd } = await renderInGlobe(<NavigationControls home={{ latitude: 1, longitude: 2, range: 300 }} animate={10} />, {
      view: { range: 1000, heading: 45 },
    });
    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(wwd.navigator.range).toBe(500);
    fireEvent.click(screen.getByLabelText('Zoom out'));
    expect(wwd.navigator.range).toBe(1000);
    fireEvent.click(screen.getByLabelText('Reset to north'));
    expect(wwd.navigator.heading).toBe(0);
    fireEvent.click(screen.getByLabelText('Tilt up'));
    expect(wwd.navigator.tilt).toBe(15);
    fireEvent.click(screen.getByLabelText('Home'));
    await waitFor(() => expect(wwd.navigator.lookAtLocation).toMatchObject({ latitude: 1, longitude: 2 }));
    expect(wwd.navigator.range).toBe(300);
  });

  it('GoToBox accepts coordinates and geocodes place names', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { display_name: 'Paris, France', lat: '48.85', lon: '2.35', boundingbox: ['48.8', '48.9', '2.2', '2.4'] },
        { display_name: 'Paris, Texas', lat: '33.66', lon: '-95.55' },
      ],
    });
    const onNavigate = vi.fn();
    const { wwd } = await renderInGlobe(<GoToBox geocoding={{ fetch: fetchMock }} duration={0} onNavigate={onNavigate} />);
    const input = screen.getByLabelText('Go to location');

    fireEvent.change(input, { target: { value: '10, 20' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(wwd.navigator.lookAtLocation).toMatchObject({ latitude: 10, longitude: 20 }));
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'Paris' } });
    fireEvent.submit(input.closest('form')!);
    await screen.findByText('Paris, Texas');
    fireEvent.click(screen.getByText('Paris, France'));
    await waitFor(() => expect(wwd.navigator.lookAtLocation).toMatchObject({ latitude: 48.85, longitude: 2.35 }));
    expect(onNavigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ latitude: 48.85 }),
      expect.objectContaining({ displayName: 'Paris, France' }),
    );
    expect(screen.queryByText('Paris, Texas')).toBeNull();
  });

  it('CoordinatesReadout follows the mouse', async () => {
    const { wwd } = await renderInGlobe(<CoordinatesReadout />, { view: { range: 2_500_000 } });
    expect(screen.getByText('Move the mouse over the globe')).toBeTruthy();
    expect(screen.getByText('2,500 km')).toBeTruthy();

    wwd.setPickResult([{ isTerrain: true, position: { latitude: 40.7128, longitude: -74.006, altitude: 12 } }]);
    act(() => {
      wwd.dispatch('mousemove', { clientX: 1, clientY: 1 });
    });
    await screen.findByText('40.7128°N, 74.0060°W');
    expect(screen.getByText('12 m')).toBeTruthy();
  });
});
