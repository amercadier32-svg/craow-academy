// Guide des effets et modulations : une fiche par Insert FX (38), par Master FX (32) et par modulation (72).
//
// Ce qui vient du manuel (badge « Manuel ») : le numéro et le nom exact (Guide des paramètres p. 14 à 16),
// la source et la destination de chaque modulation, la synchro au tempo (BPM Sync) et le Key Sync (Guide p. 14-15),
// les gestes pour activer l'effet (Mode d'emploi p. 22-24, 29 ; Guide p. 3, 10).
// Ce que le manuel ne dit PAS : ce que fait chaque effet, le rôle du potard Edit ou des axes X / Y pour chaque effet,
// les plages de valeurs. Ici, ces textes sont des explications « Interprétation » (ce que fait d'habitude ce type d'effet)
// à confirmer à l'oreille : chaque fiche a un exercice d'écoute et des cases à remplir.
// Les usages en tribe / tekno / mentale sont des propositions (badge « Pratique »).
import type { Source } from "../lib/data";
import type { Style } from "./recettes";
import effectsJson from "@data/electribe2/effects.json";
import { parseMod, type ModInfo } from "../lib/fxaudio";

const PG = (page: number): Source => ({ doc: "PG", page });
const OM = (page: number): Source => ({ doc: "OM", page });

export type Kind = "ifx" | "mfx" | "mod";
export type FamilleId =
  | "distorsion" | "dynamique" | "eq" | "filtre" | "delai" | "reverbe" | "modulation" | "rythme" | "boucle" | "sequence";

export const FAMILLES: { id: FamilleId; nom: string; idee: string }[] = [
  { id: "filtre", nom: "Filtres", idee: "Enlever ou faire ressortir une zone de fréquences, souvent en bougeant." },
  { id: "distorsion", nom: "Distorsions et saturations", idee: "Salir, durcir, abîmer le son." },
  { id: "dynamique", nom: "Dynamique", idee: "Contrôler le volume : plus fort, plus serré, plus long." },
  { id: "eq", nom: "Égaliseurs", idee: "Changer l'équilibre grave / médium / aigu." },
  { id: "delai", nom: "Délais (échos)", idee: "Répéter le son après un temps donné." },
  { id: "reverbe", nom: "Réverbes", idee: "Mettre le son dans une pièce ou une salle." },
  { id: "modulation", nom: "Chorus, flanger, phaser", idee: "Faire tourner, doubler ou creuser le son en mouvement." },
  { id: "rythme", nom: "Volume rythmique", idee: "Découper ou faire pomper le volume en rythme." },
  { id: "boucle", nom: "Boucles et glitch", idee: "Capturer un morceau du son et le rejouer en boucle ou en morceaux." },
  { id: "sequence", nom: "Jeu sur le séquenceur", idee: "Changer l'ordre ou la vitesse de lecture des pas." },
];

export type SonCible = "kick" | "basse" | "acid" | "nappe" | "lead" | "percussion";
export const SONS: { id: SonCible; nom: string }[] = [
  { id: "kick", nom: "Kick" }, { id: "basse", nom: "Basse" }, { id: "acid", nom: "Acid" },
  { id: "lead", nom: "Lead" }, { id: "nappe", nom: "Nappe" }, { id: "percussion", nom: "Percussion" },
];

/** Petit schéma « avant / après ». Les fonctions travaillent sur une forme d'onde, un spectre, des échos ou des pas. */
export type Schema =
  | { type: "onde"; f: (s: number[]) => number[] }                 // s = 2 périodes de sinus (128 points)
  | { type: "spectre"; f: (x: number) => number }                  // x = 0 (grave) … 1 (aigu) → gain en dB
  | { type: "echo"; echos: [number, number][] }                    // [temps 0…1, niveau 0…1] après le son d'origine
  | { type: "volume"; f: (t: number) => number }                   // t = 0…1 sur une mesure → volume 0…1
  | { type: "pas"; f: (i: number) => number | null };             // pas 0…15 → pas d'origine joué (null = silence)

/** Un réglage dont le manuel ne donne ni le rôle exact ni la plage : rôle « Interprétation », valeur de départ à vérifier. */
export interface Axe { role: string; depart: number }

export interface Usage {
  sons: SonCible[];
  styles: Style[];
  texte: string;            // sur quel son, pourquoi
  assoc: string[];          // une ou deux associations qui marchent
}

export interface FicheFx {
  id: string;               // « ifx-3 », « mfx-12 »
  kind: "ifx" | "mfx";
  n: number;
  nom: string;              // nom exact de l'écran (Guide p. 16)
  famille: FamilleId;
  quoi: string;             // en mots simples (Interprétation : le Guide ne donne que le nom)
  schema: Schema;
  edit?: Axe;               // IFX : potard Edit
  x?: Axe; y?: Axe;         // MFX : pad tactile
  usage: Usage;
  ecoute: string[];         // questions de l'exercice d'écoute
  motionSeq?: boolean;      // MFX : false = « La séquence de données de jeu n'est pas disponible » (Guide p. 16, *)
}

export interface FicheMod {
  id: string;               // « mod-25 »
  kind: "mod";
  n: number;
  nom: string;
  info: ModInfo;
  sourceManuel: string;     // colonne Modulation Source du Guide
  destManuel: string;       // colonne Modulation Destination
  usage: Usage;
}

export type Fiche = FicheFx | FicheMod;

// ---------- Formes utiles aux schémas ----------
const sat = (k: number) => (s: number[]) => s.map((v) => Math.tanh(k * v) / Math.tanh(k));
const clip = (lim: number) => (s: number[]) => s.map((v) => Math.max(-lim, Math.min(lim, v * 1.6)) / lim);
const hold = (n: number) => (s: number[]) => s.map((_, i) => s[i - (i % n)]);
const quant = (lv: number) => (s: number[]) => s.map((v) => Math.round(v * lv) / lv);

const ED = (role: string, depart: number): Axe => ({ role, depart });

