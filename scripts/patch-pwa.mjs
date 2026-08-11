import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const p = join(dirname(fileURLToPath(import.meta.url)), '..', 'vite.config.js');
let c = readFileSync(p, 'utf8');

if (!c.includes('workbox')) {
  c = c.replace(
    `    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      manifest: {
        name: 'Virtuel',
        short_name: 'Virtuel',
        description: 'Application de chat en temps réel',
        theme_color: '#8b5cf6',
        icons: [
          {
            src: '/logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })`,
    `    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'manifest.json'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\\/\\/.*\\.supabase\\.co\\/rest\\/v1\\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 8,
            },
          },
        ],
      },
      manifest: {
        name: 'Virtuel-RT',
        short_name: 'Virtuel',
        description: 'Chat en temps réel',
        theme_color: '#8b5cf6',
        background_color: '#0f0f14',
        display: 'standalone',
        start_url: '/',
        lang: 'fr',
        icons: [{ src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
      },
    })`,
  );
  writeFileSync(p, c);
  console.log('vite.config.js PWA updated');
} else {
  console.log('vite.config.js already has workbox');
}
