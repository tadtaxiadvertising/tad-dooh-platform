import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  base: "/",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "src/index.html",
        sw: "src/sw.ts",
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Service Worker must be at root level as sw.js for navigator.serviceWorker.register()
          if (chunkInfo.name === "sw") return "sw.js";
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  server: {
    port: 3006,
    strictPort: true,
  },
});
