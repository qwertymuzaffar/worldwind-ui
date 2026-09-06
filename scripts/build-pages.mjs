// Builds both demo apps for GitHub Pages and assembles the site in _site/.
// PAGES_BASE is the path the site is served from (default: /worldwind-ui/ for this repository).
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const base = (process.env.PAGES_BASE ?? '/worldwind-ui/').replace(/\/?$/, '/');
const site = resolve(root, '_site');
const run = (command, cwd, env = {}) => {
  console.log(`\n> ${command}`);
  execSync(command, { cwd, stdio: 'inherit', env: { ...process.env, NG_CLI_ANALYTICS: 'false', ...env } });
};

run('npm run build -w react-demo', root, { DEMO_BASE: `${base}react/` });
run(`npx ng build --base-href ${base}angular/`, resolve(root, 'examples/angular-demo'));

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
cpSync(resolve(root, 'examples/react-demo/dist'), resolve(site, 'react'), { recursive: true });
cpSync(resolve(root, 'examples/angular-demo/dist/browser'), resolve(site, 'angular'), { recursive: true });
cpSync(resolve(root, 'examples/pages/index.html'), resolve(site, 'index.html'));
cpSync(resolve(root, 'docs/screenshot.jpg'), resolve(site, 'screenshot.jpg'));
writeFileSync(resolve(site, '.nojekyll'), '');
console.log(`\nSite assembled in ${site} for base ${base}`);
