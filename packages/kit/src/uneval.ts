/**
 * Build-time fix for bundling `@nasaworldwind/worldwind`.
 *
 * WorldWind's distributed bundle embeds a webpack build of jszip whose modules are wrapped as
 * `function (module, exports, __webpack_require__) { eval("...") }`. Some bundlers (rolldown,
 * which powers Vite 8) rename those parameters even though a direct `eval` reads them by
 * name, so the evaluated code writes `exports.x` onto the wrong object and WorldWind fails at
 * runtime with errors such as `utils.inherits is not a function`.
 * Reported upstream: https://github.com/rolldown/rolldown/issues/10826
 *
 * {@link unevalWebpackModules} rewrites each `eval("<source>")` into an inline function so
 * the identifiers are visible to the bundler and renamed consistently.
 */

const STRING_LITERAL = /"(?:[^"\\\n\r]|\\[\s\S])*"|'(?:[^'\\\n\r]|\\[\s\S])*'/y;
const EVAL_CALL = /\beval\(/g;

const SIMPLE_ESCAPES: Record<string, string> = {
  n: '\n',
  r: '\r',
  t: '\t',
  b: '\b',
  f: '\f',
  v: '\v',
  '0': '\0',
};

/** Decodes a JavaScript string literal (including its quotes) into its value. */
export function parseStringLiteral(literal: string): string {
  const body = literal.slice(1, -1);
  let out = '';
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i]!;
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    i += 1;
    const next = body[i];
    if (next === undefined) break;
    if (next === 'x') {
      out += String.fromCharCode(parseInt(body.slice(i + 1, i + 3), 16));
      i += 2;
    } else if (next === 'u') {
      if (body[i + 1] === '{') {
        const close = body.indexOf('}', i);
        out += String.fromCodePoint(parseInt(body.slice(i + 2, close), 16));
        i = close;
      } else {
        out += String.fromCharCode(parseInt(body.slice(i + 1, i + 5), 16));
        i += 4;
      }
    } else if (next === '\r') {
      if (body[i + 1] === '\n') i += 1; // line continuation
    } else if (next === '\n' || next === ' ' || next === ' ') {
      // line continuation: nothing emitted
    } else if (next in SIMPLE_ESCAPES && !(next === '0' && /[0-9]/.test(body[i + 1] ?? ''))) {
      out += SIMPLE_ESCAPES[next];
    } else {
      out += next;
    }
  }
  return out;
}

export interface UnevalResult {
  code: string;
  /** How many `eval("...")` calls were rewritten. */
  count: number;
}

/** Rewrites every `eval("<string literal>")` in `code` into `(function(){ <source> }).call(this)`. */
export function unevalWebpackModules(code: string): UnevalResult {
  let out = '';
  let last = 0;
  let count = 0;
  EVAL_CALL.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EVAL_CALL.exec(code))) {
    const before = code[match.index - 1];
    if (before === '.' || before === '$' || before === '_') continue; // `obj.eval(` is not a direct eval
    STRING_LITERAL.lastIndex = match.index + match[0].length;
    const literal = STRING_LITERAL.exec(code);
    if (!literal || code[STRING_LITERAL.lastIndex] !== ')') continue; // only eval of a single literal
    const end = STRING_LITERAL.lastIndex + 1;
    out += `${code.slice(last, match.index)}(function(){${parseStringLiteral(literal[0])}\n}).call(this)`;
    last = end;
    count += 1;
    EVAL_CALL.lastIndex = end;
  }
  return { code: out + code.slice(last), count };
}

/** Matches WorldWind's distributed bundle (official package or the `worldwindjs` fork). */
export const WORLDWIND_BUNDLE_PATTERN =
  /[\\/](?:@nasaworldwind[\\/]worldwind|worldwindjs)[\\/]build[\\/]dist[\\/]worldwind(?:\.min)?\.js(?:\?.*)?$/;

export interface WorldWindVitePluginOptions {
  /** Which module ids to rewrite. Defaults to {@link WORLDWIND_BUNDLE_PATTERN}. */
  include?: RegExp;
}

/** The subset of Vite's plugin shape this plugin uses, so no dependency on Vite's types is needed. */
export interface WorldWindVitePlugin {
  name: string;
  enforce: 'pre';
  apply: 'build';
  transform(code: string, id: string): { code: string; map: null } | null;
}

/**
 * Vite plugin that makes `@nasaworldwind/worldwind` survive production bundling.
 *
 * ```ts
 * import { worldwindVitePlugin } from 'worldwind-kit/vite';
 * export default defineConfig({ plugins: [react(), worldwindVitePlugin()] });
 * ```
 */
export function worldwindVitePlugin(options: WorldWindVitePluginOptions = {}): WorldWindVitePlugin {
  const include = options.include ?? WORLDWIND_BUNDLE_PATTERN;
  return {
    name: 'worldwind-kit:uneval',
    enforce: 'pre',
    apply: 'build',
    transform(code, id) {
      if (!include.test(id)) return null;
      const result = unevalWebpackModules(code);
      return result.count === 0 ? null : { code: result.code, map: null };
    },
  };
}
