import QrScanner from "qr-scanner";
import QRCode from "qrcode";
import { Match } from "@/match.ts";

const HEADER_SIZE = 4;
// Number of characters reserved in the payload for the total chunk count
const TOTAL_CHUNKS_HEADER_SIZE = 4;
const CHUNK_HEADER_SIZE = HEADER_SIZE + TOTAL_CHUNKS_HEADER_SIZE;

// Per-chunk payload size (characters). Increased for faster data transfer.
const MAX_CHUNK_PAYLOAD = 200;
// Duration each QR image is shown on screen (milliseconds). Faster rotation for quicker scanning.
const FRAME_DURATION_MS = 500;

/**
 * Helper: encode arbitrary UTF-8 string to a base64 payload in a browser-safe way.
 */
function encodeToBase64(input: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: decode base64 back into a UTF-8 string.
 */
function decodeBase64ToString(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * Utility wrapper so we can consistently await QRCode.toCanvas whether the library
 * provides a callback or a Promise. This makes rendering code easier to read/maintain.
 */
function toCanvasAsync(
  payload: string,
  options: Record<string, unknown>,
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    try {
      QRCode.toCanvas(
        payload,
        options,
        (err: Error | null, canvas?: HTMLCanvasElement) => {
          if (err) return reject(err);
          if (!canvas)
            return reject(new Error("QR code library did not return a canvas"));
          resolve(canvas);
        },
      );
    } catch (err) {
      reject(err);
    }
  });
}

type QRExportCallback = (data: unknown) => void;

export class QRExport {
  // Allow null entries so we can re-resolve DOM nodes at export time and tolerate
  // DOM re-renders or test-time DOM changes.
  private pool: Array<HTMLElement | null> = [];
  private intervalId: number | null = null;

  constructor() {
    // Don't eagerly resolve DOM nodes here; resolve them when an export is requested.
    this.pool = [];
  }

  export(match: Match): void {
    // Resolve the worker container elements at the moment of export so we don't
    // hold stale references if the DOM has been re-rendered.
    this.pool = [
      document.getElementById("qr-export-code-worker-0"),
      document.getElementById("qr-export-code-worker-1"),
      document.getElementById("qr-export-code-worker-2"),
    ];

    // Defensive: ensure at least one container exists before proceeding.
    if (!this.pool || this.pool.every((el) => el === null)) {
      console.error("QRExport: pool elements not available");
      alert("QR export is currently unavailable");
      return;
    }

    // If an export is already running, stop it first to avoid races.
    if (this.intervalId !== null) {
      this.close();
    }

    // Prepare and chunk the payload (base64) for reliable transfer via QR frames.
    const packet = match.getAsPacket();
    packet.splice(7, 1); // remove uuid before export
    const raw = JSON.stringify(packet);
    const b64 = encodeToBase64(raw);

    const chunks: string[] = [];
    for (let i = 0; i < b64.length; i += MAX_CHUNK_PAYLOAD) {
      chunks.push(b64.slice(i, i + MAX_CHUNK_PAYLOAD));
    }

    const totalChunks = Math.max(1, chunks.length);
    const getPayload = (index: number) =>
      index.toString().padStart(HEADER_SIZE, "0") +
      totalChunks.toString().padStart(TOTAL_CHUNKS_HEADER_SIZE, "0") +
      (chunks[index] || "");

    const qrCanvasPixelSize = Math.max(
      256,
      Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.8),
    );

    const shown = new Set<number>();
    function markShown(idx: number): void {
      // Add the payload index to the set of unique pages the user has actually seen.
      // We only update the visible progress indicator when a previously-unseen page
      // is shown so the progress bar fills monotonically and never rewinds.
      if (!shown.has(idx)) {
        shown.add(idx);
        updateOverlayStatus(shown.size, totalChunks);
      }
    }

