/*
 * FCGBS service worker. It keeps a copy of files that never change (the app's own
 * scripts, styles and fonts) and of the brand pictures, so that after the first visit a page needs
 * only its own data from the network. Pages, examination data, results and sound are never stored.
 */
const CACHE = "fcgbs-static-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const hashed = url.pathname.startsWith("/_next/static/");
  const brand = url.pathname.startsWith("/brand/");
  if (!hashed && !brand) return; // everything else always goes to the network
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      const refresh = () =>
        fetch(req).then((res) => {
          if (res.ok && res.status === 200) cache.put(req, res.clone());
          return res;
        });
      // Files under /_next/static carry their version in the name, so a stored copy is always right.
      if (hit && hashed) return hit;
      // Brand pictures: show the stored copy at once and fetch a newer one quietly for next time.
      if (hit) {
        event.waitUntil(refresh().catch(() => undefined));
        return hit;
      }
      return refresh();
    })(),
  );
});
