// Recettes TOMS (élément « toms » de la catégorie Rythmique) : 24 toms de plus et 3 kits de toms.
// Mêmes règles que recettes.ts (badge « Pratique ») :
//   r(id, valeur) = valeur prise dans une liste du manuel (vérifiée par npm run check),
//   v(id, valeur) = valeur de potard sans plage dans le manuel, affichée « à vérifier sur l'écran ».
// Mesures : "." silence, "0"…"9" rang de la note dans la gamme, "O" la KEY une octave plus haut.
// Les toms jouent des notes : avec KEY = D et l'octave de l'aperçu 0, le rang 0 = D2 ; octave 1 : rang 0 = D3.
// Kits : K(id, 4 mesures) = une partie du kit, jouée avec le son de cette recette.
import type { Source } from "../lib/data";
import { pas } from "../lib/seq";
import type { Recette, Reglage } from "./recettes";

const r = (param: string, valeur: string): Reglage => ({ param, valeur });
const v = (param: string, valeur: string): Reglage => ({ param, valeur, aVerifier: true });
const PG = (page: number): Source => ({ doc: "PG", page });
const OM = (page: number): Source => ({ doc: "OM", page });
const M = (...m: [string, string, string, string]) => m.map(pas);
const K = (recette: string, ...m: [string, string, string, string]) => ({ recette, mesures: m.map(pas) });

// Ce que le manuel dit (et ne dit pas) sur la hauteur d'un tom.
const ACCORD = { texte: "Sur l'E2, la note du pas (NOTE, de C-1 à G9) change la hauteur du tom. Le manuel ne dit pas sur quelle note le tom sonne à sa hauteur d'origine : accorde-le à l'oreille avec le potard Pitch, en jouant la basse en même temps.", ref: PG(5) };
const PITCH = { texte: "Le potard Pitch de l'oscillateur décale la hauteur de toute la partie.", ref: OM(23) };

