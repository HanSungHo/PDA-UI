import { expect, test } from '@playwright/test';

test('Move In parent keeps the title-only header and design-sized mobile layout', async ({
  page,
}) => {
  await page.goto('/#/move-in/LOT-DEMO');

  const title = page.getByRole('heading', { name: 'MOVE IN' });
  await expect(title).toBeVisible();
  await expect(page.locator('.move-in-back')).toHaveCount(0);
  await expect(page.locator('.move-in-footer')).toBeVisible();

  const titleBox = await title.boundingBox();
  expect(titleBox?.x).toBe(16);
  expect(titleBox?.width).toBe(328);
  expect(titleBox?.height).toBe(28);
});

test('recipe popup and wafer dialog remain available on the parent screen', async ({ page }) => {
  await page.goto('/#/move-in/LOT-DEMO');

  const recipe = page.getByRole('combobox', { name: '진행 RCP' });
  await expect(recipe).toBeVisible();
  await recipe.click();

  const recipeOption = page.getByRole('option', { name: 'RCP-DEMO-01' });
  await expect(recipeOption).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();

  const skip = page.getByRole('checkbox', { name: '현공정 Skip' });
  await expect(skip).toBeDisabled();

  await page.getByRole('button', { name: 'W/H' }).click();
  const waferDialog = page.locator('.move-in-wafer-modal');
  await expect(waferDialog).toBeVisible();
  await expect(waferDialog.getByRole('checkbox')).toHaveCount(2);
  const firstWafer = waferDialog.getByRole('checkbox').first();
  await firstWafer.check();
  await expect(firstWafer).toBeChecked();
  await waferDialog.getByRole('button', { name: '확인' }).click();
  await expect(waferDialog).toBeHidden();
});
