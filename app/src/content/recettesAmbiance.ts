// Recettes AMBIANCE : nappe, drone, noise / bruit, voix. Mêmes règles que recettes.ts (badge « Pratique ») :
//   r(id, valeur) = valeur prise dans une liste du manuel (vérifiée par npm run check),
//   v(id, valeur) = valeur de potard sans plage dans le manuel, affichée « à vérifier sur l'écran ».
// Mesures : "." silence, "x" un coup, "0"…"9" rang de la note dans la gamme, "O" la KEY une octave plus haut, "~" note tenue.
import type { Source } from "../lib/data";
import { pas } from "../lib/seq";
import type { Recette, Reglage } from "./recettes";

const r = (param: string, valeur: string): Reglage => ({ param, valeur });
const v = (param: string, valeur: string): Reglage => ({ param, valeur, aVerifier: true });
const PG = (page: number): Source => ({ doc: "PG", page });
const OM = (page: number): Source => ({ doc: "OM", page });
const M = (...m: [string, string, string, string]) => m.map(pas);

// Ce que l'E2 Synth permet (ou pas) pour la voix, d'après le manuel.
const LIMITES_VOIX = "Limites de l'E2 Synth : il n'a pas d'échantillonneur (c'est la version electribe sampler qui en a un), donc tu ne peux pas enregistrer ni importer ta propre voix. Il n'y a pas non plus de vocoder dans les listes d'effets. Ce qui existe : les 16 oscillateurs Voice (258 à 273), les instruments 391 Vox Pop Ah, 392 Vox Pad et 393 Vox Helium, l'oscillateur 409 Audio In pour une source branchée en direct, et l'effet 17 Talk Filter qui donne un son de « bouche ».";

