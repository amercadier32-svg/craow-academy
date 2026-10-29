// Exercices d'écoute : ils remplacent les infos ABSENTES des manuels.
// Le contenu est une proposition pédagogique (badge « Pratique ») ; chaque geste
// à faire sur la machine renvoie à la page du manuel qui le décrit.
// Ce que tu entends est noté dans « Mes observations » (sauvegarde locale, relue par le Carnet).
import type { Source } from "../lib/data";

/** Valeur de départ proposée. Sans plage dans le manuel, elle est marquée « à vérifier sur l'écran ». */
export interface StartValue { param: string; nom: string; valeur: string; aVerifier: boolean }
export interface Step { texte: string; ref?: Source; valeurs?: StartValue[] }
export interface ObsTarget { id: string; label: string; aide?: string }

export interface Exercise {
  id: string;
  titre: string;
  pourquoi: string;          // ce que le manuel ne dit pas
  prepa?: boolean;           // nécessite le son de test (ex.setup)
  etapes: Step[];
  questions: string[];       // quoi écouter / noter
  cibles: ObsTarget[];       // une case de notes par cible
  params?: string[];         // paramètres concernés (ids de parameters.json)
  plages?: string[];         // paramètres dont tu relèves le min / max sur l'écran
  controles?: string[];      // contrôles du panneau concernés
}

const OM = (page: number): Source => ({ doc: "OM", page });
const PG = (page: number): Source => ({ doc: "PG", page });

const ECRAN = "Regarde l'écran pendant que tu tournes : note dans les cases Plage la valeur minimum et maximum affichée.";
// Valeur proposée pour un potard dont le manuel ne donne pas la plage.
const v = (param: string, nom: string, valeur: string): StartValue => ({ param, nom, valeur, aVerifier: true });

export const SETUP: Exercise = {
  id: "ex.setup",
  titre: "Préparer un son de test",
  pourquoi: "Base commune à tous les exercices d'écoute : un son simple qui tourne en boucle.",
  etapes: [
    { texte: "Sur l'écran de sélection de motif (Exit deux fois), choisis un motif vide « Init Pattern » (n° 201 à 250) avec la molette.", ref: PG(18) },
    { texte: "Choisis la partie 1 avec les boutons <Part, Part>.", ref: OM(27) },
    { texte: "Tourne le potard Oscillator jusqu'à SAW (n° 326).", ref: PG(12) },
    { texte: "Allume le bouton Sequencer, puis allume les pas 1, 5, 9 et 13 avec les pads.", ref: OM(30) },
    { texte: "Lance la lecture avec Lecture/Pause et tape le tempo sur Tap (ou menu BPM) vers 165.", ref: OM(30) },
  ],
  questions: ["Tu dois entendre une note de dent de scie sur chaque temps."],
  cibles: [],
};

function knob(
  id: string, param: string, control: string, titre: string, setup: Step[], questions: string[],
): Exercise {
  return {
    id, titre, prepa: true, params: [param], plages: [param], controles: [control],
    pourquoi: "Le manuel décrit ce potard mais ne donne ni sa plage de valeurs ni l'effet de chaque valeur.",
    etapes: [...setup, { texte: ECRAN }],
    questions,
    cibles: [{ id: `param:${param}`, label: titre.replace(/^Écouter /, "") }],
  };
}

