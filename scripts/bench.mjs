// Runs examples/bench in headless Chrome with GPU and with software rendering and writes the
// results to website/guide/performance.md. Usage: npm run bench [-- --frames=120]
import { chromium } from '@playwright/test';
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import { extname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'examples/bench/dist');
const frames = Number(process.argv.find((a) => a.startsWith('--frames='))?.split('=')[1] ?? 120);
if (!existsSync(join(dist, 'index.html'))) throw new Error('build the benchmark first: npm run build -w bench');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json' };
const server = createServer((request, response) => {
  let file = join(dist, new URL(request.url ?? '/', 'http://x').pathname);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) return response.writeHead(404).end();
  response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
});
await new Promise((r) => server.listen(4190, '127.0.0.1', r));

const modes = [
  { name: 'GPU', args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--js-flags=--expose-gc'] },
  { name: 'Software (SwiftShader)', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'] },
];
const results = {};
for (const mode of modes) {
  const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome', headless: true, args: mode.args });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto('http://127.0.0.1:4190/', { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.bench));
  const scenarios = await page.evaluate(() => window.bench.scenarios);
  results[mode.name] = [];
  for (const scenario of scenarios) {
    process.stderr.write(`${mode.name}: ${scenario}... `);
    const result = await page.evaluate(([s, f]) => window.bench.run(s, f), [scenario, frames]);
    process.stderr.write(`${result.frameMsAvg} ms/frame\n`);
    results[mode.name].push(result);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.bench));
  }
  await browser.close();
}
server.close();

const cpu = os.cpus()[0]?.model ?? 'unknown CPU';
const memory = Math.round(os.totalmem() / 1073741824);
const date = new Date().toISOString().slice(0, 10);
const table = (rows) =>
  [
    '| Scenario | Objects | Setup | Draw time avg | Draw time p95 | Frames/s | Heap growth |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows.map((r) => `| ${r.scenario} | ${r.objects.toLocaleString('en-US')} | ${r.setupMs} ms | ${r.frameMsAvg} ms | ${r.frameMsP95} ms | ${r.fps} | ${r.heapMb === null ? 'n/a' : `${r.heapMb} MB`} |`),
  ].join('\n');

const md = `# Performance

Measured with \`npm run bench\` on ${date}: ${cpu}, ${memory} GB RAM, headless Chrome, a 1280x800 canvas,
the Blue Marble and Landsat imagery, atmosphere and star field as the base, and the camera orbiting one
degree of heading per frame for ${frames} frames. "Draw time" is WorldWind's own render time per frame
(\`BEFORE_REDRAW\` to \`AFTER_REDRAW\`); "Setup" is the time to build the objects and draw the first frame
that includes them; "Heap growth" is the JavaScript heap after setup minus before it, each measured after a
forced garbage collection. Imagery tiles are
loaded from NASA's servers before measuring, so the numbers describe rendering, not the network.

Every object is a real WorldWind renderable created through the kit's factories; nothing is batched
or simplified by the library, so these are WorldWind's numbers as reached through worldwind-kit.

## ${modes[0].name}

Renderer: \`${results[modes[0].name][0]?.renderer}\`

${table(results[modes[0].name])}

## ${modes[1].name}

What a CI runner or a machine without a usable GPU sees. Renderer: \`${results[modes[1].name][0]?.renderer}\`

${table(results[modes[1].name])}

## Reading the numbers

- Placemarks are the expensive object: each is a textured quad with its own picking colour, and WorldWind
  sorts and draws them one by one. Ten thousand still hit 60 frames per second on a laptop GPU; fifty
  thousand do not. The \`clustered\` rows draw the same points through \`ClusterLayer\`: only a few hundred
  markers reach the GPU at any zoom, so fifty thousand cost about as much as one thousand. The software
  renderer shows where the cost goes.
- GeoJSON polygons are surface shapes: tessellated onto the terrain once, then cheap per frame. The
  points in that scenario are placemarks and dominate its draw time.
- Paths are tessellated once and cost almost nothing per frame.
- Heap growth is roughly proportional to object count and is released by \`globe.destroy()\` or by
  removing the layer.

To reproduce: \`npm run build -w bench && npm run bench\`. The scenarios live in \`examples/bench/src/main.ts\`.
`;
writeFileSync(resolve(root, 'website/guide/performance.md'), md);
console.log(md);
