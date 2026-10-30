// Sauvegarde locale (localStorage) : observations du Carnet et exercices faits.
// Tout passe par ici pour que le futur module Carnet relise les mêmes données.
import { useSyncExternalStore } from "react";
import { ecrireJson, lireTexte } from "./stockage";
import { preparerDonnees } from "./donnees";
import relevesJson from "@data/electribe2/releves.json";
import type { Recette } from "../content/recettes";
import type { Defi } from "../content/defis";

export interface Observation {
  id: string;          // ex. "param:filter.cutoff", "exercise:ex.filter.types"
  titre: string;       // ce que l'observation complète (affiché dans le Carnet)
  texte: string;
  majLe: string;       // date ISO
}

interface State {
  version: 1;
  observations: Record<string, Observation>;
  faits: Record<string, string>; // id d'exercice -> date ISO
  plages: Record<string, Plage>; // id de paramètre -> plage lue sur l'écran de ta machine
  favoris: Record<string, Favori>; // « recette:kick-tekno », « fx:mfx-4 »… ; on = false garde la date du retrait (pour l'import)
  recettesGenerees: Record<string, RecetteGeneree>; // recettes 🎲 gardées (badge « Générée »)
  etatsRecettes: Record<string, EtatRecette>;       // corbeille et suppressions définitives (recettes de l'app ou générées)
  stylesPrefs?: StylesPrefs;                         // « Gérer les styles » : ordre, couleurs, styles masqués
  sessions: Record<string, SessionFaite>;            // module Session : sessions chronométrées terminées
  defisPerso: Record<string, DefiPerso>;             // module Session : défis créés par Alex
  analysesRef: Record<string, AnalyseRef>;           // module Analyser une référence (sans l'audio)
  testees: Record<string, Testee>;                   // « ✓ Testée sur ma machine » sur les recettes (id de recette)
}

/** Recette refaite sur l'E2 et qui sonne bien, avec une note facultative (ce que j'ai dû changer). on = false garde la date (pour l'import). */
export interface Testee { id: string; on: boolean; note: string; majLe: string }

/** Une zone choisie dans une référence (en secondes). */
export interface ZoneRef { id: string; nom: string; debut: number; fin: number }
/** Une analyse de référence gardée. L'audio du morceau n'est jamais copié : il faut recharger le fichier pour réécouter. */
export interface AnalyseRef {
  id: string;
  nom: string;            // nom du morceau
  fichier: string;        // nom du fichier chargé
  duree: number;          // secondes
  notes: string;
  bpm?: number; bpmConfiance?: number;
  key?: string; mineur?: boolean; keyConfiance?: number; gammes?: number[];
  lufs?: number | null;
  zones: ZoneRef[];
  /** Résumé du son analysé dans chaque zone (note E2, longueur…), par id de zone. */
  sons?: Record<string, { type: string; midiBase: number | null; decayMs: number; attaque: string; motDistorsion: string; sub: number }>;
  /** Spectre moyen du morceau (dB par bande de 1/6 d'octave), pour le comparer en direct dans le Visualiseur. */
  spectre?: number[];
  recettes: Recette[];    // recettes proposées (celles gardées sont aussi dans Recettes)
  le: string;
  supprimee?: boolean;
  majLe: string;
}

/** Une session chronométrée terminée. L'enregistrement audio reste dans ce navigateur (IndexedDB, clé « session:<id> »). */
export interface SessionFaite {
  id: string; defiId: string; titre: string; style?: string;
  duree: number;          // minutes prévues
  dureeReelle: number;    // secondes réellement passées (pauses non comptées)
  le: string;             // date ISO de la fin
  note: number;           // 0 à 5
  statut: "finie" | "a-reprendre";
  pattern: string;        // numéro du motif sur l'E2 (1 à 250)
  marche: string; difficile: string; referais: string;
  audioNom?: string;
  machine?: string;       // machine de la session (absent = electribe2)
  supprimee?: boolean;
  majLe: string;
}
/** Défi créé par Alex. `defi` = null une fois supprimé (on garde la trace pour l'import). */
export interface DefiPerso { id: string; defi: Defi | null; majLe: string }

