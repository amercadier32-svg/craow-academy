// Recettes de sons et de parties par style (data/electribe2/styles.json : Tribe, Acid tribe, Mentale, Hardtek, Tekno, Raggatek, Dub tekno), sur 4 mesures (64 pas).
// Ce sont des propositions (badge « Pratique ») : chaque réglage utilise un paramètre du manuel
// (data/electribe2/parameters.json) et chaque type (oscillateur, filtre, modulation, effet, gamme) vient des listes du Guide.
// Les valeurs de potards sans plage dans le manuel sont marquées « à vérifier sur l'écran » (v).
// npm run check vérifie que chaque valeur de liste (r) existe vraiment.
//
// Mesures : un caractère par pas, 16 par mesure (voir pas() dans lib/seq.ts).
//   "."  silence      "x"  un coup (percussion)      "0"…"9"  rang de la note dans la gamme (0 = KEY)
//   "O"  la KEY une octave plus haut                 "~"  la note d'avant continue (GATE TIME = TIE)
// Mesures 1 à 3 : le motif de base avec de petites variations. Mesure 4 : la relance.
import type { Source } from "../lib/data";
import { pas, type Pas, type Son } from "../lib/seq";
import { RECETTES_RYTHME } from "./recettesRythme";
import { RECETTES_BASSE } from "./recettesBasse";
import { RECETTES_MELODIE } from "./recettesMelodie";
import { RECETTES_AMBIANCE } from "./recettesAmbiance";
import { RECETTES_TRANSITIONS } from "./recettesTransitions";
import { RECETTES_TOMS } from "./recettesToms";
import { RECETTES_RYTHME_STYLES } from "./recettesStylesRythme";
import { RECETTES_STYLES_SUITE } from "./recettesStylesSuite";

/** Réglage d'un paramètre. `aVerifier` : valeur de potard proposée, le manuel ne donne pas la plage. */
export interface Reglage { param: string; valeur: string; aVerifier?: boolean }
const r = (param: string, valeur: string): Reglage => ({ param, valeur });   // valeur tirée d'une liste du manuel
const v = (param: string, valeur: string): Reglage => ({ param, valeur, aVerifier: true });

import type { Style } from "./styles";
export type { Style, StyleBase } from "./styles";
export { STYLE_NOM } from "./styles";
export type Fonction = "kick" | "basse" | "lead" | "percussion" | "nappe" | "effet";
export const FONCTIONS: { id: Fonction; nom: string }[] = [
  { id: "kick", nom: "Kick" }, { id: "basse", nom: "Basse" }, { id: "lead", nom: "Lead / stab" },
  { id: "percussion", nom: "Percussion" }, { id: "nappe", nom: "Nappe" }, { id: "effet", nom: "Effet" },
];

// Organisation : catégorie, puis élément (kick, charleston fermé, sub, nappe, montée…).
export type ElementId =
  | "kick" | "hat-ferme" | "hat-ouvert" | "clap" | "snare" | "toms" | "congas" | "shaker" | "ride" | "roll"
  | "sub" | "basse-roulante" | "acid" | "reese"
  | "lead" | "arpege" | "stab" | "riff"
  | "nappe" | "drone" | "noise" | "voix"
  | "montee" | "break" | "fill" | "coupure" | "impact";
export const CATEGORIES: { id: string; nom: string; elements: { id: ElementId; nom: string }[] }[] = [
  { id: "rythmique", nom: "Rythmique", elements: [
    { id: "kick", nom: "Kick" }, { id: "hat-ferme", nom: "Charleston fermé" }, { id: "hat-ouvert", nom: "Charleston ouvert" },
    { id: "clap", nom: "Clap" }, { id: "snare", nom: "Caisse claire" }, { id: "toms", nom: "Toms" },
    { id: "congas", nom: "Congas et percussions tribales" }, { id: "shaker", nom: "Shaker" }, { id: "ride", nom: "Ride et cymbale" },
    { id: "roll", nom: "Roulement" },
  ] },
  { id: "basse", nom: "Basse", elements: [
    { id: "sub", nom: "Sub" }, { id: "basse-roulante", nom: "Basse roulante" }, { id: "acid", nom: "Acid" }, { id: "reese", nom: "Reese" },
  ] },
  { id: "melodie", nom: "Mélodie", elements: [
    { id: "lead", nom: "Lead" }, { id: "arpege", nom: "Arpège" }, { id: "stab", nom: "Stab" }, { id: "riff", nom: "Riff court / motif" },
  ] },
  { id: "ambiance", nom: "Ambiance", elements: [
    { id: "nappe", nom: "Nappe" }, { id: "drone", nom: "Drone" }, { id: "noise", nom: "Noise / bruit" }, { id: "voix", nom: "Voix / sample vocal" },
  ] },
  { id: "transitions", nom: "Effets et transitions", elements: [
    { id: "montee", nom: "Montée (riser / sweep)" }, { id: "break", nom: "Break" }, { id: "fill", nom: "Fill" },
    { id: "coupure", nom: "Coupure" }, { id: "impact", nom: "Impact / boom" },
  ] },
];
export const ELEMENTS = new Map(CATEGORIES.flatMap((c) => c.elements.map((e) => [e.id, { ...e, categorie: c.id }])));

/** `mesures` : une autre séquence de 4 mesures (sinon la séquence de la recette). `ton` : KEY / SCALE de cette séquence. */
export interface Variante { nom: string; idee: string; reglages: Reglage[]; mesures?: Pas[][]; ton?: { key: string; scale: number } }

