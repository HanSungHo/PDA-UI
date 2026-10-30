import { expect, type Page, test } from '@playwright/test';

interface CapturedMessage {
  endpoint: string;
  xml: string;
}

async function openMDSSpc(page: Page, delays: { content?: number; insert?: number } = {}) {
  const requests: CapturedMessage[] = [];

  await page.route('**/hifos/**', async (route) => {
    const request = route.request();
    const body = request.postData() ?? '';
    requests.push({ endpoint: new URL(request.url()).pathname, xml: body });

    const isContentRequest = body.includes('<MSGNAME>MDSCONTENT</MSGNAME>');
    const isInsertRequest = body.includes('<MSGNAME>MDSINSERT</MSGNAME>');
    const delay = isContentRequest ? delays.content : isInsertRequest ? delays.insert : undefined;
    if (delay) await new Promise<void>((resolve) => setTimeout(resolve, delay));
    const response = isContentRequest
      ? {
          STATUS: 'PASS',
          MSGBODY: {
            DESCRIPTION:
              'Action one|Action two|Action three|Action four|Action five|Action six|Action seven|Action eight|Action nine|Action ten|Action eleven|Inspection one|Inspection two',
          },
        }
      : { STATUS: 'PASS', MSGBODY: { RESULT: 'OK' } };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, result: JSON.stringify(response) }),
    });
  });

  await page.setViewportSize({ width: 360, height: 720 });
  await page.goto('/#/main');
  await page.waitForFunction(
    () => typeof (window as Window & { mockMDSSpc?: () => void }).mockMDSSpc === 'function',
  );
  await page.evaluate(() => (window as Window & { mockMDSSpc?: () => void }).mockMDSSpc?.());

  const dialog = page.getByRole('dialog', { name: '#MDSSPC INTERLOCK#' });
  await expect(dialog).toBeVisible();
  return { dialog, requests };
}

