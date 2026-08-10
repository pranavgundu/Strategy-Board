const SHARE_CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

/** Extracts only valid, unambiguous six-character Strategy Board share codes. */
export function parseShareCode(input?: string | URL): string | null {
  if (input === undefined) {
    if (typeof window === "undefined") return null;
    input = window.location.href;
  }
  let value: string;
  if (input instanceof URL) value = input.searchParams.get("share") ?? "";
  else {
    try {
      value = new URL(input, typeof window === "undefined" ? "https://strategyboard.app" : window.location.origin)
        .searchParams.get("share") ?? input;
    } catch {
      value = input;
    }
  }
  const code = value.trim().toUpperCase();
  return SHARE_CODE.test(code) ? code : null;
}

/** Consumes a startup code only after a caller successfully imports it. */
export function removeShareCodeFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("share")) return;
  url.searchParams.delete("share");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
