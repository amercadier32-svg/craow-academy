// « Exporter mes données » / « Importer » : un seul fichier avec tout ce que tu as fait dans l'app
// (relevés, notes, favoris, sessions, recettes gardées, presets, morceaux, grilles modifiées, réglages).
// Les anciens fichiers « Mes relevés » s'importent toujours : ils passent par les migrations de lib/donnees.ts.
import { exportReleves, importReleves, type RelevesFile } from "./store";
import { CLE_FORMAT, FORMAT, definirContenuFichier, demarrerCopiesAuto, garderCopie, noterExport, toutesLesCles, type Cles } from "./donnees";
import { lireTexte, ecrireTexte } from "./stockage";
import { telecharger } from "./telecharger";

const CLE_STORE = "e2academy.v1";
export type FichierDonnees = Omit<RelevesFile, "type"> & { type: "donnees"; format: number; cles: Cles };

let noms: ((id: string) => string | undefined) | null = null;
async function chargerNoms() {
  if (!noms) { const { paramById } = await import("./data"); noms = (id) => paramById.get(id)?.nom; }
  return noms;
}

export async function fichierDonnees(): Promise<FichierDonnees> {
  const r = exportReleves(await chargerNoms());
  const cles = toutesLesCles();
  delete cles[CLE_STORE]; delete cles[CLE_FORMAT];   // déjà dans le fichier, champ par champ
  return { ...r, type: "donnees", format: FORMAT, cles };
}

export async function exporterDonnees(): Promise<boolean> {
  const d = await fichierDonnees();
  const ok = await telecharger(`craow-academy-donnees-${d.exporteLe.slice(0, 10)}.json`, JSON.stringify(d, null, 1), "application/json");
  if (ok) noterExport();
  return ok;
}

/** Met un fichier exporté (même ancien) au format actuel. */
function migrerFichier(x: unknown): FichierDonnees {
  const f = x as Omit<Partial<FichierDonnees>, "type"> & { type?: string };
  if (!f || typeof f !== "object" || (f.type !== "releves" && f.type !== "donnees")) throw new Error("Ce fichier n'est pas un export de CrAoW ACADEMY.");
  const format = Number(f.format ?? 1);
  if (format > FORMAT) throw new Error("Ce fichier vient d'une version plus récente de CrAoW ACADEMY : mets d'abord l'app à jour sur cet appareil.");
  const cles: Cles = { ...(f.cles ?? {}) };
  const favoris = { ...(f.favoris ?? {}) };
  // Format 1 → 2 : les anciens favoris du Guide des effets deviennent des favoris normaux.
  if (cles["e2academy.fx.favoris"]) {
    try {
      const t = f.exporteLe ?? new Date().toISOString();
      for (const ref of JSON.parse(cles["e2academy.fx.favoris"]) as string[]) { const id = `fx:${ref}`; if (!favoris[id]) favoris[id] = { id, type: "fx", ref, titre: ref, on: true, ajouteLe: t, majLe: t }; }
    } catch { /* */ }
    delete cles["e2academy.fx.favoris"];
  }
  return { ...(f as FichierDonnees), type: "donnees", format: FORMAT, plages: f.plages ?? {}, observations: f.observations ?? {}, favoris, cles };
}

type Date_ = { id?: string; majLe?: string };
const estListeAvecId = (v: unknown): v is Date_[] => Array.isArray(v) && v.every((x) => x && typeof x === "object" && typeof (x as Date_).id === "string");

/** Fusionne les autres données (morceaux, presets, grilles…). Le plus récent gagne quand on peut le savoir. */
function fusionnerCles(cles: Cles): number {
  let n = 0;
  for (const [k, v] of Object.entries(cles)) {
    if (!k.startsWith("e2academy.") || k.startsWith("e2academy.sauvegarde.") || k === CLE_STORE || k === CLE_FORMAT || typeof v !== "string") continue;
    const ici = lireTexte(k);
    if (ici === v) continue;
    let garde = v;
    if (ici != null) {
      try {
        const a = JSON.parse(ici), b = JSON.parse(v);
        if (estListeAvecId(a) && estListeAvecId(b)) {
          // Liste (ex. morceaux gardés) : on réunit les deux, la version la plus récente de chaque élément gagne.
          const m = new Map(a.map((x) => [x.id!, x]));
          for (const x of b) { const y = m.get(x.id!); if (!y || (x.majLe ?? "") > (y.majLe ?? "")) m.set(x.id!, x); }
          garde = JSON.stringify([...m.values()]);
        } else if (a && b && typeof a === "object" && typeof b === "object" && "majLe" in a && "majLe" in b && (a.majLe ?? "") >= (b.majLe ?? "")) {
          continue;   // la version d'ici est plus récente
        }
      } catch { /* texte simple : le fichier gagne */ }
    }
    if (garde !== ici && ecrireTexte(k, garde)) n++;
  }
  return n;
}

export async function importerDonnees(json: unknown) {
  const f = migrerFichier(json);
  await garderCopie("avant l'import d'un fichier");
  const r = importReleves({ ...f, type: "releves" });
  const autres = fusionnerCles(f.cles);
  return { ...r, autres };
}

// La copie automatique (et le fichier du PC) démarre avec l'app.
definirContenuFichier(async () => JSON.stringify(await fichierDonnees(), null, 1));
demarrerCopiesAuto();
