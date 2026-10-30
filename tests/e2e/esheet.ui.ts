import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('http://127.0.0.1:8080/**', async (route) => {
    const url = new URL(route.request().url());
    url.port = '8180';
    const response = await route.fetch({ url: url.toString() });
    await route.fulfill({ response });
  });
});

test('matches eSheet Figma geometry and retains legacy-only fields at 360 by 720', async ({
  page,
}) => {
  // Figma activity_esheet (1551:44251) is a 360x720 frame; the page fits it without scrolling.
  await page.setViewportSize({ width: 360, height: 720 });
  const infoRequestPromise = page.waitForRequest(
    (request) => request.url().endsWith('/message/send') && request.method() === 'POST',
  );
  await page.goto('/#/esheet?lotId=WP00001');
  const infoRequest = await infoRequestPromise;
  const infoBody = infoRequest.postDataJSON() as {
    messageName: string;
    payload: Record<string, string>;
  };
  expect(infoBody.messageName).toBe('ESHEETINFO');
  expect(infoBody.payload.LOTID).toBe('WP00001');

  await expect(page.getByRole('heading', { name: 'eSheet (OPERATOR_NAME)' })).toBeVisible();
  await expect(page.getByRole('treegrid', { name: '공정표' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '정비 항목' })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'CUT OFF' })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'TAT' })).toHaveValue('');
  await expect(page.locator('.status-chip--quantity')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)',
  );
  await expect(page.locator('.lot-search .q-icon')).toHaveCSS('color', 'rgb(3, 7, 18)');
  for (const [name, value] of [
    ['BAY', 'BP04'],
    ['JOB CODE', '20151115'],
    ['현재 공정', 'BARC COATING'],
    ['RECIPE', ''],
    ['투입시간', ''],
    ['잔여', '4P02-51,52,5P02-07~12,1'],
    ['진행RCP', ''],
    ['기준장비', 'PHOTO'],
    ['ENGR', 'PHOTO'],
    ['제품', 'P-DM-TEST-6F'],
    ['ENGR2', ''],
  ] as const) {
    await expect(page.getByRole('textbox', { name, exact: true })).toHaveValue(value);
  }

  // Figma: header 36, cards 8px apart with 8px padding, footer 44 (BaseScreen header/footer).
  const expectedBoxes = [
    ['.ds-screen__header', { x: 0, y: 0, width: 360, height: 36 }],
    ['.summary-grid', { x: 12, y: 40, width: 336, height: 88 }],
    ['.lot-card', { x: 12, y: 136, width: 336, height: 240 }],
    ['.process-card', { x: 12, y: 384, width: 336, height: 192 }],
    ['.base-revo-grid__viewport', { x: 20, y: 392, width: 320, height: 176 }],
    ['.details-card', { x: 12, y: 584, width: 336, height: 88 }],
    ['.lot-number', { x: 20, y: 632, width: 320, height: 32 }],
    ['.ds-screen__footer', { x: 0, y: 676, width: 360, height: 44 }],
  ] as const;

  for (const [selector, expected] of expectedBoxes) {
    const box = await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    expect(box).toMatchObject(expected);
  }

  const firstHeader = page.locator('.rgHeaderCell').first();
  await expect(firstHeader).toHaveText('공정명');
  await expect(firstHeader).toHaveCSS('background-color', 'rgb(2, 176, 165)');
  await expect(firstHeader).toHaveCSS('color', 'rgb(249, 250, 251)');
  await expect(
    page
      .locator('.rgRow.esheet-process-row--comment .rgCell:not(.esheet-process-grid__process-cell)')
      .first(),
  ).toHaveCSS('background-color', 'rgb(255, 0, 0)');
  await expect(
    page.locator('.rgRow.esheet-process-row--comment .esheet-process-grid__process-cell').first(),
  ).toHaveCSS('background-color', 'rgb(255, 255, 208)');
  await expect(page.locator('.esheet-process-grid__process-cell').nth(1)).toHaveText(
    'BARC COATING',
  );
  await expect(page.locator('.esheet-process-grid__process-cell').nth(1)).toHaveCSS(
    'background-color',
    'rgb(0, 128, 255)',
  );
  await expect(page.locator('.esheet-process-grid__process-cell').nth(1)).toHaveCSS(
    'color',
    'rgb(255, 255, 255)',
  );
  expect(
    await page.locator('.esheet-process-grid__process-cell').nth(1).boundingBox(),
  ).toMatchObject({
    x: 20,
    y: 472,
    width: 140,
    height: 40,
  });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(720);
  for (const control of await page.locator('.esheet .q-field__control').all()) {
    expect((await control.boundingBox())?.height).toBe(32);
  }
  await expect(page.getByRole('button', { name: 'LOT 조회' })).toHaveText('조회');
  // BaseScreen actions: four equal 36px buttons, so 母 LOT is not truncated.
  for (const name of ['母 LOT', 'PCM', 'F', '닫기']) {
    const button = page.getByRole('button', { name, exact: true });
    expect(await button.boundingBox()).toMatchObject({ y: 680, width: 78, height: 36 });
    expect(await button.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
  }
  await expect(page.getByRole('checkbox', { name: '공정번호' })).toBeVisible();
  await expect(page.getByRole('button', { name: '母 LOT' })).toBeInViewport();
  await expect(page.getByRole('button', { name: '닫기' })).toBeInViewport();

  await page.locator('.ds-screen__header').click();
  await expect(page).toHaveScreenshot('esheet-360x720.png', { animations: 'disabled' });
});

