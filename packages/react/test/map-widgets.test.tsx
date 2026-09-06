import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Attribution, Compass, Layer, Legend, RenderableLayer, ScaleBar, TimeSlider, WmsLayer, parseTimeDimension, type GlobeController } from '../src';
import type { FakeWmsLayer } from 'worldwind-kit/testing';
import { renderInGlobe } from './helpers';

describe('ScaleBar', () => {
  it('shows a round distance and follows the zoom', async () => {
    const { wwd } = await renderInGlobe(<ScaleBar />, { view: { range: 10_000_000 } });
    // The scale arrives from an effect, so the first assertion has to wait for it.
    await screen.findByLabelText('Scale: 1,000 km');
    const bar = document.querySelector<HTMLElement>('.wwui-scale__bar')!;
    expect(bar.style.width).toBe('100px');
    act(() => {
      wwd.navigator.range = 1_000_000;
      wwd.simulateFrame();
    });
    await screen.findByLabelText('Scale: 100 km');
    expect(bar.style.width).toBe('100px');
  });

  it('supports other units and widths', async () => {
    await renderInGlobe(<ScaleBar units="imperial" maxWidth={200} />, { view: { range: 1_000_000 } });
    // 1000 m/px * 200 px = 200 km = 124 mi -> 100 mi
    await screen.findByLabelText('Scale: 100 mi');
    expect(document.querySelector<HTMLElement>('.wwui-scale')!.style.width).toBe('200px');
  });
});

describe('Compass', () => {
  it('turns with the heading and resets north on click', async () => {
    const onClick = vi.fn();
    const { wwd } = await renderInGlobe(<Compass onClick={onClick} />, { view: { heading: 90 } });
    const button = screen.getByRole('button', { name: 'Compass, heading 90 degrees. Reset to north' });
    expect(button.getAttribute('data-heading')).toBe('90');
    expect(document.querySelector<SVGElement>('.wwui-compass__rose')!.style.transform).toBe('rotate(-90deg)');

    fireEvent.click(button);
    expect(wwd.navigator.heading).toBe(0);
    expect(onClick).toHaveBeenCalledWith(90);
    act(() => wwd.simulateFrame());
    await screen.findByRole('button', { name: 'Compass, heading 0 degrees. Reset to north' });
    expect(document.querySelector<SVGElement>('.wwui-compass__rose')!.style.transform).toBe('rotate(0deg)');
  });

  it('can leave the heading alone', async () => {
    const { wwd } = await renderInGlobe(<Compass resetOnClick={false} />, { view: { heading: -30 } });
    fireEvent.click(screen.getByRole('button', { name: 'Compass, heading 330 degrees. Reset to north' }));
    expect(wwd.navigator.heading).toBe(-30);
  });
});

describe('Attribution', () => {
  it('credits the enabled layers once each, plus extras, as links, and follows toggles', async () => {
    let globe: GlobeController | null = null;
    const { wwd } = await renderInGlobe(
      <>
        <Layer kind="blue-marble" />
        <Layer kind="blue-marble-landsat" />
        <Layer kind="osm" enabled={false} />
        <RenderableLayer name="Mine" attribution="Data: ACME" />
        <Attribution extra={['Data: ACME', { text: 'Made with worldwind-ui', url: 'https://example.org' }]} />
      </>,
      { onReady: (ready) => void (globe = ready) },
    );
    const strip = await screen.findByRole('contentinfo', { name: 'Map credits' });
    expect(strip.textContent).toBe('Imagery: NASA · Data: ACME · Made with worldwind-ui');
    expect(screen.getByRole('link', { name: 'Imagery: NASA' }).getAttribute('href')).toBe('https://worldwind.arc.nasa.gov/');
    expect(screen.getByRole('link', { name: 'Made with worldwind-ui' }).getAttribute('target')).toBe('_blank');

    const osm = wwd.layers.find((layer) => layer.displayName === 'OpenStreetMap')!;
    act(() => globe!.layers.setEnabled(osm, true));
    await waitFor(() => expect(strip.textContent).toContain('© OpenStreetMap contributors'));
  });

  it('renders nothing without credits', async () => {
    await renderInGlobe(
      <>
        <Layer kind="osm" enabled={false} />
        <Attribution />
      </>,
    );
    expect(document.querySelector('.wwui-attribution')).toBeNull();
  });
});

describe('Legend', () => {
  it('lists layers with legends and hides when they are switched off', async () => {
    await renderInGlobe(
      <>
        <RenderableLayer name="Airports" legend="https://x/airports.png" />
        <RenderableLayer name="Plain" />
        <Legend />
      </>,
    );
    const image = (await screen.findByAltText('Airports legend')) as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('https://x/airports.png');
    expect(screen.getByText('Airports')).toBeTruthy();
    expect(screen.queryByText('Plain')).toBeNull();
  });
});

describe('TimeSlider', () => {
  const dimension = parseTimeDimension('2024-01-01/2024-01-05/P1D')!;

  it('drives time-enabled layers, reports changes and plays', async () => {
    const onChange = vi.fn();
    const { wwd } = await renderInGlobe(
      <>
        <WmsLayer service="https://wms.example" layerNames="radar" timeDimension={dimension} />
        <TimeSlider onChange={onChange} playInterval={40} loop={false} />
      </>,
    );
    const slider = (await screen.findByLabelText('Time')) as HTMLInputElement;
    expect(slider.max).toBe('4');
    expect(slider.value).toBe('4');
    expect(screen.getByText('2024-01-05')).toBeTruthy();
    const layer = wwd.layers.find((l) => l.displayName === 'radar') as FakeWmsLayer;
    await waitFor(() => expect(layer.timeString).toBe('2024-01-05'));
    expect(layer.urlBuilder.timeString).toBe('2024-01-05');

    fireEvent.change(slider, { target: { value: '1' } });
    await screen.findByText('2024-01-02');
    expect(layer.timeString).toBe('2024-01-02');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0].toISOString()).toBe('2024-01-02T00:00:00.000Z');

    // Play from the second instant to the end without looping, then stop by itself.
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    await screen.findByText('2024-01-05');
    await screen.findByRole('button', { name: 'Play' });
    expect(layer.timeString).toBe('2024-01-05');
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it('accepts an explicit range and shows idle text without one', async () => {
    const { rerender } = await renderInGlobe(<TimeSlider />);
    expect(screen.getByText('No time-enabled layers')).toBeTruthy();
    await rerender(<TimeSlider start="2024-03-01" end="2024-03-03T12:00:00Z" step={12 * 3_600_000} defaultValue={new Date('2024-03-02T00:00:00Z')} />);
    const slider = (await screen.findByLabelText('Time')) as HTMLInputElement;
    expect(slider.max).toBe('5');
    expect(slider.value).toBe('2');
    expect(screen.getByText('2024-03-02 00:00 UTC')).toBeTruthy();
  });
});
