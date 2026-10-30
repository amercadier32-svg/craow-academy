// Mode « Simple » du Mastering : 6 gros curseurs qui écrivent dans la même chaîne que le mode Avancé.
// Il n'y a qu'un seul jeu de réglages : passer d'un mode à l'autre ne change pas le son.
import { copie, reglagesNeutres, type Reglages } from "./masterDsp";

export type CleSimple = "graves" | "mediums" | "aigus" | "comp" | "sat" | "volume";
export type ValeursSimples = Record<CleSimple, number>;

export interface InfoCurseur { cle: CleSimple; nom: string; min: number; max: number; pas: number; unite: string; couleur: string }

export const CURSEURS: InfoCurseur[] = [
  { cle: "graves", nom: "Graves", min: -12, max: 12, pas: 0.5, unite: "dB", couleur: "#9b6bff" },
  { cle: "mediums", nom: "Médiums", min: -12, max: 12, pas: 0.5, unite: "dB", couleur: "#3fd6d0" },
  { cle: "aigus", nom: "Aigus", min: -12, max: 12, pas: 0.5, unite: "dB", couleur: "#ffd84d" },
  { cle: "comp", nom: "Compression", min: 0, max: 100, pas: 1, unite: "%", couleur: "#ffb020" },
  { cle: "sat", nom: "Saturation", min: 0, max: 100, pas: 1, unite: "%", couleur: "#ff6a3d" },
  { cle: "volume", nom: "Volume", min: -12, max: 12, pas: 0.5, unite: "dB", couleur: "#e8484e" },
];

/** Bandes de l'EQ utilisées par les curseurs : 1 = plateau grave, 3 = cloche médium, 5 = plateau aigu. */
export const BANDE_SIMPLE = { graves: 1, mediums: 3, aigus: 5 } as const;
const DEFAUT_BANDE = { 1: { type: "ls", f: 80, q: 0.71 }, 3: { type: "pk", f: 1000, q: 0.7 }, 5: { type: "hs", f: 8000, q: 0.71 } } as const;

export const FREQ_PASSE_HAUT = 30;
export const PLAFOND_PROTECTION = -1;

const r1 = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
const borne = (x: number, mn: number, mx: number) => Math.min(mx, Math.max(mn, x));

/** Compression 0–100 % → compresseur doux. 100 % = seuil -30 dB, ratio 4:1, +3 dB de rattrapage. */
export const compDepuis = (p: number) => ({ on: p > 0, seuil: r1(-4 - 0.26 * p), ratio: r1(1.5 + 0.025 * p, 2), attaque: 30, relachement: 150, genou: 6, gain: r1(0.03 * p) });
/** Saturation 0–100 % → drive 0 à 12 dB, mélange 20 à 80 %. */
export const satDepuis = (p: number) => ({ on: p > 0, drive: r1(0.12 * p), mix: Math.round(20 + 0.6 * p) });

/** Allume le filtre passe-haut et le limiteur s'ils sont éteints, sans toucher au reste. */
export function avecProtections(r0: Reglages): Reglages {
  const r = copie(r0);
  if (!r.eq.on) {
    // l'EQ était éteint : ses bandes ne jouaient pas, on les remet à plat avant de l'allumer
    r.eq.bandes.forEach((b, i) => { if (i > 0) b.g = 0; });
    r.eq.on = true;
  }
  const hp = r.eq.bandes[0];
  if (!hp.on) { hp.on = true; hp.type = "hp"; hp.f = FREQ_PASSE_HAUT; hp.q = 0.71; }
  if (!r.lim.on) { r.lim.on = true; r.lim.gain = 0; r.lim.plafond = PLAFOND_PROTECTION; }
  return r;
}

export function protections(r: Reglages): { passeHaut: boolean; limiteur: boolean } {
  return { passeHaut: r.eq.on && r.eq.bandes[0].on, limiteur: r.lim.on };
}

