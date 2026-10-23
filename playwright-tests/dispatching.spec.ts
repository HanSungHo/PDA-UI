import { expect, type Page, test } from '@playwright/test';

type DispatchingGridRow = { rowClass?: string };

async function gridRowClasses(page: Page): Promise<string[]> {
  return page.locator('revo-grid').evaluate((element) => {
    const grid = element as HTMLElement & { source?: DispatchingGridRow[] };
    return (grid.source ?? []).map((row) => row.rowClass ?? '');
  });
}

async function selectedRowCount(page: Page): Promise<number> {
  return (await gridRowClasses(page)).filter((rowClass) =>
    rowClass.includes('dispatching__row--selected'),
  ).length;
}

test('Arrow navigation does not select a dispatching LOT, while Enter and a pointer tap do', async ({
  page,
}) => {
  await page.goto('/#/dispatching');
  await page.getByRole('textbox', { name: 'Machine', exact: true }).fill('ETCH-MC-01');
  await page.getByRole('button', { name: '조회', exact: true }).click();
  await expect(page.getByText('LOT-DSP-01', { exact: true })).toBeVisible();

  const firstCell = page.locator('.rgCell').first();
  await firstCell.click();
  await expect.poll(() => selectedRowCount(page)).toBe(1);

  const selectedByPointer = await gridRowClasses(page);
  await firstCell.focus();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => gridRowClasses(page)).toEqual(selectedByPointer);

  await page.keyboard.press('Enter');
  await expect.poll(() => selectedRowCount(page)).toBe(0);
  await page.keyboard.press('Space');
  await expect.poll(() => selectedRowCount(page)).toBe(1);

  await page.locator('.rgCell').filter({ hasText: 'LOT-DSP-01' }).first().dblclick();
  await expect(page.getByRole('textbox', { name: 'LOT', exact: true })).toHaveValue('LOT-DSP-01');
  await page.getByRole('button', { name: '뒤로가기', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Machine', exact: true })).toHaveValue(
    'ETCH-MC-01',
  );
});
