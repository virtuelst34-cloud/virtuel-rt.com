import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  logLevel: 'error',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'manifest.json'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
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
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.js',
        '*.config.ts',
        'e2e/',
        '.e2e/',
      ],
    },
    exclude: [
      'node_modules/',
      'e2e/',
      '.e2e/',
    ],
  },
  build: {
    target: 'ES2020',
    minify: 'terser',
    css: {
      modules: {
        scopeBehaviour: 'global'
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Code splitting automatique - laisser Vite gérer
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().split('.')[0] : 'chunk';
          return 'chunks/[name]-[hash].js';
        },
        entryFileNames: '[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    // Report compression level
    reportCompressed: true,
  },
  // Performance optimizations for dev
  server: {
    hmr: {
      overlay: false,
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
})
