// Chaîne du son : le trajet du son dans une partie, puis dans le motif.
// Chaque bloc et chaque flèche « Manuel » renvoie à une page. Là où le manuel ne dit pas
// l'ordre, la flèche est en pointillés (« Interprétation ») et un exercice d'écoute permet de vérifier.
import type { Source } from "../lib/data";

const OM = (page: number): Source => ({ doc: "OM", page });
const PG = (page: number): Source => ({ doc: "PG", page });

export interface Fait { texte: string; ref: Source }

export interface Bloc {
  id: string;
  titre: string;
  role: string;              // une ligne, affichée dans le schéma
  controles: string[];       // ids de data/electribe2/panel.json (contrôles du panneau)
  params: string[];          // ids de data/electribe2/parameters.json
  faits: Fait[];             // ce que dit le manuel sur le bloc
  interp?: string;           // bloc qui n'existe pas tel quel dans le manuel
  exercices?: string[];
  menu?: boolean;            // réglé dans le menu d'édition (pas de potard)
}

export interface Fleche {
  id: string;
  de: string;
  vers: string;
  label?: string;
  sorte: "manuel" | "interp";
  texte: string;
  ref?: Source;
  exercices?: string[];
}

export const BLOCS: Record<string, Bloc> = {
  osc: {
    id: "osc", titre: "Oscillator", role: "crée l'onde",
    controles: ["osc", "pitch", "oscedit"], params: ["osc.type", "osc.pitch", "osc.glide", "osc.edit"],
    faits: [
      { texte: "Choisit la forme d'onde (dent de scie, carrée, bruit ou PCM) et règle sa hauteur et son timbre.", ref: OM(23) },
      { texte: "L'effet du potard Edit dépend de l'oscillateur choisi.", ref: OM(23) },
      { texte: "409 oscillateurs. Le dernier, n° 409, s'appelle « Audio In ».", ref: PG(13) },
    ],
  },
  filter: {
    id: "filter", titre: "Filter", role: "sculpte le timbre",
    controles: ["lpf", "hpf", "bpf", "cutoff", "resonance", "egint"],
    params: ["filter.lpf", "filter.hpf", "filter.bpf", "filter.cutoff", "filter.resonance", "filter.egint"],
    faits: [
      { texte: "Atténue ou accentue une partie du spectre de l'oscillateur.", ref: OM(23) },
      { texte: "LPF, HPF, BPF : chaque nouvel appui change de type de filtre.", ref: PG(15) },
      { texte: "EG Int : l'enveloppe réglée dans Amp/EG fait varier la coupure.", ref: OM(23) },
    ],
    exercices: ["ex.chain.egamp"],
  },
  amp: {
    id: "amp", titre: "Amp/EG", role: "volume, stéréo, enveloppe",
    controles: ["level", "pan", "attack", "decay", "ampeg"], params: ["amp.level", "amp.pan", "amp.attack", "amp.decay", "amp.eg"],
    faits: [
      { texte: "Règle le volume de la partie et sa place dans l'image stéréo.", ref: OM(23) },
      { texte: "Amp EG allumé : le volume suit Attack et Decay/Release. Éteint : enveloppe d'orgue fixe.", ref: OM(23) },
    ],
    exercices: ["ex.chain.egamp"],
  },
  ifx: {
    id: "ifx", titre: "Insert Fx", role: "un effet par partie",
    controles: ["ifxtype", "ifxedit", "ifxon"], params: ["ifx.type", "ifx.edit", "ifx.on"],
    faits: [
      { texte: "Applique un effet au son de la partie, par exemple une distorsion.", ref: OM(23) },
      { texte: "38 types d'effets d'insertion.", ref: PG(16) },
      { texte: "En Poly1 / Poly2, les voix d'une partie partagent la même enveloppe, le même filtre, le même ampli et le même effet d'insertion.", ref: PG(4) },
    ],
    exercices: ["ex.chain.ifxfilter", "ex.chain.ifxamp"],
  },
  send: {
    id: "send", titre: "MFX Send", role: "vers l'effet master ?",
    controles: ["mfxsend"], params: ["mfx.send"],
    faits: [{ texte: "Allumé : la partie est envoyée à l'effet master. Éteint : elle ne l'est pas.", ref: OM(23) }],
    exercices: ["ex.chain.send"],
  },
  mod: {
    id: "mod", titre: "Modulation", role: "fait bouger un réglage tout seul",
    controles: ["modtype", "depth", "speed"], params: ["mod.type", "mod.depth", "mod.speed"],
    faits: [
      { texte: "Le potard Modulation choisit le type, Depth règle l'intensité, Speed la vitesse.", ref: OM(23) },
      { texte: "72 types : chacun associe une source (enveloppe ou LFO) à une destination.", ref: PG(14) },
    ],
  },
  mfx: {
    id: "mfx", titre: "Master Fx", role: "un effet pour tout le motif",
    controles: ["masterfx", "touchpad", "mfxhold"], params: ["mfx.on", "pat.mfxtype", "mfx.x", "mfx.y", "mfx.hold"],
    faits: [
      { texte: "Un motif = 16 parties + un effet master.", ref: OM(27) },
      { texte: "Master Fx allumé : le pad tactile applique l'effet aux parties dont MFX Send est allumé.", ref: OM(29) },
      { texte: "Type choisi dans MFX TYPE (32 types).", ref: PG(3) },
    ],
  },
  mix: {
    id: "mix", titre: "Mélange", role: "les 16 parties ensemble",
    controles: [], params: [], faits: [],
    interp: "Le manuel ne décrit pas ce point de mélange. Il représente le moment où les 16 parties et l'effet master sonnent ensemble.",
  },
  patlevel: {
    id: "patlevel", titre: "Pattern Level", role: "volume du motif entier", menu: true,
    controles: [], params: ["pat.level"],
    faits: [{ texte: "Règle le volume du motif entier, de 0 à 127, dans le menu d'édition.", ref: PG(3) }],
  },
  volume: {
    id: "volume", titre: "Volume", role: "niveau des sorties",
    controles: ["volume"], params: [],
    faits: [{ texte: "Règle le volume des sorties ligne et casque.", ref: OM(22) }],
  },
  out: {
    id: "out", titre: "Sorties", role: "Audio Out L/R, casque",
    controles: ["audioout", "phones"], params: [], faits: [],
  },
  audioin: {
    id: "audioin", titre: "Audio In", role: "prise d'entrée",
    controles: ["audioin"], params: [], faits: [],
  },
  inputlevel: {
    id: "inputlevel", titre: "Input Level", role: "niveau d'entrée",
    controles: ["inputlevel"], params: [],
    faits: [{ texte: "L'oscillateur n° 409 s'appelle « Audio In » : piste pour faire entrer la prise dans une partie.", ref: PG(13) }],
    interp: "Le guide liste l'oscillateur « Audio In » sans décrire son fonctionnement : le lien avec la prise est une interprétation.",
  },
  thru: {
    id: "thru", titre: "Audio In Thru", role: "entrée directe vers les sorties", menu: true,
    controles: [], params: ["glob.audiointhru"],
    faits: [{ texte: "Transmet ou non le signal de la prise Audio In aux sorties Audio Out L/R (menu Global).", ref: PG(7) }],
  },
};

