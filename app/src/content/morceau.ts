// Module « Construire un morceau » : départ (style, BPM, KEY, SCALE), puis une couche par étape.
// Les ambiances de style, les rôles des couches et les conseils d'emboîtement sont des conseils (badge « Pratique »).
// Les gestes sur la machine renvoient aux pages du manuel.
import type { Source } from "../lib/data";
import type { ElementId } from "./recettes";
import { FICHES, type Style } from "./styles";

const OM = (page: number): Source => ({ doc: "OM", page });
const PG = (page: number): Source => ({ doc: "PG", page });

export interface StyleMorceau {
  id: Style;
  nom: string;
  couleur: string;
  bpm: number;              // proposition par défaut (Pratique)
  bpmTexte: string;
  ambiance: [string, string];
  key: string;              // KEY proposée
  scale: number;            // SCALE proposée (numéro du Guide p. 15)
}

/** Un style par fiche de data/electribe2/styles.json : BPM, ambiance (caractère) et première gamme conseillée viennent de la fiche. */
export const STYLES_MORCEAU: StyleMorceau[] = FICHES.map((f) => ({
  id: f.id, nom: f.nom, couleur: f.couleur, bpm: f.bpm.defaut, bpmTexte: `souvent entre ${f.bpm.min} et ${f.bpm.max} BPM`,
  ambiance: f.caractere, key: "D", scale: f.gammes[0].n,
}));
export const styleM = (id: Style) => STYLES_MORCEAU.find((s) => s.id === id)!;

export type EtapeId = "kick" | "basse" | "hats" | "clap" | "percs" | "melodie" | "ambiance" | "effets";

export interface Conseil { texte: string; ref?: Source }

export interface Etape {
  id: EtapeId;
  nom: string;
  icone: string;
  couleur: string;
  elements: { id: ElementId; nom: string; texte: string }[];
  role: Record<Style, string>;
  conseils: Conseil[];
  pret: boolean;            // false : étape pas encore écrite (affichée « à venir »)
}

