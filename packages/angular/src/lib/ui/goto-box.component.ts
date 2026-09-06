import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import {
  geocode,
  parseLatLon,
  rangeForBoundingBox,
  type CameraTarget,
  type GeocodeOptions,
  type GeocodeResult,
} from 'worldwind-kit';
import { WwGlobeComponent } from '../globe.component';
import { WwPanelComponent, type WwPanelPosition } from './panel.component';

type Status = { kind: 'idle' } | { kind: 'searching' } | { kind: 'empty' } | { kind: 'error'; message: string };

/** A search box: type `lat, lon` or a place name and fly there.
 * @category Widgets
 */
@Component({
  selector: 'ww-goto-box',
  imports: [WwPanelComponent],
  template: `
    <ww-panel [position]="position()" [heading]="heading()">
      <form class="wwui-goto" role="search" (submit)="submit($event)">
        <div class="wwui-goto__row">
          <input
            class="wwui-goto__input"
            type="search"
            [value]="query()"
            [placeholder]="placeholder()"
            aria-label="Go to location"
            (input)="query.set($any($event.target).value)"
          />
          <button type="submit" class="wwui-button wwui-goto__submit" [disabled]="status().kind === 'searching'">Go</button>
        </div>
        @switch (status().kind) {
          @case ('searching') {
            <div class="wwui-goto__status">Searching…</div>
          }
          @case ('empty') {
            <div class="wwui-goto__status">No results</div>
          }
          @case ('error') {
            <div class="wwui-goto__status" role="alert">{{ errorMessage() }}</div>
          }
        }
        @if (results().length > 0) {
          <ul class="wwui-goto__results">
            @for (result of results(); track $index) {
              <li>
                <button type="button" class="wwui-goto__result" (click)="choose(result)">{{ result.displayName }}</button>
              </li>
            }
          </ul>
        }
      </form>
    </ww-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwGoToBoxComponent {
  private readonly globeHost = inject(WwGlobeComponent);

  readonly position = input<WwPanelPosition>('top-left');
  readonly heading = input<string | null>('Go to');
  readonly placeholder = input('City or "lat, lon"');
  /** Flight duration in ms. */
  readonly duration = input(2000);
  /** Range for typed coordinates and results without a bounding box. Default 200 km. */
  readonly defaultRange = input(200_000);
  /** Options for place-name search, or `false` to accept coordinates only. */
  readonly geocoding = input<GeocodeOptions | false>({});
  readonly navigated = output<{ target: CameraTarget; result?: GeocodeResult }>();

  protected readonly query = signal('');
  protected readonly results = signal<GeocodeResult[]>([]);
  protected readonly status = signal<Status>({ kind: 'idle' });
  private request = 0;

  protected errorMessage(): string {
    const status = this.status();
    return status.kind === 'error' ? status.message : '';
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    const query = this.query();
    const coordinates = parseLatLon(query);
    if (coordinates) {
      this.navigate({ ...coordinates, range: this.defaultRange() });
      return;
    }
    const geocoding = this.geocoding();
    if (geocoding === false || !query.trim()) return;
    const id = ++this.request;
    this.status.set({ kind: 'searching' });
    try {
      const found = await geocode(query, geocoding);
      if (id !== this.request) return;
      if (found.length === 0) {
        this.results.set([]);
        this.status.set({ kind: 'empty' });
      } else if (found.length === 1) {
        this.choose(found[0]!);
      } else {
        this.results.set(found);
        this.status.set({ kind: 'idle' });
      }
    } catch (error) {
      if (id !== this.request) return;
      this.results.set([]);
      this.status.set({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }

  protected choose(result: GeocodeResult): void {
    this.navigate(
      {
        latitude: result.latitude,
        longitude: result.longitude,
        range: result.boundingBox ? rangeForBoundingBox(result.boundingBox) : this.defaultRange(),
      },
      result,
    );
  }

  private navigate(target: CameraTarget, result?: GeocodeResult): void {
    this.results.set([]);
    this.status.set({ kind: 'idle' });
    this.navigated.emit(result ? { target, result } : { target });
    void this.globeHost.globe()?.camera.goTo(target, { duration: this.duration() });
  }
}
