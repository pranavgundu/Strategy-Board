import { mount } from "svelte";
import App from "./App.svelte";

const target = document.getElementById("app");

if (!target) {
  throw new Error("Could not find #app root element to mount Strategy Board");
}

const app = mount(App, { target });

export default app;
