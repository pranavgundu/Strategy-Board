import { native } from "$lib/native/api";
import type { NativeConfig } from "$lib/native/types";

import { toast } from "./toast.svelte";

let config = $state<NativeConfig | null>(null);
let tbaAvailable = $state(false);
let loading = $state(false);
let initPromise: Promise<void> | null = null;

/** Coarse app capabilities, loaded once rather than repeatedly by individual controls. */
export const features = {
  get config(): NativeConfig | null { return config; },
  get tbaAvailable(): boolean { return tbaAvailable; },
  get loading(): boolean { return loading; },

  init(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      loading = true;
      try {
        const [nextConfig, apiKey] = await Promise.all([native.config.current(), native.tba.hasApiKey()]);
        config = nextConfig;
        tbaAvailable = apiKey;
      } catch (error) {
        console.error("Failed to load app features", error);
        toast.show("Some online features are unavailable right now.", "warning", 6_000);
      } finally {
        loading = false;
      }
    })();
    return initPromise;
  },

  async setTbaApiKey(apiKey: string): Promise<void> {
    await native.tba.setApiKey(apiKey);
    tbaAvailable = await native.tba.hasApiKey();
  },
};
