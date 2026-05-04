import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  // Tailwind 4's PostCSS config is loaded by Vite by default; we don't render
  // CSS in tests, so disable PostCSS to avoid pulling Tailwind into the test
  // pipeline.
  css: { postcss: { plugins: [] } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
});
