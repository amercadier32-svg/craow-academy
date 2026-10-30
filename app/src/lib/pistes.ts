// Voix des aperçus pour les grilles et les morceaux (partagé par les modules Grilles, Morceau, Favoris
// et les aperçus). Séparé des pages pour qu'ouvrir Recettes ne charge pas tout le module Morceau.
import { lireJson } from "./stockage";
import type { Grille } from "../content/grilles";
import { KNOBS_APERCU, recetteParId, type Recette } from "../content/recettes";
import { ETAPES, type EtapeId, type Section } from "../content/morceau";
import type { Style } from "../content/styles";
import { gammeByN, keyByEn, normKey } from "./music";
import type { Mode, Pas, Piste, SeqState } from "./seq";
import type { Ton } from "../components/SeqPlayer";
import { val } from "../components/Machine";

const rcById = recetteParId;   // table commune (content/recettes.ts)

export interface GData { key: string; scale: number; bpm: number; pistes: { mesures: Pas[][]; muet: boolean }[]; base?: Ton }
export const origineDe = (g: Grille): GData => ({ key: g.key, scale: g.scale, bpm: g.bpm, pistes: g.pistes.map((p) => ({ mesures: p.mesures.map((m) => [...m]), muet: false })) });
export const same = (a: GData, b: GData) => JSON.stringify(a) === JSON.stringify(b);

export function load(id: string, g: Grille): GData {
  const d = lireJson<GData | null>(`e2academy.grille.${id}`, null);
  if (d?.pistes?.length === g.pistes.length) return { ...d, key: normKey(d.key), base: d.base && { ...d.base, key: normKey(d.base.key) } };
  return origineDe(g);
}

export const knobsDe = (rc: Recette) => {
  const k: Record<string, number> = {};
  for (const x of rc.reglages) if (KNOBS_APERCU.includes(x.param) && /^\d+$/.test(x.valeur)) k[x.param] = Number(x.valeur);
  return k;
};

/** Voix de l'aperçu pour une partie qui reprend une recette. */
export function pisteDe(rc: Recette, mesures: Pas[][], muet: boolean, range: (id: string) => { min: number; max: number }): Piste {
  const knobs: Record<string, number> = {};
  for (const [k, v] of Object.entries(knobsDe(rc))) { const r = range(k); knobs[k] = (v - r.min) / Math.max(1, r.max - r.min); }
  return {
    son: rc.apercu.son, octave: rc.apercu.octave, knobs,
    ifx: val(rc.reglages, "ifx.on") === "ON" ? val(rc.reglages, "ifx.type")?.replace(/^\d+ /, "") : undefined,
    mod: val(rc.reglages, "mod.type")?.replace(/^\d+ /, ""),
    filtre: val(rc.reglages, "filter.hpf") ? "hpf" : val(rc.reglages, "filter.bpf") ? "bpf" : "lpf",
    mesures, muet,
  };
}


// ---------- Morceau ----------
export interface Couche {
  uid: string;
  etape: EtapeId;
  recette: string;
  mesures: Pas[][];
  knobs: Record<string, number>;   // valeurs d'écran (0…127 tant que la plage n'est pas relevée)
  octave: number;                  // octave de l'aperçu
  muet?: boolean;
  solo?: boolean;
}
export interface Morceau {
  v: 1;
  nom: string;
  style: Style;
  bpm: number;
  key: string;
  scale: number;
  couches: Couche[];
  passees: EtapeId[];
  structure?: Section[];
  majLe: string;
}

export const ordre = (e: EtapeId) => ETAPES.findIndex((x) => x.id === e);

/** Les parties de l'E2 : une couche = une partie, dans l'ordre des étapes (Part 1 = kick…). */
export const triees = (cs: Couche[]) => [...cs].sort((a, b) => ordre(a.etape) - ordre(b.etape));

// Potards modifiables dans l'assistant (ceux que l'aperçu imite).
export const POTARDS = ["filter.cutoff", "filter.resonance", "filter.egint", "amp.attack", "amp.decay", "amp.level", "osc.edit", "osc.glide"];

type Range = (id: string) => { min: number; max: number };
/** Voix de l'aperçu pour une couche : le son de sa recette, ses notes, ses potards et son octave. */
export function pisteCouche(c: Couche, muet: boolean, range: Range): Piste {
  const rc = rcById.get(c.recette)!;
  const knobs: Record<string, number> = {};
  for (const [k, v] of Object.entries(c.knobs)) { const r = range(k); knobs[k] = (v - r.min) / Math.max(1, r.max - r.min); }
  return { ...pisteDe(rc, c.mesures, muet, range), knobs, octave: c.octave };
}
/** État du lecteur pour tout le morceau ; `joue(c)` dit si la couche sonne. */
export function etatMix(m: Morceau, range: Range, joue: (c: Couche, i: number) => boolean, mode: Mode): SeqState | null {
  const cs = triees(m.couches);
  if (!cs.length) return null;
  const ps = cs.map((c, i) => pisteCouche(c, !joue(c, i), range));
  return { ...ps[0], keySemi: keyByEn(m.key).semi, gamme: gammeByN.get(m.scale)!, bpm: m.bpm, kickRepere: false, mode, range: "all", pistes: ps };
}
