import { expect, test } from '@playwright/test';

test('matches the empty KJ design and keeps the footer visible on short screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 350, height: 992 });
  await page.goto('/#/remote-furnace-kj');

  await expect(
    page.locator('.remote-furnace-kj-lot-row .ds-input__qinput input').first(),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '뒤로가기' })).toHaveCount(0);
  await expect(page.locator('#remote-furnace-kj-title')).toBeVisible();
  const recipeSelect = page.getByRole('combobox', { name: '진행 RCP' });
  const portSelect = page.getByRole('combobox', { name: 'PORT' });
  await expect(recipeSelect).toBeVisible();
  await expect(portSelect).toBeVisible();

  const equipmentInput = page.getByRole('textbox', { name: '진행장비' });
  const equipmentControl = equipmentInput
    .locator(
      'xpath=ancestor::label[contains(@class,"q-field")]//div[contains(@class,"q-field__control")]',
    )
    .first();
  await expect(equipmentInput).toBeFocused();
  await expect
    .poll(() => equipmentControl.evaluate((element) => getComputedStyle(element).outlineStyle))
    .toBe('none');
  await expect
    .poll(() => equipmentControl.evaluate((element) => getComputedStyle(element).borderBottomWidth))
    .toBe('2px');

  for (const select of [recipeSelect, portSelect]) {
    const value = select
      .locator(
        'xpath=ancestor::label[contains(@class,"q-field")]//span[contains(@class,"ellipsis")]',
      )
      .first();
    const control = select
      .locator(
        'xpath=ancestor::label[contains(@class,"q-field")]//div[contains(@class,"q-field__control")]',
      )
      .first();
    const [valueBox, controlBox] = await Promise.all([value.boundingBox(), control.boundingBox()]);
    expect(valueBox).not.toBeNull();
    expect(controlBox).not.toBeNull();
    expect(valueBox!.y).toBeGreaterThanOrEqual(controlBox!.y);
    expect(valueBox!.y + valueBox!.height).toBeLessThanOrEqual(controlBox!.y + controlBox!.height);
  }

  await expect(page.getByRole('button', { name: 'NO BATCH' })).toBeVisible();
  await expect(page.getByRole('button', { name: '온도설정' })).toBeVisible();
  await expect(page.getByText('MOVE IN할 LOT이 없습니다.')).toBeVisible();

  const shell = page.locator('.remote-furnace-kj-shell');
  await expect(shell).toHaveCSS('height', '920px');
  const footer = await page.locator('.remote-furnace-kj-footer').boundingBox();
  expect(footer).not.toBeNull();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(992);

  await page.setViewportSize({ width: 390, height: 844 });
  const shortFooter = await page.locator('.remote-furnace-kj-footer').boundingBox();
  expect(shortFooter).not.toBeNull();
  expect(shortFooter!.y + shortFooter!.height).toBeLessThanOrEqual(844);
});

test('uses Quasar dropdowns for the KJ recipe and port flow', async ({ page }) => {
  await page.setViewportSize({ width: 350, height: 992 });
  await page.goto('/#/remote-furnace-kj?lotId=LOT-KJ-001');

  await expect(page.locator('#remote-furnace-kj-title')).toBeVisible();
  const lotAndBatchInputs = page.locator('.remote-furnace-kj-lot-row .ds-input__qinput input');
  await expect(lotAndBatchInputs.nth(0)).toHaveValue('LOT-KJ-001');
  await expect(lotAndBatchInputs.nth(1)).toHaveValue('BATCH-KJ-01');
  await expect(page.getByRole('combobox', { name: '진행 RCP' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'PORT' })).toBeVisible();
  await expect(page.locator('[data-demo-annotation-toggle]')).toHaveCount(0);

  const lotInput = lotAndBatchInputs.nth(0);
  await lotInput.focus();
  const lotControl = page
    .locator('.remote-furnace-kj-lot-row .ds-input__qinput .q-field__control')
    .nth(0);
  await expect
    .poll(() => lotControl.evaluate((element) => getComputedStyle(element).outlineStyle))
    .toBe('none');

  const equipmentInput = page.getByRole('textbox', { name: '진행장비' });
  await equipmentInput.fill('EQP-KJ-011');
  await equipmentInput.press('Enter');
  await expect(equipmentInput).toHaveValue('KJ-01');

  const recipeSelect = page.getByRole('combobox', { name: '진행 RCP' });
  await recipeSelect.focus();
  const recipeControl = recipeSelect
    .locator(
      'xpath=ancestor::label[contains(@class,"q-field")]//div[contains(@class,"q-field__control")]',
    )
    .first();
  await recipeSelect.click();
  await expect
    .poll(() => recipeControl.evaluate((element) => getComputedStyle(element).outlineStyle))
    .toBe('none');
  await expect
    .poll(() => recipeControl.evaluate((element) => getComputedStyle(element, '::after').transform))
    .toBe('matrix(1, 0, 0, 1, 0, 0)');
  await page.getByRole('option', { name: 'RCP-KJ-01' }).click();

  const portSelect = page.getByRole('combobox', { name: 'PORT' });
  await portSelect.focus();
  const portControl = portSelect
    .locator(
      'xpath=ancestor::label[contains(@class,"q-field")]//div[contains(@class,"q-field__control")]',
    )
    .first();
  await portSelect.click();
  await expect
    .poll(() => portControl.evaluate((element) => getComputedStyle(element).outlineStyle))
    .toBe('none');
  await expect
    .poll(() => portControl.evaluate((element) => getComputedStyle(element, '::after').transform))
    .toBe('matrix(1, 0, 0, 1, 0, 0)');
  await page.getByRole('option', { name: '2', exact: true }).click();
  await expect(portSelect).toHaveValue('2');
  await expect(page.getByRole('button', { name: '취소' })).toBeVisible();
});