export interface Recette {
  id: string;
  nom: string;
  styles: Style[];
  fonction: Fonction;
  element?: ElementId;         // élément de la catégorie (les premières recettes le reçoivent par ELEMENT_DES_PREMIERES)
  bpm?: number;                // BPM de l'aperçu, 165 sinon
  idee: string;                // ce que la recette cherche à faire (Pratique)
  partie: number;              // partie conseillée (1-16)
  reglages: Reglage[];
  melodique?: { key: string; scale: number };   // KEY et SCALE du motif
  mesures: Pas[][];            // 4 mesures de 16 pas
  relance: string;             // ce que fait la mesure 4
  apercu: { son: Son; octave: number };          // voix de l'aperçu (approximation)
  variantes: Variante[];
  astuces?: { texte: string; ref?: Source }[];
  exercices?: string[];
  /** Kit : plusieurs recettes jouées ensemble sur plusieurs parties (affiché comme une grille). */
  kit?: { lecture: string[]; pistes: { recette: string; mesures: Pas[][] }[] };
  /** Recette proposée par « Analyser une référence » (badge « D'après une référence ») : nom du morceau analysé. */
  origine?: { type: "reference"; morceau: string; analyse?: string };
}

const PG = (page: number): Source => ({ doc: "PG", page });
const OM = (page: number): Source => ({ doc: "OM", page });
const M = (...m: [string, string, string, string]) => m.map(pas);

