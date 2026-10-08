import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const designEvidenceDirectory = path.resolve('test-results/design-review');
mkdirSync(designEvidenceDirectory, { recursive: true });

test('checkbox preserves its visual state and interaction contract', async ({ page }, testInfo) => {
  await page.goto('/iframe.html?id=base-components-checkbox--interactive&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });
  const interactiveCheckbox = page.getByRole('checkbox', { name: 'Checkbox Text' });
  await interactiveCheckbox.click();
  await expect(interactiveCheckbox).toHaveAttribute('aria-checked', 'true');

  await page.goto('/iframe.html?id=base-components-checkbox--design-states&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });
  await expect(
    page.getByRole('checkbox', { name: 'Unchecked default', exact: true }),
  ).toHaveAttribute('aria-checked', 'false');
  await expect(
    page.getByRole('checkbox', { name: 'Checked disabled', exact: true }),
  ).toHaveAttribute('aria-disabled', 'true');
  await expect(
    page.getByRole('checkbox', { name: 'Indeterminate default', exact: true }),
  ).toHaveAttribute('aria-checked', 'mixed');
  await expect(
    page.getByRole('checkbox', { name: 'Indeterminate disabled', exact: true }),
  ).toHaveAttribute('aria-disabled', 'true');

  if (testInfo.project.name === 'desktop-chromium') {
    await page.screenshot({
      path: path.join(designEvidenceDirectory, 'checkbox-design-states.png'),
      fullPage: true,
    });
    await expect(page.locator('.checkbox-design-states')).toHaveScreenshot(
      'checkbox-design-states.png',
    );
  }
});

test('checkbox and radio focus states retain visible keyboard focus', async ({
  page,
}, testInfo) => {
  await page.goto('/iframe.html?id=base-components-checkbox--focused-unchecked&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });
  const checkbox = page.getByRole('checkbox', { name: 'Checkbox' });
  await expect(checkbox).toBeFocused();

  if (testInfo.project.name === 'desktop-chromium') {
    await page.screenshot({
      path: path.join(designEvidenceDirectory, 'checkbox-focused-unchecked.png'),
      fullPage: true,
    });
    await expect(checkbox).toHaveScreenshot('checkbox-focused-unchecked.png');
  }

  await page.goto('/iframe.html?id=base-components-radio--focused-checked&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });
  const radio = page.getByRole('radio', { name: 'Checked' });
  await expect(radio).toBeFocused();

  if (testInfo.project.name === 'desktop-chromium') {
    await page.screenshot({
      path: path.join(designEvidenceDirectory, 'radio-focused-checked.png'),
      fullPage: true,
    });
    await expect(radio).toHaveScreenshot('radio-focused-checked.png');
  }
});

test('radio group supports arrow-key selection and visual states', async ({ page }, testInfo) => {
  await page.goto('/iframe.html?id=base-components-radio--design-states&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });
  const group = page.getByRole('radiogroup', { name: 'Label text' }).first();
  const options = group.getByRole('radio');

  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toHaveAttribute('aria-checked', 'true');

  if (testInfo.project.name === 'desktop-chromium') {
    await page.screenshot({
      path: path.join(designEvidenceDirectory, 'radio-design-states.png'),
      fullPage: true,
    });
    await expect(page.locator('.radio-design-states')).toHaveScreenshot('radio-design-states.png');
  }

  await options.nth(0).focus();
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toHaveAttribute('aria-checked', 'true');
  await expect(options.nth(0)).toHaveAttribute('tabindex', '-1');
  await expect(options.nth(1)).toHaveAttribute('tabindex', '0');
});

test('radio group supports arrow keys after pointer activation', async ({ page }) => {
  await page.goto('/iframe.html?id=base-components-radio--design-states&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });
  const options = page.getByRole('radiogroup', { name: 'Label text' }).first().getByRole('radio');

  await options.nth(0).click();
  await page.keyboard.press('ArrowDown');

  await expect(options.nth(1)).toHaveAttribute('aria-checked', 'true');
});
