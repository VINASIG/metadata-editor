import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startServer } from '../../scripts/serve.ts';
import {
  inspectInterface,
  inspectControlSurfaces,
  inspectControlIndicators,
  inspectHeaderBrand,
} from '../../.vinasig/standards/templates/web/interface.mjs';
import { inspectSiteChrome } from '../../.vinasig/standards/templates/web/site-chrome.mjs';
import { editMetadata, readEditable } from '../../src/lib/editor.ts';
import { inspect } from '../../src/lib/container.ts';
import { pngFixture, privateText } from '../fixtures.ts';
import { capture } from './evidence.ts';
let app: Awaited<ReturnType<typeof startServer>>;
test.beforeAll(async () => {
  app = await startServer(path.resolve('dist'));
});
test.afterAll(async () => {
  await app.close();
});
async function guards(page: Page): Promise<void> {
  expect(await page.evaluate(inspectInterface)).toEqual([]);
  expect(await page.evaluate(inspectControlSurfaces)).toEqual([]);
  expect(await page.evaluate(inspectControlIndicators)).toEqual([]);
  expect(await page.evaluate(inspectHeaderBrand)).toEqual([]);
  expect(await page.evaluate(inspectSiteChrome)).toEqual([]);
  expect(await page.locator('header[data-site-header]').count()).toBe(1);
  expect(await page.locator('footer[data-site-footer]').count()).toBe(1);
  expect(await page.locator('input[type=file]').count()).toBe(1);
  expect(await page.locator('input[type=radio]').count()).toBe(33);
  expect(await page.locator('textarea').count()).toBe(6);
  expect(await page.locator('summary').count()).toBeGreaterThan(0);
}
async function load(page: Page): Promise<void> {
  await page.locator('#file').setInputFiles({
    name: 'example.png',
    mimeType: 'image/png',
    buffer: Buffer.from(pngFixture()),
  });
  await expect(page.locator('#process')).toBeEnabled();
}
test('header logo performs native home navigation on both locales and viewport sizes', async ({
  page,
}) => {
  await page.route('https://vinasig.io.vn/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>VINASIG home</h1>' }),
  );
  for (const lang of ['vi', 'en'])
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(app.url + (lang === 'en' ? 'en/' : ''));
      await page.locator('[data-brand-logo]').click();
      await expect(page).toHaveURL('https://vinasig.io.vn/');
      await expect(page.locator('h1')).toHaveText('VINASIG home');
    }
});
test('XMP editing, actual output inspection, byte preservation, downloads and restoring edits', async ({
  page,
}, info) => {
  const errors: string[] = [];
  const outbound: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (
      !request.url().startsWith(app.url) &&
      !request.url().startsWith('blob:') &&
      !request.url().startsWith('data:')
    )
      outbound.push(request.url());
  });
  await page.goto(app.url);
  await load(page);
  await expect(
    page.locator('input[name=action-title][value=keep]'),
  ).toBeChecked();
  await expect(page.locator('#metadata-fields')).toContainText(privateText);
  const title = 'Cà phê <Tokyo> & đêm 🌃';
  await page.locator('#value-title').fill(title);
  await expect(
    page.locator('input[name=action-title][value=set]'),
  ).toBeChecked();
  await page.locator('#value-creator').fill('Tác giả một\nTác giả hai');
  await guards(page);
  await page.locator('#process').click();
  await expect(page.locator('#download')).toBeEnabled();
  await expect(page.locator('#metadata-fields')).toContainText(title);
  const hashes = await page.locator('#hashes dd').allTextContents();
  expect(hashes).toHaveLength(2);
  expect(hashes[0]).toBe(hashes[1]);
  const pending = page.waitForEvent('download');
  await page.locator('#download').click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('image.png');
  const outputPath = await download.path();
  if (!outputPath) throw new Error('Missing output');
  const bytes = new Uint8Array(await readFile(outputPath));
  expect((await readEditable(bytes)).values.title).toBe(title);
  expect(inspect(bytes).compressed).toEqual(inspect(pngFixture()).compressed);
  await page.locator('#view-original').click();
  await expect(page.locator('#metadata-fields')).not.toContainText(title);
  await page.locator('#view-processed').click();
  await expect(page.locator('#metadata-fields')).toContainText(title);
  const reportPending = page.waitForEvent('download');
  await page.locator('#report').click();
  const report = await reportPending;
  const reportPath = await report.path();
  if (!reportPath) throw new Error('Missing report');
  expect(await readFile(reportPath, 'utf8')).toContain('"view": "edited"');
  await page.locator('#filename').fill('../private.png');
  await expect(page.locator('#download')).toBeDisabled();
  await page.locator('#filename').fill('ready.png');
  await expect(page.locator('#download')).toBeEnabled();
  await page.locator('#verification > summary').click();
  await guards(page);
  await capture(page, info, 'edited-result', true);
  await page.locator('#reset-edits').click();
  await expect(page.locator('#download')).toBeDisabled();
  await expect(page.locator('#value-title')).toHaveValue('');
  await expect(
    page.locator('input[name=action-title][value=keep]'),
  ).toBeChecked();
  await page.locator('#clear').click();
  await expect(page.locator('#editor-workspace')).toBeHidden();
  expect(errors).toEqual([]);
  expect(outbound).toEqual([]);
});
test('field validation, XML isolation, native remove choices and stale outputs', async ({
  page,
}, info) => {
  await page.goto(app.url);
  await load(page);
  await page.locator('#value-CreateDate').fill('2026-02-30');
  await page.locator('#process').click();
  await expect(page.locator('#value-CreateDate')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.locator('#download')).toBeDisabled();
  await page.locator('#value-CreateDate').fill('2026-10-06T14:30:00+07:00');
  await page.locator('#process').click();
  await expect(page.locator('#download')).toBeEnabled();
  await page.locator('#advanced > summary').click();
  const sourceXml = await page.locator('#xmp-xml').inputValue();
  await page.locator('#xmp-xml').fill('<bad/>');
  await expect(page.locator('#download')).toBeDisabled();
  await page.locator('#apply-xml').click();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'error');
  await page.locator('#xmp-xml').fill(sourceXml);
  await page.locator('#apply-xml').click();
  await expect(page.locator('#download')).toBeEnabled();
  await expect(page.locator('#metadata-fields')).not.toContainText(
    '2026-10-06T14:30',
  );
  await guards(page);
  await capture(page, info, 'advanced-xml', true);
  await page.locator('#remove-xmp').check();
  await expect(page.locator('#value-title')).toBeDisabled();
  await expect(page.locator('#apply-xml')).toBeDisabled();
  await page.locator('#remove-other').check();
  await page.locator('#process').click();
  await expect(page.locator('#download')).toBeEnabled();
  await expect(page.locator('#metadata-fields')).not.toContainText(privateText);
  await page.locator('#clear').click();
  await expect(page.locator('#download')).toBeDisabled();
  await page.locator('#file').setInputFiles({
    name: 'invalid.png',
    mimeType: 'image/png',
    buffer: Buffer.from('invalid'),
  });
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#editor-workspace')).toBeHidden();
  await load(page);
  await page.locator('#process').click();
  await page.locator('#clear').click();
  await expect(page.locator('#editor-workspace')).toBeHidden();
  await expect(page.locator('#download')).toBeDisabled();
});
test('encoded JPEG and transparent WebP keep every displayed pixel after adding metadata', async ({
  page,
}) => {
  await page.goto(app.url);
  for (const mime of ['image/jpeg', 'image/webp'] as const) {
    const encoded = await page.evaluate((type) => {
      const canvas = document.createElement('canvas');
      canvas.width = 12;
      canvas.height = 8;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.fillStyle = '#72add7';
      ctx.fillRect(2, 2, 6, 4);
      return canvas.toDataURL(type, 0.9).split(',')[1];
    }, mime);
    expect(encoded).toBeTruthy();
    const original = new Uint8Array(Buffer.from(encoded ?? '', 'base64'));
    const output = await editMetadata(original, {
      changes: { title: { action: 'set', value: 'Unicode café' } },
    });
    const pixels = await page.evaluate(
      async ({ before, after, type }) => {
        async function decode(values: number[]): Promise<number[]> {
          const bitmap = await createImageBitmap(
            new Blob([new Uint8Array(values)], { type }),
          );
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas unavailable');
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          return Array.from(
            ctx.getImageData(0, 0, canvas.width, canvas.height).data,
          );
        }
        return { before: await decode(before), after: await decode(after) };
      },
      {
        before: Array.from(original),
        after: Array.from(output.bytes),
        type: mime,
      },
    );
    expect(pixels.after).toEqual(pixels.before);
    await page.locator('#file').setInputFiles({
      name: 'example.' + (mime === 'image/jpeg' ? 'jpg' : 'webp'),
      mimeType: mime,
      buffer: Buffer.from(original),
    });
    await expect(page.locator('#process')).toBeEnabled();
    await page.locator('#value-title').fill('Unicode café');
    await page.locator('#process').click();
    await expect(page.locator('#download')).toBeEnabled();
  }
});
test('keyboard radio groups, disclosures and forced colors retain native behavior', async ({
  page,
}, info) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto(app.url);
  await load(page);
  const keep = page.locator('input[name=action-title][value=keep]');
  await keep.focus();
  await keep.press('ArrowRight');
  await expect(
    page.locator('input[name=action-title][value=set]'),
  ).toBeChecked();
  await page.locator('#remove-other').focus();
  await page.locator('#remove-other').press('Space');
  await expect(page.locator('#remove-other')).toBeChecked();
  await page.locator('#advanced > summary').focus();
  await page.locator('#advanced > summary').press('Enter');
  await expect(page.locator('#advanced')).toHaveAttribute('open', '');
  await guards(page);
  await capture(page, info, 'forced-colors', true);
});

