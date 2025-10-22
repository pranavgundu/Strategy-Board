declare module "*.png";

interface ImportMetaEnv {
  // defines environment variables available in the app
  readonly VITE_TBA_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
