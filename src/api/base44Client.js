import { createClient } from '@base44/sdk';

// Create a client without authentication required (anonymous chat)
export const base44 = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID || '6a15b7ec8b172b6e6e18126a',
  requiresAuth: false,
  appBaseUrl: import.meta.env.VITE_BASE44_APP_BASE_URL || '',
});