const ORDRE = "Le manuel ne dessine pas ce trajet. C'est l'ordre des sections sur le panneau et l'ordre habituel d'un synthé.";

export const FLECHES: Record<string, Fleche> = {
  a1: { id: "a1", de: "osc", vers: "filter", sorte: "manuel", texte: "Le filtre agit sur le spectre de l'oscillateur.", ref: OM(23) },
  a2: { id: "a2", de: "filter", vers: "amp", sorte: "interp", texte: ORDRE },
  a3: { id: "a3", de: "amp", vers: "ifx", sorte: "interp", texte: "Le manuel ne dit pas si l'effet d'insertion agit avant ou après le filtre et l'ampli. Deux exercices permettent de le vérifier à l'oreille.", exercices: ["ex.chain.ifxfilter", "ex.chain.ifxamp"] },
  a4: { id: "a4", de: "ifx", vers: "send", sorte: "interp", texte: ORDRE },
  c1: { id: "c1", de: "send", vers: "mfx", label: "allumé", sorte: "manuel", texte: "MFX Send allumé : la partie est envoyée à l'effet master.", ref: OM(29) },
  c2: { id: "c2", de: "send", vers: "mix", label: "éteint", sorte: "interp", texte: "MFX Send éteint : la partie ne passe pas par l'effet master. Le manuel ne dit pas où elle rejoint le mélange.", exercices: ["ex.chain.send"] },
  a6: { id: "a6", de: "mfx", vers: "mix", sorte: "interp", texte: "Le manuel ne décrit pas le point de mélange." },
  a7: { id: "a7", de: "mix", vers: "patlevel", sorte: "interp", texte: "Pattern Level règle le volume du motif entier (Guide p. 3). Sa place exacte dans le trajet n'est pas décrite." },
  a8: { id: "a8", de: "patlevel", vers: "volume", sorte: "interp", texte: ORDRE },
  a9: { id: "a9", de: "volume", vers: "out", sorte: "manuel", texte: "Le potard Volume règle les sorties ligne et casque.", ref: OM(22) },
  a10: { id: "a10", de: "audioin", vers: "inputlevel", sorte: "manuel", texte: "Input Level règle le niveau de l'entrée Audio In.", ref: OM(22) },
  a11: { id: "a11", de: "inputlevel", vers: "thru", sorte: "interp", texte: "Le manuel ne dit pas si Input Level agit aussi sur le signal transmis par Audio In Thru." },
  a12: { id: "a12", de: "thru", vers: "out", sorte: "manuel", texte: "Audio In Thru transmet le signal de la prise Audio In aux sorties Audio Out L/R.", ref: PG(7) },
};

/** Lignes du schéma : blocs et flèches en alternance. */
export const RANGEES = [
  { id: "partie", titre: "Dans chaque partie (× 16)", ref: OM(27), items: ["osc", "a1", "filter", "a2", "amp", "a3", "ifx", "a4", "send"] },
  { id: "motif", titre: "Dans le motif", ref: OM(27), items: ["mfx", "a6", "mix", "a7", "patlevel", "a8", "volume", "a9", "out"] },
  { id: "entree", titre: "Entrée audio", ref: OM(22), items: ["audioin", "a10", "inputlevel", "a11", "thru", "a12", "out"] },
];

/** Destinations du potard Modulation (Guide p. 14) → bloc concerné. */
export const MOD_CIBLES = [
  { label: "Coupure du filtre", bloc: "filter" },
  { label: "Hauteur", bloc: "osc" },
  { label: "OSC Edit", bloc: "osc" },
  { label: "Volume (Level)", bloc: "amp" },
  { label: "Pan", bloc: "amp" },
  { label: "IFX Edit", bloc: "ifx" },
];
