import { test, expect } from '@playwright/test';

test.describe('Chat E2E (aligné UX réelle)', () => {
  test('invité peut ouvrir un salon writable', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder(/votre pseudo/i)).toBeVisible({ timeout: 20000 });
    const age = page.getByRole('checkbox');
    if (!(await age.isChecked())) await age.check();
    await page.getByPlaceholder(/votre pseudo/i).fill(`Chat_${Date.now().toString().slice(-6)}`);
    await page.getByRole('button', { name: /entrer en mode invité/i }).click();
    await expect(page.getByPlaceholder(/votre pseudo/i)).toHaveCount(0, { timeout: 20000 });

    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible({ timeout: 8000 }).catch(() => false)) {
      await dialog.getByRole('button', { name: /^passer$/i }).last().click();
      await expect(dialog).toHaveCount(0, { timeout: 10000 });
    }

    await page.getByRole('button', { name: /salon général/i }).first().click({ timeout: 20000 });
    await expect(page.getByRole('textbox', { name: /^message$/i })).toBeVisible({ timeout: 15000 });
  });
});
