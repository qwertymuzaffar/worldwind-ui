// Serves _site/ under PAGES_BASE (default /worldwind-ui/), the way GitHub Pages does. Used by the e2e tests.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.argv[2] ?? 4180);
const base = (process.env.PAGES_BASE ?? '/worldwind-ui/').replace(/\/?$/, '/');
const root = resolve(import.meta.dirname, '..', '_site');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.map': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wasm': 'application/wasm',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith(base)) {
    response.writeHead(404).end('not under ' + base);
    return;
  }
  let file = join(root, normalize(decodeURIComponent(url.pathname.slice(base.length))));
  if (!file.startsWith(root)) {
    response.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  // GitHub Pages serves /page for page.html; VitePress relies on that (cleanUrls).
  if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!existsSync(file)) {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`serving ${root} at http://127.0.0.1:${port}${base}`));
