// Les styles musicaux de l'app (Tribe, Acid tribe, Mentale, Hardtek, Tekno, Raggatek, Dub tekno).
// Les fiches sont dans data/electribe2/styles.json (badge « Pratique ») : BPM, caractère, kick / basse / mélodie typiques,
// gammes conseillées, effets typiques, structure, différences avec les styles proches, et le profil du générateur 🎲.
// Ordre, couleur et styles masqués : réglés par Alex dans « Gérer les styles » (lib/store.ts, stylesPrefs).
import stylesJson from "@data/electribe2/styles.json";
import { useStore, type StylesPrefs } from "../lib/store";

export type Style = "tribe" | "acid-tribe" | "mentale" | "hardtek" | "tekno" | "raggatek" | "dub-tekno";
/** Les 3 styles d'origine : Construire un morceau, Grilles et Structure ne connaissent encore qu'eux (étapes suivantes). */
export type StyleBase = "tekno" | "tribe" | "mentale";

export interface ProfilKick {
  osc: number[]; decay: [number, number]; level: [number, number];
  ifx: { n: number; edit: [number, number] }[];
  filtre: { p: number; lpf: string[]; cutoff: [number, number]; reso: [number, number] };
  mfx: { p: number; types: number[] };
  relances: string[]; variations: string[];
}
export interface FicheStyle {
  id: Style;
  nom: string;
  couleur: string;
  bpm: { min: number; max: number; defaut: number };
  caractere: [string, string];
  kick: string; basse: string; melodie: string;
  gammes: { n: number; pourquoi: string }[];
  effets: { ifx: number[]; mfx: number[]; texte: string };
  structure: string;
  differences: { avec: Style; texte: string }[];
  /** `parents` : styles dont le générateur reprend les recettes quand ce style n'en a pas dans une sous-catégorie. */
  generateur: { parents: Style[]; mots: string[]; kick: ProfilKick };
}

export const SOURCE_STYLES: string = (stylesJson as { source: string }).source;
export const FICHES = (stylesJson as unknown as { styles: FicheStyle[] }).styles;
/** Ordre d'origine : Tribe, Acid tribe, Mentale, Hardtek, Tekno, Raggatek, Dub tekno. */
export const STYLE_IDS = FICHES.map((s) => s.id);
export const FICHE = Object.fromEntries(FICHES.map((s) => [s.id, s])) as Record<Style, FicheStyle>;
export const STYLE_NOM = Object.fromEntries(FICHES.map((s) => [s.id, s.nom])) as Record<Style, string>;
export const estStyle = (x: string): x is Style => x in FICHE;

export interface StyleVu extends FicheStyle { masque: boolean; couleurDefaut: string }

/** Tous les styles dans l'ordre choisi, avec leur couleur (choisie ou d'origine) et s'ils sont masqués. */
export function stylesRanges(p?: StylesPrefs): StyleVu[] {
  const ordre = [...(p?.ordre ?? []).filter(estStyle), ...STYLE_IDS].filter((x, i, a) => a.indexOf(x) === i);
  return ordre.map((id) => ({ ...FICHE[id], couleurDefaut: FICHE[id].couleur, couleur: p?.couleurs?.[id] ?? FICHE[id].couleur, masque: Boolean(p?.masques?.includes(id)) }));
}

/** Styles dans l'ordre choisi. `visibles` = sans les styles masqués (ce que montrent les sélecteurs). */
export function useStyles() {
  const st = useStore();
  const tous = stylesRanges(st.stylesPrefs);
  return { tous, visibles: tous.filter((s) => !s.masque), masques: new Set(tous.filter((s) => s.masque).map((s) => s.id)) };
}

/** Styles où un effet est utile : ceux de sa fiche d'effet, plus ceux dont la fiche de style le cite (IFX ou MFX). */
export function stylesEffet(kind: string, n: number, base: readonly string[]): Style[] {
  const s = new Set(base.filter(estStyle));
  for (const f of FICHES) if ((kind === "ifx" && f.effets.ifx.includes(n)) || (kind === "mfx" && f.effets.mfx.includes(n))) s.add(f.id);
  return STYLE_IDS.filter((x) => s.has(x));
}

/** Styles pour lesquels une gamme est conseillée : repères de la page Gammes, plus les gammes des fiches de style. */
export function stylesGamme(n: number, base: readonly string[] = []): Style[] {
  const s = new Set(base.filter(estStyle));
  for (const f of FICHES) if (f.gammes.some((g) => g.n === n)) s.add(f.id);
  return STYLE_IDS.filter((x) => s.has(x));
}

/** Range une liste de styles dans l'ordre choisi par Alex et retire les styles masqués. */
export function rangerVisibles(liste: readonly Style[], tous: StyleVu[]): Style[] {
  return tous.filter((s) => !s.masque && liste.includes(s.id)).map((s) => s.id);
}
