import { describe, expect, it } from 'vitest';
import { DrawTool, type DrawState } from '../src/draw';
import { GlobeController } from '../src/globe';
import { createFakeWorldWind, type FakeWorldWindow } from '../src/testing';

const a = { latitude: 10, longitude: 20 };
const b = { latitude: 11, longitude: 21 };
const c = { latitude: 12, longitude: 19 };
const d = { latitude: 13, longitude: 22 };

/** The line or polygon renderable of a feature (as opposed to its handles). */
function body0(tool: DrawTool, id: string): unknown {
  return tool.layer.renderables.find((r) => tool.featureAt(r)?.id === id && !('attributes' in (r as object) && 'position' in (r as object)));
}

function setup(options = {}) {
  const ww = createFakeWorldWind();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const globe = new GlobeController(ww, host);
  const wwd = globe.wwd as unknown as FakeWorldWindow;
  const tool = new DrawTool(globe, options);
  const terrain = (position: { latitude: number; longitude: number }) => wwd.setPickResult([{ isTerrain: true, position }]);
  const click = (position: { latitude: number; longitude: number }) => {
    terrain(position);
    wwd.click(10, 10);
  };
  return { ww, globe, wwd, tool, host, terrain, click };
}

describe('DrawTool', () => {
  it('owns a pickable layer and starts idle', () => {
    const { tool, wwd } = setup();
    expect(wwd.layers.map((layer) => layer.displayName)).toContain('Drawings');
    expect(tool.layer.pickEnabled).toBe(true);
    expect(tool.state).toMatchObject({ mode: null, draft: [], features: [], selectedId: null, selectedVertex: null, dragging: false });
  });

  it('places points on click and selects the newest', () => {
    const { tool, click } = setup();
    tool.start('point');
    click(a);
    expect(tool.state.features).toHaveLength(1);
    expect(tool.state.features[0]).toMatchObject({ id: 'feature-1', type: 'point', positions: [{ latitude: 10, longitude: 20, altitude: 0 }] });
    expect(tool.state.selectedId).toBe('feature-1');
    click(b);
    expect(tool.state.features).toHaveLength(2);
    expect(tool.state.selectedId).toBe('feature-2');
    expect(tool.layer.renderables).toHaveLength(2);
  });

  it('drafts a polygon vertex by vertex and finishes on double-click, dropping the repeated vertex', () => {
    const { tool, click, wwd } = setup();
    const states: DrawState[] = [];
    tool.subscribe((state) => states.push(state));
    tool.start('polygon');
    click(a);
    click(b);
    expect(tool.state.draft).toHaveLength(2);
    expect(tool.finish()).toBeNull();
    expect(tool.layer.renderables).toHaveLength(3); // draft line + 2 handles
    // Two quick clicks on different spots also arrive as a double-click; that must not finish the shape.
    wwd.click(10, 10, 2);
    expect(tool.state.draft).toHaveLength(2);
    expect(tool.state.features).toHaveLength(0);
    // A double-click on one spot reaches the tool as two clicks there plus the double-click itself.
    click(c);
    click(c);
    expect(tool.state.draft).toHaveLength(4);
    wwd.click(10, 10, 2);
    const feature = tool.state.features[0]!;
    expect(feature.type).toBe('polygon');
    expect(feature.positions).toHaveLength(3);
    expect(tool.state.draft).toHaveLength(0);
    expect(tool.state.selectedId).toBe(feature.id);
    expect(tool.state.mode).toBe('polygon');
    expect(tool.layer.renderables).toHaveLength(4); // polygon + 3 handles while selected
    expect(states.length).toBeGreaterThan(4);
  });

  it('supports undo, cancel and stop while drafting', () => {
    const { tool, click } = setup();
    tool.start('line');
    click(a);
    click(b);
    tool.undo();
    expect(tool.state.draft).toHaveLength(1);
    tool.cancel();
    expect(tool.state.draft).toHaveLength(0);
    click(a);
    tool.stop();
    expect(tool.state.mode).toBeNull();
    expect(tool.state.draft).toHaveLength(0);
    expect(tool.layer.renderables).toHaveLength(0);
  });

  it('answers keys on the canvas: Backspace undoes, Enter finishes, Escape cancels or stops, Delete removes', () => {
    const { tool, click, globe } = setup();
    const key = (name: string) => {
      const event = new KeyboardEvent('keydown', { key: name, cancelable: true });
      globe.canvas.dispatchEvent(event);
      return event.defaultPrevented;
    };
    tool.start('line');
    click(a);
    click(b);
    click(c);
    expect(key('Backspace')).toBe(true);
    expect(tool.state.draft).toHaveLength(2);
    expect(key('Enter')).toBe(true);
    expect(tool.state.features).toHaveLength(1);
    expect(key('Escape')).toBe(true);
    expect(tool.state.mode).toBeNull();
    expect(tool.state.selectedId).toBe('feature-1');
    expect(key('Delete')).toBe(true);
    expect(tool.state.features).toHaveLength(0);
    expect(key('Delete')).toBe(false);
    expect(key('a')).toBe(false);
  });

  it('selects by clicking shapes and handles, removes vertices, and updates features', () => {
    const { tool, wwd } = setup();
    const polygon = tool.add({ type: 'polygon', positions: [a, b, c, d], properties: { name: 'zone' } });
    expect(tool.state.selectedId).toBeNull();
    expect(tool.layer.renderables).toHaveLength(1);
    const shape = tool.layer.renderables[0];
    wwd.setPickResult([{ userObject: shape, position: a }, { isTerrain: true, position: a }]);
    wwd.click(5, 5);
    expect(tool.state.selectedId).toBe(polygon.id);
    expect(tool.layer.renderables).toHaveLength(5); // shape + 4 handles
    expect(tool.layer.renderables[0]).toBe(shape); // updated in place, not replaced
    expect(tool.featureAt(shape)).toBe(tool.find(polygon.id));

    const handle = tool.layer.renderables[2];
    wwd.setPickResult([{ userObject: handle, position: b }, { isTerrain: true, position: b }]);
    wwd.click(5, 5);
    expect(tool.state.selectedVertex).toBe(1);
    tool.removeSelected();
    expect(tool.find(polygon.id)!.positions).toHaveLength(3);
    expect(tool.state.selectedVertex).toBeNull();
    tool.removeSelected();
    expect(tool.state.features).toHaveLength(0);

    const line = tool.add({ type: 'line', positions: [a, b] });
    tool.select(line.id, 1);
    expect(tool.state).toMatchObject({ selectedId: line.id, selectedVertex: 1 });
    wwd.setPickResult([{ isTerrain: true, position: c }]);
    wwd.click(1, 1);
    expect(tool.state.selectedId).toBeNull();
    tool.update(line.id, { positions: [a, b, c], properties: { name: 'route' } });
    expect(tool.find(line.id)).toMatchObject({ properties: { name: 'route' } });
    expect(tool.find(line.id)!.positions).toHaveLength(3);
    tool.update(line.id, { positions: [a] });
    expect(tool.find(line.id)!.positions).toHaveLength(3);
    expect(tool.remove('missing')).toBe(false);
    tool.clear();
    expect(tool.state.features).toHaveLength(0);
    expect(tool.layer.renderables).toHaveLength(0);
  });

  it('drags points and selected vertices, claiming the press so the globe does not pan', () => {
    const { tool, wwd } = setup();
    const pointer = typeof PointerEvent !== 'undefined';
    const [downType, moveType, upType] = pointer ? ['pointerdown', 'pointermove', 'pointerup'] : ['mousedown', 'mousemove', 'mouseup'];
    const point = tool.add({ type: 'point', positions: [a] });
    const marker = tool.layer.renderables[0] as { position: { latitude: number } };
    wwd.setPickResult((at) => (at[0] < 50 ? [{ userObject: marker, position: a }, { isTerrain: true, position: a }] : [{ isTerrain: true, position: b }]));

    const down = new MouseEvent(downType, { clientX: 10, clientY: 10, button: 0, cancelable: true });
    wwd.dispatch(downType, down);
    expect(down.defaultPrevented).toBe(true);
    expect(tool.state).toMatchObject({ dragging: true, selectedId: point.id, selectedVertex: 0 });
    window.dispatchEvent(new MouseEvent(moveType, { clientX: 100, clientY: 100 }));
    expect(tool.find(point.id)!.positions[0]).toMatchObject(b);
    expect(marker.position.latitude).toBe(b.latitude);
    window.dispatchEvent(new MouseEvent(upType));
    expect(tool.state.dragging).toBe(false);

    // A press on bare terrain is left to the navigator; so is a right-button press.
    const miss = new MouseEvent(downType, { clientX: 100, clientY: 100, button: 0, cancelable: true });
    wwd.dispatch(downType, miss);
    expect(miss.defaultPrevented).toBe(false);
    const secondary = new MouseEvent(downType, { clientX: 10, clientY: 10, button: 2, cancelable: true });
    wwd.dispatch(downType, secondary);
    expect(secondary.defaultPrevented).toBe(false);

    // Vertices of a selected line move through their handles.
    const line = tool.add({ type: 'line', positions: [a, c] });
    tool.select(line.id);
    const handle = tool.layer.renderables[tool.layer.renderables.length - 1];
    wwd.setPickResult((at) => (at[0] < 50 ? [{ userObject: handle, position: c }, { isTerrain: true, position: c }] : [{ isTerrain: true, position: d }]));
    wwd.dispatch(downType, new MouseEvent(downType, { clientX: 10, clientY: 10, button: 0, cancelable: true }));
    expect(tool.state.selectedVertex).toBe(1);
    window.dispatchEvent(new MouseEvent(moveType, { clientX: 100, clientY: 100 }));
    window.dispatchEvent(new MouseEvent(upType));
    expect(tool.find(line.id)!.positions[1]).toMatchObject(d);
    expect(tool.find(line.id)!.positions[0]).toMatchObject(a);

    // Dragging works while a drawing mode is active too: a finished shape keeps its handles.
    tool.start('polygon');
    tool.select(line.id);
    const handle0 = tool.layer.renderables.find((r) => tool.featureAt(r) === tool.find(line.id) && r !== body0(tool, line.id))!;
    wwd.setPickResult((at) => (at[0] < 50 ? [{ userObject: handle0, position: a }, { isTerrain: true, position: a }] : [{ isTerrain: true, position: b }]));
    const pressInMode = new MouseEvent(downType, { clientX: 10, clientY: 10, button: 0, cancelable: true });
    wwd.dispatch(downType, pressInMode);
    expect(pressInMode.defaultPrevented).toBe(true);
    window.dispatchEvent(new MouseEvent(moveType, { clientX: 100, clientY: 100 }));
    window.dispatchEvent(new MouseEvent(upType));
    expect(tool.find(line.id)!.positions[0]).toMatchObject(b);
    expect(tool.state.draft).toHaveLength(0);
    tool.stop();

    // An unselected line is not draggable by its body.
    tool.select(null);
    const body = tool.layer.renderables.find((r) => tool.featureAt(r) === tool.find(line.id))!;
    wwd.setPickResult([{ userObject: body, position: a }, { isTerrain: true, position: a }]);
    const press = new MouseEvent(downType, { clientX: 10, clientY: 10, button: 0, cancelable: true });
    wwd.dispatch(downType, press);
    expect(press.defaultPrevented).toBe(false);
  });

  it('round-trips GeoJSON', () => {
    const { tool } = setup();
    tool.add({ type: 'point', positions: [a], properties: { name: 'A' } });
    tool.add({ type: 'line', positions: [a, b] });
    tool.add({ type: 'polygon', positions: [a, b, c] });
    const collection = tool.toGeoJson();
    expect(collection.features).toHaveLength(3);
    expect(collection.features[0]).toMatchObject({ id: 'feature-1', properties: { name: 'A' }, geometry: { type: 'Point', coordinates: [20, 10, 0] } });
    expect(collection.features[1]!.geometry).toMatchObject({ type: 'LineString' });
    const ring = (collection.features[2]!.geometry as { coordinates: number[][][] }).coordinates[0]!;
    expect(ring).toHaveLength(4);
    expect(ring[3]).toEqual(ring[0]);

    const other = setup();
    const loaded = other.tool.load(collection);
    expect(loaded.map((f) => f.id)).toEqual(['feature-1', 'feature-2', 'feature-3']);
    expect(other.tool.state.features.map((f) => f.type)).toEqual(['point', 'line', 'polygon']);
    expect(other.tool.find('feature-3')!.positions).toHaveLength(3);
    expect(other.tool.find('feature-1')!.properties).toEqual({ name: 'A' });
    // Loading again keeps ids unique; unsupported geometries are skipped; replace clears first.
    const again = other.tool.load({
      type: 'FeatureCollection',
      features: [
        ...collection.features,
        { type: 'Feature', properties: null, geometry: { type: 'Point', coordinates: [1] } },
        { type: 'Feature', properties: {}, geometry: null },
      ],
    });
    expect(again.map((f) => f.id)).toEqual(['feature-4', 'feature-5', 'feature-6']);
    expect(other.tool.state.features).toHaveLength(6);
    other.tool.load({ type: 'FeatureCollection', features: [collection.features[0]!] }, { replace: true });
    expect(other.tool.state.features.map((f) => f.id)).toEqual(['feature-1']);
  });

  it('rejects features with too few positions and tears down cleanly', () => {
    const { tool, wwd, globe } = setup();
    expect(() => tool.add({ type: 'polygon', positions: [a, b] })).toThrow(/at least 3/);
    const downType = typeof PointerEvent !== 'undefined' ? 'pointerdown' : 'mousedown';
    expect(wwd.listenerCount(downType)).toBe(1);
    tool.destroy();
    expect(wwd.layers.map((layer) => layer.displayName)).not.toContain('Drawings');
    expect(wwd.listenerCount(downType)).toBe(0);
    globe.destroy();
  });

  it('keeps its defaults when options are passed as undefined', () => {
    const { tool } = setup({ pointScale: undefined, handleScale: undefined, editable: undefined, idPrefix: undefined });
    const feature = tool.add({ type: 'point', positions: [a] });
    expect(feature.id).toBe('feature-1');
    expect((tool.layer.renderables[0] as { attributes: { imageScale: number } }).attributes.imageScale).toBe(1);
  });

  it('can be read-only and skip the keyboard', () => {
    const { tool, wwd, globe } = setup({ editable: false, keyboard: false, finishOnDoubleClick: false });
    const downType = typeof PointerEvent !== 'undefined' ? 'pointerdown' : 'mousedown';
    expect(wwd.listenerCount(downType)).toBe(0);
    const feature = tool.add({ type: 'point', positions: [a] });
    wwd.setPickResult([{ userObject: tool.layer.renderables[0], position: a }, { isTerrain: true, position: a }]);
    wwd.click(1, 1);
    expect(tool.state.selectedId).toBeNull();
    const event = new KeyboardEvent('keydown', { key: 'Delete', cancelable: true });
    globe.canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(tool.find(feature.id)).toBeDefined();
  });
});
