// Tes enregistrements, gardés dans le navigateur (IndexedDB), sur cet appareil.
// Clés : « rec:<id> » = enregistrements faits dans l'app (module Enregistrement),
//        « session:<id> » = audio d'une session, et l'id d'une recette ou d'une grille = fichier ajouté à la main.
// Si l'app devient un .exe plus tard, il suffira de remplacer ces fonctions par l'écriture dans un dossier du PC
// (ex. Documents\CrAoW ACADEMY\Enregistrements) : le reste de l'app ne passe que par ici.
// « morceaux » : la prise en cours, écrite sur le disque toutes les 5 secondes (jusqu'à 40 minutes) :
//        « <id>:meta » = ses infos, « <id>:c000001 »… = le son, par morceaux. Après un plantage, on la retrouve là.
const DB = "e2academy-audio";
const STORE = "enregistrements";
const MORCEAUX = "morceaux";

let dbOuverte: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  if (dbOuverte) return dbOuverte;
  dbOuverte = new Promise((ok, ko) => {
    const rq = indexedDB.open(DB, 2);
    rq.onupgradeneeded = () => {
      if (!rq.result.objectStoreNames.contains(STORE)) rq.result.createObjectStore(STORE);
      if (!rq.result.objectStoreNames.contains(MORCEAUX)) rq.result.createObjectStore(MORCEAUX);
    };
    rq.onsuccess = () => {
      const db = rq.result;
      db.onversionchange = () => { db.close(); dbOuverte = null; };
      db.onclose = () => { dbOuverte = null; };
      ok(db);
    };
    rq.onerror = () => { dbOuverte = null; ko(rq.error); };
    rq.onblocked = () => { /* un autre onglet de l'app est ouvert avec l'ancienne version : il se fermera tout seul */ };
  });
  return dbOuverte;
}

async function run<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest, store = STORE): Promise<T> {
  const db = await open();
  return new Promise((ok, ko) => {
    const rq = f(db.transaction(store, mode).objectStore(store));
    rq.onsuccess = () => ok(rq.result as T);
    rq.onerror = () => ko(rq.error);
  });
}

/** D'où vient un enregistrement. */
export type ModuleRec = "recette" | "exercice" | "releve" | "session" | "reference" | "mastering" | "visualiseur" | "libre" | "fichier";
export interface MetaRec {
  id: string;
  titre: string;
  module: ModuleRec;
  source?: string;          // id de la recette, de l'exercice, du paramètre…
  sourceTitre?: string;
  href?: string;            // lien pour revenir à la fiche
  duree: number;            // secondes
  sr: number;
  canaux: number;
  bits: number;
  creteDb: number;
  normalise?: boolean;
  bpm?: number;
  apercu: number[];         // 120 crêtes de 0 à 1 pour la petite forme d'onde
  etat: "active" | "corbeille";
  majLe: string;
}
export interface Enregistrement { nom: string; blob: Blob; ajouteLe: string; meta?: MetaRec }

export const lireEnregistrement = (id: string) => run<Enregistrement | undefined>("readonly", (s) => s.get(id));
export const garderEnregistrement = (id: string, e: Enregistrement) => run("readwrite", (s) => s.put(e, id));
export async function effacerEnregistrement(id: string) { await run("readwrite", (s) => s.delete(id)); prevenir(); }

// ---------- Liste (page « Mes enregistrements ») ----------
export interface Ligne { cle: string; nom: string; taille: number; ajouteLe: string; meta?: MetaRec; type: string }
const ecoute = new Set<() => void>();
export const surChangement = (f: () => void) => { ecoute.add(f); return () => { ecoute.delete(f); }; };
const prevenir = () => ecoute.forEach((f) => f());

export async function listerEnregistrements(): Promise<Ligne[]> {
  const db = await open();
  return new Promise((ok, ko) => {
    const out: Ligne[] = [];
    const rq = db.transaction(STORE, "readonly").objectStore(STORE).openCursor();
    rq.onsuccess = () => {
      const c = rq.result;
      if (!c) { ok(out); return; }
      const v = c.value as Enregistrement;
      if (v?.blob) out.push({ cle: String(c.key), nom: v.nom, taille: v.blob.size, ajouteLe: v.ajouteLe, meta: v.meta, type: v.blob.type });
      c.continue();
    };
    rq.onerror = () => ko(rq.error);
  });
}

