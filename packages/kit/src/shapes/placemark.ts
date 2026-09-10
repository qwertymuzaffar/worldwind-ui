import { toColor, type ColorInput } from '../color';
import { toPosition, type LatLonAlt } from '../geo';
import type {
  WWImageSource,
  WWPlacemark,
  WWPlacemarkAttributes,
  WorldWindStatic,
} from '../worldwind-types';
import {
  altitudeModeValue,
  applyRenderableOptions,
  toOffset,
  type AltitudeMode,
  type OffsetInput,
  type RenderableOptions,
} from './attributes';

/** @category Shapes */
export interface PlacemarkHighlight {
  imageScale?: number;
  imageColor?: ColorInput;
}

/** @category Shapes */
export interface PlacemarkOptions extends RenderableOptions {
  position: LatLonAlt;
  label?: string | null;
  /** Image URL, an `ImageSource`, or null for a label-only placemark. */
  imageSource?: string | WWImageSource | null;
  imageScale?: number;
  imageColor?: ColorInput;
  imageOffset?: OffsetInput;
  imageRotation?: number;
  imageTilt?: number;
  labelColor?: ColorInput;
  labelFontSize?: number;
  labelOffset?: OffsetInput;
  labelOutline?: boolean;
  altitudeMode?: AltitudeMode;
  /** Shrink the image with distance. Defaults to true. */
  eyeDistanceScaling?: boolean;
  eyeDistanceScalingThreshold?: number;
  alwaysOnTop?: boolean;
  drawLeaderLine?: boolean;
  leaderLineColor?: ColorInput;
  depthTest?: boolean;
  /** Attributes applied while `highlighted` is true. `null` removes them. */
  highlight?: PlacemarkHighlight | null;
}

/**
 * @example
 * ```ts
 * const placemark = createPlacemark(globe.worldWind, {
 *   position: { latitude: 40.7128, longitude: -74.006 },
 *   label: 'New York',
 *   imageSource: pushpinUrl(globe.worldWind, 'red'),
 *   highlight: { imageScale: 1.4 },
 * });
 * layer.addRenderable(placemark);
 * ```
 * @category Shapes
 */
export function createPlacemark(
  worldWind: WorldWindStatic,
  options: PlacemarkOptions,
): WWPlacemark {
  const placemark = new worldWind.Placemark(
    toPosition(worldWind, options.position),
    options.eyeDistanceScaling ?? true,
    null,
  );
  updatePlacemark(worldWind, placemark, options);
  return placemark;
}

/** The label options; any of them present means the label attributes changed. */
const LABEL_OPTIONS = ['labelColor', 'labelFontSize', 'labelOffset', 'labelOutline'] as const;

/** @category Shapes */
export function updatePlacemark(
  worldWind: WorldWindStatic,
  placemark: WWPlacemark,
  options: Partial<PlacemarkOptions>,
): void {
  if (options.position) placemark.position = toPosition(worldWind, options.position);
  if (options.label !== undefined) placemark.label = options.label;
  if (options.altitudeMode !== undefined)
    placemark.altitudeMode = altitudeModeValue(worldWind, options.altitudeMode);
  if (options.eyeDistanceScaling !== undefined)
    placemark.eyeDistanceScaling = options.eyeDistanceScaling;
  if (options.eyeDistanceScalingThreshold !== undefined) {
    placemark.eyeDistanceScalingThreshold = options.eyeDistanceScalingThreshold;
  }
  if (options.alwaysOnTop !== undefined) placemark.alwaysOnTop = options.alwaysOnTop;
  if (options.imageRotation !== undefined) placemark.imageRotation = options.imageRotation;
  if (options.imageTilt !== undefined) placemark.imageTilt = options.imageTilt;

  const attributes = placemark.attributes;
  if (options.imageSource !== undefined) attributes.imageSource = options.imageSource;
  if (options.imageScale !== undefined) attributes.imageScale = options.imageScale;
  if (options.imageColor !== undefined)
    attributes.imageColor = toColor(worldWind, options.imageColor);
  if (options.imageOffset !== undefined)
    attributes.imageOffset = toOffset(worldWind, options.imageOffset);
  if (options.depthTest !== undefined) attributes.depthTest = options.depthTest;
  if (options.drawLeaderLine !== undefined) attributes.drawLeaderLine = options.drawLeaderLine;
  if (options.leaderLineColor !== undefined) {
    attributes.leaderLineAttributes.outlineColor = toColor(worldWind, options.leaderLineColor);
  }

  const label = attributes.labelAttributes;
  if (options.labelColor !== undefined) label.color = toColor(worldWind, options.labelColor);
  if (options.labelFontSize !== undefined) label.font = new worldWind.Font(options.labelFontSize);
  if (options.labelOffset !== undefined) label.offset = toOffset(worldWind, options.labelOffset);
  if (options.labelOutline !== undefined) label.enableOutline = options.labelOutline;
  // Re-assigning through the setter refreshes the attributes' state key so WorldWind re-renders the label.
  if (LABEL_OPTIONS.some((option) => options[option] !== undefined))
    attributes.labelAttributes = label;

  if (options.highlight !== undefined) {
    if (options.highlight === null) {
      placemark.highlightAttributes = null;
    } else {
      const highlight: WWPlacemarkAttributes = new worldWind.PlacemarkAttributes(attributes);
      if (options.highlight.imageScale !== undefined)
        highlight.imageScale = options.highlight.imageScale;
      if (options.highlight.imageColor !== undefined) {
        highlight.imageColor = toColor(worldWind, options.highlight.imageColor);
      }
      placemark.highlightAttributes = highlight;
    }
  }
  applyRenderableOptions(placemark, options);
}
