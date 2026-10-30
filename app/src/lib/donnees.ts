// Sécurité de tes données (relevés, notes, favoris, sessions, recettes gardées, presets, morceaux…).
// - Numéro de format + migrations : une mise à jour de l'app transforme tes anciennes données au lieu de les casser.
// - Copies automatiques : à chaque modification, une copie complète va dans ce navigateur (IndexedDB),
//   séparée des données de travail. Une par heure est gardée (les 20 dernières), plus une copie avant
//   chaque migration, import ou retour en arrière.
// - Fichier sur le PC (Chrome et Edge sur ordinateur) : la même copie est écrite dans un fichier que tu choisis.
// Les enregistrements audio (IndexedDB « e2academy-audio ») ne sont ni copiés ni exportés : trop lourds.
import { clesApp, effacer, ecrireTexte, lireJson, lireTexte, surEcriture } from "./stockage";

/** Format actuel des données. À augmenter, avec une migration ci-dessous, quand la forme des données change. */
export const FORMAT = 3;
export const CLE_FORMAT = "e2academy.format";
const INTERNE = "e2academy.sauvegarde.";   // réglages de la sauvegarde elle-même : jamais copiés ni exportés
export const CLE_DERNIER_EXPORT = INTERNE + "dernierExport";
export const CLE_RAPPEL = INTERNE + "rappel";

export type Cles = Record<string, string>;

/** Toutes tes données (texte brut, clé par clé). */
export function toutesLesCles(): Cles {
  const out: Cles = {};
  for (const k of clesApp()) if (!k.startsWith(INTERNE)) { const v = lireTexte(k); if (v != null) out[k] = v; }
  return out;
}
const taille = (c: Cles) => Object.entries(c).reduce((a, [k, v]) => a + (k.length + v.length) * 2, 0);

// ---------- Migrations ----------
interface Migration { vers: number; nom: string; faire: () => void }
export const MIGRATIONS: Migration[] = [
  {
    vers: 2,
    nom: "numéro de format ajouté, anciens favoris du Guide des effets repris",
    faire() {
      const vieux = lireJson<string[]>("e2academy.fx.favoris", []);
      if (Array.isArray(vieux) && vieux.length) {
        const s = lireJson<{ favoris?: Record<string, unknown> } & Record<string, unknown>>("e2academy.v1", {});
        const favoris = { ...(s.favoris ?? {}) };
        const t = new Date().toISOString();
        for (const ref of vieux) { const id = `fx:${ref}`; if (!favoris[id]) favoris[id] = { id, type: "fx", ref, titre: ref, on: true, ajouteLe: t, majLe: t }; }
        ecrireTexte("e2academy.v1", JSON.stringify({ version: 1, ...s, favoris }));
      }
      effacer("e2academy.fx.favoris");
    },
  },
  {
    vers: 3,
    nom: "recettes « faites » reprises comme « ✓ Testée sur ma machine »",
    faire() {
      const s = lireJson<{ faits?: Record<string, string>; testees?: Record<string, unknown> } & Record<string, unknown>>("e2academy.v1", {});
      const faits = s.faits ?? {};
      const testees = { ...(s.testees ?? {}) };
      let n = 0;
      for (const [id, date] of Object.entries(faits)) {
        if (!id.startsWith("recette:")) continue;
        const rc = id.slice(8);
        if (!testees[rc]) { testees[rc] = { id: rc, on: true, note: "", majLe: typeof date === "string" ? date : new Date().toISOString() }; n++; }
      }
      // les « faits » restent aussi tels quels : rien n'est effacé
      if (n) ecrireTexte("e2academy.v1", JSON.stringify({ version: 1, ...s, testees }));
    },
  },
];

export const etatFormat = { lu: 0, plusRecent: false, migrees: [] as string[], erreur: "" };