/** Réglages de « Gérer les styles ». Masquer un style le retire des sélecteurs ; ses recettes restent dans l'app. */
export interface StylesPrefs { ordre: string[]; masques: string[]; couleurs: Record<string, string>; majLe: string }

/** Recette créée par le générateur et gardée. `recette` = null une fois supprimée pour de bon (on garde la trace pour l'import). */
export interface RecetteGeneree { id: string; recette: Recette | null; creeLe: string; majLe: string }
export type Etat = "active" | "corbeille" | "supprimee";
export interface EtatRecette { id: string; etat: Etat; majLe: string; titre?: string }

export type TypeFavori = "recette" | "grille" | "fx" | "gamme" | "lex" | "master" | "morceau" | "defi" | "reference" | "enregistrement";
export interface Favori { id: string; type: TypeFavori; ref: string; titre: string; on: boolean; ajouteLe: string; majLe: string; data?: unknown }

export interface Plage { min: string; max: string; majLe: string }

const KEY = "e2academy.v1";
const empty: State = { version: 1, observations: {}, faits: {}, plages: {}, favoris: {}, recettesGenerees: {}, etatsRecettes: {}, sessions: {}, defisPerso: {}, analysesRef: {}, testees: {} };

type Dated = { majLe: string };

/** Garde, pour chaque id, la version la plus récente (majLe). */
function mergeNewest<T extends Dated>(a: Record<string, T>, b: Record<string, T>): { merged: Record<string, T>; pris: number } {
  const merged = { ...a };
  let pris = 0;
  for (const [id, v] of Object.entries(b)) {
    if (!merged[id] || (v.majLe ?? "") > (merged[id].majLe ?? "")) { merged[id] = v; pris++; }
  }
  return { merged, pris };
}

// Relevés intégrés dans data/electribe2/releves.json : ils font partie de l'app, même dans un navigateur vide.
const base = relevesJson as unknown as { plages: Record<string, Plage>; observations: Record<string, Observation> };

function load(): State {
  let s: State = empty;
  const raw = lireTexte(KEY);
  if (raw) { try { s = { ...empty, ...(JSON.parse(raw) as State) }; } catch { /* stockage illisible : on repart des relevés intégrés (la copie automatique d'avant reste dans « Mes données ») */ } }
  s = { ...s, favoris: { ...(s.favoris ?? {}) }, recettesGenerees: { ...(s.recettesGenerees ?? {}) }, etatsRecettes: { ...(s.etatsRecettes ?? {}) }, sessions: { ...(s.sessions ?? {}) }, defisPerso: { ...(s.defisPerso ?? {}) }, analysesRef: { ...(s.analysesRef ?? {}) }, testees: { ...(s.testees ?? {}) } };
  return {
    ...s,
    plages: mergeNewest(base.plages ?? {}, s.plages).merged,
    observations: mergeNewest(base.observations ?? {}, s.observations).merged,
  };
}

// Avant la première lecture : tes données passent au format actuel de l'app (lib/donnees.ts).
preparerDonnees();
let state: State = load();
const listeners = new Set<() => void>();

