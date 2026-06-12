import { createClient } from '@base44/sdk';

// Validate environment variables
const appId = import.meta.env.VITE_BASE44_APP_ID || '6a15b7ec8b172b6e6e18126a';
const appBaseUrl = import.meta.env.VITE_BASE44_APP_BASE_URL || '';
const apiKey = import.meta.env.VITE_BASE44_API_KEY || '';

if (!appId) {
  console.error('❌ VITE_BASE44_APP_ID is not defined. Please set it in your .env.local file.');
}

if (!appBaseUrl) {
  console.error('❌ VITE_BASE44_APP_BASE_URL is not defined. Please set it in your .env.local file.');
}

if (!apiKey) {
  console.error('❌ VITE_BASE44_API_KEY is not defined. Please set it in your .env.local file.');
}

// Create a client with authentication
export const base44 = createClient({
  appId,
  headers: {
    api_key: apiKey
  },
  appBaseUrl,
});
