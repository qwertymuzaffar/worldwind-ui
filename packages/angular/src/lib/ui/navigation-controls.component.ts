import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { CameraTarget } from 'worldwind-kit';
import { WwGlobeComponent } from '../globe.component';
import { WwPanelComponent, type WwPanelPosition } from './panel.component';

/** Zoom, north-up, tilt and home buttons. */
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
