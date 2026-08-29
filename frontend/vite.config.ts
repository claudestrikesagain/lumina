import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: { global: "globalThis" },
  preview: {
    // SPA fallback so direct navigation to /deposit etc. works during
    // screenshot capture without 404ing on the Vite preview server.
    port: 4173,
    strictPort: true,
  },
});