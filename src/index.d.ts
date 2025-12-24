declare module "*.png";

interface ImportMetaEnv {
  readonly VITE_TBA_API_KEY: string;
  readonly VITE_POSTHOG_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
