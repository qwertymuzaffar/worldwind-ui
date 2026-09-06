import { Component, signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { LatLonAlt, PickEvent, PushpinColor } from 'worldwind-kit';
import type {
  FakeGeographicText,
  FakePath,
  FakePlacemark,
  FakePolygon,
  FakeRenderableLayer,
  FakeSurfaceCircle,
} from 'worldwind-kit/testing';
import { WwGlobeComponent } from '../src/lib/globe.component';
import { WwRenderableLayerComponent } from '../src/lib/layers';
import {
  WwGeographicTextComponent,
  WwPathComponent,
  WwPlacemarkComponent,
  WwPolygonComponent,
  WwSurfaceCircleComponent,
} from '../src/lib/shapes';
import { mount, settle } from './helpers';

const nyc = { latitude: 40.7, longitude: -74 };

@Component({
  imports: [
    WwGlobeComponent,
    WwRenderableLayerComponent,
    WwPlacemarkComponent,
    WwPathComponent,
    WwPolygonComponent,
    WwSurfaceCircleComponent,
    WwGeographicTextComponent,
  ],
  template: `
    <ww-globe>
      <ww-renderable-layer name="Pins">
        @if (showPin()) {
          <ww-placemark
            [position]="position()"
            label="NYC"
            [pushpin]="pushpin()"
            [highlightOnHover]="true"
            [hoverEvents]="true"
            (shapeClick)="clicks.push($event)"
            (mouseEnter)="enters = enters + 1"
            (mouseLeave)="leaves = leaves + 1"
          />
        }
        <ww-path [positions]="route" stroke="#00ff00" [strokeWidth]="3" [followTerrain]="true" (shapeClick)="pathClicks.push($event)" />
        <ww-polygon [boundaries]="route" fill="#ff000080" [extrude]="true" />
        <ww-surface-circle [center]="position()" [radius]="1000" stroke="cyan" />
        <ww-geographic-text [position]="position()" text="Hi" [fontSize]="20" />
      </ww-renderable-layer>
    </ww-globe>
  `,
})
class Host {
  readonly showPin = signal(true);
  readonly position = signal<LatLonAlt>(nyc);
  readonly pushpin = signal<PushpinColor | undefined>(undefined);
  readonly route: LatLonAlt[] = [nyc, { latitude: 1, longitude: 1, altitude: 100 }, { latitude: 2, longitude: 0 }];
  clicks: PickEvent[] = [];
  pathClicks: PickEvent[] = [];
  enters = 0;
  leaves = 0;
}

describe('shape components', () => {
  it('creates every shape in the enclosing renderable layer with plain options', async () => {
    const { fake, wwd } = await mount(Host);
    const layer = wwd.layers[0] as FakeRenderableLayer;
    expect(layer.renderables).toHaveLength(5);
    // The @if-wrapped placemark is created after its static siblings, so look shapes up by type.
    const placemark = layer.renderables.find((r) => r instanceof fake.Placemark) as FakePlacemark;
    const path = layer.renderables.find((r) => r instanceof fake.Path) as FakePath;
    const polygon = layer.renderables.find((r) => r instanceof fake.Polygon) as FakePolygon;
    const circle = layer.renderables.find((r) => r instanceof fake.SurfaceCircle) as FakeSurfaceCircle;
    const text = layer.renderables.find((r) => r instanceof fake.GeographicText) as FakeGeographicText;
    expect(placemark.label).toBe('NYC');
    expect(placemark.attributes.imageSource).toMatch(/images\/pushpins\/plain-red\.png$/);
    expect(placemark.attributes.imageOffset).toMatchObject({ x: 0.3, y: 0 });
    expect(placemark.attributes.labelAttributes.offset).toMatchObject({ x: 0.5, y: 1 });
    expect(path.attributes.outlineColor).toMatchObject({ green: 1 });
    expect(path.attributes.outlineWidth).toBe(3);
    expect(path.followTerrain).toBe(true);
    expect(polygon.extrude).toBe(true);
    expect(polygon.attributes.interiorColor.alpha).toBeCloseTo(0.5, 2);
    expect(circle.radius).toBe(1000);
    expect(text.text).toBe('Hi');
    expect(text.attributes.font.size).toBe(20);
  });

  it('updates shapes in place and removes them with their component', async () => {
    const { fixture, fake, wwd } = await mount(Host);
    const layer = wwd.layers[0] as FakeRenderableLayer;
    const placemark = layer.renderables.find((r) => r instanceof fake.Placemark) as FakePlacemark;
    const redraws = wwd.redrawCount;
    fixture.componentInstance.position.set({ latitude: 1, longitude: 2 });
    fixture.componentInstance.pushpin.set('blue');
    await settle(fixture);
    expect(layer.renderables).toContain(placemark);
    expect(placemark.position).toMatchObject({ latitude: 1, longitude: 2 });
    expect(placemark.attributes.imageSource).toContain('plain-blue');
    expect(wwd.redrawCount).toBeGreaterThan(redraws);

    fixture.componentInstance.showPin.set(false);
    await settle(fixture);
    expect(layer.renderables).toHaveLength(4);
    expect(layer.renderables).not.toContain(placemark);
  });

  it('routes clicks to the picked shape through one shared recognizer', async () => {
    const { fixture, fake, wwd } = await mount(Host);
    const host = fixture.componentInstance;
    const layer = wwd.layers[0] as FakeRenderableLayer;
    const placemark = layer.renderables.find((r) => r instanceof fake.Placemark) as FakePlacemark;
    const path = layer.renderables.find((r) => r instanceof fake.Path) as FakePath;
    // The globe's own click output and every shape share one single-click recognizer.
    const singleClicks = fake.recognizers.filter((r) => r.kind === 'click' && r.numberOfClicks === 1);
    expect(singleClicks).toHaveLength(1);
    const click = singleClicks[0]!;

    wwd.setPickResult([{ isTerrain: true, position: nyc }, { userObject: path }]);
    click.simulate(1, 1);
    await settle(fixture);
    expect(host.pathClicks).toHaveLength(1);
    expect(host.clicks).toHaveLength(0);

    wwd.setPickResult([{ isTerrain: true, position: nyc }, { userObject: placemark, isOnTop: true }]);
    click.simulate(1, 1);
    await settle(fixture);
    expect(host.clicks).toHaveLength(1);
    expect(host.clicks[0]!.top?.object).toBe(placemark);
  });

  it('highlights on hover and emits enter and leave', async () => {
    const { fixture, fake, wwd } = await mount(Host);
    const host = fixture.componentInstance;
    const placemark = (wwd.layers[0] as FakeRenderableLayer).renderables.find((r) => r instanceof fake.Placemark) as FakePlacemark;
    expect(wwd.listenerCount('mousemove')).toBe(1);

    wwd.setPickResult([{ isTerrain: true, position: nyc }, { userObject: placemark }]);
    wwd.dispatch('mousemove', { clientX: 1, clientY: 1 });
    await vi.waitFor(() => expect(host.enters).toBe(1));
    expect(placemark.highlighted).toBe(true);

    wwd.setPickResult([{ isTerrain: true, position: nyc }]);
    wwd.dispatch('mousemove', { clientX: 2, clientY: 2 });
    await vi.waitFor(() => expect(host.leaves).toBe(1));
    expect(placemark.highlighted).toBe(false);
  });
});