    const updateOverlayStatus = (shownCount: number, total: number) => {
      const status = document.getElementById("qr-export-status");
      if (status) status.textContent = `Page ${shownCount} / ${total}`;

      // Toggle the top-area animated dots while unique pages are still being shown.
      try {
        const dots = document.getElementById(
          "qr-export-dots",
        ) as HTMLElement | null;
        if (dots) {
          if (total > 1 && shownCount < total)
            dots.style.display = "inline-flex";
          else dots.style.display = "none";
        }
      } catch (_err) {
        // ignore
      }
    };

    // If only one chunk, render a single QR and return early.
    if (totalChunks === 1) {
      (async () => {
        const el = this.pool.find((x) => x) as HTMLElement | undefined;
        if (!el) {
          alert("QR export UI not available");
          return;
        }
        try {
          const canvas = await toCanvasAsync(getPayload(0), {
            errorCorrectionLevel: "M",
            width: qrCanvasPixelSize,
            margin: 1,
          });
          el.replaceChildren();
          el.appendChild(canvas);
          markShown(0);
        } catch (err) {
          console.error("QRExport: failed to render single QR", err);
          alert("Failed to render QR export");
        }
      })();
      return;
    }

    // Multi-chunk streaming export: pre-render into a small pool of worker slots and cycle them.
    let poolIndex = 0;
    let payloadIndex = 0;
    const poolSize = this.pool.length;
    const modulus = (n: number, m: number) => ((n % m) + m) % m;

    (async () => {
      try {
        // Pre-render canvases for the first set of payloads so the UI doesn't stutter.
        for (let i = 0; i < poolSize; i++) {
          const el = this.pool[i];
          if (!el) continue;
          el.replaceChildren();
          const payloadIdx = modulus(i, totalChunks);
          try {
            const canvas = await toCanvasAsync(getPayload(payloadIdx), {
              errorCorrectionLevel: "M",
              width: qrCanvasPixelSize,
              margin: 1,
            });
            canvas.setAttribute(
              "aria-label",
              `QR export page ${payloadIdx + 1} of ${totalChunks}`,
            );
            el.appendChild(canvas);
            /* per-worker label intentionally suppressed; accessibility applied to canvas */
            const slot = document.getElementById(`qr-export-code-worker-${i}`);
            if (slot) slot.classList.add("hidden");
          } catch (err) {
            console.warn("QRExport: failed to render initial QR canvas", err);
          }
        }

        // Reveal the first available worker and mark it shown.
        const firstEl = this.pool.find((x) => x) || null;
        if (firstEl) {
          const dom = document.getElementById(firstEl.id);
          if (dom) dom.classList.remove("hidden");
        }
        markShown(0);

        // Cycle through payloads at a conservative frame rate so cameras can scan reliably.
        this.intervalId = window.setInterval(async () => {
          try {
            const currentEl = this.pool[poolIndex];
            const prevEl = this.pool[modulus(poolIndex - 1, poolSize)];
            if (currentEl) {
              const domCur = document.getElementById(currentEl.id);
              if (domCur) domCur.classList.remove("hidden");
            }
            if (prevEl) {
              const domPrev = document.getElementById(prevEl.id);
              if (domPrev) domPrev.classList.add("hidden");
            }
            markShown(payloadIndex);

            // Prepare next payload into the reused slot.
            const reuseIndex = modulus(poolIndex - 1, poolSize);
            const nextPayloadIndex = modulus(
              payloadIndex + poolSize - 1,
              totalChunks,
            );
            const reuseEl = this.pool[reuseIndex];
            if (reuseEl) {
              reuseEl.replaceChildren();
              try {
                const canvas = await toCanvasAsync(
                  getPayload(nextPayloadIndex),
                  {
                    errorCorrectionLevel: "M",
                    width: qrCanvasPixelSize,
                    margin: 1,
                  },
                );
                const label = document.createElement("div");
                label.className =
                  "text-slate-100 font-semibold mt-2 select-none";
                label.style.userSelect = "none";
                canvas.setAttribute(
                  "aria-label",
                  `QR export page ${nextPayloadIndex + 1} of ${totalChunks}`,
                );
                reuseEl.appendChild(canvas);
                /* per-worker label intentionally suppressed; accessibility applied to canvas */
              } catch (err) {
                console.error("QRExport: failed to render QR canvas", err);
                this.close();
                alert(
                  "QR export failed while rendering QR codes. Export stopped.",
                );
                return;
              }
            }

            poolIndex = modulus(poolIndex + 1, poolSize);
            payloadIndex = modulus(payloadIndex + 1, totalChunks);
          } catch (err) {
            console.error("QRExport: unexpected error in export loop", err);
            this.close();
            alert("QR export encountered an unexpected error and was stopped.");
          }
        }, FRAME_DURATION_MS);
      } catch (err) {
        console.error("QRExport: failed to start export", err);
        alert(
          "Failed to start QR export: " +
            (err && (err as Error).message
              ? (err as Error).message
              : String(err)),
        );
        this.close();
      }
    })();
  }

  close(): void {
    // Stop any running export loop.
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Best-effort cleanup of both cached elements and any DOM slots that remain.
    try {
      for (let i = 0; i < this.pool.length; i++) {
        const el = this.pool[i];
        if (el && typeof el.replaceChildren === "function") {
          try {
            el.replaceChildren();
          } catch (_err) {
            // ignore per-slot cleanup failures
          }
        }
        const slot = document.getElementById(`qr-export-code-worker-${i}`);
        if (slot) {
          try {
            slot.classList.add("hidden");
            while (slot.firstChild) slot.removeChild(slot.firstChild);
          } catch (_err) {
            // ignore DOM cleanup failures
          }
        }
      }

      // Fallback: clear any DOM workers matching the id pattern
      const domWorkers = document.querySelectorAll(
        '[id^="qr-export-code-worker-"]',
      );
      domWorkers.forEach((w) => {
        try {
          const h = w as HTMLElement;
          h.classList.add("hidden");
          h.replaceChildren();
        } catch (_err) {
          // ignore
        }
      });
    } catch (err) {
      console.warn("QRExport: error during cleanup", err);
    }

    // Hide export overlay and clear status text so UI is consistent.
    try {
      const overlay = document.getElementById("qr-export-container");
      if (overlay) overlay.classList.add("hidden");
      const status = document.getElementById("qr-export-status");
      if (status) status.textContent = "";
      // Hide or remove the animated dots indicator if present so the overlay closes cleanly.
      const dots = document.getElementById("qr-export-dots");
      if (dots) {
        try {
          dots.style.display = "none";
        } catch (_err) {}
      }
    } catch (err) {
      console.warn("QRExport: error hiding overlay or clearing status", err);
    }

    // Reset cached pool references so subsequent exports re-resolve nodes.
    this.pool = [];
  }
}

