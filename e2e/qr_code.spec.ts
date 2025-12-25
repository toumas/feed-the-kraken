import { test, expect } from '@playwright/test';

test.use({
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  },
});

test('verify qr code modal in lobby', async ({ page }) => {
  // Go to homepage
  await page.goto('/en');

  // Create a voyage (Host flow)
  await page.getByRole('button', { name: 'Create Voyage' }).click();

  // Wait for redirect to identify page
  await page.waitForURL('**/identify?next=create');

  // Fill profile info
  await page.getByRole('textbox').fill('Host Player');

  // Grant camera permissions just in case
  await page.context().grantPermissions(['camera']);

  // Open camera
  await page.getByTitle('Open Camera').click();

  // Wait a bit
  await page.waitForTimeout(500);
  await page.getByLabel('Take Photo').click();

  // Save profile
  await page.getByRole('button', { name: 'Save Profile' }).click();

  // Wait for lobby - increase timeout as server might be slow
  await expect(page).toHaveURL(/.*\/lobby/, { timeout: 30000 });

  // Wait for the lobby to fully load
  await expect(page.getByText('Ship Code')).toBeVisible({ timeout: 10000 });

  // Verify QR code button is present
  const qrButton = page.getByTitle('Show QR Code');
  await expect(qrButton).toBeVisible();

  // Click it
  await qrButton.click();

  // Verify modal appears
  const modalHeading = page.getByRole('heading', { name: 'Scan to Join' });
  await expect(modalHeading).toBeVisible();

  // Verify Ship Code is displayed in modal
  // Scope to the modal container using a unique class combination
  const modal = page.locator('.fixed.inset-0 .bg-slate-900');
  await expect(modal.locator('.text-cyan-400.font-mono')).toBeVisible();

  // Close modal
  // Find the button inside the modal that has the X icon
  await modal.locator('button').filter({ has: page.locator('svg.lucide-x') }).click();

  // Verify modal is gone
  await expect(modalHeading).not.toBeVisible();
});
