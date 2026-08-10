import { isNativeRuntime, safeFilename } from "./runtime";

export interface SaveFileOptions {
  filename: string;
  mimeType: string;
  extension: string;
  title?: string;
}

export interface SaveFileResult {
  saved: boolean;
  /** A native path when applicable; browser downloads deliberately have no path. */
  path?: string;
}

function withExtension(filename: string, extension: string): string {
  const name = safeFilename(filename);
  const suffix = `.${extension.replace(/^\./, "")}`;
  return name.toLowerCase().endsWith(suffix.toLowerCase()) ? name : `${name}${suffix}`;
}

function browserDownload(bytes: Uint8Array, options: SaveFileOptions): SaveFileResult {
  // Copy into a concrete ArrayBuffer: TS 6 distinguishes ArrayBufferLike from
  // BlobPart, and the copy also preserves a view's byte offset/length.
  const buffer = new Uint8Array(bytes.length);
  buffer.set(bytes);
  const url = URL.createObjectURL(new Blob([buffer.buffer], { type: options.mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = withExtension(options.filename, options.extension);
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  // Revocation must wait until the browser has consumed the click target.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return { saved: true };
}

/**
 * Saves bytes through the native save sheet in Tauri, falling back to an
 * ordinary browser download for the web build. A cancelled picker is not an error.
 */
export async function saveFile(bytes: Uint8Array, options: SaveFileOptions): Promise<SaveFileResult> {
  const filename = withExtension(options.filename, options.extension);
  if (!isNativeRuntime()) return browserDownload(bytes, { ...options, filename });

  const [{ save }, { writeFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);
  const path = await save({
    title: options.title,
    defaultPath: filename,
    filters: [{ name: options.extension.toUpperCase(), extensions: [options.extension.replace(/^\./, "")] }],
  });
  if (!path) return { saved: false };
  await writeFile(path, bytes);
  return { saved: true, path };
}

export async function savePng(dataUrl: string, filename: string): Promise<SaveFileResult> {
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:image/png;") || comma < 0) throw new Error("Expected a PNG data URL");
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return saveFile(bytes, { filename, extension: "png", mimeType: "image/png", title: "Export Strategy Board image" });
}