test('keeps every field reachable and the grid scrollbars in range at 640 and 800 high', async ({
  page,
}) => {
  for (const height of [640, 800]) {
    await page.setViewportSize({ width: 360, height });
    await page.goto('/#/esheet?lotId=WP00001');
    await expect(page.getByRole('textbox', { name: '제품' })).toHaveValue('P-DM-TEST-6F');

    const grid = await page.locator('.base-revo-grid__viewport').boundingBox();
    expect(grid?.height).toBeGreaterThanOrEqual(80);
    const thumb = await page
      .getByRole('scrollbar', { name: 'Vertical table scrollbar' })
      .boundingBox();
    if (thumb && grid) expect(thumb.height).toBeLessThan(grid.height);

    // The footer stays on screen; the cards scroll above it when the screen is short.
    await expect(page.getByRole('button', { name: '닫기' })).toBeInViewport();
    await page.getByRole('textbox', { name: '제품' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('textbox', { name: '제품' })).toBeInViewport();
    await expect(page.getByRole('checkbox', { name: '공정번호' })).toBeInViewport();
  }
});

test('checks the Furnace destination through the shared message gateway', async ({ page }) => {
  const cases = [
    { lotId: 'WP00001', route: /#\/remote-furnace-kj\?lotId=WP00001/ },
    { lotId: 'WP-KEC', route: /#\/remote-furnace-kec\?LOTID=WP-KEC/ },
    { lotId: 'WP-OTHER', route: /#\/furnace-remote\?LOTID=WP-OTHER/ },
  ];

  for (const { lotId, route } of cases) {
    await page.goto(`/#/esheet?lotId=${lotId}`);
    const processCell = page.locator('.esheet-process-grid__process-cell').filter({
      hasText: 'BARC COATING',
    });
    const drawer = page.locator('.draw-menu-list');
    await processCell.click();
    await expect(drawer).toHaveAttribute('aria-hidden', 'false');

    const furnaceCheckPromise = page.waitForRequest((request) => {
      if (!request.url().endsWith('/message/send') || request.method() !== 'POST') return false;
      return request.postDataJSON().messageName === 'FURNACE_KJCHECK';
    });
    await drawer.locator('[data-action-id="furnace-auto"]').click();
    const furnaceCheck = await furnaceCheckPromise;
    expect(furnaceCheck.postDataJSON().payload).toEqual({ LOTID: lotId });
    await expect(page).toHaveURL(route);
  }
});

test('retains legacy Q-time, priority, rework, CESC, and metrology states', async ({ page }) => {
  await page.goto('/#/esheet?lotId=WP-QTIME');

  await expect(page.getByRole('textbox', { name: '정비 항목' })).toHaveValue('긴급 Q-T 대상');
  await expect(page.locator('.summary-grid .esheet-field--alert .q-field__control')).toHaveCSS(
    'background-color',
    'rgb(255, 0, 0)',
  );
  await expect(page.getByRole('textbox', { name: '정비 항목' })).toHaveCSS(
    'color',
    'rgb(255, 255, 0)',
  );
  await expect(page.locator('.status-chip--priority-yellow')).toHaveText('H1');
  await expect(page.locator('.status-chip--priority-yellow')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 0)',
  );
  await expect(page.locator('.status-chip--lot-status-rework')).toHaveCSS(
    'background-color',
    'rgb(0, 0, 0)',
  );
  await expect(page.locator('.status-chip--lot-status-rework')).toHaveText('WAIT');
  await expect(page.getByRole('textbox', { name: 'JOB CODE' })).toHaveValue('20151115');
  await expect(page.locator('.lot-card__job-code--orange .q-field__control')).toHaveCSS(
    'background-color',
    'rgb(255, 140, 0)',
  );
  await expect(page.getByRole('textbox', { name: 'ENGR2' })).toHaveValue('ENGR-SECONDARY');
  await expect(page.locator('.detail-field--engr2-warning .q-field__control')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 0)',
  );
  await expect(page.getByRole('textbox', { name: '기준장비' })).toHaveValue('2026-10-23 08:30');
});

test('shows the running equipment and red real recipe for a moved-in LOT', async ({ page }) => {
  await page.goto('/#/esheet?lotId=WP-MOVEIN');

  await expect(page.getByRole('textbox', { name: '투입시간' })).toHaveValue('2026-09-15 10:30:00');
  await expect(page.getByRole('textbox', { name: 'RECIPE', exact: true })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: '기준장비' })).toHaveValue('EQP-01');
  await expect(page.getByRole('textbox', { name: '진행RCP' })).toHaveValue('RCP-THK-01');
  await expect(page.locator('.lot-card .esheet-field--alert .q-field__control')).toHaveCSS(
    'background-color',
    'rgb(249, 7, 22)',
  );
  await expect(page.getByRole('textbox', { name: '진행RCP' })).toHaveCSS(
    'color',
    'rgb(255, 255, 0)',
  );

  await page.getByRole('textbox', { name: '기준장비' }).dblclick();
  await expect(page.locator('.esheet-notice-dialog')).toHaveCount(0);
});

