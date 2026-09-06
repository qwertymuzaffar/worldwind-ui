import { expect, test, type Page } from '@playwright/test';

/** Collects page errors and console errors (a missing favicon is not an error worth failing on). */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (/favicon/i.test(message.text()) || /favicon/i.test(message.location().url)) return;
    errors.push(`console: ${message.text()} (${message.location().url})`);
  });
  return errors;
}

test('landing page links to both demos and shows the screenshot', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('');
  await expect(page).toHaveTitle(/worldwind-ui/);
  await expect(page.locator('a.card[href="react/"]')).toBeVisible();
  await expect(page.locator('a.card[href="angular/"]')).toBeVisible();
  const imageLoaded = await page.locator('img.shot').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
  expect(imageLoaded).toBe(true);
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
      await expect(page.locator('.wwui-layer-switcher input[type=checkbox]')).toHaveCount(5);
      await expect(page.locator('.wwui-layer-switcher')).toContainText('Blue Marble & Landsat');
      expect(await page.evaluate(() => Boolean(document.querySelector('canvas')?.getContext('webgl')))).toBe(true);
      await expect(page.getByLabel('Go to location')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
      await expect(page.locator('.wwui-coords')).toContainText('16,000 km');
      expect(errors).toEqual([]);
    });

    test('hover, go-to, layer toggle, zoom and projection switching work', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(path);
      await expect(page.locator('canvas')).toHaveCount(1);
      const readout = page.locator('.wwui-coords');

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

      const mercator = page.getByRole('button', { name: 'mercator', exact: true });
      await mercator.click();
      await expect(mercator).toHaveAttribute('style', /outline/);
      await expect(page.locator('canvas')).toHaveCount(1);
      expect(errors).toEqual([]);
    });
  });
}
