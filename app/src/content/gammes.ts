// Gammes et tonalités.
// Liste exacte des 35 gammes et leurs notes en Do : Guide des paramètres p. 15 (data/electribe2/sequencer.json).
// Le sens des noms, le caractère et les favoris par style sont des explications de solfège
// et des conseils : badge « Pratique », ils ne viennent pas du manuel.
import type { Source } from "../lib/data";
import { pas, type Pas, type Son } from "../lib/seq";

export const PG = (page: number): Source => ({ doc: "PG", page });
export const OM = (page: number): Source => ({ doc: "OM", page });

/** Les 12 notes, de Do à Si, écrites comme l'écran de l'E2 (dièses seulement). `fr` = nom français. */
export const NOTES12 = [
  { en: "C", fr: "Do", noire: false },
  { en: "C#", fr: "Do#", noire: true },
  { en: "D", fr: "Ré", noire: false },
  { en: "D#", fr: "Ré#", noire: true },
  { en: "E", fr: "Mi", noire: false },
  { en: "F", fr: "Fa", noire: false },
  { en: "F#", fr: "Fa#", noire: true },
  { en: "G", fr: "Sol", noire: false },
  { en: "G#", fr: "Sol#", noire: true },
  { en: "A", fr: "La", noire: false },
  { en: "A#", fr: "La#", noire: true },
  { en: "B", fr: "Si", noire: false },
];

export interface GammeInfo { sens: string; caractere: string; styles?: ("tribe" | "tekno" | "mentale")[] }

