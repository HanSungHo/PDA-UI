import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const designEvidenceDirectory = path.resolve('test-results/design-review');
mkdirSync(designEvidenceDirectory, { recursive: true });

test('dropdown opens with the design dimensions and supports keyboard interaction', async ({
  page,
}, testInfo) => {
  await page.goto('/iframe.html?id=base-components-dropdown-list--default&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });

  const combobox = page.getByRole('combobox');
  await expect(combobox).toBeVisible();
  await expect(page.locator('.q-select')).toHaveClass(/q-field--filled/);
  await expect(page.locator('.q-field__control')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await page.keyboard.press('Tab');
  await expect(combobox).toBeFocused();
  await expect
    .poll(() =>
      page
        .locator('.q-field__control')
        .evaluate((element) => getComputedStyle(element).outlineStyle),
    )
    .toBe('none');
  await expect
    .poll(() =>
      page
        .locator('.q-field__control')
        .evaluate((element) => getComputedStyle(element, '::after').transform),
    )
    .toBe('matrix(1, 0, 0, 1, 0, 0)');

  await page.keyboard.press('ArrowDown');
  const menu = page.getByRole('listbox');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('option')).toHaveCount(4);
  await expect(page.locator('.q-menu')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect
    .poll(() =>
      menu
        .getByRole('option')
        .first()
        .evaluate((element) => {
          const style = getComputedStyle(element);
          return `${style.minHeight}:${style.alignItems}`;
        }),
    )
    .toBe('36px:center');
  await expect(page.locator('.q-select__dropdown-icon')).toHaveClass(/rotate-180/);

  const control = page.locator('.q-field__control').first();
  const controlBox = await control.boundingBox();
  const menuBox = await page.locator('.q-menu').boundingBox();
  expect(controlBox?.height).toBe(56);
  expect(menuBox?.width).toBe(300);
  expect(menuBox?.height).toBe(144);

  if (testInfo.project.name === 'desktop-chromium') {
    await page.screenshot({ path: path.join(designEvidenceDirectory, 'dropdown-list-open.png') });
  }

  await page.keyboard.press('Escape');
  await expect(page.locator('.q-menu')).toBeHidden();
});

test('shows the selected option in the filled dropdown menu', async ({ page }, testInfo) => {
  await page.goto(
    '/iframe.html?id=base-components-dropdown-list--filled-reference&viewMode=story',
    { waitUntil: 'domcontentloaded' },
  );

  const combobox = page.getByRole('combobox');
  await expect(combobox).toBeVisible();
  await expect(page.locator('.q-field__label')).toHaveText('Filled');
  await expect(page.locator('.ds-field__header')).toHaveCount(0);
  await combobox.click();

  const menu = page.getByRole('listbox');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('option')).toHaveCount(5);
  await expect(page.locator('.q-menu')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect
    .poll(() =>
      menu
        .getByRole('option')
        .first()
        .evaluate((element) => {
          const style = getComputedStyle(element);
          return `${style.minHeight}:${style.alignItems}`;
        }),
    )
    .toBe('36px:center');
  const selectedOption = menu.getByRole('option', { name: 'Google' });
  await expect(selectedOption).toHaveAttribute('aria-selected', 'true');
  await expect(selectedOption).toHaveCSS('background-color', 'rgb(227, 238, 251)');
  expect((await page.locator('.q-menu').boundingBox())?.height).toBe(180);

  if (testInfo.project.name === 'desktop-chromium') {
    await page.screenshot({
      path: path.join(designEvidenceDirectory, 'dropdown-list-selected-open.png'),
    });
  }
});

test('keeps success and warning underline colors visible without filling the control', async ({
  page,
}) => {
  for (const status of ['success', 'warning'] as const) {
    await page.goto(`/iframe.html?id=base-components-dropdown-list--${status}&viewMode=story`, {
      waitUntil: 'domcontentloaded',
    });

    const field = page.locator('.ds-dropdown-list__control');
    const control = field.locator('.q-field__control');
    await expect(page.locator(`.ds-field--${status}`)).toBeVisible();
    await expect
      .poll(() => control.evaluate((element) => getComputedStyle(element).boxShadow))
      .toContain('inset');
    await expect
      .poll(() =>
        control.evaluate((element) => {
          const style = getComputedStyle(element, '::before');
          return `${style.opacity}:${style.height}`;
        }),
      )
      .toBe('0:56px');

    await field.click();
    await expect(field).toHaveClass(/q-field--highlighted/);
    await expect
      .poll(() => control.evaluate((element) => getComputedStyle(element, '::after').transform))
      .toBe('matrix(1, 0, 0, 1, 0, 0)');
  }
});

test('keeps the required marker visible beside the floating label', async ({ page }) => {
  await page.goto('/iframe.html?id=base-components-dropdown-list--required&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });

  const label = page.locator('.q-field__label');
  await expect(label).toHaveText('Required');
  await expect(page.locator('.ds-field__header')).toHaveCount(0);
  await expect
    .poll(() => label.evaluate((element) => getComputedStyle(element, '::after').content))
    .toBe('" *"');
  const combobox = page.getByRole('combobox', { name: 'Required', exact: true });
  await expect(combobox).toHaveAttribute('aria-required', 'true');
});

test('searchable dropdown filters options and selects the matching option', async ({ page }) => {
  await page.goto('/iframe.html?id=base-components-dropdown-list--searchable&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });

  const combobox = page.getByRole('combobox');
  await combobox.fill('120');

  const options = page.getByRole('option');
  await expect(options).toHaveCount(1);
  await expect(options).toContainText('Process 120');
  await options.click();

  await expect(page.locator('.q-menu')).toBeHidden();
  await expect(page.locator('.q-select')).toContainText('Process 120');
});

test('disabled and readonly dropdowns do not open their menu', async ({ page }) => {
  await page.goto('/iframe.html?id=base-components-dropdown-list--readonly&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });
  const readonlyControl = page.getByRole('combobox');
  await readonlyControl.click();
  await expect(page.locator('.q-menu')).toBeHidden();

  await page.goto('/iframe.html?id=base-components-dropdown-list--disabled&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });
  const disabledControl = page.getByRole('combobox');
  await expect(disabledControl).toBeDisabled();
  await disabledControl.click({ force: true });
  await expect(page.locator('.q-menu')).toBeHidden();
});