const PREMIERES: Recette[] = [
  // =================== TEKNO ===================
  {
    id: "kick-tekno", nom: "Kick tekno qui cogne", styles: ["tekno"], fonction: "kick", partie: 1,
    idee: "Un kick court et dur sur chaque temps, sans effet master pour qu'il reste net.",
    reglages: [
      r("osc.type", "6 Hardcore"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "60"), v("amp.level", "110"),
      r("ifx.on", "ON"), r("ifx.type", "1 Punch"), v("ifx.edit", "64"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x...x.x."),
    relance: "Un coup en plus sur le pas 4.15 juste avant de reboucler.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Plus sec, pour 170 BPM", idee: "Le kick s'arrête plus vite et laisse de la place à la basse.", reglages: [v("amp.decay", "40")] },
      { nom: "Plus sale", idee: "L'Overdrive arrondit et salit l'attaque.", reglages: [r("ifx.type", "2 Overdrive"), v("ifx.edit", "80")] },
    ],
    exercices: ["ex.decay", "ex.ifxedit"],
  },
  {
    id: "basse-roulante", nom: "Basse roulante entre les kicks", styles: ["tekno"], fonction: "basse", partie: 2,
    idee: "Trois notes entre chaque kick : la basse remplit les trous et fait rouler le morceau.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "326 SAW"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "40"), v("filter.resonance", "30"), v("filter.egint", "50"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "30"),
      r("mfx.send", "OFF"),
    ],
    mesures: M(".000.000.000.030", ".000.000.000.040", ".000.000.000.0O0", ".000.000.0.0.343"),
    relance: "La fin monte G, A, G pour retomber sur D au début.",
    apercu: { son: "synth", octave: 0 },
    variantes: [
      { nom: "Basse qui marche dans la gamme", idee: "La basse roulante passe par 4 notes de la gamme au lieu de rester sur D : change la SCALE et tu entends tout de suite la couleur changer. (Séquence à plusieurs notes, pour entendre la gamme.)", reglages: [],
        mesures: M(".000.000.222.000", ".000.000.444.333", ".000.000.222.000", ".444.333.222.1O0") },
      { nom: "Plus de mordant", idee: "Le filtre claque plus à chaque note.", reglages: [v("filter.resonance", "60"), v("filter.egint", "70")] },
      { nom: "Plus creuse", idee: "Une onde carrée, plus creuse que la dent de scie.", reglages: [r("osc.type", "328 PULSE")] },
    ],
    exercices: ["ex.cutoff", "ex.egint"],
  },
  {
    id: "lead-acide", nom: "Lead acide qui siffle", styles: ["tekno"], fonction: "lead", partie: 3,
    idee: "Filtre Acid très résonant que l'enveloppe ouvre à chaque note, glissé et saturé.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "326 SAW"), r("part.voiceassign", "Mono1"), v("osc.glide", "20"),
      r("filter.lpf", "Acid LPF"), v("filter.cutoff", "30"), v("filter.resonance", "100"), v("filter.egint", "90"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "50"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("00O0203000O04321", "00O0203000O04321", "00O0203000O05432", "00O02030O0O0O~~~"),
    relance: "Des sauts d'octave puis une note tenue qui retombe sur la mesure 1.",
    apercu: { son: "synth", octave: 1 },
    variantes: [
      { nom: "Acide qui monte la gamme", idee: "Le lead monte la gamme note par note puis redescend : idéal pour entendre chaque gamme en entier. (Séquence à plusieurs notes, pour entendre la gamme.)", reglages: [],
        mesures: M("0123O0123O012345", "0123O0123O012345", "0O1O2O3O4O5O6OO~", "6543210.0.0.0O~~") },
      { nom: "Plus agressive", idee: "Plus de résonance et de distorsion.", reglages: [v("filter.resonance", "115"), v("ifx.edit", "90")] },
      { nom: "Plus douce", idee: "Le filtre MS20 siffle moins que l'Acid.", reglages: [r("filter.lpf", "MS20 LPF")] },
    ],
    astuces: [
      { texte: "Mono1 joue legato : deux notes qui se suivent ne relancent pas l'enveloppe, le glide s'entend mieux.", ref: PG(4) },
      { texte: "Enregistre un mouvement du potard Filter en Motion Sequence pour qu'il évolue tout seul.", ref: OM(31) },
    ],
    exercices: ["ex.resonance", "ex.glide", "ex.filters"],
  },
  {
    id: "stab-tekno", nom: "Stab tekno à contretemps", styles: ["tekno"], fonction: "lead", partie: 4,
    idee: "Un accord court qui tombe entre les kicks, avec un écho à la croche.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "292 Stabium"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "electribe LPF"), v("filter.cutoff", "80"), v("filter.resonance", "20"),
      r("amp.eg", "ON"), v("amp.decay", "25"),
      r("ifx.on", "ON"), r("ifx.type", "20 Delay 1/8"), v("ifx.edit", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..0..0....0..0..", "..0..0....0..0..", "..0..0....0..3..", "..0..0..3.3.4.4."),
    relance: "Les stabs se rapprochent et montent (G puis A) pour annoncer la boucle suivante.",
    apercu: { son: "stab", octave: 1 },
    variantes: [
      { nom: "Stabs qui changent d'accord", idee: "Les stabs partent de 3 notes différentes de la gamme : chaque accord change de couleur avec la SCALE. (Séquence à plusieurs notes, pour entendre la gamme.)", reglages: [],
        mesures: M("..0..0....0..0..", "..2..2....2..2..", "..4..4....3..3..", "..0..0..2.2.4.4.") },
      { nom: "Gros accords", idee: "Un autre son d'accord de la liste Synth Hit.", reglages: [r("osc.type", "297 BigChords")] },
      { nom: "Sans écho", idee: "Plus sec, plus percussif.", reglages: [r("ifx.on", "OFF")] },
    ],
    astuces: [{ texte: "L'aperçu joue un accord de 3 notes de la gamme. Stabium a son propre son d'accord : écoute la différence sur la machine." }],
    exercices: ["ex.decay", "ex.ifxedit"],
  },
  {
    id: "hat-ferme", nom: "Charley fermé qui court", styles: ["tekno"], fonction: "percussion", partie: 5,
    idee: "Un charley fermé presque sur chaque double-croche, avec un trou là où tape le charley ouvert.",
    reglages: [
      r("osc.type", "135 EightClose1"), v("amp.decay", "20"), v("amp.level", "80"), v("amp.pan", "70"),
      r("mfx.send", "ON"),
    ],
    mesures: M("xx.xxx.xxx.xxx.x", "xx.xxx.xxx.xxx.x", "xx.xxx.xxx.xxxxx", "xx.xxx.xxxxxxxxx"),
    relance: "Le trou se remplit : un roulement continu sur la fin.",
    apercu: { son: "hat", octave: 0 },
    variantes: [
      { nom: "Plus métallique", idee: "Le charley fermé 909 de la liste.", reglages: [r("osc.type", "131 NineClose1")] },
      { nom: "Qui bouge", idee: "Le charley se déplace un peu à chaque coup.", reglages: [r("mod.type", "71 Random Pan"), v("mod.depth", "40")] },
    ],
    exercices: ["ex.pan", "ex.decay"],
  },
  {
    id: "hat-ouvert", nom: "Charley ouvert à contretemps", styles: ["tekno"], fonction: "percussion", partie: 6,
    idee: "Le « tchi » ouvert entre les temps, qui répond au kick.",
    reglages: [
      r("osc.type", "136 EightOpen1"), v("amp.decay", "50"), v("amp.level", "85"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x.x.xx"),
    relance: "Deux coups de plus à la fin pour pousser vers la mesure 1.",
    apercu: { son: "openhat", octave: 0 },
    variantes: [
      { nom: "Plus court", idee: "Le charley se ferme plus vite.", reglages: [v("amp.decay", "30")] },
      { nom: "Version 909", idee: "Le charley ouvert 909 de la liste.", reglages: [r("osc.type", "132 NineOpen1")] },
    ],
    exercices: ["ex.decay"],
  },
  {
    id: "clap-tekno", nom: "Clap sur 2 et 4", styles: ["tekno"], fonction: "percussion", partie: 7,
    idee: "Le clap sur le 2e et le 4e temps, avec une petite pièce derrière grâce au Master Fx.",
    reglages: [
      r("osc.type", "122 Clapper"), v("amp.decay", "40"),
      r("mfx.send", "ON"), r("pat.mfxtype", "5 Room Reverb"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x.......x.xx"),
    relance: "Deux claps rapides à la fin.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Plus sec", idee: "Le clap ne va plus dans le Master Fx.", reglages: [r("mfx.send", "OFF")] },
      { nom: "Plus brillant", idee: "Un autre clap de la liste.", reglages: [r("osc.type", "127 Crispy")] },
    ],
    astuces: [{ texte: "Le type de Master Fx est réglé pour tout le motif : toutes les parties avec MFX Send = ON l'entendent.", ref: PG(3) }],
    exercices: ["ex.chain.send"],
  },
  {
    id: "nappe-tekno", nom: "Nappe sombre qui respire", styles: ["tekno"], fonction: "nappe", partie: 8,
    idee: "Une note tenue par mesure, le filtre bouge lentement : un fond sombre sous le rythme.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "339 UNI-SAW"), r("part.voiceassign", "Poly1"),
      r("filter.lpf", "OB LPF"), v("filter.cutoff", "55"), v("filter.resonance", "20"),
      r("mod.type", "25 LFOTri Filter"), v("mod.depth", "30"), v("mod.speed", "30"),
      r("amp.eg", "ON"), v("amp.attack", "70"), v("amp.decay", "110"),
      r("ifx.on", "ON"), r("ifx.type", "27 Chorus"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "5~~~~~~~~~~~~~~~", "4~~~~~~~~~~~3~~~"),
    relance: "La nappe passe par A puis G pour ramener vers D.",
    apercu: { son: "pad", octave: 1 },
    variantes: [
      { nom: "Plus sombre", idee: "Le filtre plus fermé.", reglages: [v("filter.cutoff", "35")] },
      { nom: "Plus vivante", idee: "Le filtre bouge plus vite.", reglages: [v("mod.speed", "60")] },
    ],
    astuces: [{ texte: "GATE TIME = TIE lie la note à la suivante sans la relancer.", ref: PG(5) }],
    exercices: ["ex.attack", "ex.speed"],
  },
  {
    id: "montee-tekno", nom: "Montée de bruit filtré", styles: ["tekno"], fonction: "effet", partie: 9,
    idee: "Un bruit qui monte pendant la dernière mesure pour annoncer le retour du kick.",
    reglages: [
      r("osc.type", "377 HPF NOISE"),
      r("filter.bpf", "MS20 BPF"), v("filter.cutoff", "30"), v("filter.resonance", "70"),
      r("mod.type", "37 SawUpB Filter"), v("mod.depth", "90"),
      r("amp.eg", "ON"), v("amp.decay", "127"), r("step.gate", "TIE"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..............0~", "..............0~", "............0~~~", "0~~~~~~~~~~~~~~~"),
    relance: "Toute la mesure 4 est une montée.",
    apercu: { son: "riser", octave: 0 },
    variantes: [
      { nom: "Montée au pad tactile", idee: "Toutes les parties sauf le kick passent dans un passe-haut master : tu vides le grave avec le doigt, puis tu relâches.", reglages: [r("pat.mfxtype", "19 High Pass Filter"), r("mfx.send", "ON"), r("mfx.hold", "OFF")] },
      { nom: "Montée plus grave", idee: "Un bruit filtré passe-bas.", reglages: [r("osc.type", "378 LPF NOISE")] },
    ],
    astuces: [
      { texte: "Pour la variante au pad tactile : allume Master Fx, puis MFX Send sur chaque partie à filtrer (pas le kick).", ref: OM(29) },
      { texte: "Shift + Master Fx ouvre la page MFX TYPE.", ref: PG(10) },
      { texte: "MFX Hold garde l'effet là où tu as levé le doigt.", ref: OM(22) },
    ],
    exercices: ["ex.mfxxy", "ex.depth"],
  },

  // =================== TRIBE ===================
  {
    id: "kick-tribe", nom: "Kick tribe saturé", styles: ["tribe"], fonction: "kick", partie: 1,
    idee: "Kick plus long et sali par l'Overdrive, avec des coups en plus qui font sauter le rythme.",
    reglages: [
      r("osc.type", "27 Harder"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "80"),
      r("ifx.on", "ON"), r("ifx.type", "2 Overdrive"), v("ifx.edit", "70"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x..x", "x...x...x.x.x.xx"),
    relance: "Le kick double sur la fin : la relance typique de la tribe.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Plus long", idee: "Le kick tient plus, plus « boum ».", reglages: [v("amp.decay", "100")] },
      { nom: "Plus gras", idee: "Un autre kick de la liste.", reglages: [r("osc.type", "30 Filthy")] },
    ],
    exercices: ["ex.decay", "ex.ifxedit"],
  },
  {
    id: "sub-tribe", nom: "Sub à contretemps", styles: ["tribe"], fonction: "basse", partie: 2,
    idee: "Une sinusoïde très grave entre les kicks : on la sent plus qu'on ne l'entend.",
    melodique: { key: "D", scale: 29 },
    reglages: [
      r("osc.type", "330 SINE"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "45"), v("amp.level", "100"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("..0...0...0...0.", "..0...0...0...0.", "..0...0...0...1.", "..0...0...0.0.O."),
    relance: "Deux notes de plus, la dernière une octave plus haut.",
    apercu: { son: "sub", octave: 0 },
    variantes: [
      { nom: "Sub sur trois notes", idee: "Le sub joue les 3 notes de Bass Line (tonique, quinte, septième) au lieu de la seule tonique. (Séquence à plusieurs notes, pour entendre la gamme.)", reglages: [],
        mesures: M("..0...0...1...0.", "..0...2...1...0.", "..0...0...1...2.", "..1...1...2.0.O.") },
      { nom: "Sub qui grogne", idee: "Un peu d'Overdrive pour l'entendre sur des petites enceintes.", reglages: [r("ifx.on", "ON"), r("ifx.type", "2 Overdrive"), v("ifx.edit", "30")] },
      { nom: "Plus court", idee: "Plus de place pour le kick.", reglages: [v("amp.decay", "25")] },
    ],
    exercices: ["ex.decay", "ex.level"],
  },
  {
    id: "basse-hachee", nom: "Basse hachée qui saute d'octave", styles: ["tribe"], fonction: "basse", partie: 3,
    idee: "Avec la gamme Octave, tous les pads jouent la même note sur plusieurs octaves : impossible de sortir de la tonalité.",
    melodique: { key: "D", scale: 35 },
    reglages: [
      r("osc.type", "335 OCT-SAW"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "50"), v("filter.resonance", "40"), v("filter.egint", "40"),
      r("amp.eg", "ON"), v("amp.decay", "35"),
      r("ifx.on", "ON"), r("ifx.type", "2 Overdrive"), v("ifx.edit", "40"),
    ],
    mesures: M(".0O0.0O0.0O0.O0O", ".0O0.0O0.0O0.O0O", ".0O0.0O0.0OO.O0O", ".0O0.0O0.O.O.O.O"),
    relance: "Seulement l'octave haute, une note sur deux : ça tire vers la mesure 1.",
    apercu: { son: "synth", octave: 0 },
    variantes: [
      { nom: "Basse hachée en mineur", idee: "Même rythme, mais en SCALE = Aeolian : la basse saute d'octave en passant par 5 notes de la gamme. (Séquence à plusieurs notes, pour entendre la gamme.)", reglages: [],
        mesures: M(".0O0.0O0.2O2.0O0", ".0O0.0O0.4O4.3O3", ".0O0.0O0.2O2.0O0", ".4O4.3O3.2O2.1O1"),
        ton: { key: "D", scale: 7 } },
      { nom: "Plus hachée", idee: "Notes plus courtes.", reglages: [v("amp.decay", "20")] },
      { nom: "Basse acide", idee: "Le filtre Acid, plus de résonance.", reglages: [r("filter.lpf", "Acid LPF"), v("filter.resonance", "90")] },
    ],
    exercices: ["ex.oscedit", "ex.resonance"],
  },
  {
    id: "percu-tresillo", nom: "Djembé en tresillo", styles: ["tribe"], fonction: "percussion", partie: 4,
    idee: "Le rythme 3 + 3 + 2 (tresillo) qui fait danser la tribe, avec un écho et une hauteur qui varie.",
    reglages: [
      r("osc.type", "214 Djembe1"),
      r("mod.type", "68 Random Pitch"), v("mod.depth", "20"), v("mod.speed", "64"),
      r("ifx.on", "ON"), r("ifx.type", "21 Delay 1/16"), v("ifx.edit", "40"),
      v("amp.pan", "40"), r("mfx.send", "ON"),
    ],
    mesures: M("x..x..x.x..x..x.", "x..x..x.x..x..x.", "x..x..x.x..x.xx.", "x..x..x.x.x.xxxx"),
    relance: "Le tresillo se remplit en roulement.",
    apercu: { son: "perc", octave: 2 },
    variantes: [
      { nom: "Conga", idee: "Un son plus rond.", reglages: [r("osc.type", "203 Conga1")] },
      { nom: "Darbuka sèche", idee: "Plus claquant, sans écho.", reglages: [r("osc.type", "218 Darbuka1"), r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.depth", "ex.ifxedit"],
  },
  {
    id: "toms-tribaux", nom: "Toms tribaux accordés", styles: ["tribe"], fonction: "percussion", partie: 5,
    idee: "Des toms qui jouent la tonique et la quinte de la tonalité : ils sonnent « juste » avec la basse.",
    melodique: { key: "D", scale: 34 },
    reglages: [
      r("osc.type", "199 Synth Lo1"), v("amp.decay", "50"),
      r("ifx.on", "ON"), r("ifx.type", "18 Delay 1/4"), v("ifx.edit", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0.....1...0..1..", "0.....1...0..1..", "0.....1...0..1.2", "2.2.1.1.0.0.0.00"),
    relance: "Un roulement qui descend : octave, quinte, tonique.",
    apercu: { son: "tom", octave: 1 },
    variantes: [
      { nom: "Tom plus aigu", idee: "Un autre tom de la liste.", reglages: [r("osc.type", "197 Synth Hi1")] },
      { nom: "Sans écho", idee: "Plus sec.", reglages: [r("ifx.on", "OFF")] },
    ],
    astuces: [{ texte: "La note d'une percussion se règle aussi pas par pas avec NOTE dans Step Edit.", ref: PG(5) }],
    exercices: ["ex.pitch"],
  },
  {
    id: "lead-hypnotique", nom: "Lead hypnotique en boucle de 3", styles: ["tribe"], fonction: "lead", partie: 6,
    idee: "Un motif de 3 pas répété sur 16 : il retombe chaque fois ailleurs par rapport au kick, ce qui hypnotise.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "343 SYNC-SAW"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "60"), v("filter.resonance", "50"), v("filter.egint", "40"),
      r("amp.eg", "ON"), v("amp.decay", "30"),
      r("ifx.on", "ON"), r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("1.01.01.01.01.01", "1.01.01.01.01.01", "1.01.01.01.01.03", "1.01.01.03.03.0O"),
    relance: "Le motif monte vers G puis l'octave.",
    apercu: { son: "synth", octave: 2 },
    variantes: [
      { nom: "Boucle de 3 qui voyage", idee: "La boucle de 3 pas monte d'un cran à chaque mesure, puis redescend : 5 notes de la gamme. (Séquence à plusieurs notes, pour entendre la gamme.)", reglages: [],
        mesures: M("2.12.12.12.12.12", "1.01.01.01.01.01", "3.23.23.23.23.23", "4.34.32.21.10.0O") },
      { nom: "Filtre qui tourne", idee: "Le LFO ouvre et ferme le filtre lentement.", reglages: [r("mod.type", "25 LFOTri Filter"), v("mod.depth", "30"), v("mod.speed", "20")] },
      { nom: "Écho plus long", idee: "Un écho à la noire.", reglages: [r("ifx.type", "18 Delay 1/4")] },
    ],
    exercices: ["ex.oscedit", "ex.ifxedit"],
  },
  {
    id: "drone-tribe", nom: "Drone tonique et quinte", styles: ["tribe"], fonction: "nappe", partie: 7,
    idee: "Une note tenue, saturée doucement, qui passe à la quinte sur la dernière mesure.",
    melodique: { key: "D", scale: 34 },
    reglages: [
      r("osc.type", "335 OCT-SAW"), r("part.voiceassign", "Poly1"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "45"), v("filter.resonance", "30"),
      r("mod.type", "25 LFOTri Filter"), v("mod.depth", "40"), v("mod.speed", "15"),
      r("amp.eg", "ON"), v("amp.attack", "90"), v("amp.decay", "120"),
      r("ifx.on", "ON"), r("ifx.type", "2 Overdrive"), v("ifx.edit", "20"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~1~~~~~~~"),
    relance: "Passage à la quinte (A) à la moitié de la mesure 4.",
    apercu: { son: "pad", octave: 1 },
    variantes: [
      { nom: "Drone qui bouge", idee: "Le LFO plus rapide.", reglages: [v("mod.speed", "40")] },
      { nom: "Plus saturé", idee: "Plus d'Overdrive.", reglages: [v("ifx.edit", "60")] },
    ],
    exercices: ["ex.attack", "ex.depth"],
  },
  {
    id: "break-tribe", nom: "Break et roulement de caisse", styles: ["tribe"], fonction: "effet", partie: 8,
    idee: "Presque rien pendant 3 mesures, puis un roulement de caisse claire qui annonce le retour.",
    reglages: [
      r("osc.type", "87 Snappy"), v("amp.decay", "30"),
      r("ifx.on", "ON"), r("ifx.type", "22 Roller 1/32"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("................", "................", "............x...", "x...x...x.x.xxxx"),
    relance: "Le roulement : des coups de plus en plus serrés.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Caisse plus dure", idee: "Une autre caisse claire de la liste.", reglages: [r("osc.type", "112 Blast")] },
      { nom: "Roulement filtré", idee: "Un passe-haut master à lever au doigt pendant le break.", reglages: [r("pat.mfxtype", "19 High Pass Filter")] },
    ],
    astuces: [{ texte: "Pendant le break, coupe le kick et la basse avec Part Mute, puis rallume-les sur la mesure 1.", ref: OM(32) }],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "shaker-tribe", nom: "Shaker continu", styles: ["tribe"], fonction: "percussion", partie: 9,
    idee: "Un shaker sur les double-croches, un peu à droite, pour la vitesse.",
    reglages: [
      r("osc.type", "232 Shaker"), v("amp.decay", "30"), v("amp.pan", "80"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxxxxx", "xxxxxxxxxxxxxxxx"),
    relance: "Toutes les double-croches : ça accélère sans changer de tempo.",
    apercu: { son: "shaker", octave: 0 },
    variantes: [
      { nom: "Tambourin", idee: "Plus brillant.", reglages: [r("osc.type", "227 Tambourine1")] },
      { nom: "Plus loin", idee: "Moins fort, au fond.", reglages: [v("amp.level", "60")] },
    ],
    exercices: ["ex.pan", "ex.level"],
  },

  // =================== MENTALE ===================
  {
    id: "kick-distordu", nom: "Kick mentale distordu", styles: ["mentale"], fonction: "kick", partie: 1,
    idee: "Un kick écrasé par la distorsion : il devient presque une note.",
    reglages: [
      r("osc.type", "30 Filthy"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "70"), v("amp.level", "110"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "80"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x..x", "x...x...x..xx.xx"),
    relance: "Des coups serrés à la fin.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Encore plus cassé", idee: "Le Decimator abîme le son.", reglages: [r("ifx.type", "4 Decimator"), v("ifx.edit", "60")] },
      { nom: "Plus de corps", idee: "Un kick plus grave.", reglages: [r("osc.type", "15 Subsonic")] },
    ],
    exercices: ["ex.ifxedit", "ex.decay"],
  },
  {
    id: "reese-mentale", nom: "Basse reese qui frotte", styles: ["mentale"], fonction: "basse", partie: 2,
    idee: "Deux dents de scie désaccordées : la basse « frotte » et bouge toute seule.",
    melodique: { key: "D", scale: 9 },
    reglages: [
      r("osc.type", "331 DUAL-SAW"), r("part.voiceassign", "Mono2"), v("osc.edit", "50"),
      r("filter.lpf", "OB LPF"), v("filter.cutoff", "45"), v("filter.resonance", "30"), v("filter.egint", "20"),
      r("mod.type", "25 LFOTri Filter"), v("mod.depth", "25"), v("mod.speed", "25"),
      r("amp.eg", "ON"), v("amp.decay", "90"),
      r("ifx.on", "ON"), r("ifx.type", "2 Overdrive"), v("ifx.edit", "50"),
      r("step.gate", "TIE"), r("mfx.send", "OFF"),
    ],
    mesures: M("0~~~0~~~0~~~1~~~", "0~~~0~~~0~~~1~~~", "0~~~0~~~5~~~4~~~", "0~0~0~0~6~6~6~6~"),
    relance: "La 7e note du mineur harmonique (C#) revient en boucle : tension maximale avant la mesure 1.",
    apercu: { son: "reese", octave: 0 },
    variantes: [
      { nom: "Reese qui monte et descend", idee: "Des notes longues sur 6 rangs de la gamme : avec Harm minor, on entend bien le saut de la 7e note. (Séquence à plusieurs notes, pour entendre la gamme.)", reglages: [],
        mesures: M("0~~~2~~~4~~~3~~~", "0~~~2~~~5~~~4~~~", "0~~~2~~~4~~~6~~~", "O~~~6~~~5~~~4~2~") },
      { nom: "Reese plus large", idee: "Plus d'écart entre les deux dents de scie.", reglages: [v("osc.edit", "64")] },
      { nom: "Reese UNI", idee: "Plusieurs dents de scie au lieu de deux.", reglages: [r("osc.type", "339 UNI-SAW")] },
    ],
    exercices: ["ex.oscedit", "ex.cutoff"],
  },
  {
    id: "lead-phrygien", nom: "Lead mentale phrygien", styles: ["mentale"], fonction: "lead", partie: 3,
    idee: "Une mélodie épaisse en Phrygian (le demi-ton après la tonique donne la tension) avec un léger vibrato.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "339 UNI-SAW"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "OB LPF"), v("filter.cutoff", "70"), v("filter.resonance", "60"),
      r("mod.type", "26 LFOTri Pitch"), v("mod.depth", "10"), v("mod.speed", "70"),
      r("amp.eg", "ON"), v("amp.attack", "10"), v("amp.decay", "90"),
      r("ifx.on", "ON"), r("ifx.type", "28 Flanger LFO"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0..1..0.4.3.1.0.", "0..1..0.4.3.1.0.", "0..1..0.4.3.1.2.", "0..1..0.5~~~4~~~"),
    relance: "Deux notes longues (A# puis A) qui retombent sur D.",
    apercu: { son: "pad", octave: 1 },
    variantes: [
      { nom: "Phrygien en escalier", idee: "Le lead parcourt toute la gamme en escalier : la 2e note (D# en Phrygian) ressort à chaque montée. (Séquence à plusieurs notes, pour entendre la gamme.)", reglages: [],
        mesures: M("01234321O.6.5.4.", "01234321O.6.5.4.", "0123432101234565", "6~~~5~~~4~~~1~0~") },
      { nom: "Plus de vibrato", idee: "Le LFO de hauteur plus profond.", reglages: [v("mod.depth", "25")] },
      { nom: "Plus perçant", idee: "Le filtre plus ouvert.", reglages: [v("filter.cutoff", "95")] },
    ],
    exercices: ["ex.depth", "ex.speed"],
  },
  {
    id: "acide-agressif", nom: "Acide agressif", styles: ["mentale"], fonction: "lead", partie: 4,
    idee: "Une ligne acide rapide en Phrygian, très résonante et très distordue.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "326 SAW"), r("part.voiceassign", "Mono1"), v("osc.glide", "25"),
      r("filter.lpf", "Acid LPF"), v("filter.cutoff", "25"), v("filter.resonance", "115"), v("filter.egint", "100"),
      r("amp.eg", "ON"), v("amp.decay", "40"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "90"),
      r("mfx.send", "ON"),
    ],
    mesures: M("001O0010O0100O10", "001O0010O0100O10", "001O0010O0100O13", "O1O1O1O1O0O0O~~~"),
    relance: "L'octave et le demi-ton (D#) alternent, puis une note tenue.",
    apercu: { son: "synth", octave: 1 },
    variantes: [
      { nom: "Acide qui parcourt la gamme", idee: "On garde le rebond sur la tonique, mais l'autre note monte la gamme à chaque fois. (Séquence à plusieurs notes, pour entendre la gamme.)", reglages: [],
        mesures: M("0O102O304O506O40", "0O102O304O506O40", "0O102O304O5O6OO0", "6543210O6543210~") },
      { nom: "Encore plus sale", idee: "Le Bit Crusher abîme le son.", reglages: [r("ifx.type", "5 Bit Crusher")] },
      { nom: "Acide qui bouge", idee: "Le filtre change au hasard à chaque pas.", reglages: [r("mod.type", "61 S&HBPM Filter"), v("mod.depth", "40")] },
    ],
    exercices: ["ex.resonance", "ex.egint", "ex.glide"],
  },
  {
    id: "noise-mentale", nom: "Bruits hachés", styles: ["mentale"], fonction: "percussion", partie: 5,
    idee: "Des coups de bruit filtrés au hasard : une texture inquiétante qui remplit les trous.",
    reglages: [
      r("osc.type", "379 LOFI NOISE"),
      r("filter.bpf", "MS20 BPF"), v("filter.cutoff", "70"), v("filter.resonance", "50"),
      r("mod.type", "67 Random Filter"), v("mod.depth", "60"),
      r("amp.eg", "ON"), v("amp.decay", "15"), v("amp.pan", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x..x..x..x", "..x...x..x..x..x", "..x...x..x..xx.x", "..x.x.x.xxxxxxxx"),
    relance: "Le bruit devient continu.",
    apercu: { son: "noise", octave: 0 },
    variantes: [
      { nom: "Bruit résonant", idee: "Un bruit qui siffle.", reglages: [r("osc.type", "380 RES NOISE")] },
      { nom: "Plus long", idee: "Chaque coup dure plus.", reglages: [v("amp.decay", "40")] },
    ],
    exercices: ["ex.depth", "ex.resonance"],
  },
  {
    id: "stab-dissonant", nom: "Stab dissonant", styles: ["mentale"], fonction: "lead", partie: 6,
    idee: "Un accord court en Locrian : la gamme la plus instable donne un accord qui grince.",
    melodique: { key: "D", scale: 8 },
    reglages: [
      r("osc.type", "297 BigChords"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "OB LPF"), v("filter.cutoff", "70"), v("filter.resonance", "30"),
      r("amp.eg", "ON"), v("amp.decay", "30"),
      r("ifx.on", "ON"), r("ifx.type", "25 Ring Delay 1"), v("ifx.edit", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..0.....0.....0.", "..0.....0.....0.", "..0.....0..1..0.", "..0..0..1..1.4.4"),
    relance: "Les stabs s'accélèrent et montent d'un demi-ton (D#) puis vers G#.",
    apercu: { son: "stab", octave: 1 },
    variantes: [
      { nom: "Stabs sur trois accords", idee: "Les stabs passent sur les rangs 0, 2, 3 et 4 de la gamme : avec Locrian, l'accord du rang 4 sonne très tendu. (Séquence à plusieurs notes, pour entendre la gamme.)", reglages: [],
        mesures: M("..0.....0.....0.", "..2.....2.....2.", "..4.....4.....3.", "..0..2..4..4.6.6") },
      { nom: "Métallique", idee: "Le Ring Modulator rend l'accord encore plus faux.", reglages: [r("ifx.type", "6 Ring Modulator"), v("ifx.edit", "60")] },
      { nom: "Autre accord", idee: "Un autre son d'accord.", reglages: [r("osc.type", "292 Stabium")] },
    ],
    astuces: [{ texte: "L'aperçu joue un accord de 3 notes de la gamme. BigChords a son propre son d'accord : écoute la différence sur la machine." }],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "montee-mentale", nom: "Montée qui siffle", styles: ["mentale"], fonction: "effet", partie: 7,
    idee: "Un bruit résonant qui monte sur une mesure et demie, saturé.",
    reglages: [
      r("osc.type", "380 RES NOISE"),
      r("filter.bpf", "Acid BPF"), v("filter.cutoff", "20"), v("filter.resonance", "100"),
      r("mod.type", "37 SawUpB Filter"), v("mod.depth", "100"),
      r("amp.eg", "ON"), v("amp.decay", "127"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "40"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("................", "................", "........0~~~~~~~", "0~~~~~~~~~~~~~~~"),
    relance: "La montée commence au milieu de la mesure 3 et explose sur la 4.",
    apercu: { son: "riser", octave: 0 },
    variantes: [
      { nom: "Qui siffle plus", idee: "Plus de résonance.", reglages: [v("filter.resonance", "120")] },
      { nom: "Avec écho master", idee: "La montée part dans un écho.", reglages: [r("pat.mfxtype", "2 Tape Delay")] },
    ],
    exercices: ["ex.resonance", "ex.depth"],
  },
  {
    id: "drone-sombre", nom: "Drone sombre", styles: ["mentale"], fonction: "nappe", partie: 8,
    idee: "Une note tenue dont le filtre respire, en mineur harmonique.",
    melodique: { key: "D", scale: 9 },
    reglages: [
      r("osc.type", "363 VPM-SAW"), r("part.voiceassign", "Poly1"),
      r("filter.lpf", "electribe LPF"), v("filter.cutoff", "50"),
      r("mod.type", "25 LFOTri Filter"), v("mod.depth", "40"), v("mod.speed", "20"),
      r("amp.eg", "ON"), v("amp.attack", "100"), v("amp.decay", "120"),
      r("ifx.on", "ON"), r("ifx.type", "27 Chorus"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~5~~~6~~~"),
    relance: "A# puis C# : les deux notes qui donnent sa couleur orientale au mineur harmonique.",
    apercu: { son: "pad", octave: 1 },
    variantes: [
      { nom: "Plus lent", idee: "Le filtre respire plus lentement.", reglages: [v("mod.speed", "10")] },
      { nom: "Plus froid", idee: "Un autre oscillateur.", reglages: [r("osc.type", "355 X-SAW 1")] },
    ],
    astuces: [{ texte: "GATE TIME = TIE lie la note à la suivante identique, sans la relancer : le son tient d'une mesure à l'autre.", ref: PG(5) }],
    exercices: ["ex.attack", "ex.chain.egamp"],
  },
  {
    id: "clap-mentale", nom: "Clap cassé", styles: ["mentale"], fonction: "percussion", partie: 9,
    idee: "Un clap passé au Bit Crusher, sec et abîmé.",
    reglages: [
      r("osc.type", "127 Crispy"), v("amp.decay", "30"),
      r("ifx.on", "ON"), r("ifx.type", "5 Bit Crusher"), v("ifx.edit", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x..x", "....x...x.x.xxxx"),
    relance: "Un roulement de claps sur la fin.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Caisse claire", idee: "Une caisse claire dure à la place du clap.", reglages: [r("osc.type", "112 Blast")] },
      { nom: "Moins cassé", idee: "Moins de Bit Crusher.", reglages: [v("ifx.edit", "30")] },
    ],
    exercices: ["ex.ifxedit"],
  },
];

// Élément des 27 premières recettes.
const ELEMENT_DES_PREMIERES: Record<string, ElementId> = {
  "kick-tekno": "kick", "kick-tribe": "kick", "kick-distordu": "kick",
  "hat-ferme": "hat-ferme", "hat-ouvert": "hat-ouvert", "clap-tekno": "clap", "clap-mentale": "clap",
  "percu-tresillo": "congas", "toms-tribaux": "toms", "shaker-tribe": "shaker",
  "basse-roulante": "basse-roulante", "basse-hachee": "basse-roulante", "sub-tribe": "sub", "reese-mentale": "reese",
  "lead-acide": "acid", "acide-agressif": "acid",
  "lead-hypnotique": "lead", "lead-phrygien": "lead", "stab-tekno": "stab", "stab-dissonant": "stab",
  "nappe-tekno": "nappe", "drone-tribe": "drone", "drone-sombre": "drone", "noise-mentale": "noise",
  "montee-tekno": "montee", "montee-mentale": "montee", "break-tribe": "break",
};

export const RECETTES: (Recette & { element: ElementId })[] = [...PREMIERES, ...RECETTES_RYTHME, ...RECETTES_RYTHME_STYLES, ...RECETTES_TOMS, ...RECETTES_BASSE, ...RECETTES_MELODIE, ...RECETTES_AMBIANCE, ...RECETTES_TRANSITIONS, ...RECETTES_STYLES_SUITE]
  .map((x) => ({ ...x, element: x.element ?? ELEMENT_DES_PREMIERES[x.id] ?? "fill" }));


/** Potards que l'aperçu sait imiter. */
export const KNOBS_APERCU = ["filter.cutoff", "filter.resonance", "filter.egint", "amp.attack", "amp.decay", "amp.level", "amp.pan", "osc.edit", "osc.glide", "mod.depth", "mod.speed", "ifx.edit"];
