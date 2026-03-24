import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5174,
    open: false,
  },
  test: {
    environment: 'jsdom',
    globals:     true,
  },
});