/** Point de départ du mode Simple : tout à plat, protections allumées. */
export function reglagesSimples(): Reglages {
  const r = reglagesNeutres();
  for (const i of [1, 3, 5] as const) Object.assign(r.eq.bandes[i], DEFAUT_BANDE[i]);
  return avecProtections(r);
}

/** Lit la position des 6 curseurs dans des réglages (même venus du mode Avancé). */
export function lireSimples(r: Reglages): ValeursSimples {
  const g = (i: 1 | 3 | 5) => (r.eq.on && r.eq.bandes[i].on ? r.eq.bandes[i].g : 0);
  return {
    graves: borne(g(1), -12, 12), mediums: borne(g(3), -12, 12), aigus: borne(g(5), -12, 12),
    comp: r.comp.on ? borne(Math.round((-4 - r.comp.seuil) / 0.26), 1, 100) : 0,
    sat: r.sat.on ? borne(Math.round(r.sat.drive / 0.12), 1, 100) : 0,
    volume: r.lim.on ? borne(r.lim.gain, -12, 12) : 0,
  };
}

/** Bouge un curseur : ne change que ce qui lui appartient. */
export function ecrireSimple(r0: Reglages, cle: CleSimple, v: number): Reglages {
  const r = avecProtections(r0);
  if (cle === "graves" || cle === "mediums" || cle === "aigus") {
    const i = BANDE_SIMPLE[cle], b = r.eq.bandes[i];
    if (!b.on) { Object.assign(b, DEFAUT_BANDE[i]); b.on = true; }
    b.g = v;
  } else if (cle === "comp") r.comp = compDepuis(v);
  else if (cle === "sat") r.sat = satDepuis(v);
  else r.lim.gain = v;
  return r;
}

/** Réglages complets à partir des 6 valeurs (presets rapides). */
export function depuisSimples(v: Partial<ValeursSimples>): Reglages {
  let r = reglagesSimples();
  for (const c of CURSEURS) if (v[c.cle] !== undefined) r = ecrireSimple(r, c.cle, v[c.cle]!);
  return r;
}

export const egaux = (a: Reglages, b: Reglages) => JSON.stringify(a) === JSON.stringify(b);

// ---------- Conversion vers les 6 curseurs (l'ancien mode Avancé a été retiré en octobre 2026) ----------
/** Ce qui s'entend vraiment : un bloc éteint, ou une bande d'EQ à 0 dB, ne compte pas. */
function effectif(r: Reglages) {
  const n = (x: number) => Math.round(x * 100) / 100;
  const bandes = r.eq.on ? r.eq.bandes.map((b) => (!b.on || ((b.type === "pk" || b.type === "ls" || b.type === "hs") && Math.abs(b.g) < 0.01) ? null : { t: b.type, f: n(b.f), g: n(b.g), q: n(b.q) })) : null;
  const bloc = <T extends { on: boolean }>(x: T) => (x.on ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, typeof v === "number" ? n(v) : v])) : null);
  return JSON.stringify({ bandes, comp: bloc(r.comp), sat: bloc(r.sat), larg: r.larg.on && (Math.abs(r.larg.largeur - 100) > 0.01 || r.larg.monoGrave) ? bloc(r.larg) : null, lim: bloc(r.lim) });
}

/** Les mêmes réglages ramenés aux 6 curseurs (au plus proche) : ce qui n'a pas de curseur est remis à plat. */
export function versSimple(r0: Reglages): Reglages {
  const r = avecProtections(r0);
  const v = lireSimples(r);
  let n = reglagesSimples();
  for (const i of [0, 1, 3, 5] as const) if (r.eq.bandes[i].on) n.eq.bandes[i] = { ...r.eq.bandes[i] };
  n = ecrireSimple(n, "comp", v.comp);
  n = ecrireSimple(n, "sat", v.sat);
  n.lim = { ...n.lim, gain: v.volume, plafond: r.lim.plafond, relachement: r.lim.relachement };
  return n;
}

/** Vrai si les 6 curseurs suffisent pour obtenir exactement ce son (rien de l'ancien mode Avancé). */
export const estSimple = (r: Reglages) => effectif(avecProtections(r)) === effectif(versSimple(r));
