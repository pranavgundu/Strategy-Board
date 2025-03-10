import { View } from "@/view.ts";
import { Model } from "@/model.ts";
import { Whiteboard } from "@/whiteboard.ts";
import { registerSW } from "virtual:pwa-register"

registerSW({ immediate: true, onOfflineReady() {
    alert("Offline is now available!")
}, });

const model = new Model();

await model.loadPersistentData();

const whiteboard = new Whiteboard(model);
const ui = new View(model, whiteboard);