import { expect, test } from '@playwright/test';

test('loads and downloads RCP conditions through the mock AIFMSG server', async ({ page }) => {
  const aifRequests: Array<{ url: string; body: string }> = [];
  page.on('request', (request) => {
    if (/127\.0\.0\.1:8080\/hifos\//.test(request.url())) {
      aifRequests.push({ url: request.url(), body: request.postData() ?? '' });
    }
  });

  await page.goto('/#/remote-cvd?LOTID=CVD-MOCK-001&mock=1');
  await expect(page.getByRole('heading', { name: 'Remote Start' })).toBeVisible();
  await page.getByRole('textbox', { name: '진행장비' }).fill('EQP-CVD01X');
  await page.getByRole('textbox', { name: '진행장비' }).press('Enter');
  await expect(page.getByRole('textbox', { name: '진행장비' })).toHaveValue('CVD01');

  await page.getByRole('button', { name: 'RCP 조건' }).click();
  const childDialog = page.getByRole('dialog').filter({ hasText: 'RCP 조건' });
  await expect(childDialog).toBeVisible();
  await expect(childDialog.getByRole('textbox', { name: 'Machine' })).toHaveValue('CVD-MAIN-01');

  const sampleWarning = page
    .getByRole('dialog')
    .filter({ hasText: 'Sample verification required before run' });
  await expect(sampleWarning).toBeVisible();
  await sampleWarning.getByRole('button', { name: '확인' }).click();
  await expect(sampleWarning).toBeHidden();

  await childDialog.getByRole('button', { name: '변경' }).click();
  const confirmation = page.getByRole('dialog').filter({ hasText: 'Recipe를 변경하시겠습니까?' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: '확인' }).click();

  await expect(childDialog.getByText('정상', { exact: true }).first()).toBeVisible();
  await expect
    .poll(() => aifRequests.filter(({ url }) => url.endsWith('/hifos/etchcommrcp')).length)
    .toBe(1);
  await expect
    .poll(() => aifRequests.filter(({ url }) => url.endsWith('/hifos/etchrcpdownload')).length)
    .toBe(1);

  const commRcpRequest = aifRequests.find(({ url }) => url.endsWith('/hifos/etchcommrcp'));
  const downloadRequest = aifRequests.find(({ url }) => url.endsWith('/hifos/etchrcpdownload'));
  expect(commRcpRequest?.body).toContain('<MSGNAME>ETCH_COMMRCP</MSGNAME>');
  expect(commRcpRequest?.body).toContain('<LOTID>CVD-MOCK-001</LOTID>');
  expect(commRcpRequest?.body).toContain('<EQP>CVD-MAIN-01</EQP>');
  expect(downloadRequest?.body).toContain('<MSGNAME>ETCH_RCP_DOWNLOAD</MSGNAME>');
  expect(downloadRequest?.body).toContain('<USERID>');
  expect(downloadRequest?.body).toContain('<PARAMETER>RF_TOP_PWR@RF_BOT_PWR</PARAMETER>');
  expect(downloadRequest?.body).toContain('<DOWN_VALUE>320@110</DOWN_VALUE>');
});
