// Défis chronométrés du module « Session » (badge Pratique : ce sont des exercices de l'app, pas du manuel).
// But : finir un son ou une boucle dans le temps donné, même imparfait, au lieu de chercher la perfection.
// Un défi sans `styles` marche pour tous les styles : le style est choisi au lancement (ou par 🎲).
// Les valeurs imposées sont des numéros de la machine : SCALE (data/electribe2/sequencer.json), IFX et MFX (data/electribe2/effects.json).
import type { Style } from "./styles";

export type Duree = 10 | 15 | 30 | 60;
export type Difficulte = "facile" | "moyen" | "difficile";
export type TypeContrainte = "osc" | "parties" | "gamme" | "effet" | "bpm" | "autre";
export interface Contrainte { type: TypeContrainte; texte: string }

export interface Defi {
  id: string;
  titre: string;
  duree: Duree;
  difficulte: Difficulte;
  styles?: Style[];          // vide = tous les styles
  objectif: string;          // ce que tu dois avoir à la fin
  contraintes: Contrainte[];
  elements: string[];        // sous-catégories de Recettes utiles (kick, basse-roulante…)
  gamme?: number;            // SCALE imposée (numéro de la machine)
  key?: string;              // KEY imposée
  ifx?: number;              // Insert FX imposé
  mfx?: number;              // Master FX imposé
  bpm?: number;              // BPM imposé (sinon celui du style)
  morceau?: boolean;         // lien vers « Construire un morceau »
  perso?: boolean;           // défi créé par Alex
  machine?: string;          // machine du défi (absent = electribe2). Chaque machine a ses défis et ses sessions.
}

export const DUREES: Duree[] = [10, 15, 30, 60];
export const DIFFICULTES: { id: Difficulte; nom: string; couleur: string }[] = [
  { id: "facile", nom: "Facile", couleur: "#4fd18b" },
  { id: "moyen", nom: "Moyen", couleur: "#ffb020" },
  { id: "difficile", nom: "Difficile", couleur: "#ff6b70" },
];
export const TYPES_CONTRAINTE: { id: TypeContrainte; nom: string }[] = [
  { id: "osc", nom: "Un seul oscillateur" },
  { id: "parties", nom: "Nombre de parties" },
  { id: "gamme", nom: "Gamme imposée" },
  { id: "effet", nom: "Effet imposé" },
  { id: "bpm", nom: "BPM imposé" },
  { id: "autre", nom: "Autre contrainte" },
];

const C = (type: TypeContrainte, texte: string): Contrainte => ({ type, texte });

