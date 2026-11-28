import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base so the same build runs on Cloudflare Pages or any static host.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    // Installable app: the shell and data files are cached, so the site opens
    // offline with the pulls already saved in the browser. New deploys apply
    // on the next visit.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'Hethereau Ledger — NTE pull tracker',
        short_name: 'Hethereau',
        description: 'Pull tracker for Neverness to Everness: pity, history, banners, collection and achievements.',
        lang: 'uk',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#12162b',
        theme_color: '#12162b',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['portraits/**', 'achievements/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        // Server routes must always reach the network.
        navigateFallbackDenylist: [/^\/api\//, /^\/s$/, /^\/cal\//, /\.ps1$/, /\.cmd$/, /\.ics$/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && (url.pathname.startsWith('/portraits/') || url.pathname.startsWith('/achievements/')),
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
        ],
      },
    }),
  ],
})
