import { toColor, type ColorInput } from '../color';
import { toPosition, type LatLonAlt } from '../geo';
import type { WWGeographicText, WWTextAttributes, WorldWindStatic } from '../worldwind-types';
import {
  altitudeModeValue,
  applyRenderableOptions,
  toOffset,
  type AltitudeMode,
  type OffsetInput,
  type RenderableOptions,
} from './attributes';

/** @category Shapes */
export interface GeographicTextOptions extends RenderableOptions {
  position: LatLonAlt;
  text: string;
  color?: ColorInput;
  fontSize?: number;
  outline?: boolean;
  outlineColor?: ColorInput;
  offset?: OffsetInput;
  altitudeMode?: AltitudeMode;
  alwaysOnTop?: boolean;
  depthTest?: boolean;
}

/** @category Shapes */
export function createGeographicText(
  worldWind: WorldWindStatic,
  options: GeographicTextOptions,
): WWGeographicText {
  const text = new worldWind.GeographicText(toPosition(worldWind, options.position), options.text);
  updateGeographicText(worldWind, text, options);
  return text;
}

/** @category Shapes */
export function updateGeographicText(
  worldWind: WorldWindStatic,
  text: WWGeographicText,
  options: Partial<GeographicTextOptions>,
): void {
  if (options.position) text.position = toPosition(worldWind, options.position);
  if (options.text !== undefined) text.text = options.text;
  if (options.altitudeMode !== undefined)
    text.altitudeMode = altitudeModeValue(worldWind, options.altitudeMode);
  if (options.alwaysOnTop !== undefined) text.alwaysOnTop = options.alwaysOnTop;
  const attributes: WWTextAttributes = text.attributes;
  if (options.color !== undefined) attributes.color = toColor(worldWind, options.color);
  if (options.fontSize !== undefined) attributes.font = new worldWind.Font(options.fontSize);
  if (options.outline !== undefined) attributes.enableOutline = options.outline;
  if (options.outlineColor !== undefined)
    attributes.outlineColor = toColor(worldWind, options.outlineColor);
  if (options.offset !== undefined) attributes.offset = toOffset(worldWind, options.offset);
  if (options.depthTest !== undefined) attributes.depthTest = options.depthTest;
  applyRenderableOptions(text, options);
}
