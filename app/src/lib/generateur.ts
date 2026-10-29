// 🎲 Générateur de recettes : une recette au hasard, mais cohérente.
// - oscillateurs, filtres, IFX, MFX et modulations pris uniquement dans les listes de data/ (manuel) ;
// - valeurs de potard dans la plage connue (0 à 127, à vérifier sur l'écran) ou dans ta plage relevée ;
// - une séquence de 4 mesures (64 pas), mesures 1 à 3 = le motif, mesure 4 = la relance ;
// - des réglages adaptés au type de son et à la FICHE du style choisi (data/electribe2/styles.json) : BPM, gammes conseillées,
//   effets typiques, profil de kick, styles « parents » quand le style n'a pas encore de recette dans une sous-catégorie.
// `hasard` (0 = Sage … 100 = Expérimental) élargit les plages et les listes où le générateur pioche.
// Kick a son profil écrit à la main ; les autres sous-catégories partent des recettes de l'app (même élément, même style)
// comme modèles : mêmes familles d'oscillateurs, plages de potards prises sur ces recettes, rythmes remélangés.
import { effects, oscillators } from "./data";
import { pas, SONS_PERCU, type Pas } from "./seq";
import { CATEGORIES, ELEMENTS, RECETTES, STYLE_NOM, type ElementId, type Recette, type Reglage, type Style } from "../content/recettes";
import { FICHE, type ProfilKick } from "../content/styles";
import { gammeByN } from "./music";

export type Plage = (id: string) => { min: number; max: number; lue: boolean };
/** `scale` = 0 : gamme tirée parmi les gammes conseillées de la fiche du style. */
export interface ChoixGen { style: Style; hasard: number; key: string; scale: number }

type Rnd = () => number;
const pick = <T,>(rnd: Rnd, a: T[]): T => a[Math.floor(rnd() * a.length)];
const chance = (rnd: Rnd, p: number) => rnd() < p;
const clamp = (x: number, a = 0, b = 127) => Math.max(a, Math.min(b, x));

// ---- Listes du manuel (data/) ----
const OSC = new Map(oscillators.oscillateurs.map((o) => [o.n, o]));
const catOsc = (cat: string) => oscillators.oscillateurs.filter((o) => o.categorie === cat).map((o) => o.n);
type FxT = { n: number; nom: string };
const FX = effects as unknown as { ifx: { types: FxT[] }; mfx: { types: FxT[] }; modulation: { types: (FxT & { destination: string })[] }; filtres: { types: Record<"LPF" | "HPF" | "BPF", string[]> } };
const IFX = new Map(FX.ifx.types.map((t) => [t.n, t.nom]));
const MFX = new Map(FX.mfx.types.map((t) => [t.n, t.nom]));
const MOD = new Map(FX.modulation.types.map((t) => [t.n, t]));
const oscVal = (n: number) => `${n} ${OSC.get(n)!.nom}`;
const ifxVal = (n: number) => `${n} ${IFX.get(n)!}`;
const mfxVal = (n: number) => `${n} ${MFX.get(n)!}`;
const modVal = (n: number) => `${n} ${MOD.get(n)!.nom}`;
/** Garde seulement les numéros qui existent vraiment dans la liste du manuel. */
const existe = (m: Map<number, unknown>, ns: number[]) => ns.filter((n) => m.has(n));

const r = (param: string, valeur: string): Reglage => ({ param, valeur });

/** Potard : `v` est une valeur sur 0…127 ; si tu as relevé la plage, elle est ramenée dans ta plage. */
function knob(plage: Plage, param: string, v: number): Reglage {
  const p = plage(param);
  const t = clamp(v) / 127;
  const x = Math.round(p.min + t * (p.max - p.min));
  return { param, valeur: String(x), aVerifier: !p.lue };
}

/** Une valeur dans [a, b] ; plus c'est expérimental, plus la fenêtre s'ouvre. */
function dans(rnd: Rnd, h: number, [a, b]: [number, number], ouverture = 40) {
  const lo = clamp(a - ouverture * h), hi = clamp(b + ouverture * h);
  return Math.round(lo + rnd() * (hi - lo));
}

