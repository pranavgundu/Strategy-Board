import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
// Compute a filesystem path for the ./src directory without importing the 'url' module.
// This avoids TypeScript diagnostics in environments without node type declarations.
const srcPath = (() => {
  const p = new URL("./src", import.meta.url).pathname;
  // On Windows the pathname may begin with /C:/... - strip the leading slash in that case.
  return /^\/[A-Za-z]:\//.test(p)
    ? decodeURIComponent(p.slice(1))
    : decodeURIComponent(p);
})();

export default defineConfig({
  plugins: [
    tailwindcss(),
    VitePWA({
      injectRegister: "auto",
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,html,png}"],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:js|html)$/,
            handler: "StaleWhileRevalidate",
          },
          {
            urlPattern: /\.(?:png)$/,
            handler: "CacheFirst",
          },
          {
            urlPattern: /index.html/,
            handler: "CacheFirst",
          },
        ],
      },
      manifest: {
        name: "Strategy Board",
        short_name: "Strategy Board",
        description: "Strategy Board",
        theme_color: "#ffffff",
        icons: [
          {
            src: "favicon/andriod-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "favicon/andriod-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  build: {
    target: "es2022",
  },
  resolve: {
    alias: {
      "@": srcPath,
    },
  },
  base: "./",
});
