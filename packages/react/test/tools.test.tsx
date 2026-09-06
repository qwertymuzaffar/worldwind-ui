import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MeasureTool, ProjectionSwitcher } from '../src';
import { renderInGlobe } from './helpers';

const newYork = { latitude: 40.7128, longitude: -74.006 };
const london = { latitude: 51.5074, longitude: -0.1278 };
const paris = { latitude: 48.8566, longitude: 2.3522 };

describe('ProjectionSwitcher', () => {
  it('switches the globe projection and reflects external changes', async () => {
    const { wwd, fake } = await renderInGlobe(<ProjectionSwitcher projections={['3d', 'mercator']} labels={{ '3d': 'Globe' }} />);
    const globeButton = screen.getByRole('button', { name: 'Globe' });
    const mercator = screen.getByRole('button', { name: 'Mercator' });
    expect(globeButton.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(mercator);
    expect(wwd.globe.is2D()).toBe(true);
    await waitFor(() => expect(mercator.getAttribute('aria-pressed')).toBe('true'));
    expect(fake.windows[0]!.globe.projection).toBeTruthy();
  });
});

describe('MeasureTool widget', () => {
  it('measures clicks on the globe and shows length and area', async () => {
    // The globe's own onClick is registered first; the tool must still receive clicks.
    const { wwd } = await renderInGlobe(<MeasureTool />, { onClick: () => {} });
    const click = (point: { latitude: number; longitude: number }) => {
      wwd.setPickResult([{ isTerrain: true, position: point }]);
      act(() => {
        expect(wwd.click(1, 1).length).toBeGreaterThan(0);
      });
    };
    await waitFor(() => expect(wwd.layers.map((l) => l.displayName)).toContain('Measurement'));
    expect(screen.getByText('Press Measure, then click the globe')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Measure' }));
    await screen.findByText('Click the globe to add points');
    click(newYork);
    click(london);
    await screen.findByText('5,576 km');
    expect(screen.queryByText(/Area/)).toBeNull();

    click(paris);
    await waitFor(() => expect(screen.getByText(/km²/)).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Undo last point'));
    await waitFor(() => expect(screen.queryByText(/km²/)).toBeNull());
    fireEvent.click(screen.getByLabelText('Clear measurement'));
    await waitFor(() => expect((screen.getByLabelText('Clear measurement') as HTMLButtonElement).disabled).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    await screen.findByText('Press Measure, then click the globe');
  });
});
