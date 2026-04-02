import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5175,
    open: false,
  },
  optimizeDeps: {
    include: [
      '@babylonjs/core',
      '@babylonjs/loaders',
    ],
    // Force Vite to pre-bundle Babylon.js even with dynamic imports
    esbuildOptions: {
      // Increase memory limit for large dependencies like Babylon.js
      target: 'esnext',
    },
  },
  // Prevent Vite from transforming shader imports
  assetsInclude: ['**/*.fx', '**/*.fragment', '**/*.vertex'],
  test: {
    environment: 'jsdom',
    globals:     true,
  },
});
