declare module "*.png";

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TBA_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
