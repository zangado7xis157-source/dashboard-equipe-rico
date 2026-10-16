const RICO_SW_VERSION = "20261016-1758-force-latest";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (_) {}

    await self.clients.claim();

    // Quando este novo SW assumir, recarrega sozinho as telas abertas
    // para sair imediatamente de qualquer versão antiga em cache.
    try {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        try {
          const url = new URL(client.url);
          if (url.origin !== self.location.origin) continue;
          if (url.searchParams.get("rico_latest") === RICO_SW_VERSION) continue;
          url.searchParams.set("rico_latest", RICO_SW_VERSION);
          await client.navigate(url.toString());
        } catch (_) {}
      }
    } catch (_) {}
  })());
});

function networkOnly(request) {
  const freshRequest = new Request(request, { cache: "no-store" });
  return fetch(freshRequest);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isImportant =
    request.mode === "navigate" ||
    request.destination === "document" ||
    request.destination === "script" ||
    request.destination === "style" ||
    url.pathname === "/app-version.json" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/sw.js";

  if (isImportant) {
    event.respondWith(networkOnly(request));
    return;
  }

  // Demais arquivos também preferem a rede. Nenhum cache antigo do Dashboard
  // é mantido por este service worker.
  event.respondWith(fetch(request));
});
