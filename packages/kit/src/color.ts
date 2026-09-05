import type { WWColor, WorldWindStatic } from './worldwind-types';

/** RGBA components in the 0..1 range, the convention WorldWind uses. */
export type RgbaTuple = [red: number, green: number, blue: number, alpha?: number];

export type ColorInput = string | RgbaTuple | WWColor | { red: number; green: number; blue: number; alpha?: number };

const NAMED: Record<string, RgbaTuple> = {
  white: [1, 1, 1, 1],
  black: [0, 0, 0, 1],
  red: [1, 0, 0, 1],
  green: [0, 0.5, 0, 1],
  lime: [0, 1, 0, 1],
  blue: [0, 0, 1, 1],
  yellow: [1, 1, 0, 1],
  cyan: [0, 1, 1, 1],
  magenta: [1, 0, 1, 1],
  orange: [1, 0.647, 0, 1],
  gray: [0.5, 0.5, 0.5, 1],
  grey: [0.5, 0.5, 0.5, 1],
  transparent: [0, 0, 0, 0],
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Parses a CSS-like colour into 0..1 RGBA. Supports `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`,
 * `rgb(r, g, b)`, `rgba(r, g, b, a)` (0..255 channels, 0..1 alpha) and a few named colours.
 */
export function parseCssColor(input: string): RgbaTuple {
  const text = input.trim().toLowerCase();
  const named = NAMED[text];
  if (named) return [...named] as RgbaTuple;

  if (text.startsWith('#')) {
    const hex = text.slice(1);
    const expand = (h: string) => (h.length <= 4 ? h.split('').map((c) => c + c).join('') : h);
    const full = expand(hex);
    if (full.length !== 6 && full.length !== 8) throw new Error(`worldwind-kit: invalid hex colour "${input}"`);
    const channel = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255;
    const alpha = full.length === 8 ? channel(6) : 1;
    return [channel(0), channel(2), channel(4), alpha];
  }

  const match = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(text);
  if (match) {
    const [, r, g, b, a] = match;
    return [Number(r) / 255, Number(g) / 255, Number(b) / 255, a === undefined ? 1 : Number(a)];
  }
  throw new Error(`worldwind-kit: unsupported colour "${input}"`);
}

function isWWColor(value: unknown): value is WWColor {
  return typeof value === 'object' && value !== null && typeof (value as WWColor).clone === 'function';
}

/** Converts any {@link ColorInput} into a WorldWind Color (always a fresh instance). */
export function toColor(worldWind: WorldWindStatic, input: ColorInput): WWColor {
  if (isWWColor(input)) return input.clone();
  if (typeof input === 'string') {
    const [r, g, b, a = 1] = parseCssColor(input);
    return new worldWind.Color(r, g, b, a);
  }
  if (Array.isArray(input)) {
    const [r, g, b, a = 1] = input;
    return new worldWind.Color(clamp01(r), clamp01(g), clamp01(b), clamp01(a));
  }
  return new worldWind.Color(
    clamp01(input.red),
    clamp01(input.green),
    clamp01(input.blue),
    clamp01(input.alpha ?? 1),
  );
}

/** `#rrggbbaa` for a WorldWind Color. */
export function colorToHex(color: { red: number; green: number; blue: number; alpha: number }): string {
  const hex = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(color.red)}${hex(color.green)}${hex(color.blue)}${hex(color.alpha)}`;
}
