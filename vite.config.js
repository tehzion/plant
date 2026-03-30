import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'
import fs from 'fs'
import { createHash } from 'crypto'

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
let gitHash = 'unknown';
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  console.warn('Failed to get git hash', e);
}

const MALAYSIAN_PLANT_ALIASES = [
  'durian',
  'rambutan',
  'manggis',
  'pisang',
  'kelapa',
  'betik',
  'nanas',
  'mangga',
  'petai',
  'padi',
  'cili',
  'sawit',
];

const createPlantAlias = (seed = 'asset') => {
  const digest = createHash('sha256')
    .update(String(seed))
    .digest('hex');
  const index = Number.parseInt(digest.slice(0, 8), 16) % MALAYSIAN_PLANT_ALIASES.length;
  return `${MALAYSIAN_PLANT_ALIASES[index]}-${digest.slice(8, 14)}`;
};

const createAssetPattern = (seed, extensionPattern) => `assets/${createPlantAlias(seed)}-[hash]${extensionPattern}`;

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const shouldAnalyze = mode === 'analyze';
  let visualizerPlugins = [];

  if (shouldAnalyze) {
    const { visualizer } = await import('rollup-plugin-visualizer');
    visualizerPlugins = [
      visualizer({
        filename: 'dist/bundle-analysis.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
        emitFile: false,
      }),
      visualizer({
        filename: 'dist/bundle-analysis.json',
        template: 'raw-data',
        gzipSize: true,
        brotliSize: true,
        emitFile: false,
      }),
    ];
  }

  return {
    define: {
      __APP_VERSION__: JSON.stringify(`v${pkg.version}-${gitHash}`)
    },
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
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
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
      }),
      ...visualizerPlugins,
    ],
    optimizeDeps: {
      include: ['lucide-react'],
    },
    build: {
      sourcemap: false, // Disable Source Maps as requested
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('/react/') ||
                id.includes('\\react\\') ||
                id.includes('/react-dom/') ||
                id.includes('\\react-dom\\') ||
                id.includes('/scheduler/') ||
                id.includes('\\scheduler\\')
              ) {
                return 'vendor-react';
              }
              if (
                id.includes('react-router-dom') ||
                id.includes('@remix-run/router') ||
                id.includes('/react-router/') ||
                id.includes('\\react-router\\')
              ) {
                return 'vendor-router';
              }
              if (
                id.includes('recharts') ||
                id.includes('/d3-') ||
                id.includes('\\d3-') ||
                id.includes('/victory-vendor/') ||
                id.includes('\\victory-vendor\\') ||
                id.includes('/clsx/') ||
                id.includes('\\clsx\\')
              ) {
                return 'vendor-charts';
              }
              if (
                id.includes('jspdf') ||
                id.includes('/fflate/') ||
                id.includes('\\fflate\\')
              ) {
                return 'vendor-pdf';
              }
              if (
                id.includes('html2canvas') ||
                id.includes('canvg') ||
                id.includes('rgbcolor') ||
                id.includes('stackblur-canvas') ||
                id.includes('svg-pathdata') ||
                id.includes('/raf/') ||
                id.includes('\\raf\\') ||
                id.includes('performance-now') ||
                id.includes('/core-js/') ||
                id.includes('\\core-js\\')
              ) {
                return 'vendor-canvas';
              }
              if (id.includes('qrcode')) return 'vendor-qrcode';
              if (id.includes('@supabase') || id.includes('openai')) return 'vendor-services';
            }
          },
          // Obfuscate emitted filenames so route/page names are not exposed in browser asset URLs.
          entryFileNames: (chunkInfo) => createAssetPattern(
            chunkInfo.facadeModuleId || chunkInfo.name || 'entry',
            '.js',
          ),
          chunkFileNames: (chunkInfo) => createAssetPattern(
            chunkInfo.facadeModuleId || chunkInfo.name || 'chunk',
            '.js',
          ),
          assetFileNames: (assetInfo) => createAssetPattern(
            assetInfo.originalFileName || assetInfo.name || 'asset',
            '[extname]',
          ),
        }
      }
    },
    server: {
      port: 3000,
      open: true
    }
  };
})
