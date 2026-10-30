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
    url.port = '8181';
    const response = await route.fetch({ url: url.toString() });
    await route.fulfill({ response });
  });
  return messages;
}

async function openScreen(page: Page): Promise<SentMessage[]> {
  const messages = await recordMessages(page);
  await page.goto('/#/mask-bulk-change');
  await expect(page.getByRole('heading', { name: '복수 MASK 위치 지정' })).toBeVisible();
  await expect
    .poll(() => messages.some((item) => item.messageName === 'MASKSTATUSINFO'))
    .toBe(true);
  return messages;
}

async function scan(page: Page, value: string): Promise<void> {
  const tag = page.getByRole('textbox', { name: 'MASK TAG' });
  await tag.fill(value);
  await tag.press('Enter');
  await expect(tag).toHaveValue('');
}

async function pick(page: Page, name: string, option: string): Promise<void> {
  await page.getByRole('combobox', { name, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(page.getByRole('combobox', { name, exact: true })).toHaveValue(option);
}

async function selectTarget(page: Page): Promise<void> {
  await pick(page, '층', '2F');
  await pick(page, '상태', 'STOCK');
  await pick(page, '위치', 'STOCKER-A');
  await pick(page, '상세위치', 'A-01');
}

async function closeDialog(page: Page, message: string): Promise<void> {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(message);
  await dialog.getByRole('button', { name: '확인' }).click();
  // Queued dialogs reuse the modal, so wait for this message rather than for no dialog.
  await expect(page.getByRole('alert').filter({ hasText: message })).toHaveCount(0);
}

test('matches the Figma 4185:42827 layout at 360 by 720', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 720 });
  await openScreen(page);
  await expect(page.getByText('해당 결과가 없습니다')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'MASK TAG' })).toBeFocused();

  const cards = await page.locator('.multi-mask-location__card').evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return [box.x, box.y, box.width, box.height];
    }),
  );
  // Figma 4185:42827: 50px field cards and a list card that takes the remaining height
  // (352px in Figma; 348px with the BaseScreen default spacing).
  expect(cards).toEqual([
    [12, 48, 336, 50],
    [12, 114, 336, 348],
    [12, 478, 336, 50],
    [12, 544, 336, 50],
    [12, 610, 336, 50],
  ]);
  const content = page.locator('.ds-screen__content');
  expect(await content.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(
    true,
  );
  // 층 / 사용여부 / 상태 / 위치 labels hug their text, so each control keeps its Null value visible.
  for (const name of ['층', '사용여부', '상태', '위치']) {
    const label = page.locator('.multi-mask-location__choices .ds-field__label', { hasText: name });
    expect((await label.boundingBox())?.width).toBeLessThan(80);
  }

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(page).toHaveScreenshot('multi-mask-location-360x720.png', {
    animations: 'disabled',
  });
});

test('scans masks, loads the dependent locations and changes every row', async ({ page }) => {
  const messages = await openScreen(page);

  await scan(page, 'RT-0001X');
  await scan(page, 'RT-0002X');
  const grid = page.getByRole('region', { name: 'MASK 목록' });
  await expect(grid).toContainText('MASK-0001');
  await expect(grid).toContainText('MASK-0002');
  const maskInfo = messages.find((item) => item.messageName === 'MASKINFO');
  expect(maskInfo?.route).toBe('/hifos/maskinfo');
  expect(maskInfo?.body).toContain('<RETICLEID>RT-0001</RETICLEID>');
  expect(maskInfo?.body).not.toContain('ID_IDENT');

  await selectTarget(page);
  expect(messages.find((item) => item.messageName === 'MASKLOCATIONINFO')?.route).toBe(
    '/hifos/masklocgroupinfo',
  );

  await page.getByRole('button', { name: '확인', exact: true }).click();
  await closeDialog(page, '위치가 변경되었습니다.');
  await expect(page.getByText('해당 결과가 없습니다')).toBeVisible();

  const changes = messages.filter((item) => item.messageName === 'CHANGEMASKLOCATION');
  expect(changes.map((item) => item.route)).toEqual([
    '/hifos/checkpellicle',
    '/hifos/checkpellicle',
  ]);
  expect(changes[0]?.body).toContain('<LOCTYPE>MULTI</LOCTYPE>');
  expect(changes[0]?.body).toContain('<ETCSTATUS>STOCK</ETCSTATUS>');
  expect(changes[0]?.body).toContain('<ETCLOCATION>STOCKER-A</ETCLOCATION>');
  expect(changes[0]?.body).toContain('<ETCDETAILLOC>A-01</ETCDETAILLOC>');
  expect(changes[0]?.body).toContain('<FLOOR>2F</FLOOR>');
  await expect(page.getByRole('textbox', { name: 'MASK TAG' })).toBeFocused();
});

test('reports a failed mask, keeps the list and asks for missing selections', async ({ page }) => {
  await openScreen(page);

  await page.getByRole('button', { name: '확인', exact: true }).click();
  await closeDialog(page, '위치 변경할 Mask를 읽어주세요.');

  await scan(page, 'RT-0001X');
  await scan(page, 'RT-FAILX');
  await page.getByRole('button', { name: '확인', exact: true }).click();
  await closeDialog(page, '변경할 STATUS를 입력하세요.');

  await selectTarget(page);
  await page.getByRole('button', { name: '확인', exact: true }).click();
  await closeDialog(page, 'RT-FAIL 위치 변경에 실패하였습니다.');
  await closeDialog(page, '위치 변경에 실패한 MASK가 있습니다.');
  await expect(page.getByRole('region', { name: 'MASK 목록' })).toContainText('MASK-FAIL');

  await page.getByRole('button', { name: 'List Clear' }).click();
  await expect(page.getByText('해당 결과가 없습니다')).toBeVisible();
});
