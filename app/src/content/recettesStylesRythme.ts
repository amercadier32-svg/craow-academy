// Recettes RYTHMIQUE des nouveaux styles : Acid tribe, Hardtek, Raggatek, Dub tekno (octobre 2026).
// Au moins 2 recettes par style dans chaque sous-catégorie où l'élément est typique du style.
// Laissées vides volontairement (élément peu typique, pas de recette forcée) :
//   Acid tribe : Ride et cymbale.
//   Hardtek : Toms, Congas et percussions tribales, Shaker, Ride et cymbale.
//   Raggatek : Toms, Congas et percussions tribales, Shaker, Ride et cymbale.
//   Dub tekno : Congas et percussions tribales, Ride et cymbale, Roulement.
// Mêmes règles que recettes.ts (badge « Pratique ») : r() = valeur d'une liste du manuel (vérifiée par npm run check),
// v() = valeur de potard sans plage dans le manuel, affichée « à vérifier sur l'écran ». BPM pris dans la fiche du style (data/electribe2/styles.json).
import type { Source } from "../lib/data";
import { pas } from "../lib/seq";
import type { Recette, Reglage } from "./recettes";

const r = (param: string, valeur: string): Reglage => ({ param, valeur });
const v = (param: string, valeur: string): Reglage => ({ param, valeur, aVerifier: true });
const PG = (page: number): Source => ({ doc: "PG", page });
const OM = (page: number): Source => ({ doc: "OM", page });
const M = (...m: [string, string, string, string]) => m.map(pas);