test('highlights the selected batch LOT with the Android selection colors', async ({ page }) => {
  await page.setViewportSize({ width: 350, height: 992 });
  await page.goto('/#/remote-furnace-kj?lotId=LOT-KJ-001');

  const selectedCell = page.locator('revo-grid .rgRow .rgCell').first();
  const cellBounds = await selectedCell.boundingBox();
  expect(cellBounds).not.toBeNull();

  await page.mouse.move(
    cellBounds!.x + cellBounds!.width / 2,
    cellBounds!.y + cellBounds!.height / 2,
  );
  await page.mouse.down();

  const selectedRow = page.locator('revo-grid .rgRow').first();
  await expect(selectedRow).toHaveClass(/base-revo-grid__row--selected/);
  await expect
    .poll(() =>
      selectedRow
        .locator('.rgCell')
        .evaluateAll((cells) =>
          cells.every(
            (cell) =>
              getComputedStyle(cell).backgroundColor === 'rgb(37, 197, 223)' &&
              getComputedStyle(cell).color === 'rgb(255, 255, 255)',
          ),
        ),
    )
    .toBe(true);

  await page.mouse.up();
  await expect(page).toHaveURL(/comment-list/);
});

test('colors FAIL and RUN batch rows and keeps the selected-row color on top', async ({ page }) => {
  await page.setViewportSize({ width: 350, height: 992 });
  await page.goto('/#/remote-furnace-kj?lotId=LOT-KJ-001&mockCase=row-statuses');

  const rows = page.locator('revo-grid .rgRow');
  await expect(rows).toHaveCount(3);
  const failRow = rows.nth(0);
  const runRow = rows.nth(1);
  const waitRow = rows.nth(2);
  await expect(failRow).toHaveClass(/is-fail/);
  await expect(runRow).toHaveClass(/is-run/);
  await expect(waitRow).not.toHaveClass(/is-(fail|run)/);

  await expect
    .poll(() =>
      failRow
        .locator('.rgCell')
        .evaluateAll((cells) =>
          cells.every(
            (cell) =>
              getComputedStyle(cell).backgroundColor === 'rgb(255, 0, 0)' &&
              getComputedStyle(cell).color === 'rgb(255, 255, 255)',
          ),
        ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      runRow
        .locator('.rgCell')
        .evaluateAll((cells) =>
          cells.every(
            (cell) =>
              getComputedStyle(cell).backgroundColor === 'rgb(0, 0, 255)' &&
              getComputedStyle(cell).color === 'rgb(255, 255, 255)',
          ),
        ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      waitRow
        .locator('.rgCell')
        .evaluateAll((cells) =>
          cells.every(
            (cell) =>
              getComputedStyle(cell).backgroundColor === 'rgba(0, 0, 0, 0)' &&
              getComputedStyle(cell).color === 'rgb(0, 0, 0)',
          ),
        ),
    )
    .toBe(true);

  const firstCell = failRow.locator('.rgCell').first();
  const bounds = await firstCell.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.down();

  await expect(failRow).toHaveClass(/base-revo-grid__row--selected/);
  await expect
    .poll(() =>
      failRow
        .locator('.rgCell')
        .evaluateAll((cells) =>
          cells.every(
            (cell) =>
              getComputedStyle(cell).backgroundColor === 'rgb(37, 197, 223)' &&
              getComputedStyle(cell).color === 'rgb(255, 255, 255)',
          ),
        ),
    )
    .toBe(true);
  await page.mouse.up();
  await expect(page).toHaveURL(/remote-furnace-kj/);
});

test('canceling the ETCH warning stops the MULTIMOVE warning sequence', async ({ page }) => {
  await page.setViewportSize({ width: 350, height: 992 });
  await page.goto('/#/remote-furnace-kj?lotId=LOT-KJ-001&mockCase=recipe-warnings');

  const equipmentInput = page.getByRole('textbox', { name: '진행장비' });
  await equipmentInput.fill('EQP-KJ-011');
  await equipmentInput.press('Enter');

  const dialog = page.locator('.remote-furnace-kj-message-modal');
  await expect(dialog).toContainText('Confirm the preceding ETCH machine.');
  await dialog.getByRole('button', { name: '취소' }).click();

  await expect(equipmentInput).toHaveValue('');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('Another LOT is moving in.')).toHaveCount(0);
});

test('acknowledging ETCH and MULTIMOVE warnings continues to interlock validation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 350, height: 992 });
  await page.goto('/#/remote-furnace-kj?lotId=LOT-KJ-001&mockCase=recipe-warnings');

  const equipmentInput = page.getByRole('textbox', { name: '진행장비' });
  await equipmentInput.fill('EQP-KJ-011');
  await equipmentInput.press('Enter');

  const dialog = page.locator('.remote-furnace-kj-message-modal');
  await expect(dialog).toContainText('Confirm the preceding ETCH machine.');
  await dialog.getByRole('button', { name: '확인' }).click();

  await expect(dialog).toContainText('Another LOT is moving in.');
  await dialog.getByRole('button', { name: '확인' }).click();

  await expect(dialog).not.toBeVisible();
  await expect(equipmentInput).toHaveValue('KJ-01');
});
