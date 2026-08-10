import { isNativeRuntime } from "./runtime";

export interface ShareContent {
  title?: string;
  text?: string;
  url?: string;
}

export type ShareResult = "shared" | "copied";

/** Writes through Tauri's explicit clipboard capability with a web fallback. */
export async function copyText(text: string): Promise<void> {
  if (!text) throw new Error("Cannot copy empty text");
  if (isNativeRuntime()) {
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeText(text, { label: "Strategy Board" });
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard access is unavailable");
}

/** Uses the OS/web share sheet where available, otherwise copies the link. */
export async function shareText(content: ShareContent): Promise<ShareResult> {
  const navigatorWithShare = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
  if (navigatorWithShare.share) {
    try {
      await navigatorWithShare.share(content);
      return "shared";
    } catch (error) {
      // User cancellation is not a failed share and should not unexpectedly copy a link.
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }
  await copyText(content.url ?? content.text ?? "");
  return "copied";
}