/** Nouvel enregistrement de l'app : clé « rec:<id> ». Demande aussi au navigateur de ne pas effacer le stockage tout seul. */
export async function ajouterEnregistrement(blob: Blob, nom: string, meta: Omit<MetaRec, "etat" | "majLe">) {
  const t = new Date().toISOString();
  await garderEnregistrement(`rec:${meta.id}`, { nom, blob, ajouteLe: t, meta: { ...meta, etat: "active", majLe: t } });
  try { await navigator.storage?.persist?.(); } catch { /* */ }
  prevenir();
}

/** Change les infos d'un enregistrement (titre, corbeille…) sans toucher à l'audio. */
export async function majMeta(cle: string, x: Partial<MetaRec>, defaut?: MetaRec) {
  const e = await lireEnregistrement(cle);
  if (!e) return;
  const meta = { ...(e.meta ?? defaut!), ...x, majLe: new Date().toISOString() };
  await garderEnregistrement(cle, { ...e, meta });
  prevenir();
}

/** Place prise par les enregistrements et place disponible pour l'app dans le navigateur (en octets). */
export async function placeStockage(): Promise<{ utilise: number | null; quota: number | null; persistant: boolean | null }> {
  try {
    const e = await navigator.storage?.estimate?.();
    const p = await navigator.storage?.persisted?.();
    return { utilise: e?.usage ?? null, quota: e?.quota ?? null, persistant: p ?? null };
  } catch { return { utilise: null, quota: null, persistant: null }; }
}

export const fmtTaille = (o: number) => (o >= 1e9 ? `${(o / 1e9).toFixed(2).replace(".", ",")} Go` : o >= 1e6 ? `${(o / 1e6).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(o / 1e3))} ko`);

// ---------- Prise en cours, écrite par morceaux (voir lib/enregistreur.ts) ----------
/** Infos d'une prise écrite par morceaux. `etat` : « rec » pendant l'enregistrement, « arretee » une fois arrêtée mais pas encore gardée. */
export interface MetaPrise {
  id: string; sr: number; canaux: 1 | 2; debut: string; majLe: number;
  frames: number; morceaux: number; saturations: number; etat: "rec" | "arretee" | "gardee";
  source: { module: ModuleRec; ref?: string; titre: string; href?: string }; bpm?: number;
}
/** Un morceau du son : PCM 24 bits entrelacé, et ses crêtes (une toutes les 50 ms). */
export interface Morceau { donnees: Blob; pics: number[]; frames: number }

const cleMorceau = (id: string, n: number) => `${id}:c${String(n).padStart(6, "0")}`;
export const ecrireMorceau = (id: string, n: number, m: Morceau) => run("readwrite", (s) => s.put(m, cleMorceau(id, n)), MORCEAUX);
export const ecrireMetaPrise = (m: MetaPrise) => run("readwrite", (s) => s.put(m, `${m.id}:meta`), MORCEAUX);

/** Les morceaux d'une prise, dans l'ordre. */
export async function lireMorceaux(id: string): Promise<Morceau[]> {
  return run<Morceau[]>("readonly", (s) => s.getAll(IDBKeyRange.bound(`${id}:c`, `${id}:c\uffff`)), MORCEAUX);
}
/** Efface une prise écrite par morceaux (après « Garder », « Jeter » ou la récupération). */
export async function effacerPrise(id: string) {
  await run("readwrite", (s) => s.delete(IDBKeyRange.bound(`${id}:`, `${id}:\uffff`)), MORCEAUX);
  prevenir();
}
/** Change l'état d'une prise écrite par morceaux (ex. « gardee » : elle est dans Mes enregistrements, ses morceaux peuvent partir). */
export async function etatPrise(id: string, etat: MetaPrise["etat"]) {
  const m = await run<MetaPrise | undefined>("readonly", (s) => s.get(`${id}:meta`), MORCEAUX);
  if (m) await ecrireMetaPrise({ ...m, etat });
}
/** Toutes les prises écrites par morceaux qui restent sur le disque. */
export async function listerPrises(): Promise<MetaPrise[]> {
  const cles = await run<IDBValidKey[]>("readonly", (s) => s.getAllKeys(), MORCEAUX);
  const out: MetaPrise[] = [];
  for (const k of cles) {
    if (typeof k !== "string" || !k.endsWith(":meta")) continue;
    const m = await run<MetaPrise | undefined>("readonly", (s) => s.get(k), MORCEAUX);
    if (m) out.push(m);
  }
  return out;
}
