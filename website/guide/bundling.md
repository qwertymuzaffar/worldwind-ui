# Bundling WorldWind

WorldWind's npm bundle wraps an internal copy of jszip in webpack modules that use `eval`. rolldown, the bundler behind Vite 8, renames the variables those modules read ([rolldown#10826](https://github.com/rolldown/rolldown/issues/10826)), so a production build fails at runtime with:

```
utils.inherits is not a function
```

The Vite dev server (which pre-bundles with esbuild), webpack, and Angular's CLI builder are unaffected.

## Fix 1: the Vite plugin

```ts
// vite.config.ts
import react from '@vitejs/plugin-react';
import { worldwindVitePlugin } from 'worldwind-kit/vite';

export default defineConfig({
  plugins: [react(), worldwindVitePlugin()],
});
```

It rewrites each `eval("...")` into an inline function before bundling, so the identifiers become visible to the bundler and are renamed consistently. `unevalWebpackModules(code)` is the same transform as a plain function, for any other bundler.

## Fix 2: load WorldWind from a CDN

```tsx
import { scriptLoader } from 'worldwind-kit';

<Globe loadOptions={{ loader: scriptLoader() }} />
```

The bundle stays out of your build entirely and WorldWind detects its own asset location.
