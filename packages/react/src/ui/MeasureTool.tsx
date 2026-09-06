import { formatArea, formatDistance, type MeasureToolOptions } from 'worldwind-kit';
import { useMeasureTool } from '../hooks';
import { cx } from '../internal/utils';
import { Panel, type PanelPosition } from './Panel';

/** @category Widgets */
export interface MeasureToolProps extends MeasureToolOptions {
  position?: PanelPosition;
  heading?: string | null;
  className?: string;
}

/** Click-to-measure distances and areas, with start/stop, undo and clear.
 * @category Widgets
 */
export function MeasureTool({ position = 'top-left', heading = 'Measure', className, ...options }: MeasureToolProps) {
  const { state, toggle, undo, clear } = useMeasureTool(options);
  const { points, lengthMeters, areaSquareMeters, active } = state;
  return (
    <Panel position={position} heading={heading} className={cx('wwui-measure', className)}>
      <div className="wwui-toolbar wwui-toolbar--horizontal" style={{ padding: 0 }} role="group" aria-label="Measure">
        <button
          type="button"
          className={cx('wwui-button', 'wwui-button--wide', active && 'wwui-button--active')}
          aria-pressed={active}
          onClick={toggle}
        >
          {active ? 'Stop' : 'Measure'}
        </button>
        <button type="button" className="wwui-button" title="Undo last point" aria-label="Undo last point" disabled={points.length === 0} onClick={undo}>
          ↶
        </button>
        <button type="button" className="wwui-button" title="Clear" aria-label="Clear measurement" disabled={points.length === 0} onClick={clear}>
          ✕
        </button>
      </div>
      <div className="wwui-coords" aria-live="polite">
        <span>
          <span className="wwui-coords__label">Points</span>
          {points.length}
        </span>
        <span>
          <span className="wwui-coords__label">Length</span>
          {formatDistance(lengthMeters)}
        </span>
        {areaSquareMeters !== null ? (
          <span>
            <span className="wwui-coords__label">Area</span>
            {formatArea(areaSquareMeters)}
          </span>
        ) : null}
      </div>
      <div className="wwui-goto__status">{active ? 'Click the globe to add points' : 'Press Measure, then click the globe'}</div>
    </Panel>
  );
}
