import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['leaf-icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Agropreneur - AI Agriculture Advisor',
        short_name: 'Agropreneur',
        description: 'AI-powered plant disease detection for Southeast Asian crops',
        theme_color: '#2D5016',
        background_color: '#F5F7F5',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    include: ['lucide-react'],
  },
  build: {
    sourcemap: false, // Disable Source Maps as requested
    rollupOptions: {
      output: {
        // Camouflage: Rename files to Malaysian plants to confuse reverse engineers
        entryFileNames: () => {
          const plants = ['durian', 'bunga-raya', 'rafflesia', 'manggis', 'rambutan', 'pokok-kelapa', 'orkid-harimau', 'bunga-kertas'];
          const randomPlant = plants[Math.floor(Math.random() * plants.length)];
          return `assets/ms-${randomPlant}-[hash].js`;
        },
        chunkFileNames: () => {
          const plants = ['paku-pakis', 'kantung-semar', 'lidah-buaya', 'serai', 'pandan', 'keladi', 'pegaga', 'tongkat-ali'];
          const randomPlant = plants[Math.floor(Math.random() * plants.length)];
          return `assets/ms-${randomPlant}-[hash].js`;
        },
        assetFileNames: () => {
          const plants = ['kacip-fatimah', 'misai-kucing', 'periuk-kera', 'senduduk', 'simpur', 'kemunting'];
          const randomPlant = plants[Math.floor(Math.random() * plants.length)];
          return `assets/ms-${randomPlant}-[hash][extname]`;
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
