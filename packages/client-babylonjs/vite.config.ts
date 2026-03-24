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
  test: {
    environment: 'jsdom',
    globals:     true,
  },
});
