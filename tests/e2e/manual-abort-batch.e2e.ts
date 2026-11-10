import { expect, type Page, test } from '@playwright/test';

import { createManualAbortBatchHandlers } from '../../mock-server/src/messages/manual-abort-batch.handlers.js';

interface SentMessage {
  route: string;
  body: string;
}

const handlers = createManualAbortBatchHandlers();

function field(body: string, name: string): string {
  return new RegExp(`<${name}>(.*?)</${name}>`).exec(body)?.[1] ?? '';
}

// The app talks to 127.0.0.1:8080. Answer with the mock-server handlers and record each AIFMSG.
async function openScreen(page: Page): Promise<SentMessage[]> {
  const messages: SentMessage[] = [];
  await page.route('http://127.0.0.1:8080/**', async (route) => {
    const body = (route.request().postDataJSON() as { sMsg?: string } | null)?.sMsg ?? '';
    const path = new URL(route.request().url()).pathname;
    messages.push({ route: path, body });
    const payload = {
      LOTID: field(body, 'LOTID'),
      EQPID: field(body, 'EQPID'),
      RCPID: field(body, 'RCPID'),
      USERID: field(body, 'USERID'),
    };
    const result =
      path === '/hifos/furnaceremanualsave'
        ? handlers.FURNACEREMANUALSAVE({ payload })
        : handlers.FURNACEREMANUALLOT({ payload });
    await route.fulfill({ json: result });
  });
  // Open it from another screen so that closing the screen has a page to go back to.
  await page.goto('/#/main');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => {
    window.location.hash = '#/manual-abort-batch';
  });
  await expect(page.getByRole('heading', { name: 'Abort Batch 매뉴얼 등록' })).toBeVisible();
  return messages;
}

const textbox = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });
const grid = (page: Page) => page.getByRole('region', { name: 'Abort Batch LOT 목록' });

async function scan(page: Page, name: string, value: string): Promise<void> {
  await textbox(page, name).fill(value);
  await textbox(page, name).press('Enter');
}

async function closeDialog(page: Page, message: string): Promise<void> {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(message);
  await dialog.getByRole('button', { name: '확인' }).click();
  await expect(page.getByRole('alert').filter({ hasText: message })).toHaveCount(0);
}

// Figma 7790:82478 (432 x 864); the 360 x 720 run checks that the same insets hold on the old device size.
for (const { width, height } of [
  { width: 432, height: 864 },
  { width: 360, height: 720 },
]) {
  test(`keeps the 432 Figma insets at ${width} by ${height} without page scroll`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await openScreen(page);
    await expect(textbox(page, 'LOT')).toBeFocused();
    await expect(grid(page).getByText('해당 결과가 없습니다')).toBeVisible();
    await expect(page.getByRole('button', { name: '저장' })).toBeDisabled();

    for (const [name, hint] of [
      ['LOT', 'barcode'],
      ['진행 장비', 'barcode'],
      ['RECIPE', 'Key - in'],
    ] as const) {
      await expect(textbox(page, name)).toHaveAttribute('placeholder', hint);
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);

    // Input card at 12,40, full width minus 12px each side (408 at 432), 128px tall, with 32px fields that start after the 65px label column.
    const form = (await page.getByRole('region', { name: 'Abort Batch 입력' }).boundingBox())!;
    expect(form).toEqual({ x: 12, y: 40, width: width - 24, height: 128 });
    const lot = (await page.locator('.manual-abort-batch__field').first().boundingBox())!;
    expect([lot.x, lot.height]).toEqual([20, 32]);
    expect((await textbox(page, 'LOT').boundingBox())!.x).toBe(101);

    // Medium (36px) footer buttons, 4px from the bottom, in the Figma order 저장 then 취소.
    const save = (await page.getByRole('button', { name: '저장' }).boundingBox())!;
    const cancel = (await page.getByRole('button', { name: '취소' }).boundingBox())!;
    expect([save.x, save.height, cancel.height]).toEqual([12, 36, 36]);
    expect(cancel.x).toBeGreaterThan(save.x + save.width);
    expect(cancel.x + cancel.width).toBe(width - 12);
    expect(save.y + save.height).toBe(height - 4);

    // The grid card fills the space down to the footer (Android baseLayout layout_weight="1").
    const card = (await grid(page).boundingBox())!;
    expect(card.y).toBe(176);
    expect(card.y + card.height).toBe(save.y - 8);

    await scan(page, 'LOT', ' LOT-1#');
    await expect(grid(page).getByRole('columnheader')).toHaveText(['구분', 'ZONE', 'LOT']);
    await expect(grid(page)).toContainText('CENTER');
  });
}