export const RECETTES_TOMS: Recette[] = [
  // =================== KIT ACOUSTIQUE (grave / médium / aigu) ===================
  {
    id: "tom-kit-grave", nom: "Tom grave du kit (D2)", styles: ["tribe"], fonction: "percussion", element: "toms", partie: 5,
    idee: "Le tom le plus grave d'un kit de 3, accordé sur la tonique D2. Il sert de base aux deux autres (F2 et A2), qui forment avec lui l'accord de Ré mineur.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "190 Real Lo"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0.....0.........", "0.....0.........", "0.....0...0.....", "0.....0...0.0.0."),
    relance: "Trois coups de D2 en croches à la fin.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Plus profond", idee: "Une queue plus longue.", reglages: [v("amp.decay", "100")] },
      { nom: "Tom réel médium-grave", idee: "Un peu plus clair.", reglages: [r("osc.type", "189 Real MidLo")] },
    ],
    astuces: [ACCORD, PITCH],
    exercices: ["ex.decay", "ex.pitch"],
  },
  {
    id: "tom-kit-medium", nom: "Tom médium du kit (F2)", styles: ["tribe"], fonction: "percussion", element: "toms", partie: 6,
    idee: "Le tom du milieu, sur F2 (la tierce de Ré mineur) : il répond au tom grave entre ses coups.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "189 Real MidLo"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "45"),
      r("mfx.send", "ON"),
    ],
    mesures: M("...2.....2......", "...2.....2......", "...2.....2...2..", "...2.....2.2.2.2"),
    relance: "Le médium double ses coups en fin de mesure.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Tom acoustique plus haut", idee: "Real MidHi.", reglages: [r("osc.type", "188 Real MidHi")] },
      { nom: "Plus sec", idee: "Moins de Decay.", reglages: [v("amp.decay", "25")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.decay", "ex.pitch"],
  },
  {
    id: "tom-kit-aigu", nom: "Tom aigu du kit (A2)", styles: ["tribe"], fonction: "percussion", element: "toms", partie: 7,
    idee: "Le tom aigu, sur A2 (la quinte de Ré mineur) : il ponctue la fin de chaque mesure.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "188 Real MidHi"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "35"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..............4.", "..............4.", "............4.4.", "........4.4.4444"),
    relance: "Une rafale de A2 pour finir.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Le plus aigu", idee: "Real Hi.", reglages: [r("osc.type", "187 Real Hi")] },
      { nom: "Sur l'octave", idee: "Le tom joue D3 au lieu de A2.", reglages: [], mesures: M("..............O.", "..............O.", "............O.O.", "........O.O.OOOO") },
    ],
    astuces: [ACCORD],
    exercices: ["ex.decay", "ex.pitch"],
  },

  // =================== KIT ÉLECTRONIQUE ===================
  {
    id: "tom-kit-synth-grave", nom: "Tom de synthé grave qui tombe (D2)", styles: ["tekno"], fonction: "percussion", element: "toms", partie: 5,
    idee: "Un tom de synthé sur D2 avec une chute de hauteur à l'attaque (EG+ Pitch) : le « piou » électronique de la tekno.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "201 Synth Lo2"), r("part.voiceassign", "Mono2"),
      r("mod.type", "2 EG+ Pitch"), v("mod.depth", "50"), v("mod.speed", "60"),
      r("amp.eg", "ON"), v("amp.decay", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("......0.......0.", "......0.......0.", "......0.......0.", "......0...0...00"),
    relance: "Un coup de plus et un doublé à la fin.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Chute plus forte", idee: "Plus de Depth.", reglages: [v("mod.depth", "90")] },
      { nom: "Sans chute", idee: "Le tom brut.", reglages: [v("mod.depth", "0")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.depth", "ex.speed"],
  },
  {
    id: "tom-kit-synth-aigu", nom: "Tom de synthé aigu (A2)", styles: ["tekno"], fonction: "percussion", element: "toms", partie: 6,
    idee: "Le partenaire aigu du tom de synthé grave, sur A2, avec la même chute de hauteur mais plus courte.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "200 Synth Hi2"), r("part.voiceassign", "Mono2"),
      r("mod.type", "2 EG+ Pitch"), v("mod.depth", "40"), v("mod.speed", "80"),
      r("amp.eg", "ON"), v("amp.decay", "35"),
      r("mfx.send", "ON"),
    ],
    mesures: M("...4.......4....", "...4.......4....", "...4.......4..4.", "...4...4...4.444"),
    relance: "Le tom aigu se met à rouler.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Synth Hi1", idee: "L'autre tom aigu de synthé.", reglages: [r("osc.type", "197 Synth Hi1")] },
      { nom: "Plus long", idee: "Plus de Decay.", reglages: [v("amp.decay", "60")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.depth", "ex.decay"],
  },

  // =================== KIT MENTALE (distordu) ===================
  {
    id: "tom-kit-mentale-grave", nom: "Tom grave distordu (D2)", styles: ["mentale"], fonction: "percussion", element: "toms", partie: 5, bpm: 175,
    idee: "Le tom Driven sur D2, saturé par la Distortion : un tom lourd et sale qui frappe comme un deuxième kick.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "191 Driven"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "45"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "60"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("..0.....0.......", "..0.....0.......", "..0.....0.....0.", "..0..0..0..0.000"),
    relance: "Le tom grave accélère jusqu'à trois coups serrés.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Overdrive", idee: "Moins sale.", reglages: [r("ifx.type", "2 Overdrive")] },
      { nom: "Bit Crusher", idee: "Une saleté numérique.", reglages: [r("ifx.type", "5 Bit Crusher")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.ifxedit", "ex.decay"],
  },
  {
    id: "tom-kit-mentale-aigu", nom: "Tom aigu qui grince (D#3)", styles: ["mentale"], fonction: "percussion", element: "toms", partie: 6, bpm: 175,
    idee: "Le tom Crunchy sur D#3, la note du phrygien juste au-dessus de D : avec le tom grave en D2, l'écart grince.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "195 Crunchy"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "30"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "50"),
      r("mfx.send", "OFF"),
    ],
    mesures: M(".....1.....1....", ".....1.....1....", ".....1.....1..1.", ".....1.1.1.11111"),
    relance: "Un roulement de D#3 pour finir.",
    apercu: { son: "tom", octave: 1 },
    variantes: [
      { nom: "Sur A3", idee: "Plus consonant : la quinte.", reglages: [], mesures: M(".....4.....4....", ".....4.....4....", ".....4.....4..4.", ".....4.4.4.44444") },
      { nom: "Tom Zee Hi", idee: "Un autre tom aigu.", reglages: [r("osc.type", "192 Zee Hi")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.ifxedit", "ex.pitch"],
  },

  // =================== TOMS TRIBAUX ===================
  {
    id: "tom-sec-tribe", nom: "Tom tribal sec", styles: ["tribe"], fonction: "percussion", element: "toms", partie: 8,
    idee: "Le tom OldSkool coupé très court : un coup sec comme une main sur une peau tendue, en groupes de 3.",
    melodique: { key: "D", scale: 16 },
    reglages: [
      r("osc.type", "194 OldSkool"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "15"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0..0..0...0..0..", "0..0..0...0..0..", "0..0..0...0..1..", "0.01.01.01.01.22"),
    relance: "Les groupes de 3 se resserrent et montent sur F2 puis G2.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Encore plus sec", idee: "Decay au minimum.", reglages: [v("amp.decay", "5")] },
      { nom: "Tom de 808", idee: "TomEight.", reglages: [r("osc.type", "202 TomEight")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.decay"],
  },
  {
    id: "tom-profond-tribe", nom: "Tom profond à longue queue", styles: ["tribe"], fonction: "percussion", element: "toms", partie: 8,
    idee: "Un tom grave sur D2 qui résonne longtemps, une seule fois par mesure : comme un grand tambour cérémoniel.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "190 Real Lo"), r("part.voiceassign", "Poly1"),
      r("amp.eg", "ON"), v("amp.decay", "115"),
      r("mfx.send", "ON"), r("pat.mfxtype", "5 Room Reverb"),
    ],
    mesures: M("0...............", "0...............", "0.......0.......", "0.......0...0..."),
    relance: "Trois coups : chacun résonne par-dessus le précédent (Poly1).",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Mono", idee: "Mono2 : chaque coup coupe le précédent.", reglages: [r("part.voiceassign", "Mono2")] },
      { nom: "Tom de synthé", idee: "Synth Lo1, plus rond.", reglages: [r("osc.type", "199 Synth Lo1")] },
    ],
    astuces: [ACCORD, { texte: "Poly1 laisse chaque coup sonner jusqu'au bout, même si le suivant arrive.", ref: PG(4) }],
    exercices: ["ex.decay"],
  },
  {
    id: "tom-delay-tribe", nom: "Tom dans l'espace (écho 3/16)", styles: ["tribe"], fonction: "percussion", element: "toms", partie: 8,
    idee: "Un seul coup de tom par temps faible, que l'écho en 3/16 multiplie : le rythme semble venir de loin.",
    melodique: { key: "D", scale: 16 },
    reglages: [
      r("osc.type", "189 Real MidLo"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "40"),
      r("ifx.on", "ON"), r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "65"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....0...........", "....0.......2...", "....0...........", "....0...2...3..."),
    relance: "Deux coups plus haut (G2 puis A2) que l'écho fait déborder.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Écho à la noire", idee: "Delay 1/4, plus d'espace.", reglages: [r("ifx.type", "18 Delay 1/4")] },
      { nom: "Écho court", idee: "Short Delay, comme une petite pièce.", reglages: [r("ifx.type", "24 Short Delay")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "tom-accorde-dm-tribe", nom: "Toms accordés en Ré mineur (D2 F2 A2 C3)", styles: ["tribe"], fonction: "percussion", element: "toms", partie: 8,
    idee: "Un seul tom qui joue une petite mélodie sur les notes de l'accord de Ré mineur : D2, F2, A2 et C3. Les toms deviennent une ligne de basse percussive.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "199 Synth Lo1"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "45"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0..2..4...2..0..", "0..2..4...2..0..", "0..2..4...6..4..", "0.2.4.6.O.6.4.2."),
    relance: "Les toms montent l'accord jusqu'à D3 puis redescendent.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "En Ré Dorian", idee: "Même rangs, gamme plus claire (B au lieu de Bb).", reglages: [], ton: { key: "D", scale: 3 } },
      { nom: "Tom réel", idee: "Real MidLo.", reglages: [r("osc.type", "189 Real MidLo")] },
    ],
    astuces: [ACCORD, { texte: "Avec SCALE MODE sur On, les notes jouées sur les pads restent dans la gamme du motif.", ref: PG(4) }],
    exercices: ["ex.pitch", "ex.decay"],
  },
  {
    id: "tom-resonance-tribe", nom: "Tom qui chante (résonance)", styles: ["tribe", "mentale"], fonction: "percussion", element: "toms", partie: 8,
    idee: "Un tom passé dans un filtre MS20 avec beaucoup de résonance : chaque coup fait « chanter » le filtre, comme un tambour d'eau.",
    melodique: { key: "D", scale: 16 },
    reglages: [
      r("osc.type", "197 Synth Hi1"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "55"), v("filter.resonance", "100"),
      r("amp.eg", "ON"), v("amp.decay", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0...1..0..0.....", "0...1..0..0.....", "0...1..0..0...2.", "0.1.0.1.2.2.3.3."),
    relance: "Le tom monte la pentatonique : F2, G2.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Filtre plus ouvert", idee: "La résonance passe plus haut.", reglages: [v("filter.cutoff", "80")] },
      { nom: "Passe-bande", idee: "Un son plus nasillard.", reglages: [r("filter.lpf", "OFF"), r("filter.bpf", "MS20 BPF")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.resonance", "ex.cutoff"],
  },

  // =================== TOMS TEKNO ===================
  {
    id: "tom-tok-tekno", nom: "Tom court « tok » (A3)", styles: ["tekno"], fonction: "percussion", element: "toms", partie: 8,
    idee: "Un tom aigu sur A3 coupé presque tout de suite : il ne reste que le « tok » de l'attaque, entre les charlestons.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "202 TomEight"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "8"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("...4..4....4..4.", "...4..4....4..4.", "...4..4....4..4.", "...4..4..4.4.444"),
    relance: "Les « tok » se rapprochent en fin de mesure.",
    apercu: { son: "tom", octave: 1 },
    variantes: [
      { nom: "Un peu plus long", idee: "Un vrai petit tom.", reglages: [v("amp.decay", "25")] },
      { nom: "Woodblock", idee: "Le DoncaW.block de la liste Percussion, encore plus « tok ».", reglages: [r("osc.type", "252 DoncaW.block")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.decay"],
  },
  {
    id: "tom-chute-tekno", nom: "Tom qui tombe vite", styles: ["tekno"], fonction: "percussion", element: "toms", partie: 8,
    idee: "Une chute de hauteur très rapide (EG+ Pitch, Speed haut) : le tom fait « tchou » et laisse vite la place au kick.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "199 Synth Lo1"), r("part.voiceassign", "Mono2"),
      r("mod.type", "2 EG+ Pitch"), v("mod.depth", "90"), v("mod.speed", "100"),
      r("amp.eg", "ON"), v("amp.decay", "40"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("..0...0...0...0.", "..0...0...0...0.", "..0...0...0...4.", "..0...0.4.4.O.O."),
    relance: "Le tom monte sur A2 puis D3.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Chute lente", idee: "Speed plus bas : la chute s'entend comme un glissé.", reglages: [v("mod.speed", "40")] },
      { nom: "Chute calée sur le tempo", idee: "EG+ BPM Pitch : la durée de la chute suit le BPM.", reglages: [r("mod.type", "8 EG+ BPM Pitch")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.depth", "ex.speed"],
  },
  {
    id: "tom-sinus-tekno", nom: "Tom de synthèse en sinus", styles: ["tekno", "mentale"], fonction: "percussion", element: "toms", partie: 8,
    idee: "Pas un tom enregistré : l'oscillateur SINE avec une enveloppe de hauteur et un Decay court. C'est la recette des toms de boîte à rythmes, qui s'accordent parfaitement.",
    melodique: { key: "D", scale: 16 },
    reglages: [
      r("osc.type", "330 SINE"), r("part.voiceassign", "Mono2"),
      r("mod.type", "2 EG+ Pitch"), v("mod.depth", "60"), v("mod.speed", "70"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "45"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("......3.....2...", "......3.....2...", "......3.....2...", "......3.3.2.2.00"),
    relance: "Les toms descendent G2, F2 puis D2.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Plus de corps", idee: "TRIANGLE au lieu de SINE.", reglages: [r("osc.type", "329 TRIANGLE")] },
      { nom: "Fréquences croisées", idee: "X-SINE 1 : un tom plus métallique.", reglages: [r("osc.type", "361 X-SINE 1")] },
    ],
    astuces: [{ texte: "Avec un oscillateur de synthé, la note du pas donne la vraie hauteur : D2 sonne D2. C'est le moyen le plus sûr d'avoir des toms accordés.", ref: PG(5) }],
    exercices: ["ex.depth", "ex.decay"],
  },
  {
    id: "tom-filtre-tekno", nom: "Tom filtré qui s'ouvre", styles: ["tekno"], fonction: "percussion", element: "toms", partie: 8,
    idee: "Un tom électronique derrière un passe-bas presque fermé, que le LFO ouvre sur une mesure : les toms sortent peu à peu du brouillard.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "196 E.Tom"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "electribe LPF"), v("filter.cutoff", "35"), v("filter.resonance", "40"),
      r("mod.type", "37 SawUpB Filter"), v("mod.depth", "60"), v("mod.speed", "30"),
      r("amp.eg", "ON"), v("amp.decay", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..0..0....0..0..", "..0..0....0..0..", "..0..0....0..2..", "..0..0..2.2.4.4."),
    relance: "Le motif monte sur F2 puis A2.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Passe-haut", idee: "On enlève le grave du tom.", reglages: [r("filter.lpf", "OFF"), r("filter.hpf", "electribe HPF"), v("filter.cutoff", "50")] },
      { nom: "Ouverture rapide", idee: "Plus de Speed.", reglages: [v("mod.speed", "70")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.cutoff", "ex.speed"],
  },
  {
    id: "tom-metal-tekno", nom: "Tom métallique de synthèse", styles: ["tekno"], fonction: "percussion", element: "toms", partie: 8,
    idee: "L'oscillateur RING-SINE (modulation en anneau) avec une chute de hauteur : un tom qui sonne comme une tôle frappée.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "354 RING-SINE"), r("part.voiceassign", "Mono2"), v("osc.edit", "60"),
      r("mod.type", "2 EG+ Pitch"), v("mod.depth", "40"), v("mod.speed", "70"),
      r("amp.eg", "ON"), v("amp.decay", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("...0...0...0..0.", "...0...0...0..0.", "...0...0...0..3.", "...0.0.0.3.3.4.4"),
    relance: "Le tom métallique monte sur G2 puis A2.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Plus de métal", idee: "Plus d'Edit.", reglages: [v("osc.edit", "110")] },
      { nom: "Cloche de métal", idee: "L'instrument Metal Bell.", reglages: [r("osc.type", "403 Metal Bell")] },
    ],
    astuces: [{ texte: "Le rôle exact du potard Edit sur RING-SINE n'est pas dans le manuel : écoute ce qu'il change." }],
    exercices: ["ex.oscedit", "ex.depth"],
  },
  {
    id: "tom-reverb-tekno", nom: "Toms dans une grande salle", styles: ["tekno", "tribe"], fonction: "percussion", element: "toms", partie: 8,
    idee: "Deux toms par mesure envoyés dans la réverbération master Hall Reverb : l'espace autour des toms remplit le haut du morceau.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "192 Zee Hi"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "35"),
      r("mfx.send", "ON"), r("pat.mfxtype", "4 Hall Reverb"),
    ],
    mesures: M("....2.......0...", "....2.......0...", "....2.......0...", "....2...2...0.0."),
    relance: "Un coup de plus de chaque tom.",
    apercu: { son: "tom", octave: 1 },
    variantes: [
      { nom: "Pièce plus petite", idee: "Room Reverb.", reglages: [r("pat.mfxtype", "5 Room Reverb")] },
      { nom: "Réverbe mouillée", idee: "Wet Reverb.", reglages: [r("pat.mfxtype", "6 Wet Reverb")] },
    ],
    astuces: [ACCORD, { texte: "L'aperçu ne joue pas l'effet master : écoute la réverbération sur la machine (pad tactile)." }],
    exercices: ["ex.mfxxy"],
  },
  {
    id: "tom-fill-fin-tekno", nom: "Fill de toms de fin de mesure", styles: ["tekno"], fonction: "percussion", element: "toms", partie: 8,
    idee: "Silence pendant trois mesures, puis la mesure 4 dévale les toms de A2 à D2 en doubles croches : le fill classique avant le retour.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "196 E.Tom"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("................", "................", "..............4.", "........44332200"),
    relance: "Deux coups par note : A2, G2, F2, D2.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Fill montant", idee: "Le même fill vers l'aigu.", reglages: [], mesures: M("................", "................", "..............0.", "........00223344") },
      { nom: "Toms acoustiques", idee: "Real MidLo.", reglages: [r("osc.type", "189 Real MidLo")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.decay"],
  },

  // =================== TOMS MENTALE ===================
  {
    id: "tom-monte-mentale", nom: "Tom qui monte", styles: ["mentale"], fonction: "percussion", element: "toms", partie: 8, bpm: 175,
    idee: "L'enveloppe négative EG- Pitch fait partir le tom plus bas et remonter vers sa note : un « wiou » qui monte, très mentale.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "198 Synth Mid1"), r("part.voiceassign", "Mono2"),
      r("mod.type", "14 EG- Pitch"), v("mod.depth", "70"), v("mod.speed", "40"),
      r("amp.eg", "ON"), v("amp.decay", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M(".......0.......0", ".......0.......0", ".......0....1..0", ".......0.1.1.4.O"),
    relance: "Les toms montent D#2, A2 puis D3.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Montée calée sur le tempo", idee: "EG- BPM Pitch.", reglages: [r("mod.type", "20 EG- BPM Pitch")] },
      { nom: "Montée plus lente", idee: "Moins de Speed.", reglages: [v("mod.speed", "15")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.depth", "ex.speed"],
  },
  {
    id: "tom-metal-mentale", nom: "Tom métallique au Ring Modulator", styles: ["mentale"], fonction: "percussion", element: "toms", partie: 8, bpm: 175,
    idee: "Le tom Zee Lo passé dans le Ring Modulator : le tom perd sa note et devient un choc de métal inquiétant.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "193 Zee Lo"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "40"),
      r("ifx.on", "ON"), r("ifx.type", "6 Ring Modulator"), v("ifx.edit", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0.....0.....0...", "0.....0.....0...", "0.....0.....0.1.", "0..0..0..0..1111"),
    relance: "Le motif en 3 se casse en rafale de D#2.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Anneau plus fort", idee: "Plus d'IFX Edit.", reglages: [v("ifx.edit", "110")] },
      { nom: "Écho en anneau", idee: "Ring Delay 1.", reglages: [r("ifx.type", "25 Ring Delay 1")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "tom-distordu-mentale", nom: "Toms broyés", styles: ["mentale"], fonction: "percussion", element: "toms", partie: 8, bpm: 175,
    idee: "Des toms de synthé bas passés au Bit Crusher et joués en doubles coups : un roulement de toms sale et numérique.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "199 Synth Lo1"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "30"),
      r("ifx.on", "ON"), r("ifx.type", "5 Bit Crusher"), v("ifx.edit", "70"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("00....00....00..", "00....00....00..", "00....00....11..", "00..00..11..4444"),
    relance: "Les doublés montent D#2 puis A2.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Decimator", idee: "Une autre dégradation.", reglages: [r("ifx.type", "4 Decimator")] },
      { nom: "Tom réel broyé", idee: "Real MidLo dans le Bit Crusher.", reglages: [r("osc.type", "189 Real MidLo")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.ifxedit", "ex.decay"],
  },
  {
    id: "tom-roulement-mentale", nom: "Roulement de toms au Roller", styles: ["mentale"], fonction: "percussion", element: "toms", partie: 8, bpm: 175,
    idee: "Quelques coups de tom en croches, transformés en roulement de triples croches par le Roller : un fill qui roule tout seul.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "201 Synth Lo2"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "25"),
      r("ifx.on", "ON"), r("ifx.type", "22 Roller 1/32"), v("ifx.edit", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..............0.", "..............0.", "............1.0.", "4.4.3.3.1.1.0.0."),
    relance: "Le roulement descend A2, G2, D#2, D2.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Répétitions", idee: "Repeater.", reglages: [r("ifx.type", "37 Repeater")] },
      { nom: "Sans Roller", idee: "Pour entendre ce qu'il ajoute.", reglages: [r("ifx.on", "OFF")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "tom-phrygien-mentale", nom: "Toms accordés en phrygien (D2 D#2 G2)", styles: ["mentale"], fonction: "percussion", element: "toms", partie: 8, bpm: 175,
    idee: "Trois notes du Ré phrygien jouées par un seul tom : D2, D#2 et G2. Le demi-ton D–D# donne aux toms une couleur orientale et tendue.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "196 E.Tom"), r("part.voiceassign", "Mono2"),
      r("mod.type", "2 EG+ Pitch"), v("mod.depth", "30"), v("mod.speed", "70"),
      r("amp.eg", "ON"), v("amp.decay", "40"),
      r("ifx.on", "ON"), r("ifx.type", "24 Short Delay"), v("ifx.edit", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0..1..3...1..0..", "0..1..3...1..0..", "0..1..3...1..3..", "0.1.0.1.3.3.1.10"),
    relance: "Les trois notes alternent vite et retombent sur D2.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Gamme Arabic", idee: "Mêmes rangs en gamme Arabic.", reglages: [], ton: { key: "D", scale: 20 } },
      { nom: "Plus sec", idee: "Sans écho.", reglages: [r("ifx.on", "OFF")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.pitch", "ex.ifxedit"],
  },
  {
    id: "tom-galop-tekno", nom: "Toms au galop", styles: ["tekno", "tribe"], fonction: "percussion", element: "toms", partie: 8,
    idee: "Deux toms (D2 et A2) sur un rythme de galop « ta-ta-tam » entre les kicks : les toms poussent le groove vers l'avant.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "198 Synth Mid1"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M(".44.0...44.0....", ".44.0...44.0....", ".44.0...44.0..2.", ".44.0.44.0.44.00"),
    relance: "Les galops s'enchaînent sans pause.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Avec chute", idee: "EG+ Pitch pour un galop électronique.", reglages: [r("mod.type", "2 EG+ Pitch"), v("mod.depth", "40"), v("mod.speed", "80")] },
      { nom: "Toms acoustiques", idee: "Real MidHi.", reglages: [r("osc.type", "188 Real MidHi")] },
    ],
    astuces: [ACCORD],
    exercices: ["ex.decay"],
  },

  // =================== KITS DE TOMS (plusieurs parties) ===================
  {
    id: "kit-toms-tresillo-tribe", nom: "Kit de 3 toms en tresillo (tribe)", styles: ["tribe"], fonction: "percussion", element: "toms", partie: 1,
    idee: "Les trois toms du kit acoustique sur trois parties : le grave (D2) joue le tresillo 3 + 3 + 2, le médium (F2) et l'aigu (A2) lui répondent. Ensemble, ils jouent l'accord de Ré mineur.",
    melodique: { key: "D", scale: 7 },
    reglages: [],
    mesures: M("0..0..0.........", "0..0..0.........", "0..0..0.........", "0..0..0........."),
    relance: "Les trois toms finissent par un petit fill du médium et de l'aigu.",
    apercu: { son: "tom", octave: 0 },
    variantes: [],
    kit: {
      lecture: [
        "Partie 1 (tom grave) : pads 1, 4 et 7 = le tresillo, 3 + 3 + 2 pas.",
        "Partie 2 (tom médium) : il remplit la deuxième moitié de la mesure.",
        "Partie 3 (tom aigu) : il ponctue la fin des mesures 2 et 4.",
        "Mesure 4 : médium et aigu s'enchaînent en fill.",
      ],
      pistes: [
        K("tom-kit-grave", "0..0..0.........", "0..0..0.........", "0..0..0.........", "0..0..0........."),
        K("tom-kit-medium", "........2..2..2.", "........2..2..2.", "........2..2..2.", "........2.2....."),
        K("tom-kit-aigu", "................", "..............4.", "................", "............4444"),
      ],
    },
    astuces: [{ texte: "Chaque tom a sa propre partie de l'E2 (une ligne de la grille) : règle chaque partie avec le son de sa recette, puis entre ses pas. « Copier vers ma machine » donne les étapes partie par partie." }, ACCORD],
  },
  {
    id: "kit-toms-tresillo-tekno", nom: "Kit de 2 toms en tresillo (tekno)", styles: ["tekno"], fonction: "percussion", element: "toms", partie: 1,
    idee: "Les deux toms de synthé qui tombent : le grave (D2) sur le tresillo, l'aigu (A2) en contretemps. Un motif hypnotique qui tourne contre le kick droit.",
    melodique: { key: "D", scale: 7 },
    reglages: [],
    mesures: M("0..0..0...0..0..", "0..0..0...0..0..", "0..0..0...0..0..", "0..0..0.0.0.0000"),
    relance: "Le tom grave roule et l'aigu double ses coups.",
    apercu: { son: "tom", octave: 0 },
    variantes: [],
    kit: {
      lecture: [
        "Partie 1 (tom grave) : tresillo sur les pads 1, 4, 7, puis 11 et 14 (3 + 3 + 2 + 3 + 3 + 2).",
        "Partie 2 (tom aigu) : seulement les pas où le grave se tait.",
        "Mesure 4 : le grave roule en doubles croches à la fin.",
      ],
      pistes: [
        K("tom-kit-synth-grave", "0..0..0...0..0..", "0..0..0...0..0..", "0..0..0...0..0..", "0..0..0.0.0.0000"),
        K("tom-kit-synth-aigu", "....4..4....4..4", "....4..4....4..4", "....4..4....4..4", ".4.4.4.4.4.4...."),
      ],
    },
    astuces: [{ texte: "Chaque tom a sa propre partie de l'E2 (une ligne de la grille) : règle chaque partie avec le son de sa recette, puis entre ses pas. « Copier vers ma machine » donne les étapes partie par partie." }, ACCORD],
  },
  {
    id: "kit-toms-tresillo-mentale", nom: "Kit de toms distordus en tresillo (mentale)", styles: ["mentale"], fonction: "percussion", element: "toms", partie: 1, bpm: 175,
    idee: "Le tom grave distordu (D2) joue le tresillo, le tom aigu qui grince (D#3) frappe entre ses coups, et le tom qui monte (D2) relance la fin de chaque mesure.",
    melodique: { key: "D", scale: 4 },
    reglages: [],
    mesures: M("0..0..0.........", "0..0..0.........", "0..0..0.........", "0..0..0.0.0.0000"),
    relance: "Le tom grave roule pendant que l'aigu se tait.",
    apercu: { son: "tom", octave: 0 },
    variantes: [],
    kit: {
      lecture: [
        "Partie 1 (tom grave distordu) : le tresillo, pads 1, 4 et 7.",
        "Partie 2 (tom aigu, D#3) : il frappe sur les pas 10 et 13, là où le grave se tait.",
        "Partie 3 (tom qui monte) : un seul coup en fin de mesure, comme une question.",
        "Mesure 4 : le grave roule, l'aigu se tait, le tom qui monte part sur l'octave.",
      ],
      pistes: [
        K("tom-kit-mentale-grave", "0..0..0.........", "0..0..0.........", "0..0..0.........", "0..0..0.0.0.0000"),
        K("tom-kit-mentale-aigu", ".........1..1...", ".........1..1...", ".........1..1.1.", "................"),
        K("tom-monte-mentale", "...............0", "...............0", "..............4.", "..............O."),
      ],
    },
    astuces: [{ texte: "Chaque tom a sa propre partie de l'E2 (une ligne de la grille) : règle chaque partie avec le son de sa recette, puis entre ses pas. « Copier vers ma machine » donne les étapes partie par partie." }, ACCORD],
  },
];
