import { View } from "@/view.ts";
import { Model } from "@/model.ts";
import { Whiteboard } from "@/whiteboard.ts";
import { QRImport, QRExport } from "@/qr.ts";
import { registerSW } from "virtual:pwa-register"

registerSW({ immediate: true, onOfflineReady() {
    alert("Offline is now available!")
}, });

const model = new Model();

await model.loadPersistentData();

const whiteboard = new Whiteboard(model);
const qrimport = new QRImport();
const qrexport = new QRExport();

const app = new View(model, whiteboard, qrimport, qrexport);