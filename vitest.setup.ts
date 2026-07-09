import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initCoreSync } from "./src/wasm/index.ts";

initCoreSync(readFileSync(resolve(__dirname, "src/wasm/pkg/strategy_core_bg.wasm")));
