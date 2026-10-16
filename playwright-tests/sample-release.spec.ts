import { expect, test } from '@playwright/test';

import { createSampleReleaseHandlers } from '../mock-server/src/messages/sample-release.handlers.js';

const sampleReleaseHandlers = createSampleReleaseHandlers();
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': '*',
  'content-type': 'application/json',
};

test.describe('Sample Release', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.route('**/message/send', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      const { messageName, payload } = request.postDataJSON() as {
        messageName: keyof typeof sampleReleaseHandlers;
        payload: Record<string, unknown>;
      };
      const handler = sampleReleaseHandlers[messageName];
      if (!handler) {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify(handler({ payload })),
      });
    });

    await page.goto(
      '/iframe.html?id=features-sample-release-sample-release-page--default&viewMode=story',
      { waitUntil: 'domcontentloaded' },
    );
    await expect(page.getByRole('heading', { name: 'SAMPLE RELEASE 공정정보' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('searches, displays WAIT data, and executes the release', async ({ page }) => {
    const lotInput = page.getByRole('textbox', { name: 'SAMPLE LOT' }).first();
    await lotInput.fill('LOT-001');
    await page.getByRole('button', { name: '조회' }).click();

    await expect(page.getByRole('textbox', { name: 'SAMPLE LOT' }).nth(1)).toHaveValue('LOT-001');
    await expect(page.getByRole('textbox', { name: 'MAIN LOT' })).toHaveValue('MLOT-A26-999');
    await expect(page.getByRole('textbox', { name: '공정' }).first()).toHaveValue('1000');

    const executeButton = page.getByRole('button', { name: '실행' });
    await expect(executeButton).toBeEnabled();
    await executeButton.click();
    await expect(page.getByRole('alert')).toHaveText(
      'Sample Release 실행이 정상적으로 완료되었습니다.',
    );
    await page.getByRole('button', { name: '확인' }).click();
    await expect(lotInput).toHaveValue('');
  });

  test('shows an error dialog for an unsuccessful lookup', async ({ page }) => {
    await page.getByRole('textbox', { name: 'SAMPLE LOT' }).first().fill('LOT-ERROR');
    await page.getByRole('button', { name: '조회' }).click();

    await expect(page.getByRole('alert')).toHaveText('LOT ID 조회 실패하였습니다.');
  });

  test('keeps execution disabled for mismatched or non-WAIT data', async ({ page }) => {
    const executeButton = page.getByRole('button', { name: '실행' });

    await page.getByRole('textbox', { name: 'SAMPLE LOT' }).first().fill('LOT-MISMATCH');
    await page.getByRole('button', { name: '조회' }).click();
    await expect(executeButton).toBeDisabled();

    await page.getByRole('textbox', { name: 'SAMPLE LOT' }).first().fill('LOT-NOTWAIT');
    await page.getByRole('button', { name: '조회' }).click();
    await expect(executeButton).toBeDisabled();
  });

  test('allows Execute to show validation when Main LotName is empty', async ({ page }) => {
    const lotInput = page.getByRole('textbox', { name: 'SAMPLE LOT' }).first();
    await lotInput.fill('LOT-EMPTYMAIN');
    await page.getByRole('button', { name: '조회' }).click();

    const executeButton = page.getByRole('button', { name: '실행' });
    await expect(page.getByRole('textbox', { name: 'MAIN LOT' })).toHaveValue('');
    await expect(executeButton).toBeEnabled();
    await executeButton.click();
    await expect(page.getByRole('alert')).toHaveText('Main LotName이 확인되지 않습니다..');
  });

  test('closes the page through the router back action', async ({ page }) => {
    await page.getByRole('button', { name: '닫기' }).click();
    await expect(page).toHaveURL(/iframe\.html/);
  });
});