test('retains the conditional legacy automotive detail fields', async ({ page }) => {
  await page.goto('/#/esheet');
  await page.getByRole('textbox', { name: 'LOT' }).fill('WP-AUTO');
  await page.getByRole('button', { name: 'LOT 조회' }).click();

  await expect(page.getByRole('textbox', { name: 'ENGR2' })).toHaveValue('ENGR-SECONDARY');
  await page.getByRole('textbox', { name: '기준장비' }).dblclick();
  await expect(page.locator('.esheet-notice-dialog')).toContainText(
    /PHOTO\s+GoldenPath 제한장비\s+EQP-LIMIT-01/,
  );
  await page.locator('.esheet-notice-dialog').getByRole('button', { name: '확인' }).click();
  await expect(page.getByRole('img', { name: 'Safe launch automotive lot' })).toBeVisible();
  await expect(page.locator('.automotive-indicator--safe-launch')).toHaveCSS(
    'color',
    'rgb(249, 113, 113)',
  );
});

test('preserves the legacy eSheet action dialogs and selected process drawer flow', async ({
  page,
}) => {
  await page.goto('/#/esheet?lotId=WP-COMMENT');

  const barcRow = page.locator('.esheet-process-grid__process-cell').filter({
    hasText: 'BARC COATING',
  });
  const commentRows = page.locator('.rgRow.esheet-process-row--comment');
  await expect(commentRows).toHaveCount(2);
  await expect(commentRows.nth(0).locator('.esheet-process-grid__process-cell')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 208)',
  );
  await expect(commentRows.nth(1).locator('.rgCell').first()).toHaveCSS(
    'background-color',
    'rgb(255, 0, 0)',
  );

  const selectedCommentRow = commentRows.nth(1);
  await selectedCommentRow.locator('.rgCell').first().click();
  await expect(selectedCommentRow).toHaveClass(/esheet-process-row--selected/);
  await expect(selectedCommentRow).toHaveCSS('outline-width', '3px');
  await expect(selectedCommentRow).toHaveCSS('outline-color', 'rgb(19, 8, 66)');
  const selectedPinnedCommentRow = commentRows.nth(0);
  await expect(selectedPinnedCommentRow).toHaveClass(/esheet-process-row--selected/);
  await expect(selectedPinnedCommentRow).toHaveCSS('outline-width', '3px');
  await expect(selectedPinnedCommentRow).toHaveCSS('outline-color', 'rgb(19, 8, 66)');
  await expect(selectedPinnedCommentRow.locator('.esheet-process-grid__process-cell')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 208)',
  );

  await page.getByRole('button', { name: 'P', exact: true }).click();
  const backupBayDialog = page.locator('.backup-bay-modal');
  await expect(backupBayDialog).toContainText('Backup Bay 변경');
  await backupBayDialog.locator('.backup-bay-btn--close').click();
  await expect(backupBayDialog).not.toBeVisible();

  await page.getByRole('button', { name: '母 LOT' }).click();
  const notice = page.locator('.esheet-notice-dialog');
  await expect(notice).toContainText('ROOT LOTNAME : ROOT-WP00001');
  await notice.getByRole('button', { name: '확인' }).click();

  await page.getByRole('button', { name: 'PCM' }).click();
  await expect(notice).toContainText('EQP-A');
  await notice.getByRole('button', { name: '확인' }).click();
  await expect(notice).toContainText('RCP-A');
  await notice.getByRole('button', { name: '확인' }).click();
  await expect(notice).toContainText('OK');
  await notice.getByRole('button', { name: '확인' }).click();

  // As in Android, the comment cell keeps the tap for itself, so F has no process operation yet.
  const futureButton = page.getByRole('button', { name: 'F', exact: true });
  await futureButton.click();
  await expect(notice).toContainText('공정을 선택해야 합니다.');
  await notice.getByRole('button', { name: '확인' }).click();

  // A plain cell (I) of the same selected row records its operation without opening the drawer.
  await selectedCommentRow.locator('.rgCell').nth(1).click();
  await futureButton.click();
  await expect(notice).toContainText('FUTURE HOLD');
  await notice.getByRole('button', { name: '확인' }).click();

  await page.getByRole('button', { name: 'M', exact: true }).click();
  const maskDialog = page.locator('.mask-location-dialog');
  await expect(maskDialog.getByRole('textbox', { name: 'MASK TAG' })).toHaveValue('MASK-001');
  await maskDialog.getByRole('textbox', { name: '장비입력' }).fill('EQP-OLD');
  await maskDialog.getByRole('button', { name: 'Sample' }).click();
  const stopDialog = page.locator('.mask-location-stop-dialog');
  await expect(stopDialog).toContainText('공정 중단');
  await expect(stopDialog).toContainText('STOP FOR REVIEW');
  await stopDialog.getByRole('button', { name: '확인' }).click();
  await expect(maskDialog.getByRole('textbox', { name: 'SAMPLE' })).toHaveValue('PASS');
  await maskDialog.locator('.mask-location-dialog__btn-ok').click();
  await expect(maskDialog.getByRole('textbox', { name: 'MASK TAG' })).toHaveValue('MASK-002');
  await expect(maskDialog.getByRole('textbox', { name: '장비입력' })).toHaveValue('');
  await expect(maskDialog.getByRole('textbox', { name: 'SAMPLE' })).toHaveValue('');
  await maskDialog.locator('.mask-location-dialog__btn-ok').click();
  await expect(maskDialog).not.toBeVisible();

  // Controlled clock: the second tap must fall outside the 300 ms double-tap window.
  await page.clock.install();
  await page.reload();
  const drawer = page.locator('.draw-menu-list');
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  await barcRow.click();
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  await page.clock.fastForward(350);
  await barcRow.click();
  await expect(drawer).toHaveAttribute('aria-hidden', 'false');
  await expect(drawer).toContainText('MOVE IN');
  await expect(drawer.locator('[data-action-id="comment"]')).toBeEnabled();
  await drawer.locator('[data-action-id="comment"]').click();
  await expect(page).toHaveURL(/#\/comment-list\?/);
});

