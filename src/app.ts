import { Model } from "./model.ts";
import { registerSW } from "virtual:pwa-register";
import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";
import posthog from "posthog-js";

inject();

injectSpeedInsights();

const postHogApiKey = import.meta.env.VITE_POSTHOG_API_KEY;

if (typeof window !== "undefined" && postHogApiKey) {
  posthog.init(postHogApiKey, {
    api_host: "https://us.i.posthog.com",
  });
}

registerSW({
  immediate: true,
  onOfflineReady() {
    console.log("PWA: Offline mode is now available!");
  },
  onNeedRefresh() {
    console.log("PWA: New content available, please refresh.");
  },
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
    console.log("Loading persistent data...");
    await model.loadPersistentData();
    console.log("Persistent data loaded");

    if (document.readyState === "loading") {
      console.log(
        "DOM not ready. Waiting for DOMContentLoaded to import UI modules...",
      );
      await new Promise<void>((resolve) => {
        document.addEventListener(
          "DOMContentLoaded",
          () => {
            console.log("DOMContentLoaded received");
            resolve();
          },
          { once: true },
        );
      });
    } else {
      console.log("DOM already ready — proceeding with UI initialization");
    }

    console.log("Dynamically importing UI and QR modules...");
    const [whiteboardModule, qrModule, viewModule] = await Promise.all([
      import("./whiteboard.ts"),
      import("./qr.ts"),
      import("./view.ts"),
    ]);
    console.log("UI and QR modules imported");

    console.log("Creating UI instances...");
    const whiteboard = new whiteboardModule.Whiteboard(model);
    const qrimport = new qrModule.QRImport();
    const qrexport = new qrModule.QRExport();

    const app = new viewModule.View(model, whiteboard, qrimport, qrexport);
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
    } catch (err) {}
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