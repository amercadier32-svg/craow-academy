// Fonds du mode vidéo (images JPG, PNG, GIF et vidéos MP4, WEBM), gardés dans le navigateur (IndexedDB),
// sur cet appareil seulement : rien n'est envoyé ni publié en ligne.
const DB = "e2academy-fonds";
const STORE = "fonds";

export type TypeFond = "image" | "video";
export interface InfosFond {
  id: string; nom: string; type: TypeFond; mime: string; taille: number;
  largeur: number; hauteur: number; duree: number | null;
  miniature: string;           // petite image (data:) pour la galerie
  ajouteLe: string;
  lourd: string | null;        // pourquoi ce fond risque de ne pas être fluide (null : pas de souci)
}
interface Ligne extends InfosFond { blob: Blob }

export const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/webm"];
export const ACCEPT = ".jpg,.jpeg,.png,.gif,.mp4,.webm," + TYPES_ACCEPTES.join(",");

let ouverte: Promise<IDBDatabase> | null = null;
function ouvrir(): Promise<IDBDatabase> {
  if (ouverte) return ouverte;
  ouverte = new Promise((ok, ko) => {
    const rq = indexedDB.open(DB, 1);
    rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains(STORE)) rq.result.createObjectStore(STORE, { keyPath: "id" }); };
    rq.onsuccess = () => { const db = rq.result; db.onversionchange = () => { db.close(); ouverte = null; }; ok(db); };
    rq.onerror = () => { ouverte = null; ko(rq.error); };
  });
  return ouverte;
}
async function req<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await ouvrir();
  return new Promise((ok, ko) => { const r = f(db.transaction(STORE, mode).objectStore(STORE)); r.onsuccess = () => ok(r.result as T); r.onerror = () => ko(r.error); });
}

const ecoute = new Set<() => void>();
export const surChangementFonds = (f: () => void) => { ecoute.add(f); return () => { ecoute.delete(f); }; };
const prevenir = () => ecoute.forEach((f) => f());

/** Les fonds gardés (sans le fichier lui-même), du plus récent au plus ancien. */
export async function listerFonds(): Promise<InfosFond[]> {
  try {
    const l = await req<Ligne[]>("readonly", (s) => s.getAll());
    return l.map(({ blob: _b, ...x }) => x).sort((a, b) => b.ajouteLe.localeCompare(a.ajouteLe));
  } catch { return []; }
}
export async function lireFond(id: string): Promise<{ infos: InfosFond; blob: Blob } | null> {
  try { const l = await req<Ligne | undefined>("readonly", (s) => s.get(id)); if (!l) return null; const { blob, ...infos } = l; return { infos, blob }; }
  catch { return null; }
}
export async function effacerFond(id: string) { await req("readwrite", (s) => s.delete(id)); prevenir(); }

/** Taille du fichier lisible : « 12,4 Mo ». */
export const fmtMo = (o: number) => (o >= 1e6 ? `${(o / 1e6).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(o / 1e3))} ko`);

/** Pourquoi un fond risque de saccader (ou null). Repères : au-delà du Full HD, de 25 Mbit/s ou de 150 Mo pour une
 *  vidéo ; d'un GIF de 15 Mo ; d'une image de plus de 8000 px de côté. */
export function verdictPoids(t: { type: TypeFond; mime: string; taille: number; largeur: number; hauteur: number; duree: number | null }): string | null {
  const raisons: string[] = [];
  if (t.type === "video") {
    if (t.largeur * t.hauteur > 1920 * 1088 * 1.05) raisons.push(`image très grande (${t.largeur} × ${t.hauteur} : plus que le Full HD)`);
    if (t.duree && t.duree > 0) { const mbps = (t.taille * 8) / t.duree / 1e6; if (mbps > 25) raisons.push(`débit élevé (${Math.round(mbps)} Mbit/s)`); }
    if (t.taille > 150e6) raisons.push(`fichier lourd (${fmtMo(t.taille)})`);
  } else {
    if (t.mime === "image/gif" && t.taille > 15e6) raisons.push(`GIF lourd (${fmtMo(t.taille)})`);
    if (Math.max(t.largeur, t.hauteur) > 8000) raisons.push(`image immense (${t.largeur} × ${t.hauteur})`);
  }
  return raisons.length ? `Ce fond risque de ne pas rester fluide : ${raisons.join(", ")}. Conseil : une vidéo en 1920 × 1080 (ou 1080 × 1920 en vertical), 30 images/s, moins de 50 Mo.` : null;
}

