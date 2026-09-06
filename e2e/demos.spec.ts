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
      await expect(page.locator('.wwui-layer-switcher input[type=checkbox]')).toHaveCount(8);
      await expect(page.locator('.wwui-layer-switcher')).toContainText('Blue Marble & Landsat');
      await expect(page.locator('.wwui-layer-switcher')).toContainText('Airports');
      await expect(page.locator('.wwui-layer-switcher')).toContainText('MODIS Terra (daily)');
      await expect(page.locator('.wwui-layer-switcher')).toContainText('Stations (5,000 clustered)');
      expect(await page.evaluate(() => Boolean(document.querySelector('canvas')?.getContext('webgl')))).toBe(true);
      await expect(page.getByLabel('Go to location')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
      await expect(page.locator('.wwui-coords-panel .wwui-coords')).toContainText('16,000 km');

      // The new widgets: scale bar, compass, credits, legend and time slider.
      await expect(page.locator('.wwui-scale-panel')).toHaveAttribute('aria-label', /^Scale: [\d,.]+ km$/);
      await expect(page.locator('.wwui-compass')).toHaveAttribute('data-heading', '0');
      await expect(page.getByRole('contentinfo', { name: 'Map credits' })).toContainText('Imagery: NASA');
      await expect(page.getByRole('link', { name: 'worldwind-ui' })).toHaveAttribute('href', 'https://github.com/qwertymuzaffar/worldwind-ui');
      await expect(page.getByAltText('Airports legend')).toBeVisible();
      await expect(page.locator('.wwui-time__label')).toHaveText(/^\d{4}-\d{2}-\d{2}$/);
      await expect(page.getByRole('button', { name: 'Fullscreen' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Point', exact: true })).toBeVisible();

      // 5,000 stations collapse into far fewer markers at this zoom.
      const markers = await page.evaluate(() => {
        const layer = window.worldwindDemo!.globe.layers.find('Stations (5,000 clustered)') as { renderables: unknown[] } | undefined;
        return layer?.renderables.length ?? -1;
      });
      expect(markers).toBeGreaterThan(0);
      expect(markers).toBeLessThan(500);
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

      // Draw a polygon on three spots with nothing but terrain under them (a click on a cluster marker
      // would fly the camera), finish with Enter, then drag one vertex by its handle.
      const spots = await page.evaluate(() => {
        const globe = window.worldwindDemo!.globe;
        const free: Array<[number, number]> = [];
        for (let y = 340; y <= 500 && free.length < 3; y += 40) {
          for (let x = 560; x <= 760 && free.length < 3; x += 40) {
            if (globe.pick(x, y).items.every((item) => item.isTerrain)) free.push([x, y]);
          }
        }
        return free;
      });
      expect(spots).toHaveLength(3);
      await page.getByRole('button', { name: 'Polygon', exact: true }).click();
      for (const [x, y] of spots) await page.mouse.click(x, y);
      await expect(page.locator('.wwui-draw')).toContainText('Draft3');
      await page.locator('canvas').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.wwui-draw')).toContainText('Features1');
      const vertices = () =>
        page.evaluate(() => {
          const layer = window.worldwindDemo!.globe.layers.find('Drawings') as unknown as { renderables: Array<{ boundaries?: Array<{ latitude: number; longitude: number }> }> };
          return layer.renderables[0]!.boundaries!.map((p) => [p.latitude, p.longitude]);
        });
      const before = await vertices();
      const handle = await page.evaluate(([lat, lon]) => window.worldwindDemo!.globe.toScreen({ latitude: lat!, longitude: lon! }), before[1]!);
      expect(handle?.visible).toBe(true);
      await page.mouse.move(handle!.x, handle!.y);
      await page.mouse.down();
      await page.mouse.move(handle!.x + 60, handle!.y - 50, { steps: 6 });
      await page.mouse.up();
      const after = await vertices();
      expect(after[1]).not.toEqual(before[1]);
      expect(after[0]).toEqual(before[0]);
      await page.getByRole('button', { name: 'Polygon', exact: true }).click();
      await page.getByRole('button', { name: 'Delete selection' }).click();
      await expect(page.locator('.wwui-draw')).toContainText('Features0');

      await page.mouse.move(640, 400);
      await expect(readout).toContainText('Lat/Lon');

      const input = page.getByLabel('Go to location');
      await input.fill('35.68, 139.69');
      await input.press('Enter');
      await expect(readout).toContainText('200 km');
      // The flight ends when both the range and the location have arrived; zooming earlier gets overwritten by its last frame.
      await page.waitForFunction(() => {
        const camera = window.worldwindDemo!.globe.camera.get();
        return Math.abs(camera.range - 200_000) < 1 && Math.abs(camera.latitude - 35.68) < 0.01 && Math.abs(camera.longitude - 139.69) < 0.01;
      });

      const osm = page.getByLabel('OpenStreetMap', { exact: true });
      await osm.check();
      await expect(osm).toBeChecked();

      const scale = page.locator('.wwui-scale-panel');
      const scaleBefore = await scale.getAttribute('aria-label');
      await page.getByRole('button', { name: 'Zoom in' }).click();
      await expect(readout).toContainText('100 km');
      await expect(scale).not.toHaveAttribute('aria-label', scaleBefore!);

      // Keyboard navigation on the focused canvas: minus zooms out by 1.5x, Shift+arrow rotates by 10 degrees.
      await page.locator('canvas').focus();
      await page.keyboard.press('-');
      await expect(readout).toContainText('150 km');
      const compass = page.locator('.wwui-compass');
      await page.keyboard.press('Shift+ArrowRight');
      await expect(compass).toHaveAttribute('data-heading', /^(10|350)$/);
      await compass.click();
      await expect(compass).toHaveAttribute('data-heading', '0');

      // The time slider steps the MODIS layer's TIME parameter one day at a time.
      const timeLabel = page.locator('.wwui-time__label');
      const dayBefore = await timeLabel.textContent();
      await page.getByLabel('Time', { exact: true }).focus();
      await page.keyboard.press('ArrowLeft');
      await expect(timeLabel).not.toHaveText(dayBefore!);
      const day = await timeLabel.textContent();
      expect(await page.evaluate(() => window.worldwindDemo!.globe.layers.find('MODIS Terra (daily)')?.timeString)).toBe(day);

      // The screenshot button hands the browser a PNG.
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save screenshot' }).click()]);
      expect(download.suggestedFilename()).toMatch(/^globe-.*\.png$/);

      // Switching the airports off removes their legend; the credits stay.
      const airports = page.getByLabel('Airports', { exact: true });
      await airports.uncheck();
      await expect(page.getByAltText('Airports legend')).toHaveCount(0);
      await airports.check();
      await expect(page.getByAltText('Airports legend')).toBeVisible();

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
