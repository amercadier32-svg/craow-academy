// Textes du module Mastering : les blocs de la chaîne, les points de départ par style et les mini-leçons.
// Rien ici ne vient du manuel de l'Electribe : c'est de la pratique de studio (badge « Pratique »).
import { completer, type Reglages } from "../lib/masterDsp";
import { depuisSimples, type ValeursSimples } from "../lib/masterSimple";

export type BlocId = "eq" | "comp" | "sat" | "larg" | "lim";

export interface InfoBloc { id: BlocId; nom: string; court: string; couleur: string; sert: string; quand: string; attention: string }

export const BLOCS_M: InfoBloc[] = [
  { id: "eq", nom: "EQ paramétrique", court: "EQ", couleur: "#3fd6d0",
    sert: "Monter ou baisser des zones de fréquences : le grave, le médium, l'aigu. Chaque bande a une fréquence (où), un gain (combien) et un Q (largeur : petit Q = large, grand Q = étroit).",
    quand: "En premier, pour corriger l'équilibre : un grave qui gronde, un médium qui « cartonne », des aigus ternes. Au mastering on reste sur de petits mouvements, souvent 0,5 à 2 dB.",
    attention: "Si tu dois corriger plus de 3 dB, le problème vient sûrement du mix : retourne sur l'E2 (le volume d'une partie, son filtre) plutôt que de tout forcer ici." },
  { id: "comp", nom: "Compresseur", court: "Comp", couleur: "#ffd84d",
    sert: "Rapprocher les passages forts et faibles : au-dessus du seuil, le son est baissé selon le ratio. Ça « colle » les parties ensemble.",
    quand: "Quand le morceau manque de cohésion ou que certains passages sautent. Au mastering : ratio doux (1,5 à 3), attaque assez lente pour laisser passer l'attaque du kick, 1 à 3 dB de réduction.",
    attention: "Une attaque trop rapide écrase le kick ; un relâchement trop court fait « pomper » le son. Regarde l'indicateur de réduction de gain." },
  { id: "sat", nom: "Saturation légère", court: "Sat", couleur: "#ff6a3d",
    sert: "Arrondir les crêtes et ajouter des harmoniques : le son paraît plus chaud, plus dense et plus fort sans monter le niveau des pics.",
    quand: "Pour donner de la chaleur ou de l'agressivité (tekno). Garde le Mix partiel pour ne pas perdre le punch.",
    attention: "Trop de drive = son brouillé et fatigant, surtout sur les aigus et les hats. Compare toujours en A/B." },
  { id: "larg", nom: "Largeur stéréo", court: "Stéréo", couleur: "#9b6bff",
    sert: "Élargir ou resserrer l'image stéréo en jouant sur la différence entre gauche et droite (le « côté »). « Grave en mono » retire la stéréo sous une fréquence choisie.",
    quand: "Grave en mono : presque toujours pour un son de sound system. Élargir un peu (110 à 120 %) si le morceau paraît étroit.",
    attention: "Trop élargir crée des problèmes de phase : des parties disparaissent en mono. Clique « Écouter en mono » pour vérifier." },
  { id: "lim", nom: "Limiteur final", court: "Limiteur", couleur: "#e8484e",
    sert: "Le dernier mur : aucun échantillon ne dépasse le plafond. Le gain d'entrée pousse le son contre ce mur pour monter le volume perçu.",
    quand: "Toujours en dernier. Plafond un peu sous 0 (par exemple -1 dB) pour laisser de la place aux crêtes entre échantillons et aux conversions MP3.",
    attention: "Chaque dB de gain en plus écrase un peu plus. Si l'indicateur de réduction dépasse souvent quelques dB, le kick perd son impact." },
];

export interface PointDepart { id: string; nom: string; couleur: string; resume: string; reglages: Reglages; explications: { bloc: BlocId; texte: string }[] }

