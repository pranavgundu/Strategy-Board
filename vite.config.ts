import { defineConfig, Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

const stubCoreJs = (): Plugin => ({
  name: "stub-core-js",
  resolveId(id) {
    if (id.startsWith("core-js/")) {
      return id;
    }
    return null;
  },
  load(id) {
    if (id.startsWith("core-js/")) {
      return "export default {};";
    }
    return null;
  },
});

const srcPath = (() => {
  const p = new URL("./src", import.meta.url).pathname;
  return /^\/[A-Za-z]:\//.test(p)
    ? decodeURIComponent(p.slice(1))
    : decodeURIComponent(p);
})();

export default defineConfig({
  plugins: [
    stubCoreJs(),
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
        icons: [],
      },
    }),
  ],
  build: {
    target: "es2022",
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: [
            "firebase/app",
            "firebase/firestore",
          ],
          jspdf: ["jspdf"],
          qr: ["qrcode", "qr-scanner"],
          analytics: ["@vercel/analytics", "@vercel/speed-insights"],
          vendor: [
            "idb-keyval",
            "uuid",
          ],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["qrcode", "rgbcolor"],
    esbuildOptions: {
      mainFields: ["module", "main"],
    },
  },
  resolve: {
    alias: {
      "@": srcPath,
    },
  },
  base: "./",
});
