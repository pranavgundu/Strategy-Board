import { native } from "$lib/native/api";
import type { NativeConfig } from "$lib/native/types";

import { toast } from "./toast.svelte";

const RELEASE_DISMISSAL_KEY = "releaseAnnouncementDismissal";
let config = $state<NativeConfig | null>(null);
let tbaAvailable = $state(false);
let loading = $state(false);
let releaseDismissed = $state(false);
let initPromise: Promise<void> | null = null;

/** Coarse app capabilities, loaded once rather than repeatedly by individual controls. */
export const features = {
  get config(): NativeConfig | null { return config; },
  get tbaAvailable(): boolean { return tbaAvailable; },
  get loading(): boolean { return loading; },
  get showReleaseAnnouncement(): boolean {
    const release = config?.releaseAnnouncement;
    return Boolean(release?.enabled && !releaseDismissed);
  },

  init(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      loading = true;
      try {
        const [nextConfig, apiKey, dismissed] = await Promise.all([
          native.config.current(),
          native.tba.hasApiKey(),
          native.storage.get(RELEASE_DISMISSAL_KEY),
        ]);
        config = nextConfig;
        tbaAvailable = apiKey;
        releaseDismissed = nextConfig.releaseAnnouncement.showOnce && dismissed === nextConfig.releaseAnnouncement.id;
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

  async dismissReleaseAnnouncement(): Promise<void> {
    const release = config?.releaseAnnouncement;
    releaseDismissed = true;
    if (release?.showOnce) await native.storage.set(RELEASE_DISMISSAL_KEY, release.id);
  },
};
