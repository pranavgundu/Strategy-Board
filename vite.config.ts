import { defineConfig, Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

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
    viteStaticCopy({
      targets: [
        {
          src: "icons/*",
          dest: "icons",
        },
        {
          src: "favicon/banner.png",
          dest: "favicon",
        },
        {
          src: "favicon/icon-512.png",
          dest: "favicon",
        },
      ],
    }),
    VitePWA({
      injectRegister: "auto",
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webp,ico,txt,webmanifest}"],
        cleanupOutdatedCaches: true,
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /\/_vercel\//,
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
            },
          },
          {
            urlPattern: /\.(?:png|svg|webp|ico)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /\.(?:txt|webmanifest)$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "data-cache",
            },
          },
        ],
      },
      manifest: {
        name: "Strategy Board",
        short_name: "Strategy Board",
        description: "Strategy Board",
        start_url: "./",
        display: "standalone",
        background_color: "#18181b",
        theme_color: "#ffffff",
        lang: "en",
        scope: "./",
        icons: [
          {
            src: "./icons/icon-48.webp",
            type: "image/webp",
            sizes: "48x48",
            purpose: "any",
          },
          {
            src: "./icons/icon-72.webp",
            type: "image/webp",
            sizes: "72x72",
            purpose: "any",
          },
          {
            src: "./icons/icon-96.webp",
            type: "image/webp",
            sizes: "96x96",
            purpose: "any",
          },
          {
            src: "./icons/icon-128.webp",
            type: "image/webp",
            sizes: "128x128",
            purpose: "any",
          },
          {
            src: "./icons/icon-192.webp",
            type: "image/webp",
            sizes: "192x192",
            purpose: "any",
          },
          {
            src: "./icons/icon-256.webp",
            type: "image/webp",
            sizes: "256x256",
            purpose: "any",
          },
          {
            src: "./icons/icon-512.webp",
            type: "image/webp",
            sizes: "512x512",
            purpose: "any",
          },
          {
            src: "./icons/icon-192.webp",
            type: "image/webp",
            sizes: "192x192",
            purpose: "maskable",
          },
          {
            src: "./icons/icon-512.webp",
            type: "image/webp",
            sizes: "512x512",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "./favicon/banner.png",
            type: "image/png",
            sizes: "1280x640",
            form_factor: "wide",
          },
          {
            src: "./favicon/icon-512.png",
            type: "image/png",
            sizes: "512x512",
            form_factor: "narrow",
          },
        ]
      },
    }),
  ],
  build: {
    target: "es2022",
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: ["qrcode"],
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
