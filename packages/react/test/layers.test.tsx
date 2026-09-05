import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FakeWmsLayer } from 'worldwind-kit/testing';
import { CustomLayer, Layer, RenderableLayer, WmsLayer, useLayers } from '../src';
import { renderInGlobe } from './helpers';

function Names() {
  const layers = useLayers();
  return <span data-testid="names">{layers.map((l) => l.displayName).join(',')}</span>;
}

describe('layer components', () => {
  it('adds, updates and removes a built-in layer', async () => {
    const { wwd, rerender } = await renderInGlobe(
      <>
        <Layer kind="osm" opacity={0.4} />
        <Names />
      </>,
    );
    await waitFor(() => expect(wwd.layers).toHaveLength(1));
    expect(wwd.layers[0]!.opacity).toBe(0.4);
    expect(screen.getByTestId('names').textContent).toBe('OpenStreetMap');

    await rerender(
      <>
        <Layer kind="osm" opacity={0.9} enabled={false} />
        <Names />
      </>,
    );
    await waitFor(() => expect(wwd.layers[0]!.opacity).toBe(0.9));
    expect(wwd.layers[0]!.enabled).toBe(false);

    await rerender(<Names />);
    await waitFor(() => expect(wwd.layers).toHaveLength(0));
    await waitFor(() => expect(screen.getByTestId('names').textContent).toBe(''));
  });

  it('recreates a layer when its kind changes and honours index', async () => {
    const { wwd, rerender } = await renderInGlobe(
      <>
        <Layer kind="blue-marble" />
        <Layer kind="atmosphere" />
      </>,
    );
    await waitFor(() => expect(wwd.layers).toHaveLength(2));
    await rerender(
      <>
        <Layer kind="blue-marble" />
        <Layer kind="star-field" index={0} />
      </>,
    );
    await waitFor(() => expect(wwd.layers.map((l) => l.displayName)).toEqual(['StarField', 'Blue Marble']));
  });

  it('adds WMS, renderable and custom layers', async () => {
    const { wwd, fake } = await renderInGlobe(
      <>
        <WmsLayer service="https://wms" layerNames="a" displayName="Weather" numLevels={5} />
        <RenderableLayer name="Pins" pickEnabled={false} />
        <CustomLayer create={(globe) => new globe.worldWind.Layer('Custom')}>{(layer) => <i>{layer.displayName}</i>}</CustomLayer>
      </>,
    );
    await waitFor(() => expect(wwd.layers).toHaveLength(3));
    const wms = wwd.layers[0] as FakeWmsLayer;
    expect(wms.config).toMatchObject({ service: 'https://wms', layerNames: 'a', numLevels: 5, title: 'Weather' });
    expect(wwd.layers[1]).toBeInstanceOf(fake.RenderableLayer);
    expect(wwd.layers[1]!.pickEnabled).toBe(false);
    expect(screen.getByText('Custom')).toBeTruthy();
  });
});
