import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Numéro de version affiché en haut à droite : version du package + commit + date du build (pour vérifier qu'on a la bonne).
const commit = (() => { try { return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } })();
const quand = new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(",", "");
const VERSION = `v${JSON.parse(readFileSync("package.json", "utf-8")).version}${commit ? ` · ${commit}` : ""} · ${quand}`;

// Le build reste UN SEUL fichier HTML qui s'ouvre en double-cliquant, sans serveur ni internet
// (scripts/assembler.mjs le fabrique). Les modules sont découpés en morceaux (format « system ») :
// chaque morceau dort dans la page sous forme de texte et n'est lu qu'à l'ouverture de son module.
export default defineConfig({
  base: "./",
  define: { __VERSION__: JSON.stringify(VERSION) },
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
