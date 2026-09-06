import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import {
  downloadScreenshot,
  isFullscreen,
  onFullscreenChange,
  toggleFullscreen,
  type CameraTarget,
  type DownloadScreenshotOptions,
} from 'worldwind-kit';
import { WwGlobeComponent } from '../globe.component';
import { WwPanelComponent, type WwPanelPosition } from './panel.component';

/** Zoom, north-up, tilt and home buttons.
 * @category Widgets
 */
@Component({
  selector: 'ww-navigation-controls',
  imports: [WwPanelComponent],
  template: `
    <ww-panel [position]="position()" [class]="toolbarClass()" style="padding: 6px" role="toolbar" aria-label="Globe navigation">
      <button type="button" class="wwui-button" title="Zoom in" aria-label="Zoom in" (click)="zoom(1 / zoomFactor())">+</button>
      <button type="button" class="wwui-button" title="Zoom out" aria-label="Zoom out" (click)="zoom(zoomFactor())">−</button>
      <button type="button" class="wwui-button" title="Reset to north" aria-label="Reset to north" (click)="north()">N</button>
      @if (showTilt()) {
        <button type="button" class="wwui-button" title="Tilt up" aria-label="Tilt up" (click)="tilt(tiltStep())">⤒</button>
        <button type="button" class="wwui-button" title="Tilt down" aria-label="Tilt down" (click)="tilt(-tiltStep())">⤓</button>
      }
      @if (home(); as target) {
        <button type="button" class="wwui-button" title="Home" aria-label="Home" (click)="goHome(target)">⌂</button>
      }
      @if (fullscreen()) {
        <button
          type="button"
          class="wwui-button"
          [class.wwui-button--active]="full()"
          [title]="full() ? 'Exit fullscreen' : 'Fullscreen'"
          [attr.aria-label]="full() ? 'Exit fullscreen' : 'Fullscreen'"
          [attr.aria-pressed]="full()"
          (click)="toggleFull()"
        >
          ⛶
        </button>
      }
      @if (screenshot()) {
        <button type="button" class="wwui-button" title="Save screenshot" aria-label="Save screenshot" (click)="saveScreenshot()">📷</button>
      }
    </ww-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WwNavigationControlsComponent {
  private readonly globeHost = inject(WwGlobeComponent);

  readonly position = input<WwPanelPosition>('top-right');
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');
  /** Range multiplier per zoom step. */
  readonly zoomFactor = input(2);
  /** Degrees per tilt step. */
  readonly tiltStep = input(15);
  readonly showTilt = input(true);
  /** Where the home button goes; `false` hides it. */
  readonly home = input<CameraTarget | false>({ latitude: 0, longitude: 0, range: 2e7, heading: 0, tilt: 0 });
  /** Animation length for the home button, in ms. */
  readonly animate = input(1500);
  /** Add a fullscreen toggle for the globe. */
  readonly fullscreen = input(false);
  /** Add a button that saves the globe as an image; an object sets the file type and name. */
  readonly screenshot = input<boolean | DownloadScreenshotOptions>(false);

  /** Whether the globe is fullscreen (tracked while `fullscreen` is on). */
  readonly full = signal(false);

  constructor() {
    effect((onCleanup) => {
      const globe = this.globeHost.globe();
      if (!globe || !this.fullscreen()) return;
      this.full.set(isFullscreen(globe));
      onCleanup(onFullscreenChange(globe, (state) => this.full.set(state)));
    });
  }

  protected toggleFull(): void {
    const globe = this.globeHost.globe();
    if (globe) void toggleFullscreen(globe).catch(() => {});
  }

  protected saveScreenshot(): void {
    const globe = this.globeHost.globe();
    const options = this.screenshot();
    if (globe) void downloadScreenshot(globe, typeof options === 'object' ? options : {}).catch(() => {});
  }

  protected readonly toolbarClass = computed(
    () => `wwui-toolbar${this.orientation() === 'horizontal' ? ' wwui-toolbar--horizontal' : ''}`,
  );

  protected zoom(factor: number): void {
    this.globeHost.globe()?.camera.zoomBy(factor);
  }

  protected north(): void {
    this.globeHost.globe()?.camera.resetNorth();
  }

  protected tilt(delta: number): void {
    this.globeHost.globe()?.camera.tiltBy(delta);
  }

  protected goHome(target: CameraTarget): void {
    void this.globeHost.globe()?.camera.goTo(target, { duration: this.animate() });
  }
}
