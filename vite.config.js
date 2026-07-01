import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite + React. `firebase-config.js` and `api-config.js` live at the project
// root and are imported by the app — edit those files to change keys/APIs.
//
// base: served from https://gilsamedia.github.io/QualGambl/ in production
// (GitHub Pages project site), but from "/" during local `npm run dev`.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/QualGambl/" : "/",
  plugins: [react()],
  server: { port: 5173 },
}));
