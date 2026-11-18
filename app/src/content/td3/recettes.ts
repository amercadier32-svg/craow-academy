// Recettes acid pour la Behringer TD-3 : 4 patterns de 16 pas = 4 mesures (64 pas), à enchaîner 1A → 4A.
// Badge « Pratique » : ce sont des propositions de style. Seuls les gestes viennent du guide TD-3.
//
// Notation d'un pas (16 par pattern, séparés par des espaces), comme sur la TD-3 :
//   « C » … « B », « C' » = la touche du C aigu (13 touches)
//   « + » = UP (octave au-dessus), « - » = DOWN (octave en dessous)
//   « ! » = ACCENT, « ~ » = SLIDE vers la note suivante
//   « _ » = TIE (la note d'avant continue), « . » = REST (silence)
// Les potards de la TD-3 n'ont pas d'écran : les réglages sont donnés de 0 (tout à gauche) à 10 (tout à droite),
// à l'oreille, avec un champ « Mes observations » pour noter tes vraies positions.

export type Touche = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B" | "C'";
export const TOUCHES: Touche[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C'"];

export interface PasTd3 {
  t: "note" | "tie" | "rest";
  touche?: Touche;
  oct?: -1 | 0 | 1;
  acc?: boolean;
  slide?: boolean;
}

export interface ReglagesTd3 {
  waveform: "saw" | "square";
  cutoff: number; resonance: number; envelope: number; decay: number; accent: number;
  distortion: boolean; drive?: number; tone?: number; level?: number;
}

export interface RecetteTd3 {
  id: string;
  nom: string;
  style: string;
  idee: string;
  bpm: number;            // tempo de l'aperçu (la TD-3 n'affiche pas de BPM)
  reglages: ReglagesTd3;
  patterns: [string, string, string, string];
  astuce: string;         // ce qu'il faut faire bouger en jouant
}

export const RECETTES_TD3: RecetteTd3[] = [
  {
    id: "premiere", nom: "Première ligne acid", style: "Acid", bpm: 130,
    idee: "La ligne pour apprendre : une seule note (C), des UP pour sauter d'octave, quelques accents, un slide à la fin.",
    reglages: { waveform: "saw", cutoff: 3, resonance: 6, envelope: 5, decay: 4, accent: 5, distortion: false },
    patterns: [
      "C! C . C C+ . C C! . C C+ . C D# . C",
      "C! C . C C+ . C C! . C C+ . C D# G~ C",
      "C! C . C C+ . C C! . C C+ . D#! D# F G~",
      "C! C . C C+ . C C! . C+! _ . C A#- C D#~",
    ],
    astuce: "Pendant que ça tourne, monte doucement CUTOFF puis redescends : c'est tout le jeu de l'acid.",
  },
  {
    id: "tekno-d", nom: "Acid tekno en D", style: "Tekno", bpm: 165,
    idee: "Ta tonalité fil rouge (D, notes de D Aeolian : D E F G A A# C) : une basse qui roule à 165, avec des accents sur les UP.",
    reglages: { waveform: "saw", cutoff: 4, resonance: 7, envelope: 6, decay: 3, accent: 7, distortion: true, drive: 4, tone: 5, level: 5 },
    patterns: [
      "D- D D+! D- D D A#- D D- D D+! D- C D F~ D",
      "D- D D+! D- D D A#- D D- D D+! D- C D A~ G",
      "D- D D+! D- F F F+! D- D D A#- D C D F~ D",
      "D- D D+! D- D D A#- D D- D+! _ D+! C+~ A# A~ G",
    ],
    astuce: "Avec l'E2 en maître (voir Séquenceur › Synchro), lance les 4 patterns en chaîne : maintiens PATTERN 1 et appuie sur PATTERN 4.",
  },
  {
    id: "squelch", nom: "Squelch à slides", style: "Acid", bpm: 138,
    idee: "Beaucoup de slides et une résonance haute : la ligne « miaule » d'une note à l'autre.",
    reglages: { waveform: "saw", cutoff: 3, resonance: 9, envelope: 7, decay: 5, accent: 8, distortion: false },
    patterns: [
      "A-! A~ A+ A- . A-! A~ C+ A- . A G~ A A-! . A+",
      "A-! A~ A+ A- . A-! A~ C+ A- . A G~ E~ G A+! _",
      "A-! A~ A+ A- . A-! A~ C+ A- . A G~ A A-! . A+",
      "A-! A~ A+ A- . A-! A~ C+ C+~ D+ E+! _ D+~ C+ A~ G",
    ],
    astuce: "Résonance très haute : garde VOLUME raisonnable, les accents peuvent sortir fort.",
  },
  {
    id: "tribe", nom: "Tribe roulant", style: "Tribe", bpm: 165,
    idee: "Des silences qui laissent respirer le kick, des accents décalés : la basse tourne autour du D grave.",
    reglages: { waveform: "saw", cutoff: 2, resonance: 5, envelope: 5, decay: 3, accent: 6, distortion: true, drive: 3, tone: 4, level: 5 },
    patterns: [
      "D-! . D D- . D- D! . D- . D A#- D-! . C D",
      "D-! . D D- . D- D! . D- . D A#- D-! _ F~ D",
      "D-! . D D- . D- D! . D- . D A#- D-! . C D",
      "D-! . D D- . D- D! . D-! D-! D . G! _ F~ D",
    ],
    astuce: "Monte DECAY sur le pattern 4 : la fin de la boucle s'ouvre et annonce le retour au pattern 1.",
  },
  {
    id: "hardtek", nom: "Hardtek carré", style: "Hardtek", bpm: 175,
    idee: "Onde pulse (carrée) et distorsion : un son plus creux et plus dur, en E.",
    reglages: { waveform: "square", cutoff: 4, resonance: 6, envelope: 6, decay: 2, accent: 7, distortion: true, drive: 7, tone: 6, level: 4 },
    patterns: [
      "E-! E- E E-! E- E E- E+! E-! E- E E-! E- G E- B~",
      "E-! E- E E-! E- E E- E+! E-! E- E E-! E- G E- D~",
      "G-! G- G G-! G- G G- G+! E-! E- E E-! E- G E- B~",
      "E-! E- E E-! E- E E- E+! E-! E+! E E+! E- E+! D+~ B",
    ],
    astuce: "DRIVE haut fait monter le volume : compense avec LEVEL avant de toucher VOLUME.",
  },
  {
    id: "dub", nom: "Dub acid", style: "Dub tekno", bpm: 125,
    idee: "Peu de notes, longues (TIE), filtre presque fermé : une basse profonde qui laisse la place aux échos de l'E2.",
    reglages: { waveform: "saw", cutoff: 2, resonance: 4, envelope: 3, decay: 7, accent: 3, distortion: false },
    patterns: [
      "C- _ _ . . . C! _ . . G-~ C . . . .",
      "C- _ _ . . . C! _ . . G-~ C . D# . .",
      "C- _ _ . . . C! _ . . G-~ C . . . .",
      "C- _ _ . . . C! _ . . G-~ A#- _ _ G-~ C",
    ],
    astuce: "Tourne ENVELOPE très lentement sur 4 mesures : le son s'ouvre sans changer une note.",
  },
];

/** Lit un pattern écrit en notation courte (voir en haut du fichier). */
export function lirePattern(s: string): PasTd3[] {
  return s.trim().split(/\s+/).map((tok): PasTd3 => {
    if (tok === "_") return { t: "tie" };
    if (tok === ".") return { t: "rest" };
    const m = /^(C'|[A-G]#?)([+-]?)(!?)(~?)$/.exec(tok);
    if (!m) throw new Error(`Pas TD-3 illisible : ${tok}`);
    return { t: "note", touche: m[1] as Touche, oct: m[2] === "+" ? 1 : m[2] === "-" ? -1 : 0, acc: m[3] === "!", slide: m[4] === "~" };
  });
}

/** Le geste sur la TD-3 pour une note : « D# », « UP + C », « DOWN + A# ». */
export function geste(p: PasTd3): string {
  if (p.t !== "note") return p.t === "tie" ? "TIE" : "REST";
  return `${p.oct === 1 ? "UP + " : p.oct === -1 ? "DOWN + " : ""}${p.touche}`;
}

/** Hauteur pour l'aperçu du navigateur (demi-tons au-dessus du C grave de l'aperçu). */
export const demiTons = (p: PasTd3) => TOUCHES.indexOf(p.touche!) + 12 * (p.oct ?? 0);

export const recetteTd3ById = new Map(RECETTES_TD3.map((r) => [r.id, r]));
