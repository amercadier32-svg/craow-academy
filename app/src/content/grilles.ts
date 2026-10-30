// Grilles de séquenceur : des motifs complets (plusieurs parties jouées ensemble) sur 4 mesures, à 165-170 BPM.
// Chaque partie reprend le son d'une recette (réglages vérifiés par npm run check) et a ses propres 4 mesures.
// Un motif de l'E2 n'a qu'une KEY et une SCALE (Guide p. 3) : toutes les notes sont écrites dans la gamme de la grille.
// Ce sont des exemples de style : badge « Pratique ».
// Mesures : même écriture que les recettes ("." silence, "x" coup, "0"-"9" rang dans la gamme, "O" octave, "~" tenue).
import type { Source } from "../lib/data";
import { pas, type Pas } from "../lib/seq";
import type { StyleBase as Style } from "./recettes";

export interface PisteGrille { recette: string; mesures: Pas[][] }

export interface Grille {
  id: string;
  nom: string;
  style: Style;
  bpm: number;
  key: string;
  scale: number;
  idee: string;
  lecture: string[];           // ce qu'il faut regarder sur la grille (Pratique)
  pistes: PisteGrille[];       // partie 1, 2, 3… dans l'ordre
  astuces?: { texte: string; ref?: Source }[];
}

const OM = (page: number): Source => ({ doc: "OM", page });
const PG = (page: number): Source => ({ doc: "PG", page });
const P = (recette: string, ...m: [string, string, string, string]): PisteGrille => ({ recette, mesures: m.map(pas) });

