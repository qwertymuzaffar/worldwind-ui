import { act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FakePath, FakePlacemark, FakeRenderableLayer } from 'worldwind-kit/testing';
import { Path, Placemark, Polygon, RenderableLayer, SurfaceCircle } from '../src';
import { renderInGlobe } from './helpers';

const nyc = { latitude: 40.7, longitude: -74 };

describe('shape components', () => {
  it('creates a placemark with a default pushpin and updates it in place', async () => {
    const { wwd, rerender } = await renderInGlobe(
      <RenderableLayer>
        <Placemark position={nyc} label="NYC" />
      </RenderableLayer>,
    );
    const layer = () => wwd.layers[0] as FakeRenderableLayer;
    await waitFor(() => expect(layer().renderables).toHaveLength(1));
    const placemark = layer().renderables[0] as FakePlacemark;
    expect(placemark.attributes.imageSource).toMatch(/^https:\/\/unpkg\.com\/.*\/images\/pushpins\/plain-red\.png$/);
    expect(placemark.attributes.imageOffset).toMatchObject({ x: 0.3, y: 0 });
    expect(placemark.attributes.labelAttributes.offset).toMatchObject({ x: 0.5, y: 1 });
    expect(placemark.label).toBe('NYC');

    const redraws = wwd.redrawCount;
    await rerender(
      <RenderableLayer>
        <Placemark position={{ latitude: 1, longitude: 2 }} label="NYC" pushpin="blue" />
      </RenderableLayer>,
    );
    await waitFor(() => expect(placemark.position).toMatchObject({ latitude: 1, longitude: 2 }));
    expect(layer().renderables[0]).toBe(placemark);
    expect(placemark.attributes.imageSource).toContain('plain-blue');
    expect(wwd.redrawCount).toBeGreaterThan(redraws);

    await rerender(<RenderableLayer />);
    await waitFor(() => expect(layer().renderables).toHaveLength(0));
  });

  it('does not touch WorldWind when props are structurally equal', async () => {
    const { wwd, rerender } = await renderInGlobe(
      <RenderableLayer>
        <Placemark position={{ ...nyc }} pushpin={false} />
      </RenderableLayer>,
    );
    await waitFor(() => expect((wwd.layers[0] as FakeRenderableLayer).renderables).toHaveLength(1));
    const placemark = (wwd.layers[0] as FakeRenderableLayer).renderables[0] as FakePlacemark;
    const position = placemark.position;
    await rerender(
      <RenderableLayer>
        <Placemark position={{ ...nyc }} pushpin={false} />
      </RenderableLayer>,
    );
    expect(placemark.position).toBe(position);
  });

  it('routes clicks to the picked shape and highlights on hover', async () => {
    const onClick = vi.fn();
    const onEnter = vi.fn();
    const onLeave = vi.fn();
    const { fake, wwd } = await renderInGlobe(
      <RenderableLayer>
        <Placemark position={nyc} onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave} highlightOnHover />
        <Path positions={[nyc, { latitude: 1, longitude: 1 }]} onClick={() => {}} />
      </RenderableLayer>,
    );
    const layer = wwd.layers[0] as FakeRenderableLayer;
    await waitFor(() => expect(layer.renderables).toHaveLength(2));
    const [placemark, path] = layer.renderables as [FakePlacemark, FakePath];
    // One click recognizer pair for both shapes, one mousemove listener for hover.
    await waitFor(() => expect(fake.recognizers.filter((r) => r.kind === 'click')).toHaveLength(1));
    expect(wwd.listenerCount('mousemove')).toBe(1);

    wwd.setPickResult([{ isTerrain: true, position: nyc }, { userObject: path }]);
    act(() => {
      fake.recognizers[0]!.simulate(1, 1);
    });
    expect(onClick).not.toHaveBeenCalled();

    wwd.setPickResult([{ isTerrain: true, position: nyc }, { userObject: placemark, isOnTop: true }]);
    act(() => {
      fake.recognizers[0]!.simulate(1, 1);
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]![0].top.object).toBe(placemark);

    act(() => {
      wwd.dispatch('mousemove', { clientX: 1, clientY: 1 });
    });
    await waitFor(() => expect(onEnter).toHaveBeenCalledTimes(1));
    expect(placemark.highlighted).toBe(true);

    wwd.setPickResult([{ isTerrain: true, position: nyc }]);
    act(() => {
      wwd.dispatch('mousemove', { clientX: 2, clientY: 2 });
    });
    await waitFor(() => expect(onLeave).toHaveBeenCalledTimes(1));
    expect(placemark.highlighted).toBe(false);
  });

  it('creates polygons and surface circles', async () => {
    const { wwd } = await renderInGlobe(
      <RenderableLayer>
        <Polygon boundaries={[nyc, { latitude: 41, longitude: -74 }, { latitude: 41, longitude: -73 }]} fill="#ff000080" extrude />
        <SurfaceCircle center={nyc} radius={1000} stroke="cyan" />
      </RenderableLayer>,
    );
    const layer = wwd.layers[0] as FakeRenderableLayer;
    await waitFor(() => expect(layer.renderables).toHaveLength(2));
    expect(layer.renderables[0]).toMatchObject({ extrude: true });
    expect(layer.renderables[1]).toMatchObject({ radius: 1000 });
  });
});
