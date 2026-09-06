import { formatDistance, formatLatLon } from 'worldwind-kit';
import { useCameraState, useHoverPick } from '../hooks';
import { cx } from '../internal/utils';
import { Panel, type PanelPosition } from './Panel';

export interface CoordinatesReadoutProps {
  position?: PanelPosition;
  format?: 'decimal' | 'dms';
  precision?: number;
  showAltitude?: boolean;
  /** Show the camera range. Default true. */
  showRange?: boolean;
  /** Text shown before the mouse enters the globe. */
  idleText?: string;
  className?: string;
}

/** Latitude, longitude and terrain altitude under the mouse, plus the camera range. */
export function CoordinatesReadout({
  position = 'bottom-left',
  format = 'decimal',
  precision,
  showAltitude = true,
  showRange = true,
  idleText = 'Move the mouse over the globe',
  className,
}: CoordinatesReadoutProps) {
  const pick = useHoverPick();
  const camera = useCameraState();
  const point = pick?.position ?? null;
  return (
    <Panel position={position} className={cx('wwui-coords-panel', className)}>
      <div className="wwui-coords" aria-live="polite">
        {point ? (
          <span>
            <span className="wwui-coords__label">Lat/Lon</span>
            {formatLatLon(point, { style: format, precision })}
          </span>
        ) : (
          <span className="wwui-coords__label">{idleText}</span>
        )}
        {showAltitude && point && point.altitude !== undefined ? (
          <span>
            <span className="wwui-coords__label">Alt</span>
            {formatDistance(point.altitude)}
          </span>
        ) : null}
        {showRange ? (
          <span>
            <span className="wwui-coords__label">Range</span>
            {formatDistance(camera.range)}
          </span>
        ) : null}
      </div>
    </Panel>
  );
}
