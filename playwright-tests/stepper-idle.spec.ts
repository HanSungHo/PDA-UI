import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { stepperIdleMockMessage } from '../src/features/stepper-idle/mocks/stepper-idle.mock';

async function openStepperDialog(page: Page, message: string) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => typeof (window as Window & { mockStepperIdle?: unknown }).mockStepperIdle === 'function',
  );
  await page.evaluate((receiverMessage) => {
    (window as Window & { mockStepperIdle?: (message?: string) => void }).mockStepperIdle?.(
      receiverMessage,
    );
  }, message);
}

test.describe('StepperIdle Dialog', () => {
  test.describe.configure({ mode: 'serial' });

  test('renders dialog with parsed INTERLOCKMANAGER data', async ({ page }) => {
    await openStepperDialog(page, stepperIdleMockMessage);

    // Dialog must be visible
    const dialog = page.locator('.stepper-idle-modal');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Title
    await expect(page.getByText('STEPPER IDLE')).toBeVisible();

    // Labels
    await expect(page.getByText('발생시간')).toBeVisible();
    await expect(page.getByText('장비명')).toBeVisible();
    await expect(page.getByText('LOTNAME')).toBeVisible();
    await expect(page.getByText('WAFER_NO')).toBeVisible();
    await expect(page.getByText('내용')).toBeVisible();

    // Parsed values from mock message
    await expect(page.getByText('2026-10-21T09:15:30.000+09:00')).toBeVisible();
    await expect(page.getByText('STEPPER-EQP-01')).toBeVisible();
    await expect(page.getByText('LOT-DEMO-IDLE-01')).toBeVisible();
    await expect(page.getByText('12')).toBeVisible();

    // Fixed notice text
    await expect(page.getByText('마지막 WAFER 진행 후 7분이상 경과')).toBeVisible();

    // OK button visible
    await expect(page.getByRole('button', { name: 'OK' })).toBeVisible();
  });

  test('does not close dialog when clicking outside (overlay-closable=false)', async ({ page }) => {
    await openStepperDialog(page, stepperIdleMockMessage);

    const dialog = page.locator('.stepper-idle-modal');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Click the overlay (outside the dialog panel)
    await page.mouse.click(10, 10);

    // Dialog must still be visible
    await expect(dialog).toBeVisible();
  });

  test('closes dialog when OK is clicked', async ({ page }) => {
    await openStepperDialog(page, stepperIdleMockMessage);

    const dialog = page.locator('.stepper-idle-modal');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'OK' }).click();

    // Dialog closes without navigating away from the current page.
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test('renders empty values gracefully when message has no table rows', async ({ page }) => {
    await openStepperDialog(
      page,
      '<EVENT_TYPE>STEPPERIDLE</EVENT_TYPE><INTERLOCKMANAGER></INTERLOCKMANAGER>',
    );

    const dialog = page.locator('.stepper-idle-modal');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText('STEPPER IDLE')).toBeVisible();
    await expect(page.getByText('').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'OK' })).toBeVisible();
  });
});
