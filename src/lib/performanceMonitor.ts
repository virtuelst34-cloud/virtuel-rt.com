/**
 * Service de Monitoring des Performances
 * 
 * Surveille les temps de chargement, les métriques de performance
 * et envoie des alertes pour les erreurs fréquentes
 */

import React from 'react';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  type: 'navigation' | 'resource' | 'custom';
}

export interface PageLoadMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
}

class PerformanceMonitorService {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 100;
  private alertThresholds: Map<string, number> = new Map();
  private listeners: Set<(metric: PerformanceMetric) => void> = new Set();

  constructor() {
    this.setupDefaultThresholds();
    this.observeNavigationTiming();
    this.observeResourceTiming();
    this.observeWebVitals();
  }

  /**
   * Configure les seuils d'alerte par défaut
   */
  private setupDefaultThresholds(): void {
    this.alertThresholds.set('pageLoadTime', 3000); // 3 secondes
    this.alertThresholds.set('domContentLoaded', 2000); // 2 secondes
    this.alertThresholds.set('firstContentfulPaint', 1800); // 1.8 secondes
    this.alertThresholds.set('largestContentfulPaint', 2500); // 2.5 secondes
    this.alertThresholds.set('firstInputDelay', 100); // 100ms
    this.alertThresholds.set('cumulativeLayoutShift', 0.1); // 0.1
  }

  /**
   * Surveille les métriques de navigation
   */
  private observeNavigationTiming(): void {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    window.addEventListener('load', () => {
      const timing = window.performance.timing;
      const navigationStart = timing.navigationStart;

      const pageLoadTime = timing.loadEventEnd - navigationStart;
      const domContentLoaded = timing.domContentLoadedEventEnd - navigationStart;

      this.recordMetric('pageLoadTime', pageLoadTime, 'navigation');
      this.recordMetric('domContentLoaded', domContentLoaded, 'navigation');
    });
  }

  /**
   * Surveille les métriques de ressources
   */
  private observeResourceTiming(): void {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    // Observer les ressources lentes
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          const loadTime = resource.responseEnd - resource.startTime;

          if (loadTime > 1000) {
            this.recordMetric(
              `resource_${resource.name.split('/').pop()}`,
              loadTime,
              'resource'
            );
          }
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (e) {
      // PerformanceObserver non supporté
    }
  }

  /**
   * Surveille les Web Vitals
   */
  private observeWebVitals(): void {
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    // First Contentful Paint
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
            this.recordMetric('firstContentfulPaint', entry.startTime, 'navigation');
          }
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      // Non supporté
    }

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            this.recordMetric('largestContentfulPaint', entry.startTime, 'navigation');
          }
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // Non supporté
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            this.recordMetric('firstInputDelay', (entry as any).processingStart - entry.startTime, 'navigation');
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // Non supporté
    }

    // Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            this.recordMetric('cumulativeLayoutShift', (entry as any).value, 'navigation');
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // Non supporté
    }
  }

  /**
   * Enregistre une métrique de performance
   */
  recordMetric(name: string, value: number, type: PerformanceMetric['type'] = 'custom'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      type
    };

    this.metrics.push(metric);

    // Garder seulement les N dernières métriques
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Vérifier les seuils d'alerte
    this.checkThresholds(metric);

    // Notifier les listeners
    this.listeners.forEach(listener => listener(metric));
  }

  /**
   * Vérifie si une métrique dépasse les seuils d'alerte
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.alertThresholds.get(metric.name);
    if (threshold && metric.value > threshold) {
      console.warn(`Performance alert: ${metric.name} (${metric.value}ms) exceeds threshold (${threshold}ms)`);
      
      // En production, envoyer à Sentry ou un service de monitoring
      this.sendAlert(metric, threshold);
    }
  }

  /**
   * Envoie une alerte de performance
   */
  private sendAlert(metric: PerformanceMetric, threshold: number): void {
    // En production, intégrer avec Sentry ou un autre service
    const alert = {
      metric: metric.name,
      value: metric.value,
      threshold,
      timestamp: metric.timestamp,
      severity: metric.value > threshold * 2 ? 'critical' : 'warning'
    };

    console.log('Performance alert:', alert);
  }

  /**
   * Définit un seuil d'alerte personnalisé
   */
  setAlertThreshold(name: string, threshold: number): void {
    this.alertThresholds.set(name, threshold);
  }

  /**
   * Mesure le temps d'exécution d'une fonction
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'custom');
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration, 'custom');
      throw error;
    }
  }

  /**
   * Mesure le temps d'exécution d'une fonction synchrone
   */
  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'custom');
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}_error`, duration, 'custom');
      throw error;
    }
  }

  /**
   * Obtient toutes les métriques
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Obtient les métriques par type
   */
  getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[] {
    return this.metrics.filter(m => m.type === type);
  }

  /**
   * Obtient les métriques par nom
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Obtient les statistiques pour une métrique
   */
  getMetricStats(name: string): {
    avg: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { avg, min, max, count: metrics.length };
  }

  /**
   * Obtient les métriques de chargement de page
   */
  getPageLoadMetrics(): PageLoadMetrics | null {
    const stats = {
      pageLoadTime: this.getMetricStats('pageLoadTime'),
      domContentLoaded: this.getMetricStats('domContentLoaded'),
      firstContentfulPaint: this.getMetricStats('firstContentfulPaint'),
      largestContentfulPaint: this.getMetricStats('largestContentfulPaint'),
      firstInputDelay: this.getMetricStats('firstInputDelay'),
      cumulativeLayoutShift: this.getMetricStats('cumulativeLayoutShift')
    };

    if (!stats.pageLoadTime) return null;

    return {
      pageLoadTime: stats.pageLoadTime.avg,
      domContentLoaded: stats.domContentLoaded?.avg || 0,
      firstContentfulPaint: stats.firstContentfulPaint?.avg || 0,
      largestContentfulPaint: stats.largestContentfulPaint?.avg || 0,
      firstInputDelay: stats.firstInputDelay?.avg || 0,
      cumulativeLayoutShift: stats.cumulativeLayoutShift?.avg || 0
    };
  }

  /**
   * S'abonne aux nouvelles métriques
   */
  subscribe(listener: (metric: PerformanceMetric) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Vide toutes les métriques
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Exporte les métriques en JSON
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

export const performanceMonitor = new PerformanceMonitorService();

// Hook React pour utiliser le monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = React.useState(() => performanceMonitor.getMetrics());
  const [pageMetrics, setPageMetrics] = React.useState(() => performanceMonitor.getPageLoadMetrics());

  React.useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe(() => {
      setMetrics(performanceMonitor.getMetrics());
      setPageMetrics(performanceMonitor.getPageLoadMetrics());
    });

    return unsubscribe;
  }, []);

  return {
    metrics,
    pageMetrics,
    recordMetric: (name: string, value: number, type?: PerformanceMetric['type']) =>
      performanceMonitor.recordMetric(name, value, type),
    measureAsync: <T>(name: string, fn: () => Promise<T>) =>
      performanceMonitor.measureAsync(name, fn),
    measure: <T>(name: string, fn: () => T) =>
      performanceMonitor.measure(name, fn),
    getMetricStats: (name: string) => performanceMonitor.getMetricStats(name),
    exportMetrics: () => performanceMonitor.exportMetrics()
  };
}
