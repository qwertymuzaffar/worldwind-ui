import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type WwPanelPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** A floating card in one corner of the globe. Styled by `ngx-worldwind/styles.css`. */
@Component({
  selector: 'ww-panel',
  template: `
    @if (heading()) {
      <h3 class="wwui-panel__title">{{ heading() }}</h3>
    }
    <ng-content />
  `,
  host: { '[class]': 'hostClass()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwPanelComponent {
  readonly position = input<WwPanelPosition>('top-left');
  readonly heading = input<string | null | undefined>(undefined);

  protected readonly hostClass = computed(() => `wwui-panel wwui-panel--${this.position()}`);
}