const base = (p: Partial<Reglages>) => completer(p);
const eq = (g: { hp?: number; grave?: [number, number]; basMed?: [number, number, number]; med?: [number, number, number]; hautMed?: [number, number, number]; aigu?: [number, number] }) => ({
  on: true,
  bandes: [
    { type: "hp" as const, on: g.hp !== undefined, f: g.hp ?? 30, g: 0, q: 0.71 },
    { type: "ls" as const, on: true, f: g.grave?.[0] ?? 90, g: g.grave?.[1] ?? 0, q: 0.71 },
    { type: "pk" as const, on: true, f: g.basMed?.[0] ?? 300, g: g.basMed?.[1] ?? 0, q: g.basMed?.[2] ?? 1 },
    { type: "pk" as const, on: true, f: g.med?.[0] ?? 1000, g: g.med?.[1] ?? 0, q: g.med?.[2] ?? 1 },
    { type: "pk" as const, on: true, f: g.hautMed?.[0] ?? 3500, g: g.hautMed?.[1] ?? 0, q: g.hautMed?.[2] ?? 1 },
    { type: "hs" as const, on: true, f: g.aigu?.[0] ?? 10000, g: g.aigu?.[1] ?? 0, q: 0.71 },
  ],
});

export const POINTS_DEPART: PointDepart[] = [
  { id: "tribe", nom: "Tribe", couleur: "#ff6a3d",
    resume: "Kick qui tape, basse qui roule, percussions vivantes : on garde le relief et on colle doucement.",
    reglages: base({
      eq: eq({ hp: 25, grave: [70, 1], basMed: [300, -1.5, 1], hautMed: [3500, -0.5, 1.2], aigu: [11000, 1] }),
      comp: { on: true, seuil: -14, ratio: 2, attaque: 30, relachement: 120, genou: 6, gain: 1.5 },
      sat: { on: true, drive: 4, mix: 30 },
      larg: { on: true, largeur: 110, monoGrave: true, freqMono: 120 },
      lim: { on: true, gain: 4, plafond: -1, relachement: 60 },
    }),
    explications: [
      { bloc: "eq", texte: "Coupe-bas à 25 Hz : retire l'infra-grave inutile. Grave +1 dB à 70 Hz pour le corps du kick. Bas-médium -1,5 dB à 300 Hz : enlève le côté « carton » quand kick, basse et toms se superposent. Aigu +1 dB pour l'air des hats." },
      { bloc: "comp", texte: "Ratio 2:1 et attaque 30 ms : le compresseur réagit après l'attaque du kick, qui garde son claquement. Relâchement 120 ms : assez rapide pour le tempo tribe sans pomper." },
      { bloc: "sat", texte: "Drive 4 dB, Mix 30 % : un peu de densité sur les percussions sans brouiller." },
      { bloc: "larg", texte: "110 % pour un peu d'espace sur les percus, grave en mono sous 120 Hz : le kick et la basse restent au centre." },
      { bloc: "lim", texte: "Gain +4 dB, plafond -1 dB. Ajuste le gain selon le niveau de ton fichier : regarde l'indicateur de réduction plutôt que le chiffre du gain." },
    ] },
  { id: "acid-tribe", nom: "Acid tribe", couleur: "#d4f25a",
    resume: "Comme la tribe, mais on protège la ligne acide : aigus tenus, compression qui ne l'écrase pas.",
    reglages: base({
      eq: eq({ hp: 25, grave: [70, 1], basMed: [300, -1.5, 1], hautMed: [2500, -1, 1.4], aigu: [11000, 0.5] }),
      comp: { on: true, seuil: -15, ratio: 2, attaque: 25, relachement: 120, genou: 6, gain: 1.5 },
      sat: { on: true, drive: 4, mix: 30 },
      larg: { on: true, largeur: 105, monoGrave: true, freqMono: 120 },
      lim: { on: true, gain: 4, plafond: -1, relachement: 60 },
    }),
    explications: [
      { bloc: "eq", texte: "Même base que la tribe, avec -1 dB vers 2,5 kHz : c'est là que la résonance de l'acide siffle le plus quand le filtre s'ouvre. Aigu +0,5 dB seulement pour ne pas rendre l'acide agressive." },
      { bloc: "comp", texte: "Ratio 2:1, attaque 25 ms : le kick garde son claquement et les accents de l'acide restent audibles." },
      { bloc: "sat", texte: "Drive 4 dB, Mix 30 % : l'acide est souvent déjà saturée sur la machine, inutile d'en rajouter." },
      { bloc: "larg", texte: "105 % : presque pas d'élargissement, la ligne acide reste au centre avec le kick." },
      { bloc: "lim", texte: "Gain +4 dB, plafond -1 dB. Si les montées de filtre font grimper la réduction, baisse le gain." },
    ] },
  { id: "mentale", nom: "Mentale", couleur: "#3fd6d0",
    resume: "Hypnotique et profond : plus d'espace, des aigus doux, une compression lente qui respire.",
    reglages: base({
      eq: eq({ hp: 25, grave: [80, 0.5], basMed: [350, -1, 0.9], med: [1200, -0.5, 1], hautMed: [4000, -1.5, 1], aigu: [9000, -0.5] }),
      comp: { on: true, seuil: -18, ratio: 1.7, attaque: 40, relachement: 250, genou: 8, gain: 1.5 },
      sat: { on: true, drive: 3, mix: 25 },
      larg: { on: true, largeur: 120, monoGrave: true, freqMono: 100 },
      lim: { on: true, gain: 3, plafond: -1, relachement: 120 },
    }),
    explications: [
      { bloc: "eq", texte: "Haut-médium -1,5 dB à 4 kHz et aigu -0,5 dB : on adoucit les acides et les leads qui tournent longtemps. Grave +0,5 dB seulement : la profondeur vient de l'espace, pas du volume du sub." },
      { bloc: "comp", texte: "Ratio 1,7:1, genou large 8 dB, relâchement 250 ms : compression lente qui colle sans écraser les montées." },
      { bloc: "sat", texte: "Drive 3 dB, Mix 25 % : juste un peu de chaleur." },
      { bloc: "larg", texte: "Largeur 120 % pour les nappes et les delays, grave en mono sous 100 Hz. Vérifie en mono que les nappes ne disparaissent pas." },
      { bloc: "lim", texte: "Gain +3 dB et relâchement 120 ms : on garde de la dynamique pour les montées et les breaks." },
    ] },
  { id: "hardtek", nom: "Hardtek", couleur: "#ff7a8a",
    resume: "Dense et frontal : saturation plus forte, compression ferme, grave serré au centre. Attention à ne pas tout écraser.",
    reglages: base({
      eq: eq({ hp: 30, grave: [60, 1.5], basMed: [250, -2.5, 1], med: [1000, 0, 1], hautMed: [3000, 0.5, 1], aigu: [10000, 0] }),
      comp: { on: true, seuil: -17, ratio: 3.5, attaque: 15, relachement: 90, genou: 6, gain: 2 },
      sat: { on: true, drive: 8, mix: 50 },
      larg: { on: true, largeur: 100, monoGrave: true, freqMono: 160 },
      lim: { on: true, gain: 5, plafond: -1, relachement: 40 },
    }),
    explications: [
      { bloc: "eq", texte: "Coupe-bas à 30 Hz : le kick très saturé produit beaucoup d'infra-grave inutile. Bas-médium -2,5 dB à 250 Hz, la zone qui sature le plus vite. Aigu à 0 : la distorsion en ajoute déjà." },
      { bloc: "comp", texte: "Ratio 3,5:1, attaque 15 ms : un son plus tenu. Vérifie que le kick claque encore : s'il s'aplatit, remonte l'attaque." },
      { bloc: "sat", texte: "Drive 8 dB, Mix 50 % : la saturation fait partie du style, mais en parallèle. Si le kick est déjà très saturé sur la machine, baisse le Drive." },
      { bloc: "larg", texte: "Largeur 100 %, grave en mono jusqu'à 160 Hz : le bas reste compact, comme il faut sur un sound system." },
      { bloc: "lim", texte: "Gain +5 dB, relâchement 40 ms. Si ça grésille ou pompe, baisse le gain : plus fort n'est pas forcément plus puissant." },
    ] },
  { id: "tekno", nom: "Tekno", couleur: "#e255c8",
    resume: "Son dense et rugueux : plus de saturation, compression plus ferme, grave bien serré au centre.",
    reglages: base({
      eq: eq({ hp: 28, grave: [60, 1.5], basMed: [250, -2, 1], med: [1000, 0, 1], hautMed: [3000, 0.5, 1], aigu: [10000, 0.5] }),
      comp: { on: true, seuil: -16, ratio: 3, attaque: 20, relachement: 100, genou: 6, gain: 2 },
      sat: { on: true, drive: 7, mix: 45 },
      larg: { on: true, largeur: 100, monoGrave: true, freqMono: 150 },
      lim: { on: true, gain: 5, plafond: -1, relachement: 50 },
    }),
    explications: [
      { bloc: "eq", texte: "Coupe-bas à 28 Hz et grave +1,5 dB à 60 Hz : un sub présent mais propre. Bas-médium -2 dB à 250 Hz : la zone qui devient boueuse avec la distorsion. Léger +0,5 dB à 3 kHz pour le mordant." },
      { bloc: "comp", texte: "Ratio 3:1, attaque 20 ms, relâchement 100 ms : le son est plus tenu, plus « mur ». Surveille que le kick claque encore." },
      { bloc: "sat", texte: "Drive 7 dB, Mix 45 % : la saturation fait partie du style, mais en parallèle pour garder les transitoires." },
      { bloc: "larg", texte: "Largeur 100 % (pas d'élargissement), grave en mono jusqu'à 150 Hz : le bas reste compact et puissant." },
      { bloc: "lim", texte: "Gain +5 dB, relâchement court 50 ms. Si ça grésille ou pompe, baisse le gain avant de toucher au reste." },
    ] },
  { id: "raggatek", nom: "Raggatek", couleur: "#ffe066",
    resume: "Kick tekno et voix au centre : on garde la voix claire et la basse ronde, compression moyenne.",
    reglages: base({
      eq: eq({ hp: 25, grave: [70, 1], basMed: [300, -1.5, 1], med: [1500, 0.5, 1], hautMed: [3500, 0, 1], aigu: [10000, 0.5] }),
      comp: { on: true, seuil: -15, ratio: 2.5, attaque: 25, relachement: 120, genou: 6, gain: 1.5 },
      sat: { on: true, drive: 5, mix: 35 },
      larg: { on: true, largeur: 110, monoGrave: true, freqMono: 120 },
      lim: { on: true, gain: 4, plafond: -1, relachement: 60 },
    }),
    explications: [
      { bloc: "eq", texte: "Médium +0,5 dB vers 1,5 kHz : la zone où la voix se comprend. Bas-médium -1,5 dB pour que la basse qui chante ne fasse pas « carton »." },
      { bloc: "comp", texte: "Ratio 2,5:1, attaque 25 ms, relâchement 120 ms : le chaloupé du skank et de la voix reste vivant." },
      { bloc: "sat", texte: "Drive 5 dB, Mix 35 % : un peu de densité, sans salir la voix." },
      { bloc: "larg", texte: "110 % pour l'écho du skank et les chœurs, grave en mono sous 120 Hz." },
      { bloc: "lim", texte: "Gain +4 dB. Si la voix devient dure ou sifflante, baisse le gain avant de toucher à l'EQ." },
    ] },
  { id: "dub-tekno", nom: "Dub tekno", couleur: "#6fe3b8",
    resume: "Profond et aéré : on garde les échos et les silences, compression lente, peu de saturation.",
    reglages: base({
      eq: eq({ hp: 25, grave: [70, 1], basMed: [350, -1.5, 0.9], med: [1200, 0, 1], hautMed: [4000, -1, 1], aigu: [9000, -0.5] }),
      comp: { on: true, seuil: -18, ratio: 1.6, attaque: 40, relachement: 250, genou: 8, gain: 1.5 },
      sat: { on: true, drive: 2, mix: 20 },
      larg: { on: true, largeur: 120, monoGrave: true, freqMono: 110 },
      lim: { on: true, gain: 3, plafond: -1, relachement: 120 },
    }),
    explications: [
      { bloc: "eq", texte: "Haut-médium -1 dB et aigu -0,5 dB : les échos qui s'accumulent deviennent vite durs. Bas-médium -1,5 dB à 350 Hz : les réverbes y laissent souvent un brouillard." },
      { bloc: "comp", texte: "Ratio 1,6:1, relâchement 250 ms, genou large : la compression ne remonte pas trop les queues d'écho, les silences restent des silences." },
      { bloc: "sat", texte: "Drive 2 dB, Mix 20 % : juste un peu de chaleur, le style vit de l'espace." },
      { bloc: "larg", texte: "120 % pour les échos et la nappe, grave en mono sous 110 Hz. Vérifie en mono que les échos ne disparaissent pas." },
      { bloc: "lim", texte: "Gain +3 dB, relâchement 120 ms : on garde la dynamique entre les coupures et les retours." },
    ] },
];