/** Au démarrage, avant toute lecture : met tes données au format actuel. */
export function preparerDonnees(): void {
  const lu = Number(lireTexte(CLE_FORMAT) || 0);
  const existantes = Object.keys(toutesLesCles()).filter((k) => k !== CLE_FORMAT).length > 0;
  const depart = lu || (existantes ? 1 : FORMAT);
  etatFormat.lu = depart;
  if (depart > FORMAT) { etatFormat.plusRecent = true; return; }   // données d'une version plus récente : on n'y touche pas
  if (depart < FORMAT) {
    garderCopie("avant migration vers le format " + FORMAT, toutesLesCles());
    try {
      for (const m of MIGRATIONS) if (m.vers > depart && m.vers <= FORMAT) { m.faire(); etatFormat.migrees.push(`format ${m.vers} : ${m.nom}`); }
    } catch (e) {
      etatFormat.erreur = e instanceof Error ? e.message : String(e);
      return;   // format inchangé : la migration sera retentée, la copie d'avant reste disponible
    }
  }
  ecrireTexte(CLE_FORMAT, String(FORMAT));
}

// ---------- Copies dans ce navigateur (IndexedDB) ----------
export interface Copie { id: string; le: string; raison: string; auto: boolean; taille: number; nb: number; cles: Cles }
const DB = "e2academy-sauvegardes";
let dbP: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (dbP) return dbP;
  dbP = new Promise((ok, ko) => {
    if (typeof indexedDB === "undefined") { ko(new Error("IndexedDB indisponible")); return; }
    const rq = indexedDB.open(DB, 1);
    rq.onupgradeneeded = () => { rq.result.createObjectStore("copies", { keyPath: "id" }); rq.result.createObjectStore("reglages"); };
    rq.onsuccess = () => { const d = rq.result; d.onversionchange = () => { d.close(); dbP = null; }; ok(d); };
    rq.onerror = () => { dbP = null; ko(rq.error); };
  });
  return dbP;
}
function tx<T>(store: string, mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  return db().then((d) => new Promise<T>((ok, ko) => {
    const t = d.transaction(store, mode);
    const rq = f(t.objectStore(store));
    t.oncomplete = () => ok((rq ? rq.result : undefined) as T);
    t.onerror = () => ko(t.error);
    t.onabort = () => ko(t.error);
  }));
}

export const listeCopies = (): Promise<Copie[]> =>
  tx<Copie[]>("copies", "readonly", (s) => s.getAll()).then((l) => l.sort((a, b) => b.le.localeCompare(a.le))).catch(() => []);

const MAX_AUTO = 20, MAX_POINTS = 10, HEURE = 3600e3;

/** Garde une copie nommée (avant une migration, un import, un retour en arrière). */
export function garderCopie(raison: string, cles: Cles = toutesLesCles()): Promise<void> {
  const le = new Date().toISOString();
  const c: Copie = { id: `p:${le}`, le, raison, auto: false, taille: taille(cles), nb: Object.keys(cles).length, cles };
  return tx<void>("copies", "readwrite", (s) => { s.put(c); })
    .then(() => elaguer())
    .catch(() => { /* IndexedDB indisponible : le fichier exporté reste la seule sécurité */ });
}

let derniereSignature = "";
async function copieAuto(): Promise<void> {
  const cles = toutesLesCles();
  const sig = JSON.stringify(cles);
  if (sig === derniereSignature) return;
  derniereSignature = sig;
  const le = new Date().toISOString();
  const l = (await listeCopies()).filter((c) => c.auto);
  // Dans l'heure qui suit la dernière copie, on la met à jour : la plus récente a toujours tes derniers changements.
  const id = l[0] && Date.now() - Date.parse(l[0].id.slice(2)) < HEURE ? l[0].id : `a:${le}`;
  const c: Copie = { id, le, raison: "copie automatique", auto: true, taille: taille(cles), nb: Object.keys(cles).length, cles };
  await tx<void>("copies", "readwrite", (s) => { s.put(c); }).catch(() => {});
  await elaguer();
  etat.derniereCopie = le;
  await ecrireFichierPC().catch(() => {});
  prevenir();
}
async function elaguer() {
  const l = await listeCopies();
  const trop = [...l.filter((c) => c.auto).slice(MAX_AUTO), ...l.filter((c) => !c.auto).slice(MAX_POINTS)];
  if (trop.length) await tx<void>("copies", "readwrite", (s) => { trop.forEach((c) => s.delete(c.id)); }).catch(() => {});
}