export class QRImport {
  private scanner: QrScanner;
  private received: Record<number, string> = {};
  private receivedIds: number[] = [];
  private expectedLength = -1;
  private callback: QRExportCallback | null = null;

  constructor() {
    this.scanner = new QrScanner(
      document.getElementById("qr-import-video") as HTMLVideoElement,
      (result) => this.getResult(result),
      {
        maxScansPerSecond: 30,
        highlightScanRegion: true,
        highlightCodeOutline: true,
      },
    );

    const list = document.getElementById(
      "qr-import-camera-select",
    ) as HTMLSelectElement;
    list.addEventListener("change", (e: Event) => {
      this.scanner.setCamera((e.target as HTMLSelectElement).value);
    });
  }

  private async getAvailableCameras(): Promise<void> {
    const cameras = await QrScanner.listCameras(true);
    const list = document.getElementById(
      "qr-import-camera-select",
    ) as HTMLSelectElement;

    for (let i = list.options.length - 1; i >= 0; i--) {
      list.remove(i);
    }

    for (const camera of cameras) {
      const option = document.createElement("option");
      option.value = camera.id;
      option.text = camera.label;
      list.add(option);
    }

    list.selectedIndex = 0;
    if (list.options.length > 0) {
      await this.scanner.setCamera(list.options[0].value);
    }
  }