// =====================================================================================
// INSERT FX (38) — Guide p. 16
// =====================================================================================
const IFX: Omit<FicheFx, "id" | "kind">[] = [
  // ---------- Distorsions et saturations ----------
  {
    n: 1, nom: "Punch", famille: "distorsion",
    quoi: "Donne plus d'impact à l'attaque : le début du son ressort, le corps devient plus serré et plus gras. C'est une saturation légère mêlée à un compresseur, pensée pour les kicks et les percussions.",
    schema: { type: "onde", f: (s) => s.map((v, i) => Math.tanh(2.2 * v) / Math.tanh(2.2) * (1 + 0.5 * Math.exp(-i / 10))).map((v) => Math.max(-1, Math.min(1, v))) },
    edit: ED("Quantité de « punch » : plus d'impact et un peu plus de grave quand tu tournes vers la droite.", 64),
    usage: {
      sons: ["kick", "percussion"], styles: ["tekno", "tribe"],
      texte: "Le premier effet à essayer sur un kick tekno ou tribe : le kick passe devant sans devenir plus fort sur l'écran.",
      assoc: ["Kick Hardcore (osc 6) + Punch + Decay court : un kick sec qui cogne.", "Tom ou conga tribe + Punch : les percussions claquent plus."],
    },
    ecoute: ["Edit au minimum puis au maximum : à partir de quelle valeur l'attaque change-t-elle ?", "Le grave du kick change-t-il aussi, ou seulement l'attaque ?"],
  },
  {
    n: 2, nom: "Overdrive", famille: "distorsion",
    quoi: "Une saturation douce, comme un ampli poussé : le son s'arrondit, se réchauffe et devient plus présent. Plus tu pousses, plus il grogne.",
    schema: { type: "onde", f: sat(4) },
    edit: ED("Quantité de saturation (drive) : du simple réchauffement à un son qui grogne.", 50),
    usage: {
      sons: ["basse", "acid", "kick"], styles: ["tekno", "tribe", "mentale"],
      texte: "Sur une basse ou une ligne acid, l'Overdrive la fait ressortir dans le mix sans la rendre agressive. Sur un kick, il arrondit et salit l'attaque.",
      assoc: ["Ligne acid : Acid LPF résonant + Overdrive, puis Motion Seq sur Cutoff.", "Basse roulante tekno : MS20 LPF + Overdrive léger."],
    },
    ecoute: ["À quelle valeur d'Edit entends-tu le grain apparaître ?", "Le volume monte-t-il quand tu pousses Edit ? Compense avec Level si besoin."],
  },
  {
    n: 3, nom: "Distortion", famille: "distorsion",
    quoi: "Une distorsion dure : le haut et le bas de l'onde sont coupés net, le son devient carré, agressif et plein d'harmoniques aiguës.",
    schema: { type: "onde", f: clip(0.45) },
    edit: ED("Gain de distorsion : plus tu tournes, plus le son est écrasé et agressif.", 40),
    usage: {
      sons: ["acid", "lead", "kick"], styles: ["tekno", "mentale"],
      texte: "Pour un lead qui crie ou une acid qui arrache, typique de la tekno et de la mentale. Sur un kick, donne un kick « hardcore » saturé.",
      assoc: ["Acid : Acid LPF + Resonance haute + Distortion : la résonance siffle encore plus.", "Kick mentale : Distortion + HPF du Master Fx en montée."],
    },
    ecoute: ["Compare à l'Overdrive à Edit égal : lequel est le plus agressif ?", "À partir de quelle valeur d'Edit le son ne change-t-il plus ?"],
  },
  {
    n: 4, nom: "Decimator", famille: "distorsion",
    quoi: "Abaisse la fréquence d'échantillonnage : le son devient granuleux et métallique, avec des sifflements qui ne suivent pas la note, comme un vieux sampler.",
    schema: { type: "onde", f: hold(12) },
    edit: ED("Réduction de la qualité : plus la réduction est forte, plus le son devient granuleux et métallique (le sens du potard est à vérifier).", 60),
    usage: {
      sons: ["percussion", "lead", "nappe"], styles: ["mentale", "tekno"],
      texte: "Pour salir des percussions ou rendre une nappe « lo-fi » et métallique : très utilisé en mentale pour les sons bizarres.",
      assoc: ["Charleston + Decimator : un hat sale et numérique.", "Nappe mentale + Decimator + Hall Reverb (Master Fx)."],
    },
    ecoute: ["Dans quel sens faut-il tourner Edit pour abîmer le son ?", "Entends-tu des notes qui ne sont pas jouées (sifflements) ?"],
  },
  {
    n: 5, nom: "Bit Crusher", famille: "distorsion",
    quoi: "Réduit le nombre de niveaux de volume possibles : le son devient « en escalier », avec un souffle numérique et un grain de console de jeu.",
    schema: { type: "onde", f: quant(3) },
    edit: ED("Réduction de résolution : plus la résolution baisse, plus le son devient brut et bruité (sens à vérifier).", 70),
    usage: {
      sons: ["basse", "lead", "percussion"], styles: ["mentale", "tekno"],
      texte: "Pour une basse ou un lead « 8 bits » et agressif. Sur des percussions, ajoute un souffle numérique.",
      assoc: ["Basse carrée + Bit Crusher + MS20 LPF : basse 8 bits.", "Lead mentale + Bit Crusher + Tape Delay (Master Fx)."],
    },
    ecoute: ["Compare au Decimator : lequel change le grain, lequel change les notes ?", "Le souffle apparaît-il aussi dans les silences ?"],
  },
  {
    n: 6, nom: "Ring Modulator", famille: "distorsion",
    quoi: "Multiplie le son par une autre onde : les notes deviennent métalliques, comme des cloches ou un robot. La hauteur perçue ne correspond plus vraiment à la note jouée.",
    schema: { type: "onde", f: (s) => s.map((v, i) => v * Math.sin((i / 128) * 2 * Math.PI * 9)) },
    edit: ED("Fréquence de l'onde qui module : grave = vibration rapide, aigu = son de cloche (à vérifier).", 40),
    usage: {
      sons: ["lead", "percussion", "nappe"], styles: ["mentale", "tribe"],
      texte: "Pour des sons métalliques, des cloches tribe ou des voix de robot en mentale. À doser : le son perd sa note.",
      assoc: ["Percussion tribe + Ring Modulator : une cloche métallique.", "Lead mentale + Ring Modulator + Motion Seq sur Edit."],
    },
    ecoute: ["La note jouée est-elle encore reconnaissable avec Edit au milieu ?", "Fais tourner Edit pendant la lecture : quel son entends-tu ?"],
  },
  // ---------- Dynamique ----------
  {
    n: 7, nom: "Sustainer", famille: "dynamique",
    quoi: "Fait durer le son plus longtemps : la fin de chaque note est remontée en volume, comme si on tenait la note. Un son court devient plus long et plus égal.",
    schema: { type: "volume", f: (t) => (t % 0.25) < 0.01 ? 1 : 0.35 + 0.55 * Math.exp(-((t % 0.25) * 6)) },
    edit: ED("Quantité de maintien : plus le son est soutenu et sa fin remontée.", 64),
    usage: {
      sons: ["basse", "nappe", "lead"], styles: ["tribe", "mentale"],
      texte: "Pour épaissir une basse courte ou faire tenir une nappe qui retombe trop vite.",
      assoc: ["Basse sub + Sustainer : elle remplit tout l'espace entre les kicks.", "Nappe + Sustainer + Hall Reverb (Master Fx) : un fond continu."],
    },
    ecoute: ["Avec un Decay court, à quelle valeur d'Edit la note semble-t-elle durer plus longtemps ?", "Le souffle monte-t-il dans les silences ?"],
  },
  {
    n: 8, nom: "Limiter", famille: "dynamique",
    quoi: "Empêche le son de dépasser un certain volume : les pics sont écrasés, le son devient plus dense et plus fort en moyenne.",
    schema: { type: "onde", f: (s) => s.map((v) => Math.max(-0.7, Math.min(0.7, v * 1.3)) / 0.7) },
    edit: ED("Force de la limitation : plus le son est écrasé et paraît fort.", 64),
    usage: {
      sons: ["kick", "basse", "percussion"], styles: ["tekno", "tribe"],
      texte: "Pour un kick ou une basse qui tape toujours au même niveau, sans pics qui dépassent.",
      assoc: ["Kick + Limiter : un kick très régulier.", "Percussions tribe + Limiter + Room Reverb."],
    },
    ecoute: ["À partir de quelle valeur d'Edit les attaques s'aplatissent-elles ?", "Le son devient-il plus fort ou seulement plus dense ?"],
  },
  // ---------- Égaliseurs ----------
  {
    n: 9, nom: "Low EQ", famille: "eq",
    quoi: "Monte ou baisse les graves de la partie.",
    schema: { type: "spectre", f: (x) => 12 / (1 + Math.exp((x - 0.25) * 20)) },
    edit: ED("Quantité de graves : sans doute « moins » d'un côté et « plus » de l'autre, avec un point neutre au milieu (à vérifier).", 80),
    usage: {
      sons: ["kick", "basse"], styles: ["tekno", "tribe", "mentale"],
      texte: "Pour donner du poids à un kick ou retirer du grave à une partie qui gêne la basse.",
      assoc: ["Kick + Low EQ poussé : plus de corps.", "Percussion + Low EQ baissé : laisse la place au kick."],
    },
    ecoute: ["Où se trouve le point neutre d'Edit (aucun changement) ?", "Le grave monte-t-il d'un côté et baisse-t-il de l'autre ?"],
  },
  {
    n: 10, nom: "Mid EQ", famille: "eq",
    quoi: "Monte ou creuse les médiums, la zone où se trouvent le corps des voix et des synthés.",
    schema: { type: "spectre", f: (x) => 12 * Math.exp(-Math.pow((x - 0.5) / 0.12, 2)) },
    edit: ED("Quantité de médiums, en plus ou en moins (à vérifier).", 80),
    usage: {
      sons: ["lead", "acid", "nappe"], styles: ["tekno", "mentale"],
      texte: "Pour qu'un lead ou une acid perce le mix, ou pour creuser une nappe qui prend trop de place.",
      assoc: ["Lead + Mid EQ poussé + Overdrive : très présent.", "Nappe + Mid EQ creusé : elle reste derrière."],
    },
    ecoute: ["Le son devient-il « nasal » quand tu pousses Edit ?", "Où est le point neutre ?"],
  },
  {
    n: 11, nom: "High EQ", famille: "eq",
    quoi: "Monte ou baisse les aigus : plus brillant ou plus sourd.",
    schema: { type: "spectre", f: (x) => 12 / (1 + Math.exp(-(x - 0.75) * 20)) },
    edit: ED("Quantité d'aigus, en plus ou en moins (à vérifier).", 80),
    usage: {
      sons: ["percussion", "lead", "nappe"], styles: ["tekno", "tribe", "mentale"],
      texte: "Pour faire briller des charlestons ou adoucir un lead trop agressif.",
      assoc: ["Charleston + High EQ poussé : plus brillant.", "Lead distordu + High EQ baissé : moins agressif."],
    },
    ecoute: ["Le souffle devient-il audible quand tu pousses les aigus ?", "Où est le point neutre ?"],
  },
  {
    n: 12, nom: "Radio EQ", famille: "eq",
    quoi: "Ne garde qu'une bande étroite de médiums, comme une vieille radio ou un téléphone : le son devient fin et lointain.",
    schema: { type: "spectre", f: (x) => x < 0.35 || x > 0.7 ? -20 : 4 },
    edit: ED("Place de la bande gardée, ou force de l'effet (à vérifier).", 64),
    usage: {
      sons: ["lead", "nappe", "percussion"], styles: ["mentale", "tekno"],
      texte: "Pour une intro ou un break : la partie sonne « de loin » puis revient pleine quand tu coupes IFX On.",
      assoc: ["Lead + Radio EQ en intro, puis IFX On coupé au drop.", "Boucle de percus + Radio EQ + Tape Delay (Master Fx)."],
    },
    ecoute: ["Tourne Edit : la bande gardée se déplace-t-elle ?", "Coupe IFX On en pleine lecture : quelle différence ?"],
  },
  {
    n: 13, nom: "Exciter", famille: "eq",
    quoi: "Ajoute de la brillance et du détail dans les aigus en créant de nouvelles harmoniques : le son paraît plus net et plus proche.",
    schema: { type: "spectre", f: (x) => x > 0.6 ? (x - 0.6) * 25 : 0 },
    edit: ED("Quantité de brillance ajoutée.", 50),
    usage: {
      sons: ["percussion", "lead", "nappe"], styles: ["tekno", "tribe"],
      texte: "Pour qu'un charleston ou un lead ressorte sans monter le volume.",
      assoc: ["Charleston + Exciter : plus net.", "Lead + Exciter + Delay 3/16."],
    },
    ecoute: ["Compare avec High EQ : lequel ajoute du grain, lequel monte seulement le volume des aigus ?"],
  },
  // ---------- Filtres ----------
  {
    n: 14, nom: "Low Pass Filter", famille: "filtre",
    quoi: "Un second filtre passe-bas après le son : il enlève les aigus. Plus il se ferme, plus le son devient sourd.",
    schema: { type: "spectre", f: (x) => x < 0.45 ? 2 * Math.exp(-Math.pow((x - 0.45) / 0.05, 2)) * 3 : -(x - 0.45) * 60 },
    edit: ED("Fréquence de coupure : fermé = sourd, ouvert = brillant (à vérifier).", 70),
    usage: {
      sons: ["basse", "acid", "nappe"], styles: ["tekno", "tribe", "mentale"],
      texte: "Utile quand le filtre de la partie est déjà pris : un deuxième filtre à automatiser en Motion Seq.",
      assoc: ["Acid : Acid LPF + Low Pass Filter de l'IFX en Motion Seq : deux filtres qui bougent.", "Nappe + Low Pass Filter fermé en intro."],
    },
    ecoute: ["Edit tout à gauche : le son disparaît-il complètement ?", "Y a-t-il une résonance (sifflement) près de la coupure ?"],
  },
  {
    n: 15, nom: "High Pass Filter", famille: "filtre",
    quoi: "Enlève les graves : le son devient fin. Très utile pour préparer une montée.",
    schema: { type: "spectre", f: (x) => x > 0.45 ? 0 : -(0.45 - x) * 60 },
    edit: ED("Fréquence de coupure : plus tu montes, plus le grave disparaît (à vérifier).", 40),
    usage: {
      sons: ["basse", "nappe", "percussion"], styles: ["tekno", "tribe", "mentale"],
      texte: "Pour vider une basse avant le drop, ou enlever le grave inutile d'une percussion.",
      assoc: ["Basse + High Pass Filter en Motion Seq sur 4 mesures : montée.", "Clap + High Pass Filter : il ne gêne plus le kick."],
    },
    ecoute: ["À quelle valeur d'Edit la basse disparaît-elle ?"],
  },
  {
    n: 16, nom: "Band Plus Filter", famille: "filtre",
    quoi: "Fait ressortir une bande de fréquences en gardant le reste du son : une sorte de « wah » fixe que tu déplaces avec Edit.",
    schema: { type: "spectre", f: (x) => 12 * Math.exp(-Math.pow((x - 0.5) / 0.06, 2)) },
    edit: ED("Position de la bande accentuée, du grave à l'aigu (à vérifier).", 64),
    usage: {
      sons: ["acid", "lead", "percussion"], styles: ["tekno", "mentale"],
      texte: "Pour un effet « wah » sur une acid ou un lead, en tournant Edit pendant la lecture.",
      assoc: ["Acid + Band Plus Filter + Motion Seq sur Edit.", "Percussion + Band Plus Filter : couleur métallique."],
    },
    ecoute: ["Tourne Edit pendant la lecture : entends-tu le « wah » ?", "Le grave reste-t-il présent ?"],
  },
  {
    n: 17, nom: "Talk Filter", famille: "filtre",
    quoi: "Un filtre qui imite les voyelles d'une voix : le son « parle » (ou, a, i…) quand tu tournes Edit.",
    schema: { type: "spectre", f: (x) => 12 * Math.exp(-Math.pow((x - 0.35) / 0.05, 2)) + 9 * Math.exp(-Math.pow((x - 0.62) / 0.05, 2)) - 6 },
    edit: ED("Voyelle : le filtre passe d'une voyelle à l'autre (à vérifier).", 64),
    usage: {
      sons: ["acid", "lead", "basse"], styles: ["mentale", "tekno"],
      texte: "Pour une acid ou une basse qui « parle », très efficace en mentale avec du Motion Seq.",
      assoc: ["Basse saw + Talk Filter + Motion Seq sur Edit.", "Lead + Talk Filter + LFOTri IFX (modulation 30) : la voyelle bouge toute seule."],
    },
    ecoute: ["Combien de voyelles différentes entends-tu en tournant Edit de bout en bout ?"],
  },
  // ---------- Délais ----------
  ...[["Delay 1/4", 18, 1 / 4, "une noire (un temps)"], ["Delay 3/16", 19, 3 / 16, "trois doubles-croches (un temps pointé court)"], ["Delay 1/8", 20, 1 / 8, "une croche (un demi-temps)"], ["Delay 1/16", 21, 1 / 16, "une double-croche (un quart de temps)"]].map(([nom, n, frac, txt]) => ({
    n: n as number, nom: nom as string, famille: "delai" as FamilleId,
    quoi: `Un écho calé sur le tempo : le son est répété après ${txt}, de plus en plus faible.`,
    schema: { type: "echo" as const, echos: [1, 2, 3, 4].map((k): [number, number] => [Math.min(1, k * (frac as number) * 1.6), Math.pow(0.6, k)]) },
    edit: ED("Quantité d'écho : volume et/ou nombre de répétitions (à vérifier).", 50),
    usage: {
      sons: (n === 19 ? ["lead", "acid", "percussion"] : n === 18 ? ["nappe", "lead"] : ["percussion", "acid", "lead"]) as SonCible[],
      styles: (n === 19 ? ["tekno", "tribe", "mentale"] : n === 18 ? ["mentale", "tribe"] : ["tekno", "tribe"]) as Style[],
      texte: n === 19 ? "Le délai le plus « tekno » : l'écho tombe à côté du temps et crée un rythme qui roule tout seul."
        : n === 18 ? "Un écho lent qui laisse de l'espace : bien pour une nappe ou un lead posé."
        : n === 20 ? "Un écho serré qui double le rythme : il remplit les trous entre les notes."
        : "Un écho très court qui fait trembler et rouler les percussions.",
      assoc: n === 19 ? ["Stab ou lead + Delay 3/16 + Room Reverb.", "Percussion tribe + Delay 3/16 : des roulements syncopés."]
        : n === 18 ? ["Nappe + Delay 1/4 + Hall Reverb.", "Lead mentale + Delay 1/4 + Motion Seq sur Edit."]
        : n === 20 ? ["Acid + Delay 1/8 : la ligne paraît deux fois plus chargée."]
        : ["Charleston + Delay 1/16 : un roulement continu.", "Percussion + Delay 1/16 en Motion Seq avant un break."],
    },
    ecoute: ["Combien de répétitions entends-tu avec Edit au maximum ?", "Change le BPM : l'écho suit-il le tempo ?"],
  })),
  {
    n: 22, nom: "Roller 1/32", famille: "delai",
    quoi: "Répète le son très vite, en triples-croches (1/32), pour créer un roulement mécanique, comme un roulement de caisse claire.",
    schema: { type: "echo", echos: [1, 2, 3, 4, 5, 6, 7].map((k): [number, number] => [k * 0.07, Math.pow(0.85, k)]) },
    edit: ED("Quantité ou durée du roulement (à vérifier).", 70),
    usage: {
      sons: ["percussion", "kick"], styles: ["tekno", "tribe"],
      texte: "L'effet de relance par excellence : on l'allume à la fin d'une phrase, avant le drop.",
      assoc: ["Clap ou snare + Roller 1/32 allumé en mesure 4 (Motion Seq sur IFX On).", "Kick + Roller 1/32 pendant une montée."],
    },
    ecoute: ["Le roulement suit-il le tempo ?", "Avec IFX On en Motion Seq, peux-tu ne l'allumer qu'en mesure 4 ?"],
  },
  {
    n: 23, nom: "One Delay", famille: "delai",
    quoi: "Une seule répétition, sans retour : le son est doublé une fois, plus tard.",
    schema: { type: "echo", echos: [[0.35, 0.7]] },
    edit: ED("Temps entre le son et sa répétition (à vérifier).", 50),
    usage: {
      sons: ["percussion", "lead"], styles: ["tribe", "tekno"],
      texte: "Pour doubler un coup de percussion sans brouiller le rythme.",
      assoc: ["Conga ou tom tribe + One Delay : un « ta-ta » qui groove."],
    },
    ecoute: ["Combien de répétitions entends-tu ?", "Edit change-t-il le temps ou le volume de la répétition ?"],
  },
  {
    n: 24, nom: "Short Delay", famille: "delai",
    quoi: "Un écho très court, presque collé au son : il l'épaissit et le rend plus large, comme un doublage.",
    schema: { type: "echo", echos: [[0.06, 0.8], [0.12, 0.5], [0.18, 0.3]] },
    edit: ED("Temps du doublage : très court = son plus épais, plus long = écho audible (à vérifier).", 30),
    usage: {
      sons: ["lead", "percussion", "basse"], styles: ["tekno", "mentale"],
      texte: "Pour épaissir un lead ou donner un côté métallique à une percussion.",
      assoc: ["Lead + Short Delay + Overdrive.", "Clap + Short Delay : un clap plus large."],
    },
    ecoute: ["À partir de quelle valeur d'Edit entends-tu deux sons séparés au lieu d'un son épais ?"],
  },
  {
    n: 25, nom: "Ring Delay 1", famille: "delai",
    quoi: "Un écho dont les répétitions passent dans un modulateur en anneau : chaque écho devient plus métallique et étrange.",
    schema: { type: "echo", echos: [[0.25, 0.7], [0.5, 0.5], [0.75, 0.35]] },
    edit: ED("Couleur métallique des échos ou quantité d'écho (à vérifier).", 50),
    usage: {
      sons: ["lead", "percussion"], styles: ["mentale"],
      texte: "Pour des échos de science-fiction typiques de la mentale.",
      assoc: ["Lead mentale + Ring Delay 1 + Hall Reverb."],
    },
    ecoute: ["Les échos ont-ils la même note que le son d'origine ?", "Compare avec Ring Delay 2."],
  },
  {
    n: 26, nom: "Ring Delay 2", famille: "delai",
    quoi: "Une variante de Ring Delay : échos métalliques avec un autre temps ou une autre couleur.",
    schema: { type: "echo", echos: [[0.12, 0.7], [0.24, 0.55], [0.36, 0.4], [0.48, 0.3]] },
    edit: ED("Couleur métallique des échos ou quantité d'écho (à vérifier).", 50),
    usage: {
      sons: ["lead", "percussion"], styles: ["mentale"],
      texte: "Même usage que Ring Delay 1 ; garde celui qui sonne le mieux sur ton son.",
      assoc: ["Percussion + Ring Delay 2 : des cloches qui rebondissent."],
    },
    ecoute: ["Qu'est-ce qui change par rapport à Ring Delay 1 : le temps, la couleur, les deux ?"],
  },
  // ---------- Chorus, flanger, phaser ----------
  {
    n: 27, nom: "Chorus", famille: "modulation",
    quoi: "Double le son avec une copie très légèrement désaccordée qui bouge : le son devient plus large et plus doux, comme plusieurs instruments ensemble.",
    schema: { type: "onde", f: (s) => s.map((v, i) => 0.6 * v + 0.4 * Math.sin((i / 128) * 4 * Math.PI * 1.06 + 0.5)) },
    edit: ED("Profondeur ou vitesse du chorus (à vérifier).", 60),
    usage: {
      sons: ["nappe", "lead", "basse"], styles: ["mentale", "tribe"],
      texte: "Pour élargir une nappe ou un lead. Sur une basse, à doser : le grave peut perdre de son poids.",
      assoc: ["Nappe + Chorus + Hall Reverb.", "Basse reese + Chorus léger."],
    },
    ecoute: ["Le son paraît-il plus large ?", "Edit change-t-il la vitesse ou la profondeur ?"],
  },
  {
    n: 28, nom: "Flanger LFO", famille: "modulation",
    quoi: "Un effet de « réacteur d'avion » : un balayage métallique qui monte et descend tout seul, régulièrement.",
    schema: { type: "spectre", f: (x) => 8 * Math.cos(x * 40) - 2 },
    edit: ED("Vitesse ou profondeur du balayage (à vérifier).", 50),
    usage: {
      sons: ["percussion", "nappe", "lead"], styles: ["tekno", "mentale"],
      texte: "Sur des charlestons ou un shaker, le flanger donne du mouvement à une boucle qui tourne longtemps.",
      assoc: ["Charlestons + Flanger LFO : une boucle qui respire.", "Nappe + Flanger LFO + Delay 1/4."],
    },
    ecoute: ["Combien de temps dure un balayage complet ?", "Edit change-t-il cette durée ?"],
  },
  {
    n: 29, nom: "Flanger +", famille: "modulation",
    quoi: "Un flanger que tu pilotes à la main avec Edit, sans balayage automatique ; « + » donne une couleur plus creuse et résonante.",
    schema: { type: "spectre", f: (x) => 9 * Math.cos(x * 30) },
    edit: ED("Position du flanger : tourne pendant la lecture pour balayer (à vérifier).", 64),
    usage: {
      sons: ["percussion", "lead"], styles: ["tekno"],
      texte: "Parfait pour un balayage enregistré en Motion Seq, à ton rythme.",
      assoc: ["Percussions + Flanger + + Motion Seq sur Edit sur 4 mesures."],
    },
    ecoute: ["Le son bouge-t-il tout seul si tu ne touches pas Edit ?", "Compare + et − à la même valeur d'Edit."],
  },
  {
    n: 30, nom: "Flanger -", famille: "modulation",
    quoi: "Comme Flanger +, piloté par Edit, mais avec la couleur inverse : plus creuse dans le grave, plus « tube ».",
    schema: { type: "spectre", f: (x) => -9 * Math.cos(x * 30) },
    edit: ED("Position du flanger : tourne pendant la lecture pour balayer (à vérifier).", 64),
    usage: {
      sons: ["percussion", "lead", "nappe"], styles: ["tekno", "mentale"],
      texte: "Même usage que Flanger + ; choisis celui qui sonne le mieux sur ton son.",
      assoc: ["Nappe + Flanger - + Motion Seq sur Edit."],
    },
    ecoute: ["Quelle différence entends-tu avec Flanger + ?"],
  },
  {
    n: 31, nom: "Phaser LFO 1", famille: "modulation",
    quoi: "Le phaser creuse quelques « trous » dans le spectre et les fait tourner : un son qui ondule doucement, plus discret que le flanger.",
    schema: { type: "spectre", f: (x) => -14 * Math.pow(Math.sin(x * 9), 8) },
    edit: ED("Vitesse ou profondeur de l'ondulation (à vérifier).", 50),
    usage: {
      sons: ["nappe", "lead", "acid"], styles: ["mentale", "tribe"],
      texte: "Pour faire vivre une nappe ou un lead qui joue longtemps.",
      assoc: ["Nappe + Phaser LFO 1 + Hall Reverb.", "Acid + Phaser LFO 1 léger."],
    },
    ecoute: ["L'ondulation est-elle lente ou rapide ?", "Compare avec Phaser LFO 2."],
  },
  {
    n: 32, nom: "Phaser LFO 2", famille: "modulation",
    quoi: "Une autre version du phaser automatique, plus marquée ou plus rapide que Phaser LFO 1 (à comparer).",
    schema: { type: "spectre", f: (x) => -18 * Math.pow(Math.sin(x * 12), 6) + 3 },
    edit: ED("Vitesse ou profondeur de l'ondulation (à vérifier).", 50),
    usage: {
      sons: ["lead", "acid", "percussion"], styles: ["mentale", "tekno"],
      texte: "Quand Phaser LFO 1 est trop discret.",
      assoc: ["Lead + Phaser LFO 2 + Delay 3/16."],
    },
    ecoute: ["Qu'est-ce qui change par rapport à Phaser LFO 1 ?"],
  },
  {
    n: 33, nom: "Phaser Manual", famille: "modulation",
    quoi: "Un phaser que tu déplaces toi-même avec Edit, sans mouvement automatique.",
    schema: { type: "spectre", f: (x) => -16 * Math.pow(Math.sin(x * 9 + 1), 8) },
    edit: ED("Position du phaser : tourne pendant la lecture (à vérifier).", 64),
    usage: {
      sons: ["acid", "lead", "nappe"], styles: ["tekno", "mentale"],
      texte: "Pour un mouvement précis, enregistré en Motion Seq.",
      assoc: ["Acid + Phaser Manual + Motion Seq sur Edit.", "Nappe + Phaser Manual + LFOTri IFX (modulation 30)."],
    },
    ecoute: ["Le son bouge-t-il seul si tu ne touches pas Edit ?"],
  },
  // ---------- Volume rythmique ----------
  {
    n: 34, nom: "Tremolo", famille: "rythme",
    quoi: "Fait monter et descendre le volume régulièrement : le son « tremble ».",
    schema: { type: "volume", f: (t) => 0.55 + 0.45 * Math.sin(t * 2 * Math.PI * 8) },
    edit: ED("Vitesse ou profondeur du tremblement (à vérifier).", 64),
    usage: {
      sons: ["nappe", "lead"], styles: ["mentale", "tribe"],
      texte: "Pour faire pulser une nappe ou un drone sans toucher au séquenceur.",
      assoc: ["Drone + Tremolo + Hall Reverb.", "Nappe + Tremolo rapide pendant un break."],
    },
    ecoute: ["Le tremblement suit-il le tempo ? Change le BPM pour vérifier."],
  },
  {
    n: 35, nom: "Off Beater", famille: "rythme",
    quoi: "Baisse le volume sur les temps et le laisse remonter entre les temps : la partie sonne « à contretemps », en laissant la place au kick.",
    schema: { type: "volume", f: (t) => { const ph = (t * 4) % 1; return ph < 0.5 ? ph * 2 : 1; } },
    edit: ED("Profondeur du creux sur chaque temps ou vitesse de remontée (à vérifier).", 70),
    usage: {
      sons: ["basse", "nappe"], styles: ["tekno", "tribe"],
      texte: "La basse « hors du kick » sans rien reprogrammer : une basse tenue devient une basse à contretemps.",
      assoc: ["Basse tenue (Gate TIE) + Off Beater : basse à contretemps.", "Nappe + Off Beater : pompe au tempo."],
    },
    ecoute: ["Le volume se creuse-t-il exactement sur les temps du kick ?"],
  },
  {
    n: 36, nom: "Pumper", famille: "rythme",
    quoi: "Imite le « pompage » d'un compresseur déclenché par le kick : à chaque temps le volume plonge puis remonte doucement.",
    schema: { type: "volume", f: (t) => { const ph = (t * 4) % 1; return 1 - 0.85 * Math.exp(-ph * 5); } },
    edit: ED("Profondeur du pompage (à vérifier).", 70),
    usage: {
      sons: ["basse", "nappe", "lead"], styles: ["tekno", "tribe"],
      texte: "Pour que tout respire avec le kick, comme un sidechain.",
      assoc: ["Nappe + Pumper : effet sidechain.", "Basse reese + Pumper."],
    },
    ecoute: ["Le pompage suit-il le tempo ?", "Compare avec Off Beater : la remontée est-elle plus lente ?"],
  },
  {
    n: 37, nom: "Repeater", famille: "rythme",
    quoi: "Répète un petit bout du son plusieurs fois de suite, comme un bégaiement rythmique (stutter).",
    schema: { type: "volume", f: (t) => ((t * 32) % 1) < 0.6 ? 1 : 0.15 },
    edit: ED("Taille ou nombre des répétitions (à vérifier).", 64),
    usage: {
      sons: ["percussion", "lead", "acid"], styles: ["tekno", "mentale"],
      texte: "Pour des relances qui bégaient en fin de phrase.",
      assoc: ["Lead + Repeater + Motion Seq sur IFX On en mesure 4.", "Percussion + Repeater + Roller 1/32 sur une autre partie."],
    },
    ecoute: ["Edit change-t-il la taille des morceaux répétés ?", "Les répétitions sont-elles calées sur le tempo ?"],
  },
  {
    n: 38, nom: "Slicer", famille: "rythme",
    quoi: "Découpe le son en tranches régulières : un son tenu devient haché, en rythme.",
    schema: { type: "volume", f: (t) => ((t * 8) % 1) < 0.5 ? 1 : 0 },
    edit: ED("Finesse du découpage (taille des tranches) (à vérifier).", 64),
    usage: {
      sons: ["nappe", "basse", "lead"], styles: ["tekno", "tribe", "mentale"],
      texte: "Transforme une nappe tenue en motif rythmique, ou une basse longue en basse hachée.",
      assoc: ["Nappe tenue + Slicer : un pattern de stabs.", "Basse sub tenue + Slicer : basse hachée."],
    },
    ecoute: ["Le découpage suit-il le tempo ?", "Combien de tailles de tranches différentes trouves-tu en tournant Edit ?"],
  },
];

