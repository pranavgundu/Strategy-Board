interface TauriGlobal {
  opener?: {
    openUrl(url: string): Promise<void>;
  };
}

export function isTauri(): boolean {
  return "__TAURI__" in window || "__TAURI_INTERNALS__" in window;
}

export function setupTauri(): void {
  if (!isTauri()) {
    return;
  }

  document.addEventListener("click", (event) => {
    const anchor = (event.target as HTMLElement | null)?.closest?.("a");
    if (!anchor || anchor.target !== "_blank") {
      return;
    }
    const url = anchor.href;
    if (!/^https?:/i.test(url)) {
      return;
    }
    event.preventDefault();
    const opener = (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__
      ?.opener;
    opener?.openUrl(url).catch((error) => {
      console.error("Failed to open external URL:", error);
    });
  });
}