export const GRILLES: Grille[] = [
  {
    id: "tribe-roulante", nom: "Tribe roulante", style: "tribe", bpm: 165, key: "D", scale: 7,
    idee: "Le socle tribe : kick saturé, basse hachée entre les temps, djembé en 3 + 3 + 2, shaker continu.",
    lecture: [
      "Le kick tombe sur les pads 1, 5, 9, 13 : les 4 temps de la mesure.",
      "La basse joue seulement là où le kick ne joue pas : ils ne se marchent pas dessus.",
      "Le djembé fait 3 + 3 + 2 pas : c'est lui qui donne le balancement tribal.",
      "Mesure 4 : tout le monde relance en même temps.",
    ],
    pistes: [
      P("kick-tribe", "x...x...x...x...", "x...x...x...x...", "x...x...x...x..x", "x...x...x.x.x.xx"),
      P("basse-hachee", ".0O0.0O0.0O0.O0O", ".0O0.0O0.0O0.O0O", ".0O0.0O0.0OO.O0O", ".0O0.0O0.O.O.O.O"),
      P("percu-tresillo", "x..x..x.x..x..x.", "x..x..x.x..x..x.", "x..x..x.x..x.xx.", "x..x..x.x.x.xxxx"),
      P("shaker-tribe", "x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxxxxx", "xxxxxxxxxxxxxxxx"),
      P("hat-ouvert", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x.x.xx"),
    ],
    astuces: [
      { texte: "Coupe une partie avec Part Mute pour entendre ce qu'elle apporte.", ref: OM(32) },
    ],
  },
  {
    id: "tribe-toms", nom: "Tribe toms et quinte", style: "tribe", bpm: 168, key: "D", scale: 34,
    idee: "Tout est en 5th Interval : seulement D et A. Les toms, le sub et le drone sonnent forcément ensemble.",
    lecture: [
      "Avec la gamme 5th Interval, les pads ne jouent que deux notes (D et A) : impossible de sonner faux.",
      "Les toms répondent au kick sur les pas 7 et 14.",
      "Le drone tient une note par mesure et passe sur A en mesure 4.",
    ],
    pistes: [
      P("kick-tribe", "x...x...x...x...", "x...x...x...x...", "x...x...x...x..x", "x...x...x.x.x.xx"),
      P("sub-tribe", "..0...0...0...0.", "..0...0...0...0.", "..0...0...0...1.", "..0...0...0.0.2."),
      P("toms-tribaux", "0.....1...0..1..", "0.....1...0..1..", "0.....1...0..1.2", "2.2.1.1.0.0.0.00"),
      P("percu-tresillo", "x..x..x.x..x..x.", "x..x..x.x..x..x.", "x..x..x.x..x.xx.", "x..x..x.x..x.xx."),
      P("drone-tribe", "0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~1~~~~~~~"),
    ],
  },
  {
    id: "tribe-hypnotique", nom: "Tribe hypnotique et break", style: "tribe", bpm: 170, key: "D", scale: 4,
    idee: "Un lead de 3 pas qui tourne en Phrygian, et un break de caisse claire qui relance toutes les 4 mesures.",
    lecture: [
      "Le lead répète un motif de 3 pas : il retombe chaque fois à un autre endroit par rapport au kick.",
      "La caisse claire ne joue presque pas, puis roule en mesure 4.",
      "En mesure 4, le kick s'arrête au milieu pour laisser place au roulement.",
    ],
    pistes: [
      P("kick-tribe", "x...x...x...x...", "x...x...x...x...", "x...x...x...x..x", "x...x...........",),
      P("sub-tribe", "..0...0...0...0.", "..0...0...0...0.", "..0...0...0...3.", "..0...0........."),
      P("lead-hypnotique", "1.01.01.01.01.01", "1.01.01.01.01.01", "1.01.01.01.01.03", "1.01.01.03.03.0O"),
      P("shaker-tribe", "x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxxxxx", "x.xxx.xx........"),
      P("break-tribe", "................", "................", "............x...", "x...x...x.x.xxxx"),
    ],
    astuces: [
      { texte: "Pour jouer ce motif plusieurs fois puis passer à un autre : CHAIN TO et CHAIN REPEAT dans le motif.", ref: PG(3) },
      { texte: "Le chaînage marche seulement avec CHAIN MODE = On dans Global.", ref: PG(8) },
    ],
  },
  {
    id: "mentale-sombre", nom: "Mentale sombre", style: "mentale", bpm: 170, key: "D", scale: 9,
    idee: "Kick distordu, reese qui frotte, clap cassé et bruits hachés sur un drone en mineur harmonique.",
    lecture: [
      "La reese tient ses notes 4 pas (une noire) : elle remplit tout l'espace grave entre les kicks.",
      "Le clap est sur les temps 2 et 4 (pads 5 et 13).",
      "Les bruits tombent à des endroits irréguliers : ils rendent la grille inquiétante.",
      "Mesure 4 : la reese insiste sur C#, la note la plus tendue de la gamme.",
    ],
    pistes: [
      P("kick-distordu", "x...x...x...x...", "x...x...x...x...", "x...x...x...x..x", "x...x...x..xx.xx"),
      P("reese-mentale", "0~~~0~~~0~~~1~~~", "0~~~0~~~0~~~1~~~", "0~~~0~~~5~~~4~~~", "0~0~0~0~6~6~6~6~"),
      P("clap-mentale", "....x.......x...", "....x.......x...", "....x.......x..x", "....x...x.x.xxxx"),
      P("noise-mentale", "..x...x..x..x..x", "..x...x..x..x..x", "..x...x..x..xx.x", "..x.x.x.xxxxxxxx"),
      P("drone-sombre", "0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~~~~~~~~~", "0~~~~~~~5~~~6~~~"),
    ],
  },
  {
    id: "mentale-acide", nom: "Mentale acide", style: "mentale", bpm: 170, key: "D", scale: 4,
    idee: "Un acide agressif en Phrygian, des stabs qui grincent, un charley qui court et une montée sur la mesure 4.",
    lecture: [
      "L'acide joue presque tous les pas : c'est la partie principale.",
      "Les stabs sont rares, sur des contretemps : ils ponctuent.",
      "La montée occupe toute la mesure 4 et annonce la reprise.",
    ],
    pistes: [
      P("kick-distordu", "x...x...x...x...", "x...x...x...x...", "x...x...x...x..x", "x...x...x..xx.xx"),
      P("acide-agressif", "001O0010O0100O10", "001O0010O0100O10", "001O0010O0100O13", "O1O1O1O1O0O0O~~~"),
      P("stab-dissonant", "..0.....0.....0.", "..0.....0.....0.", "..0.....0..1..0.", "..0..0..1..1.4.4"),
      P("hat-ferme", "xx.xxx.xxx.xxx.x", "xx.xxx.xxx.xxx.x", "xx.xxx.xxx.xxxxx", "xx.xxx.xxxxxxxxx"),
      P("montee-mentale", "................", "................", "........0~~~~~~~", "0~~~~~~~~~~~~~~~"),
    ],
  },
  {
    id: "tekno-roule", nom: "Tekno qui roule", style: "tekno", bpm: 165, key: "D", scale: 7,
    idee: "La grille tekno de base : kick sur les temps, basse roulante, charleys fermé et ouvert, clap, stab.",
    lecture: [
      "Kick sur les 4 temps, charley ouvert entre deux kicks : le « boum-tchi ».",
      "La basse joue 3 notes entre chaque kick.",
      "Le clap marque les temps 2 et 4.",
    ],
    pistes: [
      P("kick-tekno", "x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x...x.x."),
      P("basse-roulante", ".000.000.000.030", ".000.000.000.040", ".000.000.000.0O0", ".000.000.0.0.343"),
      P("hat-ferme", "xx.xxx.xxx.xxx.x", "xx.xxx.xxx.xxx.x", "xx.xxx.xxx.xxxxx", "xx.xxx.xxxxxxxxx"),
      P("hat-ouvert", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x.x.xx"),
      P("clap-tekno", "....x.......x...", "....x.......x...", "....x.......x...", "....x.......x.xx"),
      P("stab-tekno", "..0..0....0..0..", "..0..0....0..0..", "..0..0....0..3..", "..0..0..3.3.4.4."),
    ],
  },
];

/** Grille vide pour composer : 4 parties de départ. */
export const GRILLE_VIDE: Grille = {
  id: "ma-grille", nom: "Ma grille (vide)", style: "tribe", bpm: 165, key: "D", scale: 7,
  idee: "Une grille vide avec un kick, une basse, un charley et un clap. Allume les pads pour composer.",
  lecture: ["Commence par le kick sur les pads 1, 5, 9, 13, puis ajoute la basse entre les kicks."],
  pistes: ["kick-tribe", "basse-roulante", "hat-ferme", "clap-tekno"].map((r) => P(r, "................", "................", "................", "................")),
};

export const STYLE_GRILLE: Record<Style, string> = { tekno: "Tekno", tribe: "Tribe", mentale: "Mentale" };
/** Couleur de chaque style de grille (« vide » = la grille vide). */
export const COULEUR_GRILLE: Record<string, string> = { tribe: "#ff6a3d", mentale: "#9b6bff", tekno: "#6aa2ee", vide: "#4fd18b" };
