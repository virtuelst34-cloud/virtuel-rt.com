import { test, expect } from '@playwright/test';

/**
 * Tests de charge
 * Évalue les performances sous charge élevée
 */

test.describe('Load Tests', () => {
  test('Connexion simultanée de plusieurs utilisateurs', async ({ browser }) => {
    const contexts = [];
    const pages = [];
    const userCount = 10;

    // Créer plusieurs contextes et pages
    for (let i = 0; i < userCount; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    const startTime = Date.now();

    // Connecter tous les utilisateurs simultanément
    const loginPromises = pages.map(async (page, index) => {
      await page.goto('/');
      await page.fill('[data-testid="username-input"]', `loaduser${index}`);
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForSelector('[data-testid="chat-area"]');
    });

    await Promise.all(loginPromises);
    const duration = Date.now() - startTime;

    // Tous les utilisateurs doivent se connecter en moins de 10 secondes
    expect(duration).toBeLessThan(10000);

    // Nettoyer
    for (const context of contexts) {
      await context.close();
    }
  });

  test('Envoi massif de messages', async ({ page }) => {
    // Connexion
    await page.goto('/');
    await page.fill('[data-testid="username-input"]', 'loadtest');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="chat-input"]');

    const messageCount = 50;
    const startTime = Date.now();

    // Envoyer plusieurs messages rapidement
    for (let i = 0; i < messageCount; i++) {
      await page.fill('[data-testid="chat-input"]', `Message de test ${i}`);
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(100); // Petite pause entre les messages
    }

    const duration = Date.now() - startTime;

    // 50 messages doivent être envoyés en moins de 30 secondes
    expect(duration).toBeLessThan(30000);
  });

  test('Navigation rapide entre salons', async ({ page }) => {
    // Connexion
    await page.goto('/');
    await page.fill('[data-testid="username-input"]', 'loadtest');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="salon-list"]');

    const salonCount = 10;
    const startTime = Date.now();

    // Naviguer rapidement entre les salons
    for (let i = 0; i < salonCount; i++) {
      await page.click(`[data-testid="salon-item-${i % 5}"]`); // 5 salons max
      await page.waitForSelector('[data-testid="chat-area"]');
    }

    const duration = Date.now() - startTime;

    // 10 navigations doivent prendre moins de 5 secondes
    expect(duration).toBeLessThan(5000);
  });

  test('Recherche avec beaucoup de résultats', async ({ page }) => {
    // Connexion
    await page.goto('/');
    await page.fill('[data-testid="username-input"]', 'loadtest');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="search-button"]');

    // Ouvrir la recherche
    await page.click('[data-testid="search-button"]');
    await page.fill('[data-testid="search-query"]', 'message');

    const startTime = Date.now();
    await page.click('[data-testid="search-submit"]');
    await page.waitForSelector('[data-testid="search-results"]');
    const duration = Date.now() - startTime;

    // La recherche doit prendre moins de 2 secondes
    expect(duration).toBeLessThan(2000);
  });

  test('Stress test: Actions multiples simultanées', async ({ page }) => {
    // Connexion
    await page.goto('/');
    await page.fill('[data-testid="username-input"]', 'stresstest');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="chat-input"]');

    const startTime = Date.now();

    // Exécuter plusieurs actions en parallèle
    const actions = [
      // Envoyer des messages
      page.fill('[data-testid="chat-input"]', 'Message 1'),
      page.click('[data-testid="send-button"]'),
      
      // Ouvrir le menu
      page.click('[data-testid="user-menu"]'),
      
      // Basculer le thème
      page.click('[data-testid="theme-toggle"]'),
      
      // Ouvrir la recherche
      page.click('[data-testid="search-button"]'),
    ];

    await Promise.all(actions);
    const duration = Date.now() - startTime;

    // Les actions doivent se compléter en moins de 5 secondes
    expect(duration).toBeLessThan(5000);
  });

  test('Test de mémoire: Longue session', async ({ page }) => {
    // Connexion
    await page.goto('/');
    await page.fill('[data-testid="username-input"]', 'memorytest');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="chat-input"]');

    // Simuler une longue session avec beaucoup de messages
    for (let i = 0; i < 100; i++) {
      await page.fill('[data-testid="chat-input"]', `Message ${i}`);
      await page.click('[data-testid="send-button"]');
      
      // Naviguer entre salons
      if (i % 10 === 0) {
        await page.click('[data-testid="salon-item-0"]');
        await page.waitForSelector('[data-testid="chat-area"]');
      }
    }

    // Vérifier que la page est toujours responsive
    await page.fill('[data-testid="chat-input"]', 'Final message');
    await page.click('[data-testid="send-button"]');
    
    await expect(page.locator('text=Final message')).toBeVisible();
  });
});

test.describe('Monitoring des performances', () => {
  test('Mesure des Web Vitals', async ({ page }) => {
    // Activer le monitoring des performances
    await page.goto('/');

    // Attendre le chargement complet
    await page.waitForLoadState('networkidle');

    // Obtenir les métriques de performance
    const metrics = await page.evaluate(() => {
      return {
        // Navigation Timing
        pageLoadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        
        // Resource Timing
        resourceCount: performance.getEntriesByType('resource').length,
      };
    });

    // Vérifier les seuils
    expect(metrics.pageLoadTime).toBeLessThan(3000);
    expect(metrics.domContentLoaded).toBeLessThan(2000);
  });

  test('Détection des fuites de mémoire', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="username-input"]', 'memorytest');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="chat-input"]');

    // Mesurer la mémoire initiale
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Effectuer beaucoup d'opérations
    for (let i = 0; i < 50; i++) {
      await page.fill('[data-testid="chat-input"]', `Message ${i}`);
      await page.click('[data-testid="send-button"]');
      await page.click('[data-testid="theme-toggle"]');
    }

    // Forcer le garbage collection si possible
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    // Mesurer la mémoire finale
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // La mémoire ne doit pas avoir augmenté de plus de 50%
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = (finalMemory - initialMemory) / initialMemory;
      expect(memoryIncrease).toBeLessThan(0.5);
    }
  });
});
