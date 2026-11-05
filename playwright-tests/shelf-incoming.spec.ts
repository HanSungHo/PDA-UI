import { expect, type Locator, test } from '@playwright/test';

test('eSheet S opens Shelf Incoming and close returns to its caller', async ({ page }) => {
  await page.goto('/#/esheet');
  await page.getByRole('textbox', { name: 'LOT', exact: true }).fill('LOT-DRAFT');
  await page.getByRole('button', { name: 'S', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'SHELF 입고' })).toBeVisible();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page).toHaveURL(/#\/esheet$/);
  await expect(page.getByRole('textbox', { name: 'LOT', exact: true })).toHaveValue('LOT-DRAFT');
});

test('Shelf Incoming matches the Figma 4116:11668 frame at 360 by 720 without page scroll', async ({
  page,
}) => {
  await page.goto('/#/shelf-incoming');
  await expect(page.locator('.ds-empty-state__icon-glyph--filled')).toBeVisible();
  const box = async (locator: Locator) => (await locator.boundingBox())!;
  const searchCard = page.getByRole('region', { name: 'SHELF 및 LOT 조회' });
  const lookups = page.getByRole('button', { name: '조회', exact: true });

  // Cards: 88px search card, the LOT grid fills the rest, 4px above the commands and the footer.
  expect(await box(searchCard)).toMatchObject({ x: 12, y: 40, width: 336, height: 88 });
  expect(await box(page.getByRole('region', { name: 'LOT 목록' }))).toMatchObject({
    x: 12,
    y: 136,
    width: 336,
    height: 448,
  });

  // SHELF / LOT No. use a 65px label column; 조회 and D hug their labels.
  for (const [name, y] of [
    ['SHELF', 48],
    ['LOT No.', 88],
  ] as const) {
    const control = page.getByRole('textbox', { name, exact: true });
    const field = await box(page.locator('.shelf-incoming__field').filter({ has: control }));
    expect(field).toMatchObject({ x: 20, y, height: 32 });
  }
  const shelfLookup = await box(lookups.nth(0));
  expect(shelfLookup.x + shelfLookup.width).toBeCloseTo(340, 0);
  expect(shelfLookup.width).toBeLessThanOrEqual(44);
  const deleteLot = await box(page.getByRole('button', { name: '선택 LOT 삭제' }));
  expect(deleteLot.x + deleteLot.width).toBeCloseTo(340, 0);
  expect(deleteLot.width).toBeLessThanOrEqual(28);

  // SHELF IN / CART IN / SHELF OUT / CART OUT: a 2 by 2 grid of 164 by 36 buttons.
  const commandBoxes = [
    ['SHELF IN', 12, 592],
    ['CART IN', 184, 592],
    ['SHELF OUT', 12, 636],
    ['CART OUT', 184, 636],
  ] as const;
  for (const [name, x, y] of commandBoxes) {
    expect(await box(page.getByRole('button', { name, exact: true }))).toMatchObject({
      x,
      y,
      width: 164,
      height: 36,
    });
  }
  expect(await box(page.getByRole('button', { name: '닫기', exact: true }))).toMatchObject({
    x: 12,
    y: 680,
    width: 336,
    height: 36,
  });
  expect(
    await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.scrollHeight,
    ]),
  ).toEqual([360, 720]);

  await page.getByRole('textbox', { name: 'SHELF', exact: true }).blur();
  await expect(page).toHaveScreenshot('shelf-incoming-360x720.png', { animations: 'disabled' });

  await page.setViewportSize({ width: 1280, height: 900 });
  expect(await box(searchCard)).toMatchObject({ x: 12, width: 1256 });
});

test('SHELF lookup, RevoGrid slot selection, D deletion, reserved warning and partial-error reset', async ({
  page,
}) => {
  await page.goto('/#/shelf-incoming');
  const shelf = page.getByRole('textbox', { name: 'SHELF', exact: true });
  const lot = page.getByRole('textbox', { name: 'LOT No.', exact: true });
  await expect(page.getByText('EMPTY', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'SHELF IN', exact: true })).toBeDisabled();
  await shelf.fill('shelf-01');
  await page.getByRole('button', { name: '조회', exact: true }).nth(0).click();
  await expect(page.getByRole('button', { name: 'SHELF IN', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'CART IN', exact: true })).toBeDisabled();
  for (const id of ['LOT-01', 'LOT-02']) {
    await lot.fill(id);
    await page.getByRole('button', { name: '조회', exact: true }).nth(1).click();
    await expect(
      page.getByRole('button', { name: new RegExp(`LOT 위치 \\d+: ${id}$`) }),
    ).toBeVisible();
  }
  const grid = page.getByRole('treegrid', { name: 'LOT 위치' });
  await expect(grid).toBeVisible();
  await expect(page.getByRole('button', { name: /^LOT 위치 \d+:/ })).toHaveCount(24);
  const firstCell = page.getByRole('button', { name: 'LOT 위치 1: LOT-01', exact: true });
  await firstCell.focus();
  await expect(firstCell).toBeFocused();
  await firstCell.press('Enter');
  await expect(firstCell).toHaveAttribute('aria-pressed', 'true');
  await firstCell.press('Space');
  await expect(firstCell).toHaveAttribute('aria-pressed', 'false');
  await firstCell.press('Enter');
  await expect(firstCell).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '선택 LOT 삭제' }).click();
  await expect(
    page.getByRole('button', { name: 'LOT 위치 1: 비어 있음', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'LOT 위치 2: LOT-02', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '닫기', exact: true })).toBeInViewport();
  await lot.fill('LOT-RESERVED');
  await page.getByRole('button', { name: '조회', exact: true }).nth(1).click();
  await expect(page.getByText(/자동화 예약중인 LOT/)).toBeVisible();
  await page.getByRole('button', { name: '확인', exact: true }).click();
  await expect(lot).toBeFocused();
  await lot.fill('LOT-PARTIAL');
  await page.getByRole('button', { name: '조회', exact: true }).nth(1).click();
  const submitted = page.waitForRequest((request) => request.url().endsWith('/hifos/lotinshelf'));
  await page.getByRole('button', { name: 'SHELF IN', exact: true }).click();
  expect((await submitted).postData()).toContain('LOT-RESERVED|LOT-02|LOT-PARTIAL');
  await expect(page.getByText('LOT-PARTIAL', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '확인', exact: true }).click();
  await expect(page.getByText('EMPTY', { exact: true })).toBeVisible();
  await expect(shelf).toHaveValue('');
  await expect(shelf).toBeFocused();
});

test('barcode Enter preserves category validation and shows invalid LOT errors', async ({
  page,
}) => {
  await page.goto('/#/shelf-incoming');
  const shelf = page.getByRole('textbox', { name: 'SHELF', exact: true });
  const lot = page.getByRole('textbox', { name: 'LOT No.', exact: true });
  await shelf.fill('EQP-$SHELF-01#');
  await shelf.press('Enter');
  await expect(shelf).toHaveValue('$SHELF-01');
  await expect(lot).toBeFocused();
  await lot.fill('CART IN#');
  await lot.press('Enter');
  await expect(page.getByText('SHELF를 선택 후 CART 기능을 시도하셨습니다.')).toBeVisible();
  await page.getByRole('button', { name: '확인', exact: true }).click();
  await lot.fill(' BAD#');
  await lot.press('Enter');
  await expect(page.getByText('입고가 불가능한 LOT 입니다.')).toBeVisible();
  await page.getByRole('button', { name: '확인', exact: true }).click();
  await expect(lot).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: '닫기', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
