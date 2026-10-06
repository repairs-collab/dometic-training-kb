import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        manuals: fileURLToPath(new URL('./manuals.html', import.meta.url)),
      },
    },
  },
});