export const RECETTES_AMBIANCE: Recette[] = [
  // =================== NAPPE ===================
  {
    id: "nappe-chaude-tribe", nom: "Nappe chaude en Dorian", styles: ["tribe"], fonction: "nappe", element: "nappe", partie: 8,
    idee: "Des triangles doublés, une attaque lente et un chorus : une nappe douce qui pose une couleur sans gêner les percussions.",
    melodique: { key: "D", scale: 3 },
    reglages: [
      r("osc.type", "333 DUAL-TRI"), r("part.voiceassign", "Poly1"), v("osc.edit", "40"),
      r("filter.lpf", "P5 LPF"), v("filter.cutoff", "60"), v("filter.resonance", "10"),
      r("amp.eg", "ON"), v("amp.attack", "80"), v("amp.decay", "110"),
      r("ifx.on", "ON"), r("ifx.type", "27 Chorus"), v("ifx.edit", "60"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "3~~~~~~~~~~~~~~~", "4~~~~~~~5~~~~~~~"),
    relance: "La nappe passe sur A puis B : la 6e majeure du Dorian éclaire la fin de la boucle.",
    apercu: { son: "pad", octave: 1 },
    variantes: [
      { nom: "Cordes", idee: "Un ensemble de cordes.", reglages: [r("osc.type", "389 Strings Ens.")] },
      { nom: "Attaque plus rapide", idee: "La nappe arrive tout de suite.", reglages: [v("amp.attack", "20")] },
    ],
    exercices: ["ex.attack", "ex.decay"],
  },
  {
    id: "nappe-tendue-mentale", nom: "Nappe tendue qui tourne", styles: ["mentale"], fonction: "nappe", element: "nappe", partie: 8, bpm: 175,
    idee: "Une scie unisson en Phrygian qui passe dans un phaser : la nappe tourne sur elle-même et garde la tension.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "339 UNI-SAW"), r("part.voiceassign", "Poly1"), v("osc.edit", "70"),
      r("filter.lpf", "OB LPF"), v("filter.cutoff", "50"), v("filter.resonance", "30"),
      r("amp.eg", "ON"), v("amp.attack", "90"), v("amp.decay", "110"),
      r("ifx.on", "ON"), r("ifx.type", "32 Phaser LFO 2"), v("ifx.edit", "60"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "1~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "1~~~~~~~6~~~~~~~"),
    relance: "La nappe reste sur D# puis descend sur C : elle ne se pose jamais.",
    apercu: { son: "pad", octave: 1 },
    variantes: [
      { nom: "Flanger", idee: "Un mouvement plus métallique.", reglages: [r("ifx.type", "28 Flanger LFO")] },
      { nom: "Plus épaisse", idee: "Plus d'Edit sur UNI-SAW.", reglages: [v("osc.edit", "110")] },
    ],
    exercices: ["ex.oscedit", "ex.attack"],
  },
  {
    id: "nappe-tigre-tekno", nom: "Nappe de hit qui pompe", styles: ["tekno"], fonction: "nappe", element: "nappe", partie: 8,
    idee: "Le son TigerPad tenu sur toute la mesure et creusé par le Pumper : une nappe qui suit le kick.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "302 TigerPad"), r("part.voiceassign", "Poly1"),
      r("filter.lpf", "electribe LPF"), v("filter.cutoff", "65"),
      r("amp.eg", "ON"), v("amp.attack", "30"), v("amp.decay", "100"),
      r("ifx.on", "ON"), r("ifx.type", "36 Pumper"), v("ifx.edit", "70"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "5~~~~~~~~~~~~~~~", "3~~~~~~~4~~~~~~~"),
    relance: "Deux accords en une mesure : F puis G, pour annoncer la boucle.",
    apercu: { son: "pad", octave: 1 },
    variantes: [
      { nom: "Autre nappe", idee: "WishWash, un autre son de la liste Synth Hit.", reglages: [r("osc.type", "299 WishWash")] },
      { nom: "Sans pompe", idee: "Une nappe immobile.", reglages: [r("ifx.on", "OFF")] },
    ],
    astuces: [{ texte: "TigerPad est un son PCM : l'aperçu l'imite avec trois scies désaccordées." }],
    exercices: ["ex.ifxedit", "ex.attack"],
  },
  {
    id: "nappe-mouvante", nom: "Nappe qui change de timbre", styles: ["tribe", "mentale"], fonction: "nappe", element: "nappe", partie: 8,
    idee: "Une sinusoïde de synthèse dont le timbre bouge lentement grâce au LFO sur l'OSC Edit : la nappe vit toute seule.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "372 SYN-SINE 3"), r("part.voiceassign", "Poly1"),
      r("mod.type", "27 LFOTri OSC"), v("mod.depth", "50"), v("mod.speed", "15"),
      r("filter.lpf", "MG LPF"), v("filter.cutoff", "70"),
      r("amp.eg", "ON"), v("amp.attack", "70"), v("amp.decay", "110"),
      r("ifx.on", "ON"), r("ifx.type", "18 Delay 1/4"), v("ifx.edit", "40"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "2~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "4~~~~~~~~~~~6~~~"),
    relance: "La nappe monte sur A puis C.",
    apercu: { son: "pad", octave: 1 },
    variantes: [
      { nom: "Mouvement plus rapide", idee: "Plus de Speed.", reglages: [v("mod.speed", "50")] },
      { nom: "Autre SYN-SINE", idee: "Un autre timbre de la même famille.", reglages: [r("osc.type", "375 SYN-SINE 6")] },
    ],
    astuces: [{ texte: "L'aperçu imite le LFO seulement sur le filtre, la hauteur et le volume : le mouvement de timbre s'écoute sur la machine." }],
    exercices: ["ex.depth", "ex.speed"],
  },

  // =================== DRONE ===================
  {
    id: "drone-pulse-tekno", nom: "Drone qui palpite", styles: ["tekno"], fonction: "nappe", element: "drone", partie: 9,
    idee: "Une note grave tenue, découpée par un LFO carré sur le volume calé sur le tempo : le drone palpite avec le morceau.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "336 OCT-SQU"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "40"), v("filter.resonance", "30"),
      r("mod.type", "58 SquDwnB Level"), v("mod.depth", "70"), v("mod.speed", "60"),
      r("amp.eg", "ON"), v("amp.decay", "127"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~1~~~"),
    relance: "Le drone glisse un instant sur E avant de revenir.",
    apercu: { son: "square", octave: 0 },
    variantes: [
      { nom: "Tremolo", idee: "La même idée avec l'effet Tremolo.", reglages: [v("mod.depth", "0"), r("ifx.on", "ON"), r("ifx.type", "34 Tremolo"), v("ifx.edit", "60")] },
      { nom: "Palpitation plus lente", idee: "Moins de Speed.", reglages: [v("mod.speed", "30")] },
    ],
    exercices: ["ex.depth", "ex.speed"],
  },
  {
    id: "drone-bourdon-tribe", nom: "Bourdon tonique et octave", styles: ["tribe"], fonction: "nappe", element: "drone", partie: 9,
    idee: "Une sinusoïde octaviée tenue en continu, comme un bourdon de musique traditionnelle : tout le morceau tourne autour.",
    melodique: { key: "D", scale: 35 },
    reglages: [
      r("osc.type", "338 OCT-SINE"), r("part.voiceassign", "Poly1"),
      r("mod.type", "29 LFOTri Pan"), v("mod.depth", "40"), v("mod.speed", "10"),
      r("amp.eg", "ON"), v("amp.attack", "60"), v("amp.decay", "127"),
      r("ifx.on", "ON"), r("ifx.type", "27 Chorus"), v("ifx.edit", "40"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~O~~~~~~~"),
    relance: "Le bourdon saute à l'octave pour la deuxième moitié de la mesure.",
    apercu: { son: "sub", octave: 1 },
    variantes: [
      { nom: "Quinte", idee: "Gamme 5th Interval : tonique et quinte.", reglages: [], ton: { key: "D", scale: 34 } },
      { nom: "Orgue", idee: "Un bourdon d'orgue.", reglages: [r("osc.type", "385 M1 Organ")] },
    ],
    astuces: [{ texte: "La gamme Octave n'a qu'une note : toute la séquence reste sur D, quelle que soit la note.", ref: PG(15) }],
    exercices: ["ex.attack", "ex.pan"],
  },
  {
    id: "drone-grince-mentale", nom: "Drone qui grince", styles: ["mentale"], fonction: "nappe", element: "drone", partie: 9, bpm: 175,
    idee: "Une scie en ring modulation, avec une hauteur qui bouge au hasard et de la distorsion : un drone inquiétant.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "351 RING-SAW"), r("part.voiceassign", "Mono2"), v("osc.edit", "60"),
      r("mod.type", "68 Random Pitch"), v("mod.depth", "15"), v("mod.speed", "30"),
      r("filter.lpf", "OB LPF"), v("filter.cutoff", "45"), v("filter.resonance", "50"),
      r("amp.eg", "ON"), v("amp.decay", "127"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "40"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "1~~~~~~~0~~~1~~~"),
    relance: "Le drone oscille entre D et D#, le demi-ton du phrygien.",
    apercu: { son: "synth", octave: 0 },
    variantes: [
      { nom: "Plus stable", idee: "Sans hasard de hauteur.", reglages: [v("mod.depth", "0")] },
      { nom: "Métal", idee: "Un ring modulator en plus.", reglages: [r("ifx.type", "6 Ring Modulator")] },
    ],
    exercices: ["ex.oscedit", "ex.depth"],
  },

  // =================== NOISE / BRUIT ===================
  {
    id: "noise-souffle-tekno", nom: "Souffle filtré", styles: ["tekno"], fonction: "nappe", element: "noise", partie: 10,
    idee: "Un bruit blanc tenu, filtré vers les aigus, dont la couleur ondule lentement : un souffle qui remplit le haut du spectre.",
    reglages: [
      r("osc.type", "377 HPF NOISE"),
      r("filter.hpf", "MS20 HPF"), v("filter.cutoff", "70"), v("filter.resonance", "30"),
      r("mod.type", "31 LFOTriB Filter"), v("mod.depth", "40"), v("mod.speed", "30"),
      r("amp.eg", "ON"), v("amp.level", "60"), v("amp.decay", "127"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~"),
    relance: "Le souffle reste tenu : c'est le LFO qui fait varier la fin de la boucle.",
    apercu: { son: "noise", octave: 0 },
    variantes: [
      { nom: "Plus grave", idee: "Le filtre passe-haut s'ouvre vers le bas.", reglages: [v("filter.cutoff", "40")] },
      { nom: "Sans mouvement", idee: "Le LFO coupé.", reglages: [v("mod.depth", "0")] },
    ],
    exercices: ["ex.cutoff", "ex.level"],
  },
  {
    id: "noise-vent-tribe", nom: "Vent qui passe d'un côté à l'autre", styles: ["tribe"], fonction: "nappe", element: "noise", partie: 10,
    idee: "Un bruit filtré vers le grave qui se déplace de gauche à droite : un vent qui traverse la stéréo.",
    reglages: [
      r("osc.type", "378 LPF NOISE"),
      r("filter.bpf", "MS20 BPF"), v("filter.cutoff", "55"), v("filter.resonance", "50"),
      r("mod.type", "29 LFOTri Pan"), v("mod.depth", "80"), v("mod.speed", "15"),
      r("amp.eg", "ON"), v("amp.attack", "100"), v("amp.decay", "110"), v("amp.level", "70"),
      r("ifx.on", "ON"), r("ifx.type", "27 Chorus"), v("ifx.edit", "50"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "................", "0~~~~~~~~~~~~~~~"),
    relance: "Après une mesure de silence, le vent revient avec son attaque lente.",
    apercu: { son: "noise", octave: 0 },
    variantes: [
      { nom: "Vent qui siffle", idee: "Plus de Resonance.", reglages: [v("filter.resonance", "100")] },
      { nom: "Plus lent", idee: "Le vent traverse plus lentement.", reglages: [v("mod.speed", "5")] },
    ],
    astuces: [{ texte: "L'aperçu n'imite pas le Pan : écoute le déplacement au casque sur la machine." }],
    exercices: ["ex.pan", "ex.resonance"],
  },
  {
    id: "noise-glitch-mentale", nom: "Bruit 8 bits au hasard", styles: ["mentale"], fonction: "percussion", element: "noise", partie: 10, bpm: 175,
    idee: "Le bruit de puce CHIP-NOISE joué en rafales, avec un filtre qui saute au hasard à chaque coup : des glitchs.",
    melodique: { key: "D", scale: 1 },
    reglages: [
      r("osc.type", "350 CHIP-NOISE"),
      r("filter.lpf", "Acid LPF"), v("filter.cutoff", "60"), v("filter.resonance", "70"),
      r("mod.type", "61 S&HBPM Filter"), v("mod.depth", "70"), v("mod.speed", "80"),
      r("amp.eg", "ON"), v("amp.decay", "15"),
      r("ifx.on", "ON"), r("ifx.type", "5 Bit Crusher"), v("ifx.edit", "50"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x.x...xx..x.x...", "x.x...xx..x.x...", "x.x...xx..x.xx.x", "x.xxx.xx.xxxxxxx"),
    relance: "Les rafales remplissent presque toute la mesure.",
    apercu: { son: "noise", octave: 0 },
    variantes: [
      { nom: "Hasard libre", idee: "Random au lieu de S&H calé sur le tempo.", reglages: [r("mod.type", "67 Random Filter")] },
      { nom: "Plus long", idee: "Les coups durent plus.", reglages: [v("amp.decay", "40")] },
    ],
    exercices: ["ex.resonance", "ex.decay"],
  },
  {
    id: "noise-craque-tekno", nom: "Craquements lo-fi", styles: ["tekno", "tribe"], fonction: "percussion", element: "noise", partie: 10,
    idee: "Des petits bruits très courts et dégradés, placés à des endroits irréguliers : comme les craquements d'un vieux disque.",
    reglages: [
      r("osc.type", "379 LOFI NOISE"),
      r("filter.hpf", "electribe HPF"), v("filter.cutoff", "60"),
      r("amp.eg", "ON"), v("amp.decay", "5"), v("amp.level", "60"),
      r("mod.type", "71 Random Pan"), v("mod.depth", "80"),
      r("ifx.on", "ON"), r("ifx.type", "4 Decimator"), v("ifx.edit", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M(".x....x..x.....x", "...x.x......x...", ".x....x..x.....x", "...x.x..x.x.x.xx"),
    relance: "Les craquements se rapprochent en fin de mesure.",
    apercu: { son: "noise", octave: 0 },
    variantes: [
      { nom: "Bruit Noiser", idee: "Un autre bruit de la liste Synth FX.", reglages: [r("osc.type", "275 Noiser")] },
      { nom: "Plus présent", idee: "Plus de Level.", reglages: [v("amp.level", "100")] },
    ],
    exercices: ["ex.decay", "ex.pan"],
  },

  // =================== VOIX / SAMPLE VOCAL ===================
  {
    id: "voix-hey-tribe", nom: "Cri « Hey » en réponse", styles: ["tribe"], fonction: "effet", element: "voix", partie: 11,
    idee: "L'oscillateur Voice 269 Hey placé sur le dernier temps toutes les deux mesures, avec un écho : un cri de foule qui répond au groove.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "269 Hey"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "60"),
      r("ifx.on", "ON"), r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("................", "............0...", "................", "....0.......0.0."),
    relance: "Trois « Hey » au lieu d'un, pour chauffer la relance.",
    apercu: { son: "voix", octave: 1 },
    variantes: [
      { nom: "Autre cri", idee: "Voice 264 Haa.", reglages: [r("osc.type", "264 Haa")] },
      { nom: "Sans écho", idee: "Un cri sec.", reglages: [r("ifx.on", "OFF")] },
    ],
    astuces: [
      { texte: LIMITES_VOIX, ref: PG(13) },
      { texte: "Les oscillateurs Voice sont des sons enregistrés très courts : l'aperçu les imite seulement avec une voyelle synthétique." },
    ],
    exercices: ["ex.decay", "ex.ifxedit"],
  },
  {
    id: "voix-rave-tekno", nom: "Voix rave hachée", styles: ["tekno"], fonction: "effet", element: "voix", partie: 11,
    idee: "La voix 258 Rave redéclenchée en rafale et découpée par le Slicer : un sample vocal haché typique des free parties.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "258 Rave"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "40"),
      r("ifx.on", "ON"), r("ifx.type", "38 Slicer"), v("ifx.edit", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0...............", "0...............", "0.......0.......", "0.0.0.0.0000OOOO"),
    relance: "La voix est redéclenchée de plus en plus vite et monte à l'octave.",
    apercu: { son: "voix", octave: 1 },
    variantes: [
      { nom: "ComOn", idee: "Une autre phrase de la liste Voice.", reglages: [r("osc.type", "261 ComOn")] },
      { nom: "Répétée", idee: "Le Repeater au lieu du Slicer.", reglages: [r("ifx.type", "37 Repeater")] },
    ],
    astuces: [{ texte: LIMITES_VOIX, ref: PG(13) }],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "voix-robot-mentale", nom: "Voix de robot", styles: ["mentale"], fonction: "effet", element: "voix", partie: 11, bpm: 175,
    idee: "La voix synthétique BotVox1 passée dans le Ring Modulator, avec une hauteur qui saute au hasard : une voix de machine qui « parle » en morceaux.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "272 BotVox1"), r("part.voiceassign", "Mono2"),
      r("mod.type", "62 S&HBPM Pitch"), v("mod.depth", "30"), v("mod.speed", "60"),
      r("amp.eg", "ON"), v("amp.decay", "35"),
      r("ifx.on", "ON"), r("ifx.type", "6 Ring Modulator"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0.....0.........", "0.....0...1.....", "0.....0.........", "0.0.1.1.0.0.1.1."),
    relance: "La voix robot bégaie entre D et D#.",
    apercu: { son: "voix", octave: 1 },
    variantes: [
      { nom: "Bouche filtrée", idee: "Le Talk Filter, qui donne une couleur de voyelle.", reglages: [r("ifx.type", "17 Talk Filter")] },
      { nom: "BotVox2", idee: "L'autre voix robot.", reglages: [r("osc.type", "273 BotVox2")] },
    ],
    astuces: [
      { texte: LIMITES_VOIX, ref: PG(13) },
      { texte: "Le Talk Filter n'est pas un vocoder : il ajoute une couleur de voyelle au son, mais ne fait pas parler un synthé avec ta voix.", ref: PG(16) },
    ],
    exercices: ["ex.depth", "ex.ifxedit"],
  },
  {
    id: "voix-choeur-nappe", nom: "Chœur en nappe", styles: ["tribe", "mentale"], fonction: "nappe", element: "voix", partie: 11,
    idee: "L'instrument 392 Vox Pad joué comme une nappe : un chœur « aah » qui tient l'accord. C'est le seul moyen de jouer une voix sur des notes tenues.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "392 Vox Pad"), r("part.voiceassign", "Poly1"),
      r("filter.lpf", "P5 LPF"), v("filter.cutoff", "70"),
      r("amp.eg", "ON"), v("amp.attack", "70"), v("amp.decay", "110"),
      r("ifx.on", "ON"), r("ifx.type", "27 Chorus"), v("ifx.edit", "50"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "5~~~~~~~~~~~~~~~", "4~~~~~~~6~~~~~~~"),
    relance: "Le chœur passe sur A puis C.",
    apercu: { son: "voix", octave: 1 },
    variantes: [
      { nom: "Voix pop", idee: "391 Vox Pop Ah, plus claire.", reglages: [r("osc.type", "391 Vox Pop Ah")] },
      { nom: "Voix aiguë", idee: "393 Vox Helium.", reglages: [r("osc.type", "393 Vox Helium")] },
    ],
    astuces: [{ texte: LIMITES_VOIX, ref: PG(13) }],
    exercices: ["ex.attack", "ex.cutoff"],
  },
  {
    id: "voix-audio-in", nom: "Ta voix en direct par Audio In", styles: ["tekno", "tribe", "mentale"], fonction: "effet", element: "voix", partie: 12,
    idee: "Une source branchée sur la prise Audio In (téléphone, lecteur, table de mixage) passe dans une partie avec l'oscillateur 409 Audio In, puis dans le filtre et le Talk Filter. Le son n'est pas enregistré : il faut que la source joue en même temps.",
    reglages: [
      r("osc.type", "409 Audio In"), r("part.voiceassign", "Mono2"),
      r("filter.bpf", "electribe BPF"), v("filter.cutoff", "60"), v("filter.resonance", "40"),
      r("amp.eg", "ON"), v("amp.decay", "30"),
      r("ifx.on", "ON"), r("ifx.type", "17 Talk Filter"), v("ifx.edit", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x.x.x.x.x.x.x.x.", "xxxxxxxxxxxxxxxx"),
    relance: "Les pas se rapprochent : la source est hachée de plus en plus vite.",
    apercu: { son: "voix", octave: 1 },
    variantes: [
      { nom: "Source entendue en continu", idee: "AUDIO IN THRU sur On (menu Global) : la source est aussi envoyée telle quelle vers les sorties, en plus de la partie.", reglages: [r("glob.audiointhru", "On")] },
      { nom: "Hachée par le Slicer", idee: "Le Slicer découpe la source en rythme.", reglages: [r("ifx.type", "38 Slicer")] },
    ],
    astuces: [
      { texte: "Branche la source sur la prise Audio In (minijack) et règle son niveau avec la commande Input Level.", ref: OM(25) },
      { texte: "Commande Input Level : niveau d'entrée de la prise Audio In.", ref: OM(22) },
      { texte: "AUDIO IN THRU envoie le signal de la prise Audio In vers les sorties.", ref: PG(7) },
      { texte: "Le manuel ne donne que le nom de l'oscillateur 409 Audio In. Que la partie laisse passer le son seulement quand un pas joue, avec Amp EG sur ON, reste à vérifier sur la machine. Le manuel ne dit pas non plus si un micro peut être branché directement : un téléphone ou un lecteur est plus sûr." },
      { texte: LIMITES_VOIX },
    ],
    exercices: ["ex.decay", "ex.resonance"],
  },
];
