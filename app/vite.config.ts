import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Le build reste UN SEUL fichier HTML qui s'ouvre en double-cliquant, sans serveur ni internet
// (scripts/assembler.mjs le fabrique). Les modules sont découpés en morceaux (format « system ») :
// chaque morceau dort dans la page sous forme de texte et n'est lu qu'à l'ouverture de son module.
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: { "@data": fileURLToPath(new URL("../data", import.meta.url)) },
    preserveSymlinks: true,
  },
  server: { fs: { allow: [".."] } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: { output: { format: "system", entryFileNames: "assets/[name]-[hash].js", chunkFileNames: "assets/[name]-[hash].js" } },
  },
});
