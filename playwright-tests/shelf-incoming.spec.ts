import { expect, test } from '@playwright/test';

test('eSheet S opens Shelf Incoming and close returns to its caller', async ({ page }) => {
  await page.goto('/#/esheet');
  await page.getByRole('textbox', { name: 'LOT', exact: true }).fill('LOT-DRAFT');
  await page.getByRole('button', { name: 'S', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'SHELF 입고' })).toBeVisible();
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page).toHaveURL(/#\/esheet$/);
  await expect(page.getByRole('textbox', { name: 'LOT', exact: true })).toHaveValue('LOT-DRAFT');
});

test('Shelf Incoming matches Figma search geometry and keeps 12px content gutters', async ({
  page,
}) => {
  await page.goto('/#/shelf-incoming');
  await expect(page.locator('.ds-empty-state__icon-glyph--filled')).toBeVisible();
  const contentCard = page.getByRole('region', { name: 'SHELF 및 LOT 조회' });

  const mobileCard = await contentCard.boundingBox();
  expect(mobileCard).not.toBeNull();
  expect(mobileCard?.x).toBe(12);
  expect(mobileCard?.width).toBe(326);
  expect(mobileCard?.height).toBe(168);

  const searchRows = page.locator('.shelf-incoming__search');
  const firstRow = await searchRows.nth(0).boundingBox();
  const firstInput = await page.locator('.shelf-incoming__search .ds-input').nth(0).boundingBox();
  const firstLookup = await page
    .getByRole('button', { name: '조회', exact: true })
    .nth(0)
    .boundingBox();
  const secondRow = await searchRows.nth(1).boundingBox();
  const secondInput = await page.locator('.shelf-incoming__search .ds-input').nth(1).boundingBox();
  const secondLookup = await page
    .getByRole('button', { name: '조회', exact: true })
    .nth(1)
    .boundingBox();
  const deleteLot = await page.getByRole('button', { name: '선택 LOT 삭제' }).boundingBox();

  expect(firstRow).toMatchObject({ x: 24, y: 84, width: 302 });
  expect(firstInput?.width).toBe(244);
  expect(firstLookup?.width).toBe(50);
  expect(secondRow).toMatchObject({ x: 24, y: 160, width: 302 });
  expect(secondInput?.width).toBe(202);
  expect(secondLookup?.width).toBe(50);
  expect(deleteLot?.width).toBe(34);
  expect(
    await page
      .getByRole('button', { name: '조회', exact: true })
      .nth(0)
      .locator('.ds-btn__label')
      .evaluate((label) => label.scrollWidth <= label.clientWidth),
  ).toBe(true);
  expect(
    await page
      .getByRole('button', { name: '선택 LOT 삭제' })
      .locator('.ds-btn__label')
      .evaluate((label) => label.scrollWidth <= label.clientWidth),
  ).toBe(true);
  await page.getByRole('textbox', { name: 'SHELF', exact: true }).blur();
  await expect(contentCard).toHaveScreenshot('shelf-incoming-product-info.png', {
    animations: 'disabled',
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  const desktopCard = await contentCard.boundingBox();
  expect(desktopCard).not.toBeNull();
  expect(desktopCard?.x).toBe(12);
  expect(desktopCard?.width).toBe(1256);
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
