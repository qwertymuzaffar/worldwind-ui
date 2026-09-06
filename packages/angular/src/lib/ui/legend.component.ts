import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { collectLegends } from 'worldwind-kit';
import { WwGlobeComponent } from '../globe.component';
import { WwPanelComponent, type WwPanelPosition } from './panel.component';

/**
 * Legend images of the visible layers, top-most first: WMS and WMTS legends from capabilities,
 * or any image a layer sets through its `legend` input. Renders nothing when no layer has one.
 * @category Widgets
 */
@Component({
  selector: 'ww-legend',
  imports: [WwPanelComponent],
  template: `
    @if (entries().length > 0) {
      <ww-panel [position]="position()" [heading]="heading()" class="wwui-legend" [class]="panelClass()">
        <ul class="wwui-legend__list">
          @for (entry of entries(); track entry.layer) {
            <li class="wwui-legend__item">
              @if (showNames()) {
                <div class="wwui-legend__name">{{ entry.layer.displayName }}</div>
              }
              <img
                class="wwui-legend__image"
                [src]="entry.legend.url"
                [alt]="entry.layer.displayName + ' legend'"
                [attr.width]="entry.legend.width ?? null"
                [attr.height]="entry.legend.height ?? null"
              />
            </li>
          }
        </ul>
      </ww-panel>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwLegendComponent {
  private readonly globeHost = inject(WwGlobeComponent);

  readonly position = input<WwPanelPosition>('bottom-right');
  readonly heading = input<string | null>('Legend');
  /** Show the layer name above each legend. */
  readonly showNames = input(true);
  /** Include layers that are switched off. */
  readonly includeDisabled = input(false);
  /** Extra classes for the panel. */
  readonly panelClass = input<string>('');

  readonly entries = computed(() => collectLegends(this.globeHost.layers(), { enabledOnly: !this.includeDisabled() }));
}