export const RECETTES_RYTHME_STYLES: Recette[] = [
  // =================== KICK ===================
  {
    id: "kick-rond-court-acidtribe", nom: "Kick rond mais court", styles: ["acid-tribe"], fonction: "kick", element: "kick", partie: 1, bpm: 175,
    idee: "Le kick rond de la tribe, raccourci : il garde sa rondeur mais s'arrête avant la note suivante de la ligne acide, qui a besoin du grave.",
    reglages: [
      r("osc.type", "1 SubBeef"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "65"), v("amp.level", "110"),
      r("ifx.on", "ON"), r("ifx.type", "1 Punch"), v("ifx.edit", "50"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x...x.xx"),
    relance: "Deux coups rapides sur 4.15 et 4.16, comme en tribe.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Plus de corps", idee: "Le kick tient plus longtemps, plus proche de la tribe.", reglages: [v("amp.decay", "80")] },
      { nom: "Autre kick grave", idee: "Un autre kick rond de la liste.", reglages: [r("osc.type", "17 Lololow")] },
    ],
    astuces: [{ texte: "Écoute le kick avec la ligne acide : si le grave devient flou, baisse Decay jusqu'à ce que chaque note de l'acide soit nette.", ref: OM(23) }],
    exercices: ["ex.decay"],
  },
  {
    id: "kick-grogne-acidtribe", nom: "Kick qui grogne avec l'acide", styles: ["acid-tribe"], fonction: "kick", element: "kick", partie: 1, bpm: 178,
    idee: "Un kick court légèrement saturé, avec un filtre qui retire juste le haut : il a le grain de la ligne acide sans la couvrir.",
    reglages: [
      r("osc.type", "19 ShortBoom"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "95"), v("filter.resonance", "10"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "60"), v("amp.level", "105"),
      r("ifx.on", "ON"), r("ifx.type", "2 Overdrive"), v("ifx.edit", "55"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x..x", "x...x...x..xx.xx"),
    relance: "Le kick se décale sur la fin (4.12, 4.13, 4.15, 4.16) pour relancer la boucle.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Moins sale", idee: "Moins d'Overdrive, plus rond.", reglages: [v("ifx.edit", "30")] },
      { nom: "Plus sec", idee: "Encore plus de place pour la ligne acide.", reglages: [v("amp.decay", "45")] },
    ],
    exercices: ["ex.ifxedit", "ex.cutoff"],
  },
  {
    id: "kick-hardtek-sature", nom: "Kick hardtek saturé", styles: ["hardtek"], fonction: "kick", element: "kick", partie: 1, bpm: 188,
    idee: "Un kick dur passé dans la distorsion, avec une queue qui grogne : la base de la hardtek. Le filtre enlève seulement le grésillement le plus aigu.",
    reglages: [
      r("osc.type", "27 Harder"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "electribe LPF"), v("filter.cutoff", "105"), v("filter.resonance", "20"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "75"), v("amp.level", "100"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "80"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x.x.xxxx"),
    relance: "Le kick passe en croches puis en doubles-croches sur la fin de la mesure 4.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Queue plus courte", idee: "Plus de place pour une basse roulante.", reglages: [v("amp.decay", "55")] },
      { nom: "Encore plus dur", idee: "Plus de distorsion (baisse Level si ça sature la sortie).", reglages: [v("ifx.edit", "100"), v("amp.level", "90")] },
    ],
    astuces: [{ texte: "La distorsion monte beaucoup le volume : baisse Level de la partie si le kick fait saturer la sortie.", ref: OM(23) }],
    exercices: ["ex.ifxedit", "ex.decay"],
  },
  {
    id: "kick-hardtek-limiter", nom: "Kick dur tenu au Limiter", styles: ["hardtek"], fonction: "kick", element: "kick", partie: 1, bpm: 185,
    idee: "Un kick dur et compact : le Limiter le rend très présent et régulier, chaque coup a la même force.",
    reglages: [
      r("osc.type", "5 Hardstyle"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "70"), v("amp.level", "105"),
      r("ifx.on", "ON"), r("ifx.type", "8 Limiter"), v("ifx.edit", "75"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x...xxxx"),
    relance: "Le dernier temps de la mesure 4 devient quatre coups rapides.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Plus sale", idee: "L'Overdrive à la place du Limiter.", reglages: [r("ifx.type", "2 Overdrive"), v("ifx.edit", "90")] },
      { nom: "Autre kick dur", idee: "Un autre kick saturé de la liste.", reglages: [r("osc.type", "30 Filthy")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "kick-raggatek-tekno", nom: "Kick tekno qui laisse chanter la basse", styles: ["raggatek"], fonction: "kick", element: "kick", partie: 1, bpm: 175,
    idee: "Un kick tekno court et sec : en raggatek, la basse chante plus de notes, il faut lui laisser de la place.",
    reglages: [
      r("osc.type", "12 Tronica"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "45"), v("amp.level", "110"),
      r("ifx.on", "ON"), r("ifx.type", "1 Punch"), v("ifx.edit", "55"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x...x..x"),
    relance: "Un coup en plus sur 4.16.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Plus rond", idee: "Un peu plus de queue.", reglages: [v("amp.decay", "60")] },
      { nom: "Plus de bas", idee: "Le Low EQ à la place du Punch.", reglages: [r("ifx.type", "9 Low EQ"), v("ifx.edit", "60")] },
    ],
    exercices: ["ex.decay"],
  },
  {
    id: "kick-raggatek-pause", nom: "Kick qui se tait pour la voix", styles: ["raggatek"], fonction: "kick", element: "kick", partie: 1, bpm: 175,
    idee: "Le kick tient trois mesures puis se tait sur la fin de la mesure 4 : ce silence laisse passer une voix, un écho ou un « pull up ».",
    reglages: [
      r("osc.type", "19 ShortBoom"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "55"), v("amp.level", "110"),
      r("ifx.on", "ON"), r("ifx.type", "9 Low EQ"), v("ifx.edit", "55"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x......."),
    relance: "Plus de kick sur le dernier temps de la mesure 4 : la place est libre pour une voix ou un écho.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Silence plus long", idee: "Le kick s'arrête dès le 3e temps.", reglages: [], mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...........") },
      { nom: "Autre kick", idee: "Un kick tekno plus claquant.", reglages: [r("osc.type", "10 HiKnock")] },
    ],
    astuces: [{ texte: "Pour couper tout le kick d'un coup pendant le jeu, utilise Part Mute.", ref: OM(32) }],
    exercices: ["ex.decay"],
  },
  {
    id: "kick-dubtekno-profond", nom: "Kick profond et propre", styles: ["dub-tekno"], fonction: "kick", element: "kick", partie: 1, bpm: 165,
    idee: "Un kick rond et grave, filtré pour rester doux : en dub tekno, il doit laisser beaucoup de place aux échos.",
    reglages: [
      r("osc.type", "15 Subsonic"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "75"), v("filter.resonance", "5"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "80"), v("amp.level", "110"),
      r("ifx.on", "ON"), r("ifx.type", "9 Low EQ"), v("ifx.edit", "55"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x...x..x"),
    relance: "Un seul coup en plus sur 4.16 : la relance reste discrète.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Plus ouvert", idee: "Le filtre laisse passer un peu plus d'attaque.", reglages: [v("filter.cutoff", "95")] },
      { nom: "Plus court", idee: "Si la basse sub est très présente.", reglages: [v("amp.decay", "60")] },
    ],
    exercices: ["ex.cutoff", "ex.decay"],
  },
  {
    id: "kick-dubtekno-echo", nom: "Kick avec écho lancé au pad", styles: ["dub-tekno"], fonction: "kick", element: "kick", partie: 1, bpm: 165,
    idee: "Le kick passe dans le High Pass Delay : l'écho ne garde que le haut du kick, le grave reste propre. On ne lance l'écho qu'à la fin de la mesure 4.",
    reglages: [
      r("osc.type", "17 Lololow"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "65"), v("amp.level", "110"),
      r("ifx.on", "ON"), r("ifx.type", "1 Punch"), v("ifx.edit", "35"),
      r("mfx.send", "ON"), r("pat.mfxtype", "3 High Pass Delay"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x...x..."),
    relance: "Pas de coup en plus : la relance vient de l'écho que tu lances au pad tactile sur le dernier kick.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Écho à bande", idee: "Un écho plus chaud et plus sale.", reglages: [r("pat.mfxtype", "2 Tape Delay")] },
      { nom: "Sans écho", idee: "Le kick sec, pour comparer.", reglages: [r("mfx.send", "OFF")] },
    ],
    astuces: [
      { texte: "Pose le doigt sur le pad tactile seulement sur le dernier kick de la mesure 4, puis relâche : l'écho part tout seul.", ref: OM(29) },
      { texte: "Le type de Master Fx vaut pour tout le motif : les autres parties avec MFX Send = ON l'entendent aussi.", ref: PG(3) },
    ],
    exercices: ["ex.chain.send", "ex.mfxxy"],
  },

  // =================== CHARLESTON FERMÉ ===================
  {
    id: "hat-acidtribe-galop-filtre", nom: "Charleston galop qui s'ouvre", styles: ["acid-tribe"], fonction: "percussion", element: "hat-ferme", partie: 8, bpm: 175,
    idee: "Le galop de la tribe, passé dans un passe-haut : on l'ouvre petit à petit en même temps que la ligne acide.",
    reglages: [
      r("osc.type", "140 EastClose"), v("amp.decay", "25"),
      r("filter.hpf", "electribe HPF"), v("filter.cutoff", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxx.xx", "x.xxx.xxxxxxxxxx"),
    relance: "La deuxième moitié de la mesure 4 se remplit.",
    apercu: { son: "hat", octave: 0 },
    variantes: [
      { nom: "Plus fin", idee: "Le passe-haut coupe plus de bas.", reglages: [v("filter.cutoff", "75")] },
      { nom: "Autre charleston", idee: "Un charleston plus brillant.", reglages: [r("osc.type", "133 NineClose2")] },
    ],
    astuces: [{ texte: "Enregistre Cutoff en Motion Seq en même temps que celui de la ligne acide : les deux s'ouvrent ensemble.", ref: OM(31) }],
    exercices: ["ex.cutoff"],
  },
  {
    id: "hat-acidtribe-sobre", nom: "Charleston sobre en croches", styles: ["acid-tribe"], fonction: "percussion", element: "hat-ferme", partie: 9, bpm: 175,
    idee: "Des croches simples avec un petit écho : le charleston reste sobre pour laisser la ligne acide occuper l'aigu.",
    reglages: [
      r("osc.type", "131 NineClose1"), v("amp.decay", "18"), v("amp.level", "85"),
      r("ifx.on", "ON"), r("ifx.type", "21 Delay 1/16"), v("ifx.edit", "20"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.xx", "x.x.x.x.xxxxxxxx"),
    relance: "La fin de la mesure 3 et de la mesure 4 passe en doubles-croches.",
    apercu: { son: "hat", octave: 0 },
    variantes: [
      { nom: "Sans écho", idee: "Plus sec.", reglages: [r("ifx.on", "OFF")] },
      { nom: "Sur les contretemps", idee: "Seulement entre les kicks.", reglages: [], mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...xxxxxx") },
    ],
    astuces: [{ texte: "Pour des accents comme sur une ligne 303, règle VELOCITY pas par pas (001 à 127) en Step Edit.", ref: PG(5) }],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "hat-hardtek-grain", nom: "Charleston qui grésille à fond", styles: ["hardtek"], fonction: "percussion", element: "hat-ferme", partie: 8, bpm: 188,
    idee: "Des doubles-croches serrées passées au Decimator : le charleston devient granuleux et agressif, comme le reste de la hardtek.",
    reglages: [
      r("osc.type", "133 NineClose2"), v("amp.decay", "12"), v("amp.level", "80"),
      r("filter.hpf", "electribe HPF"), v("filter.cutoff", "55"),
      r("ifx.on", "ON"), r("ifx.type", "4 Decimator"), v("ifx.edit", "45"),
      r("mfx.send", "ON"),
    ],
    mesures: M("xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx", "xxxxxxxx.x.x.x.x"),
    relance: "La deuxième moitié de la mesure 4 repasse en croches : un petit vide avant de reboucler.",
    apercu: { son: "hat", octave: 0 },
    variantes: [
      { nom: "Moins abîmé", idee: "Moins de Decimator.", reglages: [v("ifx.edit", "20")] },
      { nom: "Plus aigu", idee: "Le passe-haut coupe plus de bas.", reglages: [v("filter.cutoff", "80")] },
    ],
    exercices: ["ex.ifxedit", "ex.cutoff"],
  },
  {
    id: "hat-hardtek-croches", nom: "Charleston en croches qui pousse", styles: ["hardtek"], fonction: "percussion", element: "hat-ferme", partie: 9, bpm: 185,
    idee: "Des croches courtes et frappées : au tempo de la hardtek, elles suffisent à pousser le morceau vers l'avant.",
    reglages: [
      r("osc.type", "135 EightClose1"), v("amp.decay", "20"),
      r("ifx.on", "ON"), r("ifx.type", "1 Punch"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.xxxxxxxx"),
    relance: "La deuxième moitié de la mesure 4 passe en doubles-croches.",
    apercu: { son: "hat", octave: 0 },
    variantes: [
      { nom: "Plus sale", idee: "Overdrive à la place du Punch.", reglages: [r("ifx.type", "2 Overdrive"), v("ifx.edit", "60")] },
      { nom: "Autre charleston", idee: "Plus métallique.", reglages: [r("osc.type", "138 CompClose")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "hat-raggatek-skank", nom: "Charleston qui skanke", styles: ["raggatek"], fonction: "percussion", element: "hat-ferme", partie: 8, bpm: 175,
    idee: "Deux coups juste après chaque kick, avec un écho en croches : le charleston chaloupe comme un skank de reggae accéléré.",
    reglages: [
      r("osc.type", "140 EastClose"), v("amp.decay", "20"),
      r("ifx.on", "ON"), r("ifx.type", "20 Delay 1/8"), v("ifx.edit", "25"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..xx..xx..xx..xx", "..xx..xx..xx..xx", "..xx..xx..xx..xx", "..xx..xx..xxxxxx"),
    relance: "La fin de la mesure 4 se remplit.",
    apercu: { son: "hat", octave: 0 },
    variantes: [
      { nom: "Sans écho", idee: "Plus sec, plus tekno.", reglages: [r("ifx.on", "OFF")] },
      { nom: "Plus doux", idee: "Un charleston plus chaud.", reglages: [r("osc.type", "144 WarmClose")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "hat-raggatek-chaloupe", nom: "Charleston chaloupé", styles: ["raggatek"], fonction: "percussion", element: "hat-ferme", partie: 9, bpm: 175,
    idee: "Des croches avec un trou avant la fin de chaque mesure : simples, à faire chalouper avec SWING.",
    reglages: [
      r("osc.type", "144 WarmClose"), v("amp.decay", "18"), v("amp.level", "85"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x...x.", "x.x.x.x.x.xxx.xx"),
    relance: "Un petit groupe de trois coups sur 4.11 à 4.13, puis 4.15 et 4.16.",
    apercu: { son: "hat", octave: 0 },
    variantes: [
      { nom: "En doubles-croches", idee: "Plus dense.", reglages: [], mesures: M("xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx", "xxxxxxxxxxxx.x.x") },
      { nom: "Plus brillant", idee: "Un autre charleston.", reglages: [r("osc.type", "131 NineClose1")] },
    ],
    astuces: [{ texte: "SWING (réglage du motif) décale les pas pairs : un peu de swing positif fait chalouper le charleston.", ref: PG(3) }],
    exercices: ["ex.decay"],
  },
  {
    id: "hat-dubtekno-delay", nom: "Charleston dans le delay 3/16", styles: ["dub-tekno"], fonction: "percussion", element: "hat-ferme", partie: 8, bpm: 165,
    idee: "Un charleston seulement sur les contretemps, mais l'écho en 3/16 remplit les trous : peu de coups, beaucoup de mouvement.",
    reglages: [
      r("osc.type", "131 NineClose1"), v("amp.decay", "15"),
      r("ifx.on", "ON"), r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "45"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x.x.x."),
    relance: "Un coup en plus sur 4.13.",
    apercu: { son: "hat", octave: 0 },
    variantes: [
      { nom: "Plus d'écho", idee: "L'écho prend plus de place.", reglages: [v("ifx.edit", "70")] },
      { nom: "Écho en croches", idee: "Un écho plus régulier.", reglages: [r("ifx.type", "20 Delay 1/8")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "hat-dubtekno-doux", nom: "Charleston doux filtré", styles: ["dub-tekno"], fonction: "percussion", element: "hat-ferme", partie: 9, bpm: 165,
    idee: "Un charleston chaud, filtré pour enlever le plus aigu : il reste en fond, comme un souffle régulier.",
    reglages: [
      r("osc.type", "144 WarmClose"), v("amp.decay", "20"), v("amp.level", "75"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "80"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.xxx.x.x.xxx.x.", "x.xxx.x.x.xxx.x.", "x.xxx.x.x.xxx.x.", "x.xxx.x.x.xxxxxx"),
    relance: "La fin de la mesure 4 se remplit.",
    apercu: { son: "hat", octave: 0 },
    variantes: [
      { nom: "Plus brillant", idee: "Le filtre s'ouvre.", reglages: [v("filter.cutoff", "105")] },
      { nom: "Avec écho", idee: "Un peu de delay 3/16.", reglages: [r("ifx.on", "ON"), r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "30")] },
    ],
    exercices: ["ex.cutoff"],
  },

  // =================== CHARLESTON OUVERT ===================
  {
    id: "openhat-acidtribe-court", nom: "Ouvert court sur le contretemps", styles: ["acid-tribe"], fonction: "percussion", element: "hat-ouvert", partie: 10, bpm: 175,
    idee: "Un charleston ouvert court entre chaque kick : il marque le contretemps sans traîner dans l'aigu de la ligne acide.",
    reglages: [
      r("osc.type", "132 NineOpen1"), v("amp.decay", "35"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x.x.xx"),
    relance: "Trois coups serrés à la fin de la mesure 4.",
    apercu: { son: "openhat", octave: 0 },
    variantes: [
      { nom: "Plus long", idee: "Le charleston respire plus.", reglages: [v("amp.decay", "55")] },
      { nom: "Autre ouvert", idee: "Plus « oriental ».", reglages: [r("osc.type", "141 EastOpen")] },
    ],
    exercices: ["ex.decay"],
  },
  {
    id: "openhat-acidtribe-phaser", nom: "Ouvert qui tourne avec l'acide", styles: ["acid-tribe"], fonction: "percussion", element: "hat-ouvert", partie: 10, bpm: 178,
    idee: "Un ouvert passé dans un phaser : il tourne doucement et prend la couleur « liquide » de la ligne acide.",
    reglages: [
      r("osc.type", "136 EightOpen1"), v("amp.decay", "40"),
      r("ifx.on", "ON"), r("ifx.type", "31 Phaser LFO 1"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x..xx.", "..x...x...x...x.", "..x...x..xx..xxx"),
    relance: "Des doublés à la fin de la mesure 4.",
    apercu: { son: "openhat", octave: 0 },
    variantes: [
      { nom: "Moins de phaser", idee: "Plus discret.", reglages: [v("ifx.edit", "25")] },
      { nom: "Flanger", idee: "Un mouvement plus métallique.", reglages: [r("ifx.type", "28 Flanger LFO")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "openhat-hardtek-offbeat", nom: "Ouvert distordu sur chaque contretemps", styles: ["hardtek"], fonction: "percussion", element: "hat-ouvert", partie: 10, bpm: 188,
    idee: "L'ouvert tombe entre chaque kick, un peu distordu : avec le kick saturé, il fait le « poum-tss » de la hardtek.",
    reglages: [
      r("osc.type", "134 NineOpen2"), v("amp.decay", "30"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x.xxxx"),
    relance: "Quatre coups rapides à la fin de la mesure 4.",
    apercu: { son: "openhat", octave: 0 },
    variantes: [
      { nom: "Propre", idee: "Sans distorsion.", reglages: [r("ifx.on", "OFF")] },
      { nom: "Plus court", idee: "Plus sec.", reglages: [v("amp.decay", "20")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "openhat-hardtek-siffle", nom: "Ouvert long qui siffle", styles: ["hardtek"], fonction: "percussion", element: "hat-ouvert", partie: 11, bpm: 185,
    idee: "Un ouvert long passé dans un passe-haut résonant : il siffle au-dessus du kick et donne de la tension.",
    reglages: [
      r("osc.type", "147 ZeeOpen"), v("amp.decay", "55"),
      r("filter.hpf", "MS20 HPF"), v("filter.cutoff", "60"), v("filter.resonance", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x.x.x.", "..x.x.x.x.x.xxxx"),
    relance: "L'ouvert se resserre en croches puis en doubles-croches.",
    apercu: { son: "openhat", octave: 0 },
    variantes: [
      { nom: "Moins de sifflement", idee: "Moins de résonance.", reglages: [v("filter.resonance", "15")] },
      { nom: "Plus court", idee: "Pour un morceau plus rapide.", reglages: [v("amp.decay", "35")] },
    ],
    exercices: ["ex.resonance", "ex.cutoff"],
  },
  {
    id: "openhat-raggatek-echo", nom: "Ouvert sur le contretemps avec écho", styles: ["raggatek"], fonction: "percussion", element: "hat-ouvert", partie: 10, bpm: 175,
    idee: "Un ouvert sur chaque contretemps avec un écho en croches : il rebondit comme dans un sound system.",
    reglages: [
      r("osc.type", "141 EastOpen"), v("amp.decay", "35"),
      r("ifx.on", "ON"), r("ifx.type", "20 Delay 1/8"), v("ifx.edit", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x...xx"),
    relance: "Un doublé sur 4.15 et 4.16.",
    apercu: { son: "openhat", octave: 0 },
    variantes: [
      { nom: "Sans écho", idee: "Plus sec.", reglages: [r("ifx.on", "OFF")] },
      { nom: "Écho en 3/16", idee: "Un rebond décalé.", reglages: [r("ifx.type", "19 Delay 3/16")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "openhat-raggatek-chorus", nom: "Ouvert court en chorus", styles: ["raggatek"], fonction: "percussion", element: "hat-ouvert", partie: 11, bpm: 175,
    idee: "Un ouvert court seulement sur deux contretemps par mesure, élargi par le Chorus : il répond au skank sans encombrer.",
    reglages: [
      r("osc.type", "136 EightOpen1"), v("amp.decay", "25"),
      r("ifx.on", "ON"), r("ifx.type", "27 Chorus"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("......x.......x.", "......x.......x.", "......x.......x.", "......x...x...xx"),
    relance: "Un coup de plus sur 4.11 et un doublé à la fin.",
    apercu: { son: "openhat", octave: 0 },
    variantes: [
      { nom: "Plus long", idee: "Il respire plus.", reglages: [v("amp.decay", "45")] },
      { nom: "Sans chorus", idee: "Plus centré.", reglages: [r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "openhat-dubtekno-reverb", nom: "Ouvert dans la grande réverbe", styles: ["dub-tekno"], fonction: "percussion", element: "hat-ouvert", partie: 10, bpm: 165,
    idee: "Un ouvert doux envoyé dans une réverbe très mouillée : il s'éloigne et laisse une traînée entre les kicks.",
    reglages: [
      r("osc.type", "145 WarmOpen"), v("amp.decay", "40"),
      r("mfx.send", "ON"), r("pat.mfxtype", "6 Wet Reverb"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x....."),
    relance: "Le dernier contretemps manque : la réverbe remplit le silence.",
    apercu: { son: "openhat", octave: 0 },
    variantes: [
      { nom: "Réverbe de pièce", idee: "Moins de traînée.", reglages: [r("pat.mfxtype", "5 Room Reverb")] },
      { nom: "Plus court", idee: "Plus de place pour l'écho.", reglages: [v("amp.decay", "25")] },
    ],
    astuces: [{ texte: "Le type de Master Fx vaut pour tout le motif : les autres parties avec MFX Send = ON l'entendent aussi.", ref: PG(3) }],
    exercices: ["ex.chain.send"],
  },
  {
    id: "openhat-dubtekno-phaser", nom: "Ouvert qui respire au phaser", styles: ["dub-tekno"], fonction: "percussion", element: "hat-ouvert", partie: 11, bpm: 165,
    idee: "Un ouvert seulement sur le 2e et le 4e contretemps, avec un phaser lent : il respire, sans presser.",
    reglages: [
      r("osc.type", "157 PhaseOpen"), v("amp.decay", "45"),
      r("ifx.on", "ON"), r("ifx.type", "31 Phaser LFO 1"), v("ifx.edit", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("......x.......x.", "......x.......x.", "......x.......x.", "......x...x...x."),
    relance: "Un coup de plus sur 4.11.",
    apercu: { son: "openhat", octave: 0 },
    variantes: [
      { nom: "Plus de phaser", idee: "Le mouvement s'entend plus.", reglages: [v("ifx.edit", "70")] },
      { nom: "Sur tous les contretemps", idee: "Plus régulier.", reglages: [], mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.") },
    ],
    exercices: ["ex.ifxedit"],
  },

  // =================== CLAP ===================
  {
    id: "clap-acidtribe-piece", nom: "Clap dans la pièce", styles: ["acid-tribe"], fonction: "percussion", element: "clap", partie: 3, bpm: 175,
    idee: "Un clap sur le 2 et le 4 avec une petite réverbe de pièce : il place le morceau dans un lieu sans couvrir la ligne acide.",
    reglages: [
      r("osc.type", "116 AmbEight"), v("amp.decay", "40"),
      r("mfx.send", "ON"), r("pat.mfxtype", "5 Room Reverb"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x.......x.xx"),
    relance: "Un doublé sur 4.15 et 4.16.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Plus sec", idee: "Sans réverbe.", reglages: [r("mfx.send", "OFF")] },
      { nom: "Autre clap", idee: "Plus petit.", reglages: [r("osc.type", "121 Small")] },
    ],
    exercices: ["ex.chain.send"],
  },
  {
    id: "clap-acidtribe-flam", nom: "Clap doublé", styles: ["acid-tribe"], fonction: "percussion", element: "clap", partie: 3, bpm: 178,
    idee: "Un clap déjà doublé passé dans un Short Delay : il sonne large et un peu « flam », comme dans beaucoup de morceaux acides.",
    reglages: [
      r("osc.type", "123 Doubler"), v("amp.decay", "35"),
      r("ifx.on", "ON"), r("ifx.type", "24 Short Delay"), v("ifx.edit", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x...x...x.x."),
    relance: "Des claps en plus sur 4.09 et 4.15.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Plus d'écho", idee: "Le clap rebondit.", reglages: [r("ifx.type", "21 Delay 1/16"), v("ifx.edit", "40")] },
      { nom: "Moins large", idee: "Moins de Short Delay.", reglages: [v("ifx.edit", "15")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "clap-hardtek-dur", nom: "Clap dur saturé", styles: ["hardtek"], fonction: "percussion", element: "clap", partie: 3, bpm: 188,
    idee: "Un clap épais passé dans la distorsion : il claque fort au milieu des kicks saturés.",
    reglages: [
      r("osc.type", "117 DirtySouth"), v("amp.decay", "30"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "60"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x.......x.xx"),
    relance: "Un doublé sur 4.15 et 4.16.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Moins saturé", idee: "Overdrive à la place.", reglages: [r("ifx.type", "2 Overdrive"), v("ifx.edit", "50")] },
      { nom: "Plus court", idee: "Plus sec.", reglages: [v("amp.decay", "20")] },
    ],
    astuces: [{ texte: "La distorsion monte le volume : baisse Level si le clap passe devant le kick.", ref: OM(23) }],
    exercices: ["ex.ifxedit", "ex.level"],
  },
  {
    id: "clap-hardtek-salle", nom: "Clap large dans la salle", styles: ["hardtek"], fonction: "percussion", element: "clap", partie: 3, bpm: 185,
    idee: "Un clap mélangé passé dans un Short Delay et une réverbe de pièce : il sonne large, comme un clap « empilé ».",
    reglages: [
      r("osc.type", "119 Mixed"), v("amp.decay", "35"),
      r("ifx.on", "ON"), r("ifx.type", "24 Short Delay"), v("ifx.edit", "25"),
      r("mfx.send", "ON"), r("pat.mfxtype", "5 Room Reverb"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x...x...xxxx"),
    relance: "Le clap se resserre sur la fin de la mesure 4.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Sans réverbe", idee: "Plus sec.", reglages: [r("mfx.send", "OFF")] },
      { nom: "Autre clap", idee: "Plus dur.", reglages: [r("osc.type", "127 Crispy")] },
    ],
    exercices: ["ex.ifxedit", "ex.chain.send"],
  },
  {
    id: "clap-raggatek-echo", nom: "Clap sec avec écho de sound system", styles: ["raggatek"], fonction: "percussion", element: "clap", partie: 3, bpm: 175,
    idee: "Un clap léger sur le 2 et le 4 envoyé dans le Tape Delay : tu lances l'écho au pad sur le dernier clap, comme un « pull up ».",
    reglages: [
      r("osc.type", "125 Liteclap"), v("amp.decay", "30"),
      r("mfx.send", "ON"), r("pat.mfxtype", "2 Tape Delay"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x.......x..."),
    relance: "Pas de coup en plus : la relance vient de l'écho lancé au pad tactile sur le dernier clap.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Écho en réverbe", idee: "Une traînée plutôt qu'un écho.", reglages: [r("pat.mfxtype", "6 Wet Reverb")] },
      { nom: "Plus épais", idee: "Un autre clap.", reglages: [r("osc.type", "118 PureNine")] },
    ],
    astuces: [{ texte: "Pose le doigt sur le pad tactile pendant le dernier clap de la mesure 4, puis relâche : l'écho part tout seul.", ref: OM(29) }],
    exercices: ["ex.chain.send", "ex.mfxxy"],
  },
  {
    id: "clap-raggatek-snap", nom: "Claquement de doigts", styles: ["raggatek"], fonction: "percussion", element: "clap", partie: 4, bpm: 175,
    idee: "Un claquement de doigts sur le 2 et le 4, avec un tout petit écho : un son plus léger et plus « chanté » qu'un clap.",
    reglages: [
      r("osc.type", "130 FingerSnap"), v("amp.decay", "25"),
      r("ifx.on", "ON"), r("ifx.type", "24 Short Delay"), v("ifx.edit", "20"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x..x", "....x..x....x.x."),
    relance: "Des claquements en plus sur 4.08 et 4.15.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Plus sec", idee: "Le claquement s'arrête plus vite.", reglages: [v("amp.decay", "15")] },
      { nom: "Plus d'écho", idee: "Il rebondit en croches.", reglages: [r("ifx.type", "20 Delay 1/8"), v("ifx.edit", "30")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "clap-dubtekno-echo", nom: "Clap qui part en écho", styles: ["dub-tekno"], fonction: "percussion", element: "clap", partie: 3, bpm: 165,
    idee: "Un clap doux sur le 2 et le 4, avec un delay en 3/16 bien présent : l'écho remplit l'espace entre les coups.",
    reglages: [
      r("osc.type", "116 AmbEight"), v("amp.decay", "35"),
      r("ifx.on", "ON"), r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x..........."),
    relance: "Le dernier clap manque : on n'entend plus que l'écho du précédent.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Moins d'écho", idee: "Plus net.", reglages: [v("ifx.edit", "25")] },
      { nom: "Écho en croches", idee: "Plus régulier.", reglages: [r("ifx.type", "20 Delay 1/8")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "clap-dubtekno-lointain", nom: "Clap lointain", styles: ["dub-tekno"], fonction: "percussion", element: "clap", partie: 4, bpm: 165,
    idee: "Un clap fin, filtré et noyé dans la réverbe, seulement sur le 4e temps : il semble venir de loin.",
    reglages: [
      r("osc.type", "118 PureNine"), v("amp.decay", "30"), v("amp.level", "80"),
      r("filter.hpf", "electribe HPF"), v("filter.cutoff", "60"),
      r("mfx.send", "ON"), r("pat.mfxtype", "6 Wet Reverb"),
    ],
    mesures: M("............x...", "............x...", "....x.......x...", "............x..."),
    relance: "Le clap revient seul sur le 4e temps.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Moins lointain", idee: "Moins de filtre.", reglages: [v("filter.cutoff", "30")] },
      { nom: "Réverbe de salle", idee: "Une autre réverbe.", reglages: [r("pat.mfxtype", "4 Hall Reverb")] },
    ],
    exercices: ["ex.cutoff", "ex.chain.send"],
  },

  // =================== CAISSE CLAIRE ===================
  {
    id: "rim-acidtribe", nom: "Rim qui répond à l'acide", styles: ["acid-tribe"], fonction: "percussion", element: "snare", partie: 7, bpm: 175,
    idee: "Un rimshot syncopé avec un petit écho : il répond aux notes de la ligne acide entre les temps.",
    reglages: [
      r("osc.type", "108 Rimmy"), v("amp.decay", "20"),
      r("ifx.on", "ON"), r("ifx.type", "21 Delay 1/16"), v("ifx.edit", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("...x.....x..x...", "...x.....x..x...", "...x.....x..x...", "...x.....x..x.xx"),
    relance: "Un doublé sur 4.15 et 4.16.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Plus boisé", idee: "Un autre rim.", reglages: [r("osc.type", "109 AmbiRim")] },
      { nom: "Sans écho", idee: "Plus sec.", reglages: [r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "snare-acidtribe-break", nom: "Caisse claire légère qui casse", styles: ["acid-tribe"], fonction: "percussion", element: "snare", partie: 3, bpm: 178,
    idee: "Une caisse claire fine sur le 2 et le 4, qui se décale de temps en temps : un léger côté breakbeat, sans charger.",
    reglages: [
      r("osc.type", "87 Snappy"), v("amp.decay", "30"),
      r("filter.hpf", "electribe HPF"), v("filter.cutoff", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.....x.x...", "....x.......x...", "....x..x.x..x.xx"),
    relance: "La caisse se décale (4.08, 4.10) puis doublé à la fin.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Plus aiguë", idee: "Une caisse piccolo.", reglages: [r("osc.type", "97 Piccolo")] },
      { nom: "Plus grave", idee: "Moins de passe-haut.", reglages: [v("filter.cutoff", "10")] },
    ],
    exercices: ["ex.cutoff"],
  },
  {
    id: "snare-hardtek-blast", nom: "Caisse claire blast", styles: ["hardtek"], fonction: "percussion", element: "snare", partie: 3, bpm: 188,
    idee: "Une caisse claire très dure, saturée par l'Overdrive : elle remplace ou double le clap pour un 2 et 4 plus agressif.",
    reglages: [
      r("osc.type", "112 Blast"), v("amp.decay", "30"),
      r("ifx.on", "ON"), r("ifx.type", "2 Overdrive"), v("ifx.edit", "60"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x.......xxxx"),
    relance: "Le dernier temps de la mesure 4 devient quatre coups rapides.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Encore plus dure", idee: "La distorsion à la place.", reglages: [r("ifx.type", "3 Distortion"), v("ifx.edit", "60")] },
      { nom: "Plus sèche", idee: "Plus courte.", reglages: [v("amp.decay", "20")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "rim-hardtek-metal", nom: "Rim métallique saturé", styles: ["hardtek"], fonction: "percussion", element: "snare", partie: 7, bpm: 185,
    idee: "Un rimshot saturé placé entre les temps : un petit bruit métallique qui ajoute de la tension au-dessus du kick.",
    reglages: [
      r("osc.type", "108 Rimmy"), v("amp.decay", "20"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x....x..x....x", "..x....x..x....x", "..x....x..x....x", "..x....x..x.x.xx"),
    relance: "Les coups se resserrent à la fin.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Plus numérique", idee: "Le Bit Crusher à la place.", reglages: [r("ifx.type", "5 Bit Crusher"), v("ifx.edit", "50")] },
      { nom: "Moins de coups", idee: "Seulement deux par mesure.", reglages: [], mesures: M("..x.......x.....", "..x.......x.....", "..x.......x.....", "..x.......x.x.xx") },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "rim-raggatek", nom: "Rimshot ragga", styles: ["raggatek"], fonction: "percussion", element: "snare", partie: 7, bpm: 175,
    idee: "Un rimshot en rythme « 3-3-2 » avec un écho en croches : la petite percussion sèche qu'on entend souvent dans le ragga.",
    reglages: [
      r("osc.type", "108 Rimmy"), v("amp.decay", "20"),
      r("ifx.on", "ON"), r("ifx.type", "20 Delay 1/8"), v("ifx.edit", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("...x..x....x..x.", "...x..x....x..x.", "...x..x....x..x.", "...x..x....x.xxx"),
    relance: "Trois coups serrés à la fin de la mesure 4.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Rim plus doux", idee: "Un autre rim.", reglages: [r("osc.type", "109 AmbiRim")] },
      { nom: "Sans écho", idee: "Plus sec.", reglages: [r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "snare-raggatek-dancehall", nom: "Caisse claire dancehall", styles: ["raggatek"], fonction: "percussion", element: "snare", partie: 3, bpm: 175,
    idee: "Une caisse claire old school sur le 2 et le 4, avec un coup en plus juste avant le 3 : elle donne un léger balancement dancehall.",
    reglages: [
      r("osc.type", "93 Oldskool"), v("amp.decay", "30"),
      r("filter.hpf", "electribe HPF"), v("filter.cutoff", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x..x....x...", "....x..x....x...", "....x..x....x...", "....x..x....x.xx"),
    relance: "Un doublé sur 4.15 et 4.16.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Plus claquante", idee: "Une autre caisse.", reglages: [r("osc.type", "87 Snappy")] },
      { nom: "Seulement 2 et 4", idee: "Plus simple.", reglages: [], mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x.......x.xx") },
    ],
    exercices: ["ex.cutoff"],
  },
  {
    id: "rim-dubtekno-echo", nom: "Rim en écho dub", styles: ["dub-tekno"], fonction: "percussion", element: "snare", partie: 7, bpm: 165,
    idee: "Un rim doux, deux fois par mesure, dans un écho en croches : le delay fait tout le rythme.",
    reglages: [
      r("osc.type", "109 AmbiRim"), v("amp.decay", "20"),
      r("ifx.on", "ON"), r("ifx.type", "20 Delay 1/8"), v("ifx.edit", "45"),
      r("mfx.send", "ON"),
    ],
    mesures: M("......x.......x.", "......x.......x.", "......x.......x.", "......x...x....."),
    relance: "Le dernier rim avance sur 4.11, puis l'écho finit la mesure.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Écho en 3/16", idee: "Un rebond plus décalé.", reglages: [r("ifx.type", "19 Delay 3/16")] },
      { nom: "Plus d'écho", idee: "Les répétitions durent plus.", reglages: [v("ifx.edit", "70")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "snare-dubtekno-steppers", nom: "Caisse claire sur le 3", styles: ["dub-tekno"], fonction: "percussion", element: "snare", partie: 3, bpm: 165,
    idee: "Une seule caisse claire par mesure, sur le 3e temps, envoyée dans le Tape Delay : un rythme posé, inspiré du dub « steppers ».",
    reglages: [
      r("osc.type", "89 Verdy"), v("amp.decay", "35"),
      r("mfx.send", "ON"), r("pat.mfxtype", "2 Tape Delay"),
    ],
    mesures: M("........x.......", "........x.......", "........x.......", "........x.....x."),
    relance: "Un coup en plus sur 4.15.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Sur le 2 et le 4", idee: "Plus tekno.", reglages: [], mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x.......x.x.") },
      { nom: "Réverbe à la place", idee: "Une traînée au lieu d'un écho.", reglages: [r("pat.mfxtype", "6 Wet Reverb")] },
    ],
    astuces: [{ texte: "Pose le doigt sur le pad tactile sur la dernière caisse de la mesure 4 pour lancer l'écho.", ref: OM(29) }],
    exercices: ["ex.chain.send"],
  },

  // =================== TOMS ===================
  {
    id: "toms-acidtribe-332", nom: "Toms qui suivent la ligne acide", styles: ["acid-tribe"], fonction: "percussion", element: "toms", partie: 5, bpm: 175,
    idee: "Trois toms en rythme « 3-3-2 », dans la pentatonique : ils tournent sous la ligne acide comme une deuxième mélodie.",
    melodique: { key: "D", scale: 16 },
    reglages: [
      r("osc.type", "198 Synth Mid1"), v("amp.decay", "35"),
      r("mod.type", "2 EG+ Pitch"), v("mod.depth", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0..2..1.0..2..1.", "0..2..1.0..2..1.", "0..2..1.0..2..1.", "0..2..1.3.2.1.0."),
    relance: "La fin de la mesure 4 redescend 3, 2, 1, 0.",
    apercu: { son: "tom", octave: 1 },
    variantes: [
      { nom: "Plus grave", idee: "Un tom plus bas.", reglages: [r("osc.type", "199 Synth Lo1")] },
      { nom: "Sans chute", idee: "Sans la chute de hauteur.", reglages: [v("mod.depth", "0")] },
    ],
    exercices: ["ex.depth", "ex.pitch"],
  },
  {
    id: "toms-acidtribe-echo", nom: "Tom grave en écho", styles: ["acid-tribe"], fonction: "percussion", element: "toms", partie: 6, bpm: 178,
    idee: "Un tom grave, deux fois par mesure, avec un écho en 3/16 : il remplit le bas sans gêner la ligne acide.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "199 Synth Lo1"), v("amp.decay", "45"),
      r("ifx.on", "ON"), r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0.......0.......", "0.......0.......", "0.......0.....0.", "0...0...0.0.0000"),
    relance: "Les toms se resserrent sur la fin de la mesure 4.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Moins d'écho", idee: "Plus net.", reglages: [v("ifx.edit", "20")] },
      { nom: "Toms réels", idee: "Plus acoustique.", reglages: [r("osc.type", "190 Real Lo")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "toms-dubtekno-echo", nom: "Tom dub qui résonne", styles: ["dub-tekno"], fonction: "percussion", element: "toms", partie: 5, bpm: 165,
    idee: "Un seul tom grave à la fin de chaque mesure, qui tombe en hauteur et part dans un écho en 3/16 : le « boum » qui résonne du dub.",
    melodique: { key: "D", scale: 7 },
    reglages: [
      r("osc.type", "199 Synth Lo1"), v("amp.decay", "40"),
      r("mod.type", "2 EG+ Pitch"), v("mod.depth", "30"),
      r("ifx.on", "ON"), r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "55"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..............0.", "..............0.", "..............0.", "........0...2.0."),
    relance: "Trois toms sur la mesure 4, avec une note plus haute au milieu.",
    apercu: { son: "tom", octave: 0 },
    variantes: [
      { nom: "Plus d'écho", idee: "L'écho dure plus.", reglages: [v("ifx.edit", "75")] },
      { nom: "Sans chute", idee: "Un tom droit.", reglages: [v("mod.depth", "0")] },
    ],
    exercices: ["ex.depth", "ex.ifxedit"],
  },
  {
    id: "toms-dubtekno-reponse", nom: "Toms synthé en réponse", styles: ["dub-tekno"], fonction: "percussion", element: "toms", partie: 6, bpm: 165,
    idee: "Un tom synthé aigu qui tombe en hauteur, en réponse au kick, dans un écho en croches : un appel-réponse discret.",
    melodique: { key: "D", scale: 16 },
    reglages: [
      r("osc.type", "197 Synth Hi1"), v("amp.decay", "30"),
      r("mod.type", "2 EG+ Pitch"), v("mod.depth", "45"),
      r("ifx.on", "ON"), r("ifx.type", "20 Delay 1/8"), v("ifx.edit", "35"),
      r("mfx.send", "ON"),
    ],
    mesures: M("......0.........", "......0.....1...", "......0.........", "......0...2.1.0."),
    relance: "Trois toms qui redescendent à la fin.",
    apercu: { son: "tom", octave: 1 },
    variantes: [
      { nom: "Plus grave", idee: "Un tom plus bas.", reglages: [r("osc.type", "198 Synth Mid1")] },
      { nom: "Chute plus forte", idee: "Le tom tombe plus.", reglages: [v("mod.depth", "70")] },
    ],
    exercices: ["ex.depth"],
  },

  // =================== CONGAS ET PERCUSSIONS TRIBALES ===================
  {
    id: "congas-acidtribe-sobres", nom: "Congas sobres sous l'acide", styles: ["acid-tribe"], fonction: "percussion", element: "congas", partie: 6, bpm: 175,
    idee: "Moins de notes qu'en tribe : quelques coups de conga entre les temps, pour garder l'esprit tribe sans couvrir la ligne acide.",
    reglages: [
      r("osc.type", "204 Conga2"), v("amp.decay", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("...x..x....x.x..", "...x..x....x.x..", "...x..x....x.x..", "...x..x..x.xx.xx"),
    relance: "Les congas se rapprochent à la fin de la mesure 4.",
    apercu: { son: "perc", octave: 0 },
    variantes: [
      { nom: "Plus aiguë", idee: "Une autre conga.", reglages: [r("osc.type", "206 Conga4")] },
      { nom: "Djembé", idee: "Plus grave et plus sec.", reglages: [r("osc.type", "214 Djembe1")] },
    ],
    exercices: ["ex.decay"],
  },
  {
    id: "bongos-acidtribe-filtre", nom: "Bongos dans le filtre", styles: ["acid-tribe"], fonction: "percussion", element: "congas", partie: 7, bpm: 178,
    idee: "Des bongos passés dans un passe-bande résonant qui bouge lentement : ils prennent un peu la couleur « acide » de la ligne principale.",
    reglages: [
      r("osc.type", "209 Bongo2"), v("amp.decay", "25"),
      r("filter.bpf", "MS20 BPF"), v("filter.cutoff", "60"), v("filter.resonance", "40"),
      r("mod.type", "25 LFOTri Filter"), v("mod.depth", "30"), v("mod.speed", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.xx..x.x.xx..x.", "x.xx..x.x.xx..x.", "x.xx..x.x.xx..x.", "x.xx..x.xxxx.xxx"),
    relance: "La fin de la mesure 4 se remplit.",
    apercu: { son: "perc", octave: 0 },
    variantes: [
      { nom: "Plus résonant", idee: "Le filtre siffle plus.", reglages: [v("filter.resonance", "70")] },
      { nom: "Sans mouvement", idee: "Sans la modulation.", reglages: [v("mod.depth", "0")] },
    ],
    exercices: ["ex.resonance", "ex.speed"],
  },

  // =================== SHAKER ===================
  {
    id: "shaker-acidtribe-galop", nom: "Shaker au galop discret", styles: ["acid-tribe"], fonction: "percussion", element: "shaker", partie: 11, bpm: 175,
    idee: "Un shaker en galop, bas en volume et filtré : il entretient le mouvement tribe sous la ligne acide.",
    reglages: [
      r("osc.type", "232 Shaker"), v("amp.decay", "15"), v("amp.level", "70"),
      r("filter.hpf", "electribe HPF"), v("filter.cutoff", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxx.xx", "x.xxx.xxxxxxxxxx"),
    relance: "La fin de la mesure 4 se remplit.",
    apercu: { son: "shaker", octave: 0 },
    variantes: [
      { nom: "Plus présent", idee: "Plus fort.", reglages: [v("amp.level", "95")] },
      { nom: "Maracas", idee: "Un autre son.", reglages: [r("osc.type", "250 DoncaMaracas")] },
    ],
    exercices: ["ex.level"],
  },
  {
    id: "cabasa-acidtribe-contretemps", nom: "Cabasa sur les contretemps", styles: ["acid-tribe"], fonction: "percussion", element: "shaker", partie: 12, bpm: 178,
    idee: "Une cabasa seulement entre les kicks, avec un petit écho : simple et efficace quand la ligne acide est chargée.",
    reglages: [
      r("osc.type", "231 Cabasa"), v("amp.decay", "20"),
      r("ifx.on", "ON"), r("ifx.type", "21 Delay 1/16"), v("ifx.edit", "25"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x.x.xx"),
    relance: "Trois coups à la fin de la mesure 4.",
    apercu: { son: "shaker", octave: 0 },
    variantes: [
      { nom: "Sans écho", idee: "Plus sec.", reglages: [r("ifx.on", "OFF")] },
      { nom: "Tambourin", idee: "Plus brillant.", reglages: [r("osc.type", "227 Tambourine1")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "shaker-dubtekno-doux", nom: "Shaker doux en doubles-croches", styles: ["dub-tekno"], fonction: "percussion", element: "shaker", partie: 11, bpm: 165,
    idee: "Un shaker sur chaque pas, très bas en volume et filtré : un souffle régulier sous les échos.",
    reglages: [
      r("osc.type", "232 Shaker"), v("amp.decay", "12"), v("amp.level", "65"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "90"),
      r("mfx.send", "ON"),
    ],
    mesures: M("xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx", "xxxxxxxxxxxx...."),
    relance: "Les 4 derniers pas se taisent avant de reboucler.",
    apercu: { son: "shaker", octave: 0 },
    variantes: [
      { nom: "En croches", idee: "Plus aéré.", reglages: [], mesures: M("x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.....") },
      { nom: "Plus brillant", idee: "Le filtre s'ouvre.", reglages: [v("filter.cutoff", "115")] },
    ],
    exercices: ["ex.cutoff", "ex.level"],
  },
  {
    id: "maracas-dubtekno-echo", nom: "Maracas dans l'écho", styles: ["dub-tekno"], fonction: "percussion", element: "shaker", partie: 12, bpm: 165,
    idee: "Des maracas seulement sur les contretemps, dans un écho en doubles-croches : l'écho dessine le rythme.",
    reglages: [
      r("osc.type", "250 DoncaMaracas"), v("amp.decay", "18"),
      r("ifx.on", "ON"), r("ifx.type", "21 Delay 1/16"), v("ifx.edit", "35"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x....."),
    relance: "Le dernier contretemps manque : l'écho finit la mesure.",
    apercu: { son: "shaker", octave: 0 },
    variantes: [
      { nom: "Écho en 3/16", idee: "Plus décalé.", reglages: [r("ifx.type", "19 Delay 3/16")] },
      { nom: "Shaker", idee: "Un autre son.", reglages: [r("osc.type", "241 ShakerHit")] },
    ],
    exercices: ["ex.ifxedit"],
  },

  // =================== ROULEMENT ===================
  {
    id: "roll-acidtribe-toms", nom: "Roulement de toms vers le drop", styles: ["acid-tribe"], fonction: "percussion", element: "roll", partie: 5, bpm: 175,
    idee: "Les toms arrivent sur la mesure 3 puis montent toute la pentatonique sur la mesure 4 : le roulement annonce le retour de la ligne acide.",
    melodique: { key: "D", scale: 16 },
    reglages: [
      r("osc.type", "197 Synth Hi1"), v("amp.decay", "25"),
      r("mfx.send", "ON"),
    ],
    mesures: M("................", "................", "........0.0.1.2.", "0011223344OOOOOO"),
    relance: "Toute la mesure 4 monte, du grave à l'aigu.",
    apercu: { son: "tom", octave: 1 },
    variantes: [
      { nom: "Qui descend", idee: "Le roulement part d'en haut.", reglages: [], mesures: M("................", "................", "........O.O.4.3.", "OO44332211000000") },
      { nom: "Toms réels", idee: "Plus acoustique.", reglages: [r("osc.type", "188 Real MidHi")] },
    ],
    exercices: ["ex.pitch"],
  },
  {
    id: "roll-acidtribe-filtre", nom: "Roulement de caisse qui s'ouvre", styles: ["acid-tribe"], fonction: "percussion", element: "roll", partie: 4, bpm: 178,
    idee: "Un roulement de caisse claire passé dans un passe-haut un peu saturé : on baisse Cutoff pendant le roulement pour qu'il s'ouvre, comme la ligne acide.",
    reglages: [
      r("osc.type", "87 Snappy"), v("amp.decay", "25"),
      r("filter.hpf", "MS20 HPF"), v("filter.cutoff", "80"),
      r("ifx.on", "ON"), r("ifx.type", "2 Overdrive"), v("ifx.edit", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x...x...x.x.", "x.x.x.x.xxxxxxxx"),
    relance: "La mesure 4 est un roulement complet.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Sans saturation", idee: "Plus propre.", reglages: [r("ifx.on", "OFF")] },
      { nom: "Plus serré", idee: "Le Roller 1/32.", reglages: [r("ifx.type", "22 Roller 1/32"), v("ifx.edit", "50")] },
    ],
    astuces: [{ texte: "Enregistre Cutoff en Motion Seq pendant le roulement pour qu'il s'ouvre tout seul.", ref: OM(31) }],
    exercices: ["ex.cutoff"],
  },
  {
    id: "roll-hardtek-accel", nom: "Roulement qui accélère sur 4 mesures", styles: ["hardtek"], fonction: "percussion", element: "roll", partie: 4, bpm: 188,
    idee: "Le roulement de break typique : noires, puis croches, puis doubles-croches, et le Roller pour la dernière mesure.",
    reglages: [
      r("osc.type", "58 Sharp"), v("amp.decay", "20"),
      r("ifx.on", "ON"), r("ifx.type", "22 Roller 1/32"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x...x...x...x...", "x.x.x.x.x.x.x.x.", "xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx"),
    relance: "Toute la mesure 4 en doubles-croches, doublées par le Roller.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Sans Roller", idee: "Seulement les doubles-croches.", reglages: [r("ifx.on", "OFF")] },
      { nom: "Plus sale", idee: "Overdrive à la place.", reglages: [r("ifx.type", "2 Overdrive"), v("ifx.edit", "70")] },
    ],
    astuces: [{ texte: "Pour un crescendo, monte VELOCITY pas après pas en Step Edit (001 à 127).", ref: PG(5) }],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "roll-hardtek-claps", nom: "Roulement de claps distordus", styles: ["hardtek"], fonction: "percussion", element: "roll", partie: 4, bpm: 185,
    idee: "Des claps distordus qui se resserrent sur la mesure 4 : une relance courte et brutale avant le retour du kick.",
    reglages: [
      r("osc.type", "121 Small"), v("amp.decay", "18"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "70"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x...x.x.x.x.", "x.x.xxxxxxxxxxxx"),
    relance: "Le roulement remplit toute la mesure 4.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Qui monte", idee: "Une rampe de hauteur synchronisée au tempo.", reglages: [r("mod.type", "38 SawUpB Pitch"), v("mod.depth", "50"), v("mod.speed", "20")] },
      { nom: "Moins saturé", idee: "Plus propre.", reglages: [v("ifx.edit", "35")] },
    ],
    astuces: [{ texte: "SawUpB est synchronisé au tempo : règle Speed pour que la rampe dure une mesure.", ref: PG(14) }],
    exercices: ["ex.ifxedit", "ex.depth"],
  },
  {
    id: "roll-raggatek-rim", nom: "Roulement de rim qui part dans l'écho", styles: ["raggatek"], fonction: "percussion", element: "roll", partie: 7, bpm: 175,
    idee: "Le rimshot ragga continue trois mesures, puis se resserre en roulement sur la mesure 4 ; l'écho en 3/16 le fait « partir ».",
    reglages: [
      r("osc.type", "108 Rimmy"), v("amp.decay", "15"),
      r("ifx.on", "ON"), r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("...x..x....x..x.", "...x..x....x..x.", "...x..x....x..x.", "........x.x.xxxx"),
    relance: "La mesure 4 se tait puis roule sur sa deuxième moitié.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Plus d'écho", idee: "Le roulement traîne plus.", reglages: [v("ifx.edit", "75")] },
      { nom: "Caisse claire", idee: "Une caisse à la place du rim.", reglages: [r("osc.type", "93 Oldskool")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "roll-raggatek-pullup", nom: "Roulement « pull up »", styles: ["raggatek"], fonction: "percussion", element: "roll", partie: 4, bpm: 175,
    idee: "Une caisse claire qui roule sur la fin de la mesure 4, envoyée dans le Tape Delay : on tient le pad tactile sur les derniers coups pour un effet de « rewind » de sound system.",
    reglages: [
      r("osc.type", "87 Snappy"), v("amp.decay", "25"),
      r("mfx.send", "ON"), r("pat.mfxtype", "2 Tape Delay"), r("mfx.hold", "OFF"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x...x.x.xxxx"),
    relance: "La caisse claire roule sur la deuxième moitié de la mesure 4.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Écho qui reste", idee: "MFX Hold sur ON : l'écho reste actif quand tu lèves le doigt.", reglages: [r("mfx.hold", "ON")] },
      { nom: "Avec le Roller", idee: "Un roulement plus serré.", reglages: [r("ifx.on", "ON"), r("ifx.type", "22 Roller 1/32"), v("ifx.edit", "40")] },
    ],
    astuces: [{ texte: "Le pad tactile règle l'effet master : pose le doigt sur les derniers coups de la mesure 4.", ref: OM(29) }],
    exercices: ["ex.mfxxy"],
  },
];
