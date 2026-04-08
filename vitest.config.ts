import { defineConfig } from "vitest/config";

const srcPath = (() => {
  const p = new URL("./src", import.meta.url).pathname;
  return /^\/[A-Za-z]:\//.test(p)
    ? decodeURIComponent(p.slice(1))
    : decodeURIComponent(p);
})();

export default defineConfig({
  define: {
    __BUILD_COMMIT__: JSON.stringify({
      sha: "test-sha",
      fullSha: "test-full-sha",
      message: "Test build",
      author: "Test",
      date: "2026-01-01T00:00:00.000Z",
      url: "https://github.com/pranavgundu/Strategy-Board",
    }),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.d.ts", "src/app.ts", "src/view.ts", "src/whiteboard.ts"],
      thresholds: {
        lines: 20,
        functions: 20,
        statements: 20,
        branches: 15,
      },
    },
  },
  resolve: {
    alias: {
      "@": srcPath,
    },
  },
});
