import type { WWRenderableLayer, WorldWindStatic } from './worldwind-types';

/** Loads a KML or KMZ document from a URL and adds it to a renderable layer. Resolves with WorldWind's KmlFile. */
export async function loadKml(worldWind: WorldWindStatic, url: string, layer: WWRenderableLayer): Promise<unknown> {
  // WorldWind's KmlFile constructor returns a promise that resolves with the loaded document.
  const kmlFile = await (new worldWind.KmlFile(url) as unknown as Promise<unknown>);
  layer.addRenderable(kmlFile as never);
  return kmlFile;
}
