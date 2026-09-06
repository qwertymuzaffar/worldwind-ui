import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  applyLayerOptions,
  createBuiltInLayer,
  createWmsLayer,
  createWmsLayerFromCapabilities,
  createWmtsLayerFromCapabilities,
  loadGeoJson,
  loadKml,
  type BuiltInLayerKind,
  type GeoJsonStyle,
  type GeoJsonStyleResolver,
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

  /** Emits when an asynchronous `create` rejects. */
  readonly loadError = output<unknown>();

  /** The live WorldWind layer, null until the globe is ready (and, for async layers, loaded). */
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
      let cancelled = false;
      let added: L | null = null;
      const attach = (layer: L) => {
        untracked(() => {
          applyLayerOptions(layer, this.layerOptions());
          globe.layers.add(layer, { index: this.index() });
          added = layer;
          this.layer.set(layer);
        });
      };
      const result = this.create(globe);
      if (result instanceof Promise) {
        result.then(
          (layer) => {
            if (!cancelled) attach(layer);
          },
          (error: unknown) => {
            if (!cancelled) this.loadError.emit(error);
          },
        );
      } else {
        attach(result);
      }
      onCleanup(() => {
        cancelled = true;
        if (added && !globe.isDisposed) globe.layers.remove(added);
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

  /** Builds the layer, synchronously or from a promise. Signal inputs read here recreate the layer when they change. */
  protected abstract create(globe: GlobeController): L | Promise<L>;
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
  /** Read the tiling and formats from GetCapabilities; `layerNames` is then the layer name to look up. */
  readonly fromCapabilities = input(false);
  readonly styleNames = input<string | undefined>(undefined);
  readonly format = input<string | undefined>(undefined);
  readonly size = input<number | undefined>(undefined);
  readonly numLevels = input<number | undefined>(undefined);
  readonly sector = input<SectorInput | undefined>(undefined);
  readonly levelZeroDelta = input<number | undefined>(undefined);
  readonly coordinateSystem = input<string | undefined>(undefined);
  readonly version = input<string | undefined>(undefined);
  readonly time = input<string | null | undefined>(undefined);

  protected override create(globe: GlobeController): WWLayer | Promise<WWLayer> {
    if (this.fromCapabilities()) {
      return createWmsLayerFromCapabilities(globe.worldWind, {
        service: this.service(),
        layer: this.layerNames(),
        time: this.time(),
        displayName: untracked(this.displayName),
      });
    }
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

/** An OGC WMTS layer configured from the service's GetCapabilities document. */
@Component({
  selector: 'ww-wmts-layer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwWmtsLayerComponent extends WwLayerBase {
  /** The WMTS endpoint or a full GetCapabilities URL. */
  readonly service = input.required<string>();
  /** The layer identifier as listed in the capabilities. */
  readonly layer_ = input.required<string>({ alias: 'layer' });
  /** Style identifier (named `styleName` because `style` is the DOM attribute). */
  readonly styleName = input<string | undefined>(undefined);
  readonly matrixSet = input<string | undefined>(undefined);
  readonly format = input<string | undefined>(undefined);
  readonly time = input<string | null | undefined>(undefined);

  protected override create(globe: GlobeController): Promise<WWLayer> {
    return createWmtsLayerFromCapabilities(globe.worldWind, {
      service: this.service(),
      layer: this.layer_(),
      style: this.styleName(),
      matrixSet: this.matrixSet(),
      format: this.format(),
      time: this.time(),
      displayName: untracked(this.displayName),
    });
  }
}

/** Loads GeoJSON into its own renderable layer; reloads when `source` or `style` change. */
@Component({
  selector: 'ww-geojson-layer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwGeoJsonLayerComponent extends WwLayerBase<WWRenderableLayer> {
  /** A URL, a JSON string, or a GeoJSON object. */
  readonly source = input.required<string | object>();
  /** Per-geometry styling (named `featureStyle` because `style` is the DOM attribute). */
  readonly featureStyle = input<GeoJsonStyle | GeoJsonStyleResolver | undefined>(undefined);
  readonly name = input('GeoJSON');
  readonly loaded = output<WWRenderableLayer>();

  constructor() {
    super();
    effect((onCleanup) => {
      const layer = this.layer();
      const source = this.source();
      const style = this.featureStyle();
      const globe = untracked(this.globeHost.globe);
      if (!layer || !globe) return;
      let cancelled = false;
      const controller = new AbortController();
      layer.removeAllRenderables();
      loadGeoJson(globe.worldWind, source, layer, { style, signal: controller.signal }).then(
        () => {
          if (cancelled) return;
          globe.redraw();
          this.loaded.emit(layer);
        },
        (error: unknown) => {
          if (!cancelled) this.loadError.emit(error);
        },
      );
      onCleanup(() => {
        cancelled = true;
        controller.abort();
      });
    });
  }

  protected override create(globe: GlobeController): WWRenderableLayer {
    return new globe.worldWind.RenderableLayer(this.name());
  }
}

/** Loads a KML or KMZ document into its own renderable layer. */
@Component({
  selector: 'ww-kml-layer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwKmlLayerComponent extends WwLayerBase<WWRenderableLayer> {
  readonly url = input.required<string>();
  readonly name = input('KML');
  readonly loaded = output<unknown>();

  constructor() {
    super();
    effect((onCleanup) => {
      const layer = this.layer();
      const url = this.url();
      const globe = untracked(this.globeHost.globe);
      if (!layer || !globe) return;
      let cancelled = false;
      layer.removeAllRenderables();
      loadKml(globe.worldWind, url, layer).then(
        (document) => {
          if (cancelled) return;
          globe.redraw();
          this.loaded.emit(document);
        },
        (error: unknown) => {
          if (!cancelled) this.loadError.emit(error);
        },
      );
      onCleanup(() => {
        cancelled = true;
      });
    });
  }

  protected override create(globe: GlobeController): WWRenderableLayer {
    return new globe.worldWind.RenderableLayer(this.name());
  }
}