const idNouveau = (el: string) => `gen-${el}-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

// ---------- Fiche du style ----------
// Profil de kick : data/electribe2/styles.json → generateur.kick (oscillateurs de la catégorie Kick, plages de Decay et Level, IFX, relances…).
const KICK = (st: Style): ProfilKick => FICHE[st].generateur.kick;

/** BPM dans la plage de la fiche : Sage = autour du BPM habituel, Expérimental = n'importe où dans la plage. */
export function bpmDuStyle(st: Style, rnd: Rnd, h: number) {
  const { min, max, defaut } = FICHE[st].bpm;
  const lo = Math.round(defaut - (defaut - min) * (0.3 + 0.7 * h)), hi = Math.round(defaut + (max - defaut) * (0.3 + 0.7 * h));
  return Math.round(lo + rnd() * (hi - lo));
}
/** Gamme conseillée par la fiche : Sage = la première (la plus typique), sinon une au hasard parmi elles. */
export function gammeDuStyle(st: Style, rnd: Rnd, h: number) {
  const g = FICHE[st].gammes.map((x) => x.n);
  return h <= 0.2 ? g[0] : pick(rnd, g);
}

// Expérimental : effets et modulations plus inattendus, mais toujours dans les listes du manuel.
const IFX_FOU = [6, 12, 13, 17, 21, 22, 34, 36, 37, 38];
const MOD_KICK_SAGE = [2, 1, 14];                    // EG+ Pitch, EG+ Filter, EG- Pitch
const MOD_KICK_FOU = [8, 26, 38, 44, 62, 68, 6, 18, 30, 67, 72];

/** Positions de la mesure 4 qui s'ajoutent au kick de base (1, 5, 9, 13) : « 4.15, 4.16 ». */
function coupsEnPlus(m: Pas[], bloc: number) {
  return m.map((p, i) => (p !== null && i % 4 !== 0 ? `${bloc}.${String(i + 1).padStart(2, "0")}` : "")).filter(Boolean);
}

function sequenceKick(rnd: Rnd, h: number, s: ProfilKick): { mesures: Pas[][]; relance: string } {
  const base = "x...x...x...x...";
  const m2 = chance(rnd, 0.35 + h * 0.4) ? pick(rnd, s.variations) : base;
  const m3 = chance(rnd, 0.5 + h * 0.4) ? pick(rnd, s.variations) : base;
  const mesures = [base, m2, m3, pick(rnd, s.relances)].map(pas);
  // Expérimental : quelques coups en plus entre les temps des mesures 2 à 4.
  if (h > 0.35) for (const b of [1, 2, 3]) for (let i = 0; i < 16; i++) if (i % 4 && chance(rnd, (h - 0.35) * 0.12)) mesures[b][i] = 0;
  const plus = coupsEnPlus(mesures[3], 4);
  const relance = plus.length === 0 ? "Pas de coup en plus : la relance vient du MFX ou d'un potard que tu bouges sur la mesure 4."
    : plus.length <= 3 ? `${plus.length === 1 ? "Un coup" : `${plus.length} coups`} en plus sur ${plus.join(", ")} qui relance${plus.length === 1 ? "" : "nt"} la boucle.`
    : `Le kick se resserre sur la fin (${plus.length} coups en plus à partir de ${plus[0]}).`;
  return { mesures, relance };
}

function nomKick(decay: number, ifx: number | null, oscNom: string, style: Style) {
  const corps = decay < 50 ? "sec" : decay < 75 ? "rond" : "long";
  const caractere = ifx === null ? "nu" : [3, 4, 5].includes(ifx) ? "cassé" : ifx === 2 ? "sale" : ifx === 1 || ifx === 8 ? "qui cogne" : IFX_FOU.includes(ifx) ? "bizarre" : "chaud";
  return `Kick ${corps} ${caractere} · ${oscNom} (${STYLE_NOM[style]})`;
}

function genererKick(c: ChoixGen, plage: Plage, rnd: Rnd): Recette {
  const h = c.hasard / 100;
  const s = KICK(c.style);
  const pool = existe(OSC, s.osc);
  const osc = chance(rnd, h * 0.6) ? pick(rnd, catOsc("Kick")) : pick(rnd, pool);
  const decay = dans(rnd, h, s.decay);
  const level = dans(rnd, h, s.level, 15);
  const attack = chance(rnd, h * 0.5) ? dans(rnd, h, [0, 6], 20) : 0;
  const reglages: Reglage[] = [r("osc.type", oscVal(osc)), r("part.voiceassign", "Mono2")];
  const notes: string[] = [`${OSC.get(osc)!.nom} pour le corps du kick`];

  // Filtre : souvent rien sur un kick ; sinon un LPF large qui enlève juste le haut.
  if (chance(rnd, s.filtre.p + h * 0.3)) {
    const types = chance(rnd, h * 0.5) ? [...FX.filtres.types.LPF.slice(1), ...FX.filtres.types.HPF.slice(1)] : s.filtre.lpf;
    const f = pick(rnd, types);
    const hpf = /HPF$/.test(f);
    reglages.push(r(hpf ? "filter.hpf" : "filter.lpf", f),
      knob(plage, "filter.cutoff", hpf ? dans(rnd, h, [5, 30]) : dans(rnd, h, s.filtre.cutoff, 30)),
      knob(plage, "filter.resonance", dans(rnd, h, s.filtre.reso, 50)));
    notes.push(hpf ? `${f} pour amincir le bas` : `${f} pour arrondir le haut`);
  }

  reglages.push(r("amp.eg", "ON"), knob(plage, "amp.attack", attack), knob(plage, "amp.decay", decay), knob(plage, "amp.level", level));
  notes.push(decay < 50 ? "decay court : le kick laisse de la place à la basse" : decay < 75 ? "decay moyen : un kick rond" : "decay long : le kick tient entre les temps");

  // Modulation : souvent aucune en Sage ; une chute de hauteur (EG Pitch) ou plus fou en Expérimental.
  if (chance(rnd, 0.15 + h * 0.6)) {
    const m = chance(rnd, h * 0.7) ? pick(rnd, existe(MOD, MOD_KICK_FOU)) : pick(rnd, existe(MOD, MOD_KICK_SAGE));
    reglages.push(r("mod.type", modVal(m)), knob(plage, "mod.depth", dans(rnd, h, [20, 50], 50)));
    if (!MOD.get(m)!.nom.startsWith("EG")) reglages.push(knob(plage, "mod.speed", dans(rnd, h, [30, 80], 40)));
    notes.push(`modulation ${MOD.get(m)!.nom}`);
  }

  // Effet d'insertion.
  let ifx: number | null = null;
  if (!chance(rnd, 0.1 * (1 - h))) {
    const fou = chance(rnd, h * 0.55);
    const choix = fou ? { n: pick(rnd, existe(IFX, IFX_FOU)), edit: [30, 80] as [number, number] } : pick(rnd, s.ifx.filter((x) => IFX.has(x.n)));
    ifx = choix.n;
    reglages.push(r("ifx.on", "ON"), r("ifx.type", ifxVal(choix.n)), knob(plage, "ifx.edit", dans(rnd, h, choix.edit, 30)));
    notes.push(`IFX ${IFX.get(choix.n)}`);
  } else reglages.push(r("ifx.on", "OFF"));

  // Effet master : le kick reste sec, sauf de temps en temps.
  if (chance(rnd, s.mfx.p + h * 0.25)) {
    const t = chance(rnd, h * 0.5) ? pick(rnd, [...MFX.keys()]) : pick(rnd, existe(MFX, s.mfx.types));
    reglages.push(r("mfx.send", "ON"), r("pat.mfxtype", mfxVal(t)));
    notes.push(`envoyé dans le MFX ${MFX.get(t)}`);
  } else reglages.push(r("mfx.send", "OFF"));

  const { mesures, relance } = sequenceKick(rnd, h, s);
  const bpm = bpmDuStyle(c.style, rnd, h);
  const decaySec = clamp(decay - 20, 0), decayLong = clamp(decay + 20, 0);
  return {
    id: idNouveau("kick"), nom: nomKick(decay, ifx, OSC.get(osc)!.nom, c.style), styles: [c.style], fonction: "kick", element: "kick", partie: 1, bpm,
    idee: `Recette générée (${niveau(c.hasard)}) d'après la fiche ${STYLE_NOM[c.style]} (${FICHE[c.style].bpm.min} à ${FICHE[c.style].bpm.max} BPM) : ${notes.join(", ")}.`,
    reglages, mesures, relance, apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Plus sec", idee: "Le kick s'arrête plus vite.", reglages: [knob(plage, "amp.decay", decaySec)] },
      { nom: "Plus long", idee: "Le kick tient plus, plus « boum ».", reglages: [knob(plage, "amp.decay", decayLong)] },
    ],
    astuces: [{ texte: "Recette tirée au hasard dans les listes du manuel : les valeurs de potard sont des propositions, vérifie-les sur l'écran et garde-la si elle te plaît." }],
    exercices: ["ex.decay", "ex.ifxedit"],
  };
}

