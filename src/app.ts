import { Model } from "./model.ts";
import { preloadFieldImages } from "./manager.ts";
import { setupTauri } from "./tauri.ts";
import { initCore } from "./wasm/index.ts";
import { registerSW } from "virtual:pwa-register";

setupTauri();

if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  (CanvasRenderingContext2D.prototype as any).roundRect = function (
    x: number,
    y: number,
    width: number,
    height: number,
    radii?: number | number[],
  ) {
    let r = 0;
    if (typeof radii === "number") {
      r = radii;
    } else if (Array.isArray(radii) && radii.length > 0) {
      r = radii[0];
    }
    r = Math.min(r, Math.abs(width) / 2, Math.abs(height) / 2);
    this.moveTo(x + r, y);
    this.lineTo(x + width - r, y);
    this.arcTo(x + width, y, x + width, y + r, r);
    this.lineTo(x + width, y + height - r);
    this.arcTo(x + width, y + height, x + width - r, y + height, r);
    this.lineTo(x + r, y + height);
    this.arcTo(x, y + height, x, y + height - r, r);
    this.lineTo(x, y + r);
    this.arcTo(x, y, x + r, y, r);
    this.closePath();
  };
}
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";

inject();
injectSpeedInsights();

registerSW({
  immediate: true,
  onOfflineReady() {},
  onNeedRefresh() {
    try {
      window.dispatchEvent(new Event("app:update-available"));
    } catch (error) {
      console.error("Failed to dispatch app:update-available:", error);
    }
  },
  onRegisterError(error) {
    console.error("PWA: Service worker registration failed:", error);
  },
});

async function initializeApp(): Promise<void> {
  try {
    const model = new Model();

    const coreReady = initCore();
    const moduleImports = Promise.all([
      import("./whiteboard.ts"),
      import("./qr.ts"),
      import("./view.ts"),
    ]);
    const domReady =
      document.readyState === "loading"
        ? new Promise<void>((resolve) => {
            document.addEventListener("DOMContentLoaded", () => resolve(), {
              once: true,
            });
          })
        : Promise.resolve();

    await coreReady;
    await model.loadPersistentData();

    await domReady;

    const [whiteboardModule, qrModule, viewModule] = await moduleImports;

    const whiteboard = new whiteboardModule.Whiteboard(model);
    const qrimport = new qrModule.QRImport();
    const qrexport = new qrModule.QRExport();

    const _app = new viewModule.View(model, whiteboard, qrimport, qrexport);
    try {
      document.documentElement.setAttribute("data-app-ready", "true");
    } catch (err) {
      console.warn("Could not set data-app-ready attribute:", err);
    }
    try {
      window.dispatchEvent(new Event("app:initialized"));
    } catch (err) {
      console.warn("Failed to dispatch app:initialized event:", err);
    }
    preloadFieldImages();
  } catch (error) {
    console.error("Failed to initialize application:", error);

    try {
      document.documentElement.setAttribute("data-app-ready", "false");
    } catch (_err) {}
    try {
      window.dispatchEvent(
        new CustomEvent("app:moduleerror", { detail: error }),
      );
    } catch (evtErr) {
      console.warn("Failed to dispatch app:moduleerror:", evtErr);
    }
    alert(
      "Failed to start the application. Please refresh the page and try again.",
    );
  }
}

initializeApp();
