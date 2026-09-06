# Testing without WebGL

`worldwind-kit/testing` ships a fake WorldWind: the constructors, fields and constants the libraries touch, in memory, with no WebGL. Install it and every globe created afterwards uses it.

```ts
import { installFakeWorldWind } from 'worldwind-kit/testing';

const fake = installFakeWorldWind();
```

What the fake gives you:

- `fake.windows[0]`: the `WorldWindow`. `setPickResult([...])` defines what the next pick returns, `click(x, y)` clicks the way WorldWind arbitrates recognizers, `dispatch('mousemove', event)` feeds hover, `simulateFrame()` runs redraw callbacks (camera subscribers), and `layers` and `redrawCount` are plain state.
- `fake.recognizers`: every gesture recognizer, with `simulate(x, y)`.
- Layers, shapes, attributes and a GeoJSON parser that builds placemarks, polylines and polygons like the real one.

## React

```tsx
const fake = installFakeWorldWind();
render(<Globe><RenderableLayer><Placemark position={p} onClick={onClick} /></RenderableLayer></Globe>);
await screen.findByText(/…/);
fake.windows[0].setPickResult([{ isTerrain: true, position: p }, { userObject: placemark }]);
fake.windows[0].click(1, 1);
```

## Angular

The `ngx-worldwind` suite runs `TestBed` under Vitest with Analog's Vite plugin, because Angular's JIT compiler cannot see signal inputs without the compiler transform the CLI normally applies. See `packages/angular/test/setup.ts` in the repository for the setup file.

## Browser tests

Unit tests cannot render WebGL. The repository runs Playwright against the deployed demos in Chromium, Firefox and WebKit, all with software WebGL, in CI; two real bugs (a bundler rename and WorldWind's recognizer arbitration) were found only that way.
