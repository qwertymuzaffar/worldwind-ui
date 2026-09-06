import { isInternalLayer, isOverlayLayer, type WWLayer } from 'worldwind-kit';
import { useGlobe } from '../context';
import { useLayers } from '../hooks';
import { Panel, type PanelPosition } from './Panel';

let nextId = 1;
const ids = new WeakMap<WWLayer, number>();
function layerId(layer: WWLayer): number {
  let id = ids.get(layer);
  if (id === undefined) {
    id = nextId++;
    ids.set(layer, id);
  }
  return id;
}

export interface LayerSwitcherProps {
  position?: PanelPosition;
  heading?: string | null;
  /** Show an opacity slider under each layer. Default true. */
  showOpacity?: boolean;
  /** Hide screen-space layers such as the compass, and layers owned by tools. Default true. */
  hideOverlays?: boolean;
  /** List the top-most layer first. Default true. */
  topFirst?: boolean;
  filter?: (layer: WWLayer) => boolean;
  className?: string;
}

/** Checkboxes and opacity sliders for every layer on the globe. */
export function LayerSwitcher({
  position = 'top-left',
  heading = 'Layers',
  showOpacity = true,
  hideOverlays = true,
  topFirst = true,
  filter,
  className,
}: LayerSwitcherProps) {
  const globe = useGlobe();
  const all = useLayers();
  let layers = all.filter(
    (layer) => (!hideOverlays || (!isOverlayLayer(layer) && !isInternalLayer(layer))) && (!filter || filter(layer)),
  );
  if (topFirst) layers = layers.slice().reverse();

  return (
    <Panel position={position} heading={heading} className={className}>
      <ul className="wwui-layer-switcher">
        {layers.map((layer) => {
          const id = layerId(layer);
          return (
            <li key={id} className="wwui-layer-switcher__item">
              <label className="wwui-layer-switcher__label">
                <input type="checkbox" checked={layer.enabled} onChange={() => globe.layers.toggle(layer)} />
                <span>{layer.displayName}</span>
              </label>
              {showOpacity ? (
                <input
                  type="range"
                  className="wwui-layer-switcher__opacity"
                  min={0}
                  max={1}
                  step={0.05}
                  value={layer.opacity}
                  aria-label={`${layer.displayName} opacity`}
                  onChange={(event) => globe.layers.setOpacity(layer, Number(event.target.value))}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
