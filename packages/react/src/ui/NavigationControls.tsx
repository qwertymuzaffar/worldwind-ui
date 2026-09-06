import type { CameraTarget } from 'worldwind-kit';
import { cx } from '../internal/utils';
import { useCamera } from '../hooks';
import { Panel, type PanelPosition } from './Panel';

/** @category Widgets */
export interface NavigationControlsProps {
  position?: PanelPosition;
  orientation?: 'vertical' | 'horizontal';
  /** Range multiplier per zoom step. Default 2. */
  zoomFactor?: number;
  /** Degrees per tilt step. Default 15. */
  tiltStep?: number;
  showTilt?: boolean;
  /** Where the home button goes; `false` hides it. */
  home?: CameraTarget | false;
  /** Animation length for the home button, in ms. Default 1500. */
  animate?: number;
  className?: string;
}

/** Zoom, north-up, tilt and home buttons.
 * @category Widgets
 */
export function NavigationControls({
  position = 'top-right',
  orientation = 'vertical',
  zoomFactor = 2,
  tiltStep = 15,
  showTilt = true,
  home = { latitude: 0, longitude: 0, range: 2e7, heading: 0, tilt: 0 },
  animate = 1500,
  className,
}: NavigationControlsProps) {
  const camera = useCamera();
  return (
    <Panel
      position={position}
      className={cx('wwui-toolbar', orientation === 'horizontal' && 'wwui-toolbar--horizontal', className)}
      style={{ padding: 6 }}
      role="toolbar"
      aria-label="Globe navigation"
    >
      <button type="button" className="wwui-button" title="Zoom in" aria-label="Zoom in" onClick={() => camera.zoomBy(1 / zoomFactor)}>
        +
      </button>
      <button type="button" className="wwui-button" title="Zoom out" aria-label="Zoom out" onClick={() => camera.zoomBy(zoomFactor)}>
        −
      </button>
      <button type="button" className="wwui-button" title="Reset to north" aria-label="Reset to north" onClick={() => camera.resetNorth()}>
        N
      </button>
      {showTilt ? (
        <>
          <button type="button" className="wwui-button" title="Tilt up" aria-label="Tilt up" onClick={() => camera.tiltBy(tiltStep)}>
            ⤒
          </button>
          <button type="button" className="wwui-button" title="Tilt down" aria-label="Tilt down" onClick={() => camera.tiltBy(-tiltStep)}>
            ⤓
          </button>
        </>
      ) : null}
      {home ? (
        <button type="button" className="wwui-button" title="Home" aria-label="Home" onClick={() => void camera.goTo(home, { duration: animate })}>
          ⌂
        </button>
      ) : null}
    </Panel>
  );
}
