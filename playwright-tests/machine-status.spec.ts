import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function openConfiguredMachineStatus(page: Page, area: string): Promise<void> {
  await page.addInitScript((settingArea) => {
    localStorage.setItem(
      'main.settingInfo',
      JSON.stringify({
        area: settingArea,
        bay: '',
        facility: 'GUMI',
        forwardCount: '0',
        historyCount: '0',
      }),
    );
  }, area);
  await page.goto('/#/main');
  await expect(page.getByText('HiFOS AR-DEMO')).toBeVisible();
  await page.evaluate(() => {
    window.location.hash = '/machine-status';
  });
  await expect(page.getByRole('heading', { name: '장비 상태' })).toBeVisible();
}

test.describe('Machine Status (장비 상태)', () => {
  test('loads BAY options and equipment through the mock server on a direct route entry', async ({
    page,
  }) => {
    const aifRequests: Array<{ url: string; body: string }> = [];
    page.on('request', (request) => {
      if (/127\.0\.0\.1:8080\/hifos\//.test(request.url())) {
        aifRequests.push({ url: request.url(), body: request.postData() ?? '' });
      }
    });

    await page.goto('/#/machine-status');
    await expect(page.getByRole('heading', { name: '장비 상태' })).toBeVisible();
    await expect(page.getByRole('button', { name: '조회' })).toBeEnabled();
    await expect(page.getByRole('textbox', { name: '장비' })).toHaveValue('');
    const baySelect = page.getByRole('combobox', { name: 'BAY' });
    await baySelect.click();
    await expect(page.getByRole('option', { name: 'P01' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'P02' })).toBeVisible();
    await page.getByRole('option', { name: 'P01' }).click();
    await page.getByRole('button', { name: '조회' }).click();
    await expect(page.locator('.base-revo-grid')).toContainText('EQP-PUMP-01');
    await expect(page.locator('.base-revo-grid')).toContainText('EQP-PUMP-02');
    await expect(page.locator('.ds-screen__card .ds-screen__card-row')).toHaveCount(2);
    await expect(
      page.locator('.ds-screen__card .ds-screen__card-row').nth(1).getByRole('button', {
        name: '상세상태',
      }),
    ).toBeVisible();
    await expect(
      page.locator('.ds-screen__footer').getByRole('button', { name: '닫기' }),
    ).toBeVisible();
    expect(await page.locator('.ds-screen__header').boundingBox()).toMatchObject({
      height: 36,
    });
    expect(await page.locator('.ds-screen__card').first().boundingBox()).toMatchObject({
      x: 12,
      width: 336,
    });
    expect(await page.locator('.ds-screen__footer').boundingBox()).toMatchObject({
      y: 676,
      height: 44,
    });
    expect(await page.locator('.ds-screen__footer .ds-btn').boundingBox()).toMatchObject({
      y: 680,
      height: 36,
    });

    await expect
      .poll(() => aifRequests.filter(({ url }) => url.endsWith('/hifos/areabayinfo')).length)
      .toBe(1);
  });

  test('loads BAY options from saved settings when opened directly', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'main.settingInfo',
        JSON.stringify({
          area: 'PHOTO',
          bay: '',
          facility: 'GUMI',
          forwardCount: '0',
          historyCount: '0',
        }),
      );
    });

    await page.goto('/#/machine-status');
    await expect(page.getByRole('heading', { name: '장비 상태' })).toBeVisible();
    await page.getByRole('combobox', { name: 'BAY' }).click();
    await expect(page.getByRole('option', { name: 'P01' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'P02' })).toBeVisible();
  });

  test('shows the input-required dialog when 상세상태 is pressed with an empty 장비', async ({
    page,
  }) => {
    await page.goto('/#/machine-status');
    await expect(page.getByRole('heading', { name: '장비 상태' })).toBeVisible();

    await page.getByRole('button', { name: '상세상태' }).click();

    const dialog = page.getByRole('dialog').filter({ hasText: '장비를 입력해주세요' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: '확인' })).toBeVisible();
    await dialog.getByRole('button', { name: '확인' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/#\/machine-status$/);
  });

  test('opens machine status detail with the entered 장비 on 상세상태', async ({ page }) => {
    await page.goto('/#/machine-status');
    await expect(page.getByRole('heading', { name: '장비 상태' })).toBeVisible();

    await page.getByRole('textbox', { name: '장비' }).fill('EQP-PUMP-01');
    await page.getByRole('button', { name: '상세상태' }).click();

    await expect(page).toHaveURL(/#\/machine-status-detail\?EQPID=EQP-PUMP-01/);
  });

  test('preserves BAY, equipment input, and rows when detail returns without RESULT_OK', async ({
    page,
  }) => {
    await openConfiguredMachineStatus(page, 'PHOTO');
    await page.getByRole('combobox', { name: 'BAY' }).click();
    await page.getByRole('option', { name: 'P01' }).click();
    await page.getByRole('button', { name: '조회' }).click();
    await expect(page.locator('.base-revo-grid')).toContainText('EQP-PUMP-01');
    await page.getByRole('textbox', { name: '장비' }).fill('EQP-PUMP-01');
    await page.getByRole('button', { name: '상세상태' }).click();
    await expect(page).toHaveURL(/#\/machine-status-detail\?EQPID=EQP-PUMP-01/);

    await page.goBack();

    await expect(page).toHaveURL(/#\/machine-status$/);
    await expect(page.getByRole('combobox', { name: 'BAY' })).toHaveValue('P01');
    await expect(page.getByRole('textbox', { name: '장비' })).toHaveValue('EQP-PUMP-01');
    await expect(page.locator('.base-revo-grid')).toContainText('EQP-PUMP-01');
  });

  test('keeps the selected BAY and refreshes the grid after detail returns RESULT_OK', async ({
    page,
  }) => {
    const bayRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/hifos/bayeqpinfo')) bayRequests.push(request.postData() ?? '');
    });

    await openConfiguredMachineStatus(page, 'PHOTO');
    await page.getByRole('combobox', { name: 'BAY' }).click();
    await page.getByRole('option', { name: 'P01' }).click();
    await page.getByRole('button', { name: '조회' }).click();
    await expect.poll(() => bayRequests.length).toBe(1);
    await expect(page.locator('.base-revo-grid')).toContainText('EQP-PUMP-01');
    await page.getByRole('textbox', { name: '장비' }).fill('EQP-PUMP-01');
    await page.getByRole('button', { name: '상세상태' }).click();
    await expect(page).toHaveURL(/#\/machine-status-detail\?EQPID=EQP-PUMP-01/);

    await page.getByRole('button', { name: '닫기', exact: true }).click();

    await expect(page).toHaveURL(/#\/machine-status$/);
    await expect(page.getByRole('combobox', { name: 'BAY' })).toHaveValue('P01');
    await expect(page.getByRole('textbox', { name: '장비' })).toHaveValue('');
    await expect.poll(() => bayRequests.length).toBe(2);
    expect(bayRequests[1]).toContain('<BAYID>P01</BAYID>');
    await expect(page.locator('.base-revo-grid')).toContainText('EQP-PUMP-01');
  });

  test('loads and renders equipment for the selected BAY only after 조회', async ({ page }) => {
    const bayRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/hifos/bayeqpinfo')) bayRequests.push(request.postData() ?? '');
    });

    await openConfiguredMachineStatus(page, 'PHOTO');
    const baySelect = page.getByRole('combobox', { name: 'BAY' });
    await baySelect.click();
    await page.getByRole('option', { name: 'P01' }).click();
    expect(bayRequests).toHaveLength(0);

    await page.getByRole('button', { name: '조회' }).click();
    await expect.poll(() => bayRequests.length).toBe(1);
    expect(bayRequests[0]).toContain('<BAYID>P01</BAYID>');
    await expect(page.locator('.base-revo-grid')).toContainText('EQP-PUMP-01');
    await expect(page.locator('.base-revo-grid')).toContainText('EQP-PUMP-02');
  });

  test('shows the mock business error for a FAIL BAY', async ({ page }) => {
    await page.route('**/hifos/areabayinfo', async (route) => {
      const response = await route.fetch();
      const envelope = (await response.json()) as { result: string };
      const result = JSON.parse(envelope.result) as {
        MSGBODY: { BAYS: { ITEM: Array<{ BAY: string }> } };
      };
      result.MSGBODY.BAYS.ITEM.push({ BAY: 'FAIL-EQP' });
      await route.fulfill({
        status: response.status(),
        contentType: 'application/json',
        body: JSON.stringify({ ...envelope, result: JSON.stringify(result) }),
      });
    });

    await openConfiguredMachineStatus(page, 'PHOTO');
    await page.getByRole('combobox', { name: 'BAY' }).click();
    await page.getByRole('option', { name: 'FAIL-EQP' }).click();
    await page.getByRole('button', { name: '조회' }).click();

    await expect(page.getByRole('dialog').filter({ hasText: 'EQP DATA Empty!' })).toBeVisible();
  });

  test('keeps the empty state when the selected BAY has no equipment', async ({ page }) => {
    await openConfiguredMachineStatus(page, 'ETCH');
    await page.getByRole('combobox', { name: 'BAY' }).click();
    await page.getByRole('option', { name: 'E01' }).click();
    await page.getByRole('button', { name: '조회' }).click();

    await expect(page.locator('.ds-empty-state')).toBeVisible();
    await expect(page.locator('.base-revo-grid')).toHaveCount(0);
  });
});
