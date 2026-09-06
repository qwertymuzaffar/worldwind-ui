import { defineConfig } from '@playwright/test';

const port = 4180;

// Runs against the assembled GitHub Pages site (`npm run build:pages`), served under /worldwind-ui/.
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}/worldwind-ui/`,
    trace: 'retain-on-failure',
    // Software WebGL, so the globe renders on machines and runners without a GPU.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
    // CI uses Playwright's Chromium; locally reuse the installed Chrome to avoid the download.
    channel: process.env.CI ? undefined : 'chrome',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: `node scripts/serve-site.mjs ${port}`,
    url: `http://127.0.0.1:${port}/worldwind-ui/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
