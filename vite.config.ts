/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Бэкенд стенда. В dev (и в `vite preview`) запросы /api/* идут через прокси — CORS не нужен.
// DEV_API_TARGET=http://127.0.0.1:8001 — локальная копия бэка (README, «Локальный бэк»).
const API_TARGET = process.env.DEV_API_TARGET || 'https://api.bee-dynasty.ru';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true, secure: API_TARGET.startsWith('https') },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
