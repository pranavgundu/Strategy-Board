declare module "*.png";

declare module "virtual:pwa-register" {
  interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisterError?: (error: unknown) => void;
  }

  export function registerSW(options?: RegisterSWOptions): () => Promise<void>;
}

interface ImportMetaEnv {
  readonly VITE_TBA_API_KEY: string;
  readonly VITE_FIREBASE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
