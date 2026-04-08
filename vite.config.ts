import { execSync } from "child_process";
import { defineConfig, Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

function getGitCommitInfo() {
  const REPO_URL = "https://github.com/pranavgundu/Strategy-Board";
  try {
    const git = (cmd: string) => execSync(`git ${cmd}`, { encoding: "utf-8" }).trim();
    const fullSha = git("rev-parse HEAD");
    const sha = git("rev-parse --short HEAD");
    const message = git("log -1 --format=%s");
    const author = git("log -1 --format=%an");
    const date = new Date(Number(git("log -1 --format=%at")) * 1000).toISOString();
    return { sha, fullSha, message, author, date, url: `${REPO_URL}/commit/${fullSha}` };
  } catch {
    return { sha: "dev", fullSha: "dev", message: "Development build", author: "Unknown", date: new Date().toISOString(), url: REPO_URL };
  }
}

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
  define: {
    __BUILD_COMMIT__: JSON.stringify(getGitCommitInfo()),
  },
  plugins: [
    stubCoreJs(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
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
            src: "./favicon/icon-512.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "any",
          },
          {
            src: "./favicon/icon-512.png",
            type: "image/png",
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("firebase")) {
            return "firebase";
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ["qrcode"],
  },
  resolve: {
    alias: {
      "@": srcPath,
    },
  },
  base: "./",
});