test('preserves Android values and submits selected MDS comments before acknowledging', async ({
  page,
}) => {
  const { dialog, requests } = await openMDSSpc(page);

  await expect(dialog.getByRole('textbox', { name: '장비', exact: true })).toHaveValue(
    'EQP-DEMO-01',
  );
  await expect(dialog.getByRole('textbox', { name: '발생시간' })).toHaveValue(
    '2026-10-26 09:15:30.123',
  );

  // Figma 7361:76450: a centred modal, two field columns, labels hugging their text (designer).
  const modal = await page.locator('.ds-modal').boundingBox();
  expect(modal).not.toBeNull();
  expect(modal!.x * 2 + modal!.width).toBeCloseTo(360, 0);
  expect(modal!.width).toBeLessThanOrEqual(340);
  const rowColumns = await dialog
    .locator('.mds-spc-row')
    .evaluateAll((rows) => rows.map((row) => row.children.length));
  expect(rowColumns).toEqual([2, 2, 2, 2, 2, 3, 2, 2, 2, 2]);
  const labelGaps = await dialog.locator('.mds-spc-row .ds-input').evaluateAll((inputs) =>
    inputs.map((input) => {
      const label = input.querySelector('.ds-field__label')!.getBoundingClientRect();
      const control = input.querySelector('.q-field__control')!.getBoundingClientRect();
      return Math.round(control.left - label.right);
    }),
  );
  expect(new Set(labelGaps)).toEqual(new Set([8]));
  const controlHeights = await dialog
    .locator('.q-field__control')
    .evaluateAll((controls) =>
      controls.map((control) => Math.round(control.getBoundingClientRect().height)),
    );
  expect(new Set(controlHeights)).toEqual(new Set([32]));
  const footerButtons = await dialog
    .locator('.ds-modal__footer .ds-btn')
    .evaluateAll((buttons) => buttons.map((button) => button.textContent?.trim()));
  expect(footerButtons).toEqual(['OK', '저장']);
  await expect(dialog.getByRole('textbox', { name: 'SPC 결과' })).toHaveValue('[1, 3]');
  await expect
    .poll(() =>
      dialog
        .locator('.mds-spc-value:has(.ds-field__label[title="FACILITY"]) .q-field__control')
        .evaluate((control) => getComputedStyle(control).backgroundColor),
    )
    .toBe('rgb(254, 249, 195)');
  await expect
    .poll(() =>
      dialog
        .getByRole('textbox', { name: 'SPC 결과' })
        .evaluate((input) => getComputedStyle(input).color),
    )
    .toBe('rgb(220, 38, 39)');
  await expect
    .poll(() =>
      dialog
        .locator('.mds-spc-value--spc-result .q-field__control')
        .evaluate((control) => getComputedStyle(control).backgroundColor),
    )
    .toBe('rgb(254, 249, 195)');

  const measure = dialog.getByRole('combobox', { name: '측정/검사 내용' });
  await expect
    .poll(() =>
      requests.some(
        ({ endpoint, xml }) =>
          endpoint === '/hifos/mdscontent' && xml.includes('<MSGNAME>MDSCONTENT</MSGNAME>'),
      ),
    )
    .toBe(true);
  await measure.click();
  // The click's actionability check proves the menu is not covered by the modal.
  await expect(page.getByRole('option', { name: 'Inspection one' })).toBeVisible();
  await page.getByRole('option', { name: 'Inspection one' }).click();

  const action = dialog.getByRole('combobox', { name: '조치 사항' });
  await action.click();
  await page.getByRole('option', { name: 'Action one' }).click();
  await dialog.getByRole('button', { name: '저장' }).click();

  await expect(dialog).toBeVisible();
  await expect
    .poll(() => requests.some(({ xml }) => xml.includes('<MSGNAME>MDSINSERT</MSGNAME>')))
    .toBe(true);
  const insertRequest = requests.find(({ xml }) => xml.includes('<MSGNAME>MDSINSERT</MSGNAME>'));
  expect(insertRequest?.endpoint).toBe('/hifos/mdsinsert');
  expect(insertRequest?.xml).toContain('<INSPECT_COMMENT>Inspection one</INSPECT_COMMENT>');
  expect(insertRequest?.xml).toContain('<ACT_COMMENT>Action one</ACT_COMMENT>');

  await dialog.getByRole('button', { name: 'OK' }).click();
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(() =>
      requests.some(
        ({ endpoint, xml }) =>
          endpoint.endsWith('/setgasusage') &&
          xml.includes('<MSGNAME>INTLKPOPUPCHECK</MSGNAME>') &&
          xml.includes('<EVENT_TYPE>MDSSPC</EVENT_TYPE>') &&
          xml.includes('<USER_CONFIRM>Y</USER_CONFIRM>'),
      ),
    )
    .toBe(true);
});

test('blocks choices and Save controls while their Android message requests are pending', async ({
  page,
}) => {
  // Long enough to observe the pending state after the dialog has rendered.
  const { dialog, requests } = await openMDSSpc(page, { content: 1000, insert: 1000 });
  const save = dialog.getByRole('button', { name: '저장' });
  const content = dialog.locator('.mds-spc-choices');

  await expect(content).toHaveAttribute('aria-busy', 'true');
  await expect(save).toBeDisabled();
  await expect(dialog.getByRole('combobox', { name: '측정/검사 내용' })).toBeDisabled();
  await expect(save).toBeEnabled();

  await dialog.getByRole('combobox', { name: '측정/검사 내용' }).click();
  await page.getByRole('option', { name: 'Inspection one' }).click();
  await dialog.getByRole('combobox', { name: '조치 사항' }).click();
  await page.getByRole('option', { name: 'Action one' }).click();

  const insertRequestPromise = page.waitForRequest((request) =>
    request.url().endsWith('/hifos/mdsinsert'),
  );
  await save.click();
  await insertRequestPromise;
  await expect(save).toBeDisabled();
  await expect(content).toHaveAttribute('aria-busy', 'true');
  expect(requests.filter(({ endpoint }) => endpoint === '/hifos/mdsinsert')).toHaveLength(1);
  await expect(save).toBeEnabled();
});

test('Escape closes the open dropdown but keeps the interlock open without acknowledgement', async ({
  page,
}) => {
  const { dialog, requests } = await openMDSSpc(page);

  await dialog.getByRole('combobox', { name: '측정/검사 내용' }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);

  // Like Android, only OK or the device Back button closes the interlock.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  expect(requests.some(({ endpoint }) => endpoint.endsWith('/setgasusage'))).toBe(false);
});
