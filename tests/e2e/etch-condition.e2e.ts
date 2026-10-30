import { expect, type Page, test } from '@playwright/test';

import { createEtchConditionHandlers } from '../../mock-server/src/messages/etch-condition.handlers.js';

interface SentMessage {
  route: string;
  body: string;
}

const handlers = createEtchConditionHandlers();

function field(body: string, name: string): string {
  return new RegExp(`<${name}>(.*?)</${name}>`).exec(body)?.[1] ?? '';
}

// The app talks to 127.0.0.1:8080. Answer with the mock-server handler and record each AIFMSG.
async function openScreen(page: Page): Promise<SentMessage[]> {
  const messages: SentMessage[] = [];
  await page.route('http://127.0.0.1:8080/**', async (route) => {
    const body = (route.request().postDataJSON() as { sMsg?: string } | null)?.sMsg ?? '';
    messages.push({ route: new URL(route.request().url()).pathname, body });
    const result = handlers.ETCHCOMMRCPFROMB({
      payload: { LOTID: field(body, 'LOTID'), CHKEQPID: field(body, 'CHKEQPID') },
    });
    await route.fulfill({ json: result });
  });
  await page.goto('/#/etch');
  await expect(page.getByRole('heading', { name: 'ETCH 조건표 조회' })).toBeVisible();
  return messages;
}

async function search(page: Page, lotId: string): Promise<void> {
  await page.getByRole('textbox', { name: 'LOT' }).fill(lotId);
  await page.getByRole('button', { name: '조회', exact: true }).click();
}

async function closeDialog(page: Page, message: string): Promise<void> {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText(message);
  await dialog.getByRole('button', { name: '확인' }).click();
  await expect(page.getByRole('alert').filter({ hasText: message })).toHaveCount(0);
}

const grid = (page: Page) => page.getByRole('region', { name: 'ETCH 조건표', exact: true });

test('matches the Figma 4387:16685 layout at 360 by 720 without page scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 720 });
  await openScreen(page);
  await expect(page.getByRole('textbox', { name: 'LOT' })).toBeFocused();
  await search(page, 'LOT-DPS');
  await expect(grid(page)).toContainText('SOURCE POWER');

  const cards = await page.locator('.ds-screen__card').evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return [box.x, box.y, box.width, box.height];
    }),
  );
  // Figma 4387:16685 (360x720): 36px header, 32px fields with the 80px label column, and a
  // 44px footer with a 36px button. BaseScreen keeps its default spacing; the grid card takes
  // the remaining height.
  expect(cards).toEqual([
    [12, 48, 336, 130],
    [12, 194, 336, 38],
    [12, 248, 336, 416],
  ]);
  const controls = await page
    .locator('.ds-screen__card .q-field__control')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return [Math.round(box.x), Math.round(box.height)];
      }),
    );
  // Machine and LOT controls start on the same column.
  expect(controls.slice(0, 2)).toEqual([
    [109, 32],
    [109, 32],
  ]);
  expect(await page.locator('.ds-screen__footer').boundingBox()).toEqual({
    x: 0,
    y: 676,
    width: 360,
    height: 44,
  });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(720);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(page).toHaveScreenshot('etch-condition-360x720.png', { animations: 'disabled' });
});

test('searches with the selected machine and shows the chamber grid and comment', async ({
  page,
}) => {
  const messages = await openScreen(page);

  await page.getByRole('combobox', { name: 'Machine' }).click();
  await page.getByRole('option', { name: '4E03-21', exact: true }).click();
  await search(page, 'lot-dps');

  await expect(page.getByText('실비 조건을 확인하세요.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: '공정 / RCP' })).toHaveValue(
    '4200 DPS POLY / RCP: DP-POLY-07',
  );
  await expect(grid(page).getByRole('columnheader')).toHaveText([
    'CH',
    'PARA',
    'BASE',
    '변경',
    '현재값',
    '연속',
  ]);
  expect(messages).toHaveLength(1);
  expect(messages[0]?.route).toBe('/hifos/etchcommrcpfromb');
  expect(field(messages[0]?.body ?? '', 'MSGNAME')).toBe('ETCH_COMMRCPFROMB');
  expect(field(messages[0]?.body ?? '', 'LOTID')).toBe('LOT-DPS');
  expect(field(messages[0]?.body ?? '', 'CHKEQPID')).toBe('4E03-21');

  await search(page, 'LOT-EMAX');
  await expect(page.getByText('RF : 650 추가 반영')).toBeVisible();
});

test('scans a LOT barcode, shows EEN and the TE8500 진행 TIME, and reports errors', async ({
  page,
}) => {
  const messages = await openScreen(page);
  const lot = page.getByRole('textbox', { name: 'LOT' });

  await lot.fill(' LOT-EENX');
  await lot.press('Enter');
  await expect(lot).toHaveValue('LOT-EEN');
  await closeDialog(page, 'EEN 적용 LOT입니다.');
  expect(field(messages[0]?.body ?? '', 'CHKEQPID')).toBe('');

  await search(page, 'LOT-TE8500');
  await expect(page.getByText('진행 TIME [ 45 초 ]')).toBeVisible();
  // Android requestFocus() + selectAll() on the LOT after 진행 TIME.
  await expect(lot).toBeFocused();
  expect(
    await lot.evaluate((input: HTMLInputElement) => [input.selectionStart, input.selectionEnd]),
  ).toEqual([0, 'LOT-TE8500'.length]);
  await expect(grid(page).getByRole('columnheader')).toHaveText(['COL', 'VALUE']);

  await search(page, 'LOT-ERROR');
  await closeDialog(page, 'LOT 정보가 없습니다.');
  await expect(grid(page).getByRole('columnheader')).toHaveCount(0);
  await expect(lot).toBeFocused();

  await lot.fill('');
  await page.getByRole('button', { name: '조회', exact: true }).click();
  await closeDialog(page, 'LOT을 입력하여 주세요.');
});