  public async start(callback: QRExportCallback): Promise<void> {
    this.callback = callback;
    this.received = {};
    this.receivedIds = [];
    this.expectedLength = -1;

    // Provide immediate UI feedback so the user knows the import flow is starting.
    const statusEl = document.getElementById("qr-import-status");
    if (statusEl) statusEl.textContent = "Preparing camera…";

    try {
      // Attempt to enumerate cameras first (best-effort) so the UI can populate camera
      // choices and pick a preferred device before starting the scanner.
      try {
        await this.getAvailableCameras();
      } catch (enumErr) {
        // Non-fatal: enumeration may fail in some constrained environments; continue to start the scanner.
        console.warn("QRImport: camera enumeration failed", enumErr);
      }

      if (statusEl) statusEl.textContent = "Starting camera…";
      await this.scanner.start();

      if (statusEl) statusEl.textContent = "Scanning for QR codes…";
      // Show top animated dots to indicate active scanning (top-area control).
      try {
        const dots = document.getElementById(
          "qr-import-dots",
        ) as HTMLElement | null;
        if (dots) dots.style.display = "inline-flex";
      } catch (_err) {}
    } catch (err) {
      console.error("QRImport: failed to start scanner", err);
      if (statusEl) statusEl.textContent = "Failed to start camera";
      alert(
        "Could not start camera for QR import: " +
          (err && (err as Error).message
            ? (err as Error).message
            : String(err)),
      );
      this.callback = null;
    }
  }

  public stop(): void {
    try {
      this.scanner.stop();
    } catch (err) {
      // Stop should be best-effort — don't throw if the scanner is already stopped.
      console.warn("QRImport: error stopping scanner:", err);
    }

    // Clear any transient import status so UI is left in a consistent state.
    const statusEl = document.getElementById("qr-import-status");
    if (statusEl) statusEl.textContent = "";
    // Hide top-area import dots when scanner is stopped.
    try {
      const dots = document.getElementById(
        "qr-import-dots",
      ) as HTMLElement | null;
      if (dots) dots.style.display = "none";
    } catch (_err) {}
  }

  private getResult(result: QrScanner.ScanResult): void {
    try {
      // Normalize the scanned data and provide live progress in the UI.
      const data =
        typeof result?.data === "string"
          ? result.data
          : String(result?.data || "");
      const statusEl = document.getElementById("qr-import-status");

      if (!data || data.length < HEADER_SIZE + TOTAL_CHUNKS_HEADER_SIZE) {
        console.warn("QRImport: scanned payload too short", data);
        if (statusEl) statusEl.textContent = "Scanned unexpected data";
        return;
      }

      const id = Number(data.slice(0, HEADER_SIZE));
      const total = Number(
        data.slice(HEADER_SIZE, HEADER_SIZE + TOTAL_CHUNKS_HEADER_SIZE),
      );
      const payload = data.slice(HEADER_SIZE + TOTAL_CHUNKS_HEADER_SIZE);

      if (Number.isNaN(id) || Number.isNaN(total)) {
        console.warn("QRImport: invalid header in scanned payload", data);
        if (statusEl) statusEl.textContent = "Invalid QR header";
        return;
      }

      // If we were previously receiving a different stream, reset state and accept
      // the new stream. Notify the UI so users know progress restarted.
      if (this.expectedLength !== -1 && this.expectedLength !== total) {
        this.received = {};
        this.receivedIds = [];
        this.expectedLength = -1;
        if (statusEl)
          statusEl.textContent =
            "New QR stream detected — resetting progress...";
      }

      if (this.expectedLength === -1) this.expectedLength = total;

      if (id < 0 || id >= this.expectedLength) {
        console.warn(
          "QRImport: out-of-range chunk id",
          id,
          "expected",
          this.expectedLength,
        );
        if (statusEl)
          statusEl.textContent = `Out-of-range chunk (${id}). Waiting for valid stream...`;
        return;
      }

      // Deduplicate: only accept the first instance of a chunk
      if (!Object.prototype.hasOwnProperty.call(this.received, id)) {
        this.received[id] = payload;
        insertSorted(this.receivedIds, id);

        // Update progress in the import overlay (e.g. "Receiving 3 / 12 chunks")
        if (statusEl) {
          statusEl.textContent = `Receiving ${this.receivedIds.length} / ${this.expectedLength} chunks`;
        }
        // Show the top-area animated dots while scanning multiple frames.
        try {
          const dots = document.getElementById(
            "qr-import-dots",
          ) as HTMLElement | null;
          if (
            dots &&
            this.expectedLength > 1 &&
            this.receivedIds.length < this.expectedLength
          ) {
            dots.style.display = "inline-flex";
          }
        } catch (_err) {}
      } else {
        // If we saw a duplicate, still update the status so the user sees live activity.
        if (statusEl) {
          statusEl.textContent = `Receiving ${this.receivedIds.length} / ${this.expectedLength} chunks (duplicates ignored)`;
        }
        // Keep dots visible even if we received a duplicate so user sees activity on the top bar.
        try {
          const dots = document.getElementById(
            "qr-import-dots",
          ) as HTMLElement | null;
          if (
            dots &&
            this.expectedLength > 1 &&
            this.receivedIds.length < this.expectedLength
          ) {
            dots.style.display = "inline-flex";
          }
        } catch (_err) {}
      }

      if (
        this.expectedLength !== -1 &&
        this.receivedIds.length === this.expectedLength
      ) {
        if (statusEl)
          if (statusEl)
            statusEl.textContent =
              "All chunks received — reconstructing data...";
        // Hide the animated dots since we're now reconstructing the payload.
        try {
          const dots = document.getElementById(
            "qr-import-dots",
          ) as HTMLElement | null;
          if (dots) dots.style.display = "none";
        } catch (_err) {}
        this.importFinished();
      }
    } catch (err) {
      console.error("QRImport: error processing scan result", err);
      const statusEl = document.getElementById("qr-import-status");
      if (statusEl) statusEl.textContent = "Scan processing error";
    }
  }

