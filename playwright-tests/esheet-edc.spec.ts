import { expect, test } from '@playwright/test';

const endpoint = 'http://127.0.0.1:8080/hifos/getEdcData';
const storyUrl = '/iframe.html?id=features-esheet-edc-data-screen--thick&viewMode=story';

async function fulfillJson(route, result) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ statusCode: 200, result: JSON.stringify(result) }),
  });
}

test('EDC full-view reload preserves legacy controls and message fields', async ({ page }) => {
  const messages = [];
  const grid = page.locator('revo-grid');
  const readColumns = () =>
    grid.evaluate((element) => {
      const columns = (
        element as HTMLElement & {
          columns?: Array<{ name: string; size: number }>;
        }
      ).columns;
      return columns?.map(({ name, size }) => ({ name, size })) ?? [];
    });

  await page.route(endpoint, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
      });
      return;
    }

    messages.push(route.request().postDataJSON().sMsg);
    await fulfillJson(route, {
      STATUS: 'PASS',
      MSGBODY: {
        PROCESSTYPE: 'THICK',
        ITEMS: {
          ITEM: [
            {
              SLOTID: '01',
              PRODEQPID1: 'ETCH-01',
              MEASEQPID: 'METRO-01',
              PARAMETER: 'THICKNESS',
              RECIPEID: 'RCP-THK-01',
              MIN: '1.20',
              MAX: '1.40',
              AVG: '1.31',
              QUL: '1.25',
              QCL: '1.30',
              QLL: '1.35',
              SITECOUNT: '9',
              VALUE1: '1.29',
              VALUE2: '1.30',
              VALUE3: '1.31',
              VALUE4: '1.32',
              VALUE5: '1.30',
              VALUE6: '1.31',
              VALUE7: '1.33',
              VALUE8: '1.30',
              VALUE9: '1.31',
              RANGE: '0.14',
            },
          ],
        },
      },
    });
  });

  await page.goto(storyUrl);
  await expect(page.getByRole('heading', { name: 'EDC DATA' })).toBeVisible();
  await expect(page.getByText('LOT No.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'LOT No.' })).toHaveValue('LOT-DEMO-01');
  await expect(page.getByTestId('esheet-edc-grid')).toBeVisible();
  await expect
    .poll(readColumns)
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'QUL', size: 0 }),
        expect.objectContaining({ name: 'RANGE', size: 120 }),
      ]),
    );

  await page.getByRole('checkbox', { name: '전체 보기' }).check();

  await expect.poll(() => messages.length).toBe(2);
  await expect
    .poll(readColumns)
    .toEqual(expect.arrayContaining([expect.objectContaining({ name: 'QUL', size: 120 })]));
  expect(messages[0]).toContain('<LOTID>LOT-DEMO-01</LOTID>');
  expect(messages[0]).toContain('<OPERATION>1000</OPERATION>');
  expect(messages[0]).toContain('<SUBOPERATION>00</SUBOPERATION>');
  expect(messages[0]).toContain('<OPERATIONDESC>PHOTO</OPERATIONDESC>');
  expect(messages[0]).toContain('<RECIPE>RCP-THK-01</RECIPE>');
});

test('EDC business errors use the legacy acknowledgement dialog', async ({ page }) => {
  await page.route(endpoint, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
      });
      return;
    }
    await fulfillJson(route, {
      STATUS: 'FAIL',
      ERRMSG: 'EDC DATA 조회에 실패하였습니다.',
      MSGBODY: '',
    });
  });

  await page.goto(storyUrl);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('EDC DATA 조회에 실패하였습니다.');
  await page.getByRole('button', { name: '확인' }).click();
  await expect(dialog).toHaveCount(0);
});
