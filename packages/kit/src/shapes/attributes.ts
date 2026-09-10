import { toColor, type ColorInput } from '../color';
import type {
  WWOffset,
  WWRenderable,
  WWShapeAttributes,
  WorldWindStatic,
} from '../worldwind-types';

/** @category Shapes */
export type AltitudeMode = 'absolute' | 'clampToGround' | 'relativeToGround';
/** @category Shapes */
export type PathType = 'greatCircle' | 'linear' | 'rhumbLine';

/** @category Shapes */
export function altitudeModeValue(
  worldWind: WorldWindStatic,
  mode: AltitudeMode | undefined,
): string {
  switch (mode) {
    case 'clampToGround':
      return worldWind.CLAMP_TO_GROUND;
    case 'relativeToGround':
      return worldWind.RELATIVE_TO_GROUND;
    default:
      return worldWind.ABSOLUTE;
  }
}

/** @category Shapes */
export function pathTypeValue(worldWind: WorldWindStatic, type: PathType | undefined): string {
  switch (type) {
    case 'linear':
      return worldWind.LINEAR;
    case 'rhumbLine':
      return worldWind.RHUMB_LINE;
    default:
      return worldWind.GREAT_CIRCLE;
  }
}

/** @category Shapes */
export type OffsetUnits = 'fraction' | 'pixels' | 'insetPixels';

/** @category Shapes */
export interface OffsetInput {
  x: number;
  y: number;
  /** Defaults to `fraction`. */
  xUnits?: OffsetUnits;
  yUnits?: OffsetUnits;
}

function offsetUnitsValue(worldWind: WorldWindStatic, units: OffsetUnits | undefined): string {
  switch (units) {
    case 'pixels':
      return worldWind.OFFSET_PIXELS;
    case 'insetPixels':
      return worldWind.OFFSET_INSET_PIXELS;
    default:
      return worldWind.OFFSET_FRACTION;
  }
}

/** @category Shapes */
export function toOffset(worldWind: WorldWindStatic, offset: OffsetInput): WWOffset {
  return new worldWind.Offset(
    offsetUnitsValue(worldWind, offset.xUnits),
    offset.x,
    offsetUnitsValue(worldWind, offset.yUnits),
    offset.y,
  );
}

/** @category Shapes */
export interface RenderableOptions {
  displayName?: string | null;
  enabled?: boolean;
  /** Stored on the renderable's `userProperties`; comes back from picks. */
  userData?: unknown;
}

/** Applies the options every renderable shares. Module-internal: not part of the public entry. */
export function applyRenderableOptions(renderable: WWRenderable, options: RenderableOptions): void {
  if (options.displayName !== undefined) renderable.displayName = options.displayName;
  if (options.enabled !== undefined) renderable.enabled = options.enabled;
  if ('userData' in options) renderable.userProperties = options.userData;
}

/** Visual style shared by paths, polygons and surface shapes. `null` disables a fill or stroke.
 * @category Shapes
 */
export interface ShapeStyle {
  fill?: ColorInput | null;
  stroke?: ColorInput | null;
  /** Outline width in pixels. */
  strokeWidth?: number;
  drawVerticals?: boolean;
  applyLighting?: boolean;
  depthTest?: boolean;
  imageSource?: string | null;
}

/** @category Shapes */
export function applyShapeStyle(
  worldWind: WorldWindStatic,
  attributes: WWShapeAttributes,
  style: ShapeStyle,
): WWShapeAttributes {
  if (style.fill !== undefined) {
    if (style.fill === null) {
      attributes.drawInterior = false;
    } else {
      attributes.drawInterior = true;
      attributes.interiorColor = toColor(worldWind, style.fill);
    }
  }
  if (style.stroke !== undefined) {
    if (style.stroke === null) {
      attributes.drawOutline = false;
    } else {
      attributes.drawOutline = true;
      attributes.outlineColor = toColor(worldWind, style.stroke);
    }
  }
  if (style.strokeWidth !== undefined) attributes.outlineWidth = style.strokeWidth;
  if (style.drawVerticals !== undefined) attributes.drawVerticals = style.drawVerticals;
  if (style.applyLighting !== undefined) attributes.applyLighting = style.applyLighting;
  if (style.depthTest !== undefined) attributes.depthTest = style.depthTest;
  if (style.imageSource !== undefined) attributes.imageSource = style.imageSource;
  return attributes;
}

/** @category Shapes */
export function createShapeAttributes(
  worldWind: WorldWindStatic,
  style: ShapeStyle = {},
): WWShapeAttributes {
  return applyShapeStyle(worldWind, new worldWind.ShapeAttributes(null), style);
}

/** A shape with regular and highlight attributes. Module-internal. */
export interface Highlightable {
  attributes: WWShapeAttributes;
  highlightAttributes: WWShapeAttributes | null;
}

/** Sets or clears a shape's highlight attributes from a style. Module-internal. */
export function applyHighlight(
  worldWind: WorldWindStatic,
  shape: Highlightable,
  highlight: ShapeStyle | null | undefined,
): void {
  if (highlight === undefined) return;
  if (highlight === null) {
    shape.highlightAttributes = null;
    return;
  }
  shape.highlightAttributes = applyShapeStyle(
    worldWind,
    new worldWind.ShapeAttributes(shape.attributes),
    highlight,
  );
}
