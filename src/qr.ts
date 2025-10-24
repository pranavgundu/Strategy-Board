import QrScanner from "qr-scanner";
import QRCode from "qrcode";
import { Match } from "@/match.ts";

const HEADER_SIZE = 4;
const TOTAL_CHUNKS_HEADER_SIZE = 4;
const CHUNK_HEADER_SIZE = HEADER_SIZE + TOTAL_CHUNKS_HEADER_SIZE;

const MAX_CHUNK_PAYLOAD = 250;
const FRAME_DURATION_MS = 400;

function encodeToBase64(input: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64ToString(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

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
  private pool: Array<HTMLElement | null> = [];
  private intervalId: number | null = null;
  private startCallback: (() => void) | null = null;

  constructor() {
    this.pool = [];
  }

  export(match: Match, onReadyToStart?: () => void): void {
    this.pool = [
      document.getElementById("qr-export-code-worker-0"),
      document.getElementById("qr-export-code-worker-1"),
      document.getElementById("qr-export-code-worker-2"),
    ];

    if (!this.pool || this.pool.every((el) => el === null)) {
      console.error("QRExport: pool elements not available");
      alert("QR export is currently unavailable");
      return;
    }

    if (this.intervalId !== null) {
      this.close();
    }

    const packet = match.getAsPacket();
    packet.splice(7, 1);
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
      Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.5),
    );

    const shown = new Set<number>();
    function markShown(idx: number): void {
      if (!shown.has(idx)) {
        shown.add(idx);
        updateOverlayStatus(shown.size, totalChunks);
      }
    }

    const updateOverlayStatus = (shownCount: number, total: number) => {
      const status = document.getElementById("qr-export-status");
      if (status) {
        status.textContent = `Page ${shownCount} / ${total}`;
        status.style.display = "block";
      }

      try {
        const dots = document.getElementById(
          "qr-export-dots",
        ) as HTMLElement | null;
        if (dots) {
          if (total > 1 && shownCount < total)
            dots.style.display = "inline-flex";
          else dots.style.display = "none";
        }
      } catch (_err) {}
      
      // Show progress bar when animation starts
      const progressWrap = document.getElementById("qr-export-progress-wrap");
      if (progressWrap) progressWrap.style.display = "flex";
    };

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
          
          // Show the first QR code immediately
          const dom = document.getElementById(el.id);
          if (dom) dom.classList.remove("hidden");
          
          // Wait for start button click before starting animation
          const startExport = () => {
            markShown(0);
            
            // Hide start button
            const startBtn = document.getElementById("qr-export-start-btn");
            if (startBtn) startBtn.style.display = "none";
          };
          
          if (onReadyToStart) {
            onReadyToStart();
            // Set up the start callback
            const startBtn = document.getElementById("qr-export-start-btn");
            if (startBtn) {
              startBtn.onclick = startExport;
            }
          } else {
            // Fallback: start immediately if no callback provided
            startExport();
          }
        } catch (err) {
          console.error("QRExport: failed to render single QR", err);
          alert("Failed to render QR export");
        }
      })();
      return;
    }

    let poolIndex = 0;
    let payloadIndex = 0;
    const poolSize = this.pool.length;
    const modulus = (n: number, m: number) => ((n % m) + m) % m;

    (async () => {
      try {
        // Pre-render initial QR codes
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
            const slot = document.getElementById(`qr-export-code-worker-${i}`);
            if (slot) slot.classList.add("hidden");
          } catch (err) {
            console.warn("QRExport: failed to render initial QR canvas", err);
          }
        }

        // Define the start function that begins the animation
        const startAnimation = () => {
          // Show the first QR code and mark as shown
          const firstEl = this.pool.find((x) => x) || null;
          if (firstEl) {
            const dom = document.getElementById(firstEl.id);
            if (dom) dom.classList.remove("hidden");
          }
          markShown(0);
          
          // Hide start button
          const startBtn = document.getElementById("qr-export-start-btn");
          if (startBtn) startBtn.style.display = "none";

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
        };
        
        // Show the first QR code immediately
        const firstEl = this.pool.find((x) => x) || null;
        if (firstEl) {
          const dom = document.getElementById(firstEl.id);
          if (dom) dom.classList.remove("hidden");
        }
        
        // Wait for start button click or start immediately
        if (onReadyToStart) {
          onReadyToStart();
          const startBtn = document.getElementById("qr-export-start-btn");
          if (startBtn) {
            startBtn.onclick = startAnimation;
          }
        } else {
          // Fallback: start immediately if no callback provided
          startAnimation();
        }
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
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    try {
      for (let i = 0; i < this.pool.length; i++) {
        const el = this.pool[i];
        if (el && typeof el.replaceChildren === "function") {
          try {
            el.replaceChildren();
          } catch (_err) {}
        }
        const slot = document.getElementById(`qr-export-code-worker-${i}`);
        if (slot) {
          try {
            slot.classList.add("hidden");
            while (slot.firstChild) slot.removeChild(slot.firstChild);
          } catch (_err) {}
        }
      }

      const domWorkers = document.querySelectorAll(
        '[id^="qr-export-code-worker-"]',
      );
      domWorkers.forEach((w) => {
        try {
          const h = w as HTMLElement;
          h.classList.add("hidden");
          h.replaceChildren();
        } catch (_err) {}
      });
    } catch (err) {
      console.warn("QRExport: error during cleanup", err);
    }

    try {
      const overlay = document.getElementById("qr-export-container");
      if (overlay) overlay.classList.add("hidden");
      const status = document.getElementById("qr-export-status");
      if (status) {
        status.textContent = "";
        status.style.display = "none";
      }
      const dots = document.getElementById("qr-export-dots");
      if (dots) {
        try {
          dots.style.display = "none";
        } catch (_err) {}
      }
      const progressWrap = document.getElementById("qr-export-progress-wrap");
      if (progressWrap) progressWrap.style.display = "none";
      
      // Reset start button
      const startBtn = document.getElementById("qr-export-start-btn");
      if (startBtn) {
        startBtn.style.display = "block";
        startBtn.onclick = null;
      }
    } catch (err) {
      console.warn("QRExport: error hiding overlay or clearing status", err);
    }

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

    const statusEl = document.getElementById("qr-import-status");
    if (statusEl) statusEl.textContent = "Preparing camera…";

    try {
      try {
        await this.getAvailableCameras();
      } catch (enumErr) {
        console.warn("QRImport: camera enumeration failed", enumErr);
      }

      if (statusEl) statusEl.textContent = "Starting camera…";
      await this.scanner.start();

      if (statusEl) statusEl.textContent = "Scanning for QR codes…";
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
      console.warn("QRImport: error stopping scanner:", err);
    }

    const statusEl = document.getElementById("qr-import-status");
    if (statusEl) statusEl.textContent = "";
    try {
      const dots = document.getElementById(
        "qr-import-dots",
      ) as HTMLElement | null;
      if (dots) dots.style.display = "none";
    } catch (_err) {}
  }

  private getResult(result: QrScanner.ScanResult): void {
    try {
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

      if (!Object.prototype.hasOwnProperty.call(this.received, id)) {
        this.received[id] = payload;
        insertSorted(this.receivedIds, id);

        if (statusEl) {
          statusEl.textContent = `Receiving ${this.receivedIds.length} / ${this.expectedLength} chunks`;
        }
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
        if (statusEl) {
          statusEl.textContent = `Receiving ${this.receivedIds.length} / ${this.expectedLength} chunks (duplicates ignored)`;
        }
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
    this.stop();

    const statusEl = document.getElementById("qr-import-status");
    if (statusEl) statusEl.textContent = "Reconstructing QR payload...";
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
      let base64 = "";
      for (const i of this.receivedIds) {
        base64 += this.received[i];
      }

      const json = decodeBase64ToString(base64);
      const parsedData = JSON.parse(json);

      parsedData.splice(7, 0, null);

      if (statusEl) statusEl.textContent = "Import complete — applying data...";
      this.callback(parsedData);

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
