import { expect, type Page, test } from '@playwright/test';

const waferLookupResponse = {
  STATUS: 'PASS',
  MSGBODY: {
    ITEMS: { ITEM: [{ LOTNAME: 'LOT-WAFER-01', WAFERTYPE: 'SILICON-200MM' }] },
    COMMNETLIST: { ITEM: [{ TYPEVALUE: 'NORMAL' }, { TYPEVALUE: 'MATERIAL CHANGE' }] },
  },
};

async function mockWaferMessages(page: Page, compareResult = 'OK') {
  await page.route('**/hifos/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const result = pathname.endsWith('/hifos/getWaferTYpe')
      ? waferLookupResponse
      : pathname.endsWith('/hifos/ComPareWaferType')
        ? { STATUS: 'PASS', MSGBODY: { COMPARERESULT: compareResult } }
        : { STATUS: 'FAIL', ERRMSG: 'Unexpected message' };

    await route.fulfill({ json: { statusCode: 200, result: JSON.stringify(result) } });
  });
}

test('Wafer Code Check matches the mobile card layout and completes a successful compare', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 720 });
  await mockWaferMessages(page);
  await page.goto(
    '/iframe.html?id=features-wafer-code-check-wafer-code-check-page--default&viewMode=story',
    { waitUntil: 'domcontentloaded' },
  );

  await expect(page.getByText('Wafer 자재 정보 Check', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'LOT NAME' })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'WAFER' })).toHaveValue('');
  await expect(page.getByRole('combobox', { name: '사유 선택' })).toBeDisabled();
  const initialDisplay = page.getByTestId('wafer-code-check-initial-name').locator('textarea');
  const initialDisplayBounds = await initialDisplay.boundingBox();
  expect(initialDisplayBounds?.height).toBe(100);
  await expect(page.getByRole('button', { name: '확인', exact: true }).first()).toBeInViewport();
  await expect(page.getByRole('button', { name: '닫기', exact: true })).toBeInViewport();
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
  ).toBe(true);

  const searchCard = page.getByRole('region', { name: 'RUN BOX 및 INITIAL BOX 조회' });
  const searchCardBounds = await searchCard.boundingBox();
  expect(searchCardBounds).not.toBeNull();
  expect(searchCardBounds?.x).toBe(12);
  expect(searchCardBounds?.width).toBe(326);
  for (const testId of ['wafer-code-check-run-lookup', 'wafer-code-check-initial-lookup']) {
    const label = page.getByTestId(testId).locator('.ds-btn__label');
    const dimensions = await label.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const initialSearch = page
    .getByTestId('wafer-code-check-initial-search')
    .getByRole('textbox', { name: 'INITIAL BOX' });
  await initialSearch.fill('initial-01');
  await page.getByTestId('wafer-code-check-initial-lookup').click();
  await expect(page.getByRole('textbox', { name: 'INITIAL BOX 이름' })).toHaveValue('INITIAL-01');
  await expect(initialSearch).toHaveValue('');

  const runSearch = page.getByRole('textbox', { name: 'RUN BOX' });
  await runSearch.fill('run-demo-01');
  await page.getByTestId('wafer-code-check-run-lookup').click();
  await expect(page.getByRole('textbox', { name: 'LOT NAME' })).toHaveValue('LOT-WAFER-01');
  await expect(page.getByRole('textbox', { name: 'WAFER' })).toHaveValue('SILICON-200MM');
  await expect(page.getByRole('combobox', { name: '사유 선택' })).toBeEnabled();

  const compareRequest = page.waitForRequest((request) =>
    request.url().endsWith('/hifos/ComPareWaferType'),
  );
  await page.getByRole('button', { name: '확인', exact: true }).first().click();
  const requestBody = (await compareRequest).postData() ?? '';
  expect(requestBody).toContain('<LOTNAME>LOT-WAFER-01</LOTNAME>');
  expect(requestBody).toContain('<INITIALBOXNAME>INITIAL-01</INITIALBOXNAME>');
  expect(requestBody).toContain('<COMMENT></COMMENT>');
  await expect(page.getByText('정상처리 되었습니다.')).toBeVisible();
  await page.getByRole('button', { name: '확인', exact: true }).last().click();

  await expect(page.getByRole('textbox', { name: 'LOT NAME' })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'WAFER' })).toHaveValue('');
  await expect(page.getByRole('combobox', { name: '사유 선택' })).toBeDisabled();

  await page.setViewportSize({ width: 1280, height: 900 });
  const desktopCardBounds = await searchCard.boundingBox();
  expect(desktopCardBounds).not.toBeNull();
  expect(desktopCardBounds?.x).toBe(12);
  expect(desktopCardBounds?.width).toBe(1256);
  await expect(page.getByRole('button', { name: '닫기', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('scanner Enter parses the LOT suffix and compare NG keeps the lookup result', async ({
  page,
}) => {
  await mockWaferMessages(page, 'NG');
  await page.goto(
    '/iframe.html?id=features-wafer-code-check-wafer-code-check-page--default&viewMode=story',
    { waitUntil: 'domcontentloaded' },
  );

  const runSearch = page.getByRole('textbox', { name: 'RUN BOX' });
  await runSearch.fill(' RUN-DEMO-01#');
  const lookupRequest = page.waitForRequest((request) =>
    request.url().endsWith('/hifos/getWaferTYpe'),
  );
  await runSearch.press('Enter');
  await lookupRequest;
  await expect(page.getByRole('textbox', { name: 'LOT NAME' })).toHaveValue('LOT-WAFER-01');
  await expect(runSearch).toHaveValue('');

  await page.getByRole('button', { name: '확인', exact: true }).first().click();
  await expect(page.getByText('WAFER자재 확인에 실패 하였습니다.')).toBeVisible();
  await page.getByRole('button', { name: '확인', exact: true }).last().click();
  await expect(page.getByRole('textbox', { name: 'LOT NAME' })).toHaveValue('LOT-WAFER-01');
});
