import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [
        tailwindcss(),
        VitePWA({ 
            injectRegister: "auto",
            registerType: "prompt",
            workbox: {
                globPatterns: ["**/*.{js,html,png}"],
                runtimeCaching: [
                    {
                        urlPattern: ({ request }) => request.mode === "navigate",
                        handler: "NetworkFirst",
                        options: {
                            cacheableResponse: { statuses: [0, 200] }
                        }
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
                ]
            },
            manifest: {
                name: "StrategyBoard2025",
                short_name: "Strategy2025",
                description: "FRC2025 Strategy Board",
                theme_color: "#ffffff",
                icons: [
                    {
                        src: "favicon/andriod-chrome-192x192.png",
                        sizes: "192x192",
                        type: "image/png"
                    },
                    {
                        src: "favicon/andriod-chrome-512x512.png",
                        sizes: "512x512",
                        type: "image/png"
                    }
                ]
            }
        })
    ],
    build: {
        target: "es2022"
    },
    resolve: {
        alias: {
            "@": new URL("./src", import.meta.url).pathname
        }
    },
    base: "/StrategyBoard2025"
});