test('keeps the process drawer closed while selecting a row and opens it on Enter', async ({
  page,
}) => {
  await page.goto('/#/esheet?lotId=WP-COMMENT');

  const drawer = page.locator('.draw-menu-list');
  const barcCell = page.locator('.esheet-process-grid__process-cell').filter({
    hasText: 'BARC COATING',
  });

  await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  await barcCell.click();
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');

  await page.keyboard.press('ArrowRight');
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');

  const prCell = page.locator('.esheet-process-grid__process-cell').filter({
    hasText: 'PR COATING',
  });
  await prCell.click();
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');

  await page.keyboard.press('Enter');
  await expect(drawer).toHaveAttribute('aria-hidden', 'false');
  await expect(drawer).toContainText('MOVE IN');
});

test('preserves process-cell activation when optional columns are shown', async ({ page }) => {
  await page.clock.install();
  await page.goto('/#/esheet?lotId=WP-COMMENT');

  await page.getByRole('checkbox', { name: '공정번호' }).check();
  const drawer = page.locator('.draw-menu-list');
  const barcCell = page.locator('.esheet-process-grid__process-cell').filter({
    hasText: 'BARC COATING',
  });

  await barcCell.click();
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  await page.clock.fastForward(350);
  await barcCell.click();
  await expect(drawer).toHaveAttribute('aria-hidden', 'false');
});

test('does not open the process drawer after dragging within a selected row', async ({ page }) => {
  await page.goto('/#/esheet?lotId=WP00001');

  const drawer = page.locator('.draw-menu-list');
  const processCell = page.locator('.esheet-process-grid__process-cell').filter({
    hasText: 'PR COATING',
  });
  await processCell.click();
  await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  const box = await processCell.boundingBox();
  if (!box) throw new Error('PR COATING cell is not rendered');

  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2 - 14, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 14, y, { steps: 4 });
  await page.mouse.up();

  await expect(drawer).toHaveAttribute('aria-hidden', 'true');
});

