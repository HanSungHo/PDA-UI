import { expect, test } from '@playwright/test';

test('renders semantic BaseInput tones and presentation styles', async ({ page }) => {
  await page.goto('/iframe.html?id=base-components-input--idle-state&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });

  const inactiveRoot = page.locator('.ds-input');
  const inactiveInput = inactiveRoot.locator('.ds-input__qinput');
  const inactiveControl = inactiveInput.locator('.q-field__control');
  const inactiveNative = inactiveInput.locator('.q-field__native');

  await expect(inactiveRoot).toHaveClass(/ds-input--tone-inactive/);
  await expect(inactiveControl).toHaveCSS('background-color', 'rgb(74, 85, 101)');
  await expect(inactiveNative).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(inactiveNative).toHaveCSS('font-weight', '700');
  await expect(inactiveNative).toHaveCSS('text-overflow', 'ellipsis');
  await expect(inactiveNative).toHaveValue(
    'IDLE Port Status with a long machine description that should end with an ellipsis',
  );
  const inactiveTextOverflows = await inactiveNative.evaluate((element) => {
    if (!(element instanceof HTMLInputElement)) return false;

    const style = getComputedStyle(element);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return false;

    context.font = style.font;
    const textWidth = context.measureText(element.value).width;
    const availableWidth =
      element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return textWidth > availableWidth;
  });
  expect(inactiveTextOverflows).toBe(true);

  await page.goto('/iframe.html?id=base-components-input--error-text-tone&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });

  const errorTextRoot = page.locator('.ds-input');
  const errorTextInput = errorTextRoot.locator('.ds-input__qinput');
  await expect(errorTextInput.locator('.q-field__native')).toHaveCSS('color', 'rgb(220, 38, 39)');
  await expect(errorTextRoot).toHaveClass(/ds-field--default/);
  await expect(errorTextInput).not.toHaveClass(/q-field--error/);

  await page.goto('/iframe.html?id=base-components-input--semantic-tone&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });

  const brandRoot = page.locator('.ds-input');
  const brandInput = brandRoot.locator('.ds-input__qinput');
  await expect(brandRoot).toHaveClass(/ds-input--tone-brand/);
  await expect(brandInput.locator('.q-field__control')).toHaveCSS(
    'background-color',
    'rgb(21, 63, 101)',
  );
  await expect(brandInput.locator('.q-field__native')).toHaveCSS('color', 'rgb(255, 255, 255)');
});

test('keeps keyboard focus visible on readonly BaseInput controls', async ({ page }) => {
  await page.goto('/iframe.html?id=base-components-input--readonly&viewMode=story', {
    waitUntil: 'domcontentloaded',
  });

  const readonlyInput = page.locator('.ds-input--readonly input');
  const readonlyControl = page.locator('.ds-input--readonly .q-field__control');

  await expect(readonlyInput).toBeVisible();
  await page.keyboard.press('Tab');

  await expect(readonlyInput).toBeFocused();
  await expect(readonlyControl).toHaveCSS('outline-style', 'solid');
  await expect(readonlyControl).toHaveCSS('outline-width', '2px');
});