export const ETAPES: Etape[] = [
  {
    id: "kick", nom: "Kick", icone: "rythmique", couleur: "#ff6a3d", pret: true,
    elements: [{ id: "kick", nom: "Kick", texte: "La grosse caisse : le coup grave qui marque les temps." }],
    role: {
      tekno: "Le kick est le moteur : un coup sur chaque temps (4×4), court et dur. Tout le reste s'accroche à lui.",
      tribe: "Le kick tient la transe : rond, avec du corps, sur les 4 temps. Il laisse de l'air pour les percussions qui tournent autour.",
      mentale: "Le kick est un battement lourd et régulier. Il ne change presque pas : c'est la répétition qui rend le morceau hypnotique.",
      "acid-tribe": "Le kick reste celui de la tribe : rond, sur les 4 temps. Laisse-lui un Decay court pour que la ligne acide ait de la place juste après.",
      hardtek: "Le kick est très saturé et frontal : c'est lui qui porte la puissance. Un coup sur chaque temps, plus dur que la tekno.",
      raggatek: "Le kick reste tekno : 4 coups par mesure, solides. C'est la basse et la voix qui apportent le côté ragga.",
      "dub-tekno": "Le kick est rond et profond, un peu moins agressif : il laisse de l'espace aux échos.",
    },
    conseils: [
      { texte: "Commence toujours par le kick : c'est ta référence de volume. Tu régleras le Level des autres parties par rapport à lui.", ref: OM(23) },
      { texte: "Garde le kick sec et net : MFX Send = OFF, pour que le Master FX (écho, réverbe) ne le brouille pas.", ref: OM(23) },
      { texte: "Un kick long prend la place de la basse. À 170 BPM, un temps ne dure que 0,35 seconde : si le Decay dépasse ça, le kick déborde sur le temps suivant.", ref: OM(23) },
    ],
  },
  {
    id: "basse", nom: "Basse", icone: "basse", couleur: "#9b6bff", pret: true,
    elements: [
      { id: "sub", nom: "Sub", texte: "Très grave et rond, presque une sinusoïde : on le sent plus qu'on ne l'entend." },
      { id: "basse-roulante", nom: "Roulante", texte: "Des notes courtes entre les kicks qui font rouler le morceau." },
      { id: "acid", nom: "Acid", texte: "Un filtre très résonant que l'enveloppe ouvre à chaque note : ça siffle et ça couine." },
      { id: "reese", nom: "Reese", texte: "Deux dents de scie un peu désaccordées qui grondent et bougent." },
    ],
    role: {
      tekno: "La basse roule entre les kicks : elle remplit les trous et donne l'élan. C'est elle qui fait danser.",
      tribe: "La basse est simple et ronde, souvent une note qui saute d'octave. Elle soutient les percussions sans les cacher.",
      mentale: "La basse gronde ou siffle (reese, acid) : elle crée la tension plus que la mélodie.",
      "acid-tribe": "La ligne acide fait office de basse et de mélodie : filtre résonant, accents et glides. Un sub discret peut tenir le grave dessous.",
      hardtek: "La basse roule fort entre les kicks, souvent saturée ou en reese : elle pousse en continu.",
      raggatek: "La basse chante : quelques notes qui rebondissent, à la manière d'une basse dancehall, calée entre les kicks.",
      "dub-tekno": "La basse est lente, ronde et profonde, avec peu de notes : elle laisse les silences respirer.",
    },
    conseils: [
      { texte: "La basse laisse la place au kick : évite les notes de basse pile sur les coups de kick, ou garde-les très courtes (Decay bas). L'app te montre plus bas les notes qui tombent en même temps." },
      { texte: "Un seul son à la fois dans le très grave : si tu gardes un sub ET une autre basse, baisse le Level de l'une ou fais-les jouer à des pas différents.", ref: OM(23) },
      { texte: "La basse fait entendre la tonalité : garde-la surtout sur la note de départ (KEY) et sa quinte. Une basse monophonique (VOICE ASSIGN = Mono) évite que deux notes graves se chevauchent.", ref: PG(4) },
    ],
  },
  {
    id: "hats", nom: "Charlestons", icone: "rythmique", couleur: "#ff9a3d", pret: true,
    elements: [
      { id: "hat-ferme", nom: "Fermé", texte: "Court et sec (HH, HHC) : il marque les petites divisions du temps." },
      { id: "hat-ouvert", nom: "Ouvert", texte: "Plus long, il souffle (HHO) : souvent entre deux kicks, sur le contretemps." },
    ],
    role: {
      tekno: "Les charlestons poussent le morceau vers l'avant : un ouvert sur chaque contretemps, des fermés serrés entre les deux.",
      tribe: "Les charlestons restent discrets : ils tiennent le tempo pendant que les toms et les congas font le spectacle.",
      mentale: "Les charlestons sont fins et réguliers, souvent un peu filtrés : ils accélèrent la sensation sans prendre de place.",
      "acid-tribe": "Les charlestons galopent comme en tribe, mais restent un peu en retrait pour ne pas couvrir les aigus de l'acide.",
      hardtek: "Les charlestons sont serrés et rapides : ils ajoutent de la vitesse à un tempo déjà élevé.",
      raggatek: "Un charleston ouvert sur chaque contretemps donne le chaloupé ; les fermés restent légers.",
      "dub-tekno": "Les charlestons sont fins, souvent avec un peu d'écho : ils marquent le tempo sans remplir l'espace.",
    },
    conseils: [
      { texte: "Le charleston ouvert sonne le mieux entre deux kicks (pas 3, 7, 11, 15) : c'est le contretemps qui fait sautiller." },
      { texte: "Un charleston ouvert et un fermé sur le même pas se marchent dessus : sur la vraie batterie, le fermé coupe l'ouvert. Garde-les sur des pas différents." },
      { texte: "Baisse le Level des charlestons sous celui du kick et coupe leur grave (HPF ou Cutoff haut) : ils doivent briller, pas taper.", ref: OM(23) },
    ],
  },
  {
    id: "clap", nom: "Clap / caisse claire", icone: "rythmique", couleur: "#ffb03d", pret: true,
    elements: [
      { id: "clap", nom: "Clap", texte: "Un claquement de mains : plusieurs petits coups de souffle très rapprochés." },
      { id: "snare", nom: "Caisse claire", texte: "La snare : un coup de bruit avec un peu de corps, plus sec que le clap." },
    ],
    role: {
      tekno: "Le clap ou la snare tombe sur les temps 2 et 4 (pas 5 et 13) : il donne le balancier gauche-droite du 4×4.",
      tribe: "En tribe, le clap est rare ou décalé : une caisse claire qui roule ou des coups placés hors des temps donnent un côté tambour.",
      mentale: "Un clap sec et réverbéré, parfois sur un seul temps sur deux : il ajoute de l'espace et de l'inquiétude.",
      "acid-tribe": "Comme en tribe, le clap est rare ou décalé ; la caisse claire sert surtout aux relances.",
      hardtek: "Un clap ou une snare dure sur les temps 2 et 4, souvent saturé : il claque avec le kick.",
      raggatek: "Le rim ou la snare joue le rôle du skank rythmique ; le clap sur 2 et 4 reste possible.",
      "dub-tekno": "Un clap ou un rim envoyé dans l'écho : un seul coup qui se répète tout seul grâce au delay.",
    },
    conseils: [
      { texte: "Le clap se pose avec le kick sur les temps 2 et 4 : ensemble ils doivent sonner comme un seul coup plus large, pas comme deux sons séparés." },
      { texte: "Un peu de réverbe ou de delay sur le clap (MFX Send = ON) le met en arrière et laisse le kick devant.", ref: OM(23) },
      { texte: "Ne mets pas à la fois un clap et une caisse claire sur tous les mêmes pas : choisis-en un pour les temps, l'autre pour les fills." },
    ],
  },
  {
    id: "percs", nom: "Toms et percussions", icone: "rythmique", couleur: "#e8484e", pret: true,
    elements: [
      { id: "toms", nom: "Toms", texte: "Des tambours accordés : ils font des motifs qui tournent, le cœur de la tribe." },
      { id: "congas", nom: "Congas et percs tribales", texte: "Petites percussions à la main, courtes et vives." },
      { id: "shaker", nom: "Shaker", texte: "Un hochet : un souffle doux sur chaque petit pas." },
      { id: "ride", nom: "Ride et cymbale", texte: "Une cymbale qui sonne longtemps : elle ajoute du métal et de l'air." },
      { id: "roll", nom: "Roulement", texte: "Une suite de coups de plus en plus serrés : elle relance avant le retour." },
    ],
    role: {
      tekno: "Les percussions remplissent les trous entre kick, basse et charlestons : une ride ou un shaker pour l'énergie, un roulement pour relancer.",
      tribe: "C'est la couche la plus importante en tribe : des toms et des congas qui tournent en boucle et répondent au kick, comme une batterie de tambours.",
      mentale: "Les percussions sont rares et étranges : un tom qui descend, un coup métallique, placés hors des temps pour surprendre.",
      "acid-tribe": "Les toms et congas tournent comme en tribe, mais moins chargés : la ligne acide occupe déjà beaucoup.",
      hardtek: "Peu de percussions : un roulement pour relancer suffit, le son reste frontal.",
      raggatek: "Peu de percussions : les relances passent plutôt par la voix, le rim et les roulements.",
      "dub-tekno": "Quelques percussions isolées, souvent noyées dans l'écho ; les toms peuvent jouer avec le delay.",
    },
    conseils: [
      { texte: "Les toms ne tapent pas sur les coups du kick : ils jouent dans les trous, sinon le grave devient boueux." },
      { texte: "Accorde les toms dans la gamme du morceau : avec Pitch à l'oreille, ils doivent sonner avec la basse, pas à côté.", ref: OM(23) },
      { texte: "Écarte les percussions avec Pan (une à gauche, une à droite) : le kick et la basse restent au centre.", ref: OM(23) },
    ],
  },
  {
    id: "melodie", nom: "Mélodie", icone: "melodie", couleur: "#ffd84d", pret: true,
    elements: [
      { id: "lead", nom: "Lead", texte: "La voix principale : une ligne de notes qu'on retient." },
      { id: "arpege", nom: "Arpège", texte: "Les notes d'un accord jouées l'une après l'autre, très vite, en boucle." },
      { id: "stab", nom: "Stab", texte: "Un accord court et percutant, joué d'un coup." },
      { id: "riff", nom: "Riff", texte: "Un petit motif de quelques notes répété : il accroche l'oreille." },
    ],
    role: {
      tekno: "La mélodie reste courte : un riff acide ou un stab qui revient, plus pour l'énergie que pour chanter.",
      tribe: "La mélodie est simple et hypnotique : quelques notes de la gamme, souvent orientales, qui tournent avec les percussions.",
      mentale: "La mélodie crée la tension : un lead acide qui siffle, des notes qui frottent (gamme phrygienne ou harmonique) et qui évoluent lentement.",
      "acid-tribe": "La mélodie, c'est la ligne acide : si tu en ajoutes une autre, garde-la courte (un lead ou un arpège discret).",
      hardtek: "Des stabs et des riffs courts et durs, souvent saturés : la mélodie sert l'énergie.",
      raggatek: "Un skank (accord court sur le contretemps) ou un riff qui chante, dans l'esprit ragga.",
      "dub-tekno": "Un accord court envoyé dans un long écho : c'est le delay qui fait la mélodie.",
    },
    conseils: [
      { texte: "La mélodie ne doit pas masquer la basse : joue-la au moins une octave plus haut et coupe son grave (Cutoff, HPF). L'app te prévient si elle descend dans le registre de la basse." },
      { texte: "Laisse des trous : une mélodie qui joue sur les 16 pas fatigue. Les silences rendent les notes plus fortes." },
      { texte: "Un stab joue un accord : il lui faut VOICE ASSIGN = Poly (jusqu'à 4 voix) et il compte plus dans les 24 voix de la machine.", ref: PG(4) },
    ],
  },
  {
    id: "ambiance", nom: "Ambiance", icone: "ambiance", couleur: "#3fd6d0", pret: true,
    elements: [
      { id: "nappe", nom: "Nappe", texte: "Un son long et doux qui remplit le fond (pad)." },
      { id: "drone", nom: "Drone", texte: "Une note tenue qui ne s'arrête jamais, comme un bourdon." },
      { id: "noise", nom: "Noise", texte: "Du bruit filtré : souffle, vent, grésillement." },
      { id: "voix", nom: "Voix", texte: "Un son de voix (oscillateurs Voice, Vox ou l'entrée Audio In)." },
    ],
    role: {
      tekno: "L'ambiance est discrète : un souffle ou une nappe filtrée pour donner de la profondeur, surtout dans les breaks.",
      tribe: "L'ambiance ajoute le côté rituel : drone grave, voix, souffle qui tourne d'une enceinte à l'autre.",
      mentale: "L'ambiance est essentielle : un drone sombre ou une nappe qui bouge lentement installe l'état hypnotique.",
      "acid-tribe": "Peu d'ambiance : un drone discret au plus, la ligne acide prend toute la place.",
      hardtek: "Un bruit ou un souffle saturé pour les montées ; peu de nappes.",
      raggatek: "La voix est l'ambiance principale : des cris ou des phrases courtes (oscillateurs Voice, ou Audio In).",
      "dub-tekno": "Une nappe profonde ou un souffle filtré installe l'espace ; c'est une couche importante.",
    },
    conseils: [
      { texte: "Une nappe ou un drone tient longtemps : baisse son Level bien sous le kick et coupe son grave pour qu'il ne brouille pas la basse.", ref: OM(23) },
      { texte: "Une attaque lente (Attack haut) fait entrer la nappe en douceur au lieu de taper avec le kick.", ref: OM(23) },
      { texte: "Le drone sur la note de départ (KEY) colle à tout ; une autre note de la gamme crée de la tension." },
    ],
  },
  {
    id: "effets", nom: "Effets et transitions", icone: "transitions", couleur: "#e255c8", pret: true,
    elements: [
      { id: "montee", nom: "Montée", texte: "Un bruit ou une note qui monte (riser, sweep) : il annonce le retour." },
      { id: "break", nom: "Break", texte: "Le moment où le kick s'arrête : la partie qui joue pendant le break." },
      { id: "fill", nom: "Fill", texte: "Quelques coups en plus à la fin d'une boucle pour relancer." },
      { id: "coupure", nom: "Coupure", texte: "Un silence net juste avant le retour : tout le monde se tait." },
      { id: "impact", nom: "Impact", texte: "Un gros boum sur le premier temps du retour (drop)." },
    ],
    role: {
      tekno: "Les transitions préparent le drop : une montée sur 4 mesures, une coupure d'un temps, puis tout revient.",
      tribe: "Les transitions passent par les tambours : un roulement de toms ou un fill qui s'emballe, puis le kick revient.",
      mentale: "Les transitions sont longues et inquiétantes : une montée de bruit filtré, un impact grave, des sons qui se déforment.",
      "acid-tribe": "Les transitions passent par le filtre de l'acide : il se ferme dans le break et s'ouvre dans la montée.",
      hardtek: "Montées rapides et dures, coupures nettes et impacts saturés avant le retour du kick.",
      raggatek: "Des coupures nettes et des « rewinds » (tout s'arrête puis repart) relancent le morceau.",
      "dub-tekno": "Les échos font les transitions : on coupe tout sauf le delay, qui continue tout seul, puis tout revient.",
    },
    conseils: [
      { texte: "Une couche de transition ne joue pas tout le temps : dans la structure, allume-la seulement dans la Montée et le Break." },
      { texte: "Sur l'E2, Part Mute coupe ou rallume une partie pendant la lecture : c'est le geste de base pour faire entrer une montée.", ref: OM(32) },
      { texte: "Une montée peut aussi être un geste : enregistre le Cutoff qui s'ouvre avec Motion Sequence, la machine le rejoue toute seule.", ref: OM(31) },
    ],
  },
];
export const etapeById = new Map(ETAPES.map((e) => [e.id, e]));