function save(next: State) {
  state = next;
  ecrireJson(KEY, next);   // stockage indisponible (navigation privée...) : on garde en mémoire
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function setObservation(id: string, titre: string, texte: string) {
  const observations = { ...state.observations };
  if (texte.trim() === "") delete observations[id];
  else observations[id] = { id, titre, texte, majLe: new Date().toISOString() };
  save({ ...state, observations });
}

export function setPlage(paramId: string, champ: "min" | "max", valeur: string) {
  const plages = { ...state.plages };
  const cur = plages[paramId] ?? { min: "", max: "", majLe: "" };
  const next = { ...cur, [champ]: valeur.trim(), majLe: new Date().toISOString() };
  if (!next.min && !next.max) delete plages[paramId];
  else plages[paramId] = next;
  save({ ...state, plages });
}

export function toggleFait(id: string) {
  const faits = { ...state.faits };
  if (faits[id]) delete faits[id];
  else faits[id] = new Date().toISOString();
  save({ ...state, faits });
}

// ---------- Favoris ----------
export const idFavori = (type: TypeFavori, ref: string) => `${type}:${ref}`;
export const estFavori = (st: State, id: string) => Boolean(st.favoris[id]?.on);

/** Ajoute ou enlève un favori. `data` garde une copie (ex. un morceau construit). */
export function basculerFavori(type: TypeFavori, ref: string, titre: string, data?: unknown) {
  const id = idFavori(type, ref);
  const t = new Date().toISOString();
  const cur = state.favoris[id];
  const on = !cur?.on;
  const favoris = { ...state.favoris, [id]: { id, type, ref, titre, on, ajouteLe: on ? t : cur?.ajouteLe ?? t, majLe: t, data: on ? data : undefined } };
  save({ ...state, favoris });
}

/** Les favoris actifs, du plus récent au plus ancien. */
export const listeFavoris = (st: State) => Object.values(st.favoris).filter((f) => f.on).sort((a, b) => b.ajouteLe.localeCompare(a.ajouteLe));

// ---------- Recettes générées et corbeille ----------
export const getState = () => state;
const maintenant = () => new Date().toISOString();

/** Garde une recette générée : elle rejoint sa sous-catégorie avec le badge « Générée ». */
export function garderRecette(rc: Recette) {
  const t = maintenant();
  save({ ...state, recettesGenerees: { ...state.recettesGenerees, [rc.id]: { id: rc.id, recette: rc, creeLe: t, majLe: t } } });
}

/** Les recettes générées gardées (et pas supprimées pour de bon). */
export const listeGenerees = (st: State) => Object.values(st.recettesGenerees).filter((g) => g.recette && st.etatsRecettes[g.id]?.etat !== "supprimee").map((g) => g.recette!);

export const etatDe = (st: State, id: string): Etat => st.etatsRecettes[id]?.etat ?? "active";

function setEtat(id: string, etat: Etat, titre?: string) {
  const etatsRecettes = { ...state.etatsRecettes, [id]: { id, etat, titre, majLe: maintenant() } };
  let recettesGenerees = state.recettesGenerees;
  if (etat === "supprimee" && recettesGenerees[id]) recettesGenerees = { ...recettesGenerees, [id]: { ...recettesGenerees[id], recette: null, majLe: maintenant() } };
  save({ ...state, etatsRecettes, recettesGenerees });
}
export const mettreALaCorbeille = (id: string, titre: string) => setEtat(id, "corbeille", titre);
export const restaurerRecette = (id: string, titre?: string) => setEtat(id, "active", titre);
export const supprimerDefinitivement = (id: string, titre?: string) => setEtat(id, "supprimee", titre);
export function viderCorbeille() {
  const t = maintenant();
  const etatsRecettes = { ...state.etatsRecettes };
  const recettesGenerees = { ...state.recettesGenerees };
  for (const e of Object.values(etatsRecettes)) if (e.etat === "corbeille") {
    etatsRecettes[e.id] = { ...e, etat: "supprimee", majLe: t };
    if (recettesGenerees[e.id]) recettesGenerees[e.id] = { ...recettesGenerees[e.id], recette: null, majLe: t };
  }
  save({ ...state, etatsRecettes, recettesGenerees });
}

/** Plage complète (minimum et maximum notés) : remplace « à vérifier sur l'écran » partout. */
export const plageComplete = (p?: Plage) => Boolean(p?.min && p?.max);

// ---------- Gérer les styles ----------
export function setStylesPrefs(p: Partial<StylesPrefs> | null) {
  const cur = state.stylesPrefs ?? { ordre: [], masques: [], couleurs: {}, majLe: "" };
  save({ ...state, stylesPrefs: p === null ? { ordre: [], masques: [], couleurs: {}, majLe: maintenant() } : { ...cur, ...p, majLe: maintenant() } });
}

// ---------- Session : sessions terminées et défis perso ----------
export function enregistrerSession(x: SessionFaite) {
  save({ ...state, sessions: { ...state.sessions, [x.id]: { ...x, majLe: maintenant() } } });
}
export function supprimerSession(id: string) {
  const cur = state.sessions[id];
  if (cur) save({ ...state, sessions: { ...state.sessions, [id]: { ...cur, supprimee: true, majLe: maintenant() } } });
}
export const listeSessions = (st: State) => Object.values(st.sessions).filter((x) => !x.supprimee).sort((a, b) => b.le.localeCompare(a.le));
export function garderDefiPerso(d: Defi) {
  save({ ...state, defisPerso: { ...state.defisPerso, [d.id]: { id: d.id, defi: { ...d, perso: true }, majLe: maintenant() } } });
}
export function supprimerDefiPerso(id: string) {
  save({ ...state, defisPerso: { ...state.defisPerso, [id]: { id, defi: null, majLe: maintenant() } } });
}
export const listeDefisPerso = (st: State) => Object.values(st.defisPerso).filter((x) => x.defi).map((x) => x.defi!);

// ---------- Recettes testées sur ma machine ----------
export const estTestee = (st: State, id: string) => Boolean(st.testees?.[id]?.on);
export function setTestee(id: string, x: { on?: boolean; note?: string }) {
  const cur = state.testees[id] ?? { id, on: false, note: "", majLe: "" };
  save({ ...state, testees: { ...state.testees, [id]: { ...cur, ...x, id, majLe: maintenant() } } });
}

// ---------- Analyser une référence ----------
export function garderAnalyse(a: AnalyseRef) {
  save({ ...state, analysesRef: { ...state.analysesRef, [a.id]: { ...a, majLe: maintenant() } } });
}
export function supprimerAnalyse(id: string) {
  const cur = state.analysesRef[id];
  if (cur) save({ ...state, analysesRef: { ...state.analysesRef, [id]: { ...cur, supprimee: true, majLe: maintenant() } } });
}
export const listeAnalyses = (st: State) => Object.values(st.analysesRef ?? {}).filter((x) => !x.supprimee).sort((a, b) => b.le.localeCompare(a.le));

// ---------- Exporter / importer mes relevés ----------
export interface RelevesFile {
  app: "CrAoW ACADEMY"; type: "releves"; version: 1; exporteLe: string;
  plages: Record<string, Plage & { nom?: string }>;
  observations: Record<string, Observation>;
  favoris?: Record<string, Favori>;
  recettesGenerees?: Record<string, RecetteGeneree>;
  etatsRecettes?: Record<string, EtatRecette>;
  stylesPrefs?: StylesPrefs;
  sessions?: Record<string, SessionFaite>;
  defisPerso?: Record<string, DefiPerso>;
  analysesRef?: Record<string, AnalyseRef>;
  testees?: Record<string, Testee>;
  faits?: Record<string, string>;
}

export function exportReleves(noms: (id: string) => string | undefined): RelevesFile {
  const plages: RelevesFile["plages"] = {};
  for (const [id, p] of Object.entries(state.plages)) plages[id] = { nom: noms(id), ...p };
  return { app: "CrAoW ACADEMY", type: "releves", version: 1, exporteLe: new Date().toISOString(), plages, observations: state.observations, favoris: state.favoris, recettesGenerees: state.recettesGenerees, etatsRecettes: state.etatsRecettes, stylesPrefs: state.stylesPrefs, sessions: state.sessions, defisPerso: state.defisPerso, analysesRef: state.analysesRef, testees: state.testees, faits: state.faits };
}

/** Fusionne un fichier exporté : la valeur la plus récente gagne. */
export function importReleves(file: unknown): { plages: number; observations: number; favoris: number; recettes: number; sessions: number; analyses: number; testees: number } {
  const f = file as Partial<RelevesFile>;
  if (!f || (f.type !== "releves" && (f.type as unknown as string) !== "donnees") || typeof f.plages !== "object") throw new Error("Ce fichier n'est pas un export « Mes relevés » de CrAoW ACADEMY.");
  const plIn: Record<string, Plage> = {};
  for (const [id, p] of Object.entries(f.plages ?? {})) plIn[id] = { min: String(p.min ?? "").trim(), max: String(p.max ?? "").trim(), majLe: p.majLe ?? "" };
  const obsIn: Record<string, Observation> = {};
  for (const [id, o] of Object.entries(f.observations ?? {})) if (o?.texte?.trim()) obsIn[id] = { id, titre: o.titre ?? id, texte: o.texte, majLe: o.majLe ?? "" };
  const pl = mergeNewest(state.plages, plIn);
  const ob = mergeNewest(state.observations, obsIn);
  const favIn: Record<string, Favori> = {};
  for (const [id, x] of Object.entries(f.favoris ?? {})) if (x && x.type && x.ref) favIn[id] = { ...x, id, on: Boolean(x.on), ajouteLe: x.ajouteLe ?? x.majLe ?? "", majLe: x.majLe ?? "" };
  const fa = mergeNewest(state.favoris, favIn);
  const genIn: Record<string, RecetteGeneree> = {};
  for (const [id, x] of Object.entries(f.recettesGenerees ?? {})) if (x && (x.recette === null || (x.recette?.id === id && Array.isArray(x.recette.mesures)))) genIn[id] = { id, recette: x.recette, creeLe: x.creeLe ?? x.majLe ?? "", majLe: x.majLe ?? "" };
  const etIn: Record<string, EtatRecette> = {};
  for (const [id, x] of Object.entries(f.etatsRecettes ?? {})) if (x && ["active", "corbeille", "supprimee"].includes(x.etat)) etIn[id] = { id, etat: x.etat, titre: x.titre, majLe: x.majLe ?? "" };
  const ge = mergeNewest(state.recettesGenerees, genIn);
  const et = mergeNewest(state.etatsRecettes, etIn);
  const sp = f.stylesPrefs && Array.isArray(f.stylesPrefs.ordre) && (f.stylesPrefs.majLe ?? "") > (state.stylesPrefs?.majLe ?? "") ? f.stylesPrefs : state.stylesPrefs;
  const seIn: Record<string, SessionFaite> = {};
  for (const [id, x] of Object.entries(f.sessions ?? {})) if (x && x.defiId && x.le) seIn[id] = { ...x, id, majLe: x.majLe ?? x.le };
  const dpIn: Record<string, DefiPerso> = {};
  for (const [id, x] of Object.entries(f.defisPerso ?? {})) if (x && (x.defi === null || (x.defi?.id === id && Array.isArray(x.defi.contraintes)))) dpIn[id] = { id, defi: x.defi, majLe: x.majLe ?? "" };
  const se = mergeNewest(state.sessions, seIn);
  const dp = mergeNewest(state.defisPerso, dpIn);
  const anIn: Record<string, AnalyseRef> = {};
  for (const [id, x] of Object.entries(f.analysesRef ?? {})) if (x && x.le && Array.isArray(x.zones)) anIn[id] = { ...x, id, recettes: Array.isArray(x.recettes) ? x.recettes : [], majLe: x.majLe ?? x.le };
  const an = mergeNewest(state.analysesRef, anIn);
  const teIn: Record<string, Testee> = {};
  for (const [id, x] of Object.entries(f.testees ?? {})) if (x && typeof x === "object") teIn[id] = { id, on: Boolean(x.on), note: String(x.note ?? ""), majLe: x.majLe ?? "" };
  const te = mergeNewest(state.testees, teIn);
  // exercices et leçons faits : on réunit les deux (la date la plus ancienne reste)
  const faits = { ...state.faits };
  for (const [id, d] of Object.entries(f.faits ?? {})) if (typeof d === "string" && !faits[id]) faits[id] = d;
  save({ ...state, plages: pl.merged, observations: ob.merged, favoris: fa.merged, recettesGenerees: ge.merged, etatsRecettes: et.merged, stylesPrefs: sp, sessions: se.merged, defisPerso: dp.merged, analysesRef: an.merged, testees: te.merged, faits });
  return { plages: pl.pris, observations: ob.pris, favoris: Object.values(favIn).filter((x) => x.on && fa.merged[x.id] === x).length, recettes: ge.pris + et.pris, sessions: se.pris + dp.pris, analyses: an.pris, testees: te.pris };
}

// Changement d'onglet : relit le stockage (deux onglets ouverts).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}
