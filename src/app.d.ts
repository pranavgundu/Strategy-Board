// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  /** Injected by `define` in vite.config.js. */
  const __BUILD_COMMIT__: {
    sha: string;
    fullSha: string;
    message: string;
    author: string;
    date: string;
    url: string;
  };

  /** Build-time public client keys used by the browser service adapter. */
  const __FIREBASE_API_KEY__: string;
  const __TBA_API_KEY__: string;
}

export {};