export const niveau = (h: number) => (h <= 20 ? `Sage ${h} %` : h >= 80 ? `Expérimental ${h} %` : `hasard ${h} %`);

// ---------- Toutes les autres sous-catégories : à partir des recettes de l'app ----------
const MOTS = (st: Style) => FICHE[st].generateur.mots;   // compléments invariables (marchent pour « Toms », « Nappe », « Acid »…)
const BOUTONS_FILTRE = ["filter.lpf", "filter.hpf", "filter.bpf"] as const;
const LISTE_FILTRE: Record<string, string[]> = { "filter.lpf": FX.filtres.types.LPF.slice(1), "filter.hpf": FX.filtres.types.HPF.slice(1), "filter.bpf": FX.filtres.types.BPF.slice(1) };
const numOf = (v?: string) => Number(v?.split(" ")[0]);

/** Modèles : recettes simples (pas les kits) de la sous-catégorie, du style choisi si possible,
 *  sinon de ses styles « parents » (fiche), sinon toutes. `depuis` dit d'où viennent les modèles. */
function modeles(el: ElementId, style: Style) {
  const tous = RECETTES.filter((x) => x.element === el && !x.kit);
  const du = tous.filter((x) => x.styles.includes(style));
  if (du.length) return { tous, du, depuis: null as Style | null };
  for (const p of FICHE[style].generateur.parents) {
    const dp = tous.filter((x) => x.styles.includes(p));
    if (dp.length) return { tous, du: dp, depuis: p as Style | null };
  }
  return { tous, du: tous, depuis: null as Style | null };
}