export interface Lecon {
  id: BlocId | "ab"; nom: string; couleur: string;
  idee: string; points: string[];
  exagere: { label: string; reglages: Reglages; compensation?: boolean; ecoute: string };
  bon: { label: string; reglages: Reglages; compensation?: boolean; ecoute: string };
  aEcouter: string;
}

export const LECONS: Lecon[] = [
  { id: "eq", nom: "L'EQ", couleur: "#3fd6d0",
    idee: "L'EQ change l'équilibre entre grave, médium et aigu. Au mastering, de petits mouvements changent déjà beaucoup la couleur.",
    points: ["Couper ce qui gêne est souvent plus efficace que monter ce qui manque.", "Une bande large (Q bas) sonne naturel ; une bande étroite (Q haut) sert à viser un problème précis.", "Regarde la courbe sur le spectre : elle montre ce que tu fais."],
    exagere: { label: "Grave +9 dB, aigu -8 dB", reglages: completer({ eq: eq({ grave: [90, 9], aigu: [8000, -8] }) }), ecoute: "Le son devient boueux et étouffé, le kick bave sur la basse." },
    bon: { label: "Grave +1,5 dB, bas-médium -1,5 dB", reglages: completer({ eq: eq({ hp: 25, grave: [80, 1.5], basMed: [300, -1.5, 1] }) }), ecoute: "Plus de poids en bas, mais un médium plus clair." },
    aEcouter: "Passe de l'un à l'autre, puis compare chacun en A/B avec l'original." },
  { id: "comp", nom: "La compression", couleur: "#ffd84d",
    idee: "Le compresseur baisse le son quand il dépasse le seuil. L'attaque dit quand il réagit, le relâchement quand il relâche.",
    points: ["Attaque lente (20 à 40 ms) : le claquement du kick passe avant la compression.", "Relâchement trop court : le son « pompe » au rythme du kick.", "Regarde l'indicateur de réduction : au mastering, quelques dB suffisent."],
    exagere: { label: "Seuil -32 dB, ratio 10:1, attaque 1 ms", reglages: completer({ comp: { on: true, seuil: -32, ratio: 10, attaque: 1, relachement: 40, genou: 0, gain: 12 } }), ecoute: "Le kick perd son claquement, tout est collé au même niveau, le fond « respire » entre les coups." },
    bon: { label: "Seuil -14 dB, ratio 2:1, attaque 30 ms", reglages: completer({ comp: { on: true, seuil: -14, ratio: 2, attaque: 30, relachement: 150, genou: 6, gain: 1.5 } }), ecoute: "Le son se tient mieux, le kick claque toujours." },
    aEcouter: "Le seuil dépend du niveau de ton fichier : si l'indicateur reste à 0, baisse le seuil." },
  { id: "sat", nom: "La saturation", couleur: "#ff6a3d",
    idee: "La saturation arrondit les crêtes et ajoute des harmoniques. Bien dosée, elle épaissit ; trop forte, elle brouille.",
    points: ["Le Mix mélange le son saturé et le son propre (saturation « parallèle »).", "Les aigus et les hats montrent les excès en premier.", "Compare au même volume : la saturation paraît toujours mieux parce qu'elle densifie."],
    exagere: { label: "Drive 18 dB, Mix 100 %", reglages: completer({ sat: { on: true, drive: 18, mix: 100 } }), ecoute: "Son grésillant, aigus sales, le kick s'écrase en bouillie." },
    bon: { label: "Drive 4 dB, Mix 30 %", reglages: completer({ sat: { on: true, drive: 4, mix: 30 } }), ecoute: "Un peu plus dense et chaud, sans grésillement." },
    aEcouter: "Écoute surtout les hats et la queue du kick." },
  { id: "larg", nom: "La largeur stéréo", couleur: "#9b6bff",
    idee: "La largeur joue sur la différence entre gauche et droite. Un grave en mono tient mieux sur un sound system.",
    points: ["Au-dessus de 100 %, le côté est renforcé : plus large, mais plus fragile en mono.", "« Grave en mono » enlève la stéréo sous la fréquence choisie.", "Toujours vérifier avec « Écouter en mono »."],
    exagere: { label: "Largeur 200 %, grave stéréo", reglages: completer({ larg: { on: true, largeur: 200, monoGrave: false, freqMono: 120 } }), ecoute: "Très large au casque, mais en mono des éléments s'effacent et le centre se creuse." },
    bon: { label: "Largeur 115 %, grave mono sous 120 Hz", reglages: completer({ larg: { on: true, largeur: 115, monoGrave: true, freqMono: 120 } }), ecoute: "Un peu plus d'air sur les côtés, kick et basse bien au centre." },
    aEcouter: "Écoute chaque réglage deux fois : en stéréo, puis avec « Écouter en mono »." },
  { id: "lim", nom: "Le limiteur", couleur: "#e8484e",
    idee: "Le limiteur empêche de dépasser le plafond. Plus tu pousses le gain, plus le son est fort… et écrasé.",
    points: ["Le plafond protège ; le gain fait le volume.", "Regarde la réduction de gain : si elle travaille tout le temps, c'est trop.", "Un relâchement très court déforme le grave."],
    exagere: { label: "Gain +14 dB, relâchement 10 ms", reglages: completer({ lim: { on: true, gain: 14, plafond: -0.1, relachement: 10 } }), ecoute: "Plus fort, mais le kick s'aplatit, le grave grésille, tout pompe.", compensation: true },
    bon: { label: "Gain +3 dB, plafond -1 dB", reglages: completer({ lim: { on: true, gain: 3, plafond: -1, relachement: 80 } }), ecoute: "Plus fort que l'original, le kick garde sa forme.", compensation: true },
    aEcouter: "La compensation de volume reste allumée : tu compares la qualité, pas le volume." },
  { id: "ab", nom: "Comparer au même volume", couleur: "#6aa2ee",
    idee: "Un son plus fort paraît presque toujours « meilleur ». Pour juger un réglage, il faut comparer au même volume perçu.",
    points: ["La compensation automatique baisse la version la plus forte au niveau de l'autre.", "Elle se base sur le volume perçu (LUFS) des deux versions.", "Garde-la allumée sauf pour régler le niveau final."],
    exagere: { label: "Limiteur +6 dB, compensation éteinte", reglages: completer({ lim: { on: true, gain: 6, plafond: -1, relachement: 80 } }), compensation: false, ecoute: "Avec B, ça paraît mieux… surtout parce que c'est plus fort." },
    bon: { label: "Même réglage, compensation allumée", reglages: completer({ lim: { on: true, gain: 6, plafond: -1, relachement: 80 } }), compensation: true, ecoute: "Au même volume, la différence est bien plus petite : tu entends ce que le limiteur enlève." },
    aEcouter: "Passe de A à B dans les deux cas." },
];

