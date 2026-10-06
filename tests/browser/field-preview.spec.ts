import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startServer } from '../../scripts/serve.ts';
import { editMetadata, readEditable } from '../../src/lib/editor.ts';
import { inspect } from '../../src/lib/container.ts';
import { properties } from '../../src/lib/xmp-properties.ts';
import type { Changes, Values } from '../../src/lib/xmp-properties.ts';
import { editorCopy } from '../../src/lib/editor-copy.ts';
import { presentationPng } from '../presentation-fixtures.ts';
import { capture } from './evidence.ts';
import {
  inspectInterface,
  inspectControlSurfaces,
  inspectControlIndicators,
  inspectHeaderBrand,
} from '../../.vinasig/standards/templates/web/interface.mjs';
import { inspectSiteChrome } from '../../.vinasig/standards/templates/web/site-chrome.mjs';

let app: Awaited<ReturnType<typeof startServer>>;
const values: Values = {
  title: 'Tiêu đề <Tokyo> & cà phê 🌃',
  description: 'Mô tả ảnh thử nghiệm với nhiều dòng.\n'.repeat(20),
  creator: 'Tác giả một\nSynthetic author two',
  rights: 'Synthetic copyright information',
  subject: 'Tokyo\ncà phê\n夜',
  CreateDate: '2026-10-06T14:30:00+07:00',
  ModifyDate: '2026-10-06',
  MetadataDate: '2026-10-06T07:30:00Z',
  CreatorTool: 'Synthetic creator tool',
  Rating: '0',
  Label: 'Synthetic label ' + 'long-value-'.repeat(40),
};
const changes = Object.fromEntries(
  properties.map((property) => [
    property.id,
    { action: 'set', value: values[property.id] },
  ]),
) as Changes;
let fixture: Uint8Array<ArrayBuffer>;

test.beforeAll(async () => {
  app = await startServer(path.resolve('dist'));
  fixture = (await editMetadata(presentationPng(false), { changes })).bytes;
});

test.afterAll(async () => {
  await app.close();
});

async function load(page: Page, bytes = fixture): Promise<void> {
  await page.locator('#file').setInputFiles({
    name: 'Synthetic café 東京 original.png',
    mimeType: 'image/png',
    buffer: Buffer.from(bytes),
  });
  await expect(page.locator('#editor-workspace')).toBeVisible();
  await expect(page.locator('#process')).toBeEnabled();
}

async function output(page: Page): Promise<Uint8Array<ArrayBuffer>> {
  await page.locator('#process').click();
  await expect(page.locator('#download')).toBeEnabled();
  const pending = page.waitForEvent('download');
  await page.locator('#download').click();
  const download = await pending;
  const file = await download.path();
  if (!file) throw new Error('Missing output file');
  return new Uint8Array(await readFile(file));
}

