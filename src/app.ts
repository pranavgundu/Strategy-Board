import { View } from "@/view.ts";
import { Model } from "@/model.ts";
import { Whiteboard } from "@/whiteboard.ts";
import { QRImport, QRExport } from "@/qr.ts";
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
  try {
    const model = new Model();
    await model.loadPersistentData();

    const whiteboard = new Whiteboard(model);
    const qrimport = new QRImport();
    const qrexport = new QRExport();

    const app = new View(model, whiteboard, qrimport, qrexport);

    console.log("Application initialized successfully");
  } catch (error) {
    console.error("Failed to initialize application:", error);
    alert(
      "Failed to start the application. Please refresh the page and try again.",
    );
  }
}

// Initialize the application
initializeApp();
