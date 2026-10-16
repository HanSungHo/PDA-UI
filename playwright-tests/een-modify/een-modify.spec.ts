import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

const evidenceDirectory = join(process.cwd(), 'test-results', 'design-review');

test.beforeEach(async ({ page, request }) => {
  await request.post('http://127.0.0.1:8080/mock/reset');
  await page.addInitScript(() => {
    localStorage.setItem(
      'server.info',
      JSON.stringify([
        {
          selectedServer: true,
          serverName: 'DEV-SERVER',
          serverType: 'DEV_SERVER',
          serverUrl: '127.0.0.1',
        },
        {
          selectedServer: false,
          serverName: 'L4-DEVICE',
          serverType: 'PROD_SERVER',
          serverUrl: '127.0.0.1',
        },
      ]),
    );
  });
  await page.goto('/#/main');
  await expect(page.getByText('HiFOS AR-DEMO')).toBeVisible();
  await page.evaluate(() => {
    window.location.hash =
      '/een-modify?itemId=een-photo-exposure&lotId=LOT-DEMO-01&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&processStep=PHOTO-EXPOSURE';
  });
  await expect(page.getByRole('textbox', { name: 'LOT ID' })).toHaveValue('LOT-DEMO-01');
});

test('matches the latest 360 by 936 layout and captures design evidence', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'EEN 수정' })).toBeVisible();
  const readOnlyFieldValues = [
    ['LOT ID', 'LOT-DEMO-01'],
    ['FACILITY', 'GUMI'],
    ['제품', 'HIFI-UI-DEMO'],
    ['ROUTE', 'PHOTO-DEMO'],
    ['공정', '1200 PHOTO-EXPOSURE-DESC'],
    ['EEN ID', 'EEN-0001'],
  ];
  for (const [label, value] of readOnlyFieldValues) {
    const field = page.getByRole('textbox', { name: label });
    await expect(field).toHaveValue(value);
    await expect(field).toHaveAttribute('readonly', '');
    await expect(field).toHaveAttribute('tabindex', '-1');
  }
  await expect(page.getByLabel('ACTION POINT')).toBeVisible();
  await expect(page.getByLabel('TAG ID')).toBeVisible();
  await expect(page.getByRole('button', { name: '확인' })).toBeVisible();
  await expect(page.getByRole('button', { name: '취소' })).toBeVisible();

  const card = await page.locator('.een-modify-card').boundingBox();
  mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: join(evidenceDirectory, 'een-modify-latest-360x936.png') });
  expect(card?.width).toBe(336);
  expect(card?.height).toBe(784);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(936);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: 'ACTION POINT' })).toBeFocused();
});

test('loads TAG choices and submits the legacy UPDATEEEN flow', async ({ page }) => {
  const tagId = page.getByLabel('TAG ID');
  await tagId.click();
  await page.getByRole('option', { name: 'TAG-002' }).click();
  await expect(page.getByLabel('Tag Comment')).toHaveValue('두 번째 TAG 설명');

  const actionPoint = page.getByLabel('ACTION POINT');
  await actionPoint.click();
  await page.getByRole('option', { name: 'MOVEOUT' }).click();
  await page.getByLabel('변경 사유').fill('Design QA update');
  await page.getByRole('button', { name: '확인' }).click();
  await expect(page.getByRole('dialog')).toContainText('수정하시겠습니까?');
  await page.locator('.een-modify-dialog__confirm').click();
  await expect(page.getByRole('dialog')).toContainText('EEN Update가 완료 되었습니다.');
  await page.locator('.een-modify-dialog__confirm').click();
  await expect(page.getByText('HiFOS AR-DEMO')).toBeVisible();
});

test('returns the updated record to EEN Setting after a successful Modify', async ({ page }) => {
  await page.evaluate(() => {
    window.location.hash =
      '/een-setting?lotId=LOT-DEMO-01&factoryName=GUMI&facility=GUMI&product=HIFI-UI-DEMO&route=PHOTO-DEMO&operation=1200&processStep=PHOTO-EXPOSURE';
  });
  await expect(page.getByRole('heading', { name: 'EEN 설정' })).toBeVisible();

  await page.getByRole('button', { name: '수정' }).click();
  await expect(page.getByRole('heading', { name: 'EEN 수정' })).toBeVisible();

  const tagId = page.getByLabel('TAG ID');
  await tagId.click();
  await page.getByRole('option', { name: 'TAG-002' }).click();
  await expect(page.getByLabel('Tag Comment')).toHaveValue('두 번째 TAG 설명');

  const actionPoint = page.getByLabel('ACTION POINT');
  await actionPoint.click();
  await page.getByRole('option', { name: 'MOVEOUT' }).click();
  await page.getByLabel('변경 사유').fill('Parent result handoff verification');
  await page.getByRole('button', { name: '확인' }).click();
  await expect(page.getByRole('dialog')).toContainText('수정하시겠습니까?');
  await page.locator('.een-modify-dialog__confirm').click();
  await expect(page.getByRole('dialog')).toContainText('EEN Update가 완료 되었습니다.');
  await page.locator('.een-modify-dialog__confirm').click();

  await expect(page.getByRole('heading', { name: 'EEN 설정' })).toBeVisible();
  await expect(page.getByText('두 번째 TAG 설명')).toBeVisible();
});