/** Explications par numéro de gamme (Pratique). */
export const INFO: Record<number, GammeInfo> = {
  1: { sens: "Les 12 notes, toutes les touches blanches et noires.", caractere: "Aucune couleur particulière : toutes les notes sont permises. Pratique pour les effets et les montées." },
  2: { sens: "La gamme majeure (en Do : seulement les touches blanches).", caractere: "Joyeuse, lumineuse, stable." },
  3: { sens: "« Dorien » : une gamme mineure dont la 6e note est plus haute.", caractere: "Sombre mais groovy, moins triste que le mineur naturel.", styles: ["tekno"] },
  4: { sens: "« Phrygien » : une gamme mineure avec un demi-ton juste après la note de départ.", caractere: "Très sombre et tendue, couleur orientale ou espagnole.", styles: ["mentale", "tribe"] },
  5: { sens: "« Lydien » : la gamme majeure avec une 4e note plus haute.", caractere: "Flottante, rêveuse, un peu irréelle." },
  6: { sens: "« Mixolydien » : la gamme majeure avec une 7e note plus basse.", caractere: "Brute, rock, un peu blues." },
  7: { sens: "« Éolien » = le mineur naturel, la gamme mineure de base.", caractere: "Sombre, mélancolique. La base la plus courante en tekno.", styles: ["tekno", "tribe", "mentale"] },
  8: { sens: "« Locrien » : la gamme où la 5e note est baissée.", caractere: "La plus instable : tout sonne tendu, inquiétant.", styles: ["mentale"] },
  9: { sens: "Mineur harmonique : le mineur naturel avec une 7e note plus haute.", caractere: "Dramatique, orientale, à cause du grand saut entre la 6e et la 7e note.", styles: ["mentale"] },
  10: { sens: "Mineur mélodique : mineur en bas, majeur en haut.", caractere: "Ambiguë, jazzy." },
  11: { sens: "Gamme de blues majeure : 6 notes.", caractere: "Joyeuse avec une note de tension « blues »." },
  12: { sens: "Gamme de blues mineure : la pentatonique mineure + une note de tension.", caractere: "Rugueuse, funky." },
  13: { sens: "« Diminuée » : alternance régulière ton / demi-ton, 8 notes.", caractere: "Tendue, symétrique, ambiance film d'action." },
  14: { sens: "« Diminuée combinée » : alternance demi-ton / ton, 8 notes.", caractere: "Tendue, dissonante." },
  15: { sens: "Pentatonique majeure : 5 notes, aucun demi-ton.", caractere: "Ouverte, joyeuse, difficile de jouer faux." },
  16: { sens: "Pentatonique mineure : 5 notes, aucun demi-ton.", caractere: "Sombre mais sans fausse note possible : idéale pour basses et leads.", styles: ["tekno", "tribe"] },
  17: { sens: "Raga indien « Bhairav ».", caractere: "Solennelle, mystique." },
  18: { sens: "Raga indien « Gamanasrama ».", caractere: "Lumineuse et étrange." },
  19: { sens: "Raga indien « Todi ».", caractere: "Tendue, mystérieuse." },
  20: { sens: "Gamme « arabe ».", caractere: "Orientale : majeure en bas, sombre en haut." },
  21: { sens: "Gamme « espagnole » : le phrygien avec une note en plus (8 notes).", caractere: "Flamenco, orientale, très tendue.", styles: ["mentale"] },
  22: { sens: "Gamme « tzigane ».", caractere: "Orientale, dramatique, avec de grands écarts." },
  23: { sens: "Gamme « égyptienne » : 5 notes, sans tierce.", caractere: "Neutre, hypnotique." },
  24: { sens: "Gamme « hawaïenne ».", caractere: "Mineure mais douce, ensoleillée." },
  25: { sens: "« Pelog » : gamme du gamelan indonésien.", caractere: "Étrange, métallique, hypnotique." },
  26: { sens: "Gamme « japonaise » : 5 notes avec des demi-tons.", caractere: "Mélancolique, asiatique." },
  27: { sens: "« Ryukyu » : gamme d'Okinawa.", caractere: "Lumineuse, apaisée." },
  28: { sens: "Gamme « chinoise » : 5 notes.", caractere: "Lumineuse, asiatique." },
  29: { sens: "« Ligne de basse » : seulement 3 notes (départ, 5e, 7e).", caractere: "Une basse qui tape sans jamais sonner faux.", styles: ["tribe", "tekno"] },
  30: { sens: "« Par tons » : rien que des écarts d'un ton.", caractere: "Flottante, comme un rêve." },
  31: { sens: "Notes séparées d'un ton et demi.", caractere: "Tendue, inquiétante." },
  32: { sens: "Notes séparées de deux tons.", caractere: "Étrange, suspendue." },
  33: { sens: "Notes séparées d'une quarte (2 tons et demi).", caractere: "Riffs ouverts, puissants." },
  34: { sens: "La note de départ et sa quinte.", caractere: "Puissante, ni majeure ni mineure.", styles: ["tribe"] },
  35: { sens: "Une seule note, répétée d'octave en octave.", caractere: "Parfaite pour les basses tribe qui sautent d'octave.", styles: ["tribe"] },
};

export const STYLES = {
  tekno: "Tekno",
  tribe: "Tribe",
  mentale: "Mentale",
} as const;

/** Motifs d'exemple sur 4 mesures (64 pas) : rang de la note dans la gamme (0 = note de départ, 1 = la suivante…),
 *  "O" = note de départ une octave plus haut, "~" = la note continue, "." = silence (voir pas() dans lib/seq.ts).
 *  Mesures 1 à 3 : le motif avec de petites variations ; mesure 4 : la relance. */
export type { Pas } from "../lib/seq";
export const MOTIFS: { id: string; nom: string; mesures: Pas[][]; son: Son; octave: number }[] = [
  { id: "basse", nom: "Basse roulante", son: "synth", octave: 0, mesures: [pas("0.00.01.0.02.03."), pas("0.00.01.0.02.03."), pas("0.00.01.0.02.04."), pas("0.00.01.04.3.21.")] },
  { id: "lead", nom: "Lead acide", son: "synth", octave: 1, mesures: [pas("00O0203000O04321"), pas("00O0203000O04321"), pas("00O0203000O05432"), pas("00O02030O0O0O~~~")] },
  { id: "tribe", nom: "Tribe qui saute d'octave", son: "synth", octave: 0, mesures: [pas("0.O.00O.0.O0.0O."), pas("0.O.00O.0.O0.0O."), pas("0.O.00O.0.O0.OO."), pas("0.O.00O.O.O.OOOO")] },
];

export const BPM = 165;
