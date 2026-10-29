// Recettes EFFETS ET TRANSITIONS : montée, break, fill, coupure, impact. Mêmes règles que recettes.ts (badge « Pratique ») :
//   r(id, valeur) = valeur prise dans une liste du manuel (vérifiée par npm run check),
//   v(id, valeur) = valeur de potard sans plage dans le manuel, affichée « à vérifier sur l'écran ».
// Mesures : "." silence, "x" un coup, "0"…"9" rang de la note dans la gamme, "O" la KEY une octave plus haut, "~" note tenue.
// Une transition concerne souvent plusieurs parties : la recette donne la partie qui la porte,
// et les astuces disent quoi faire des autres (Part Mute, effet master).
import type { Source } from "../lib/data";
import { pas } from "../lib/seq";
import type { Recette, Reglage } from "./recettes";

const r = (param: string, valeur: string): Reglage => ({ param, valeur });
const v = (param: string, valeur: string): Reglage => ({ param, valeur, aVerifier: true });
const PG = (page: number): Source => ({ doc: "PG", page });
const OM = (page: number): Source => ({ doc: "OM", page });
const M = (...m: [string, string, string, string]) => m.map(pas);

const MUTE = { texte: "Coupe ou rallume les autres parties avec Part Mute pendant la transition.", ref: OM(32) };
const MFX_APERCU = { texte: "L'aperçu ne joue pas l'effet master : écoute-le sur la machine, en tenant le doigt sur le pad tactile." };

