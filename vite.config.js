import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite + React. `firebase-config.js` and `api-config.js` live at the project
// root and are imported by the app — edit those files to change keys/APIs.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
