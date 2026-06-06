import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    target: 'ES2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        /**
         * Code Splitting Strategy:
         * 1. vendor.js - Dépendances tierces (React, Radix, etc.)
         * 2. components-*.js - Composants lazy loadés
         * 3. hooks-*.js - Hooks et utilitaires
         * 4. index.js - Code application principal
         */
        manualChunks: {
          // Vendor libraries
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom',
            '@tanstack/react-query',
            'framer-motion',
            'lucide-react',
            'date-fns',
          ],
          // Radix UI components
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          // Utilities & helpers
          'utils': [
            'clsx',
            'class-variance-authority',
            'zod',
            'react-hook-form',
          ],
          // Lazy-loaded admin components
          'admin': [
            '/src/components/chat/AdminPanel',
          ],
          // Lazy-loaded panels
          'panels': [
            '/src/components/chat/DirectMessagePanel',
            '/src/components/chat/NotificationsPanel',
            '/src/components/chat/SettingsPanel',
          ],
        },
        // Optimize chunk names
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
})