/** Remet toutes tes données comme dans cette copie (une copie de l'état actuel est gardée avant). */
export async function revenirA(c: Copie): Promise<void> {
  await garderCopie("avant le retour à la copie du " + new Date(c.le).toLocaleString("fr-FR"));
  for (const k of Object.keys(toutesLesCles())) if (!(k in c.cles)) effacer(k);
  for (const [k, v] of Object.entries(c.cles)) ecrireTexte(k, v);
  preparerDonnees();   // une copie plus ancienne repasse par les migrations
}

// ---------- Fichier de sauvegarde sur le PC (File System Access : Chrome et Edge sur ordinateur) ----------
type Handle = FileSystemFileHandle & {
  queryPermission?: (o: { mode: string }) => Promise<PermissionState>;
  requestPermission?: (o: { mode: string }) => Promise<PermissionState>;
};
type Picker = (o: unknown) => Promise<Handle>;
export const fichierPCPossible = () => typeof window !== "undefined" && typeof (window as unknown as { showSaveFilePicker?: Picker }).showSaveFilePicker === "function";

/** Contenu écrit dans le fichier du PC : un fichier d'export complet (il s'importe tel quel). Fourni par exportDonnees.ts. */
let contenuFichier: (() => Promise<string>) | null = null;
export const definirContenuFichier = (f: () => Promise<string>) => { contenuFichier = f; };

export const etat = {
  derniereCopie: "",
  fichier: null as null | { nom: string; statut: "ok" | "a-reconnecter" | "erreur"; le: string },
};
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());
export const surEtat = (f: () => void) => { abonnes.add(f); return () => { abonnes.delete(f); }; };

const lireHandle = () => tx<Handle | undefined>("reglages", "readonly", (s) => s.get("fichierPC")).catch(() => undefined);

export async function choisirFichierPC(): Promise<boolean> {
  const pick = (window as unknown as { showSaveFilePicker: Picker }).showSaveFilePicker;
  let h: Handle;
  try {
    h = await pick({ suggestedName: "craow-academy-sauvegarde.json", types: [{ description: "Sauvegarde CrAoW ACADEMY", accept: { "application/json": [".json"] } }] });
  } catch { return false; }   // fenêtre fermée
  await tx<void>("reglages", "readwrite", (s) => { s.put(h, "fichierPC"); }).catch(() => {});
  etat.fichier = { nom: h.name, statut: "ok", le: "" };
  await ecrireFichierPC(true);
  return true;
}
export async function oublierFichierPC() {
  await tx<void>("reglages", "readwrite", (s) => { s.delete("fichierPC"); }).catch(() => {});
  etat.fichier = null; prevenir();
}
/** Après une réouverture de l'app, le navigateur redemande l'autorisation d'écrire (un clic). */
export async function reconnecterFichierPC(): Promise<void> {
  const h = await lireHandle();
  if (!h?.requestPermission) return;
  if ((await h.requestPermission({ mode: "readwrite" }).catch(() => "denied")) === "granted") await ecrireFichierPC(true);
  else { etat.fichier = { nom: h.name, statut: "a-reconnecter", le: etat.fichier?.le ?? "" }; prevenir(); }
}
async function ecrireFichierPC(force = false): Promise<void> {
  if (!contenuFichier || !fichierPCPossible()) return;
  const h = await lireHandle();
  if (!h) return;
  const perm = h.queryPermission ? await h.queryPermission({ mode: "readwrite" }).catch(() => "prompt") : "granted";
  if (perm !== "granted") { etat.fichier = { nom: h.name, statut: "a-reconnecter", le: etat.fichier?.le ?? "" }; prevenir(); return; }
  try {
    const texte = await contenuFichier();
    const w = await h.createWritable();
    await w.write(texte);
    await w.close();
    etat.fichier = { nom: h.name, statut: "ok", le: new Date().toISOString() };
  } catch {
    etat.fichier = { nom: h.name, statut: "erreur", le: etat.fichier?.le ?? "" };
  }
  if (force) prevenir();
}

