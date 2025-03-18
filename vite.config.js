import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import {VitePWA} from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
      vue(),
      VitePWA({
          registerType: 'autoUpdate',
          devOptions: { enabled: true },
          includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon-180x180.png'],
          manifest: {
              name: 'BitJourney Compass',
              short_name: 'Compass',
              description: 'Compass is an application for interacting with the BitJourney service',
              theme_color: '#121217',
              background_color: '#121217',
              icons: [
                  {
                      src: 'pwa-64x64.png',
                      sizes: '64x64',
                      type: 'image/png',
                  },
                  {
                      src: 'pwa-128x128.png',
                      sizes: '128x128',
                      type: 'image/png',
                  },
                  {
                      src: 'pwa-512x512.png',
                      sizes: '512x512',
                      type: 'image/png',
                  },
                  {
                      src: 'maskable-icon-512x512.png',
                      sizes: '512x512',
                      type: 'image/png',
                      purpose: 'maskable'
                  },
                  {
                      src: 'maskable-icon-512x512.png',
                      sizes: '512x512',
                      type: 'image/png',
                      purpose: 'any'
                  }
              ]
          }
      })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
