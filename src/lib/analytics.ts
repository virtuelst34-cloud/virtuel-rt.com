/**
 * Analytics tracking utility
 * Configurez votre service d'analytics (Google Analytics, Plausible, etc.)
 */

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

export const trackEvent = (event: AnalyticsEvent) => {
  if (process.env.NODE_ENV === 'production') {
    // Intégrez votre service d'analytics ici
    // Exemple: gtag('event', event.action, { ...event });
    console.log('Analytics Event:', event);
  }
};

export const trackPageView = (path: string) => {
  if (process.env.NODE_ENV === 'production') {
    // Intégrez votre service d'analytics ici
    // Exemple: gtag('config', 'GA_MEASUREMENT_ID', { page_path: path });
    console.log('Page View:', path);
  }
};

export const trackError = (error: Error, context?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'production') {
    trackEvent({
      category: 'Error',
      action: error.name,
      label: error.message,
    });
  }
};
