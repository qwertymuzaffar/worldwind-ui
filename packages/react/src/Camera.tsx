import { useEffect, useRef } from 'react';
import type { CameraTarget } from 'worldwind-kit';
import { useGlobe } from './context';

export interface CameraProps extends CameraTarget {
  /** Animation length in ms when the target changes. `0` (default) jumps. */
  animate?: number;
}

/**
 * Declarative camera: whenever the props change the globe moves there. User interaction still
 * works in between; the component only pushes, it never fights the user.
 */
export function Camera({ latitude, longitude, range, heading, tilt, roll, animate = 0 }: CameraProps) {
  const globe = useGlobe();
  const first = useRef(true);
  useEffect(() => {
    const target = { latitude, longitude, range, heading, tilt, roll };
    const duration = first.current ? 0 : animate;
    first.current = false;
    void globe.camera.goTo(target, { duration });
  }, [globe, latitude, longitude, range, heading, tilt, roll, animate]);
  return null;
}
