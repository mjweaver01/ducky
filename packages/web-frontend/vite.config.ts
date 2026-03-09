import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import sitemap from 'vite-plugin-sitemap';
import { sitemapRoutes } from './src/routes';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sitemap({
      hostname: process.env.VITE_SITE_URL || 'https://www.ducky.wtf',
      dynamicRoutes: sitemapRoutes,
    }),
  ],
  envDir: path.resolve(__dirname, '../..'),
  server: {
    port: 9179,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'icons': ['lucide-react'],
          'stripe': ['@stripe/stripe-js'],
        },
      },
    },
  },
});