export const RECETTES_TRANSITIONS: Recette[] = [
  // =================== MONTÉE ===================
  {
    id: "montee-sweep-tribe", nom: "Sweep de scie qui s'ouvre", styles: ["tribe"], fonction: "effet", element: "montee", partie: 10,
    idee: "Une note de scie tenue pendant deux mesures, dont le filtre s'ouvre en dent de scie calée sur le tempo : la montée respire avec le groove.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "331 DUAL-SAW"), r("part.voiceassign", "Mono2"), v("osc.edit", "50"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "20"), v("filter.resonance", "70"),
      r("mod.type", "37 SawUpB Filter"), v("mod.depth", "80"), v("mod.speed", "40"),
      r("amp.eg", "ON"), v("amp.decay", "127"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("................", "................", "0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~"),
    relance: "La note continue et le filtre s'ouvre de plus en plus à chaque cycle du LFO.",
    apercu: { son: "synth", octave: 1 },
    variantes: [
      { nom: "Cycles plus rapides", idee: "Plus de Speed : le sweep s'accélère.", reglages: [v("mod.speed", "80")] },
      { nom: "Passe-bande", idee: "Un son plus fin.", reglages: [r("filter.lpf", "OFF"), r("filter.bpf", "MS20 BPF")] },
    ],
    astuces: [{ texte: "Pour une vraie montée, tourne aussi le potard Cutoff à la main pendant les deux dernières mesures, ou enregistre ce geste en Motion Sequence.", ref: OM(31) }],
    exercices: ["ex.resonance", "ex.speed"],
  },
  {
    id: "montee-sirene-mentale", nom: "Sirène qui grimpe", styles: ["mentale"], fonction: "effet", element: "montee", partie: 10, bpm: 175,
    idee: "Une hauteur qui monte en dent de scie à chaque mesure, comme une sirène : la tension grimpe sans fin.",
    melodique: { key: "D", scale: 1 },
    reglages: [
      r("osc.type", "343 SYNC-SAW"), r("part.voiceassign", "Mono1"), v("osc.edit", "60"),
      r("mod.type", "38 SawUpB Pitch"), v("mod.depth", "60"), v("mod.speed", "30"),
      r("filter.lpf", "OB LPF"), v("filter.cutoff", "70"), v("filter.resonance", "40"),
      r("amp.eg", "ON"), v("amp.decay", "127"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "40"),
      r("step.gate", "TIE"), r("mfx.send", "ON"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "2~~~~~~~~~~~~~~~", "4~~~~~~~~~~~~~~~", "6~~~~~~~8~~~~~~~"),
    relance: "La note de base monte d'un ton à chaque mesure, puis encore deux fois en mesure 4.",
    apercu: { son: "synth", octave: 1 },
    variantes: [
      { nom: "Son de sirène", idee: "L'oscillateur 282 SynSiren de la liste Synth FX.", reglages: [r("osc.type", "282 SynSiren")] },
      { nom: "Plus de montée", idee: "Plus de Depth.", reglages: [v("mod.depth", "100")] },
    ],
    exercices: ["ex.depth", "ex.speed"],
  },
  {
    id: "montee-notes-tekno", nom: "Montée de notes qui accélère", styles: ["tekno"], fonction: "effet", element: "montee", partie: 10,
    idee: "Une note par temps, puis par croche, puis par double croche, qui monte la gamme : la montée se sent dans le rythme et dans la hauteur.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "328 PULSE"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "electribe LPF"), v("filter.cutoff", "50"), v("filter.resonance", "40"), v("filter.egint", "40"),
      r("amp.eg", "ON"), v("amp.decay", "25"),
      r("ifx.on", "ON"), r("ifx.type", "20 Delay 1/8"), v("ifx.edit", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0...0...0...0...", "1.1.1.1.2.2.2.2.", "3333444455556666", "0123456O0123456O"),
    relance: "Deux gammes complètes en doubles croches, jusqu'à l'octave.",
    apercu: { son: "square", octave: 1 },
    variantes: [
      { nom: "Avec Pitch Looper", idee: "Toutes les parties en MFX Send, et le Pitch Looper sur la dernière mesure.", reglages: [r("pat.mfxtype", "8 Pitch Looper")] },
      { nom: "Plus brillant", idee: "Le filtre s'ouvre.", reglages: [v("filter.cutoff", "85")] },
    ],
    astuces: [MFX_APERCU],
    exercices: ["ex.cutoff", "ex.egint"],
  },

  // =================== BREAK ===================
  {
    id: "break-nappe-tekno", nom: "Break de nappe seule", styles: ["tekno"], fonction: "effet", element: "break", partie: 8,
    idee: "Pendant 4 mesures, seule une nappe noyée dans la réverbération master reste : le public respire avant le retour du kick.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "339 UNI-SAW"), r("part.voiceassign", "Poly1"),
      r("filter.lpf", "OB LPF"), v("filter.cutoff", "55"),
      r("amp.eg", "ON"), v("amp.attack", "90"), v("amp.decay", "110"),
      r("mfx.send", "ON"), r("pat.mfxtype", "4 Hall Reverb"),
      r("step.gate", "TIE"),
    ],
    mesures: M("0~~~~~~~~~~~~~~~", "5~~~~~~~~~~~~~~~", "3~~~~~~~~~~~~~~~", "4~~~~~~~~~~~~~~~"),
    relance: "La nappe se pose sur G : l'accord qui appelle le retour sur D.",
    apercu: { son: "pad", octave: 1 },
    variantes: [
      { nom: "Réverbération mouillée", idee: "Wet Reverb, plus longue.", reglages: [r("pat.mfxtype", "6 Wet Reverb")] },
      { nom: "Nappe filtrée", idee: "Le filtre plus fermé.", reglages: [v("filter.cutoff", "30")] },
    ],
    astuces: [MUTE, MFX_APERCU],
    exercices: ["ex.attack", "ex.cutoff"],
  },
  {
    id: "break-kick-etouffe-tekno", nom: "Kick étouffé", styles: ["tekno", "mentale"], fonction: "effet", element: "break", partie: 1,
    idee: "Le kick continue mais passe dans un passe-bas qui le rend sourd, comme entendu depuis l'extérieur de la salle : le break garde la pulsation.",
    reglages: [
      r("osc.type", "6 Hardcore"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "60"),
      r("ifx.on", "ON"), r("ifx.type", "14 Low Pass Filter"), v("ifx.edit", "30"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x.x.xxxx"),
    relance: "Le kick étouffé s'accélère à la fin : le retour approche.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Kick qui revient", idee: "Monte IFX Edit sur la mesure 4 pour ouvrir le filtre.", reglages: [v("ifx.edit", "100")] },
      { nom: "Sans filtre", idee: "Le kick normal, pour comparer.", reglages: [r("ifx.on", "OFF")] },
    ],
    astuces: [MUTE],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "break-tambours-tribe", nom: "Break de tambours", styles: ["tribe"], fonction: "effet", element: "break", partie: 7,
    idee: "Le kick et la basse se taisent ; il ne reste que des toms qui dialoguent, du grave vers l'aigu.",
    melodique: { key: "D", scale: 16 },
    reglages: [
      r("osc.type", "190 Real Lo"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "50"),
      r("mfx.send", "ON"), r("pat.mfxtype", "5 Room Reverb"),
    ],
    mesures: M("0..0..2.0...0.2.", "0..0..2.0...0.2.", "0..0..2.0..3.2.3", "0.2.3.4.O.4.3.2."),
    relance: "Les toms montent jusqu'à l'octave puis redescendent.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Tom de synthé", idee: "Un tom électronique.", reglages: [r("osc.type", "199 Synth Lo1")] },
      { nom: "Plus court", idee: "Moins de Decay.", reglages: [v("amp.decay", "25")] },
    ],
    astuces: [MUTE, { texte: "Les toms jouent des notes : la gamme minor Penta donne des hauteurs qui sonnent bien ensemble.", ref: PG(15) }],
    exercices: ["ex.decay"],
  },
  {
    id: "break-suspendu-mentale", nom: "Break suspendu en écho", styles: ["mentale"], fonction: "effet", element: "break", partie: 6, bpm: 175,
    idee: "Un seul stab au début du break, que l'écho master fait tourner pendant que tout le reste se tait.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "297 BigChords"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "40"),
      r("mfx.send", "ON"), r("pat.mfxtype", "2 Tape Delay"),
    ],
    mesures: M("0...............", "................", "1...............", "................"),
    relance: "Silence total sur la mesure 4 : seul l'écho continue.",
    apercu: { son: "stab", octave: 1 },
    variantes: [
      { nom: "Écho filtré", idee: "High Pass Delay, plus fin.", reglages: [r("pat.mfxtype", "3 High Pass Delay")] },
      { nom: "Accord tendu", idee: "Le même break en Locrian.", reglages: [], ton: { key: "D", scale: 8 } },
    ],
    astuces: [MUTE, MFX_APERCU],
    exercices: ["ex.decay", "ex.mfxxy"],
  },

  // =================== FILL ===================
  {
    id: "fill-toms-tribe", nom: "Fill de toms descendant", styles: ["tribe"], fonction: "effet", element: "fill", partie: 7,
    idee: "Trois mesures avec un tom discret, puis la mesure 4 dévale les toms de l'aigu au grave.",
    melodique: { key: "D", scale: 16 },
    reglages: [
      r("osc.type", "196 E.Tom"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..........2.....", "..........2.....", "..........2...2.", "O.O.4.4.3.3.2.0."),
    relance: "Le fill descend : octave, puis A, G, F, et retombe sur D.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Toms acoustiques", idee: "Un tom réel.", reglages: [r("osc.type", "188 Real MidHi")] },
      { nom: "Toms 808", idee: "Le TomEight.", reglages: [r("osc.type", "202 TomEight")] },
    ],
    exercices: ["ex.decay", "ex.pitch"],
  },
  {
    id: "fill-snare-tekno", nom: "Fill de caisse syncopé", styles: ["tekno"], fonction: "effet", element: "fill", partie: 4,
    idee: "Une caisse claire qui joue à contretemps sur la deuxième moitié de la mesure 4 : le fill casse le carré avant la boucle suivante.",
    reglages: [
      r("osc.type", "68 Tech"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "35"),
      r("ifx.on", "ON"), r("ifx.type", "24 Short Delay"), v("ifx.edit", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x...x..x.xxx"),
    relance: "Trois coups décalés puis trois coups serrés.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Caisse plus dure", idee: "Une autre caisse.", reglages: [r("osc.type", "112 Blast")] },
      { nom: "Fill en écho", idee: "Delay 1/16.", reglages: [r("ifx.type", "21 Delay 1/16"), v("ifx.edit", "50")] },
    ],
    exercices: ["ex.decay", "ex.ifxedit"],
  },
  {
    id: "fill-kick-mentale", nom: "Fill de kick en rafale", styles: ["mentale"], fonction: "effet", element: "fill", partie: 1, bpm: 175,
    idee: "Le kick distordu double ses coups en mesure 4, jusqu'à une rafale de doubles croches.",
    reglages: [
      r("osc.type", "27 Harder"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "45"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "60"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x.x.x.x.xxxxxxxx"),
    relance: "Croches puis doubles croches.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Plus court", idee: "Moins de Decay pour que la rafale reste nette.", reglages: [v("amp.decay", "25")] },
      { nom: "Kick hardcore", idee: "Un autre kick.", reglages: [r("osc.type", "6 Hardcore")] },
    ],
    exercices: ["ex.decay", "ex.ifxedit"],
  },
  {
    id: "fill-clap-tekno", nom: "Fill de claps", styles: ["tekno", "tribe"], fonction: "effet", element: "fill", partie: 4,
    idee: "Les claps sur 2 et 4, puis un groupe de claps à la fin de la mesure 4, de plus en plus forts grâce à l'écho.",
    reglages: [
      r("osc.type", "118 PureNine"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "35"),
      r("ifx.on", "ON"), r("ifx.type", "21 Delay 1/16"), v("ifx.edit", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x.....x.xxxx"),
    relance: "Quatre claps serrés pour finir.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Écho plus long", idee: "Delay 1/8.", reglages: [r("ifx.type", "20 Delay 1/8")] },
      { nom: "Sans écho", idee: "Plus sec.", reglages: [r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "fill-congas-tribe", nom: "Fill de congas", styles: ["tribe"], fonction: "effet", element: "fill", partie: 9,
    idee: "Les congas tiennent un motif simple, puis lâchent une rafale grave-aigu en mesure 4.",
    melodique: { key: "D", scale: 16 },
    reglages: [
      r("osc.type", "203 Conga1"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "35"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..0...2...0...2.", "..0...2...0...2.", "..0...2...0.2.2.", "0.2.0.2.0202O2O2"),
    relance: "Les coups alternent grave et aigu de plus en plus vite.",
    apercu: { son: "perc", octave: 0 },
    variantes: [
      { nom: "Djembé", idee: "Un autre tambour.", reglages: [r("osc.type", "214 Djembe1")] },
      { nom: "Bongos", idee: "Plus aigu.", reglages: [r("osc.type", "208 Bongo1")] },
    ],
    exercices: ["ex.decay", "ex.pitch"],
  },

  // =================== COUPURE ===================
  {
    id: "coupure-basse-tekno", nom: "Basse coupée sur la mesure 4", styles: ["tekno"], fonction: "effet", element: "coupure", partie: 2,
    idee: "La basse roule pendant trois mesures puis disparaît d'un coup : le vide fait sentir le retour.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "335 OCT-SAW"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "electribe LPF"), v("filter.cutoff", "40"), v("filter.resonance", "30"),
      r("amp.eg", "ON"), v("amp.decay", "25"),
      r("mfx.send", "OFF"),
    ],
    mesures: M(".000.000.000.000", ".000.000.000.000", ".000.000.000.000", "................"),
    relance: "Aucune note : la coupure est la relance.",
    apercu: { son: "synth", octave: 0 },
    variantes: [
      { nom: "Coupure à mi-mesure", idee: "La basse s'arrête au temps 3.", reglages: [],
        mesures: M(".000.000.000.000", ".000.000.000.000", ".000.000.000.000", ".000.000........") },
    ],
    astuces: [{ texte: "En live, tu peux faire la même coupure sans changer la séquence : Part Mute sur la basse pendant la mesure 4.", ref: OM(32) }],
    exercices: ["ex.cutoff"],
  },
  {
    id: "coupure-vinyle-tekno", nom: "Arrêt de disque", styles: ["tekno", "tribe"], fonction: "effet", element: "coupure", partie: 6,
    idee: "Toutes les parties passent par l'effet master Vinyl Break : au dernier temps, tu touches le pad et le son ralentit comme un disque qu'on arrête.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "335 OCT-SAW"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "60"), v("filter.resonance", "30"),
      r("amp.eg", "ON"), v("amp.decay", "30"),
      r("mfx.send", "ON"), r("pat.mfxtype", "13 Vinyl Break"), r("mfx.hold", "OFF"),
    ],
    mesures: M("0.0.3.0.0.0.4.0.", "0.0.3.0.0.0.4.0.", "0.0.3.0.0.0.4.0.", "0.0.3.0.0.0.0~~~"),
    relance: "La dernière note est tenue : c'est le moment de toucher le pad.",
    apercu: { son: "synth", octave: 1 },
    variantes: [
      { nom: "Arrêt qui reste", idee: "MFX Hold sur ON : l'effet reste actif quand tu lèves le doigt.", reglages: [r("mfx.hold", "ON")] },
      { nom: "Séquence à l'envers", idee: "Seq Reverse au lieu de Vinyl Break.", reglages: [r("pat.mfxtype", "14 Seq Reverse")] },
    ],
    astuces: [MFX_APERCU, { texte: "Mets MFX Send sur ON pour chaque partie qui doit s'arrêter, y compris le kick.", ref: PG(16) }],
    exercices: ["ex.mfxxy"],
  },
  {
    id: "coupure-silence-tribe", nom: "Silence sur les deux derniers temps", styles: ["tribe"], fonction: "effet", element: "coupure", partie: 1,
    idee: "Le kick s'arrête net au milieu de la mesure 4 : deux temps de silence, puis le retour sur le 1.",
    reglages: [
      r("osc.type", "1 SubBeef"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "70"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x..........."),
    relance: "Plus de kick après le temps 2.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Silence d'un temps", idee: "Une coupure plus courte.", reglages: [],
        mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x.......") },
    ],
    astuces: [MUTE],
    exercices: ["ex.decay"],
  },
  {
    id: "coupure-looper-mentale", nom: "Coupure au Looper", styles: ["mentale"], fonction: "effet", element: "coupure", partie: 6, bpm: 175,
    idee: "Au début de la mesure 4, tu figes un temps avec le Looper : la boucle répète un fragment, puis tu lâches le pad et tout repart.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "343 SYNC-SAW"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "Acid LPF"), v("filter.cutoff", "50"), v("filter.resonance", "60"),
      r("amp.eg", "ON"), v("amp.decay", "25"),
      r("mfx.send", "ON"), r("pat.mfxtype", "7 Looper"), r("mfx.hold", "OFF"),
    ],
    mesures: M("0.01.010.01.01.1", "0.01.010.01.01.1", "0.01.010.01.01.1", "0.01............"),
    relance: "La séquence s'arrête après un temps : le Looper répète ce temps tant que tu tiens le pad.",
    apercu: { son: "synth", octave: 1 },
    variantes: [
      { nom: "Looper qui monte", idee: "Pitch Looper.", reglages: [r("pat.mfxtype", "8 Pitch Looper")] },
      { nom: "Hachures", idee: "Le Slicer master.", reglages: [r("pat.mfxtype", "10 Slicer")] },
    ],
    astuces: [MFX_APERCU],
    exercices: ["ex.mfxxy", "ex.resonance"],
  },
  {
    id: "coupure-grave-mentale", nom: "Coupure du grave", styles: ["mentale", "tekno"], fonction: "effet", element: "coupure", partie: 2, bpm: 175,
    idee: "La basse et le kick passent dans un passe-haut master : sur la mesure 4, tu poses le doigt et le grave disparaît, puis tu lâches sur le 1.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "330 SINE"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "40"),
      r("mfx.send", "ON"), r("pat.mfxtype", "19 High Pass Filter"), r("mfx.hold", "OFF"),
    ],
    mesures: M("..0...0...0...0.", "..0...0...0...0.", "..0...0...0...1.", "..0...0...0...0."),
    relance: "La séquence ne change pas : la coupure se fait au doigt sur le pad.",
    apercu: { son: "sub", octave: 0 },
    variantes: [
      { nom: "Passe-bas", idee: "L'inverse : on garde le grave et on coupe les aigus.", reglages: [r("pat.mfxtype", "18 Low Pass Filter")] },
    ],
    astuces: [MFX_APERCU],
    exercices: ["ex.mfxxy"],
  },

  // =================== IMPACT / BOOM ===================
  {
    id: "impact-subbang-tekno", nom: "Boom de retour", styles: ["tekno"], fonction: "effet", element: "impact", partie: 11,
    idee: "Le son SubBang joué une seule fois, sur le premier pas de la boucle : un gros boum qui marque le retour du kick.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "291 SubBang"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "110"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("0...............", "................", "................", "................"),
    relance: "Rien : l'impact est sur la mesure 1.",
    apercu: { son: "sub", octave: 0 },
    variantes: [
      { nom: "Chute", idee: "SonicDrop, un son qui tombe.", reglages: [r("osc.type", "289 SonicDrop")] },
      { nom: "Plus court", idee: "Moins de Decay.", reglages: [v("amp.decay", "60")] },
    ],
    astuces: [{ texte: "SubBang est un son PCM : l'aperçu l'imite avec une sinusoïde." }],
    exercices: ["ex.decay"],
  },
  {
    id: "impact-crash-tribe", nom: "Crash et kick ensemble", styles: ["tribe"], fonction: "effet", element: "impact", partie: 15,
    idee: "Une cymbale crash sur le 1 de la boucle, longue et un peu réverbérée : l'impact ouvre la nouvelle phrase.",
    reglages: [
      r("osc.type", "177 Rock"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "120"),
      r("mfx.send", "ON"), r("pat.mfxtype", "5 Room Reverb"),
    ],
    mesures: M("x...............", "................", "................", "................"),
    relance: "Rien : l'impact est sur la mesure 1.",
    apercu: { son: "crash", octave: 0 },
    variantes: [
      { nom: "Crash électronique", idee: "La cymbale Synth.", reglages: [r("osc.type", "178 Synth")] },
      { nom: "Bruit blanc", idee: "WhiteNoiz, plus sale.", reglages: [r("osc.type", "179 WhiteNoiz")] },
    ],
    exercices: ["ex.decay"],
  },
  {
    id: "impact-revcrash-mentale", nom: "Cymbale à l'envers qui aspire", styles: ["mentale"], fonction: "effet", element: "impact", partie: 15, bpm: 175,
    idee: "La cymbale inversée RevCrash démarre en milieu de mesure 4 pour finir pile sur le 1 : le son aspire avant l'impact.",
    reglages: [
      r("osc.type", "180 RevCrash"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "OFF"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("................", "................", "................", "........x......."),
    relance: "La cymbale part au temps 3 de la mesure 4.",
    apercu: { son: "crash", octave: 0 },
    variantes: [
      { nom: "Ride à l'envers", idee: "RevRide.", reglages: [r("osc.type", "186 RevRide")] },
    ],
    astuces: [{ texte: "La longueur exacte de RevCrash dépend du BPM : déplace le pas (4.07, 4.09, 4.11) jusqu'à ce que la fin tombe sur le 1. L'aperçu joue une cymbale à l'endroit." }],
    exercices: ["ex.level"],
  },
  {
    id: "impact-chute-tekno", nom: "Boom qui tombe", styles: ["tekno", "mentale"], fonction: "effet", element: "impact", partie: 11,
    idee: "Une sinusoïde grave dont la hauteur plonge grâce à l'enveloppe EG- Pitch : un impact « bwoum » sur le 1.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "330 SINE"), r("part.voiceassign", "Mono2"),
      r("mod.type", "14 EG- Pitch"), v("mod.depth", "90"), v("mod.speed", "70"),
      r("amp.eg", "ON"), v("amp.decay", "100"),
      r("ifx.on", "ON"), r("ifx.type", "2 Overdrive"), v("ifx.edit", "30"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("O...............", "................", "................", "................"),
    relance: "Rien : l'impact est sur la mesure 1.",
    apercu: { son: "sub", octave: 1 },
    variantes: [
      { nom: "Chute plus lente", idee: "Moins de Speed.", reglages: [v("mod.speed", "30")] },
      { nom: "Saturé", idee: "Distortion.", reglages: [r("ifx.type", "3 Distortion"), v("ifx.edit", "60")] },
    ],
    astuces: [{ texte: "L'aperçu ne fait pas la chute de hauteur des enveloppes EG : écoute-la sur la machine." }],
    exercices: ["ex.depth", "ex.speed"],
  },
  {
    id: "impact-tambour-tribe", nom: "Gros tambour réverbéré", styles: ["tribe"], fonction: "effet", element: "impact", partie: 7,
    idee: "Un kick très grave noyé dans la réverbération master, joué une fois : comme un grand tambour qui résonne dans une salle.",
    reglages: [
      r("osc.type", "17 Lololow"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.decay", "110"),
      r("mfx.send", "ON"), r("pat.mfxtype", "4 Hall Reverb"),
    ],
    mesures: M("x...............", "................", "................", "............x..."),
    relance: "Un deuxième coup sur le temps 4 annonce l'impact suivant.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Tom grave", idee: "Le tom Real Lo.", reglages: [r("osc.type", "190 Real Lo")] },
      { nom: "Kick subsonique", idee: "Subsonic.", reglages: [r("osc.type", "15 Subsonic")] },
    ],
    astuces: [MFX_APERCU],
    exercices: ["ex.decay"],
  },
];