test('opens keyboard-activated EDC, comment, and detail actions', async ({ page }) => {
  await page.goto('/#/esheet?lotId=WP-EDC');

  const horizontalScrollbar = page.getByRole('scrollbar', { name: 'Horizontal table scrollbar' });
  await horizontalScrollbar.focus();
  for (let index = 0; index < 15; index += 1) {
    await horizontalScrollbar.press('ArrowRight');
  }

  const edcCell = page.locator('.esheet-process-grid__dcol-cell').filter({ hasText: 'Y' }).first();
  await expect(edcCell).toBeVisible();
  await edcCell.click();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/esheet-edc\?/);
  await page.goto('/#/esheet?lotId=WP-COMMENT');
  const commentCell = page
    .locator('.rgRow.esheet-process-row--comment')
    .nth(1)
    .locator('.rgCell')
    .first();
  await commentCell.click();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/comment-list\?/);

  await page.goto('/#/esheet?lotId=WP00001');
  const descriptionCell = page
    .locator('.esheet-process-grid__description-cell')
    .filter({
      hasText: 'BEWH-K69-76-B81',
    })
    .first();
  await descriptionCell.click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.esheet-notice-dialog')).toContainText('[DESCRIPTION]');
});

test('opens EDC and comment actions by pointer double-click', async ({ page }) => {
  await page.goto('/#/esheet?lotId=WP-EDC');

  const horizontalScrollbar = page.getByRole('scrollbar', { name: 'Horizontal table scrollbar' });
  await horizontalScrollbar.focus();
  for (let index = 0; index < 15; index += 1) {
    await horizontalScrollbar.press('ArrowRight');
  }

  const edcCell = page.locator('.esheet-process-grid__dcol-cell').filter({ hasText: 'Y' }).first();
  await expect(edcCell).toBeVisible();
  await edcCell.dblclick();
  await expect(page).toHaveURL(/#\/esheet-edc\?/);
  const edcQuery = await page.evaluate(() => {
    const query = window.location.hash.split('?')[1] ?? '';
    return Object.fromEntries(new URLSearchParams(query));
  });
  expect(edcQuery).toMatchObject({
    LOTID: 'WP-EDC',
    OPERATION: 'P00002',
    SUBOPERATION: '00',
    PROCESSSTEP: 'BARC COATING',
    REALRECIPE: '',
  });
  await page.goto('/#/esheet?lotId=WP-COMMENT');
  const commentCell = page
    .locator('.rgRow.esheet-process-row--comment')
    .nth(1)
    .locator('.rgCell')
    .first();
  await commentCell.dblclick();
  await expect(page).toHaveURL(/#\/comment-list\?/);
  const commentQuery = await page.evaluate(() => {
    const query = window.location.hash.split('?')[1] ?? '';
    return Object.fromEntries(new URLSearchParams(query));
  });
  expect(commentQuery).toMatchObject({
    lotId: 'WP-COMMENT',
    operation: 'P00002',
    subOperation: '00',
    processStep: 'BARC COATING',
    operSequence: '0002',
    facility: 'GUMI',
  });
});

test('opens the legacy read-only wafer list from the LOT quantity control', async ({ page }) => {
  await page.goto('/#/esheet?lotId=WP00001');

  const quantity = page.getByRole('button', { name: 'Wafer 목록' });
  await expect(quantity).toHaveText('25');
  await quantity.dblclick();

  await expect(page).toHaveURL(/#\/wafer-select$/);
  await expect(page.locator('.wafer-select-page__header')).toContainText('WAFER 선택');
  await expect(page.getByRole('textbox', { name: 'LOT No.' })).toHaveValue('WP00001');
  await expect(page.getByRole('textbox', { name: 'LOT No.' })).toHaveAttribute('readonly', '');
  await expect(page.getByText('01', { exact: true })).toBeVisible();
  await expect(page.getByText('02', { exact: true })).toBeVisible();
});

test('opens process details in a dialog instead of navigating away', async ({ page }) => {
  await page.goto('/#/esheet?lotId=WP00001');

  await page
    .locator('.esheet-process-grid__description-cell')
    .filter({ hasText: 'BEWH-K69-76-B81' })
    .first()
    .dblclick();

  await expect(page.locator('.esheet-notice-dialog')).toContainText('[DESCRIPTION]');
  await expect(page).toHaveURL(/#\/esheet\?lotId=WP00001/);
  await page.locator('.esheet-notice-dialog').getByRole('button', { name: '확인' }).click();
});
