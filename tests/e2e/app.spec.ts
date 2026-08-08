import { test, expect, type Page } from '@playwright/test';
import { assertE2ELiveAllowed } from './liveGuard';

test.beforeAll(() => {
  assertE2ELiveAllowed();
});

async function guestIn(page: Page, pseudo: string) {
  await page.goto('/');
  await expect(page.getByPlaceholder(/votre pseudo/i)).toBeVisible({ timeout: 15000 });
  const age = page.getByRole('checkbox');
  if (!(await age.isChecked())) await age.check();
  await page.getByPlaceholder(/votre pseudo/i).fill(pseudo);
  await page.getByRole('button', { name: /entrer en mode invité/i }).click();
  await expect(page.getByPlaceholder(/votre pseudo/i)).toHaveCount(0, { timeout: 15000 });

  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible({ timeout: 8000 }).catch(() => false)) {
    await dialog.getByRole('button', { name: /^passer$/i }).last().click();
    await expect(dialog).toHaveCount(0, { timeout: 10000 });
  }
}

test.describe('Virtuel-RT — parcours invité', () => {
  test('Accueil et connexion invité', async ({ page }) => {
    await guestIn(page, `E2E_${Date.now().toString().slice(-6)}`);
    await expect(page.getByRole('button', { name: /mon compte/i })).toBeVisible({ timeout: 10000 });
  });

  test('Navigation vers un salon et saisie message', async ({ page }) => {
    await guestIn(page, `Msg_${Date.now().toString().slice(-6)}`);
    await page.getByRole('button', { name: /salon général/i }).first().click({ timeout: 15000 });
    const chatInput = page.getByRole('textbox', { name: /^message$/i });
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await chatInput.fill('Message E2E Playwright');
    await page.getByRole('button', { name: /envoyer le message/i }).click();
    await expect(page.getByText('Message E2E Playwright').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin (si accès)', () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, 'Nécessite E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD');

  test('Panel admin accessible', async ({ page }) => {
    await page.goto('/');
    const age = page.getByRole('checkbox');
    if (!(await age.isChecked())) await age.check();
    await page.getByRole('button', { name: /compte|connexion|login/i }).first().click();
    await page.fill('input[type="email"]', process.env.E2E_ADMIN_EMAIL!);
    await page.fill('input[type="password"]', process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /connexion|se connecter/i }).click();
    await page.getByRole('button', { name: /admin/i }).click({ timeout: 15000 });
    await expect(page.getByText(/administration|modération|dashboard/i).first()).toBeVisible();
  });
});