// =====================================================================================
// MASTER FX (32) — Guide p. 16
// =====================================================================================
const MFX: Omit<FicheFx, "id" | "kind">[] = [
  // ---------- Délais ----------
  {
    n: 1, nom: "Mod Delay", famille: "delai",
    quoi: "Un écho dont le temps bouge légèrement en continu : les répétitions ondulent et se désaccordent un peu, comme un chorus mêlé à un délai.",
    schema: { type: "echo", echos: [[0.22, 0.7], [0.45, 0.5], [0.66, 0.35], [0.9, 0.22]] },
    x: ED("Temps de l'écho (court à gauche, long à droite) (à vérifier).", 64), y: ED("Retour : nombre de répétitions, ou quantité d'effet (à vérifier).", 64),
    usage: { sons: ["lead", "nappe", "percussion"], styles: ["mentale", "tribe"], texte: "Pour des échos vivants qui flottent derrière un lead ou des percussions.", assoc: ["Lead mentale en MFX Send + Mod Delay, doigt qui glisse sur X pendant un break."] },
    ecoute: ["Glisse le doigt de gauche à droite : le temps de l'écho change-t-il ?", "Que fait l'axe Y : plus de répétitions, ou plus de volume d'écho ?"],
  },
  {
    n: 2, nom: "Tape Delay", famille: "delai",
    quoi: "Un écho qui imite une bande magnétique : chaque répétition est un peu plus sourde et légèrement instable, chaude.",
    schema: { type: "echo", echos: [[0.25, 0.75], [0.5, 0.55], [0.75, 0.38], [1, 0.25]] },
    x: ED("Temps de l'écho (à vérifier).", 64), y: ED("Retour : avec Y haut, les échos peuvent s'emballer (à vérifier).", 64),
    usage: { sons: ["percussion", "lead", "acid"], styles: ["tekno", "tribe", "mentale"], texte: "Le délai le plus polyvalent en live : on monte Y en fin de phrase pour faire partir les échos.", assoc: ["Clap + Tape Delay avec MFX Hold pendant un break.", "Acid + Tape Delay : la ligne laisse une traîne."] },
    ecoute: ["Les échos deviennent-ils plus sourds au fil des répétitions ?", "Avec Y tout en haut, l'écho s'emballe-t-il ?"],
  },
  {
    n: 3, nom: "High Pass Delay", famille: "delai",
    quoi: "Un écho dont les répétitions perdent leur grave : l'écho reste clair et ne brouille pas le kick ni la basse.",
    schema: { type: "echo", echos: [[0.25, 0.6], [0.5, 0.45], [0.75, 0.3]] },
    x: ED("Temps de l'écho (à vérifier).", 64), y: ED("Retour ou quantité d'écho (à vérifier).", 64),
    usage: { sons: ["basse", "percussion", "lead"], styles: ["tekno", "tribe"], texte: "Le bon délai quand des parties graves sont envoyées : les échos ne salissent pas le bas du mix.", assoc: ["Basse + percussions en MFX Send + High Pass Delay en fin de phrase."] },
    ecoute: ["Compare avec Tape Delay : les échos ont-ils moins de grave ?"],
  },
  // ---------- Réverbes ----------
  {
    n: 4, nom: "Hall Reverb", famille: "reverbe",
    quoi: "Une grande salle : le son est suivi d'une longue queue qui s'éteint lentement.",
    schema: { type: "echo", echos: Array.from({ length: 14 }, (_, k): [number, number] => [0.05 + k * 0.065, 0.6 * Math.exp(-k * 0.2)]) },
    x: ED("Taille ou longueur de la salle (à vérifier).", 64), y: ED("Quantité de réverbe (à vérifier).", 64),
    usage: { sons: ["nappe", "lead", "percussion"], styles: ["mentale", "tribe"], texte: "Pour des nappes immenses en mentale ou un break qui s'ouvre. Évite d'y envoyer le kick.", assoc: ["Nappe + Hall Reverb + MFX Hold.", "Clap seul en MFX Send + Hall Reverb pour un break."] },
    ecoute: ["Combien de temps dure la queue avec X au maximum ?", "Y change-t-il la quantité ou la longueur ?"],
  },
  {
    n: 5, nom: "Room Reverb", famille: "reverbe",
    quoi: "Une petite pièce : une réverbe courte qui donne de l'espace sans noyer le son.",
    schema: { type: "echo", echos: Array.from({ length: 7 }, (_, k): [number, number] => [0.04 + k * 0.045, 0.55 * Math.exp(-k * 0.45)]) },
    x: ED("Taille de la pièce (à vérifier).", 64), y: ED("Quantité de réverbe (à vérifier).", 64),
    usage: { sons: ["percussion", "lead"], styles: ["tribe", "tekno"], texte: "Pour mettre claps, congas et toms dans la même pièce : le groove reste net.", assoc: ["Clap + percussions tribe en MFX Send + Room Reverb."] },
    ecoute: ["Compare avec Hall Reverb à la même position du doigt."],
  },
  {
    n: 6, nom: "Wet Reverb", famille: "reverbe",
    quoi: "Une réverbe très « mouillée » : beaucoup d'effet et peu de son direct, le son part au loin.",
    schema: { type: "echo", echos: Array.from({ length: 12 }, (_, k): [number, number] => [0.03 + k * 0.08, 0.85 * Math.exp(-k * 0.15)]) },
    x: ED("Taille ou longueur (à vérifier).", 64), y: ED("Quantité d'effet (à vérifier).", 80),
    usage: { sons: ["nappe", "lead"], styles: ["mentale"], texte: "Pour faire disparaître un son dans l'espace, en fin de break ou en transition.", assoc: ["Lead + Wet Reverb avec Y qui monte, puis MFX Send coupé au drop."] },
    ecoute: ["Le son direct baisse-t-il quand l'effet monte ?"],
  },
  // ---------- Boucles et glitch ----------
  {
    n: 7, nom: "Looper", famille: "boucle",
    quoi: "Capture un petit morceau du son au moment où tu touches le pad et le rejoue en boucle tant que tu restes appuyé.",
    schema: { type: "pas", f: (i) => i % 4 },
    x: ED("Longueur du morceau bouclé (long à gauche, court à droite ?) (à vérifier).", 64), y: ED("Rôle à découvrir (volume, mélange…) (à vérifier).", 64),
    usage: { sons: ["percussion", "acid", "lead"], styles: ["tekno", "tribe"], texte: "L'effet de live par excellence : on fige un temps et on le répète pour une relance.", assoc: ["Toutes les parties en MFX Send + Looper en mesure 4, X qui raccourcit la boucle."] },
    ecoute: ["La boucle démarre-t-elle quand tu poses le doigt ?", "Glisse sur X : la boucle raccourcit-elle ?"],
  },
  {
    n: 8, nom: "Pitch Looper", famille: "boucle",
    quoi: "Comme le Looper, mais la boucle change de hauteur : elle monte ou descend pendant qu'elle se répète.",
    schema: { type: "pas", f: (i) => i % 4 },
    x: ED("Longueur de la boucle (à vérifier).", 64), y: ED("Hauteur de la boucle : vers le haut ou vers le bas (à vérifier).", 80),
    usage: { sons: ["percussion", "lead", "acid"], styles: ["tekno", "mentale"], texte: "Pour des montées qui grimpent avant le drop.", assoc: ["Motif complet en MFX Send + Pitch Looper, Y qui monte sur la dernière mesure."] },
    ecoute: ["Y fait-il monter ou descendre la boucle ?"],
  },
  {
    n: 9, nom: "Step Shifter", famille: "boucle",
    quoi: "Rejoue des morceaux du son dans un autre ordre, par petits pas : le rythme est « mélangé ».",
    schema: { type: "pas", f: (i) => (i + 4) % 16 },
    x: ED("Taille des pas déplacés (à vérifier).", 64), y: ED("Rôle à découvrir (à vérifier).", 64),
    usage: { sons: ["percussion", "acid"], styles: ["tekno", "mentale"], texte: "Pour casser le rythme quelques temps et surprendre.", assoc: ["Percussions + Step Shifter juste avant un break."] },
    ecoute: ["Le motif garde-t-il le tempo ?", "X change-t-il la taille des morceaux ?"],
  },
  {
    n: 10, nom: "Slicer", famille: "rythme",
    quoi: "Découpe tout ce qui est envoyé en tranches régulières, pilotées par le pad.",
    schema: { type: "volume", f: (t) => ((t * 8) % 1) < 0.5 ? 1 : 0 },
    x: ED("Finesse du découpage (à vérifier).", 64), y: ED("Longueur des tranches ou profondeur (à vérifier).", 64),
    usage: { sons: ["nappe", "basse", "lead"], styles: ["tekno", "tribe"], texte: "Pour hacher tout le mix pendant un break.", assoc: ["Nappe + basse en MFX Send + Slicer, X qui accélère."] },
    ecoute: ["Compare avec le Slicer de l'Insert FX (Insert Fx n° 38)."],
  },
  {
    n: 12, nom: "Grain Shifter", famille: "boucle",
    quoi: "Répète de tout petits grains de son très vite : le son se fige et devient granuleux, presque une note continue.",
    schema: { type: "pas", f: (i) => i - (i % 2) },
    x: ED("Taille des grains (à vérifier).", 64), y: ED("Vitesse ou hauteur des grains (à vérifier).", 64),
    usage: { sons: ["lead", "acid", "nappe"], styles: ["mentale"], texte: "Pour des textures bizarres et des glitchs en mentale.", assoc: ["Lead + Grain Shifter, doigt qui tremble sur le pad."] },
    ecoute: ["À quelle position du doigt le son devient-il une note continue ?"],
  },
  {
    n: 13, nom: "Vinyl Break", famille: "boucle",
    quoi: "Imite un disque qu'on arrête à la main : le son ralentit et descend jusqu'à s'arrêter.",
    schema: { type: "pas", f: (i) => (i > 11 ? null : i) },
    x: ED("Vitesse du freinage (à vérifier).", 64), y: ED("Rôle à découvrir (à vérifier).", 64),
    usage: { sons: ["kick", "basse", "lead"], styles: ["tekno", "tribe"], texte: "Pour un arrêt net avant un drop ou en fin de morceau.", assoc: ["Tout le motif en MFX Send + Vinyl Break sur le dernier temps."] },
    ecoute: ["Le son repart-il quand tu lèves le doigt ?"],
  },
  // ---------- Jeu sur le séquenceur ----------
  {
    n: 14, nom: "Seq Reverse", famille: "sequence",
    quoi: "Fait lire le séquenceur à l'envers : les pas sont joués du dernier au premier (interprétation d'après le nom).",
    schema: { type: "pas", f: (i) => 15 - i },
    x: ED("Rôle à découvrir (à vérifier).", 64), y: ED("Rôle à découvrir (à vérifier).", 64),
    usage: { sons: ["acid", "lead", "percussion"], styles: ["tekno", "mentale"], texte: "Pour une variation instantanée d'une ligne : le motif est le même, à l'envers.", assoc: ["Acid en MFX Send + Seq Reverse une mesure sur quatre."] },
    ecoute: ["Les pas sont-ils joués à l'envers, ou le son lui-même est-il inversé ?", "Les parties sans MFX Send sont-elles touchées ?"],
  },
  {
    n: 15, nom: "Seq Doubler", famille: "sequence",
    quoi: "Fait lire le séquenceur deux fois plus vite : le motif se répète en doubles (interprétation d'après le nom).",
    schema: { type: "pas", f: (i) => (i * 2) % 16 },
    x: ED("Rôle à découvrir (à vérifier).", 64), y: ED("Rôle à découvrir (à vérifier).", 64),
    usage: { sons: ["percussion", "acid"], styles: ["tekno"], texte: "Pour une montée qui s'accélère d'un coup.", assoc: ["Percussions en MFX Send + Seq Doubler sur la mesure 4."] },
    ecoute: ["Le motif est-il joué deux fois plus vite ?"],
  },
  {
    n: 16, nom: "Odd Stepper", famille: "sequence",
    quoi: "Ne joue que les pas impairs (1, 3, 5…) et les répète : le rythme se simplifie (interprétation d'après le nom).",
    schema: { type: "pas", f: (i) => i - (i % 2) },
    x: ED("Rôle à découvrir (à vérifier).", 64), y: ED("Rôle à découvrir (à vérifier).", 64),
    usage: { sons: ["percussion", "acid"], styles: ["tekno", "tribe"], texte: "Pour changer le groove d'une ligne sans la reprogrammer.", assoc: ["Ligne de percussions en MFX Send + Odd Stepper puis Even Stepper."] },
    ecoute: ["Quels pas entends-tu encore ?"],
  },
  {
    n: 17, nom: "Even Stepper", famille: "sequence",
    quoi: "Ne joue que les pas pairs (2, 4, 6…) : le motif glisse à contretemps (interprétation d'après le nom).",
    schema: { type: "pas", f: (i) => i - (i % 2) + 1 },
    x: ED("Rôle à découvrir (à vérifier).", 64), y: ED("Rôle à découvrir (à vérifier).", 64),
    usage: { sons: ["percussion", "acid"], styles: ["tekno", "tribe"], texte: "Pour faire passer une ligne à contretemps.", assoc: ["Acid en MFX Send + Even Stepper pendant 2 mesures."] },
    ecoute: ["Compare avec Odd Stepper sur le même motif."],
  },
  // ---------- Filtres ----------
  {
    n: 11, nom: "Jag Filter", famille: "filtre",
    quoi: "Un filtre qui saute brusquement d'une position à l'autre, par paliers, comme un filtre piloté au hasard en rythme.",
    schema: { type: "volume", f: (t) => [0.3, 0.9, 0.5, 0.2, 0.8, 0.4, 1, 0.6][Math.floor(t * 8) % 8] },
    x: ED("Vitesse des sauts (à vérifier).", 64), y: ED("Amplitude des sauts ou résonance (à vérifier).", 64),
    usage: { sons: ["acid", "lead", "percussion"], styles: ["mentale", "tekno"], texte: "Pour des mélodies de filtre aléatoires, très mentale.", assoc: ["Lead + Jag Filter avec MFX Hold."] },
    ecoute: ["Les sauts suivent-ils le tempo ?"],
  },
  {
    n: 18, nom: "Low Pass Filter", famille: "filtre",
    quoi: "Un passe-bas sur tout ce qui est envoyé : le mix devient sourd quand le doigt descend.",
    schema: { type: "spectre", f: (x) => (x < 0.45 ? 4 * Math.exp(-Math.pow((x - 0.45) / 0.05, 2)) : -(x - 0.45) * 60) },
    x: ED("Fréquence de coupure (à vérifier).", 80), y: ED("Résonance (à vérifier).", 40),
    usage: { sons: ["basse", "acid", "nappe", "percussion"], styles: ["tekno", "tribe", "mentale"], texte: "La sortie de break classique : tout est étouffé puis s'ouvre d'un coup.", assoc: ["Toutes les parties sauf le kick en MFX Send + Low Pass Filter qui s'ouvre sur 4 mesures."] },
    ecoute: ["Quel axe ouvre le filtre, lequel le fait siffler ?"],
  },
  {
    n: 19, nom: "High Pass Filter", famille: "filtre",
    quoi: "Un passe-haut sur tout ce qui est envoyé : le grave disparaît quand le doigt monte. L'outil des montées.",
    schema: { type: "spectre", f: (x) => (x > 0.45 ? 0 : -(0.45 - x) * 60) },
    x: ED("Fréquence de coupure (à vérifier).", 30), y: ED("Résonance (à vérifier).", 40),
    usage: { sons: ["kick", "basse", "nappe"], styles: ["tekno", "tribe", "mentale"], texte: "La montée la plus utilisée : on vide le grave puis on lâche au drop.", assoc: ["Kick + basse en MFX Send + High Pass Filter en Motion Seq sur la mesure 4."] },
    ecoute: ["À quelle position du doigt le kick disparaît-il ?"],
  },
  {
    n: 20, nom: "Band Plus Filter", famille: "filtre",
    quoi: "Fait ressortir une bande de fréquences sur tout ce qui est envoyé : le doigt la déplace comme un wah.",
    schema: { type: "spectre", f: (x) => 12 * Math.exp(-Math.pow((x - 0.5) / 0.06, 2)) },
    x: ED("Position de la bande (à vérifier).", 64), y: ED("Largeur ou résonance (à vérifier).", 64),
    usage: { sons: ["acid", "percussion", "lead"], styles: ["tekno", "mentale"], texte: "Pour un wah à la main sur tout le groove.", assoc: ["Percussions + acid en MFX Send + Band Plus Filter."] },
    ecoute: ["Le grave reste-t-il présent ?"],
  },
  {
    n: 21, nom: "Touch Wah", famille: "filtre",
    quoi: "Un wah qui réagit au volume du son et à ton doigt : chaque note fait « ouah ».",
    schema: { type: "spectre", f: (x) => 12 * Math.exp(-Math.pow((x - 0.4) / 0.08, 2)) - 3 },
    x: ED("Position ou sensibilité du wah (à vérifier).", 64), y: ED("Résonance ou profondeur (à vérifier).", 64),
    usage: { sons: ["acid", "basse", "lead"], styles: ["tekno", "mentale"], texte: "Pour donner un côté funky ou « parlant » à une basse.", assoc: ["Basse saw + Touch Wah + Overdrive (IFX)."] },
    ecoute: ["Le wah suit-il chaque note ?"],
  },
  // ---------- Égaliseur, distorsions, dynamique ----------
  {
    n: 22, nom: "Tube EQ", famille: "eq",
    quoi: "Un égaliseur à lampe : il colore et réchauffe tout ce qui est envoyé, avec un peu de saturation douce.",
    schema: { type: "spectre", f: (x) => 6 * Math.exp(-Math.pow((x - 0.15) / 0.12, 2)) + 5 * Math.exp(-Math.pow((x - 0.85) / 0.12, 2)) },
    x: ED("Grave (à vérifier).", 64), y: ED("Aigu (à vérifier).", 64),
    usage: { sons: ["basse", "nappe", "percussion"], styles: ["tribe", "mentale"], texte: "Pour réchauffer tout le groove, à garder allumé avec MFX Hold.", assoc: ["Toutes les parties en MFX Send + Tube EQ + MFX Hold."] },
    ecoute: ["Quel axe touche le grave, lequel l'aigu ?"],
  },
  {
    n: 23, nom: "Decimator", famille: "distorsion",
    quoi: "Abîme tout ce qui est envoyé en baissant la qualité : grain métallique de vieux sampler.",
    schema: { type: "onde", f: hold(12) },
    x: ED("Réduction de qualité (à vérifier).", 64), y: ED("Mélange ou volume (à vérifier).", 64),
    usage: { sons: ["percussion", "lead", "nappe"], styles: ["mentale", "tekno"], texte: "Pour salir tout le groove pendant quelques temps.", assoc: ["Percussions en MFX Send + Decimator sur une mesure."] },
    ecoute: ["Compare avec le Decimator de l'Insert FX."],
  },
  {
    n: 24, nom: "Distortion", famille: "distorsion",
    quoi: "Une distorsion sur tout ce qui est envoyé : le groove devient agressif.",
    schema: { type: "onde", f: clip(0.45) },
    x: ED("Gain de distorsion (à vérifier).", 64), y: ED("Couleur ou volume (à vérifier).", 64),
    usage: { sons: ["acid", "percussion", "basse"], styles: ["tekno", "mentale"], texte: "Pour un passage plus dur, en tenant le doigt.", assoc: ["Acid + percussions en MFX Send + Distortion sur un break."] },
    ecoute: ["Le volume monte-t-il beaucoup ? Prévois de baisser Master Volume."],
  },
  {
    n: 25, nom: "Compressor", famille: "dynamique",
    quoi: "Resserre le volume de tout ce qui est envoyé : le groove devient plus dense et plus collé.",
    schema: { type: "onde", f: sat(1.8) },
    x: ED("Force de la compression (à vérifier).", 64), y: ED("Volume de sortie ou attaque (à vérifier).", 64),
    usage: { sons: ["percussion", "basse"], styles: ["tekno", "tribe"], texte: "Pour coller ensemble les percussions et la basse.", assoc: ["Percussions + basse en MFX Send + Compressor + MFX Hold."] },
    ecoute: ["Les percussions paraissent-elles plus fortes et plus collées ?"],
  },
  {
    n: 26, nom: "Limiter", famille: "dynamique",
    quoi: "Empêche le mix envoyé de dépasser un niveau : plus fort et plus écrasé.",
    schema: { type: "onde", f: (s) => s.map((v) => Math.max(-0.7, Math.min(0.7, v * 1.3)) / 0.7) },
    x: ED("Force de la limitation (à vérifier).", 64), y: ED("Volume de sortie (à vérifier).", 64),
    usage: { sons: ["kick", "basse", "percussion"], styles: ["tekno"], texte: "Pour un mur de son qui tape sans pics.", assoc: ["Tout en MFX Send + Limiter + MFX Hold."] },
    ecoute: ["Les attaques s'aplatissent-elles ?"],
  },
  // ---------- Chorus, flanger, phaser, auto pan ----------
  {
    n: 27, nom: "Chorus", famille: "modulation",
    quoi: "Élargit et adoucit tout ce qui est envoyé, comme plusieurs instruments ensemble.",
    schema: { type: "onde", f: (s) => s.map((v, i) => 0.6 * v + 0.4 * Math.sin((i / 128) * 4 * Math.PI * 1.06 + 0.5)) },
    x: ED("Vitesse ou profondeur (à vérifier).", 64), y: ED("Quantité d'effet (à vérifier).", 64),
    usage: { sons: ["nappe", "lead"], styles: ["mentale", "tribe"], texte: "Pour élargir des nappes et des leads ensemble.", assoc: ["Nappe + lead en MFX Send + Chorus + MFX Hold."] },
    ecoute: ["Le son paraît-il plus large ?"],
  },
  {
    n: 28, nom: "XY Flanger", famille: "modulation",
    quoi: "Un flanger piloté au doigt : le balayage suit ta main sur le pad.",
    schema: { type: "spectre", f: (x) => 9 * Math.cos(x * 30) },
    x: ED("Position du balayage (à vérifier).", 64), y: ED("Retour : effet plus métallique en haut (à vérifier).", 64),
    usage: { sons: ["percussion", "nappe"], styles: ["tekno", "mentale"], texte: "Pour un balayage de réacteur sur tout le groove, à la main.", assoc: ["Charlestons + nappe en MFX Send + XY Flanger, doigt qui glisse sur X."] },
    ecoute: ["Glisse sur X lentement : entends-tu le balayage ?"],
  },
  {
    n: 29, nom: "LFO Flanger", famille: "modulation",
    quoi: "Un flanger qui balaie tout seul ; le pad règle sa vitesse et sa couleur.",
    schema: { type: "spectre", f: (x) => 8 * Math.cos(x * 40) - 2 },
    x: ED("Vitesse du balayage (à vérifier).", 64), y: ED("Profondeur ou retour (à vérifier).", 64),
    usage: { sons: ["percussion", "nappe"], styles: ["tekno", "mentale"], texte: "Pour faire respirer une longue boucle.", assoc: ["Percussions en MFX Send + LFO Flanger + MFX Hold."] },
    ecoute: ["Le balayage continue-t-il quand le doigt ne bouge pas ?"],
  },
  {
    n: 30, nom: "XY Phaser", famille: "modulation",
    quoi: "Un phaser piloté au doigt : les creux du spectre suivent ta main.",
    schema: { type: "spectre", f: (x) => -16 * Math.pow(Math.sin(x * 9 + 1), 8) },
    x: ED("Position du phaser (à vérifier).", 64), y: ED("Profondeur ou retour (à vérifier).", 64),
    usage: { sons: ["nappe", "acid"], styles: ["mentale", "tribe"], texte: "Pour faire onduler tout le mix à la main.", assoc: ["Nappe + acid en MFX Send + XY Phaser."] },
    ecoute: ["Compare avec XY Flanger : lequel est le plus doux ?"],
  },
  {
    n: 31, nom: "LFO Phaser", famille: "modulation",
    quoi: "Un phaser qui tourne tout seul ; le pad règle vitesse et couleur.",
    schema: { type: "spectre", f: (x) => -14 * Math.pow(Math.sin(x * 9), 8) },
    x: ED("Vitesse (à vérifier).", 64), y: ED("Profondeur ou retour (à vérifier).", 64),
    usage: { sons: ["nappe", "lead"], styles: ["mentale", "tribe"], texte: "Pour une ondulation douce sur les nappes.", assoc: ["Nappe en MFX Send + LFO Phaser + MFX Hold."] },
    ecoute: ["L'ondulation continue-t-elle quand le doigt ne bouge pas ?"],
  },
  {
    n: 32, nom: "Auto Pan", famille: "modulation",
    quoi: "Fait voyager le son de gauche à droite, tout seul et en boucle.",
    schema: { type: "volume", f: (t) => 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 2) },
    x: ED("Vitesse du mouvement (à vérifier).", 64), y: ED("Largeur du mouvement (à vérifier).", 64),
    usage: { sons: ["percussion", "nappe", "lead"], styles: ["tribe", "mentale"], texte: "Pour faire tourner des percussions autour de toi, très tribe au casque.", assoc: ["Shaker + congas en MFX Send + Auto Pan."] },
    ecoute: ["Écoute au casque : le son va-t-il bien de gauche à droite ?", "Le mouvement suit-il le tempo ?"],
  },
];

