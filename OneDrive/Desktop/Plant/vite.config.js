import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