export const EXERCISES: Exercise[] = [
  knob("ex.cutoff", "filter.cutoff", "cutoff", "Écouter le potard Filter (Cutoff)",
    [{ texte: "Appuie sur LPF jusqu'à « electribe LPF ».", ref: OM(23) },
     { texte: "Tourne le potard Filter lentement, du minimum au maximum.", ref: OM(23) }],
    ["À quelle valeur le son devient-il sourd, étouffé ?", "À quelle valeur est-il le plus brillant ?"]),
  knob("ex.resonance", "filter.resonance", "resonance", "Écouter le potard Resonance",
    [{ texte: "Filtre electribe LPF, potard Filter sur la valeur proposée.", ref: OM(23), valeurs: [v("filter.cutoff", "Filter", "64")] },
     { texte: "Monte Resonance doucement, puis refais un balayage du potard Filter.", ref: OM(23) }],
    ["À partir de quelle valeur entends-tu un sifflement ?", "Le son devient-il instable ou siffle-t-il seul au maximum ?"]),
  knob("ex.egint", "filter.egint", "egint", "Écouter le potard EG Int",
    [{ texte: "Amp EG allumé, Attack au minimum, Decay/Release court.", ref: OM(23) },
     { texte: "Règle Filter sur la valeur proposée, puis tourne EG Int d'un bout à l'autre.", ref: OM(23), valeurs: [v("filter.cutoff", "Filter", "40")] }],
    ["Le potard a-t-il un centre (effet inversé d'un côté) ?", "Quel réglage donne un « wouw » marqué sur chaque note ?"]),
  knob("ex.pitch", "osc.pitch", "pitch", "Écouter le potard Pitch",
    [{ texte: "Tourne Pitch d'un cran à la fois et regarde l'écran.", ref: OM(23) }],
    ["La hauteur change-t-elle par petits paliers ou en continu ?", "Combien de notes d'écart entre le minimum et le maximum ?"]),
  knob("ex.glide", "osc.glide", "pitch", "Écouter le Glide (Shift + Pitch/Glide)",
    [{ texte: "Allume Keyboard et joue deux pads éloignés l'un après l'autre.", ref: OM(28) },
     { texte: "Tiens Shift et tourne Pitch/Glide, puis rejoue les deux pads.", ref: OM(23) }],
    ["À quelle valeur le glissement devient-il audible ? très lent ?"]),
  knob("ex.attack", "amp.attack", "attack", "Écouter le potard Attack",
    [{ texte: "Allume Amp EG.", ref: OM(23) }, { texte: "Tourne Attack du minimum au maximum.", ref: OM(23) }],
    ["À quelle valeur l'attaque n'est-elle plus « sèche » ?", "Au tempo 165, à partir de quelle valeur la note n'a plus le temps de monter ?"]),
  knob("ex.decay", "amp.decay", "decay", "Écouter le potard Decay/Release",
    [{ texte: "Allume Amp EG, Attack au minimum.", ref: OM(23) }, { texte: "Tourne Decay/Release du minimum au maximum.", ref: OM(23) }],
    ["Quelle valeur donne un son très court, « pointé » ?", "À partir de quelle valeur les notes se chevauchent-elles ?"]),
  knob("ex.level", "amp.level", "level", "Écouter le potard Level",
    [{ texte: "Tourne Level du minimum au maximum.", ref: OM(23) }],
    ["La partie sature-t-elle au maximum ?"]),
  knob("ex.pan", "amp.pan", "pan", "Écouter le potard Pan",
    [{ texte: "Écoute au casque, puis tourne Pan d'un bout à l'autre.", ref: OM(23) }],
    ["Comment l'écran affiche-t-il le centre, la gauche et la droite ?"]),
  knob("ex.speed", "mod.speed", "speed", "Écouter le potard Speed",
    [{ texte: "Potard Modulation sur « LFOTri Pitch » (n° 26), Depth sur la valeur proposée.", ref: PG(14), valeurs: [v("mod.depth", "Depth", "64")] },
     { texte: "Tourne Speed lentement. Essaie aussi « LFOTriB Pitch » (n° 32, synchronisé au tempo).", ref: PG(14) }],
    ["En LFOTri, quelle valeur donne un vibrato lent ? rapide ?", "En LFOTriB, l'écran affiche-t-il des valeurs de note (1/4, 1/8…) ?"]),
  knob("ex.depth", "mod.depth", "depth", "Écouter le potard Depth",
    [{ texte: "Modulation « LFOTri Pitch » (n° 26), Speed sur la valeur proposée.", ref: PG(14), valeurs: [v("mod.speed", "Speed", "64")] },
     { texte: "Tourne Depth du minimum au maximum.", ref: OM(23) }],
    ["Le potard a-t-il un centre (modulation inversée) ?", "À partir de quelle valeur l'effet devient-il fort ?"]),
  knob("ex.ifxedit", "ifx.edit", "ifxedit", "Écouter le potard Edit de l'Insert Fx",
    [{ texte: "Allume IFX On, choisis « Distortion » (n° 3) avec le potard Insert Fx.", ref: PG(16) },
     { texte: "Tourne Edit. Recommence avec « Delay 1/8 » (n° 20).", ref: OM(23) }],
    ["Que règle Edit sur Distortion ? sur Delay 1/8 ?"]),
  {
    id: "ex.mfxxy", titre: "Écouter le pad tactile en Master Fx", prepa: true,
    params: ["mfx.x", "mfx.y"], plages: ["mfx.x", "mfx.y"], controles: ["touchpad", "masterfx"],
    pourquoi: "Le manuel ne dit pas ce que règlent les axes X et Y pour chaque effet master.",
    etapes: [
      { texte: "Appuie sur Master Fx, puis allume MFX Send sur la partie 1.", ref: OM(29) },
      { texte: "Choisis un effet : Shift + Master Fx ouvre la page MFX TYPE.", ref: PG(10) },
      { texte: "Glisse le doigt de gauche à droite (X), puis de bas en haut (Y).", ref: OM(29) },
    ],
    questions: ["Que change l'axe X ? l'axe Y ?", "Pour quel effet est-ce le plus utile en montée ou en break ?"],
    cibles: [
      { id: "mfx:4", label: "Hall Reverb (n° 4)" }, { id: "mfx:9", label: "Step Shifter (n° 9)" },
      { id: "mfx:10", label: "Slicer (n° 10)" }, { id: "mfx:18", label: "Low Pass Filter (n° 18)" },
      { id: "mfx:19", label: "High Pass Filter (n° 19)" }, { id: "mfx:2", label: "Tape Delay (n° 2)" },
    ],
  },
  {
    id: "ex.filters", titre: "Comparer les types de filtres", prepa: true,
    params: ["filter.lpf", "filter.hpf", "filter.bpf"], controles: ["lpf", "hpf", "bpf"],
    pourquoi: "Le guide donne seulement les noms des filtres (p. 15), pas leur caractère sonore.",
    etapes: [
      { texte: "Règle Resonance et Filter sur les valeurs proposées.", ref: OM(23), valeurs: [v("filter.resonance", "Resonance", "80"), v("filter.cutoff", "Filter", "64")] },
      { texte: "Appuie plusieurs fois sur LPF pour passer d'un type à l'autre. Pour chaque type, balaie le potard Filter.", ref: OM(23) },
      { texte: "Recommence avec HPF puis BPF.", ref: PG(15) },
    ],
    questions: ["Doux ou agressif ?", "La résonance siffle-t-elle fort ?", "Le grave reste-t-il présent ?", "Pour quel son tribe / tekno je le garde ?"],
    cibles: [
      ...["MS20", "MG", "P5", "OB", "Acid", "electribe"].map((t) => ({ id: `filter:LPF:${t}`, label: `${t} LPF` })),
      ...["MS20", "P5", "OB", "Acid", "electribe"].map((t) => ({ id: `filter:HPF:${t}`, label: `${t} HPF` })),
      ...["MS20", "P5", "OB", "Acid", "electribe"].map((t) => ({ id: `filter:BPF:${t}`, label: `${t} BPF` })),
    ],
  },
  {
    id: "ex.oscedit", titre: "Découvrir le potard Edit selon l'oscillateur", prepa: true,
    params: ["osc.edit"], plages: ["osc.edit"], controles: ["oscedit", "osc"],
    pourquoi: "Le manuel dit seulement que l'effet du potard Edit dépend de l'oscillateur (p. 23). Le guide ne détaille aucun oscillateur.",
    etapes: [
      { texte: "Pour chaque oscillateur de la liste ci-dessous, choisis-le avec le potard Oscillator (numéro affiché).", ref: PG(12) },
      { texte: "Tourne Edit du minimum au maximum et écoute.", ref: OM(23) },
      { texte: "Shift + Oscillator saute d'une catégorie à l'autre : pratique pour aller vite.", ref: PG(10) },
    ],
    questions: ["Que change Edit : épaisseur, désaccord, brillance, hauteur, bruit… ?", "Quelle valeur d'Edit préfères-tu pour la tekno ?"],
    cibles: [
      { id: "osc:326", label: "SAW (326)" }, { id: "osc:328", label: "PULSE (328)" },
      { id: "osc:331", label: "DUAL-SAW (331)" }, { id: "osc:335", label: "OCT-SAW (335)" },
      { id: "osc:339", label: "UNI-SAW (339)" }, { id: "osc:343", label: "SYNC-SAW (343)" },
      { id: "osc:347", label: "CHIP-TRI 1 (347)" }, { id: "osc:351", label: "RING-SAW (351)" },
      { id: "osc:355", label: "X-SAW 1 (355)" }, { id: "osc:363", label: "VPM-SAW (363)" },
      { id: "osc:370", label: "SYN-SINE 1 (370)" }, { id: "osc:377", label: "HPF NOISE (377)" },
      { id: "osc:1", label: "Kick SubBeef (1)", aide: "Un oscillateur PCM, pour comparer." },
      { id: "osc:5", label: "Kick Hardstyle (5)" }, { id: "osc:6", label: "Kick Hardcore (6)" },
    ],
  },
];


