import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [
        tailwindcss()
    ],
    build: {
        target: "es2022"
    },
    resolve: {
        alias: {
            "@": new URL("./src", import.meta.url).pathname
        }
    },
    base: "https://frcteam834.github.io/StrategyBoard2025/"
});