// =====================================================================================
// Assemblage
// =====================================================================================
type Raw = { n: number; nom: string; motionSeq?: boolean };
const eff = effectsJson as unknown as {
  ifx: { types: Raw[] }; mfx: { types: Raw[] };
  modulation: { types: { n: number; nom: string; source: string; destination: string; bpmSync: boolean; keySync: boolean }[] };
};

export const FICHES_IFX: FicheFx[] = IFX.map((f) => ({ ...f, id: `ifx-${f.n}`, kind: "ifx" }));
export const FICHES_MFX: FicheFx[] = MFX.map((f) => ({
  ...f, id: `mfx-${f.n}`, kind: "mfx",
  motionSeq: eff.mfx.types.find((t) => t.n === f.n)?.motionSeq !== false,
}));

// ---------- Modulations ----------
// Familles de source (Guide p. 14-15) et explications des destinations.
export const SOURCES_MOD: { id: ModInfo["source"]; nom: string; groupe: "Enveloppe" | "LFO" | "Hasard"; texte: string }[] = [
  { id: "EG+", nom: "EG+ (enveloppe positive)", groupe: "Enveloppe", texte: "À chaque note, une enveloppe AD monte d'un coup puis redescend : la destination fait un « coup » vers le haut au début de la note." },
  { id: "EG-", nom: "EG- (enveloppe négative)", groupe: "Enveloppe", texte: "À chaque note, une enveloppe AD inversée : la destination plonge au début de la note puis revient." },
  { id: "LFOTri", nom: "LFOTri (triangle libre)", groupe: "LFO", texte: "Un LFO en triangle monte et descend en douceur, en continu, sans suivre le tempo ni les notes." },
  { id: "LFOTriB", nom: "LFOTriB (triangle synchro)", groupe: "LFO", texte: "Le même triangle, calé sur le tempo et redémarré à chaque note." },
  { id: "SawUpB", nom: "SawUpB (dent de scie montante)", groupe: "LFO", texte: "Une rampe qui monte puis retombe d'un coup, calée sur le tempo et redémarrée à chaque note." },
  { id: "SawDwnB", nom: "SawDwnB (dent de scie descendante)", groupe: "LFO", texte: "Une rampe qui part d'en haut et descend, calée sur le tempo et redémarrée à chaque note." },
  { id: "SquUpB", nom: "SquUpB (carré, départ en haut)", groupe: "LFO", texte: "Un carré : la destination saute entre deux valeurs, en rythme, calé sur le tempo et redémarré à chaque note." },
  { id: "SquDwnB", nom: "SquDwnB (carré, départ en bas)", groupe: "LFO", texte: "Le même carré, qui commence par la valeur basse." },
  { id: "S&HBPM", nom: "S&HBPM (échantillonneur-bloqueur)", groupe: "Hasard", texte: "Une valeur au hasard, gardée jusqu'au palier suivant ; les paliers suivent le tempo." },
  { id: "Random", nom: "Random (aléatoire)", groupe: "Hasard", texte: "Une valeur qui change au hasard, sans suivre le tempo." },
];

