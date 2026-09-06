import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { collectAttributions, type LayerAttribution } from 'worldwind-kit';
import { WwGlobeComponent } from '../globe.component';
import { WwPanelComponent, type WwPanelPosition } from './panel.component';

/**
 * A slim strip crediting the data of the visible layers: OpenStreetMap, Bing and NASA imagery
 * out of the box, WMS attribution from capabilities, and whatever `attribution` a layer sets.
 * Renders nothing when there is nothing to credit.
 * @category Widgets
 */
@Component({
  selector: 'ww-attribution',
  imports: [WwPanelComponent],
  template: `
    @if (entries().length > 0) {
      <ww-panel [position]="position()" class="wwui-attribution" [class]="panelClass()" role="contentinfo" aria-label="Map credits">
        @for (entry of entries(); track entry.text; let i = $index) {
          <span>
            @if (i > 0) {
              <span class="wwui-attribution__sep" aria-hidden="true">{{ separator() }}</span>
            }
            @if (entry.url) {
              <a [href]="entry.url" target="_blank" rel="noreferrer">{{ entry.text }}</a>
            } @else {
              {{ entry.text }}
            }
          </span>
        }
      </ww-panel>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwAttributionComponent {
  private readonly globeHost = inject(WwGlobeComponent);

  readonly position = input<WwPanelPosition>('bottom-center');
  /** Credits to show after the layers' own, e.g. your data source. */
  readonly extra = input<ReadonlyArray<string | LayerAttribution> | undefined>(undefined);
  /** Credit layers that are switched off as well. */
  readonly includeDisabled = input(false);
  /** Text between credits. */
  readonly separator = input(' · ');
  /** Extra classes for the panel. */
  readonly panelClass = input<string>('');

  /** The credits currently shown. */
  readonly entries = computed<LayerAttribution[]>(() => {
    const list = collectAttributions(this.globeHost.layers(), { enabledOnly: !this.includeDisabled() });
    const seen = new Set(list.map((a) => a.text));
    for (const item of this.extra() ?? []) {
      const attribution = typeof item === 'string' ? { text: item } : item;
      if (seen.has(attribution.text)) continue;
      seen.add(attribution.text);
      list.push(attribution);
    }
    return list;
  });
}