function miniatureDe(src: CanvasImageSource, w: number, h: number): string {
  const c = document.createElement("canvas"), k = Math.min(1, 240 / Math.max(1, w), 160 / Math.max(1, h));
  c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  const g = c.getContext("2d"); if (!g) return "";
  try { g.drawImage(src, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.7); } catch { return ""; }
}

/** Lit les dimensions (et la durée) d'un fichier, et en fait une miniature. */
function examiner(blob: Blob, type: TypeFond): Promise<{ largeur: number; hauteur: number; duree: number | null; miniature: string }> {
  const url = URL.createObjectURL(blob);
  return new Promise((ok, ko) => {
    const fin = (x: { largeur: number; hauteur: number; duree: number | null; miniature: string }) => { URL.revokeObjectURL(url); ok(x); };
    const rate = () => { URL.revokeObjectURL(url); ko(new Error("illisible")); };
    if (type === "image") {
      const im = new Image();
      im.onload = () => fin({ largeur: im.naturalWidth, hauteur: im.naturalHeight, duree: null, miniature: miniatureDe(im, im.naturalWidth, im.naturalHeight) });
      im.onerror = rate;
      im.src = url;
    } else {
      const v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.preload = "auto";
      const t = window.setTimeout(rate, 15000);
      v.onloadeddata = () => { try { v.currentTime = Math.min(1, (v.duration || 2) / 3); } catch { /* */ } };
      v.onseeked = () => { window.clearTimeout(t); fin({ largeur: v.videoWidth, hauteur: v.videoHeight, duree: Number.isFinite(v.duration) ? v.duration : null, miniature: miniatureDe(v, v.videoWidth, v.videoHeight) }); };
      v.onerror = () => { window.clearTimeout(t); rate(); };
      v.src = url;
    }
  });
}

/** Ajoute un fichier choisi sur l'appareil. Rend les infos du fond, ou un message d'erreur. */
export async function ajouterFond(f: File): Promise<InfosFond | string> {
  const ext = f.name.toLowerCase().split(".").pop() ?? "";
  const mime = f.type || ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", mp4: "video/mp4", webm: "video/webm" } as Record<string, string>)[ext] || "";
  if (!TYPES_ACCEPTES.includes(mime)) return `« ${f.name} » : format non pris en charge. Choisis une image JPG, PNG ou GIF, ou une vidéo MP4 ou WEBM.`;
  const type: TypeFond = mime.startsWith("video/") ? "video" : "image";
  let ex;
  try { ex = await examiner(f, type); }
  catch { return `« ${f.name} » n'a pas pu être lu par le navigateur (fichier abîmé, ou codec vidéo non pris en charge : essaie un MP4 en H.264).`; }
  const infos: InfosFond = {
    id: `fond-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, nom: f.name.replace(/\.[^.]+$/, ""), type, mime, taille: f.size,
    largeur: ex.largeur, hauteur: ex.hauteur, duree: ex.duree, miniature: ex.miniature, ajouteLe: new Date().toISOString(), lourd: null,
  };
  infos.lourd = verdictPoids(infos);
  try { await req("readwrite", (s) => s.put({ ...infos, blob: f } satisfies Ligne)); }
  catch { return "Le navigateur n'a pas pu garder ce fichier (place insuffisante sur l'appareil ?)."; }
  prevenir();
  return infos;
}
