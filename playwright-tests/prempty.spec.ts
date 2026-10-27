import { expect, test } from '@playwright/test';

import { createPremptyHandlers } from '../mock-server/src/messages/prempty.handlers.js';

const premptyHandlers = createPremptyHandlers();
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': '*',
  'content-type': 'application/json',
};

test.describe('PR_EMPTY (prempty) E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept the SetGasusage confirmation call
    await page.route('**/hifos/setgasusage', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          statusCode: 200,
          result: JSON.stringify({ STATUS: 'PASS', RESULT: 'OK' }),
        }),
      });
    });

    // Intercept /message/send and delegate to the prempty handler
    await page.route('**/message/send', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      const { messageName, payload } = request.postDataJSON() as {
        messageName: string;
        payload: Record<string, unknown>;
      };
      const handler = (premptyHandlers as Record<string, unknown>)[messageName];
      if (!handler || typeof handler !== 'function') {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify(handler({ payload })),
      });
    });
  });

  test('displays prempty dialog with all field labels', async ({ page }) => {
    await page.goto('/iframe.html?id=features-prempty-prempty-dialog--default&viewMode=story', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByRole('heading', { name: 'PR EMPTY INTERLOCK' })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByTestId('txt-prempty-time-result')).toBeVisible();
    await expect(page.getByTestId('txt-prempty-level-result')).toBeVisible();
    await expect(page.getByTestId('txt-prempty-mcahine-result')).toBeVisible();
    await expect(page.getByTestId('txt-prempty-model-result')).toBeVisible();
    await expect(page.getByTestId('txt-prempty-facility-result')).toBeVisible();
    await expect(page.getByTestId('txt-prempty-pumpid-result')).toBeVisible();
    await expect(page.getByTestId('txt-prempty-pumpname-result')).toBeVisible();
    await expect(page.getByTestId('txt-prempty-desc-result')).toBeVisible();

    const okButton = page.getByTestId('btn-ok');
    await expect(okButton).toBeVisible();
    await expect(okButton).toHaveText(/OK/i);
  });

  test('populates fields from UDP XML message', async ({ page }) => {
    await page.goto('/iframe.html?id=features-prempty-prempty-dialog--default&viewMode=story', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByTestId('txt-prempty-time-result')).toBeVisible({ timeout: 15_000 });

    // TIME field: timezone offset stripped, T replaced with space
    const timeInput = page.getByTestId('txt-prempty-time-result').locator('input');
    await expect(timeInput).toHaveValue('2026-10-26 09:15:30.000');

    await expect(page.getByTestId('txt-prempty-mcahine-result').locator('input')).toHaveValue(
      'EQP-PUMP-01',
    );
    await expect(page.getByTestId('txt-prempty-model-result').locator('input')).toHaveValue(
      'MODEL-A',
    );
    await expect(page.getByTestId('txt-prempty-facility-result').locator('input')).toHaveValue(
      'FAC-01',
    );
    await expect(page.getByTestId('txt-prempty-pumpid-result').locator('input')).toHaveValue(
      'PUMP-001',
    );
    await expect(page.getByTestId('txt-prempty-pumpname-result').locator('input')).toHaveValue(
      'MAIN PUMP',
    );
    await expect(page.getByTestId('txt-prempty-desc-result').locator('input')).toHaveValue(
      'PR_EMPTY_ALARM',
    );
  });

  test('submits INTLKPOPUPCHECK with EVENT_TYPE=PR_EMPTY when OK button is clicked', async ({
    page,
  }) => {
    let capturedXml = '';

    await page.route('**/hifos/setgasusage', async (route) => {
      capturedXml = route.request().postDataJSON()?.sMsg ?? '';
      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          statusCode: 200,
          result: JSON.stringify({ STATUS: 'PASS', RESULT: 'OK' }),
        }),
      });
    });

    await page.goto('/iframe.html?id=features-prempty-prempty-dialog--default&viewMode=story', {
      waitUntil: 'domcontentloaded',
    });

    const okButton = page.getByTestId('btn-ok');
    await expect(okButton).toBeVisible({ timeout: 15_000 });
    await okButton.click();

    expect(capturedXml).toContain('<MSGNAME>INTLKPOPUPCHECK</MSGNAME>');
    expect(capturedXml).toContain('<EVENT_TYPE>PR_EMPTY</EVENT_TYPE>');
    expect(capturedXml).toContain('<NOTICE_TYPE>POP-UP</NOTICE_TYPE>');
    expect(capturedXml).toContain('<USER_CONFIRM>Y</USER_CONFIRM>');
    expect(capturedXml).toContain('<EQPID>EQP-PUMP-01</EQPID>');
    expect(capturedXml).toContain('<RECIPE>NULL</RECIPE>');
    expect(capturedXml).toContain('<LOTID>NULL</LOTID>');
    expect(capturedXml).toContain('<SLOT>NULL</SLOT>');
  });
});
