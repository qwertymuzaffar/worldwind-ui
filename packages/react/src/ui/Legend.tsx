import { useLegends } from '../hooks';
import { cx, layerKey } from '../internal/utils';
import { Panel, type PanelPosition } from './Panel';

/** @category Widgets */
export interface LegendProps {
  position?: PanelPosition;
  heading?: string | null;
  /** Show the layer name above each legend. Default true. */
  showNames?: boolean;
  /** Include layers that are switched off. Default false. */
  includeDisabled?: boolean;
  className?: string;
}

/**
 * Legend images of the visible layers, top-most first: WMS and WMTS legends from capabilities,
 * or any image a layer sets through its `legend` option. Renders nothing when no layer has one.
 * @category Widgets
 */
export function Legend({ position = 'bottom-right', heading = 'Legend', showNames = true, includeDisabled = false, className }: LegendProps) {
  const entries = useLegends({ enabledOnly: !includeDisabled });
  if (entries.length === 0) return null;
  return (
    <Panel position={position} heading={heading} className={cx('wwui-legend', className)}>
      <ul className="wwui-legend__list">
        {entries.map(({ layer, legend }) => (
          <li key={layerKey(layer)} className="wwui-legend__item">
            {showNames ? <div className="wwui-legend__name">{layer.displayName}</div> : null}
            <img className="wwui-legend__image" src={legend.url} alt={`${layer.displayName} legend`} width={legend.width} height={legend.height} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
