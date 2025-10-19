import { Model } from "@/model.ts";
import { registerSW } from "virtual:pwa-register";

// Register service worker for PWA functionality
registerSW({
  immediate: true,
  onOfflineReady() {
    console.log("PWA: Offline mode is now available!");
    alert("Offline is now available!");
  },
  onNeedRefresh() {
    console.log("PWA: New content available, please refresh.");
  },
  onRegisterError(error) {
    console.error("PWA: Service worker registration failed:", error);
  },
});

async function initializeApp(): Promise<void> {
  console.log(
    "Application startup: initializing model and deferring UI until DOM is ready...",
  );

  try {
    const model = new Model();
    console.log("Loading persistent data...");
    await model.loadPersistentData();
    console.log("Persistent data loaded");

    // Ensure DOM-dependent modules are only loaded after the document is ready.
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
      import("@/whiteboard.ts"),
      import("@/qr.ts"),
      import("@/view.ts"),
    ]);
    console.log("UI and QR modules imported");

    console.log("Creating UI instances...");
    const whiteboard = new whiteboardModule.Whiteboard(model);
    const qrimport = new qrModule.QRImport();
    const qrexport = new qrModule.QRExport();

    const app = new viewModule.View(model, whiteboard, qrimport, qrexport);
    console.log("Application initialized successfully");
    // Mark document as ready and notify any listeners that the app initialized.
    try {
      document.documentElement.setAttribute("data-app-ready", "true");
    } catch (err) {
      // Non-critical; ignore if we cannot set the attribute.
      console.warn("Could not set data-app-ready attribute:", err);
    }
    try {
      window.dispatchEvent(new Event("app:initialized"));
    } catch (err) {
      console.warn("Failed to dispatch app:initialized event:", err);
    }
  } catch (error) {
    console.error("Failed to initialize application:", error);
    // Mark document as not-ready and dispatch a module error event so debugging overlays
    // or remote monitors can react.
    try {
      document.documentElement.setAttribute("data-app-ready", "false");
    } catch (err) {
      // ignore
    }
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
