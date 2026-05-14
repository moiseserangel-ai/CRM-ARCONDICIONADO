import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifestFilename: 'manifest.json',
        useCredentials: true,
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/pwa-192x192.png', 'icons/pwa-512x512.png'],
        manifest: {
          name: 'Cardoso Ar Condicionado',
          short_name: 'Cardoso Ar',
          description: 'CRM especializado para ar condicionado',
          theme_color: '#10b981',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: '/icons/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icons/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          screenshots: [
            {
              src: '/screenshot-desktop.svg',
              sizes: '1280x720',
              type: 'image/svg+xml',
              form_factor: 'wide',
              label: 'Desktop View'
            },
            {
              src: '/screenshot-mobile.svg',
              sizes: '750x1334',
              type: 'image/svg+xml',
              form_factor: 'narrow',
              label: 'Mobile View'
            }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
