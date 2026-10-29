// Version en ligne : garde une copie de l'app pour qu'elle s'ouvre aussi sans internet.
// Avec internet, on prend toujours la dernière version (et on met la copie à jour).
const CACHE = "craow-academy";
const FICHIERS = ["./", "./manifest.webmanifest", "./icone-192.png", "./icone-512.png", "./icone-apple.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((rep) => {
        if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then((c) => c.put(req, copie)); }
        return rep;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("./"))),
  );
});