export const DEST_MOD: { id: ModInfo["dest"]; nom: string; texte: string }[] = [
  { id: "Filter", nom: "Filter (coupure du filtre)", texte: "Ici elle fait bouger la coupure du filtre : le son s'ouvre et se ferme, il devient plus ou moins brillant." },
  { id: "Pitch", nom: "Pitch (hauteur de l'oscillateur)", texte: "Ici elle fait bouger la hauteur : la note monte et descend." },
  { id: "OSC", nom: "OSC (potard Edit de l'oscillateur)", texte: "Ici elle fait bouger le potard Edit de l'oscillateur : le timbre change, selon ce que fait Edit sur l'oscillateur choisi." },
  { id: "Level", nom: "Level (volume)", texte: "Ici elle fait bouger le volume de la partie." },
  { id: "Pan", nom: "Pan (position stéréo)", texte: "Ici elle déplace le son entre la gauche et la droite." },
  { id: "IFX", nom: "IFX (potard Edit de l'Insert Fx)", texte: "Ici elle fait bouger le potard Edit de l'Insert Fx : l'effet d'insertion de la partie varie tout seul (il faut un Insert Fx allumé)." },
];

/** Usage proposé (Pratique) selon la source et la destination. */
function usageMod(i: ModInfo): Usage {
  const eg = i.source === "EG+" || i.source === "EG-";
  const hasard = i.source === "S&HBPM" || i.source === "Random";
  const carre = i.source.startsWith("Squ"), scie = i.source.startsWith("Saw");
  switch (i.dest) {
    case "Filter":
      if (eg) return { sons: ["acid", "basse", "percussion"], styles: ["tekno", "tribe", "mentale"],
        texte: i.source === "EG+" ? "Le « wow » de chaque note : le filtre s'ouvre à l'attaque puis se referme. Une deuxième enveloppe de filtre, en plus d'EG Int." : "Le filtre se ferme à l'attaque puis s'ouvre : une attaque étouffée qui « gonfle », original sur une basse.",
        assoc: ["Acid : Acid LPF + Resonance haute + " + (i.bpm ? `${i.source} BPM Filter : chaque note dure le même temps musical.` : `${i.source} Filter, Speed court.`), `Percussion + ${i.source} Filter : une attaque plus marquée.`] };
      if (hasard) return { sons: ["acid", "lead", "percussion"], styles: ["mentale", "tekno"],
        texte: "Chaque note a une couleur de filtre différente : la ligne vit toute seule, très mentale.",
        assoc: ["Acid répétitive + " + (i.source === "S&HBPM" ? "S&HBPM Filter : un filtre qui saute en rythme." : "Random Filter : un filtre qui dérive."), "Charleston + S&HBPM Filter : chaque coup sonne différemment."] };
      return { sons: ["acid", "basse", "nappe"], styles: ["tekno", "tribe", "mentale"],
        texte: scie ? "Un filtre qui s'ouvre (ou se ferme) en rampe à chaque cycle : effet de « wobble » calé sur le tempo." : carre ? "Le filtre saute entre ouvert et fermé en rythme : une basse ou une nappe découpée en deux couleurs." : i.bpm ? "Le filtre ouvre et ferme en douceur, calé sur le tempo : une basse qui respire avec le groove." : "Le filtre ouvre et ferme en douceur, librement : une nappe ou une basse qui bouge lentement.",
        assoc: ["Basse saw + MS20 LPF + " + i.source + " Filter, Depth moyen.", "Nappe + " + i.source + " Filter lent + Hall Reverb (Master Fx)."] };
    case "Pitch":
      if (eg) return { sons: i.source === "EG+" ? ["kick", "percussion"] : ["percussion", "lead"], styles: ["tekno", "tribe"],
        texte: i.source === "EG+" ? "La note démarre plus haut et retombe vite : le « boum » d'un kick ou d'un tom électronique." : "La note démarre plus bas et remonte : un effet de « glissé » vers le haut à chaque coup.",
        assoc: i.source === "EG+" ? ["Tom ou kick sinus + EG+ Pitch, Speed court : un tom électronique tribe.", "Percussion + EG+ Pitch + Room Reverb."] : ["Lead + EG- Pitch léger : attaque qui glisse.", "Percussion + EG- Pitch : un coup qui « remonte »."] };
      if (hasard) return { sons: ["lead", "percussion"], styles: ["mentale"], texte: "Chaque note part à une hauteur au hasard : sons de robot ou d'ordinateur, très mentale.",
        assoc: ["Bip court + " + i.source + " Pitch, Depth fort : bruits de machine.", "Percussion + " + i.source + " Pitch léger : chaque coup varie un peu."] };
      return { sons: ["lead", "nappe", "basse"], styles: ["mentale", "tribe"],
        texte: carre ? "La note alterne entre deux hauteurs : un trille ou une sirène, selon Depth." : scie ? "La note glisse en rampe à chaque cycle : effet de sirène ou de laser." : "Un vibrato : la note ondule autour de sa hauteur. Léger, il rend vivant ; fort, il devient une sirène.",
        assoc: ["Lead + " + i.source + " Pitch, Depth faible : vibrato.", "Nappe + " + i.source + " Pitch lent et Depth fort : effet de sirène mentale."] };
    case "OSC":
      return { sons: ["lead", "basse", "nappe"], styles: ["mentale", "tekno", "tribe"],
        texte: (eg ? "Le timbre change au début de chaque note puis se stabilise." : hasard ? "Le timbre change au hasard : chaque note a sa couleur." : "Le timbre bouge en continu, comme une onde qui se transforme.") + " L'effet dépend de ce que fait Edit sur l'oscillateur choisi.",
        assoc: ["Oscillateur dont Edit change beaucoup le son (essaie sur la Carte) + " + i.source + " OSC.", "Nappe + " + i.source + " OSC lent + Chorus (Insert Fx)."] };
    case "Level":
      return { sons: ["nappe", "basse", "lead"], styles: ["tekno", "tribe", "mentale"],
        texte: eg ? (i.source === "EG+" ? "Un accent de volume au début de chaque note." : "La note démarre faible puis monte : effet « à l'envers ».")
          : scie ? (i.source === "SawUpB" ? "Le volume monte en rampe puis retombe : un effet de pompe, comme un sidechain." : "Le volume part fort et décroît à chaque cycle : effet de pompage ou de gate.")
          : carre ? "Le volume est coupé en rythme : une nappe tenue devient hachée." : hasard ? "Le volume change au hasard : des notes plus ou moins fortes, comme un jeu humain." : "Un trémolo : le volume monte et descend.",
        assoc: ["Nappe tenue + " + i.source + " Level.", "Basse tenue (Gate TIE) + " + i.source + " Level : basse rythmée sans reprogrammer."] };
    case "Pan":
      return { sons: ["percussion", "nappe", "lead"], styles: ["tribe", "mentale"],
        texte: eg ? "Chaque note part d'un côté puis revient au centre." : hasard ? "Chaque note sort d'un endroit différent : des percussions qui sautent partout, très efficace au casque." : "Le son voyage de gauche à droite.",
        assoc: ["Shaker ou conga + " + i.source + " Pan.", "Nappe + " + i.source + " Pan lent + Hall Reverb (Master Fx)."] };
    case "IFX":
      return { sons: ["lead", "acid", "percussion"], styles: ["tekno", "mentale"],
        texte: "L'Insert Fx de la partie bouge tout seul : par exemple une distorsion qui s'ouvre, un filtre d'IFX qui balaie ou un délai qui varie. Il faut un Insert Fx allumé (IFX On).",
        assoc: ["Talk Filter (Insert Fx n° 17) + " + i.source + " IFX : la voyelle change toute seule.", "Band Plus Filter (Insert Fx n° 16) + " + i.source + " IFX : un wah automatique."] };
  }
}

