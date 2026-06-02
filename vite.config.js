import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

// Bake build identity into the bundle — readable in Profile page on any device.
// Falls back gracefully if git is unavailable (e.g. Vercel CI stripped .git).
let buildHash = 'unknown'
let buildDate = new Date().toISOString()
try {
  buildHash = execSync('git rev-parse --short HEAD', { timeout: 3000 }).toString().trim()
} catch {}

export default defineConfig({
  base: '/',
  // Expose build identity to runtime JS via import.meta.env
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'FlowOS — הפסגה',
        short_name: 'FlowOS',
        description: 'מערכת ניהול משימות ויעדים לעצמאים ומאמנים',
        lang: 'he',
        dir: 'rtl',
        theme_color: '#0b081c',
        background_color: '#0b081c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: true,          // force new SW to activate immediately
        clientsClaim: true,         // new SW takes control of all tabs right away
        // Cache all app assets for offline use
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Cache Google Fonts
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // disable in dev to avoid noise
      },
    }),
  ],
})
