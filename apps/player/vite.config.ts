import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3002,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/player.js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
