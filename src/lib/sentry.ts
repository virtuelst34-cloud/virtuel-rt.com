import * as Sentry from '@sentry/react';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (import.meta.env.PROD && sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    beforeSend(event, hint) {
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
            return null;
          }
        }
      }
      return event;
    },
  });
}

export const captureError = (error: Error, context?: Record<string, unknown>) => {
  if (sentryDsn) Sentry.captureException(error, { extra: context });
  else console.error(error, context);
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (sentryDsn) Sentry.captureMessage(message, { level });
};

export const setUserContext = (user: { id?: string; username?: string; email?: string }) => {
  if (sentryDsn) Sentry.setUser(user);
};

export const clearUserContext = () => {
  if (sentryDsn) Sentry.setUser(null);
};
