# Performance

Measured with `npm run bench` on 2026-09-06: Apple M1 Pro, 32 GB RAM, headless Chrome, a 1280x800 canvas,
the Blue Marble and Landsat imagery, atmosphere and star field as the base, and the camera orbiting one
degree of heading per frame for 120 frames. "Draw time" is WorldWind's own render time per frame
(`BEFORE_REDRAW` to `AFTER_REDRAW`); "Setup" is the time to build the objects and draw the first frame
that includes them; "Heap growth" is the JavaScript heap after setup minus before it, each measured after a
forced garbage collection. Imagery tiles are
loaded from NASA's servers before measuring, so the numbers describe rendering, not the network.

Every object is a real WorldWind renderable created through the kit's factories; nothing is batched
or simplified by the library, so these are WorldWind's numbers as reached through worldwind-kit.

## GPU

Renderer: `ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)`

| Scenario | Objects | Setup | Draw time avg | Draw time p95 | Frames/s | Heap growth |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 0 | 0 ms | 2.1 ms | 3.3 ms | 60 | 0.2 MB |
| placemarks-1k | 1,000 | 12 ms | 2.9 ms | 3.5 ms | 60 | 1.9 MB |
| placemarks-10k | 10,000 | 50 ms | 14 ms | 18.6 ms | 60 | 15.1 MB |
| placemarks-50k | 50,000 | 204 ms | 69.1 ms | 73.5 ms | 14 | 74.3 MB |
| clustered-10k | 10,000 | 48 ms | 5.2 ms | 6.1 ms | 60 | 3.8 MB |
| clustered-50k | 50,000 | 56 ms | 5 ms | 5.5 ms | 60 | 5.8 MB |
| geojson-10k | 10,500 | 154 ms | 23.5 ms | 25.3 ms | 42 | 18.9 MB |
| paths-500 | 500 | 14 ms | 2.9 ms | 3.5 ms | 60 | 2 MB |

## Software (SwiftShader)

What a CI runner or a machine without a usable GPU sees. Renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)`

| Scenario | Objects | Setup | Draw time avg | Draw time p95 | Frames/s | Heap growth |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | 0 | 1 ms | 1.3 ms | 1.5 ms | 22 | 0.2 MB |
| placemarks-1k | 1,000 | 18 ms | 2.5 ms | 2.7 ms | 19 | 1.9 MB |
| placemarks-10k | 10,000 | 63 ms | 110.4 ms | 127.3 ms | 9 | 15.1 MB |
| placemarks-50k | 50,000 | 219 ms | 407.8 ms | 454.2 ms | 2 | 74.3 MB |
| clustered-10k | 10,000 | 50 ms | 55.6 ms | 67.3 ms | 16 | 3.8 MB |
| clustered-50k | 50,000 | 63 ms | 56.2 ms | 67.3 ms | 16 | 5.8 MB |
| geojson-10k | 10,500 | 447 ms | 160.8 ms | 211 ms | 6 | 19 MB |
| paths-500 | 500 | 24 ms | 2.2 ms | 2.5 ms | 19 | 2 MB |

## Reading the numbers

- Placemarks are the expensive object: each is a textured quad with its own picking colour, and WorldWind
  sorts and draws them one by one. Ten thousand still hit 60 frames per second on a laptop GPU; fifty
  thousand do not. The `clustered` rows draw the same points through `ClusterLayer`: only a few hundred
  markers reach the GPU at any zoom, so fifty thousand cost about as much as one thousand. The software
  renderer shows where the cost goes.
- GeoJSON polygons are surface shapes: tessellated onto the terrain once, then cheap per frame. The
  points in that scenario are placemarks and dominate its draw time.
- Paths are tessellated once and cost almost nothing per frame.
- Heap growth is roughly proportional to object count and is released by `globe.destroy()` or by
  removing the layer.

To reproduce: `npm run build -w bench && npm run bench`. The scenarios live in `examples/bench/src/main.ts`.