// ---------------------------------------------------------------- presets rapides (mode Simple)
// Un preset règle les 6 curseurs (valeurs absolues) ; certains changent aussi un réglage que seul le mode Avancé montre.
export interface PresetRapide { id: string; nom: string; couleur: string; phrase: string; valeurs: Partial<ValeursSimples>; extra?: (r: Reglages) => void }

export const PRESETS_RAPIDES: PresetRapide[] = [
  { id: "punch", nom: "PUNCH", couleur: "#ff6a3d", valeurs: { graves: 1, aigus: 1, comp: 45, volume: 2 },
    phrase: "Compression à attaque lente : le coup du kick passe avant elle. Petit plus vers 3 kHz pour un coup plus net.",
    extra: (r) => { r.comp.attaque = 35; Object.assign(r.eq.bandes[4], { on: true, f: 3000, g: 1.5, q: 1 }); } },
  { id: "bass", nom: "BASS BOOSTED", couleur: "#9b6bff", valeurs: { graves: 4, mediums: -1, comp: 20, volume: 2 },
    phrase: "Plus de sub et de grave, un peu moins de bas-médium, le grave gardé en mono sous 120 Hz.",
    extra: (r) => { Object.assign(r.eq.bandes[2], { on: true, f: 300, g: -1, q: 1 }); Object.assign(r.larg, { on: true, largeur: 100, monoGrave: true, freqMono: 120 }); } },
  { id: "brillant", nom: "BRILLANT", couleur: "#ffd84d", valeurs: { aigus: 3, comp: 15, volume: 1 },
    phrase: "Plateau aigu à +3 dB : de l'air au-dessus des hats, pour un morceau terne." },
  { id: "chaud", nom: "CHAUD", couleur: "#ffb020", valeurs: { graves: 1.5, aigus: -1.5, comp: 20, sat: 40, volume: 1 },
    phrase: "Saturation douce, un peu plus de grave, des aigus adoucis : moins froid, moins piquant." },
  { id: "large", nom: "LARGE", couleur: "#3fd6d0", valeurs: { aigus: 0.5, comp: 15, volume: 1 },
    phrase: "Image stéréo à 130 % au-dessus de 150 Hz, grave en mono au centre. Vérifie en mono après.",
    extra: (r) => { Object.assign(r.larg, { on: true, largeur: 130, monoGrave: true, freqMono: 150 }); } },
  { id: "fort", nom: "FORT", couleur: "#e8484e", valeurs: { comp: 35, sat: 15, volume: 6 },
    phrase: "Pousse le limiteur de 6 dB : nettement plus fort, mais moins de relief. Surveille la dynamique." },
];

