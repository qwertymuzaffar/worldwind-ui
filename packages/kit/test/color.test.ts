import { describe, expect, it } from 'vitest';
import { colorToHex, parseCssColor, toColor } from '../src/color';
import { createFakeWorldWind } from '../src/testing';

describe('parseCssColor', () => {
  it('parses hex in every length', () => {
    expect(parseCssColor('#fff')).toEqual([1, 1, 1, 1]);
    expect(parseCssColor('#f00f')).toEqual([1, 0, 0, 1]);
    expect(parseCssColor('#00ff00')).toEqual([0, 1, 0, 1]);
    expect(parseCssColor('#0000ff80')[3]).toBeCloseTo(0.502, 3);
  });

  it('parses rgb() and rgba()', () => {
    expect(parseCssColor('rgb(255, 0, 0)')).toEqual([1, 0, 0, 1]);
    expect(parseCssColor('rgba(0, 0, 255, 0.5)')).toEqual([0, 0, 1, 0.5]);
  });

  it('knows a few names and rejects garbage', () => {
    expect(parseCssColor('Red')).toEqual([1, 0, 0, 1]);
    expect(parseCssColor('transparent')).toEqual([0, 0, 0, 0]);
    expect(() => parseCssColor('#12')).toThrow(/invalid hex/);
    expect(() => parseCssColor('bogus')).toThrow(/unsupported/);
  });
});

describe('toColor', () => {
  const ww = createFakeWorldWind();

  it('accepts strings, tuples, plain objects and WorldWind colours', () => {
    expect(toColor(ww, '#ff0000')).toMatchObject({ red: 1, green: 0, blue: 0, alpha: 1 });
    expect(toColor(ww, [0, 1, 0])).toMatchObject({ red: 0, green: 1, blue: 0, alpha: 1 });
    expect(toColor(ww, { red: 0, green: 0, blue: 2, alpha: -1 })).toMatchObject({ blue: 1, alpha: 0 });
    const source = new ww.Color(0.1, 0.2, 0.3, 0.4);
    const copy = toColor(ww, source);
    expect(copy).not.toBe(source);
    expect(copy.equals(source)).toBe(true);
  });

  it('round-trips through hex', () => {
    expect(colorToHex(toColor(ww, '#12345678'))).toBe('#12345678');
  });
});
