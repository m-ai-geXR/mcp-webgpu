import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    open: false,
  },
  test: {
    environment: 'jsdom',
    globals:     true,
  },
});