export function reglagesPreset(p: PresetRapide): Reglages {
  const r = depuisSimples(p.valeurs);
  p.extra?.(r);
  return r;
}

// ---------------------------------------------------------------- mini-leçons des « ? »
export interface Aide { titre: string; couleur: string; textes: string[]; lecon?: Lecon["id"] }

export const AIDES: Record<string, Aide> = {
  graves: { titre: "Graves", couleur: "#9b6bff", lecon: "eq", textes: [
    "Un plateau qui monte ou baisse tout ce qui est sous 80 Hz environ : le sub, le corps du kick, la basse.",
    "+1 à +3 dB donnent du poids. Au-delà, le grave prend la place du reste et le limiteur travaille surtout pour lui.",
  ] },
  mediums: { titre: "Médiums", couleur: "#3fd6d0", lecon: "eq", textes: [
    "Une cloche large centrée sur 1 kHz : snares, claps, leads, voix.",
    "Baisser de 1 à 2 dB rend un son moins « carton » ; monter avance ces éléments vers toi.",
  ] },
  aigus: { titre: "Aigus", couleur: "#ffd84d", lecon: "eq", textes: [
    "Un plateau au-dessus de 8 kHz environ : hats, cymbales, l'air autour du son.",
    "Trop d'aigus fatigue vite l'oreille et fait siffler les hats. Écoute à volume moyen.",
  ] },
  comp: { titre: "Compression", couleur: "#ffb020", lecon: "comp", textes: [
    "Un seul curseur règle un compresseur doux (attaque 30 ms, relâchement 150 ms). 0 % = éteint.",
    "Il règle le seuil (de -4 à -30 dB), le ratio (de 1,5:1 à 4:1) et un peu de gain de rattrapage (jusqu'à +3 dB). Les valeurs exactes sont visibles en mode Avancé.",
    "20 à 40 % colle les parties ensemble. Plus haut, le son est plus tenu mais perd du relief.",
  ] },
  sat: { titre: "Saturation", couleur: "#ff6a3d", lecon: "sat", textes: [
    "Arrondit les crêtes et ajoute des harmoniques : plus chaud, plus dense.",
    "Le curseur règle le drive (0 à 12 dB) et la part de son saturé mélangée au son propre (20 à 80 %).",
  ] },
  volume: { titre: "Volume", couleur: "#e8484e", lecon: "lim", textes: [
    "C'est le gain d'entrée du limiteur : vers le haut, le son est poussé contre le plafond et paraît plus fort ; vers le bas, il est baissé.",
    "Chaque dB en plus écrase un peu les coups. Regarde « Dynamique » dans la barre du bas : sous 8 dB, le son devient écrasé.",
  ] },
  protections: { titre: "Protections", couleur: "#4fd18b", lecon: "lim", textes: [
    "Toujours allumées en mode Simple, sans réglage à faire :",
    "Filtre passe-haut à 30 Hz : retire les grondements que les enceintes ne jouent pas mais qui mangent de la marge.",
    "Limiteur avec un plafond à -1 dB : aucun échantillon ne dépasse ce plafond.",
    "Protection anti-écrêtage : après le limiteur, une sécurité coupe tout ce qui dépasserait encore le plafond. Le fichier exporté ne sature jamais.",
    "Entre deux échantillons, l'onde peut dépasser un peu (crête vraie) : c'est pour ça que le plafond est à -1 dB et pas à 0.",
  ] },
  ab: { titre: "A / B au même volume", couleur: "#6aa2ee", lecon: "ab", textes: [
    "A = ton son d'origine, B = après la chaîne. « Même volume » baisse la version la plus forte pour que tu juges le son, pas le volume.",
    "Bypass fait entendre l'original à son vrai volume, sans compensation.",
  ] },
};

