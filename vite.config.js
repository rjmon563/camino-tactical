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
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
})
