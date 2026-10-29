// Recettes de départ pour l'E2 à partir d'un son analysé dans une référence (module « Analyser une référence »).
// - oscillateurs, filtres, IFX, MFX et modulations pris uniquement dans les listes de data/ (manuel) ;
// - potards ramenés dans ta plage relevée si tu l'as notée, sinon 0 à 127 « à vérifier sur l'écran » ;
// - séquence de 4 mesures (64 pas) ; badge « Point de départ, à ajuster à l'oreille ».
// Les correspondances (longueur en ms → potard Decay, brillance → Cutoff) sont des estimations : le manuel ne donne pas
// les courbes des potards.
import { effects, oscillators } from "./data";
import { pas } from "./seq";
import { ELEMENTS, RECETTES, type ElementId, type Recette, type Reglage, type Style } from "../content/recettes";
import { gammeByN, nomMidi } from "./music";
import type { AnaSon } from "./refAnalyse";
import type { Plage } from "./generateur";

export interface ContexteRef {
  morceau: string;          // nom du morceau analysé
  analyse?: string;         // id de l'analyse gardée
  bpm?: number;
  key?: string;             // tonalité trouvée (C, C#…)
  gamme?: number;           // SCALE de l'E2 la plus probable
  style?: Style;
}

type FxT = { n: number; nom: string };
const OSC = new Map(oscillators.oscillateurs.map((o) => [o.n, o]));
const FX = effects as unknown as { ifx: { types: FxT[] }; mfx: { types: FxT[] }; modulation: { types: FxT[] } };
const IFX = new Map(FX.ifx.types.map((t) => [t.n, t.nom]));
const MOD = new Map(FX.modulation.types.map((t) => [t.n, t.nom]));
const r = (param: string, valeur: string): Reglage => ({ param, valeur });
const oscVal = (n: number) => `${n} ${OSC.get(n)!.nom}`;
const ifxVal = (n: number) => `${n} ${IFX.get(n)!}`;
const modVal = (n: number) => `${n} ${MOD.get(n)!}`;
const clamp = (x: number, a = 0, b = 127) => Math.max(a, Math.min(b, x));
const existe = (ns: number[]) => ns.filter((n) => OSC.has(n));

function knob(plage: Plage, param: string, v: number): Reglage {
  const p = plage(param);
  return { param, valeur: String(Math.round(p.min + (clamp(v) / 127) * (p.max - p.min))), aVerifier: !p.lue };
}
/** Longueur mesurée (ms avant -20 dB) → position du potard Decay sur 0…127 (estimation : 50 ms ≈ 20, 100 ms ≈ 55, 400 ms ≈ 125). */
const decayKnob = (ms: number) => Math.round(clamp(20 + 35 * Math.log2(Math.max(ms, 20) / 50), 5, 127));
/** Part d'aigu (%) → Cutoff d'un LPF (estimation). */
const cutoffKnob = (aigu: number, medium: number) => Math.round(clamp(30 + 18 * Math.log10(1 + aigu * 30) + medium * 0.5, 20, 120));
const id = (el: string, i: number) => `ref-${el}-${Date.now().toString(36)}${i}${Math.floor(Math.random() * 1296).toString(36)}`;

const note = (a: AnaSon) => (a.midiBase === null ? null : nomMidi(a.midiBase).en);
const BADGE = "Point de départ, à ajuster à l'oreille.";

function astucesCommunes(a: AnaSon, ctx: ContexteRef): Recette["astuces"] {
  const n = note(a);
  const out: NonNullable<Recette["astuces"]> = [{ texte: `${BADGE} Les valeurs viennent de l'analyse de « ${ctx.morceau} » : ce sont des estimations, compare toujours avec la référence.` }];
  if (n) out.push({ texte: `Note de base mesurée : ${n}${a.baseFiable ? "" : " (approximatif)"}. Sur l'analyse, « ♪ Écouter la note » joue cette note : tourne Pitch (plage à vérifier sur l'écran) jusqu'à ce que ton son sonne pareil.` });
  return out;
}

