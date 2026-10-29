// Position de chaque élément, mesurée sur la photo de ta machine
// (docs/photos/electribe2-synth-alex.png, 993 × 582 px). Coordonnées en pixels de la photo ;
// le composant les convertit en pourcentages du panneau.
export const PHOTO = { x0: 3, y0: 23, w: 978, h: 542 };

export type Kind = "knob" | "knobBig" | "knobBlue" | "knobValue" | "power" | "btn" | "transport" | "step" | "pad" | "touchpad" | "display";

export interface Item {
  id: string;          // id du contrôle dans data/electribe2/panel.json
  kind: Kind;
  cx: number;          // centre x
  cy: number;          // centre y
  w?: number;          // largeur (boutons, pads…)
  h?: number;
  r?: number;          // rayon (potards)
  label?: string;      // texte sérigraphié
  labelAt?: "above" | "below" | "inside";
  index?: number;      // pads 0-15, step 0-3
}

const btn = (id: string, cx: number, cy: number, label: string): Item => ({ id, kind: "btn", cx, cy, w: 44, h: 21, label, labelAt: "inside" });
const knob = (id: string, cx: number, cy: number, label: string, labelAt: "above" | "below" = "below"): Item => ({ id, kind: "knob", cx, cy, r: 16, label, labelAt });
const big = (id: string, cx: number, cy: number): Item => ({ id, kind: "knobBig", cx, cy, r: 23 });

const PAD_X = [282, 365, 448, 531, 623, 705, 788, 870];

export const ITEMS: Item[] = [
  // 1-3 : alimentation et niveaux
  { id: "power", kind: "power", cx: 80.5, cy: 88.5, r: 12.5, label: "⏻", labelAt: "above" },
  { id: "volume", kind: "knobBlue", cx: 147, cy: 87, r: 17, label: "Volume", labelAt: "above" },
  { id: "inputlevel", kind: "knobBlue", cx: 214, cy: 87, r: 17, label: "Input Level", labelAt: "above" },
  // 4 : écran
  { id: "display", kind: "display", cx: 147, cy: 184, w: 204, h: 118 },
  // 5 : transport
  { id: "rec", kind: "transport", cx: 73.5, cy: 292, w: 44, h: 44, label: "●" },
  { id: "stop", kind: "transport", cx: 123, cy: 292, w: 44, h: 44, label: "■" },
  { id: "play", kind: "transport", cx: 172, cy: 292, w: 44, h: 44, label: "▶❚❚" },
  { id: "tap", kind: "transport", cx: 222.5, cy: 292, w: 44, h: 44, label: "Tap" },
  // 6 : pad tactile
  btn("gatearp", 73.5, 337.5, "Gate Arp"),
  btn("touchscale", 122.5, 337.5, "Touch Scale"),
  btn("masterfx", 173, 337.5, "Master Fx"),
  btn("mfxhold", 222, 337.5, "MFX Hold"),
  { id: "touchpad", kind: "touchpad", cx: 148.5, cy: 448, w: 189, h: 146 },
  // 7 : section commune
  { id: "value", kind: "knobValue", cx: 331, cy: 155, r: 25 },
  btn("cursor", 306, 219, "<"),
  { ...btn("cursor", 356, 219, ">"), index: 1 },
  btn("menu", 306, 253.5, "Menu/Enter"),
  btn("exit", 356, 253.5, "Exit"),
  btn("shift", 306, 288.5, "Shift"),
  btn("write", 356, 288.5, "Write"),
  // 8 : section d'édition
  big("osc", 432.5, 153.5),
  knob("pitch", 432.5, 223.5, "Pitch/Glide"),
  knob("oscedit", 432, 288, "Edit"),
  big("cutoff", 554.5, 153),
  knob("resonance", 514.5, 223, "Resonance"),
  knob("egint", 595.5, 224, "EG Int"),
  btn("lpf", 505, 288.5, "LPF"),
  btn("hpf", 554, 288.5, "HPF"),
  btn("bpf", 603, 288.5, "BPF"),
  big("modtype", 675.5, 153.5),
  knob("depth", 675, 223.5, "Depth"),
  knob("speed", 676, 287, "Speed"),
  knob("level", 753.5, 152.5, "Level"),
  knob("pan", 833, 153, "Pan"),
  knob("attack", 754, 223, "Attack"),
  knob("decay", 833, 222, "Decay/Release"),
  btn("mfxsend", 751, 288.5, "MFX Send"),
  btn("ampeg", 829, 287.5, "Amp EG"),
  big("ifxtype", 911, 153),
  knob("ifxedit", 910.5, 222.5, "Edit"),
  btn("ifxon", 907, 287.5, "IFX On"),
  // 9 : boutons Step
  ...[829, 861, 893, 925].map((cx, i): Item => ({ id: "step", kind: "step", cx, cy: 328.5, w: 20, h: 35, label: String(i + 1), index: i })),
  // 10-11 : édition de partie, mode des pads
  btn("partsel", 306.5, 336.5, "< Part"),
  { ...btn("partsel", 356, 336.5, "Part >"), index: 1 },
  btn("partmute", 405.5, 336.5, "Part Mute"),
  btn("parterase", 455, 336.5, "Part Erase"),
  btn("trigger", 504, 336.5, "Trigger"),
  btn("sequencer", 554, 336.5, "Sequencer"),
  btn("keyboard", 603, 336.5, "Keyboard"),
  btn("chord", 652, 336.5, "Chord"),
  btn("stepjump", 702, 336.5, "Step Jump"),
  btn("patternset", 751, 336.5, "Pattern Set"),
  // 12 : pads
  ...PAD_X.map((x, i): Item => ({ id: "pads", kind: "pad", cx: x + 35, cy: 406, w: 70, h: 70, index: i })),
  ...PAD_X.map((x, i): Item => ({ id: "pads", kind: "pad", cx: x + 36, cy: 489, w: 70, h: 70, index: i + 8 })),
];

// Textes sérigraphiés au-dessus des colonnes de la section d'édition.
export const SECTION_TITLES = [
  { text: "Oscillator", cx: 432, cy: 107 },
  { text: "Filter", cx: 554, cy: 107 },
  { text: "Modulation", cx: 675, cy: 107 },
  { text: "Amp/EG", cx: 793, cy: 107 },
  { text: "Insert Fx", cx: 910, cy: 107 },
];

// Pastilles « numéro de section du manuel » (Mode d'emploi p. 22-24).
export const SECTION_MARKERS = [
  { n: 1, cx: 56, cy: 88 }, { n: 2, cx: 121, cy: 62 }, { n: 3, cx: 186, cy: 62 },
  { n: 4, cx: 38, cy: 135 }, { n: 5, cx: 38, cy: 270 }, { n: 6, cx: 38, cy: 380 },
  { n: 7, cx: 280, cy: 130 }, { n: 8, cx: 385, cy: 100 }, { n: 9, cx: 808, cy: 312 },
  { n: 10, cx: 282, cy: 318 }, { n: 11, cx: 480, cy: 318 }, { n: 12, cx: 268, cy: 392 },
];
