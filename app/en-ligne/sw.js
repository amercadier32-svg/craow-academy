// Version en ligne : garde une copie de l'app pour qu'elle s'ouvre aussi sans internet.
// Chaque mise en ligne a son numéro de version (écrit par scripts/assembler.mjs). Quand une nouvelle version
// est publiée, elle se télécharge en arrière-plan ; l'app affiche « Nouvelle version disponible, recharger ? »
// et ne change qu'au clic (rien ne se recharge pendant que tu travailles).
const VERSION = "__VERSION__";
const CACHE = "craow-academy-" + VERSION;
const FICHIERS = ["./", "./manifest.webmanifest", "./icone-192.png", "./icone-512.png", "./icone-maskable-512.png", "./icone-apple.png"];

self.addEventListener("install", (e) => {
  // toujours la version du serveur (jamais celle du cache du navigateur)
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS.map((f) => new Request(f, { cache: "reload" })))));
  // premier passage : rien à remplacer, la copie hors ligne est prête tout de suite
  if (!self.registration.active) self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith("craow-academy") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => {
  if (e.data === "version") e.source?.postMessage({ version: VERSION });
  if (e.data === "installer") self.skipWaiting();   // clic sur « Recharger »
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  // la copie de cette version d'abord (hors ligne et rapide), sinon internet
  e.respondWith(
    caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((r) => r
      || fetch(req).then((rep) => { if (rep.ok) c.put(req, rep.clone()); return rep; })
        .catch(() => (req.mode === "navigate" ? c.match("./") : Response.error())))),
  );
});
