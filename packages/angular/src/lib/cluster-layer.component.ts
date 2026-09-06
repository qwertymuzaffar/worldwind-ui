import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import {
  ClusterLayer,
  type Cluster,
  type LatLon,
  type LayerAttribution,
  type LayerLegend,
  type PickEvent,
  type WWRenderable,
  type WorldWindStatic,
} from 'worldwind-kit';
import { WwGlobeComponent } from './globe.component';

/**
 * Draws many points as count markers that split as you zoom in.
 *
 * ```html
 * <ww-cluster-layer [items]="stations" name="Stations" [radius]="50" (itemClick)="select($event.item)" />
 * ```
 * @category Layers
 */
@Component({
  selector: 'ww-cluster-layer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwClusterLayerComponent<T = LatLon> {
  private readonly globeHost = inject(WwGlobeComponent);

  readonly items = input.required<readonly T[]>();
  /** Shown in layer switchers. */
  readonly name = input('Clusters');
  /** Marker radius in CSS pixels: items closer than this merge. */
  readonly radius = input<number | undefined>(undefined);
  readonly minPoints = input<number | undefined>(undefined);
  readonly getPosition = input<((item: T) => LatLon) | undefined>(undefined);
  readonly renderItem = input<((item: T, worldWind: WorldWindStatic) => WWRenderable) | undefined>(undefined);
  readonly renderCluster = input<((cluster: Cluster<T>, worldWind: WorldWindStatic) => WWRenderable) | undefined>(undefined);
  readonly color = input<string | undefined>(undefined);
  readonly textColor = input<string | undefined>(undefined);
  /** Fly closer to a cluster when it is clicked. */
  readonly zoomOnClick = input(true);
  readonly throttle = input<number | undefined>(undefined);
  readonly enabled = input<boolean | undefined>(undefined);
  readonly opacity = input<number | undefined>(undefined);
  readonly attribution = input<string | LayerAttribution | null | undefined>(undefined);
  readonly legend = input<string | LayerLegend | null | undefined>(undefined);

  readonly clusterClick = output<{ cluster: Cluster<T>; event: PickEvent }>();
  readonly itemClick = output<{ item: T; event: PickEvent }>();

  /** The kit layer, null until the globe is ready. */
  readonly layer = signal<ClusterLayer<T> | null>(null);

  constructor() {
    effect((onCleanup) => {
      const globe = this.globeHost.globe();
      if (!globe) return;
      const name = this.name();
      const radius = this.radius();
      const minPoints = this.minPoints();
      const color = this.color();
      const textColor = this.textColor();
      const zoomOnClick = this.zoomOnClick();
      const throttle = this.throttle();
      const layer = untracked(
        () =>
          new ClusterLayer<T>(globe, this.items(), {
            layerName: name,
            radius,
            minPoints,
            color,
            textColor,
            zoomOnClick,
            throttle,
            getPosition: this.getPosition(),
            renderItem: this.renderItem(),
            renderCluster: this.renderCluster(),
            layer: { enabled: this.enabled(), opacity: this.opacity(), attribution: this.attribution(), legend: this.legend() },
          }),
      );
      this.layer.set(layer);
      const stopClicks = globe.on('click', (event) => {
        const cluster = layer.clusterAt(event.top?.object);
        if (cluster) this.clusterClick.emit({ cluster, event });
        const item = layer.itemAt(event.top?.object);
        if (item !== null) this.itemClick.emit({ item, event });
      });
      onCleanup(() => {
        stopClicks();
        layer.destroy();
        this.layer.set(null);
      });
    });
    effect(() => {
      const layer = this.layer();
      const items = this.items();
      if (layer) untracked(() => layer.setItems(items));
    });
    effect(() => {
      const layer = this.layer();
      const options = { enabled: this.enabled(), opacity: this.opacity(), attribution: this.attribution(), legend: this.legend() };
      const globe = this.globeHost.globe();
      if (layer && globe && !globe.isDisposed) untracked(() => globe.layers.update(layer.layer, options));
    });
  }
}
