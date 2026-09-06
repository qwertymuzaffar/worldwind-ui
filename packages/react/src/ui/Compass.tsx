import { useCamera } from '../hooks';
import { cx } from '../internal/utils';
import { Panel, type PanelPosition } from './Panel';

/** @category Widgets */
export interface CompassProps {
  position?: PanelPosition;
  /** Diameter in CSS pixels. Default 56. */
  size?: number;
  /** Reset the heading to north when clicked. Default true. */
  resetOnClick?: boolean;
  onClick?: (heading: number) => void;
  className?: string;
}

/** A compass rose that turns with the camera heading; click it to face north again.
 * @category Widgets
 */
export function Compass({ position = 'top-right', size = 56, resetOnClick = true, onClick, className }: CompassProps) {
  const { state, resetNorth } = useCamera();
  const heading = ((state.heading % 360) + 360) % 360;
  const rounded = Math.round(heading) % 360;
  return (
    <Panel position={position} className={cx('wwui-compass-panel', className)}>
      <button
        type="button"
        className="wwui-compass"
        style={{ width: size, height: size }}
        title="Reset to north"
        aria-label={`Compass, heading ${rounded} degrees. Reset to north`}
        data-heading={rounded}
        onClick={() => {
          if (resetOnClick) resetNorth();
          onClick?.(heading);
        }}
      >
        <svg viewBox="0 0 100 100" className="wwui-compass__rose" style={{ transform: `rotate(${-heading}deg)` }} aria-hidden="true" focusable="false">
          <circle cx="50" cy="50" r="46" className="wwui-compass__ring" />
          <line x1="86" y1="50" x2="92" y2="50" className="wwui-compass__tick" />
          <line x1="50" y1="86" x2="50" y2="92" className="wwui-compass__tick" />
          <line x1="8" y1="50" x2="14" y2="50" className="wwui-compass__tick" />
          <text x="50" y="23" textAnchor="middle" className="wwui-compass__label">
            N
          </text>
          <path d="M50 27 L59 50 L50 46 L41 50 Z" className="wwui-compass__north" />
          <path d="M50 73 L59 50 L50 54 L41 50 Z" className="wwui-compass__south" />
        </svg>
      </button>
    </Panel>
  );
}
