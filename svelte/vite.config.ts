import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

const libPath = (() => {
  const p = new URL("./src/lib", import.meta.url).pathname;
  return /^\/[A-Za-z]:\//.test(p)
    ? decodeURIComponent(p.slice(1))
    : decodeURIComponent(p);
})();

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  resolve: {
    alias: {
      $lib: libPath,
    },
  },
  build: {
    target: "es2022",
  },
  base: "./",
});
