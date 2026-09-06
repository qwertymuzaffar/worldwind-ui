import { PROJECTION_KINDS, PROJECTION_LABELS, type ProjectionKind } from 'worldwind-kit';
import { useGlobe } from '../context';
import { useProjection } from '../hooks';
import { cx } from '../internal/utils';
import { Panel, type PanelPosition } from './Panel';

export interface ProjectionSwitcherProps {
  position?: PanelPosition;
  heading?: string | null;
  /** Which projections to offer. Defaults to all of them. */
  projections?: readonly ProjectionKind[];
  /** Button labels per projection. */
  labels?: Partial<Record<ProjectionKind, string>>;
  className?: string;
}

/** Buttons that switch between the 3D globe and the flat projections. */
export function ProjectionSwitcher({
  position = 'top-left',
  heading = 'Projection',
  projections = PROJECTION_KINDS,
  labels,
  className,
}: ProjectionSwitcherProps) {
  const globe = useGlobe();
  const current = useProjection();
  return (
    <Panel position={position} heading={heading} className={className}>
      <div className="wwui-toolbar wwui-toolbar--horizontal" style={{ padding: 0, flexWrap: 'wrap' }} role="group" aria-label="Projection">
        {projections.map((kind) => (
          <button
            key={kind}
            type="button"
            className={cx('wwui-button', 'wwui-button--wide', kind === current && 'wwui-button--active')}
            aria-pressed={kind === current}
            onClick={() => globe.setProjection(kind)}
          >
            {labels?.[kind] ?? PROJECTION_LABELS[kind]}
          </button>
        ))}
      </div>
    </Panel>
  );
}
