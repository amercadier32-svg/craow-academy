// Recettes BASSE : sub, basse roulante, acid, reese. Mêmes règles que recettes.ts (badge « Pratique ») :
//   r(id, valeur) = valeur prise dans une liste du manuel (vérifiée par npm run check),
//   v(id, valeur) = valeur de potard sans plage dans le manuel, affichée « à vérifier sur l'écran ».
// Mesures : "." silence, "0"…"9" rang de la note dans la gamme, "O" la KEY une octave plus haut, "~" note tenue.
import type { Source } from "../lib/data";
import { pas } from "../lib/seq";
import type { Recette, Reglage } from "./recettes";

const r = (param: string, valeur: string): Reglage => ({ param, valeur });
const v = (param: string, valeur: string): Reglage => ({ param, valeur, aVerifier: true });
const PG = (page: number): Source => ({ doc: "PG", page });
const OM = (page: number): Source => ({ doc: "OM", page });
const M = (...m: [string, string, string, string]) => m.map(pas);

export const RECETTES_BASSE: Recette[] = [
  // =================== SUB ===================
  {
    id: "sub-pompe-tekno", nom: "Sub qui pompe", styles: ["tekno"], fonction: "basse", element: "sub", partie: 2,
    idee: "Une sinusoïde tenue en continu, creusée sur chaque temps par le Pumper : le sub laisse passer le kick, comme un sidechain.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "330 SINE"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "100"), v("amp.level", "100"),
      r("ifx.on", "ON"), r("ifx.type", "36 Pumper"), v("ifx.edit", "80"),
      r("step.gate", "TIE"), r("mfx.send", "OFF"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~5~~~~~~~", "3~~~~~~~4~~~6~~~"),
    relance: "Le sub change de note trois fois : C, D# puis F en KEY = D Aeolian, puis retombe sur D.",
    apercu: { son: "sub", octave: 0 },
    variantes: [
      { nom: "Sans pompe", idee: "Pour entendre le rôle du Pumper.", reglages: [r("ifx.on", "OFF")] },
      { nom: "Off Beater", idee: "Le creux est plus marqué.", reglages: [r("ifx.type", "35 Off Beater")] },
    ],
    astuces: [{ texte: "GATE TIME = TIE : la note dure jusqu'à la suivante.", ref: PG(5) }],
    exercices: ["ex.ifxedit", "ex.level"],
  },
  {
    id: "sub-glisse-mentale", nom: "Sub qui glisse d'octave", styles: ["mentale"], fonction: "basse", element: "sub", partie: 2, bpm: 175,
    idee: "Un sub en triangle qui glisse entre la tonique et l'octave : un grave qui « parle », très mentale.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "329 TRIANGLE"), r("part.voiceassign", "Mono1"), v("osc.glide", "40"),
      r("amp.eg", "ON"), v("amp.decay", "60"), v("amp.level", "100"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("..0...O...0...0.", "..0...O...0...1.", "..0...O...0...0.", "..0.O.0.O.1.1.O."),
    relance: "Le sub saute d'octave à chaque croche, et la 2e note du phrygien (D#) tire vers le bas.",
    apercu: { son: "sub", octave: 0 },
    variantes: [
      { nom: "Sans glissé", idee: "Les sauts deviennent nets.", reglages: [v("osc.glide", "0")] },
      { nom: "Plus rond", idee: "Une sinusoïde pure.", reglages: [r("osc.type", "330 SINE")] },
    ],
    astuces: [{ texte: "Mono1 joue legato : deux notes qui se suivent glissent sans relancer l'enveloppe.", ref: PG(4) }],
    exercices: ["ex.glide"],
  },
  {
    id: "sub-galop-tribe", nom: "Sub au galop", styles: ["tribe"], fonction: "basse", element: "sub", partie: 2,
    idee: "Deux notes de sub entre chaque kick, sur un rythme de galop : la basse danse avec le kick sans le couvrir.",
    melodique: { key: "D", scale: 29 },
    reglages: [
      r("osc.type", "338 OCT-SINE"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "35"), v("amp.level", "100"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("..0.0...0.0...0.", "..0.0...0.0...1.", "..0.0...0.0...0.", "..0.0...1.1.2.2."),
    relance: "La basse monte sur la quinte puis la septième de la gamme Bass Line.",
    apercu: { son: "sub", octave: 0 },
    variantes: [
      { nom: "Plus court", idee: "Plus percussif.", reglages: [v("amp.decay", "20")] },
      { nom: "Sinus simple", idee: "Sans l'octave ajoutée.", reglages: [r("osc.type", "330 SINE")] },
    ],
    exercices: ["ex.decay"],
  },
  {
    id: "sub-boom", nom: "Sub boom qui tombe", styles: ["tekno", "tribe"], fonction: "basse", element: "sub", partie: 2,
    idee: "Une note de sub par temps faible, dont la hauteur tombe à l'attaque grâce à l'enveloppe EG+ Pitch : un « boum » rond.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "334 DUAL-SINE"), r("part.voiceassign", "Mono2"),
      r("mod.type", "2 EG+ Pitch"), v("mod.depth", "40"), v("mod.speed", "40"),
      r("amp.eg", "ON"), v("amp.decay", "70"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("......0.......0.", "......0.......0.", "......0.......4.", "......0...3...4."),
    relance: "Une note de plus, qui prépare la quinte.",
    apercu: { son: "sub", octave: 0 },
    variantes: [
      { nom: "Chute plus forte", idee: "Plus de Depth.", reglages: [v("mod.depth", "80")] },
      { nom: "Sans chute", idee: "Une note stable.", reglages: [v("mod.depth", "0")] },
    ],
    exercices: ["ex.depth", "ex.speed"],
  },

  // =================== BASSE ROULANTE ===================
  {
    id: "roulante-tribe", nom: "Basse roulante tribe", styles: ["tribe"], fonction: "basse", element: "basse-roulante", partie: 2,
    idee: "Trois notes entre chaque kick avec une onde carrée et un filtre qui claque : la basse roule et sautille.",
    melodique: { key: "D", scale: 16 },
    reglages: [
      r("osc.type", "328 PULSE"), r("part.voiceassign", "Mono2"), v("osc.edit", "40"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "45"), v("filter.resonance", "40"), v("filter.egint", "60"),
      r("amp.eg", "ON"), v("amp.decay", "25"),
      r("mfx.send", "OFF"),
    ],
    mesures: M(".000.000.000.010", ".000.000.000.020", ".000.000.000.010", ".000.000.0O0.232"),
    relance: "La basse passe par l'octave puis la quinte et la quarte de la pentatonique.",
    apercu: { son: "square", octave: 0 },
    variantes: [
      { nom: "Plus ouverte", idee: "Le filtre s'ouvre.", reglages: [v("filter.cutoff", "70")] },
      { nom: "Dent de scie", idee: "Plus grasse.", reglages: [r("osc.type", "326 SAW")] },
    ],
    exercices: ["ex.cutoff", "ex.egint"],
  },
  {
    id: "roulante-mentale", nom: "Basse roulante phrygienne", styles: ["mentale"], fonction: "basse", element: "basse-roulante", partie: 2, bpm: 175,
    idee: "Une basse roulante en phrygien, avec la 2e note de la gamme (D#) qui donne une couleur sombre et orientale.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "343 SYNC-SAW"), r("part.voiceassign", "Mono2"), v("osc.edit", "50"),
      r("filter.lpf", "OB LPF"), v("filter.cutoff", "50"), v("filter.resonance", "50"), v("filter.egint", "50"),
      r("amp.eg", "ON"), v("amp.decay", "30"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "40"),
      r("mfx.send", "OFF"),
    ],
    mesures: M(".001.001.001.010", ".001.001.001.010", ".001.001.001.040", ".010.010.101.111"),
    relance: "La note D# prend le dessus : tension avant de revenir sur D.",
    apercu: { son: "synth", octave: 0 },
    variantes: [
      { nom: "Moins sale", idee: "Overdrive au lieu de Distortion.", reglages: [r("ifx.type", "2 Overdrive")] },
      { nom: "Sync plus marquée", idee: "Edit change la couleur de SYNC-SAW.", reglages: [v("osc.edit", "90")] },
    ],
    exercices: ["ex.oscedit", "ex.ifxedit"],
  },
  {
    id: "roulante-octave-tekno", nom: "Basse roulante en octaves", styles: ["tekno"], fonction: "basse", element: "basse-roulante", partie: 2,
    idee: "Une basse qui alterne grave et octave entre les kicks : elle roule et paraît plus rapide.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "335 OCT-SAW"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "electribe LPF"), v("filter.cutoff", "40"), v("filter.resonance", "30"), v("filter.egint", "50"),
      r("amp.eg", "ON"), v("amp.decay", "25"),
      r("mfx.send", "OFF"),
    ],
    mesures: M(".0O0.0O0.0O0.0O0", ".0O0.0O0.0O0.0O0", ".0O0.0O0.5O5.4O4", ".0O0.0O0.6O6.4O4"),
    relance: "Les notes changent sur la seconde moitié : la septième puis la quinte.",
    apercu: { son: "synth", octave: 0 },
    variantes: [
      { nom: "Plus sombre", idee: "Filtre plus fermé.", reglages: [v("filter.cutoff", "25")] },
      { nom: "Avec écho", idee: "Un Delay 3/16 qui croise la basse.", reglages: [r("ifx.on", "ON"), r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "20")] },
    ],
    exercices: ["ex.cutoff"],
  },

  // =================== ACID ===================
  {
    id: "acid-tribe", nom: "Acid dorienne qui sautille", styles: ["tribe"], fonction: "lead", element: "acid", partie: 4,
    idee: "Une acid plus joyeuse en dorien, avec une onde carrée : elle sautille au-dessus des percussions.",
    melodique: { key: "D", scale: 3 },
    reglages: [
      r("osc.type", "328 PULSE"), r("part.voiceassign", "Mono1"), v("osc.glide", "15"),
      r("filter.lpf", "Acid LPF"), v("filter.cutoff", "40"), v("filter.resonance", "90"), v("filter.egint", "70"),
      r("amp.eg", "ON"), v("amp.decay", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0.0O.03.0.0O.54.", "0.0O.03.0.0O.54.", "0.0O.03.0.0O.65.", "0.0O.0O.5.4.3.2."),
    relance: "La ligne descend la gamme dorienne jusqu'à la tonique.",
    apercu: { son: "square", octave: 1 },
    variantes: [
      { nom: "Plus résonante", idee: "Ça siffle plus.", reglages: [v("filter.resonance", "115")] },
      { nom: "Dent de scie", idee: "Plus agressive.", reglages: [r("osc.type", "326 SAW")] },
    ],
    exercices: ["ex.resonance", "ex.egint"],
  },
  {
    id: "acid-hasard-mentale", nom: "Acid au filtre aléatoire", styles: ["mentale"], fonction: "lead", element: "acid", partie: 4, bpm: 175,
    idee: "Une acid répétitive dont le filtre change au hasard à chaque palier : la même ligne ne sonne jamais pareil.",
    melodique: { key: "D", scale: 9 },
    reglages: [
      r("osc.type", "326 SAW"), r("part.voiceassign", "Mono1"), v("osc.glide", "20"),
      r("filter.lpf", "Acid LPF"), v("filter.cutoff", "35"), v("filter.resonance", "105"), v("filter.egint", "60"),
      r("mod.type", "61 S&HBPM Filter"), v("mod.depth", "60"), v("mod.speed", "90"),
      r("amp.eg", "ON"), v("amp.decay", "45"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("00600O0000600O00", "00600O0000600O00", "00600O0000600O66", "0O6O0O6O5O4O6O~~"),
    relance: "La septième (C#) alterne avec l'octave : tension maximale du mineur harmonique.",
    apercu: { son: "synth", octave: 1 },
    variantes: [
      { nom: "Aléatoire glissant", idee: "Random au lieu de S&H.", reglages: [r("mod.type", "67 Random Filter")] },
      { nom: "Sans hasard", idee: "Pour comparer.", reglages: [v("mod.depth", "0")] },
    ],
    exercices: ["ex.depth", "ex.speed", "ex.resonance"],
  },
  {
    id: "acid-delay-tekno", nom: "Acid qui laisse une traîne", styles: ["tekno"], fonction: "lead", element: "acid", partie: 4,
    idee: "Une acid courte avec un écho de 3 doubles-croches : les répétitions remplissent les trous et font rouler la ligne.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "344 SYNC-SQU"), r("part.voiceassign", "Mono1"), v("osc.glide", "25"),
      r("filter.lpf", "Acid LPF"), v("filter.cutoff", "30"), v("filter.resonance", "95"), v("filter.egint", "80"),
      r("amp.eg", "ON"), v("amp.decay", "35"),
      r("ifx.on", "ON"), r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0..0..O..0..3...", "0..0..O..0..4...", "0..0..O..0..3...", "0..0..O..O.O.O~~"),
    relance: "L'octave se répète et tient sur la fin.",
    apercu: { son: "square", octave: 1 },
    variantes: [
      { nom: "Écho en croches", idee: "Un rythme plus droit.", reglages: [r("ifx.type", "20 Delay 1/8")] },
      { nom: "Saturée", idee: "Overdrive au lieu de l'écho.", reglages: [r("ifx.type", "2 Overdrive")] },
    ],
    astuces: [{ texte: "Enregistre Cutoff en Motion Seq sur 4 mesures : l'acid s'ouvre toute seule.", ref: OM(31) }],
    exercices: ["ex.glide", "ex.ifxedit"],
  },

  // =================== REESE ===================
  {
    id: "reese-pompe-tekno", nom: "Reese qui pompe", styles: ["tekno"], fonction: "basse", element: "reese", partie: 2,
    idee: "Plusieurs dents de scie désaccordées, tenues et creusées sur chaque temps par le Pumper : une basse large qui respire.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "339 UNI-SAW"), r("part.voiceassign", "Mono2"), v("osc.edit", "50"),
      r("filter.lpf", "OB LPF"), v("filter.cutoff", "40"), v("filter.resonance", "20"),
      r("amp.eg", "ON"), v("amp.decay", "100"),
      r("ifx.on", "ON"), r("ifx.type", "36 Pumper"), v("ifx.edit", "70"),
      r("step.gate", "TIE"), r("mfx.send", "OFF"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "5~~~~~~~~~~~~~~~", "3~~~~~~~4~~~~~~~"),
    relance: "Deux notes longues qui préparent le retour sur D.",
    apercu: { son: "reese", octave: 0 },
    variantes: [
      { nom: "Plus large", idee: "Edit ouvre le désaccord (à vérifier sur ta machine).", reglages: [v("osc.edit", "80")] },
      { nom: "Sans pompe", idee: "Une nappe de basse continue.", reglages: [r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.oscedit", "ex.ifxedit"],
  },
  {
    id: "reese-hachee-tribe", nom: "Reese hachée à contretemps", styles: ["tribe"], fonction: "basse", element: "reese", partie: 2,
    idee: "Une reese courte sur chaque contretemps : le frottement des deux dents de scie donne du grain à la basse tribe.",
    melodique: { key: "D", scale: 29 },
    reglages: [
      r("osc.type", "331 DUAL-SAW"), r("part.voiceassign", "Mono2"), v("osc.edit", "40"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "45"), v("filter.egint", "40"),
      r("amp.eg", "ON"), v("amp.decay", "35"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("..0...0...0...0.", "..0...0...0...1.", "..0...0...0...2.", "..0.0.0.1.1.2.2."),
    relance: "La reese passe en croches et monte dans la gamme Bass Line.",
    apercu: { son: "reese", octave: 0 },
    variantes: [
      { nom: "Plus longue", idee: "Les notes se touchent presque.", reglages: [v("amp.decay", "60")] },
      { nom: "Plus brillante", idee: "Filtre ouvert.", reglages: [v("filter.cutoff", "70")] },
    ],
    exercices: ["ex.oscedit", "ex.decay"],
  },
  {
    id: "reese-wobble-mentale", nom: "Reese qui wobble", styles: ["mentale"], fonction: "basse", element: "reese", partie: 2, bpm: 175,
    idee: "Une reese dont le filtre ouvre et ferme au tempo : le « wobble », très lourd en mentale.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "356 X-SAW 2"), r("part.voiceassign", "Mono2"), v("osc.edit", "50"),
      r("filter.lpf", "OB LPF"), v("filter.cutoff", "35"), v("filter.resonance", "50"),
      r("mod.type", "31 LFOTriB Filter"), v("mod.depth", "80"), v("mod.speed", "60"),
      r("amp.eg", "ON"), v("amp.decay", "100"),
      r("ifx.on", "ON"), r("ifx.type", "2 Overdrive"), v("ifx.edit", "60"),
      r("step.gate", "TIE"), r("mfx.send", "OFF"),
    ],
    mesures: M("0~~~~~~~0~~~~~~~", "0~~~~~~~1~~~~~~~", "0~~~~~~~0~~~~~~~", "1~~~1~~~0~~~O~~~"),
    relance: "Le wobble passe sur D# puis saute à l'octave.",
    apercu: { son: "reese", octave: 0 },
    variantes: [
      { nom: "Wobble carré", idee: "Le filtre saute au lieu de glisser.", reglages: [r("mod.type", "49 SquUpB Filter")] },
      { nom: "Wobble plus lent", idee: "Moins de Speed.", reglages: [v("mod.speed", "35")] },
    ],
    exercices: ["ex.depth", "ex.speed"],
  },
  {
    id: "reese-phaser", nom: "Reese sombre qui tourne", styles: ["mentale", "tekno"], fonction: "basse", element: "reese", partie: 2,
    idee: "Des notes longues de reese passées dans un phaser : la basse tourne lentement, comme un moteur dans le noir.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "331 DUAL-SAW"), r("part.voiceassign", "Mono2"), v("osc.edit", "60"),
      r("filter.lpf", "electribe LPF"), v("filter.cutoff", "40"),
      r("amp.eg", "ON"), v("amp.decay", "100"),
      r("ifx.on", "ON"), r("ifx.type", "31 Phaser LFO 1"), v("ifx.edit", "50"),
      r("step.gate", "TIE"), r("mfx.send", "OFF"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~5~~~~~~~", "4~~~~~~~3~~~2~~~"),
    relance: "La basse descend : B, A puis F (KEY = D Aeolian).",
    apercu: { son: "reese", octave: 0 },
    variantes: [
      { nom: "Flanger", idee: "Un mouvement plus métallique.", reglages: [r("ifx.type", "28 Flanger LFO")] },
      { nom: "Plus ouverte", idee: "Filtre plus haut.", reglages: [v("filter.cutoff", "65")] },
    ],
    exercices: ["ex.ifxedit", "ex.cutoff"],
  },
];
