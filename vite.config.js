import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      filename: 'pwa-sw.js',
      includeAssets: ['icon.png', 'offline.html'],
      manifest: {
        short_name: "CaminoTactical",
        name: "Camino de Santiago Tactical GPS",
        icons: [
          { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ],
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#050505",
        background_color: "#050505",
        orientation: "portrait"
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(\w+\.)?tile\.openstreetmap\.org\/.*$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/unpkg\.com\/.*$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cdn-assets',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' }
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
})
