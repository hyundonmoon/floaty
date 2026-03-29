import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'src/panel.html'),
        note: resolve(__dirname, 'src/note.html'),
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
});
