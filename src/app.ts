import { View } from "@/view.ts";
import { Model } from "@/model.ts";
import { Whiteboard } from "@/whiteboard.ts";

const model = new Model();

await model.loadPersistentData();

const whiteboard = new Whiteboard(model);
const ui = new View(model, whiteboard);