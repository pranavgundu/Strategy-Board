/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />
import { base, build, files, version } from "$service-worker";

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `orbit-strategy-board-${version}`;
const SHELL = `${base}/`;
// ttf files are fallbacks the browser never requests when woff2 works
const ASSETS = [...build, ...files].filter((path) => !path.endsWith(".ttf") && !path.split("/").at(-1)?.startsWith("."));
const PRECACHED = new Set(ASSETS);
// venue wi-fi can stall for minutes - give up on the network fast and open the cached shell
const NAVIGATION_TIMEOUT_MS = 4000;

sw.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([SHELL, ...ASSETS])).then(() => sw.skipWaiting()));
});

sw.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await sw.clients.claim();
  })());
});

sw.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== sw.location.origin) return;
  if (request.mode === "navigate") event.respondWith(openShell(event));
  else if (PRECACHED.has(url.pathname)) event.respondWith(cacheFirst(request));
});

async function openShell(event: FetchEvent): Promise<Response> {
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(event.request), NAVIGATION_TIMEOUT_MS);
    if (response.ok) event.waitUntil(cache.put(SHELL, response.clone()));
    return response;
  } catch {
    return (await cache.match(SHELL)) ?? Response.error();
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  return (await caches.match(request)) ?? fetch(request);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out")), ms);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error: unknown) => { clearTimeout(timer); reject(error); });
  });
}
