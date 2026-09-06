import { expect, test, type Page } from '@playwright/test';
import type { GlobeController } from 'worldwind-kit';

declare global {
  interface Window {
    worldwindDemo?: { globe: GlobeController };
  }
}

/**
 * Collects page errors and console errors from our own origin. Third-party resources (badge
 * images, tile servers) log cookie and CORS notes in some browsers that are not ours to fix.
 */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const url = message.location().url;
    if (/favicon/i.test(message.text()) || /favicon/i.test(url)) return;
    if (url && !url.startsWith('http://127.0.0.1')) return;
    errors.push(`console: ${message.text()} (${url})`);
  });
  return errors;
}

/** Clicks the pin at a position; retried because the placemark image may still be loading right after startup. */
async function clickPin(page: Page, position: { latitude: number; longitude: number }): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const pin = await page.evaluate((p) => window.worldwindDemo!.globe.toScreen(p), position);
    expect(pin?.visible).toBe(true);
    await page.mouse.click(pin!.x + 6, pin!.y - 14);
    const opened = await page
      .locator('.wwui-popup')
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(() => true, () => false);
    if (opened) return;
  }
  throw new Error('the popup did not open after clicking the pin');
}

test('docs home links to the guide, the API and both demos', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('');
  await expect(page).toHaveTitle(/worldwind-ui/);
  await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'React demo', exact: true }).first()).toHaveAttribute('href', '/worldwind-ui/react/');
  await expect(page.getByRole('link', { name: 'Angular demo', exact: true }).first()).toHaveAttribute('href', '/worldwind-ui/angular/');
  const imageLoaded = await page.locator('.VPHero img').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
  expect(imageLoaded).toBe(true);

  await page.getByRole('link', { name: 'Get started' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Getting started');
  await page.goto('api/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('worldwind-ui API');
  await page.goto('api/worldwind-kit/classes/GlobeController');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('GlobeController');
  expect(errors).toEqual([]);
});

for (const [framework, path] of [
  ['React', 'react/'],
  ['Angular', 'angular/'],
] as const) {
  test.describe(`${framework} demo`, () => {
    test('renders the globe with WebGL and every widget', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(path);
      await expect(page.locator('canvas')).toHaveCount(1);
      await expect(page.locator('.wwui-layer-switcher input[type=checkbox]')).toHaveCount(6);
      await expect(page.locator('.wwui-layer-switcher')).toContainText('Blue Marble & Landsat');
      await expect(page.locator('.wwui-layer-switcher')).toContainText('Airports');
      expect(await page.evaluate(() => Boolean(document.querySelector('canvas')?.getContext('webgl')))).toBe(true);
      await expect(page.getByLabel('Go to location')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
      await expect(page.locator('.wwui-coords-panel .wwui-coords')).toContainText('16,000 km');
      expect(errors).toEqual([]);
    });

    test('hover, go-to, layer toggle, zoom and projection switching work', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(path);
      await expect(page.locator('canvas')).toHaveCount(1);
      const readout = page.locator('.wwui-coords-panel .wwui-coords');

      // Click the New York pin in the initial view (found by projecting its position) and expect a popup that follows it.
      await clickPin(page, { latitude: 40.7128, longitude: -74.006 });
      const popup = page.locator('.wwui-popup');
      await expect(popup).toBeVisible();
      await expect(popup).toContainText(/New York|JFK/);
      await page.getByRole('button', { name: 'Close' }).click();
      await expect(popup).toHaveCount(0);

      await page.mouse.move(640, 400);
      await expect(readout).toContainText('Lat/Lon');

      const input = page.getByLabel('Go to location');
      await input.fill('35.68, 139.69');
      await input.press('Enter');
      await expect(readout).toContainText('200 km');

      const osm = page.getByLabel('OpenStreetMap', { exact: true });
      await osm.check();
      await expect(osm).toBeChecked();

      await page.getByRole('button', { name: 'Zoom in' }).click();
      await expect(readout).toContainText('100 km');

      // Keyboard navigation on the focused canvas: minus zooms out by 1.5x.
      await page.locator('canvas').focus();
      await page.keyboard.press('-');
      await expect(readout).toContainText('150 km');

      const mercator = page.getByRole('button', { name: 'Mercator', exact: true });
      await mercator.click();
      await expect(mercator).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('canvas')).toHaveCount(1);

      await page.getByRole('button', { name: 'Measure', exact: true }).click();
      await expect(page.getByText('Click the globe to add points')).toBeVisible();
      await page.mouse.click(640, 400);
      await page.mouse.click(700, 420);
      await expect(page.locator('.wwui-measure')).toContainText('Points2');
      await expect(page.locator('.wwui-measure')).toContainText('km');
      expect(errors).toEqual([]);
    });
  });
}
