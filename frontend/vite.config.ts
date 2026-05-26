import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
//
// Dev-Server (`vite`):
//   /api → :3001 (Dev-Backend via tsx watch)
// Preview-Server (`vite preview`, von E2E genutzt):
//   /api → :${E2E_BACKEND_PORT || 3101} — globalSetup startet das gebaute
//   Backend auf einem anderen Port, um nicht mit einer laufenden Dev-Instanz
//   zu kollidieren.
const E2E_BACKEND_PORT = process.env['E2E_BACKEND_PORT'] ?? '3101';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // API-Calls aus dem Dev-Server werden direkt an das Backend weitergeleitet,
    // damit Cookies/Origin nicht durcheinander geraten und CORS im Dev keine Rolle spielt.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${E2E_BACKEND_PORT}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