async function guards(page: Page): Promise<void> {
  expect(await page.evaluate(inspectInterface)).toEqual([]);
  expect(await page.evaluate(inspectControlSurfaces)).toEqual([]);
  expect(await page.evaluate(inspectControlIndicators)).toEqual([]);
  await expect.poll(() => page.evaluate(inspectHeaderBrand)).toEqual([]);
  expect(await page.evaluate(inspectSiteChrome)).toEqual([]);
  expect(await page.locator('[data-value]').count()).toBe(11);
  expect(await page.locator('input[type=radio]').count()).toBe(33);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

for (const lang of ['vi', 'en'] as const) {
  test(`source placeholders, field drafts and unchanged Keep output ${lang}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(app.url + (lang === 'en' ? 'en/' : ''));
    await load(page);
    const source = await readEditable(fixture);
    for (const property of properties) {
      await expect(page.locator('#value-' + property.id)).toHaveValue('');
      await expect(page.locator('#value-' + property.id)).toHaveAttribute(
        'placeholder',
        source.values[property.id],
      );
      await expect(
        page.locator(`input[name=action-${property.id}][value=keep]`),
      ).toBeChecked();
    }
    expect(await output(page)).toEqual(fixture);

    const title = page.locator('#value-title');
    const keep = page.locator('input[name=action-title][value=keep]');
    const set = page.locator('input[name=action-title][value=set]');
    await keep.focus();
    await keep.press('ArrowRight');
    await expect(set).toBeChecked();
    await expect(title).toHaveValue(source.values.title);
    const draft = 'New title café 東京 🌃';
    await title.fill(draft);
    await expect(set).toBeChecked();
    await keep.check();
    await expect(title).toHaveValue('');
    await expect(title).toHaveAttribute('placeholder', source.values.title);
    await expect(page.locator('#download')).toBeDisabled();
    expect(await output(page)).toEqual(fixture);
    await set.check();
    await expect(title).toHaveValue(draft);
    const edited = await output(page);
    expect((await readEditable(edited)).values.title).toBe(draft);
    expect(inspect(edited).compressed).toEqual(inspect(fixture).compressed);

    await page.locator('input[name=action-title][value=remove]').check();
    await expect(title).toBeDisabled();
    await expect(title).toHaveValue('');
    await expect(title).toHaveAttribute(
      'placeholder',
      editorCopy[lang].removedValue,
    );
    expect((await readEditable(await output(page))).values.title).toBe('');
    await set.check();
    await expect(title).toHaveValue(draft);
    await page.locator('#reset-edits').click();
    await expect(title).toHaveValue('');
    await expect(title).toHaveAttribute('placeholder', source.values.title);
    await set.check();
    await expect(title).toHaveValue(source.values.title);
    await keep.check();
    await page.locator('#remove-xmp').check();
    await expect(title).toBeDisabled();
    await expect(title).toHaveAttribute(
      'placeholder',
      editorCopy[lang].removedValue,
    );
    await page.locator('#remove-xmp').uncheck();
    await expect(title).toBeEnabled();
    await expect(title).toHaveAttribute('placeholder', source.values.title);

    await page.locator('input[name=action-Rating][value=set]').check();
    await page.locator('#value-Rating').fill('');
    await page.locator('#process').click();
    await expect(page.locator('#value-Rating')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await page.locator('input[name=action-Rating][value=keep]').check();
    await expect(page.locator('#value-Rating')).not.toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page.locator('#value-Rating')).toHaveAttribute(
      'placeholder',
      '0',
    );
    expect(await output(page)).toEqual(fixture);

    await load(page, presentationPng(false));
    for (const property of properties) {
      await expect(page.locator('#value-' + property.id)).toHaveValue('');
      await expect(page.locator('#value-' + property.id)).toHaveAttribute(
        'placeholder',
        editorCopy[lang].missingValue,
      );
    }
    await set.check();
    await expect(title).toHaveValue('');
    await expect(title).toHaveAttribute(
      'placeholder',
      editorCopy[lang].newValue,
    );
    await page.locator('#process').click();
    await expect(title).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#download')).toBeDisabled();
    await keep.check();
    expect(await output(page)).toEqual(presentationPng(false));
    await page.locator('#clear').click();
    await expect(page.locator('#editor-workspace')).toBeHidden();
    for (const property of properties) {
      await expect(page.locator('#value-' + property.id)).toHaveValue('');
      await expect(page.locator('#value-' + property.id)).toHaveAttribute(
        'placeholder',
        '',
      );
    }
    expect(errors).toEqual([]);
  });

  test(`equal field heights, source previews and responsive controls ${lang}`, async ({
    page,
  }, info) => {
    await page.goto(app.url + (lang === 'en' ? 'en/' : ''));
    await load(page);
    await page.evaluate(async () => document.fonts.ready);
    for (const dark of [false, true]) {
      if (
        (await page.locator('html').getAttribute('data-theme')) !==
        (dark ? 'dark' : 'light')
      )
        await page.locator('[data-theme-toggle]').click();
      for (const width of [
        320, 360, 390, 759, 760, 761, 768, 919, 920, 921, 991, 992, 993, 1024,
        1280, 1440,
      ]) {
        await page.setViewportSize({ width, height: 1000 });
        const heights = await page
          .locator('[data-value]')
          .evaluateAll((fields) =>
            fields.map((field) => field.getBoundingClientRect().height),
          );
        expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1);
        await guards(page);
        if ([320, 768, 1440].includes(width)) {
          await page.locator('#property-fields').evaluate((element) => {
            element.scrollIntoView({ block: 'start' });
          });
          await capture(
            page,
            info,
            `source-preview-${lang}-${dark ? 'dark' : 'light'}-${String(width)}`,
          );
        }
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
    await page.locator('#property-fields').evaluate((element) => {
      element.scrollIntoView({ block: 'start' });
    });
    await capture(page, info, `source-preview-${lang}-text-200`);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '';
    });
    await page.emulateMedia({ forcedColors: 'active' });
    await guards(page);
    await page.locator('#property-fields').evaluate((element) => {
      element.scrollIntoView({ block: 'start' });
    });
    await capture(page, info, `source-preview-${lang}-forced-colors`);
  });
}
