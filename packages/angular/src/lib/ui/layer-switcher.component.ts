import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { isOverlayLayer, type WWLayer } from 'worldwind-kit';
import { WwGlobeComponent } from '../globe.component';
import { WwPanelComponent, type WwPanelPosition } from './panel.component';

/** Checkboxes and opacity sliders for every layer on the globe. */
@Component({
  selector: 'ww-layer-switcher',
  imports: [WwPanelComponent],
  template: `
    <ww-panel [position]="position()" [heading]="heading()">
      <ul class="wwui-layer-switcher">
        @for (layer of visibleLayers(); track layer) {
          <li class="wwui-layer-switcher__item">
            <label class="wwui-layer-switcher__label">
              <input type="checkbox" [checked]="layer.enabled" (change)="toggle(layer)" />
              <span>{{ layer.displayName }}</span>
            </label>
            @if (showOpacity()) {
              <input
                type="range"
                class="wwui-layer-switcher__opacity"
                min="0"
                max="1"
                step="0.05"
                [value]="layer.opacity"
                [attr.aria-label]="layer.displayName + ' opacity'"
                (input)="setOpacity(layer, $event)"
              />
            }
          </li>
        }
      </ul>
    </ww-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwLayerSwitcherComponent {
  private readonly globeHost = inject(WwGlobeComponent);

  readonly position = input<WwPanelPosition>('top-left');
  readonly heading = input<string | null>('Layers');
  readonly showOpacity = input(true);
  /** Hide screen-space layers such as the compass. */
  readonly hideOverlays = input(true);
  /** List the top-most layer first. */
  readonly topFirst = input(true);
  readonly filter = input<((layer: WWLayer) => boolean) | undefined>(undefined);

  protected readonly visibleLayers = computed(() => {
    const filter = this.filter();
    const hideOverlays = this.hideOverlays();
    const layers = this.globeHost
      .layers()
      .filter((layer) => (!hideOverlays || !isOverlayLayer(layer)) && (!filter || filter(layer)));
    return this.topFirst() ? layers.slice().reverse() : layers;
  });

  protected toggle(layer: WWLayer): void {
    this.globeHost.globe()?.layers.toggle(layer);
  }

  protected setOpacity(layer: WWLayer, event: Event): void {
    this.globeHost.globe()?.layers.setOpacity(layer, Number((event.target as HTMLInputElement).value));
  }
}
