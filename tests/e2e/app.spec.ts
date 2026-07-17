import { test, expect } from '@playwright/test';

test.describe('Virtuel-RT — parcours invité', () => {
  test('Accueil et connexion invité', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder(/pseudo|nom/i).first()).toBeVisible({ timeout: 15000 });
    const guestInput = page.getByPlaceholder(/pseudo|nom|3 caractères/i).first();
    await guestInput.fill(`E2E_${Date.now().toString().slice(-6)}`);
    await page.getByRole('button', { name: /invité|continuer|entrer/i }).first().click();
    await expect(page.locator('[data-testid="welcome-screen"], .text-foreground').first()).toBeVisible({ timeout: 15000 });
  });

  test('Navigation vers un salon et saisie message', async ({ page }) => {
    await page.goto('/');
    const guestInput = page.getByPlaceholder(/pseudo|nom|3 caractères/i).first();
    await guestInput.fill(`Msg_${Date.now().toString().slice(-6)}`);
    await page.getByRole('button', { name: /invité|continuer|entrer/i }).first().click();

    const salonButton = page.locator('button, a').filter({ hasText: /général|Général|quiz|Quiz/i }).first();
    await salonButton.click({ timeout: 15000 });

    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await chatInput.fill('Message E2E Playwright');
    await page.getByRole('button', { name: /envoyer/i }).or(page.locator('button').filter({ has: page.locator('svg') }).last()).first().click();
    await expect(page.getByText('Message E2E Playwright')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin (si accès)', () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, 'Nécessite E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD');

  test('Panel admin accessible', async ({ page }) => {
    await page.goto('/');
    // Connexion email si variables CI définies
    await page.getByRole('button', { name: /compte|connexion|login/i }).first().click();
    await page.fill('input[type="email"]', process.env.E2E_ADMIN_EMAIL!);
    await page.fill('input[type="password"]', process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: /connexion|se connecter/i }).click();
    await page.getByRole('button', { name: /admin/i }).click({ timeout: 15000 });
    await expect(page.getByText(/administration|modération|dashboard/i).first()).toBeVisible();
  });
});