  private importFinished(): void {
    // Stop the scanner immediately — we have everything we need to reconstruct.
    this.stop();

    const statusEl = document.getElementById("qr-import-status");
    if (statusEl) statusEl.textContent = "Reconstructing QR payload...";
    // Ensure top-area import dots are hidden while reconstructing.
    try {
      const dots = document.getElementById(
        "qr-import-dots",
      ) as HTMLElement | null;
      if (dots) dots.style.display = "none";
    } catch (_err) {}

    if (this.callback === null) {
      if (statusEl) statusEl.textContent = "No import handler registered";
      return;
    }

    try {
      // Concatenate chunks in ascending order
      let base64 = "";
      for (const i of this.receivedIds) {
        base64 += this.received[i];
      }

      // Decode base64 back into a JSON string and parse
      const json = decodeBase64ToString(base64);
      const parsedData = JSON.parse(json);

      // Re-insert placeholder for uuid so Match.fromPacket / constructors generate a fresh id
      parsedData.splice(7, 0, null);

      // Notify UI of success before invoking the app callback so the user sees feedback.
      if (statusEl) statusEl.textContent = "Import complete — applying data...";
      this.callback(parsedData);

      // Keep a short user-visible success message, then clear the status.
      if (statusEl) {
        statusEl.textContent = "Import successful";
        window.setTimeout(() => {
          const s = document.getElementById("qr-import-status");
          if (s) s.textContent = "";
        }, 1500);
      }
    } catch (err) {
      console.error("QRImport: failed to reconstruct data", err);
      if (statusEl)
        statusEl.textContent = "Import failed (corrupt/incomplete stream)";
      alert(
        "Failed to import QR data: " +
          (err && (err as Error).message
            ? (err as Error).message
            : String(err)),
      );
    } finally {
      // Reset internal state
      this.callback = null;
      this.received = {};
      this.receivedIds = [];
      this.expectedLength = -1;
    }
  }
}

function insertSorted(arr: number[], num: number): number[] {
  let left = 0;
  let right = arr.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] < num) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  arr.splice(left, 0, num);
  return arr;
}
