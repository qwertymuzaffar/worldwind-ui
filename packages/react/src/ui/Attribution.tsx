import { useMemo } from 'react';
import type { LayerAttribution } from 'worldwind-kit';
import { useAttributions } from '../hooks';
import { cx } from '../internal/utils';
import { Panel, type PanelPosition } from './Panel';

/** @category Widgets */
export interface AttributionProps {
  position?: PanelPosition;
  /** Credits to show after the layers' own, e.g. your data source. */
  extra?: ReadonlyArray<string | LayerAttribution>;
  /** Credit layers that are switched off as well. Default false. */
  includeDisabled?: boolean;
  /** Text between credits. */
  separator?: string;
  className?: string;
}

/**
 * A slim strip crediting the data of the visible layers: OpenStreetMap, Bing and NASA imagery
 * out of the box, WMS attribution from capabilities, and whatever `attribution` a layer sets.
 * Renders nothing when there is nothing to credit.
 * @category Widgets
 */
export function Attribution({ position = 'bottom-center', extra, includeDisabled = false, separator = ' · ', className }: AttributionProps) {
  const attributions = useAttributions({ enabledOnly: !includeDisabled });
  const entries = useMemo(() => {
    const seen = new Set(attributions.map((a) => a.text));
    const list = attributions.slice();
    for (const item of extra ?? []) {
      const attribution = typeof item === 'string' ? { text: item } : item;
      if (seen.has(attribution.text)) continue;
      seen.add(attribution.text);
      list.push(attribution);
    }
    return list;
  }, [attributions, extra]);
  if (entries.length === 0) return null;
  return (
    <Panel position={position} className={cx('wwui-attribution', className)} role="contentinfo" aria-label="Map credits">
      {entries.map((attribution, i) => (
        <span key={attribution.text}>
          {i > 0 ? (
            <span className="wwui-attribution__sep" aria-hidden="true">
              {separator}
            </span>
          ) : null}
          {attribution.url ? (
            <a href={attribution.url} target="_blank" rel="noreferrer">
              {attribution.text}
            </a>
          ) : (
            attribution.text
          )}
        </span>
      ))}
    </Panel>
  );
}
