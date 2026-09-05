import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { parseStringLiteral, unevalWebpackModules, worldwindVitePlugin } from '../src/vite';

describe('parseStringLiteral', () => {
  it('decodes escapes the way JavaScript does', () => {
    expect(parseStringLiteral('"a\\nb\\"c\\\\d\\x41\\u0042\\u{1F600}"')).toBe('a\nb"c\\dAB😀');
    expect(parseStringLiteral("'it\\'s'")).toBe("it's");
    expect(parseStringLiteral('"line\\\ncontinued"')).toBe('linecontinued');
  });
});

describe('unevalWebpackModules', () => {
  it('inlines eval of a string literal and leaves other evals alone', () => {
    const input =
      'var m = { "./a.js": function(module, exports, __webpack_require__) { eval("exports.x = 1;\\n//# sourceURL=a") } };' +
      ' obj.eval("keep"); eval(dynamic); eval("a" + "b");';
    const { code, count } = unevalWebpackModules(input);
    expect(count).toBe(1);
    expect(code).toContain('(function(){exports.x = 1;\n//# sourceURL=a\n}).call(this)');
    expect(code).toContain('obj.eval("keep")');
    expect(code).toContain('eval(dynamic)');
    expect(code).toContain('eval("a" + "b")');
  });

  it('produces working code', () => {
    const input = 'function wrap(module, exports) { eval("exports.inherits = function () { return 42; }") } ' +
      'var m = {}; wrap(m, m); m.inherits();';
    const { code } = unevalWebpackModules(input);
    expect(new Function(`${code}; return m.inherits();`)()).toBe(42);
  });

  it('rewrites the real WorldWind bundle into parseable code', () => {
    const require = createRequire(import.meta.url);
    const file = require.resolve('@nasaworldwind/worldwind');
    const source = readFileSync(file, 'utf8');
    const { code, count } = unevalWebpackModules(source);
    expect(count).toBeGreaterThan(50);
    expect(code).not.toMatch(/\beval\("/);
    expect(() => new Function(code)).not.toThrow();
  });
});

describe('worldwindVitePlugin', () => {
  it('only touches the WorldWind bundle', () => {
    const plugin = worldwindVitePlugin();
    expect(plugin.transform('eval("x")', '/p/node_modules/other/index.js')).toBeNull();
    expect(plugin.transform('nothing', '/p/node_modules/@nasaworldwind/worldwind/build/dist/worldwind.min.js')).toBeNull();
    const result = plugin.transform('eval("a=1")', '/p/node_modules/worldwindjs/build/dist/worldwind.js');
    expect(result?.code).toContain('(function(){a=1');
  });
});
