import { Model } from "./model.ts";
import { registerSW } from "virtual:pwa-register";
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";

inject();
injectSpeedInsights();

registerSW({
  immediate: true,
  /**
   * Callback invoked when the PWA is ready for offline use.
   */
  onOfflineReady() {
    console.log("PWA: Offline mode is now available!");
  },
  /**
   * Callback invoked when new content is available and a refresh is needed.
   */
  onNeedRefresh() {
    console.log("PWA: New content available, please refresh.");
  },
  /**
   * Callback invoked when service worker registration fails.
   *
   * @param error - The error that occurred during registration
   */
  onRegisterError(error) {
    console.error("PWA: Service worker registration failed:", error);
  },
});

/**
 * Initializes the application by loading data and setting up UI components.
 *
 * @throws Error if application initialization fails.
 */
async function initializeApp(): Promise<void> {
  console.log(
    "Application startup: initializing model and deferring UI until DOM is ready...",
  );

  try {
    const model = new Model();

    // Start fetching modules and waiting for DOM immediately — parallel with DB load
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

    console.log("Loading persistent data...");
    await model.loadPersistentData();
    console.log("Persistent data loaded");

    await domReady;

    console.log("UI and QR modules imported");
    const [whiteboardModule, qrModule, viewModule] = await moduleImports;

    console.log("Creating UI instances...");
    const whiteboard = new whiteboardModule.Whiteboard(model);
    const qrimport = new qrModule.QRImport();
    const qrexport = new qrModule.QRExport();

    const _app = new viewModule.View(model, whiteboard, qrimport, qrexport);
    console.log("Application initialized successfully");
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