// ---------- Chaîne du son : ce que le manuel ne dit pas sur l'ordre des blocs ----------
export const CHAIN_EXERCISES: Exercise[] = [
  {
    id: "ex.chain.ifxfilter", titre: "L'Insert Fx est-il avant ou après le filtre ?", prepa: true,
    params: ["ifx.type"], controles: ["ifxtype"],
    pourquoi: "Le manuel décrit le filtre et l'effet d'insertion, mais ne dit pas dans quel ordre le son les traverse.",
    etapes: [
      { texte: "Appuie sur LPF jusqu'à « electribe LPF » et baisse le potard Filter à la valeur proposée : le son devient sourd.", ref: OM(23), valeurs: [v("filter.cutoff", "Filter", "20")] },
      { texte: "Allume IFX On et choisis « Distortion » (n° 3) avec le potard Insert Fx.", ref: PG(16) },
      { texte: "Monte le potard Edit de l'Insert Fx à la valeur proposée.", ref: OM(23), valeurs: [v("ifx.edit", "Edit", "100")] },
    ],
    questions: [
      "La distorsion fait-elle revenir des aigus agressifs malgré le filtre fermé ?",
      "Si oui, l'effet agit après le filtre. Si le son reste sourd, il agit avant.",
    ],
    cibles: [{ id: "chain:ifx-filtre", label: "Ordre filtre / Insert Fx" }],
  },
  {
    id: "ex.chain.ifxamp", titre: "L'Insert Fx est-il avant ou après l'ampli ?", prepa: true,
    params: ["ifx.type", "amp.decay"], controles: ["ifxtype", "decay"],
    pourquoi: "Le manuel ne dit pas si l'effet d'insertion reçoit le son avant ou après l'enveloppe de volume (Amp EG).",
    etapes: [
      { texte: "Allume Amp EG, Attack au minimum, Decay/Release sur la valeur proposée : une note très courte.", ref: OM(23), valeurs: [v("amp.decay", "Decay/Release", "20")] },
      { texte: "Allume IFX On et choisis « Delay 1/8 » (n° 20).", ref: PG(16) },
      { texte: "Règle le potard Edit de l'Insert Fx sur la valeur proposée.", ref: OM(23), valeurs: [v("ifx.edit", "Edit", "64")] },
    ],
    questions: [
      "Entends-tu des échos après la fin de la note courte ?",
      "Si oui, le delay agit après l'enveloppe d'ampli. Sinon, il est coupé avec la note.",
    ],
    cibles: [{ id: "chain:ifx-ampli", label: "Ordre ampli / Insert Fx" }],
  },
  {
    id: "ex.chain.egamp", titre: "EG Int marche-t-il quand Amp EG est éteint ?", prepa: true,
    params: ["filter.egint", "amp.eg"], controles: ["egint", "ampeg"],
    pourquoi: "Le manuel dit que EG Int utilise l'enveloppe de la section Amp/EG, et qu'Amp EG éteint ignore l'enveloppe pour le volume. Il ne dit pas ce qui arrive au filtre.",
    etapes: [
      { texte: "Filtre electribe LPF, Filter et EG Int sur les valeurs proposées, Decay/Release court.", ref: OM(23), valeurs: [v("filter.cutoff", "Filter", "40"), v("filter.egint", "EG Int", "100")] },
      { texte: "Écoute avec Amp EG allumé, puis éteins Amp EG.", ref: OM(23) },
    ],
    questions: ["Le « wouw » du filtre reste-t-il quand Amp EG est éteint ?"],
    cibles: [{ id: "chain:eg-ampeg", label: "EG Int avec Amp EG éteint" }],
  },
  {
    id: "ex.chain.send", titre: "Comparer MFX Send allumé et éteint", prepa: true,
    params: ["mfx.send"], controles: ["mfxsend"],
    pourquoi: "Le manuel dit qu'une partie est envoyée ou non à l'effet master. Il ne dit pas si son volume change, ni où elle rejoint le mélange.",
    etapes: [
      { texte: "Appuie sur Master Fx, puis choisis « Hall Reverb » (n° 4) : Shift + Master Fx ouvre la page MFX TYPE.", ref: PG(10) },
      { texte: "Allume MFX Send sur la partie 1 et touche le pad tactile.", ref: OM(29) },
      { texte: "Éteins MFX Send et touche à nouveau le pad tactile.", ref: OM(23) },
    ],
    questions: ["Sans MFX Send, le son reste-t-il totalement sec ?", "Le volume de la partie change-t-il quand tu allumes MFX Send ?"],
    cibles: [{ id: "chain:mfxsend", label: "MFX Send allumé / éteint" }],
  },
];

const ALL = [...EXERCISES, ...CHAIN_EXERCISES];
export const exerciseById = new Map(ALL.map((e) => [e.id, e]));

export const exercisesForParam = (paramId: string) => ALL.filter((e) => e.params?.includes(paramId));
export const exercisesForControl = (controlId: string) => ALL.filter((e) => e.controles?.includes(controlId));
