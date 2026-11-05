import { expect, type Page, type Request, test } from '@playwright/test';

interface SentMessage {
  route: string;
  messageName: string;
  body: string;
}

// The app talks to 127.0.0.1:8080; forward to the config's mock server and record each AIFMSG.
async function recordMessages(page: Page): Promise<SentMessage[]> {
  const messages: SentMessage[] = [];
  await page.route('http://127.0.0.1:8080/**', async (route) => {
    const request: Request = route.request();
    const url = new URL(request.url());
    const sMsg = (request.postDataJSON() as { sMsg?: string } | null)?.sMsg ?? '';
    messages.push({
      route: url.pathname,
      messageName: /<MSGNAME>(.*?)<\/MSGNAME>/.exec(sMsg)?.[1] ?? '',
      body: sMsg,
    });
    url.port = '8182';
    const response = await route.fetch({ url: url.toString() });
    await route.fulfill({ response });
  });
  return messages;
}

async function openScreen(page: Page): Promise<SentMessage[]> {
  const messages = await recordMessages(page);
  await page.request.post('http://127.0.0.1:8182/mock/reset');
  await page.goto('/#/lot-status-by-bay');
  await expect(page.getByRole('heading', { name: 'BAY별 LOT 현황' })).toBeVisible();
  await expect.poll(() => messages.some((item) => item.messageName === 'AREABAYINFO')).toBe(true);
  return messages;
}

async function pick(page: Page, name: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(page.getByRole('combobox', { name, exact: true })).toHaveValue(option);
}

async function closeDialog(page: Page, message: string): Promise<void> {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(message);
  await dialog.getByRole('button', { name: '확인' }).click();
  await expect(page.getByRole('alert').filter({ hasText: message })).toHaveCount(0);
}

function grid(page: Page) {
  return page.getByRole('region', { name: 'LOT 목록' });
}

async function tapRow(page: Page, lotId: string): Promise<void> {
  await grid(page).locator('.rgCell', { hasText: lotId }).click();
}

async function cardBoxes(page: Page): Promise<number[][]> {
  return page.locator('.ds-screen__card').evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return [box.x, box.y, box.width, box.height].map(Math.round);
    }),
  );
}

test('fills the 432 by 864 frame with 12px gutters and the legacy captions', async ({ page }) => {
  await openScreen(page);
  await expect(page.getByText('해당 결과가 없습니다')).toBeVisible();

  // Every card spans the width minus the 12px BaseScreen gutters; the list takes the rest.
  const cards = await cardBoxes(page);
  expect(cards.map(([x, , width]) => [x, width])).toEqual([
    [12, 408],
    [12, 408],
    [12, 408],
  ]);
  const content = page.locator('.ds-screen__content');
  expect(await content.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(
    true,
  );

  // Android copy: no hint on edit_job, disabled 출고 / 반송 / radio buttons.
  await expect(page.getByRole('textbox', { name: 'JOB' })).not.toHaveAttribute('placeholder');
  await expect(page.getByRole('button', { name: '출고' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '반송' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'eSheet' })).toBeDisabled();
  await expect(page.getByRole('radio', { name: 'OUT', exact: true })).toBeChecked();

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(page).toHaveScreenshot('lot-status-by-bay-432x864-empty.png', {
    animations: 'disabled',
  });
});

test('loads stockers for the bay, searches LOTs and toggles the eSheet button', async ({
  page,
}) => {
  const messages = await openScreen(page);
  const areaBay = messages.find((item) => item.messageName === 'AREABAYINFO');
  expect(areaBay?.route).toBe('/hifos/areabayinfo');
  expect(areaBay?.body).toContain('<AREA>');

  await page.getByRole('button', { name: '조회' }).click();
  await closeDialog(page, 'BAY를 선택해주세요');

  await pick(page, 'BAY', 'BAY-A');
  // setSTKSpinner selects the first stocker; 모두 is appended to the list.
  await expect(page.getByRole('combobox', { name: 'STK', exact: true })).toHaveValue('STK-A');
  const stockerInfo = messages.find((item) => item.messageName === 'BAYSTOCKERINFO');
  expect(stockerInfo?.body).toContain('<BAY>BAY-A</BAY>');

  await pick(page, 'STK', '모두');
  await page.getByRole('textbox', { name: 'JOB' }).fill('j300');
  await page.getByRole('textbox', { name: 'JOB' }).press('Enter');
  await expect(grid(page)).toContainText('LOT-A005');
  await expect(grid(page)).toContainText('LOT-A007');
  const blst = messages.find((item) => item.messageName === 'BLSTINFO');
  expect(blst?.route).toBe('/hifos/blstinfo');
  expect(blst?.body).toContain('<STOCKER>모두</STOCKER>');
  expect(blst?.body).toContain('<JOBCODE>J300</JOBCODE>');

  await tapRow(page, 'LOT-A005');
  await expect(page.getByRole('button', { name: 'eSheet' })).toBeEnabled();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(page).toHaveScreenshot('lot-status-by-bay-432x864-selected.png', {
    animations: 'disabled',
  });

  await tapRow(page, 'LOT-A006');
  await expect(page.getByRole('button', { name: 'eSheet' })).toBeDisabled();
  await page.getByRole('button', { name: '선택취소' }).click();
  await tapRow(page, 'LOT-A007');
  await page.getByRole('button', { name: 'eSheet' }).click();
  await expect(page).toHaveURL(/#\/esheet\?lotId=LOT-A007$/);
});

test('limits the selection to six rows and reports BLSTINFO failures', async ({ page }) => {
  await openScreen(page);
  await pick(page, 'BAY', 'BAY-A');
  await pick(page, 'STK', '모두');
  await page.getByRole('button', { name: '조회' }).click();

  for (const lotId of ['LOT-A001', 'LOT-A002', 'LOT-A003', 'LOT-A004', 'LOT-A005', 'LOT-A006']) {
    await tapRow(page, lotId);
  }
  await tapRow(page, 'LOT-A007');
  await closeDialog(page, '최대 6개까지 지정할수 있습니다.');

  await page.getByRole('textbox', { name: 'JOB' }).fill('FAIL');
  await page.getByRole('button', { name: '조회' }).click();
  await closeDialog(page, 'JOB [FAIL] 조회에 실패하였습니다.');
  await expect(page.getByText('해당 결과가 없습니다')).toBeVisible();
});
