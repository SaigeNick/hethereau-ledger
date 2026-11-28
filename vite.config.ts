import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base so the same build runs on Cloudflare Pages or any static host.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    // Installable app: the shell and data files are cached, so the site opens
    // offline with the pulls already saved in the browser. A new deploy takes
    // over as soon as the browser notices it, and the page reloads onto it.
    VitePWA({
      registerType: 'autoUpdate',
      // Registered in main.tsx, which reloads the page onto a new version.
      injectRegister: false,
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
        // A new version takes over at once instead of waiting for every tab to close.
        skipWaiting: true,
        clientsClaim: true,
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