// ---------- Démarrage de la copie automatique ----------
let minuteur: ReturnType<typeof setTimeout> | undefined;
let demarre = false;
/** Lance la copie automatique : 2 s après chaque modification, et quand tu quittes la page. */
export function demarrerCopiesAuto(): void {
  if (demarre || typeof window === "undefined") return;
  demarre = true;
  surEcriture((cle) => {
    if (cle.startsWith(INTERNE)) return;
    clearTimeout(minuteur);
    minuteur = setTimeout(() => { void copieAuto(); }, 2000);
  });
  const vite = () => { if (minuteur !== undefined) { clearTimeout(minuteur); minuteur = undefined; void copieAuto(); } };
  window.addEventListener("pagehide", vite);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") vite(); });
  // Première copie au lancement (si quelque chose a changé depuis la dernière), puis état du fichier PC.
  setTimeout(() => {
    void listeCopies().then((l) => {
      const a = l.find((c) => c.auto);
      if (a) { etat.derniereCopie = a.le; derniereSignature = JSON.stringify(a.cles); }
      void copieAuto();
    });
    void lireHandle().then(async (h) => {
      if (!h) return;
      const perm = h.queryPermission ? await h.queryPermission({ mode: "readwrite" }).catch(() => "prompt") : "granted";
      etat.fichier = { nom: h.name, statut: perm === "granted" ? "ok" : "a-reconnecter", le: "" };
      prevenir();
    });
  }, 1500);
}

// ---------- Rappel hebdomadaire « Exporter mes données » ----------
const SEMAINE = 7 * 24 * HEURE;
export function rappelExportDu(): boolean {
  const dernier = Math.max(Date.parse(lireTexte(CLE_DERNIER_EXPORT) ?? "") || 0, Date.parse(lireTexte(CLE_RAPPEL) ?? "") || 0);
  if (Date.now() - dernier < SEMAINE) return false;
  // Le fichier du PC écrit cette semaine vaut un export.
  if (etat.fichier?.statut === "ok" && etat.fichier.le && Date.now() - Date.parse(etat.fichier.le) < SEMAINE) return false;
  return Object.keys(toutesLesCles()).some((k) => k !== CLE_FORMAT);
}
export const noterExport = () => { ecrireTexte(CLE_DERNIER_EXPORT, new Date().toISOString()); prevenir(); };
export const reporterRappel = () => { ecrireTexte(CLE_RAPPEL, new Date().toISOString()); prevenir(); };

// ---------- Place utilisée ----------
export interface Place { donnees: number; limiteDonnees: number; total?: number; quota?: number; persistant?: boolean }
/** `donnees` = tes données (localStorage, limite d'environ 5 Mo) ; `total` = tout le site, enregistrements audio compris. */
export async function placeUtilisee(): Promise<Place> {
  let donnees = 0;
  for (const k of clesApp()) donnees += (k.length + (lireTexte(k) ?? "").length) * 2;
  const p: Place = { donnees, limiteDonnees: 5 * 1024 * 1024 };
  try {
    const e = await navigator.storage?.estimate?.();
    if (e) { p.total = e.usage; p.quota = e.quota; }
    p.persistant = await navigator.storage?.persisted?.();
  } catch { /* */ }
  return p;
}
/** Demande au navigateur de ne pas effacer les données du site quand le disque se remplit. */
export async function demanderStockagePersistant(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false; } catch { return false; }
}
export const enKo = (o: number) => (o >= 1024 ** 3 ? `${(o / 1024 ** 3).toFixed(1).replace(".", ",")} Go` : o >= 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);
