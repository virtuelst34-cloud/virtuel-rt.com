import { test, expect, type Page } from '@playwright/test';

async function enterAsGuest(page: Page, pseudo: string) {
  await page.goto('/');
  await expect(page.getByPlaceholder(/votre pseudo/i)).toBeVisible({ timeout: 20000 });

  const age = page.getByRole('checkbox');
  if (!(await age.isChecked())) {
    await age.check();
  }

  await page.getByPlaceholder(/votre pseudo/i).fill(pseudo);
  await page.getByRole('button', { name: /entrer en mode invité/i }).click();
  await expect(page.getByPlaceholder(/votre pseudo/i)).toHaveCount(0, { timeout: 20000 });
}

/** Onboarding post-invité : choisir Salon général puis terminer (ou passer). */
async function completeOnboardingToGeneral(page: Page) {
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 15000 });

  // Étape salon (souvent la 1re si 18+ déjà coché à l'entrée)
  const generalInWizard = dialog.getByRole('button', { name: /salon général/i });
  if (await generalInWizard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await generalInWizard.click();
    await dialog.getByRole('button', { name: /suivant/i }).click();
  }

  // Étape notifications → Terminer (ou Passer si déjà ailleurs)
  const finish = dialog.getByRole('button', { name: /terminer/i });
  if (await finish.isVisible({ timeout: 5000 }).catch(() => false)) {
    await finish.click();
  } else {
    await dialog.getByRole('button', { name: /^passer$/i }).last().click();
  }

  await expect(dialog).toHaveCount(0, { timeout: 10000 });
}

async function ensureInWritableSalon(page: Page) {
  const input = page.getByRole('textbox', { name: /^message$/i });
  if (await input.isVisible({ timeout: 4000 }).catch(() => false)) return;

  // Accueil : ouvrir Salon général depuis la liste
  const salonBtn = page.getByRole('button', { name: /salon général/i }).first();
  await salonBtn.click({ timeout: 15000 });
  await expect(input).toBeVisible({ timeout: 15000 });
}

test.describe('Smoke E2E — invité → salon → message → Premium', () => {
  test('parcours critique', async ({ page }) => {
    const pseudo = `Smk_${Date.now().toString().slice(-6)}`;
    const body = `E2E smoke ${Date.now()}`;

    await enterAsGuest(page, pseudo);
    await completeOnboardingToGeneral(page);
    await ensureInWritableSalon(page);

    const input = page.getByRole('textbox', { name: /^message$/i });
    await input.fill(body);
    await page.getByRole('button', { name: /envoyer le message/i }).click();
    await expect(page.getByText(body).first()).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /mon compte/i }).click();
    await expect(page.getByText('Paramètres')).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /premium/i }).click();
    await expect(page.getByRole('heading', { name: /compte premium/i })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /demander premium/i })
        .or(page.getByText(/vous êtes premium/i)),
    ).toBeVisible();
    await page.getByRole('button', { name: /j.?ai un code premium/i }).click();
    await expect(page.getByText(/compte email requis/i)).toBeVisible({ timeout: 10000 });
  });
});
