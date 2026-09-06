import { useEffect } from 'react';
import { MIN_DRAW_VERTICES, type DrawFeature, type DrawMode, type DrawToolOptions } from 'worldwind-kit';
import { useDrawTool } from '../hooks';
import { cx, useLatest } from '../internal/utils';
import { Panel, type PanelPosition } from './Panel';

/** @category Widgets */
export interface DrawToolProps extends DrawToolOptions {
  position?: PanelPosition;
  heading?: string | null;
  /** Called with the features whenever they change. */
  onChange?: (features: readonly DrawFeature[]) => void;
  /** Add a button that downloads the drawings as GeoJSON. Default false. */
  showDownload?: boolean;
  /** File name for the download. */
  downloadName?: string;
  className?: string;
}

const MODES: Array<[DrawMode, string]> = [
  ['point', 'Point'],
  ['line', 'Line'],
  ['polygon', 'Polygon'],
];

/** Draw points, lines and polygons; select, drag and delete them; export GeoJSON.
 * @category Widgets
 */
export function DrawTool({
  position = 'top-left',
  heading = 'Draw',
  onChange,
  showDownload = false,
  downloadName = 'drawings.geojson',
  className,
  ...options
}: DrawToolProps) {
  const { state, start, stop, finish, undo, clear, removeSelected, toGeoJson } = useDrawTool(options);
  const latest = useLatest(onChange);
  useEffect(() => {
    latest.current?.(state.features);
  }, [state.features, latest]);

  const selected = state.selectedId ? state.features.find((feature) => feature.id === state.selectedId) : undefined;
  const canFinish = state.mode !== null && state.mode !== 'point' && state.draft.length >= MIN_DRAW_VERTICES[state.mode];
  const status =
    state.mode === 'point'
      ? 'Click the globe to place points'
      : state.mode
        ? state.draft.length
          ? 'Click to add points, double-click or Enter to finish'
          : 'Click the globe to start'
        : selected
          ? `Selected ${selected.type}${state.selectedVertex !== null ? `, vertex ${state.selectedVertex + 1}` : ''}: drag its handles or press Delete`
          : 'Pick a shape, or click a drawing to edit it';

  const download = () => {
    const blob = new Blob([JSON.stringify(toGeoJson(), null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = downloadName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Panel position={position} heading={heading} className={cx('wwui-draw', className)}>
      <div className="wwui-toolbar wwui-toolbar--horizontal" style={{ padding: 0 }} role="group" aria-label="Draw">
        {MODES.map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            className={cx('wwui-button', 'wwui-button--wide', state.mode === mode && 'wwui-button--active')}
            aria-pressed={state.mode === mode}
            onClick={() => (state.mode === mode ? stop() : start(mode))}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="wwui-toolbar wwui-toolbar--horizontal" style={{ padding: 0 }} role="group" aria-label="Edit drawing">
        <button type="button" className="wwui-button wwui-button--wide" disabled={!canFinish} onClick={finish}>
          Finish
        </button>
        <button type="button" className="wwui-button" title="Undo last point" aria-label="Undo last point" disabled={state.draft.length === 0} onClick={undo}>
          ↶
        </button>
        <button type="button" className="wwui-button wwui-button--wide" aria-label="Delete selection" disabled={!selected} onClick={removeSelected}>
          Delete
        </button>
        <button
          type="button"
          className="wwui-button"
          title="Clear all"
          aria-label="Clear drawings"
          disabled={state.features.length === 0 && state.draft.length === 0}
          onClick={clear}
        >
          ✕
        </button>
        {showDownload ? (
          <button type="button" className="wwui-button" title="Download GeoJSON" aria-label="Download GeoJSON" disabled={state.features.length === 0} onClick={download}>
            ⤓
          </button>
        ) : null}
      </div>
      <div className="wwui-coords" aria-live="polite">
        <span>
          <span className="wwui-coords__label">Features</span>
          {state.features.length}
        </span>
        {state.draft.length ? (
          <span>
            <span className="wwui-coords__label">Draft</span>
            {state.draft.length}
          </span>
        ) : null}
      </div>
      <div className="wwui-goto__status">{status}</div>
    </Panel>
  );
}
