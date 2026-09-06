import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import {
  formatTimeLabel,
  formatWmsTime,
  layerTime,
  layerTimeDimension,
  resolveTimeDimension,
  timeDimensionCount,
  timeDimensionIndexOf,
  timeDimensionStep,
  timeDimensionValueAt,
  type TimeFormat,
  type WWLayer,
} from 'worldwind-kit';
import { WwGlobeComponent } from '../globe.component';
import { WwPanelComponent, type WwPanelPosition } from './panel.component';

/**
 * A slider (with play/pause) that steps time-enabled WMS and WMTS layers through their time
 * dimension, as read from the capabilities document or given through inputs.
 *
 * ```html
 * <ww-wms-layer service="https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi" layerNames="MODIS_Terra_CorrectedReflectance_TrueColor" [fromCapabilities]="true" />
 * <ww-time-slider position="bottom-center" />
 * ```
 * @category Widgets
 */
@Component({
  selector: 'ww-time-slider',
  imports: [WwPanelComponent],
  template: `
    <ww-panel [position]="position()" [heading]="heading()" class="wwui-time-panel" [class]="panelClass()">
      <div class="wwui-time">
        @if (dimension() && count() > 0) {
          <div class="wwui-time__row">
            @if (showPlay()) {
              <button
                type="button"
                class="wwui-button wwui-time__play"
                [class.wwui-button--active]="playing()"
                [attr.aria-label]="playing() ? 'Pause' : 'Play'"
                [title]="playing() ? 'Pause' : 'Play'"
                [attr.aria-pressed]="playing()"
                [disabled]="count() < 2"
                (click)="togglePlay()"
              >
                {{ playing() ? '❚❚' : '▶' }}
              </button>
            }
            <input
              type="range"
              class="wwui-time__slider"
              min="0"
              [max]="count() - 1"
              step="1"
              [value]="index()"
              aria-label="Time"
              [attr.aria-valuetext]="label()"
              [disabled]="count() < 2"
              (input)="onInput($event)"
            />
            <output class="wwui-time__label" aria-live="polite">{{ label() }}</output>
          </div>
        } @else {
          <div class="wwui-time__status">{{ idleText() }}</div>
        }
      </div>
    </ww-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwTimeSliderComponent {
  private readonly globeHost = inject(WwGlobeComponent);

  readonly position = input<WwPanelPosition>('bottom-center');
  readonly heading = input<string | null>('Time');
  /** Layers to drive. Defaults to every layer that declares a time dimension. */
  readonly layers = input<readonly WWLayer[] | undefined>(undefined);
  /** Override the range the layers declare, or supply one when they declare none. */
  readonly start = input<Date | string | undefined>(undefined);
  readonly end = input<Date | string | undefined>(undefined);
  /** Interval in milliseconds. Defaults to the finest step the layers declare, else one day. */
  readonly step = input<number | undefined>(undefined);
  /** Explicit instants instead of a range. */
  readonly values = input<Date[] | undefined>(undefined);
  /** Controlled value. */
  readonly value = input<Date | undefined>(undefined);
  /** Initial value when uncontrolled. Defaults to the layers' default, else the end of the range. */
  readonly defaultValue = input<Date | undefined>(undefined);
  /** How `TIME` is written in tile requests. */
  readonly timeFormat = input<TimeFormat>('auto');
  /** Formats the label. */
  readonly format = input<(date: Date, stepMs?: number) => string>(formatTimeLabel);
  /** Milliseconds between steps while playing. */
  readonly playInterval = input(1000);
  /** Start over at the end while playing. */
  readonly loop = input(true);
  readonly showPlay = input(true);
  /** Shown when no layer has a time dimension and no range is given. */
  readonly idleText = input('No time-enabled layers');
  /** Extra classes for the panel. */
  readonly panelClass = input<string>('');
  readonly valueChange = output<Date>();

  readonly playing = signal(false);
  private readonly internal = signal<Date | null>(null);

  protected readonly targets = computed(() => this.layers() ?? this.globeHost.layers().filter((layer) => layerTimeDimension(layer) !== null));
  protected readonly dimension = computed(() =>
    resolveTimeDimension(this.targets(), { start: this.start(), end: this.end(), stepMs: this.step(), values: this.values() }),
  );
  protected readonly count = computed(() => {
    const dimension = this.dimension();
    return dimension ? timeDimensionCount(dimension) : 0;
  });
  private readonly stepMs = computed(() => {
    const dimension = this.dimension();
    return dimension ? timeDimensionStep(dimension) : undefined;
  });
  /** The instant currently shown, snapped to the dimension. */
  readonly current = computed(() => {
    const dimension = this.dimension();
    const requested = this.value() ?? this.internal() ?? this.defaultValue() ?? dimension?.defaultValue ?? dimension?.end ?? null;
    return dimension && requested ? timeDimensionValueAt(dimension, timeDimensionIndexOf(dimension, requested)) : null;
  });
  protected readonly index = computed(() => {
    const dimension = this.dimension();
    const current = this.current();
    return dimension && current ? timeDimensionIndexOf(dimension, current) : 0;
  });
  protected readonly label = computed(() => {
    const current = this.current();
    return current ? this.format()(current, this.stepMs()) : '';
  });

  constructor() {
    // Keep the target layers at the shown time: new layers, a changed `value`, a changed range.
    effect(() => {
      const globe = this.globeHost.globe();
      const current = this.current();
      const targets = this.targets();
      const text = current ? formatWmsTime(current, this.timeFormat(), this.stepMs()) : null;
      if (!globe || text === null) return;
      untracked(() => {
        for (const layer of targets) if (layerTime(layer) !== text) globe.layers.setTime(layer, text);
      });
    });
    effect((onCleanup) => {
      if (!this.playing()) return;
      const id = setInterval(() => this.stepForward(), this.playInterval());
      onCleanup(() => clearInterval(id));
    });
  }

  /** Shows an instant (snapped to the dimension) and updates the target layers. */
  select(date: Date): void {
    const dimension = this.dimension();
    if (!dimension) return;
    const snapped = timeDimensionValueAt(dimension, timeDimensionIndexOf(dimension, date));
    this.internal.set(snapped);
    const globe = this.globeHost.globe();
    if (globe) {
      const text = formatWmsTime(snapped, this.timeFormat(), this.stepMs());
      for (const layer of this.targets()) globe.layers.setTime(layer, text);
    }
    this.valueChange.emit(snapped);
  }

  protected onInput(event: Event): void {
    const dimension = this.dimension();
    if (!dimension) return;
    this.select(timeDimensionValueAt(dimension, Number((event.target as HTMLInputElement).value)));
  }

  protected togglePlay(): void {
    this.playing.update((playing) => !playing);
  }

  private stepForward(): void {
    const dimension = this.dimension();
    const count = this.count();
    if (!dimension || count < 2) {
      this.playing.set(false);
      return;
    }
    const next = this.index() + 1;
    if (next < count) this.select(timeDimensionValueAt(dimension, next));
    else if (this.loop()) this.select(timeDimensionValueAt(dimension, 0));
    else this.playing.set(false);
  }
}
