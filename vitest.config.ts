import { defineConfig } from "vitest/config";

const srcPath = (() => {
  const p = new URL("./src", import.meta.url).pathname;
  return /^\/[A-Za-z]:\//.test(p)
    ? decodeURIComponent(p.slice(1))
    : decodeURIComponent(p);
})();

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.d.ts", "src/app.ts", "src/view.ts", "src/whiteboard.ts"],
    },
  },
  resolve: {
    alias: {
      "@": srcPath,
    },
  },
});
