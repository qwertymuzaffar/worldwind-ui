import { useEffect, useState } from 'react';
import { downloadScreenshot, isFullscreen, onFullscreenChange, toggleFullscreen, type CameraTarget, type DownloadScreenshotOptions } from 'worldwind-kit';
import { useGlobe } from '../context';
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
  /** Add a fullscreen toggle for the globe. Default false. */
  fullscreen?: boolean;
  /** Add a button that saves the globe as an image; an object sets the file type and name. Default false. */
  screenshot?: boolean | DownloadScreenshotOptions;
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
  fullscreen = false,
  screenshot = false,
  className,
}: NavigationControlsProps) {
  const camera = useCamera();
  const globe = useGlobe();
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!fullscreen) return;
    setFull(isFullscreen(globe));
    return onFullscreenChange(globe, setFull);
  }, [globe, fullscreen]);
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
      {fullscreen ? (
        <button
          type="button"
          className={cx('wwui-button', full && 'wwui-button--active')}
          title={full ? 'Exit fullscreen' : 'Fullscreen'}
          aria-label={full ? 'Exit fullscreen' : 'Fullscreen'}
          aria-pressed={full}
          onClick={() => void toggleFullscreen(globe).catch(() => {})}
        >
          ⛶
        </button>
      ) : null}
      {screenshot ? (
        <button
          type="button"
          className="wwui-button"
          title="Save screenshot"
          aria-label="Save screenshot"
          onClick={() => void downloadScreenshot(globe, typeof screenshot === 'object' ? screenshot : {}).catch(() => {})}
        >
          📷
        </button>
      ) : null}
    </Panel>
  );
}
