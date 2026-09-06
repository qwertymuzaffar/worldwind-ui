import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatTimeLabel,
  formatWmsTime,
  layerTime,
  layerTimeDimension,
  resolveTimeDimension,
  timeDimensionCount,
  timeDimensionIndexOf,
  timeDimensionStep,
  timeDimensionValueAt,
  type TimeFormat,
  type WWLayer,
} from 'worldwind-kit';
import { useGlobe } from '../context';
import { useLayers } from '../hooks';
import { cx, useLatest } from '../internal/utils';
import { Panel, type PanelPosition } from './Panel';

/** @category Widgets */
export interface TimeSliderProps {
  position?: PanelPosition;
  heading?: string | null;
  /** Layers to drive. Defaults to every layer that declares a time dimension. */
  layers?: readonly WWLayer[];
  /** Override the range the layers declare, or supply one when they declare none. */
  start?: Date | string;
  end?: Date | string;
  /** Interval in milliseconds. Defaults to the finest step the layers declare, else one day. */
  step?: number;
  /** Explicit instants instead of a range. */
  values?: Date[];
  /** Controlled value. */
  value?: Date;
  /** Initial value when uncontrolled. Defaults to the layers' default, else the end of the range. */
  defaultValue?: Date;
  onChange?: (date: Date) => void;
  /** How `TIME` is written in tile requests. Default `auto`. */
  timeFormat?: TimeFormat;
  /** Formats the label. */
  format?: (date: Date, stepMs?: number) => string;
  /** Milliseconds between steps while playing. Default 1000. */
  playInterval?: number;
  /** Start over at the end while playing. Default true. */
  loop?: boolean;
  showPlay?: boolean;
  /** Shown when no layer has a time dimension and no range is given. */
  idleText?: string;
  className?: string;
}

/**
 * A slider (with play/pause) that steps time-enabled WMS and WMTS layers through their time
 * dimension, as read from the capabilities document or given through props.
 * @example
 * ```tsx
 * <WmsLayer service="https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi" layerNames="MODIS_Terra_CorrectedReflectance_TrueColor" fromCapabilities />
 * <TimeSlider position="bottom-center" />
 * ```
 * @category Widgets
 */
export function TimeSlider({
  position = 'bottom-center',
  heading = 'Time',
  layers,
  start,
  end,
  step,
  values,
  value,
  defaultValue,
  onChange,
  timeFormat = 'auto',
  format = formatTimeLabel,
  playInterval = 1000,
  loop = true,
  showPlay = true,
  idleText = 'No time-enabled layers',
  className,
}: TimeSliderProps) {
  const globe = useGlobe();
  const all = useLayers();
  const targets = useMemo(() => layers ?? all.filter((layer) => layerTimeDimension(layer) !== null), [layers, all]);
  const valuesKey = values ? values.map((date) => date.getTime()).join(',') : '';
  const startKey = start instanceof Date ? start.getTime() : start;
  const endKey = end instanceof Date ? end.getTime() : end;
  const dimension = useMemo(
    () => resolveTimeDimension(targets, { start, end, stepMs: step, values }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targets, startKey, endKey, step, valuesKey],
  );
  const count = dimension ? timeDimensionCount(dimension) : 0;
  const stepMs = dimension ? timeDimensionStep(dimension) : undefined;

  const [internal, setInternal] = useState<Date | null>(null);
  const [playing, setPlaying] = useState(false);
  const requested = value ?? internal ?? defaultValue ?? dimension?.defaultValue ?? dimension?.end ?? null;
  const index = dimension && requested ? timeDimensionIndexOf(dimension, requested) : 0;
  const shown = dimension && requested ? timeDimensionValueAt(dimension, index) : null;
  const shownTime = shown?.getTime();
  const latest = useLatest({ onChange, targets, timeFormat, stepMs });

  const select = useCallback(
    (date: Date) => {
      const { targets, timeFormat, stepMs, onChange } = latest.current;
      const text = formatWmsTime(date, timeFormat, stepMs);
      setInternal(date);
      for (const layer of targets) globe.layers.setTime(layer, text);
      onChange?.(date);
    },
    [globe, latest],
  );

  // Keep the target layers at the shown time: new layers, a changed `value`, a changed range.
  useEffect(() => {
    if (shownTime === undefined) return;
    const text = formatWmsTime(new Date(shownTime), timeFormat, stepMs);
    for (const layer of targets) if (layerTime(layer) !== text) globe.layers.setTime(layer, text);
  }, [globe, targets, shownTime, timeFormat, stepMs]);

  useEffect(() => {
    if (!playing || !dimension || count < 2) return;
    const id = setInterval(() => {
      const next = index + 1;
      if (next < count) {
        select(timeDimensionValueAt(dimension, next));
      } else if (loop) {
        select(timeDimensionValueAt(dimension, 0));
      } else {
        setPlaying(false);
      }
    }, playInterval);
    return () => clearInterval(id);
  }, [playing, dimension, count, index, loop, playInterval, select]);

  const label = shown ? format(shown, stepMs) : '';
  return (
    <Panel position={position} heading={heading} className={cx('wwui-time-panel', className)}>
      <div className="wwui-time">
        {dimension && count > 0 ? (
          <div className="wwui-time__row">
            {showPlay ? (
              <button
                type="button"
                className={cx('wwui-button', 'wwui-time__play', playing && 'wwui-button--active')}
                aria-label={playing ? 'Pause' : 'Play'}
                title={playing ? 'Pause' : 'Play'}
                aria-pressed={playing}
                disabled={count < 2}
                onClick={() => setPlaying((current) => !current)}
              >
                {playing ? '❚❚' : '▶'}
              </button>
            ) : null}
            <input
              type="range"
              className="wwui-time__slider"
              min={0}
              max={Math.max(0, count - 1)}
              step={1}
              value={index}
              aria-label="Time"
              aria-valuetext={label}
              disabled={count < 2}
              onChange={(event) => select(timeDimensionValueAt(dimension, Number(event.target.value)))}
            />
            <output className="wwui-time__label" aria-live="polite">
              {label}
            </output>
          </div>
        ) : (
          <div className="wwui-time__status">{idleText}</div>
        )}
      </div>
    </Panel>
  );
}
