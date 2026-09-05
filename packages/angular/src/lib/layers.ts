import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import {
  applyLayerOptions,
  createBuiltInLayer,
  createWmsLayer,
  type BuiltInLayerKind,
  type GlobeController,
  type LayerOptions,
  type SectorInput,
  type WWLayer,
  type WWRenderableLayer,
} from 'worldwind-kit';
import { WwGlobeComponent } from './globe.component';

/** Shared inputs and lifecycle for layer components. Subclasses implement `create`. */
@Directive()
export abstract class WwLayerBase<L extends WWLayer = WWLayer> {
  protected readonly globeHost = inject(WwGlobeComponent);

  /** Position in the layer stack (0 = bottom). Creation only. */
  readonly index = input<number | undefined>(undefined);
  readonly displayName = input<string | undefined>(undefined);
  readonly enabled = input<boolean | undefined>(undefined);
  readonly opacity = input<number | undefined>(undefined);
  readonly pickEnabled = input<boolean | undefined>(undefined);
  readonly minActiveAltitude = input<number | undefined>(undefined);
  readonly maxActiveAltitude = input<number | undefined>(undefined);

  /** The live WorldWind layer, null until the globe is ready. */
  readonly layer = signal<L | null>(null);

  private readonly layerOptions = computed<LayerOptions>(() => ({
    displayName: this.displayName(),
    enabled: this.enabled(),
    opacity: this.opacity(),
    pickEnabled: this.pickEnabled(),
    minActiveAltitude: this.minActiveAltitude(),
    maxActiveAltitude: this.maxActiveAltitude(),
  }));

  constructor() {
    effect((onCleanup) => {
      const globe = this.globeHost.globe();
      if (!globe) return;
      const layer = this.create(globe);
      untracked(() => {
        applyLayerOptions(layer, this.layerOptions());
        globe.layers.add(layer, { index: this.index() });
        this.layer.set(layer);
      });
      onCleanup(() => {
        if (!globe.isDisposed) globe.layers.remove(layer);
        this.layer.set(null);
      });
    });
    effect(() => {
      const layer = this.layer();
      const options = this.layerOptions();
      if (!layer) return;
      untracked(() => {
        const globe = this.globeHost.globe();
        if (globe && !globe.isDisposed) globe.layers.update(layer, options);
      });
    });
  }

  /** Builds the layer. Signal inputs read here recreate the layer when they change. */
  protected abstract create(globe: GlobeController): L;
}

/** One of WorldWind's built-in layers: `<ww-layer kind="blue-marble-landsat" />`. */
@Component({
  selector: 'ww-layer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwLayerComponent extends WwLayerBase {
  readonly kind = input.required<BuiltInLayerKind>();

  protected override create(globe: GlobeController): WWLayer {
    return createBuiltInLayer(globe.worldWind, globe.wwd, this.kind());
  }
}

/** An OGC WMS layer. */
@Component({
  selector: 'ww-wms-layer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwWmsLayerComponent extends WwLayerBase {
  readonly service = input.required<string>();
  readonly layerNames = input.required<string>();
  readonly styleNames = input<string | undefined>(undefined);
  readonly format = input<string | undefined>(undefined);
  readonly size = input<number | undefined>(undefined);
  readonly numLevels = input<number | undefined>(undefined);
  readonly sector = input<SectorInput | undefined>(undefined);
  readonly levelZeroDelta = input<number | undefined>(undefined);
  readonly coordinateSystem = input<string | undefined>(undefined);
  readonly version = input<string | undefined>(undefined);
  readonly time = input<string | null | undefined>(undefined);

  protected override create(globe: GlobeController): WWLayer {
    return createWmsLayer(globe.worldWind, {
      service: this.service(),
      layerNames: this.layerNames(),
      styleNames: this.styleNames(),
      format: this.format(),
      size: this.size(),
      numLevels: this.numLevels(),
      sector: this.sector(),
      levelZeroDelta: this.levelZeroDelta(),
      coordinateSystem: this.coordinateSystem(),
      version: this.version(),
      time: this.time(),
      displayName: untracked(this.displayName),
    });
  }
}

/** A layer for shapes. Put `<ww-placemark>`, `<ww-path>` and friends inside it. */
@Component({
  selector: 'ww-renderable-layer',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwRenderableLayerComponent extends WwLayerBase<WWRenderableLayer> {
  readonly name = input('Renderables');

  protected override create(globe: GlobeController): WWRenderableLayer {
    return new globe.worldWind.RenderableLayer(this.name());
  }
}

/** Escape hatch: `<ww-custom-layer [factory]="makeLayer" />` for any WorldWind layer. */
@Component({
  selector: 'ww-custom-layer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwCustomLayerComponent extends WwLayerBase {
  readonly factory = input.required<(globe: GlobeController) => WWLayer>();

  protected override create(globe: GlobeController): WWLayer {
    return this.factory()(globe);
  }
}