for (const lang of ['vi', 'en'] as const) {
  test(`responsive chrome, copy, controls and accessibility ${lang}`, async ({
    page,
  }, info) => {
    await page.goto(app.url + (lang === 'en' ? 'en/' : ''));
    await load(page);
    await page.locator('#advanced > summary').click();
    for (const dark of [false, true]) {
      if (dark) await page.locator('[data-theme-toggle]').click();
      for (const [width, height] of [
        [320, 800],
        [360, 800],
        [390, 844],
        [759, 1024],
        [760, 1024],
        [761, 1024],
        [768, 1024],
        [1024, 768],
        [1280, 900],
        [1440, 900],
      ]) {
        await page.setViewportSize({
          width: width ?? 320,
          height: height ?? 800,
        });
        await guards(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.locator('footer').scrollIntoViewIfNeeded();
        await capture(
          page,
          info,
          `${lang}-${dark ? 'dark' : 'light'}-${String(width)}-footer`,
        );
        await page.locator('h1').scrollIntoViewIfNeeded();
        await capture(
          page,
          info,
          `${lang}-${dark ? 'dark' : 'light'}-${String(width)}`,
        );
      }
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(axe.violations).toEqual([]);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await guards(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await capture(page, info, `${lang}-text-200`, true);
  });
  test(`initial HTML remains meaningful without JavaScript ${lang}`, async ({
    browser,
  }, info) => {
    const context = await browser.newContext({
      locale: 'vi-VN',
      javaScriptEnabled: false,
      viewport: { width: 320, height: 800 },
      colorScheme: 'dark',
    });
    const page = await context.newPage();
    await page.goto(app.url + (lang === 'en' ? 'en/' : ''));
    await expect(page.locator('#file')).toBeDisabled();
    await guards(page);
    expect(
      await page
        .locator('[data-brand-logo] img')
        .evaluate(
          (img) =>
            img instanceof HTMLImageElement &&
            img.currentSrc.endsWith('reversed.svg'),
        ),
    ).toBe(true);
    await capture(page, info, `${lang}-no-script`, true);
    await context.close();
  });
}
