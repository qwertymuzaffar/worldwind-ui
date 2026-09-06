import type { ScaleUnits } from 'worldwind-kit';
import { useScaleBar } from '../hooks';
import { cx } from '../internal/utils';
import { Panel, type PanelPosition } from './Panel';

/** @category Widgets */
export interface ScaleBarProps {
  position?: PanelPosition;
  /** Longest bar in CSS pixels. Default 120. */
  maxWidth?: number;
  /** `metric` (default), `imperial` or `nautical`. */
  units?: ScaleUnits;
  className?: string;
}

/** A bar showing a round ground distance at the current zoom.
 * @category Widgets
 */
export function ScaleBar({ position = 'bottom-left', maxWidth = 120, units = 'metric', className }: ScaleBarProps) {
  const scale = useScaleBar({ maxWidth, units });
  return (
    <Panel
      position={position}
      className={cx('wwui-panel--compact', 'wwui-scale-panel', className)}
      role="img"
      aria-label={scale ? `Scale: ${scale.label}` : 'Scale'}
    >
      <div className="wwui-scale" style={{ width: maxWidth }}>
        <div className="wwui-scale__bar" style={{ width: scale ? Math.round(scale.pixels) : 0 }} />
        <div className="wwui-scale__label">{scale?.label ?? ''}</div>
      </div>
    </Panel>
  );
}
