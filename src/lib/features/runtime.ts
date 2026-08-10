import { isTauri } from "@tauri-apps/api/core";

/** True only in a packaged/dev Tauri webview (never during Svelte SSR). */
export function isNativeRuntime(): boolean {
  return typeof window !== "undefined" && isTauri();
}

export function safeFilename(value: string, fallback = "strategy-board"): string {
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 100);
  return cleaned || fallback;
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("Expected a data URL");
  const binary = atob(dataUrl.slice(comma + 1));
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) output[index] = binary.charCodeAt(index);
  return output;
}
