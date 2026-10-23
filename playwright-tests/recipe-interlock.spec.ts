import { expect, test } from '@playwright/test';

import { createRecipeInterlockHandlers } from '../mock-server/src/messages/recipe-interlock.handlers.js';

const recipeInterlockHandlers = createRecipeInterlockHandlers();
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': '*',
  'content-type': 'application/json',
};

test.describe('Recipe Interlock E2E', () => {
  test.beforeEach(async ({ page }) => {
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

    await page.route('**/message/send', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      const { messageName, payload } = request.postDataJSON() as {
        messageName: keyof typeof recipeInterlockHandlers;
        payload: Record<string, unknown>;
      };
      const handler = recipeInterlockHandlers[messageName];
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
  });

  test('displays recipe interlock screen with warning banner and mismatch highlight', async ({
    page,
  }) => {
    await page.goto(
      '/iframe.html?id=features-recipe-interlock-recipe-interlock-page--default&viewMode=story',
      { waitUntil: 'domcontentloaded' },
    );

    await expect(page.getByRole('heading', { name: 'RECIPE 진행 오류' })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByTestId('txt-notice')).toHaveText(
      '예약된 Recipe 와 진행되는 Recipe가 다릅니다',
    );

    await expect(page.getByTestId('txt-receiver-machine-value')).toBeVisible();
    await expect(page.getByTestId('txt-receiver-lotid-value')).toBeVisible();
    await expect(page.getByTestId('txt-receiver-remote-recipe-value')).toBeVisible();
    await expect(page.getByTestId('txt-receiver-process-recipe-value')).toBeVisible();
    await expect(page.getByTestId('txt-receiver-time-value')).toBeVisible();

    const okButton = page.getByTestId('btn-ok');
    await expect(okButton).toBeVisible();
    await expect(okButton).toHaveText(/OK/i);
  });

  test('submits interlock confirmation when clicking Ok button', async ({ page }) => {
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

    await page.goto(
      '/iframe.html?id=features-recipe-interlock-recipe-interlock-page--default&viewMode=story',
      { waitUntil: 'domcontentloaded' },
    );

    const okButton = page.getByTestId('btn-ok');
    await expect(okButton).toBeVisible();
    await okButton.click();

    expect(capturedXml).toContain('<MSGNAME>INTLKPOPUPCHECK</MSGNAME>');
    expect(capturedXml).toContain('<EVENT_TYPE>RECIPE</EVENT_TYPE>');
    expect(capturedXml).toContain('<EQPID>EQP-TEST01</EQPID>');
    expect(capturedXml).toContain('<RECIPE>RCP_REMOTE_001</RECIPE>');
  });
});
