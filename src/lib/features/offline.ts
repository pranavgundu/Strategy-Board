import { dev } from "$app/environment";
import { base } from "$app/paths";

import { isNativeRuntime } from "./runtime";

// the tauri webview loads its files from disk and needs no service worker
export function registerServiceWorker(): void {
  if (dev || isNativeRuntime() || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register(`${base}/service-worker.js`).catch((error: unknown) => console.warn("Offline support is unavailable", error));
}

export function requestPersistentStorage(): void {
  if (isNativeRuntime() || !navigator.storage?.persist) return;
  void navigator.storage.persisted()
    .then((persisted) => persisted || navigator.storage.persist())
    .catch(() => undefined);
}