function genererDepuisModeles(el: ElementId, c: ChoixGen, plage: Plage, rnd: Rnd): Recette {
  const h = c.hasard / 100;
  const { tous, du, depuis } = modeles(el, c.style);
  const fiche = FICHE[c.style];
  const m = pick(rnd, du);                                  // modèle principal : son d'aperçu, structure des réglages
  const percu = SONS_PERCU.includes(m.apercu.son);
  const memeSon = tous.filter((x) => x.apercu.son === m.apercu.son);
  const notes: string[] = [];

  // Oscillateur : un de ceux des recettes au même son ; en Expérimental, n'importe lequel de la même famille du manuel.
  const oscM = numOf(m.reglages.find((x) => x.param === "osc.type")?.valeur);
  const poolOsc = existe(OSC, [...new Set(memeSon.map((x) => numOf(x.reglages.find((y) => y.param === "osc.type")?.valeur)).filter((n) => !Number.isNaN(n)))]);
  const famille = OSC.get(oscM)?.categorie;
  const osc = famille && chance(rnd, h * 0.6) ? pick(rnd, catOsc(famille)) : poolOsc.length ? pick(rnd, poolOsc) : oscM;

  // Fenêtre de chaque potard : de la plus petite à la plus grande valeur des recettes du style.
  const fenetre = (param: string, v: number): [number, number] => {
    const vs = du.flatMap((x) => x.reglages.filter((y) => y.param === param && NUM.test(y.valeur)).map((y) => Number(y.valeur)));
    const lo = Math.min(v, ...vs), hi = Math.max(v, ...vs);
    return hi - lo < 10 ? [lo - 8, hi + 8] : [lo, hi];
  };
  const donneur = (param: string) => { const d = du.filter((x) => x.reglages.some((y) => y.param === param)); return d.length ? pick(rnd, d) : undefined; };

  const reglages: Reglage[] = [];
  for (const x of m.reglages) {
    if (x.param === "osc.type") { reglages.push(r("osc.type", oscVal(osc))); notes.push(`${OSC.get(osc)!.nom} comme son de départ`); continue; }
    if ((BOUTONS_FILTRE as readonly string[]).includes(x.param)) {
      if (x.valeur === "OFF") { reglages.push(x); continue; }
      const liste = LISTE_FILTRE[x.param];
      const f = chance(rnd, h * 0.5) ? pick(rnd, liste) : pick(rnd, [x.valeur, ...du.flatMap((y) => y.reglages.filter((z) => z.param === x.param).map((z) => z.valeur))].filter((v) => liste.includes(v) || v === x.valeur));
      reglages.push(r(x.param, f)); notes.push(f); continue;
    }
    if (x.param === "ifx.type") {
      const d = donneur("ifx.type");
      // Hasard : n'importe quel IFX ; parfois un effet typique de la fiche ; sinon celui d'une recette du style.
      const n = chance(rnd, h * 0.45) ? pick(rnd, [...IFX.keys()]) : chance(rnd, 0.25) ? pick(rnd, existe(IFX, fiche.effets.ifx)) : numOf((d ?? m).reglages.find((y) => y.param === "ifx.type")!.valeur);
      reglages.push(r("ifx.type", ifxVal(IFX.has(n) ? n : numOf(x.valeur)))); notes.push(`IFX ${IFX.get(IFX.has(n) ? n : numOf(x.valeur))}`); continue;
    }
    if (x.param === "mod.type") {
      const d = donneur("mod.type");
      const n = chance(rnd, h * 0.5) ? pick(rnd, [...MOD.keys()]) : numOf((d ?? m).reglages.find((y) => y.param === "mod.type")!.valeur);
      const nn = MOD.has(n) ? n : numOf(x.valeur);
      reglages.push(r("mod.type", modVal(nn))); notes.push(`modulation ${MOD.get(nn)!.nom}`); continue;
    }
    if (x.param === "pat.mfxtype") {
      const n = chance(rnd, h * 0.4) ? pick(rnd, [...MFX.keys()]) : numOf(x.valeur);
      reglages.push(r("pat.mfxtype", mfxVal(MFX.has(n) ? n : numOf(x.valeur)))); continue;
    }
    if (NUM.test(x.valeur) && x.aVerifier) { reglages.push(knob(plage, x.param, dans(rnd, h, fenetre(x.param, Number(x.valeur)), 30))); continue; }
    reglages.push(x);   // valeur de liste (VOICE ASSIGN, Amp EG, IFX On, MFX Send…) : celle du modèle
  }
  // Expérimental : parfois une modulation en plus si le modèle n'en a pas.
  if (!reglages.some((x) => x.param === "mod.type") && chance(rnd, h * 0.5)) {
    const n = pick(rnd, [...MOD.keys()]);
    reglages.push(r("mod.type", modVal(n)), knob(plage, "mod.depth", dans(rnd, h, [20, 60], 40)));
    if (!MOD.get(n)!.nom.startsWith("EG")) reglages.push(knob(plage, "mod.speed", dans(rnd, h, [30, 90], 30)));
    notes.push(`modulation ${MOD.get(n)!.nom}`);
  }

  // Séquence : mesures 1 à 3 du modèle (ou d'une recette au même son), relance d'une autre.
  const auMemeSon = du.filter((x) => x.apercu.son === m.apercu.son);
  const rythme = chance(rnd, 0.3 + h * 0.4) && auMemeSon.length > 1 ? pick(rnd, auMemeSon) : m;
  const relanceDe = chance(rnd, 0.35 + h * 0.4) && auMemeSon.length > 1 ? pick(rnd, auMemeSon) : rythme;
  const mesures: Pas[][] = [rythme.mesures[0], rythme.mesures[1], rythme.mesures[2], relanceDe.mesures[3]].map((b) => [...b]);
  if (percu) {
    if (h > 0.3) for (const b of [1, 2, 3]) for (let i = 0; i < 16; i++) if (chance(rnd, (h - 0.3) * 0.1)) mesures[b][i] = mesures[b][i] === null ? 0 : null;
  } else {
    // Notes : nouveau motif dans la gamme choisie. Sage = proche du modèle, Expérimental = rangs tirés au hasard.
    const rang = (): Pas => (chance(rnd, 0.12) ? "O" : Math.floor(rnd() * (3 + Math.round(h * 4))));
    const motif = new Map<string, Pas>();
    for (const b of mesures) for (let i = 0; i < 16; i++) {
      const p = b[i];
      if (typeof p !== "number" && p !== "O") continue;
      const cle = String(p);
      if (chance(rnd, 0.15 + h * 0.6)) b[i] = rang();
      else { if (!motif.has(cle)) motif.set(cle, chance(rnd, 0.25 + h * 0.4) ? rang() : p); b[i] = motif.get(cle)!; }
    }
  }
  const nomEl = ELEMENTS.get(el)!.nom.split(/ [(/]/)[0];
  const ton = percu ? m.melodique : { key: c.key, scale: c.scale || gammeDuStyle(c.style, rnd, h) };
  const bpm = m.bpm && m.bpm >= fiche.bpm.min && m.bpm <= fiche.bpm.max && !depuis ? m.bpm : bpmDuStyle(c.style, rnd, h);
  const cut = reglages.find((x) => x.param === "filter.cutoff");
  const dec = reglages.find((x) => x.param === "amp.decay");
  const decale = (x: Reglage, d: number) => knob(plage, x.param, clamp(((Number(x.valeur) - plage(x.param).min) / Math.max(1, plage(x.param).max - plage(x.param).min)) * 127 + d));
  return {
    id: idNouveau(el), nom: `${nomEl} ${pick(rnd, MOTS(c.style))} · ${OSC.get(osc)!.nom} (${STYLE_NOM[c.style]})`, styles: [c.style],
    fonction: m.fonction, element: el, partie: m.partie, bpm,
    idee: `Recette générée (${niveau(c.hasard)}) d'après la fiche ${STYLE_NOM[c.style]} (${fiche.bpm.min} à ${fiche.bpm.max} BPM${percu ? "" : `, SCALE ${gammeByN.get(ton!.scale)?.nom ?? ton!.scale}`}), sur le modèle de « ${m.nom} »${depuis ? ` (pas encore de recette ${STYLE_NOM[c.style]} ici : modèle pris en ${STYLE_NOM[depuis]})` : ""} : ${notes.join(", ")}.`,
    reglages, melodique: ton, mesures,
    relance: !percu ? `Le rythme de relance de « ${relanceDe.nom} », rejoué avec les nouvelles notes de la gamme.`
      : relanceDe === rythme ? rythme.relance : `Relance reprise de « ${relanceDe.nom} » : ${relanceDe.relance}`,
    apercu: { ...m.apercu }, variantes: [
      ...(cut ? [{ nom: "Plus ouvert", idee: "Le filtre laisse passer plus d'aigus.", reglages: [decale(cut, 20)] }, { nom: "Plus fermé", idee: "Plus sourd, plus sombre.", reglages: [decale(cut, -20)] }] : []),
      ...(dec ? [{ nom: "Plus court", idee: "Le son s'arrête plus vite.", reglages: [decale(dec, -20)] }] : []),
    ],
    astuces: [{ texte: "Recette tirée au hasard à partir des listes du manuel et des recettes de l'app : les valeurs de potard sont des propositions, vérifie-les sur l'écran et garde-la si elle te plaît." }],
    exercices: m.exercices,
  };
}


type Gen = { percu: boolean; generer: (c: ChoixGen, plage: Plage, rnd?: Rnd) => Recette };
/** Toutes les sous-catégories ont un générateur (onglet « 🎲 Générer »). `percu` : aucune recette modèle n'a de notes. */
export const GENERATEURS: Partial<Record<ElementId, Gen>> = Object.fromEntries(CATEGORIES.flatMap((cat) => cat.elements.map((e): [ElementId, Gen] => [
  e.id,
  e.id === "kick" ? { percu: true, generer: (c, p, rnd = Math.random) => genererKick(c, p, rnd) }
    : { percu: modeles(e.id, "tekno").tous.every((x) => SONS_PERCU.includes(x.apercu.son)), generer: (c, p, rnd = Math.random) => genererDepuisModeles(e.id, c, p, rnd) },
])));

// ---------- Variante d'une recette existante ----------
const NUM = /^\d+$/;
/** Part d'une recette (de l'app ou générée) et la modifie un peu : potards, parfois l'oscillateur, l'IFX, la relance. */
export function genererVariante(rc: Recette, c: ChoixGen, plage: Plage, rnd: Rnd = Math.random): Recette {
  const h = c.hasard / 100;
  const changes: string[] = [];
  const amp = 6 + 30 * h;
  const reglages = rc.reglages.map((x) => {
    if (x.param === "osc.type" && chance(rnd, 0.2 + 0.4 * h)) {
      const n = Number(x.valeur.split(" ")[0]);
      const o = OSC.get(n);
      if (o) {
        const voisins = catOsc(o.categorie).filter((m) => m !== n && Math.abs(m - n) <= 4 + 30 * h);
        if (voisins.length) { const m = pick(rnd, voisins); changes.push(`oscillateur ${OSC.get(m)!.nom}`); return r("osc.type", oscVal(m)); }
      }
    }
    if (x.param === "ifx.type" && chance(rnd, 0.15 + 0.4 * h)) {
      const st = rc.styles[0] ?? c.style;
      const pool = rc.element === "kick" ? KICK(st).ifx.map((y) => y.n) : [...new Set([...FICHE[st].effets.ifx, 1, 2, 3, 20, 27, 31])];
      const n = pick(rnd, existe(IFX, h > 0.6 ? [...pool, ...IFX_FOU] : pool));
      if (ifxVal(n) !== x.valeur) { changes.push(`IFX ${IFX.get(n)}`); return r("ifx.type", ifxVal(n)); }
    }
    if (NUM.test(x.valeur) && x.param !== "osc.type") {
      // Valeur ramenée sur 0…127 pour la bouger, puis remise dans ta plage.
      const p = plage(x.param);
      const v127 = ((Number(x.valeur) - p.min) / Math.max(1, p.max - p.min)) * 127;
      const n = clamp(Math.round(v127 + (rnd() * 2 - 1) * amp));
      const k = knob(plage, x.param, n);
      if (k.valeur !== x.valeur) return k;
    }
    return x;
  });
  const numChanges = reglages.filter((x, i) => NUM.test(x.valeur) && x.valeur !== rc.reglages[i].valeur && x.param !== "osc.type").length;
  if (numChanges) changes.unshift(`${numChanges} potard${numChanges > 1 ? "s" : ""} bougé${numChanges > 1 ? "s" : ""}`);

  const mesures = rc.mesures.map((m) => [...m]);
  const percu = SONS_PERCU.includes(rc.apercu.son);
  // Mesure 4 : une autre relance du même style (kick) ; sinon quelques pas qui bougent.
  if (rc.element === "kick" && chance(rnd, 0.5 + 0.3 * h)) {
    mesures[3] = pas(pick(rnd, KICK(rc.styles[0] ?? c.style).relances));
    changes.push("nouvelle relance");
  }
  let bouges = 0;
  for (const b of [1, 2, 3]) for (let i = 0; i < 16; i++) {
    if (!chance(rnd, 0.03 + 0.1 * h)) continue;
    const p = mesures[b][i];
    if (percu) { if (i % 4 !== 0) { mesures[b][i] = p === null ? 0 : null; bouges++; } }
    else if (typeof p === "number") { mesures[b][i] = Math.max(0, Math.min(6, p + (chance(rnd, 0.5) ? 1 : -1))); bouges++; }
  }
  if (bouges) changes.push(`${bouges} pas changé${bouges > 1 ? "s" : ""}`);
  const nomBase = rc.nom.replace(/ · variante( \d+)?$/, "");
  return {
    ...rc, id: idNouveau(rc.element ?? "recette"), nom: `${nomBase} · variante`, kit: undefined,
    idee: `Variante générée (${niveau(c.hasard)}) de « ${nomBase} » : ${changes.length ? changes.join(", ") : "presque identique"}.`,
    reglages, mesures, relance: mesures[3].join("") === rc.mesures[3].join("") ? rc.relance : "Une autre relance sur la mesure 4.",
    variantes: rc.variantes.filter((v) => !v.mesures),
    astuces: [{ texte: `Variante tirée au hasard à partir de « ${nomBase} ». Les valeurs de potard restent des propositions à vérifier sur l'écran.` }, ...(rc.astuces ?? [])],
  };
}
