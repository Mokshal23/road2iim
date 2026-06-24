import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'Road2IIM',
        short_name: 'Road2IIM',
        description: 'CAT prep tracker — VARC, LRDI, QA, Aeon log, mocks, and mentor check-ins.',
        theme_color: '#15161a',
        background_color: '#15161a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + assets cached for instant loads; Firestore traffic goes
        // over its own SDK channel and is untouched by this.
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
    }),
  ],
})
