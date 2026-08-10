import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

/** Build-time commit stamp shown in the footer. */
function getGitCommitInfo() {
  const REPO_URL = "https://github.com/pranavgundu/Strategy-Board";
  try {
    /** @param {string} cmd */
    const git = (cmd) => execSync(`git ${cmd}`, { encoding: "utf-8" }).trim();
    const fullSha = git("rev-parse HEAD");
    return {
      sha: git("rev-parse --short HEAD"),
      fullSha,
      message: git("log -1 --format=%s"),
      author: git("log -1 --format=%an"),
      date: new Date(Number(git("log -1 --format=%at")) * 1000).toISOString(),
      url: `${REPO_URL}/commit/${fullSha}`,
    };
  } catch {
    return { sha: "dev", fullSha: "dev", message: "Development build", author: "Unknown", date: new Date().toISOString(), url: REPO_URL };
  }
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [tailwindcss(), sveltekit()],

  define: {
    __BUILD_COMMIT__: JSON.stringify(getGitCommitInfo()),
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
