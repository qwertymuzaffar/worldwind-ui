import { useEffect, useRef, useState } from 'react';
import { ClusterLayer as KitClusterLayer, type Cluster, type ClusterLayerOptions, type LayerOptions, type PickEvent } from 'worldwind-kit';
import { useGlobe } from './context';
import { useGlobeEvent } from './hooks';
import { useLatest } from './internal/utils';

/** @category Layers */
export interface ClusterLayerProps<T> extends Omit<ClusterLayerOptions<T>, 'layer' | 'layerName'>, LayerOptions {
  items: readonly T[];
  /** Shown in layer switchers. Default `Clusters`. */
  name?: string;
  onClusterClick?: (cluster: Cluster<T>, event: PickEvent) => void;
  onItemClick?: (item: T, event: PickEvent) => void;
}

/**
 * Draws many points as count markers that split as you zoom in. `items` can be replaced at any
 * time; the renderer options are read when the layer is created.
 * @example
 * ```tsx
 * <ClusterLayer items={stations} name="Stations" radius={50} onItemClick={(station) => select(station)} />
 * ```
 * @category Layers
 */
export function ClusterLayer<T>({
  items,
  name = 'Clusters',
  onClusterClick,
  onItemClick,
  displayName,
  enabled,
  opacity,
  pickEnabled,
  minActiveAltitude,
  maxActiveAltitude,
  attribution,
  legend,
  timeDimension,
  ...options
}: ClusterLayerProps<T>) {
  const globe = useGlobe();
  const [layer, setLayer] = useState<KitClusterLayer<T> | null>(null);
  const latest = useLatest({ options, items, onClusterClick, onItemClick });
  const initialItems = useRef<readonly T[] | null>(null);
  const { radius, minPoints, color, textColor, zoomOnClick, throttle } = options;

  useEffect(() => {
    initialItems.current = latest.current.items;
    const created = new KitClusterLayer<T>(globe, latest.current.items, { ...latest.current.options, layerName: name });
    setLayer(created);
    return () => {
      created.destroy();
      setLayer(null);
    };
  }, [globe, latest, name, radius, minPoints, color, textColor, zoomOnClick, throttle]);

  useEffect(() => {
    if (!layer || initialItems.current === items) return;
    initialItems.current = items;
    layer.setItems(items);
  }, [layer, items]);

  const metadataKey = JSON.stringify([attribution ?? null, legend ?? null, timeDimension ?? null]);
  useEffect(() => {
    if (!layer) return;
    globe.layers.update(layer.layer, { displayName, enabled, opacity, pickEnabled, minActiveAltitude, maxActiveAltitude, attribution, legend, timeDimension });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globe, layer, displayName, enabled, opacity, pickEnabled, minActiveAltitude, maxActiveAltitude, metadataKey]);

  const wantsClicks = Boolean(onClusterClick || onItemClick);
  useGlobeEvent(
    'click',
    wantsClicks
      ? (event) => {
          if (!layer) return;
          const cluster = layer.clusterAt(event.top?.object);
          if (cluster) latest.current.onClusterClick?.(cluster, event);
          const item = layer.itemAt(event.top?.object);
          if (item !== null) latest.current.onItemClick?.(item, event);
        }
      : undefined,
  );
  return null;
}
