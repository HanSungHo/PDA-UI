import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/remote-cvd?LOTID=CVD-MOCK-001&mock=1');
});

test('loads equipment, selects a PORT, and returns from Comment List with parent state', async ({
  page,
}) => {
  await expect(page.getByRole('heading', { name: 'Remote Start' })).toBeVisible();
  await page.getByRole('textbox', { name: '진행장비' }).fill('EQP-CVD01X');
  await page.getByRole('textbox', { name: '진행장비' }).press('Enter');

  await expect(page.getByRole('textbox', { name: '진행장비' })).toHaveValue('CVD01');
  await expect(page.getByRole('textbox', { name: 'A', exact: true })).toHaveValue('92%');
  await expect(page.getByText('CVD:RECIPE-A')).toBeVisible();

  await page.getByRole('combobox', { name: 'PORT' }).click();
  await page.getByRole('option', { name: '1' }).click();
  await expect(page.getByRole('textbox', { name: 'PORT 상태' })).toHaveValue('READY');

  await page.getByRole('button', { name: '읽기' }).click();
  await expect(page).toHaveURL(/remote-cvd\/comment-list/);
  await expect(page.getByText('COMMENT LIST', { exact: true })).toBeVisible();
  await expect(page.getByText('CVD-MOCK-001', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '닫기' }).click();
  await expect(page).toHaveURL(/remote-cvd\?/);
  await expect(page.getByRole('textbox', { name: '진행장비' })).toHaveValue('CVD01');
  await expect(page.getByRole('textbox', { name: 'PORT 상태' })).toHaveValue('READY');
});

test('opens Remote CVD from Remote Machine Select for a CVD LOT', async ({ page }) => {
  await page.route('**/hifos/lotinfo', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: {
            STATE: 'WIP',
            STATUS: 'WAIT',
            AREA: 'CVD',
            OPERATION: '10020',
            SUBOPERATION: '00',
            PROCESSSTEP: 'CVD PROCESS',
            FACILITY: 'GUMI',
          },
        }),
      }),
    });
  });

  await page.goto('/?test=remote-cvd#/activity-remote-machine-select?LOTID=CVD-PARENT-001');

  await expect(page).toHaveURL(/\/remote-cvd\?LOTID=CVD-PARENT-001/);
  await expect(page.getByRole('heading', { name: 'Remote Start' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'LOT No.' })).toHaveValue('CVD-PARENT-001');
});

test('keeps the Q field reachable when Android-only fields extend the design viewport', async ({
  page,
}) => {
  await page.getByRole('textbox', { name: '진행장비' }).fill('EQP-CVD01X');
  await page.getByRole('textbox', { name: '진행장비' }).press('Enter');

  await expect(page.getByRole('textbox', { name: 'GOOD CHIPS' })).toHaveValue('25');

  const content = page.locator('.remote-cvd__content');
  const qField = page.getByRole('textbox', { name: 'Q' });
  const footer = page.locator('.remote-cvd__footer');

  await content.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect(qField).toBeInViewport();
  const [qBounds, footerBounds] = await Promise.all([qField.boundingBox(), footer.boundingBox()]);

  expect(qBounds).not.toBeNull();
  expect(footerBounds).not.toBeNull();
  expect(qBounds!.y + qBounds!.height).toBeLessThanOrEqual(footerBounds!.y);
});

test('opens RCP Conditions with parent context and returns to the unchanged Remote CVD screen', async ({
  page,
}) => {
  await page.getByRole('textbox', { name: '진행장비' }).fill('EQP-CVD01X');
  await page.getByRole('textbox', { name: '진행장비' }).press('Enter');

  const rcpButton = page.getByRole('button', { name: 'RCP 조건' });
  await expect(rcpButton).toBeVisible();
  await rcpButton.click();

  const childDialog = page.getByRole('dialog').filter({ hasText: 'RCP 조건' });
  await expect(childDialog).toBeVisible();
  await expect(childDialog.getByRole('textbox', { name: 'Machine' })).toHaveValue('CVD-MAIN-01');
  await expect(childDialog.getByRole('textbox', { name: 'Recipe' })).toHaveValue(
    'PROC_ETCH_REPLACED_01',
  );

  const sampleAlert = page
    .getByRole('dialog')
    .filter({ hasText: 'Sample verification required before run' });
  await expect(sampleAlert).toBeVisible();
  await sampleAlert.getByRole('button', { name: '확인' }).click();
  await expect(sampleAlert).toBeHidden();

  await childDialog.getByRole('button', { name: '닫기' }).click();
  await expect(childDialog).toBeHidden();
  await expect(page.getByRole('textbox', { name: '진행장비' })).toHaveValue('CVD01');
  await expect(rcpButton).toBeVisible();
});

test('validates START, confirms the recipe, and completes the mock request', async ({ page }) => {
  await page.getByRole('button', { name: 'START', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('진행장비를 입력하세요.');
  await page.getByRole('button', { name: '확인' }).click();

  await page.getByRole('textbox', { name: '진행장비' }).fill('EQP-CVD01X');
  await page.getByRole('textbox', { name: '진행장비' }).press('Enter');
  await expect(page.getByRole('button', { name: 'START', exact: true })).toBeEnabled();

  await page.getByRole('combobox', { name: 'PORT' }).click();
  await page.getByRole('option', { name: '1' }).click();
  await page.getByRole('button', { name: 'START', exact: true }).click();
  await expect(
    page.locator('.remote-recipe-dialog-modal').getByText('CVD:RECIPE-A', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '확인' }).last().click();

  await expect(page).toHaveURL(/esheet\?lotId=CVD-MOCK-001/);
});

test('announces the pending LOT request to assistive technology', async ({ page }) => {
  let releaseRequest!: () => void;
  let markRequestStarted!: () => void;
  const requestGate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  const requestStarted = new Promise<void>((resolve) => {
    markRequestStarted = resolve;
  });

  await page.route('**/lotinfo', async (route) => {
    markRequestStarted();
    await requestGate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        result: JSON.stringify({
          STATUS: 'PASS',
          MSGBODY: { STATE: 'WIP', OPERATION: '10020', FACILITY: 'GUMI' },
        }),
      }),
    });
  });

  await page.goto('/#/remote-cvd?LOTID=CVD-MOCK-002');
  await page.reload();
  await requestStarted;

  try {
    await expect(page.getByRole('status', { name: '처리중' })).toBeVisible();
  } finally {
    releaseRequest();
  }
});
