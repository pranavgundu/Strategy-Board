import { View } from "@/view.ts";
import { Model } from "@/model.ts";

const model = new Model();
await model.loadPersistentData();

const ui = new View(model);