export const FICHES_MOD: FicheMod[] = eff.modulation.types.map((t) => {
  const info = parseMod(t.nom);
  return {
    id: `mod-${t.n}`, kind: "mod", n: t.n, nom: t.nom, info,
    sourceManuel: t.source,
    destManuel: t.destination,
    usage: usageMod(info),
  };
});

export const FICHES: Fiche[] = [...FICHES_IFX, ...FICHES_MFX, ...FICHES_MOD];
export const ficheById = new Map(FICHES.map((f) => [f.id, f]));

/** Pages du manuel pour la liste d'où vient la fiche. */
export const pageListe = (k: Kind): Source => (k === "mod" ? PG(14) : PG(16));

/** Gestes pour activer l'effet sur la machine (Manuel). */
export function etapes(f: Fiche): { texte: string; ref?: Source }[] {
  const nn = String(f.n).padStart(2, "0");
  if (f.kind === "ifx") return [
    { texte: "Choisis la partie : allume Trigger et appuie sur son pad, ou utilise les boutons Part < >.", ref: OM(27) },
    { texte: `Tourne le potard Insert Fx jusqu'à lire « ${f.n} ${f.nom} » à l'écran (liste p. 16).`, ref: OM(23) },
    { texte: "Appuie sur IFX On : le bouton s'allume, l'effet est actif sur cette partie.", ref: OM(24) },
    { texte: "Tourne Edit pour doser l'effet. Edit peut s'enregistrer en Motion Seq.", ref: OM(23) },
  ];
  if (f.kind === "mfx") return [
    { texte: `Shift + Master Fx ouvre la page MFX TYPE : choisis ${nn} (${f.nom}) avec la molette, puis Exit.`, ref: PG(10) },
    { texte: "Le type d'effet master est réglé pour tout le motif (MFX TYPE, 01 à 32).", ref: PG(3) },
    { texte: "Pour chaque partie à traiter : sélectionne-la et allume MFX Send.", ref: OM(29) },
    { texte: "Allume Master Fx, puis touche le pad tactile : la position du doigt (X, Y) règle l'effet.", ref: OM(29) },
    { texte: "MFX Hold allumé : l'effet reste dans l'état du pad quand tu lèves le doigt.", ref: OM(22) },
  ];
  return [
    { texte: "Choisis la partie : allume Trigger et appuie sur son pad, ou utilise les boutons Part < >.", ref: OM(27) },
    { texte: `Tourne le potard Modulation jusqu'à lire « ${f.n} ${f.nom} » à l'écran (liste p. 14-15).`, ref: OM(23) },
    { texte: "Depth règle l'intensité, Speed la vitesse. Les deux s'enregistrent en Motion Seq.", ref: OM(23) },
    { texte: "Shift + Modulation change la forme d'onde en gardant la même destination.", ref: PG(10) },
  ];
}

export const PAGES = { OM, PG };
export const _parseMod = parseMod;
