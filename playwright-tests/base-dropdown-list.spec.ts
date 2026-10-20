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
  await expect(page.locator('.q-select')).toHaveClass(/q-field--outlined/);
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
  await expect(page.locator('.q-select__dropdown-icon')).toHaveClass(/rotate-180/);

  const control = page.locator('.q-field__control').first();
  const controlBox = await control.boundingBox();
  const menuBox = await page.locator('.q-menu').boundingBox();
  expect(controlBox?.height).toBe(40);
  expect(menuBox?.width).toBe(300);
  expect(menuBox?.height).toBe(180);

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
  await expect(page.locator('.ds-field__label')).toHaveText('Filled');
  await expect(page.locator('.q-field__label')).toHaveCount(0);
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

test('keeps success and warning outlines visible when focused', async ({ page }) => {
  for (const [status, color] of [
    ['success', 'rgb(23, 163, 74)'],
    ['warning', 'rgb(234, 88, 11)'],
  ]) {
    await page.goto(`/iframe.html?id=base-components-dropdown-list--${status}&viewMode=story`);
    const control = page.locator('.q-field__control');
    await expect
      .poll(() => control.evaluate((e) => getComputedStyle(e, '::before').borderColor))
      .toBe(color);
    await page.getByRole('combobox').focus();
    await expect
      .poll(() => control.evaluate((e) => getComputedStyle(e, '::after').borderColor))
      .toBe(color);
  }
});

test('external label names and focuses the control with one required marker', async ({ page }) => {
  await page.goto('/iframe.html?id=base-components-dropdown-list--required&viewMode=story');
  const label = page.locator('.ds-field__label');
  const combobox = page.getByRole('combobox', { name: 'Required', exact: true });
  await expect(label).toHaveText('Required *');
  await expect(page.locator('.ds-field__required')).toHaveCount(1);
  await expect(page.locator('.q-field__label')).toHaveCount(0);
  await expect(combobox).toHaveAttribute('aria-required', 'true');
  const labelBox = await label.boundingBox();
  const controlBox = await page.locator('.q-field__control').boundingBox();
  expect(labelBox.y + labelBox.height).toBeLessThan(controlBox.y);
  await label.click();
  await expect(combobox).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('searchable dropdown filters options and selects the matching option', async ({ page }) => {
  await page.goto('/iframe.html?id=base-components-dropdown-list--searchable&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });

  const combobox = page.getByRole('combobox');
  await page.locator('.ds-field__label').click();
  await expect(combobox).toBeFocused();
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

for (const [story, height, fontSize] of [
  ['default', 40, '16px'],
  ['small', 36, '14px'],
  ['large', 64, '16px'],
] as const) {
  test(`${story} preserves its documented control dimensions`, async ({ page }) => {
    await page.goto(`/iframe.html?id=base-components-dropdown-list--${story}&viewMode=story`);
    const control = page.locator('.q-field__control');
    await expect(control).toHaveCSS('height', `${height}px`);
    await expect(page.locator('.q-field__native').first()).toHaveCSS('font-size', fontSize);
    await expect(control).toHaveCSS('border-radius', '4px');
    await expect
      .poll(() => control.evaluate((e) => getComputedStyle(e, '::after').borderColor))
      .toBe('rgba(0, 0, 0, 0)');
    const labelBox = await page.locator('.ds-field__label').boundingBox();
    const controlBox = await control.boundingBox();
    expect(controlBox!.y - (labelBox!.y + labelBox!.height)).toBe(8);
    await page.getByRole('combobox').focus();
    await expect
      .poll(() => control.evaluate((e) => getComputedStyle(e, '::after').borderColor))
      .toBe('rgb(2, 176, 165)');
    await expect
      .poll(() => control.evaluate((e) => getComputedStyle(e, '::after').opacity))
      .toBe('1');
  });
}

test('outlined error and disabled states match the Select reference', async ({ page }) => {
  for (const story of ['error', 'small-error']) {
    await page.goto(`/iframe.html?id=base-components-dropdown-list--${story}&viewMode=story`);
    await expect(page.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('combobox').focus();
    await expect
      .poll(() =>
        page
          .locator('.q-field__control')
          .evaluate((e) => getComputedStyle(e, '::after').borderColor),
      )
      .toBe('rgb(220, 38, 39)');
    await expect
      .poll(() =>
        page
          .locator('.q-field__control')
          .evaluate((e) => getComputedStyle(e, '::before').borderColor),
      )
      .toBe('rgb(220, 38, 39)');
  }
  for (const story of ['disabled', 'small-disabled']) {
    await page.goto(`/iframe.html?id=base-components-dropdown-list--${story}&viewMode=story`);
    await expect(page.getByRole('combobox')).toBeDisabled();
    await expect
      .poll(() =>
        page
          .locator('.q-field__control')
          .evaluate((e) => getComputedStyle(e, '::after').borderColor),
      )
      .toBe('rgba(0, 0, 0, 0)');
    await expect
      .poll(() =>
        page
          .locator('.q-field__control')
          .evaluate((e) => getComputedStyle(e, '::before').borderStyle),
      )
      .toBe('solid');
    await expect(page.locator('.q-field__control')).toHaveCSS(
      'background-color',
      'rgb(229, 231, 235)',
    );
  }
});

test('selecting another option updates the displayed value', async ({ page }) => {
  await page.goto('/iframe.html?id=base-components-dropdown-list--filled-reference&viewMode=story');
  await page.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Facebook', exact: true }).click();
  await expect(page.locator('.q-menu')).toBeHidden();
  await expect(page.locator('.q-field__native')).toContainText('Facebook');
});
