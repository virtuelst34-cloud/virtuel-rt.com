import { test, expect } from '@playwright/test';

/**
 * Tests E2E pour le chat
 * Scénarios critiques de l'application
 */

test.describe('Chat E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigation vers la page d'accueil
    await page.goto('/');
  });

  test('Connexion utilisateur', async ({ page }) => {
    // Remplir le formulaire de connexion
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Vérifier la redirection vers le chat
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.locator('[data-testid="chat-area"]')).toBeVisible();
  });

  test('Envoi de message', async ({ page }) => {
    // Connexion
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Attendre que le chat soit chargé
    await page.waitForSelector('[data-testid="chat-input"]');

    // Envoyer un message
    await page.fill('[data-testid="chat-input"]', 'Hello, world!');
    await page.click('[data-testid="send-button"]');

    // Vérifier que le message apparaît
    await expect(page.locator('text=Hello, world!')).toBeVisible();
  });

  test('Réponse à un message', async ({ page }) => {
    // Connexion
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Attendre le chargement
    await page.waitForSelector('[data-testid="chat-input"]');

    // Envoyer un message
    await page.fill('[data-testid="chat-input"]', 'Message original');
    await page.click('[data-testid="send-button"]');

    // Cliquer sur le bouton de réponse
    await page.click('[data-testid="message-reply-button"]');

    // Vérifier que l'indicateur de réponse apparaît
    await expect(page.locator('[data-testid="reply-indicator"]')).toBeVisible();

    // Envoyer la réponse
    await page.fill('[data-testid="chat-input"]', 'Ceci est une réponse');
    await page.click('[data-testid="send-button"]');

    // Vérifier que la réponse apparaît
    await expect(page.locator('text=Ceci est une réponse')).toBeVisible();
  });

  test('Mention d\'utilisateur', async ({ page }) => {
    // Connexion
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Attendre le chargement
    await page.waitForSelector('[data-testid="chat-input"]');

    // Taper @ pour déclencher les suggestions
    await page.fill('[data-testid="chat-input"]', '@');
    
    // Vérifier que les suggestions apparaissent
    await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();

    // Sélectionner un utilisateur
    await page.click('[data-testid="mention-item-0"]');

    // Envoyer le message
    await page.fill('[data-testid="chat-input"]', ' test');
    await page.click('[data-testid="send-button"]');

    // Vérifier que la mention apparaît
    await expect(page.locator('[data-testid="mention-badge"]')).toBeVisible();
  });

  test('Réaction emoji', async ({ page }) => {
    // Connexion
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Attendre le chargement
    await page.waitForSelector('[data-testid="chat-input"]');

    // Envoyer un message
    await page.fill('[data-testid="chat-input"]', 'Message pour réaction');
    await page.click('[data-testid="send-button"]');

    // Ouvrir le picker de réactions
    await page.click('[data-testid="reaction-button"]');

    // Sélectionner un emoji
    await page.click('[data-testid="emoji-thumbs-up"]');

    // Vérifier que la réaction apparaît
    await expect(page.locator('[data-testid="reaction-count"]')).toBeVisible();
  });

  test('Navigation entre salons', async ({ page }) => {
    // Connexion
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Attendre le chargement
    await page.waitForSelector('[data-testid="salon-list"]');

    // Cliquer sur un salon
    await page.click('[data-testid="salon-item-1"]');

    // Vérifier que le salon est actif
    await expect(page.locator('[data-testid="active-salon"]')).toBeVisible();
  });

  test('Mode sombre', async ({ page }) => {
    // Connexion
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Activer le mode sombre
    await page.click('[data-testid="theme-toggle"]');

    // Vérifier que la classe dark est présente
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('Déconnexion', async ({ page }) => {
    // Connexion
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Ouvrir le menu utilisateur
    await page.click('[data-testid="user-menu"]');

    // Cliquer sur déconnexion
    await page.click('[data-testid="logout-button"]');

    // Vérifier la redirection vers la page de connexion
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('Swipe actions sur mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Test mobile uniquement');

    // Connexion
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Attendre le chargement
    await page.waitForSelector('[data-testid="message-list"]');

    // Swipe vers la droite pour répondre
    const message = page.locator('[data-testid="message-item"]').first();
    await message.swipe(100, 0);

    // Vérifier que l'action de réponse apparaît
    await expect(page.locator('[data-testid="swipe-reply"]')).toBeVisible();
  });

  test('Recherche avancée', async ({ page }) => {
    // Connexion
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Ouvrir la recherche
    await page.click('[data-testid="search-button"]');

    // Remplir les filtres
    await page.fill('[data-testid="search-query"]', 'test');
    await page.fill('[data-testid="search-author"]', 'user1');
    await page.click('[data-testid="search-submit"]');

    // Vérifier les résultats
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });
});

test.describe('Performance Tests', () => {
  test('Temps de chargement de la page', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Le temps de chargement doit être inférieur à 3 secondes
    expect(loadTime).toBeLessThan(3000);
  });

  test('Temps de rendu du chat', async ({ page }) => {
    // Connexion
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    const startTime = Date.now();
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="chat-area"]');
    const renderTime = Date.now() - startTime;

    // Le temps de rendu doit être inférieur à 2 secondes
    expect(renderTime).toBeLessThan(2000);
  });
});