// ---------------------------------------------------------------- Kick
/** Oscillateurs de kick classés par caractère, du plus proche au moins proche. */
function oscKick(a: AnaSon): { liste: number[]; pourquoi: string } {
  if (a.motDistorsion === "distordu") return { liste: existe([5, 6, 30, 27, 32]), pourquoi: "kick distordu" };
  if (a.decayMs < 160 && (a.attaque === "forte" || a.clic > -14)) return { liste: existe([10, 13, 19, 24, 23]), pourquoi: "kick court avec du clic" };
  if (a.parts.sub > 45 || a.decayMs > 280) return { liste: existe([1, 15, 17, 25, 21]), pourquoi: "kick long avec beaucoup de sub" };
  if (a.motDistorsion === "un peu saturé") return { liste: existe([6, 12, 35, 27, 21]), pourquoi: "kick un peu saturé" };
  return { liste: existe([21, 35, 12, 11, 25]), pourquoi: "kick rond et propre" };
}
function ifxKick(a: AnaSon): { n: number; edit: number } | null {
  if (a.motDistorsion === "distordu") return { n: 3, edit: 85 };
  if (a.motDistorsion === "un peu saturé") return { n: 2, edit: 55 };
  if (a.attaque === "forte") return { n: 1, edit: 60 };
  if (a.attaque === "moyenne") return { n: 1, edit: 40 };
  return null;
}
const MESURES_KICK = ["x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x...x.x."];

function recetteKick(a: AnaSon, ctx: ContexteRef, plage: Plage, osc: number | "sine", i: number, titre: string): Recette {
  const reglages: Reglage[] = [];
  const notes: string[] = [];
  const dec = decayKnob(a.decayMs);
  const n = note(a);
  if (osc === "sine") {
    // Un kick construit : une SINE avec une chute de hauteur (modulation EG+ Pitch), comme beaucoup de kicks de synthé.
    reglages.push(r("osc.type", oscVal(330)), r("part.voiceassign", "Mono2"), knob(plage, "osc.pitch", 64));
    notes.push(`SINE (330) accordée sur ${n ?? "la note de base"}`);
  } else {
    reglages.push(r("osc.type", oscVal(osc)), r("part.voiceassign", "Mono2"), knob(plage, "osc.pitch", 64));
    notes.push(`${OSC.get(osc)!.nom} pour le corps du kick`);
  }
  // Filtre : un LPF seulement si la référence est sombre (peu d'aigu).
  if (a.parts.aigu < 1.5 && a.clic < -18) {
    reglages.push(r("filter.lpf", "electribe LPF"), knob(plage, "filter.cutoff", cutoffKnob(a.parts.aigu, a.parts.medium)), knob(plage, "filter.resonance", 10));
    notes.push("LPF pour enlever le haut (la référence est sombre)");
  }
  reglages.push(r("amp.eg", "ON"), knob(plage, "amp.attack", a.attaque === "douce" ? 8 : 0), knob(plage, "amp.decay", dec), knob(plage, "amp.level", 110));
  notes.push(`decay réglé d'après la longueur mesurée (${Math.round(a.decayMs)} ms avant de baisser de 20 dB)`);
  const chute = a.chuteDemi ?? 0;
  if (osc === "sine" || chute > 24) {
    const depth = Math.round(clamp(20 + chute * 1.6, 15, 110));
    reglages.push(r("mod.type", modVal(2)), knob(plage, "mod.depth", depth));
    notes.push(`modulation EG+ Pitch pour la chute de hauteur (${Math.round(chute)} demi-tons mesurés)`);
  }
  const fx = ifxKick(a);
  if (fx) { reglages.push(r("ifx.on", "ON"), r("ifx.type", ifxVal(fx.n)), knob(plage, "ifx.edit", fx.edit)); notes.push(`IFX ${IFX.get(fx.n)} (${a.motDistorsion === "propre" ? `attaque ${a.attaque}` : a.motDistorsion})`); }
  else reglages.push(r("ifx.on", "OFF"));
  reglages.push(r("mfx.send", "OFF"));
  const oscNom = osc === "sine" ? "SINE" : OSC.get(osc)!.nom;
  return {
    id: id("kick", i), nom: `${titre} · ${oscNom} (d'après ${ctx.morceau})`, styles: ctx.style ? [ctx.style] : [], fonction: "kick", element: "kick", partie: 1,
    bpm: ctx.bpm ? Math.round(ctx.bpm) : undefined,
    idee: `Kick de départ d'après « ${ctx.morceau} »${n ? `, note de base ${n}${a.baseFiable ? "" : " (approximatif)"}` : ""} : ${notes.join(", ")}.`,
    reglages, mesures: MESURES_KICK.map(pas), relance: "Un coup en plus sur 4.15 pour relancer la boucle.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Plus court", idee: "Le kick s'arrête plus vite.", reglages: [knob(plage, "amp.decay", dec - 20)] },
      { nom: "Plus long", idee: "Le kick tient plus.", reglages: [knob(plage, "amp.decay", dec + 20)] },
      ...(fx ? [{ nom: "Sans IFX", idee: "Pour entendre ce que l'effet ajoute.", reglages: [r("ifx.on", "OFF")] }] : []),
    ],
    astuces: astucesCommunes(a, ctx), exercices: ["ex.decay", "ex.pitch", ...(fx ? ["ex.ifxedit"] : [])],
    origine: { type: "reference", morceau: ctx.morceau, analyse: ctx.analyse },
  };
}