test('scans the LOT and equipment, asks for the recipe, then saves and goes back', async ({
  page,
}) => {
  const messages = await openScreen(page);

  await scan(page, 'LOT', ' lot-1#');
  await expect(textbox(page, 'LOT')).toHaveValue('LOT-1');
  await expect(textbox(page, '진행 장비')).toBeFocused();
  expect(messages[0]?.route).toBe('/hifos/furnaceremanuallot');
  expect(field(messages[0]?.body ?? '', 'LOTID')).toBe('LOT-1');

  await scan(page, '진행 장비', 'EQP-FURNACE-01#');
  await expect(textbox(page, '진행 장비')).toHaveValue('FURNACE-01');
  await expect(textbox(page, 'RECIPE')).toBeFocused();

  // Android selectAllOnFocus: a second LOT scan selects the equipment, so the next scan replaces it.
  await scan(page, 'LOT', ' LOT-1#');
  await expect(textbox(page, '진행 장비')).toBeFocused();
  expect(
    await textbox(page, '진행 장비').evaluate((input: HTMLInputElement) => [
      input.selectionStart,
      input.selectionEnd,
    ]),
  ).toEqual([0, 'FURNACE-01'.length]);
  await textbox(page, '진행 장비').press('Tab');

  await page.getByRole('button', { name: '저장' }).click();
  await closeDialog(page, 'Recipe를 입력하세요.');
  await expect(textbox(page, 'RECIPE')).toBeFocused();

  await textbox(page, 'RECIPE').fill('rcp-error');
  await page.getByRole('button', { name: '저장' }).click();
  await closeDialog(page, '매뉴얼 등록에 실패하였습니다.');

  await textbox(page, 'RECIPE').fill('rcp-1');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/#\/main$/);
  const save = messages.at(-1)?.body ?? '';
  expect(messages.at(-1)?.route).toBe('/hifos/furnaceremanualsave');
  expect([field(save, 'LOTID'), field(save, 'EQPID'), field(save, 'RCPID')]).toEqual([
    'LOT-1',
    'FURNACE-01',
    'RCP-1',
  ]);
});

test('shows a lookup error as is and keeps 저장 disabled', async ({ page }) => {
  await openScreen(page);

  await scan(page, 'LOT', ' LOT-ERROR#');
  await closeDialog(page, 'Abort Batch 정보가 없습니다.');
  await expect(page.getByRole('button', { name: '저장' })).toBeDisabled();
  await expect(textbox(page, '진행 장비')).not.toBeFocused();
});

// Android sizes 구분 / ZONE / LOT at baseWidth / 3 each, so the columns follow wider screens.
for (const width of [360, 432]) {
  test(`splits the grid into three equal columns at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await openScreen(page);
    await scan(page, 'LOT', ' LOT-1#');

    const headers = grid(page).getByRole('columnheader');
    await expect(headers).toHaveCount(3);
    const card = (await grid(page).boundingBox())!;
    const widths = await headers.evaluateAll((cells) =>
      cells.map((cell) => cell.getBoundingClientRect().width),
    );
    // The three columns are equal and together fill the card's content box (8px padding, 1px border).
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
    const total = widths.reduce((sum, cellWidth) => sum + cellWidth, 0);
    expect(Math.abs(total - (card.width - 18))).toBeLessThanOrEqual(3);
  });
}
