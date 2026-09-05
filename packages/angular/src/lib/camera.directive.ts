import { Directive, effect, inject, input, untracked } from '@angular/core';
import { WwGlobeComponent } from './globe.component';

/**
 * Declarative camera: `<ww-camera [latitude]="lat" [longitude]="lon" [range]="5e5" [animate]="1500" />`.
 * Moves the globe whenever an input changes; the first application jumps, later ones animate.
 */
@Directive({ selector: 'ww-camera, [wwCamera]' })
export class WwCameraDirective {
  private readonly globeHost = inject(WwGlobeComponent);

  readonly latitude = input.required<number>();
  readonly longitude = input.required<number>();
  readonly range = input<number | undefined>(undefined);
  readonly heading = input<number | undefined>(undefined);
  readonly tilt = input<number | undefined>(undefined);
  readonly roll = input<number | undefined>(undefined);
  /** Animation length in ms for changes after the first. Default 0 (jump). */
  readonly animate = input(0);

  private first = true;

  constructor() {
    effect(() => {
      const globe = this.globeHost.globe();
      const target = {
        latitude: this.latitude(),
        longitude: this.longitude(),
        range: this.range(),
        heading: this.heading(),
        tilt: this.tilt(),
        roll: this.roll(),
      };
      const animate = this.animate();
      if (!globe) return;
      const duration = this.first ? 0 : animate;
      this.first = false;
      untracked(() => void globe.camera.goTo(target, { duration }));
    });
  }
}