/** Pages du manuel utiles au module. */
export const PAGES = {
  parties16: OM(27),          // un motif = 16 parties + un effet maître
  voix24: OM(38),             // fiche technique : 24 voix max par motif, 4 par partie
  voiceAssign: PG(4),
  partMute: OM(32),
  patternSet: OM(30),
  motionSeq: OM(31),
  chain: PG(3),
  chainMode: PG(8),
  write: OM(31),
};

// ---------- Structure du morceau ----------
/** Une section : combien de mesures, et quelles étapes (couches) jouent. Conseil de style (Pratique). */
export interface Section { nom: string; couleur: string; mesures: number; etapes: EtapeId[]; role: string }

const C = { intro: "#3f6dae", montee: "#7a5bc4", break: "#c47a2a", drop: "#c41f27", outro: "#2e7d6a" };
const TOUT: EtapeId[] = ["kick", "basse", "hats", "clap", "percs", "melodie", "ambiance"];

export const STRUCTURES: Record<Style, Section[]> = {
  tribe: [
    { nom: "Intro", couleur: C.intro, mesures: 16, etapes: ["kick", "hats", "percs"], role: "Le kick et les tambours seuls : on installe la transe." },
    { nom: "Montée", couleur: C.montee, mesures: 16, etapes: ["kick", "hats", "percs", "basse", "effets"], role: "La basse arrive, la transition annonce la suite." },
    { nom: "Break", couleur: C.break, mesures: 8, etapes: ["percs", "ambiance", "melodie", "effets"], role: "Le kick s'arrête : les tambours et l'ambiance tiennent seuls." },
    { nom: "Drop", couleur: C.drop, mesures: 32, etapes: TOUT, role: "Tout revient d'un coup : le cœur du morceau." },
    { nom: "Outro", couleur: C.outro, mesures: 16, etapes: ["kick", "percs"], role: "On retire les couches pour finir comme on a commencé." },
  ],
  mentale: [
    { nom: "Intro", couleur: C.intro, mesures: 8, etapes: ["kick", "ambiance"], role: "Le kick et une ambiance sombre, rien d'autre." },
    { nom: "Montée", couleur: C.montee, mesures: 16, etapes: ["kick", "ambiance", "hats", "percs", "effets"], role: "Les sons s'ajoutent un à un, la tension monte." },
    { nom: "Break", couleur: C.break, mesures: 16, etapes: ["ambiance", "melodie", "effets"], role: "Plus de kick : la mélodie et l'ambiance installent l'angoisse." },
    { nom: "Drop", couleur: C.drop, mesures: 32, etapes: TOUT, role: "Tout le monde : kick, basse, acide." },
    { nom: "Outro", couleur: C.outro, mesures: 8, etapes: ["kick", "ambiance"], role: "Retour au kick et à l'ambiance." },
  ],
  tekno: [
    { nom: "Intro", couleur: C.intro, mesures: 16, etapes: ["kick", "hats"], role: "Kick et charlestons pour poser le tempo." },
    { nom: "Montée", couleur: C.montee, mesures: 16, etapes: ["kick", "hats", "basse", "clap", "effets"], role: "La basse roule, une montée arrive sur la fin." },
    { nom: "Break", couleur: C.break, mesures: 8, etapes: ["ambiance", "melodie", "effets"], role: "On coupe le kick et la basse." },
    { nom: "Drop", couleur: C.drop, mesures: 32, etapes: TOUT, role: "Tout revient." },
    { nom: "Outro", couleur: C.outro, mesures: 16, etapes: ["kick", "hats", "clap"], role: "Retour au kick et aux charlestons." },
  ],
  "acid-tribe": [
    { nom: "Intro", couleur: C.intro, mesures: 16, etapes: ["kick", "hats", "percs"], role: "Le kick et les percussions, comme en tribe." },
    { nom: "Montée", couleur: C.montee, mesures: 16, etapes: ["kick", "hats", "percs", "basse", "effets"], role: "La ligne acide entre, filtre presque fermé, et s'ouvre peu à peu." },
    { nom: "Break", couleur: C.break, mesures: 8, etapes: ["basse", "ambiance", "effets"], role: "Le kick s'arrête : la ligne acide reste seule et le filtre se referme." },
    { nom: "Drop", couleur: C.drop, mesures: 32, etapes: TOUT, role: "Tout revient, la ligne acide grande ouverte." },
    { nom: "Outro", couleur: C.outro, mesures: 16, etapes: ["kick", "percs", "basse"], role: "On retire les couches ; l'acide se referme jusqu'au bout." },
  ],
  hardtek: [
    { nom: "Intro", couleur: C.intro, mesures: 8, etapes: ["kick", "hats"], role: "Kick saturé et charlestons : la puissance dès le départ." },
    { nom: "Montée", couleur: C.montee, mesures: 16, etapes: ["kick", "hats", "basse", "clap", "effets"], role: "La basse roule, la montée accélère vers le drop." },
    { nom: "Break", couleur: C.break, mesures: 8, etapes: ["melodie", "ambiance", "effets"], role: "Coupure courte : un stab ou un riff, puis une montée rapide." },
    { nom: "Drop", couleur: C.drop, mesures: 32, etapes: TOUT, role: "Tout revient d'un coup, le plus fort possible." },
    { nom: "Outro", couleur: C.outro, mesures: 8, etapes: ["kick", "hats", "clap"], role: "Retour au kick et aux charlestons." },
  ],
  raggatek: [
    { nom: "Intro", couleur: C.intro, mesures: 16, etapes: ["kick", "hats", "ambiance"], role: "Kick, charlestons et une première phrase de voix." },
    { nom: "Montée", couleur: C.montee, mesures: 16, etapes: ["kick", "hats", "clap", "basse", "effets"], role: "La basse qui chante arrive, la voix annonce la suite." },
    { nom: "Break", couleur: C.break, mesures: 8, etapes: ["melodie", "ambiance", "effets"], role: "Le kick s'arrête : skank et voix seuls, puis un rewind ou une coupure." },
    { nom: "Drop", couleur: C.drop, mesures: 32, etapes: TOUT, role: "Tout revient : kick, basse, skank et voix." },
    { nom: "Outro", couleur: C.outro, mesures: 16, etapes: ["kick", "hats", "ambiance"], role: "Retour au kick et à la voix." },
  ],
  "dub-tekno": [
    { nom: "Intro", couleur: C.intro, mesures: 16, etapes: ["kick", "ambiance"], role: "Le kick et la nappe : on installe l'espace." },
    { nom: "Montée", couleur: C.montee, mesures: 16, etapes: ["kick", "ambiance", "hats", "melodie"], role: "Les accords en écho entrent, les charlestons suivent." },
    { nom: "Break", couleur: C.break, mesures: 16, etapes: ["melodie", "ambiance", "effets"], role: "Plus de kick : seuls les échos et la nappe tournent." },
    { nom: "Drop", couleur: C.drop, mesures: 32, etapes: TOUT, role: "Tout revient, avec la basse ronde." },
    { nom: "Outro", couleur: C.outro, mesures: 16, etapes: ["kick", "ambiance", "melodie"], role: "On retire les couches et on laisse les échos finir." },
  ],
};
export const LONGUEURS = [4, 8, 12, 16, 24, 32, 48, 64];