export const DEFIS: Defi[] = [
  // ---------------- 10 minutes ----------------
  { id: "kick-10", titre: "Un kick qui cogne en 10 min", duree: 10, difficulte: "facile", elements: ["kick"],
    objectif: "Un kick sur les 4 temps, sauvegardé dans un motif.", contraintes: [C("parties", "Une seule partie : le kick.")] },
  { id: "hat-10", titre: "Un charleston fermé qui sautille", duree: 10, difficulte: "facile", elements: ["hat-ferme"],
    objectif: "Un charleston fermé sur 1 mesure, avec au moins 2 pas plus faibles.", contraintes: [C("bpm", "Au BPM du style choisi, sans y toucher.")] },
  { id: "clap-10", titre: "Un clap sur 2 et 4", duree: 10, difficulte: "facile", elements: ["clap"],
    objectif: "Un clap sur les temps 2 et 4, avec un peu de réverbe ou pas du tout.", contraintes: [C("parties", "Deux parties maximum : kick et clap.")] },
  { id: "sub-10", titre: "Un sub en Ré mineur sous le kick", duree: 10, difficulte: "facile", elements: ["sub", "kick"], gamme: 7, key: "D",
    objectif: "Un sub qui tient sous le kick sans le cacher.", contraintes: [C("gamme", "KEY = D, SCALE = 7 Aeolian.")] },
  { id: "shaker-10", titre: "Un shaker en doubles croches", duree: 10, difficulte: "facile", elements: ["shaker"],
    objectif: "16 pas de shaker avec un accent tous les 2 pas.", contraintes: [C("effet", "Un seul Insert FX, ou aucun.")] },
  { id: "impact-10", titre: "Un impact pour lancer le drop", duree: 10, difficulte: "facile", elements: ["impact"],
    objectif: "Un boom sur le pas 1 de la mesure 1, qui sonne gros mais court.", contraintes: [C("parties", "Une seule partie.")] },
  { id: "kick-sec-10", titre: "Un kick sans effet", duree: 10, difficulte: "moyen", elements: ["kick"],
    objectif: "Le kick doit taper fort avec l'oscillateur, le filtre et l'enveloppe seulement.", contraintes: [C("effet", "IFX Off et MFX Send Off sur la partie du kick.")] },
  { id: "roll-10", titre: "Un roulement de fin de phrase", duree: 10, difficulte: "moyen", elements: ["roll", "snare"],
    objectif: "Un roulement sur la mesure 4 qui annonce la suite.", contraintes: [C("autre", "Le roulement tient dans les 8 derniers pas.")] },

  // ---------------- 15 minutes ----------------
  { id: "kick-mentale-15", titre: "Un kick mentale en 15 min", duree: 15, difficulte: "moyen", styles: ["mentale"], elements: ["kick"],
    objectif: "Un kick sombre et lourd, qui donne envie de rester sur la boucle.", contraintes: [C("parties", "Une seule partie : le kick.")] },
  { id: "basse-rem-15", titre: "Une basse roulante en Ré mineur en 15 min", duree: 15, difficulte: "moyen", elements: ["basse-roulante", "kick"], gamme: 7, key: "D",
    objectif: "Une basse entre les kicks, sur 1 mesure qui tourne.", contraintes: [C("gamme", "KEY = D, SCALE = 7 Aeolian."), C("parties", "Deux parties maximum : kick et basse.")] },
  { id: "kick-tribe-15", titre: "Un kick tribe rond", duree: 15, difficulte: "facile", styles: ["tribe"], elements: ["kick"],
    objectif: "Un kick rond qui laisse de la place aux percussions.", contraintes: [C("parties", "Une seule partie.")] },
  { id: "kick-hardtek-15", titre: "Un kick hardtek saturé", duree: 15, difficulte: "moyen", styles: ["hardtek"], elements: ["kick"], ifx: 3,
    objectif: "Un kick très saturé qui reste lisible.", contraintes: [C("effet", "Insert FX = 3 Distortion.")] },
  { id: "acid-15", titre: "Une ligne acide qui siffle", duree: 15, difficulte: "moyen", styles: ["acid-tribe"], elements: ["acid"],
    objectif: "Une ligne de 16 pas avec au moins 2 glides et une résonance qui chante.", contraintes: [C("osc", "Un seul oscillateur pour la ligne, sans en changer.")] },
  { id: "congas-15", titre: "Des congas qui galopent", duree: 15, difficulte: "facile", styles: ["tribe"], elements: ["congas"],
    objectif: "Une partie de congas sur 1 mesure qui répond au kick.", contraintes: [C("parties", "Trois parties maximum.")] },
  { id: "toms-15", titre: "Des toms tribaux", duree: 15, difficulte: "moyen", styles: ["tribe", "acid-tribe"], elements: ["toms"],
    objectif: "Deux hauteurs de toms qui se répondent sur 2 mesures.", contraintes: [C("autre", "Les toms ne jouent jamais sur le même pas que le kick.")] },
  { id: "stab-15", titre: "Un stab en Phrygien", duree: 15, difficulte: "moyen", elements: ["stab"], gamme: 4,
    objectif: "Un stab court qui revient tous les 2 temps.", contraintes: [C("gamme", "SCALE = 4 Phrygian, KEY au choix.")] },
  { id: "nappe-dub-15", titre: "Une nappe dub avec Tape Delay", duree: 15, difficulte: "facile", styles: ["dub-tekno"], elements: ["nappe"], mfx: 2,
    objectif: "Une nappe qui respire, avec des échos qui remplissent l'espace.", contraintes: [C("effet", "Master FX = 2 Tape Delay.")] },
  { id: "lead-4-15", titre: "Un lead de 4 notes maximum", duree: 15, difficulte: "moyen", elements: ["lead"],
    objectif: "Un lead mémorisable sur 2 mesures.", contraintes: [C("autre", "4 notes différentes au maximum."), C("gamme", "La gamme du style choisi.")] },
  { id: "arpege-15", titre: "Un arpège en minor Penta", duree: 15, difficulte: "facile", elements: ["arpege"], gamme: 16,
    objectif: "Un arpège de 16 pas qui tourne sans fatiguer.", contraintes: [C("gamme", "SCALE = 16 minor Penta.")] },
  { id: "skank-15", titre: "Un skank à contretemps", duree: 15, difficulte: "moyen", styles: ["raggatek"], elements: ["stab"],
    objectif: "Un accord court sur chaque contretemps.", contraintes: [C("parties", "Deux parties maximum : kick et skank.")] },
  { id: "kick-sub-15", titre: "Kick + sub sans que ça bave", duree: 15, difficulte: "difficile", elements: ["kick", "sub"],
    objectif: "Le kick et le sub s'entendent tous les deux, même à fort volume.", contraintes: [C("parties", "Deux parties exactement."), C("effet", "Aucun Master FX.")] },
  { id: "drone-15", titre: "Un drone inquiétant en Locrian", duree: 15, difficulte: "moyen", styles: ["mentale"], elements: ["drone"], gamme: 8,
    objectif: "Un drone qui bouge lentement sur 4 mesures.", contraintes: [C("gamme", "SCALE = 8 Locrian."), C("autre", "Une seule note tenue, le mouvement vient du filtre ou du LFO.")] },
  { id: "fill-15", titre: "Un fill de mesure 4", duree: 15, difficulte: "moyen", elements: ["fill"],
    objectif: "3 mesures normales, puis une mesure 4 qui relance.", contraintes: [C("autre", "Tu ne modifies que la mesure 4.")] },

  // ---------------- 30 minutes ----------------
  { id: "groove-30", titre: "4 mesures complètes kick + basse + hats en 30 min", duree: 30, difficulte: "moyen", elements: ["kick", "basse-roulante", "hat-ferme"],
    objectif: "4 mesures (64 pas) qui tournent, avec une relance en mesure 4.", contraintes: [C("parties", "Trois parties maximum.")] },
  { id: "tribe-perc-30", titre: "Une boucle tribe de percussions", duree: 30, difficulte: "moyen", styles: ["tribe"], elements: ["kick", "congas", "toms", "shaker"],
    objectif: "Kick, congas, toms et shaker qui galopent ensemble sur 4 mesures.", contraintes: [C("parties", "Cinq parties maximum.")] },
  { id: "acid-monte-30", titre: "Kick + acid qui monte", duree: 30, difficulte: "moyen", styles: ["acid-tribe"], elements: ["kick", "acid"],
    objectif: "La ligne acide s'ouvre sur les 4 mesures grâce au Motion Seq.", contraintes: [C("parties", "Deux parties."), C("autre", "Le Cutoff de l'acid bouge avec le Motion Seq.")] },
  { id: "mentale-30", titre: "Une boucle mentale hypnotique", duree: 30, difficulte: "moyen", styles: ["mentale"], elements: ["kick", "drone", "riff"],
    objectif: "Une boucle qui ne lasse pas après 2 minutes d'écoute.", contraintes: [C("parties", "Trois parties maximum.")] },
  { id: "hardtek-30", titre: "Kick saturé + basse roulante à 190 BPM", duree: 30, difficulte: "difficile", styles: ["hardtek"], elements: ["kick", "basse-roulante"], bpm: 190,
    objectif: "Un kick et une basse qui tiennent à 190 BPM sans se marcher dessus.", contraintes: [C("bpm", "BPM = 190."), C("parties", "Deux parties.")] },
  { id: "dub-30", titre: "Une boucle dub tekno avec un seul Master FX", duree: 30, difficulte: "moyen", styles: ["dub-tekno"], elements: ["kick", "stab", "nappe"], mfx: 2,
    objectif: "Kick, stab et nappe, avec les échos qui font le mouvement.", contraintes: [C("effet", "Master FX = 2 Tape Delay, rien d'autre.")] },
  { id: "raggatek-30", titre: "Kick, basse et skank", duree: 30, difficulte: "moyen", styles: ["raggatek"], elements: ["kick", "basse-roulante", "stab"],
    objectif: "Une boucle chaloupée qui garde l'énergie tekno.", contraintes: [C("parties", "Trois parties.")] },
  { id: "un-osc-30", titre: "Une boucle complète avec un seul oscillateur", duree: 30, difficulte: "difficile", elements: ["kick", "basse-roulante", "hat-ferme"],
    objectif: "Kick, basse et charleston, tous avec le même numéro d'oscillateur.", contraintes: [C("osc", "Le même oscillateur sur toutes les parties : seuls le filtre, l'enveloppe et les effets changent.")] },
  { id: "break-30", titre: "Un break de 4 mesures puis la relance", duree: 30, difficulte: "moyen", elements: ["break", "montee"], morceau: true,
    objectif: "Deux motifs : le break sans kick, puis la relance avec le kick.", contraintes: [C("autre", "Le break et la relance sont deux motifs sauvegardés.")] },
  { id: "arabic-30", titre: "Une mélodie en Arabic", duree: 30, difficulte: "difficile", elements: ["lead", "riff"], gamme: 20,
    objectif: "Un riff de 2 mesures et sa réponse sur les 2 suivantes.", contraintes: [C("gamme", "SCALE = 20 Arabic.")] },
  { id: "squelette-30", titre: "Kick, clap, hats : le squelette", duree: 30, difficulte: "facile", elements: ["kick", "clap", "hat-ferme", "hat-ouvert"],
    objectif: "Une rythmique de 4 mesures prête à recevoir une basse.", contraintes: [C("parties", "Quatre parties maximum.")] },
  { id: "montee-30", titre: "Une montée de 4 mesures avec Motion Seq", duree: 30, difficulte: "moyen", elements: ["montee", "noise"],
    objectif: "Une montée qui donne vraiment envie du drop.", contraintes: [C("autre", "Au moins un potard enregistré dans le Motion Seq.")] },
  { id: "coupure-30", titre: "Coupure + impact avant le retour du kick", duree: 30, difficulte: "moyen", elements: ["coupure", "impact"], morceau: true,
    objectif: "Un silence court, un impact, puis le kick qui revient.", contraintes: [C("effet", "Master FX au choix, mais un seul.")] },
  { id: "pumper-30", titre: "Tout passe par le Pumper", duree: 30, difficulte: "moyen", elements: ["kick", "nappe", "basse-roulante"], ifx: 36,
    objectif: "Une boucle où la nappe et la basse respirent avec le kick.", contraintes: [C("effet", "Insert FX = 36 Pumper sur la nappe et la basse.")] },

  // ---------------- 60 minutes ----------------
  { id: "tribe-60", titre: "Un morceau tribe avec intro, break et drop en 60 min", duree: 60, difficulte: "difficile", styles: ["tribe"], elements: ["kick", "congas", "toms", "break"], morceau: true,
    objectif: "Au moins 3 motifs chaînés : intro, break, drop.", contraintes: [C("autre", "Intro, break et drop sont trois motifs différents.")] },
  { id: "tekno-60", titre: "Un morceau tekno en 5 parties max", duree: 60, difficulte: "moyen", styles: ["tekno"], elements: ["kick", "basse-roulante", "hat-ferme", "stab"], morceau: true,
    objectif: "Un morceau qui avance par ajouts et retraits de parties.", contraintes: [C("parties", "Cinq parties maximum dans tout le morceau.")] },
  { id: "acid-60", titre: "Un morceau acid tribe sur 3 motifs chaînés", duree: 60, difficulte: "difficile", styles: ["acid-tribe"], elements: ["kick", "acid", "toms"], morceau: true,
    objectif: "3 motifs où la ligne acide évolue de l'un à l'autre.", contraintes: [C("osc", "Un seul oscillateur pour la ligne acide.")] },
  { id: "mentale-60", titre: "Un morceau mentale qui évolue sans ajouter de partie", duree: 60, difficulte: "difficile", styles: ["mentale"], elements: ["kick", "drone", "riff", "noise"], morceau: true,
    objectif: "Tout le mouvement vient des potards et du Motion Seq.", contraintes: [C("parties", "Quatre parties, fixées dès le début."), C("autre", "Tu n'ajoutes ni ne retires de partie : tu les fais évoluer.")] },
  { id: "hardtek-60", titre: "Un morceau hardtek à 195 BPM", duree: 60, difficulte: "difficile", styles: ["hardtek"], elements: ["kick", "basse-roulante", "stab", "montee"], bpm: 195, morceau: true,
    objectif: "Intro, montée, drop : l'énergie ne retombe jamais.", contraintes: [C("bpm", "BPM = 195.")] },
  { id: "dub-60", titre: "Un morceau dub tekno qui respire", duree: 60, difficulte: "moyen", styles: ["dub-tekno"], elements: ["kick", "stab", "nappe", "sub"], morceau: true,
    objectif: "Peu d'éléments, beaucoup d'espace : les échos font le morceau.", contraintes: [C("parties", "Quatre parties maximum.")] },
  { id: "raggatek-60", titre: "Un morceau raggatek avec voix", duree: 60, difficulte: "moyen", styles: ["raggatek"], elements: ["kick", "basse-roulante", "stab", "voix"], morceau: true,
    objectif: "Une partie voix ou sample vocal qui revient dans chaque section.", contraintes: [C("autre", "La voix apparaît dans au moins 2 motifs.")] },
  { id: "jam-60", titre: "Prépare et enregistre une jam de 10 minutes", duree: 60, difficulte: "facile", elements: ["kick", "basse-roulante", "hat-ferme", "nappe"],
    objectif: "45 min pour préparer 2 ou 3 motifs, puis une prise live de 10 min sans t'arrêter.", contraintes: [C("autre", "La prise ne s'arrête pas, même en cas d'erreur.")] },
  { id: "un-effet-60", titre: "Un morceau avec un seul effet : le Pumper", duree: 60, difficulte: "difficile", elements: ["kick", "basse-roulante", "nappe"], ifx: 36, morceau: true,
    objectif: "Un morceau complet où le seul effet utilisé est le Pumper.", contraintes: [C("effet", "Insert FX = 36 Pumper uniquement, MFX Send Off partout.")] },
];
