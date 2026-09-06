import { defineConfig, devices } from '@playwright/test';

const port = 4180;

// Runs against the assembled GitHub Pages site (`npm run build:pages`), served under /worldwind-ui/.
// Every browser renders WebGL in software so the suite works on machines and runners without a GPU.
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  // WebGL startup timing varies under load; one retry keeps a slow machine from failing a good build.
  retries: 1,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}/worldwind-ui/`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // CI uses Playwright's Chromium; locally reuse the installed Chrome to avoid the download.
        channel: process.env.CI ? undefined : 'chrome',
        launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Headless Firefox on Linux has no WebGL, so CI runs it headed under Xvfb (see ci.yml).
        headless: !process.env.CI,
        launchOptions: {
          firefoxUserPrefs: {
            'webgl.disabled': false,
            'webgl.force-enabled': true,
            'webgl.disable-fail-if-major-performance-caveat': true,
            'gfx.webrender.software': true,
          },
        },
      },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: `node scripts/serve-site.mjs ${port}`,
    url: `http://127.0.0.1:${port}/worldwind-ui/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