// ---------- Deux morceaux d'exemple ----------
export interface Exemple {
  id: string; nom: string; style: Style; bpm: number; key: string; scale: number; idee: string;
  couches: { etape: EtapeId; recette: string }[];
  passees: EtapeId[];
}
export const EXEMPLES: Exemple[] = [
  {
    id: "ex-tribe", nom: "Transe des tambours", style: "tribe", bpm: 170, key: "D", scale: 16,
    idee: "Un kick rond, un sub qui répond entre les coups, des toms et des congas qui tournent, une mélodie hypnotique et un bourdon. Pas de clap : ce sont les tambours qui font le balancier.",
    couches: [
      { etape: "kick", recette: "kick-rond-tribe" },
      { etape: "basse", recette: "sub-tribe" },
      { etape: "hats", recette: "openhat-tribe" },
      { etape: "percs", recette: "toms-tribaux" },
      { etape: "percs", recette: "congas-dialogue" },
      { etape: "melodie", recette: "lead-hypnotique" },
      { etape: "ambiance", recette: "drone-tribe" },
      { etape: "effets", recette: "fill-toms-tribe" },
    ],
    passees: ["clap"],
  },
  {
    id: "ex-mentale", nom: "Spirale sombre", style: "mentale", bpm: 165, key: "D", scale: 4,
    idee: "Un kick distordu, une reese qui gronde, des charlestons qui grésillent, un clap réverbéré, des toms phrygiens, un lead qui glisse et un drone sombre. La montée de bruit prépare le drop.",
    couches: [
      { etape: "kick", recette: "kick-distordu" },
      { etape: "basse", recette: "reese-mentale" },
      { etape: "hats", recette: "hat-crackle-mentale" },
      { etape: "clap", recette: "clap-delay-mentale" },
      { etape: "percs", recette: "tom-phrygien-mentale" },
      { etape: "melodie", recette: "lead-glisse-mentale" },
      { etape: "ambiance", recette: "drone-sombre" },
      { etape: "effets", recette: "montee-mentale" },
    ],
    passees: [],
  },
];
