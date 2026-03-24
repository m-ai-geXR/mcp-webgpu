import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server:  { port: 5176 },
  preview: { port: 5176 },
  build:   { target: 'esnext' },
  test: {
    environment: 'jsdom',
    globals:     true,
  },
});