// ---------------------------------------------------------------- Autres sons : à partir des recettes de l'app
function elementsPour(a: AnaSon): ElementId[] {
  if (a.type === "basse") {
    if (a.motDistorsion === "distordu" || a.parts.medium > 35) return ["acid", "reese", "basse-roulante"];
    if (a.parts.sub > 50) return ["sub", "basse-roulante", "reese"];
    return ["basse-roulante", "sub", "acid"];
  }
  if (a.type === "aigu") return a.decayMs < 120 ? ["hat-ferme", "shaker", "hat-ouvert"] : ["hat-ouvert", "ride", "hat-ferme"];
  if (a.decayMs < 300 && a.parts.medium > 40) return ["clap", "snare", "stab"];
  return ["stab", "lead", "nappe"];
}

function depuisModele(m: Recette, a: AnaSon, ctx: ContexteRef, plage: Plage, i: number): Recette {
  const notes: string[] = [];
  const reglages = m.reglages.map((x): Reglage => {
    if (x.param === "amp.decay") { notes.push(`decay d'après la longueur mesurée (${Math.round(a.decayMs)} ms)`); return knob(plage, "amp.decay", decayKnob(a.decayMs)); }
    if (x.param === "filter.cutoff" && m.reglages.some((y) => y.param === "filter.lpf" && y.valeur !== "OFF")) { notes.push(`cutoff d'après la brillance (${Math.round(a.parts.aigu)} % d'aigu)`); return knob(plage, "filter.cutoff", cutoffKnob(a.parts.aigu, a.parts.medium)); }
    if (x.param === "amp.attack") return knob(plage, "amp.attack", a.attaque === "douce" ? 30 : a.attaque === "moyenne" ? 8 : 0);
    return x;
  });
  if (a.motDistorsion === "distordu" && !reglages.some((x) => x.param === "ifx.type")) {
    const j = reglages.findIndex((x) => x.param === "ifx.on");
    const ajout = [r("ifx.on", "ON"), r("ifx.type", ifxVal(3)), knob(plage, "ifx.edit", 70)];
    if (j >= 0) reglages.splice(j, 1, ...ajout); else reglages.push(...ajout);
    notes.push("IFX Distortion (la référence est distordue)");
  }
  const melodique = m.melodique ? { key: ctx.key ?? m.melodique.key, scale: ctx.gamme ?? m.melodique.scale } : undefined;
  if (melodique && ctx.key) notes.push(`KEY = ${melodique.key}, SCALE ${gammeByN.get(melodique.scale)?.nom ?? melodique.scale} (tonalité estimée du morceau)`);
  const el = m.element ?? "stab";
  return {
    ...m, kit: undefined, id: id(el, i), nom: `${ELEMENTS.get(el)?.nom ?? m.nom} d'après ${ctx.morceau} · sur « ${m.nom} »`,
    styles: ctx.style ? [ctx.style] : m.styles, bpm: ctx.bpm ? Math.round(ctx.bpm) : m.bpm, melodique, reglages,
    idee: `Point de départ d'après « ${ctx.morceau} », sur le modèle de la recette « ${m.nom} »${notes.length ? ` : ${notes.join(", ")}` : ""}.`,
    astuces: [...(astucesCommunes(a, ctx) ?? []), ...(m.astuces ?? [])],
    origine: { type: "reference", morceau: ctx.morceau, analyse: ctx.analyse },
  };
}

/** 2 ou 3 recettes de départ pour l'E2, d'après le son analysé. */
export function recettesDepuisSon(a: AnaSon, ctx: ContexteRef, plage: Plage): Recette[] {
  if (a.type === "kick") {
    const { liste, pourquoi } = oscKick(a);
    return [
      recetteKick(a, ctx, plage, liste[0], 0, `Kick proche (${pourquoi})`),
      recetteKick(a, ctx, plage, liste[1] ?? liste[0], 1, "Kick, autre oscillateur"),
      recetteKick(a, ctx, plage, "sine", 2, "Kick construit"),
    ];
  }
  const out: Recette[] = [];
  const els = elementsPour(a);
  for (const el of els) {
    const tous = RECETTES.filter((x) => x.element === el && !x.kit);
    if (!tous.length) continue;
    const du = ctx.style ? tous.filter((x) => x.styles.includes(ctx.style!)) : [];
    const m = (du.length ? du : tous)[0];
    out.push(depuisModele(m, a, ctx, plage, out.length));
    if (out.length === 3) break;
  }
  return out;
}

