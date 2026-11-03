import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  // Store tests must use client runes: SSR compilation does not create the
  // reactive proxies that caused browser-only structuredClone failures.
  plugins: [svelte({ dynamicCompileOptions: () => ({ generate: "client" }) })],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
  },
});
