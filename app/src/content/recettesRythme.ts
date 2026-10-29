// Recettes RYTHMIQUE : kick, charleston fermé et ouvert, clap, caisse claire, toms, congas et percussions tribales,
// shaker, ride / cymbale, roulement. Mêmes règles que recettes.ts (badge « Pratique ») :
//   r(id, valeur) = valeur prise dans une liste du manuel (vérifiée par npm run check),
//   v(id, valeur) = valeur de potard sans plage dans le manuel, affichée « à vérifier sur l'écran ».
// Mesures : un caractère par pas, 16 par mesure. "." silence, "x" un coup, "0"…"9" rang de la note dans la gamme,
// "O" la KEY une octave plus haut, "~" la note d'avant continue. Mesure 4 = la relance.
import type { Source } from "../lib/data";
import { pas } from "../lib/seq";
import type { Recette, Reglage } from "./recettes";

const r = (param: string, valeur: string): Reglage => ({ param, valeur });
const v = (param: string, valeur: string): Reglage => ({ param, valeur, aVerifier: true });
const PG = (page: number): Source => ({ doc: "PG", page });
const OM = (page: number): Source => ({ doc: "OM", page });
const M = (...m: [string, string, string, string]) => m.map(pas);

export const RECETTES_RYTHME: Recette[] = [
  // =================== KICK ===================
  {
    id: "kick-rond-tribe", nom: "Kick rond qui chante", styles: ["tribe"], fonction: "kick", element: "kick", partie: 1,
    idee: "Un kick long et grave qui tient un peu entre les temps : en tribe, il porte la danse et laisse de la place aux percussions.",
    reglages: [
      r("osc.type", "15 Subsonic"), r("part.voiceassign", "Mono2"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "85"), v("amp.level", "110"),
      r("ifx.on", "ON"), r("ifx.type", "1 Punch"), v("ifx.edit", "45"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x...x.xx"),
    relance: "Deux coups rapides sur 4.15 et 4.16 qui relancent la boucle.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Plus sec", idee: "Le kick s'arrête avant le temps suivant.", reglages: [v("amp.decay", "55")] },
      { nom: "Autre corps", idee: "Un kick plus boisé de la liste.", reglages: [r("osc.type", "45 Warm")] },
    ],
    astuces: [{ texte: "MFX Send éteint : le kick ne passe pas dans l'effet master et reste net.", ref: OM(29) }],
    exercices: ["ex.decay"],
  },
  {
    id: "kick-hardcore-mentale", nom: "Kick hardcore saturé", styles: ["mentale"], fonction: "kick", element: "kick", partie: 1, bpm: 180,
    idee: "Un kick très dur, distordu, avec une queue qui grogne : la base de la mentale rapide.",
    reglages: [
      r("osc.type", "27 Harder"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "electribe LPF"), v("filter.cutoff", "100"), v("filter.resonance", "20"),
      r("amp.eg", "ON"), v("amp.attack", "0"), v("amp.decay", "70"), v("amp.level", "100"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "70"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x.x.xxxx"),
    relance: "Le kick passe en croches puis en doubles sur la fin.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Moins de queue", idee: "Plus de place pour la basse.", reglages: [v("amp.decay", "45")] },
      { nom: "Plus sombre", idee: "On ferme le filtre pour enlever le grésillement.", reglages: [v("filter.cutoff", "70")] },
    ],
    astuces: [{ texte: "La distorsion monte le volume : baisse Level si le kick sature la sortie.", ref: OM(23) }],
    exercices: ["ex.ifxedit", "ex.cutoff"],
  },
  {
    id: "kick-rumble-tekno", nom: "Kick qui gronde", styles: ["tekno"], fonction: "kick", element: "kick", partie: 1,
    idee: "Le kick part dans une réverbe filtrée : la queue « gronde » entre les temps, un son typique de la tekno sombre.",
    reglages: [
      r("osc.type", "12 Tronica"), r("part.voiceassign", "Mono2"),
      r("filter.lpf", "MS20 LPF"), v("filter.cutoff", "60"),
      r("amp.eg", "ON"), v("amp.decay", "60"),
      r("ifx.on", "ON"), r("ifx.type", "2 Overdrive"), v("ifx.edit", "60"),
      r("mfx.send", "ON"), r("pat.mfxtype", "4 Hall Reverb"),
    ],
    mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x...x...x...x..."),
    relance: "Pas de coup en plus : la relance vient de la réverbe que tu ouvres au pad tactile sur la mesure 4.",
    apercu: { son: "kick", octave: 0 },
    variantes: [
      { nom: "Sans réverbe", idee: "Le kick sec pour comparer.", reglages: [r("mfx.send", "OFF")] },
      { nom: "Plus sale", idee: "Plus de saturation.", reglages: [v("ifx.edit", "90")] },
    ],
    astuces: [
      { texte: "Le type de Master Fx vaut pour tout le motif : les autres parties avec MFX Send = ON l'entendent aussi.", ref: PG(3) },
      { texte: "Master Fx allumé, pose le doigt sur le pad tactile en mesure 4 pour faire monter la réverbe.", ref: OM(29) },
    ],
    exercices: ["ex.chain.send"],
  },

  // =================== CHARLESTON FERMÉ ===================
  {
    id: "hat-16-tekno", nom: "Charleston en doubles-croches", styles: ["tekno"], fonction: "percussion", element: "hat-ferme", partie: 8,
    idee: "Un charleston sur chaque pas, très court : il fait avancer le morceau comme un moteur.",
    reglages: [
      r("osc.type", "135 EightClose1"), v("amp.decay", "15"), v("amp.level", "80"),
      r("filter.hpf", "electribe HPF"), v("filter.cutoff", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx", "xxxxxxxxxxxx...."),
    relance: "Les 4 derniers pas se taisent : le silence annonce la nouvelle boucle.",
    apercu: { son: "hat", octave: 0 },
    variantes: [
      { nom: "Un sur deux", idee: "Plus léger, en croches.", reglages: [], mesures: M("x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.xxxx....") },
      { nom: "Plus métallique", idee: "Un autre charleston de la liste.", reglages: [r("osc.type", "138 CompClose")] },
    ],
    astuces: [{ texte: "Pour des accents, règle VELOCITY pas par pas (001 à 127) en Step Edit.", ref: PG(5) }],
    exercices: ["ex.decay"],
  },
  {
    id: "hat-galop-tribe", nom: "Charleston au galop", styles: ["tribe"], fonction: "percussion", element: "hat-ferme", partie: 8,
    idee: "Un trou toutes les 4 doubles-croches : le charleston « galope » avec le kick, très tribe.",
    reglages: [
      r("osc.type", "140 EastClose"), v("amp.decay", "25"),
      r("ifx.on", "ON"), r("ifx.type", "21 Delay 1/16"), v("ifx.edit", "25"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxx.xx", "x.xxx.xxxxxxxxxx"),
    relance: "La deuxième moitié de la mesure 4 se remplit complètement.",
    apercu: { son: "hat", octave: 0 },
    variantes: [
      { nom: "Galop inversé", idee: "Le trou passe avant le temps.", reglages: [], mesures: M("xxx.xxx.xxx.xxx.", "xxx.xxx.xxx.xxx.", "xxx.xxx.xxx.xxx.", "xxx.xxx.xxxxxxxx") },
      { nom: "Sans écho", idee: "Plus sec.", reglages: [r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "hat-crackle-mentale", nom: "Charleston qui grésille", styles: ["mentale"], fonction: "percussion", element: "hat-ferme", partie: 8, bpm: 175,
    idee: "Un charleston cassé et irrégulier, abîmé numériquement : il donne la nervosité de la mentale.",
    reglages: [
      r("osc.type", "167 Crackle"), v("amp.decay", "20"),
      r("ifx.on", "ON"), r("ifx.type", "5 Bit Crusher"), v("ifx.edit", "70"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.x..xx.x.x..x.x", "x.x..xx.x.x..x.x", "x.x..xx.x.xx.x.x", "x.xx.xx.xxxx.xxx"),
    relance: "Le motif se remplit et devient presque continu.",
    apercu: { son: "hat", octave: 0 },
    variantes: [
      { nom: "Plus abîmé", idee: "Le Decimator à la place du Bit Crusher.", reglages: [r("ifx.type", "4 Decimator")] },
      { nom: "Propre", idee: "Sans effet, pour entendre le rythme seul.", reglages: [r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "hat-humain", nom: "Charleston vivant", styles: ["tribe", "tekno"], fonction: "percussion", element: "hat-ferme", partie: 9,
    idee: "Une modulation aléatoire sur le volume : chaque coup a une force différente, comme joué à la main.",
    reglages: [
      r("osc.type", "144 WarmClose"), v("amp.decay", "25"),
      r("mod.type", "70 Random Level"), v("mod.depth", "50"), v("mod.speed", "90"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.x.x.x.x.x.x.x.", "x.x.x.xxx.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.xxx.xxxxxx"),
    relance: "Un remplissage en doubles-croches sur la fin.",
    apercu: { son: "hat", octave: 0 },
    variantes: [
      { nom: "Qui bouge dans l'espace", idee: "La modulation aléatoire passe sur le Pan.", reglages: [r("mod.type", "71 Random Pan")] },
      { nom: "Régulier", idee: "Sans modulation.", reglages: [v("mod.depth", "0")] },
    ],
    exercices: ["ex.depth", "ex.speed"],
  },

  // =================== CHARLESTON OUVERT ===================
  {
    id: "openhat-tribe", nom: "Charleston ouvert qui respire", styles: ["tribe"], fonction: "percussion", element: "hat-ouvert", partie: 10,
    idee: "Un charleston ouvert entre chaque kick, un peu long : il donne le « tchi » du contretemps.",
    reglages: [
      r("osc.type", "141 EastOpen"), v("amp.decay", "45"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x.x.xx"),
    relance: "Deux coups de plus à la fin de la mesure 4.",
    apercu: { son: "openhat", octave: 0 },
    variantes: [
      { nom: "Plus court", idee: "Plus serré, pour 170 BPM.", reglages: [v("amp.decay", "30")] },
      { nom: "Plus chaud", idee: "Un autre ouvert de la liste.", reglages: [r("osc.type", "145 WarmOpen")] },
    ],
    exercices: ["ex.decay"],
  },
  {
    id: "openhat-phaser-mentale", nom: "Charleston ouvert qui tourne", styles: ["mentale"], fonction: "percussion", element: "hat-ouvert", partie: 10,
    idee: "Un charleston ouvert avec un flanger : le son tourne comme un réacteur, très mentale.",
    reglages: [
      r("osc.type", "157 PhaseOpen"), v("amp.decay", "55"),
      r("ifx.on", "ON"), r("ifx.type", "28 Flanger LFO"), v("ifx.edit", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x..xx.", "..x..xx..xx.xxxx"),
    relance: "Les ouverts se rapprochent et se multiplient.",
    apercu: { son: "openhat", octave: 0 },
    variantes: [
      { nom: "Phaser", idee: "Un mouvement plus doux.", reglages: [r("ifx.type", "31 Phaser LFO 1")] },
      { nom: "Sec", idee: "Sans effet.", reglages: [r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "openhat-ouvre-tekno", nom: "Charleston ouvert qui s'ouvre", styles: ["tekno"], fonction: "percussion", element: "hat-ouvert", partie: 10,
    idee: "Un filtre passe-haut modulé par une dent de scie calée sur le tempo : le charleston devient de plus en plus brillant.",
    reglages: [
      r("osc.type", "132 NineOpen1"), v("amp.decay", "50"),
      r("filter.hpf", "electribe HPF"), v("filter.cutoff", "50"),
      r("mod.type", "37 SawUpB Filter"), v("mod.depth", "60"), v("mod.speed", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x.x.x.x.x.x.x."),
    relance: "Les ouverts passent en croches.",
    apercu: { son: "openhat", octave: 0 },
    variantes: [
      { nom: "Qui se ferme", idee: "La dent de scie descend.", reglages: [r("mod.type", "43 SawDwnB Filter")] },
      { nom: "Fixe", idee: "Sans modulation.", reglages: [v("mod.depth", "0")] },
    ],
    exercices: ["ex.depth", "ex.speed", "ex.cutoff"],
  },
  {
    id: "openhat-galop", nom: "Ouverts en galop", styles: ["tribe", "tekno"], fonction: "percussion", element: "hat-ouvert", partie: 10,
    idee: "Des charlestons ouverts sur un rythme de galop : ils remplacent la caisse claire et poussent la danse.",
    reglages: [
      r("osc.type", "145 WarmOpen"), v("amp.decay", "35"),
      r("ifx.on", "ON"), r("ifx.type", "20 Delay 1/8"), v("ifx.edit", "20"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x..xx...x..xx.", "..x..xx...x..xx.", "..x..xx...x..xx.", "..x..xx..xx.xxx."),
    relance: "Un coup de plus avant le dernier temps.",
    apercu: { son: "openhat", octave: 0 },
    variantes: [
      { nom: "Plus court", idee: "Pour un rythme plus net.", reglages: [v("amp.decay", "22")] },
      { nom: "Sans écho", idee: "Plus sec.", reglages: [r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.decay"],
  },

  // =================== CLAP ===================
  {
    id: "clap-tribe-salle", nom: "Clap dans la salle", styles: ["tribe"], fonction: "percussion", element: "clap", partie: 3,
    idee: "Un clap sur 2 et 4 envoyé dans une petite réverbe : il sonne comme des mains dans une pièce.",
    reglages: [
      r("osc.type", "122 Clapper"), v("amp.decay", "40"),
      r("mfx.send", "ON"), r("pat.mfxtype", "5 Room Reverb"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x.......x.xx"),
    relance: "Un « flam » de claps juste avant de reboucler.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Plus brillant", idee: "Un autre clap de la liste.", reglages: [r("osc.type", "127 Crispy")] },
      { nom: "Sec", idee: "Sans réverbe.", reglages: [r("mfx.send", "OFF")] },
    ],
    astuces: [{ texte: "Le type de Master Fx est commun à tout le motif.", ref: PG(3) }],
    exercices: ["ex.chain.send"],
  },
  {
    id: "clap-dur-tekno", nom: "Clap dur et serré", styles: ["tekno"], fonction: "percussion", element: "clap", partie: 3,
    idee: "Un clap court, compressé par Punch, qui claque sur chaque temps 2 et 4 sans traîner.",
    reglages: [
      r("osc.type", "115 PureEight"), v("amp.decay", "25"),
      r("ifx.on", "ON"), r("ifx.type", "1 Punch"), v("ifx.edit", "70"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x.......xxxx"),
    relance: "Quatre claps rapides sur les derniers pas.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Avec écho", idee: "Un Delay 3/16 qui roule derrière.", reglages: [r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "40")] },
      { nom: "Autre clap", idee: "Plus épais.", reglages: [r("osc.type", "118 PureNine")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "clap-delay-mentale", nom: "Clap qui rebondit", styles: ["mentale"], fonction: "percussion", element: "clap", partie: 3,
    idee: "Un clap doublé avec un écho de 3 doubles-croches : chaque coup rebondit à côté du temps.",
    reglages: [
      r("osc.type", "123 Doubler"), v("amp.decay", "35"),
      r("ifx.on", "ON"), r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x..x..x.x..."),
    relance: "Des claps supplémentaires dont les échos se croisent.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Métallique", idee: "Les échos passent dans un modulateur en anneau.", reglages: [r("ifx.type", "25 Ring Delay 1")] },
      { nom: "Plus court", idee: "Moins d'écho.", reglages: [v("ifx.edit", "30")] },
    ],
    exercices: ["ex.ifxedit"],
  },

  // =================== CAISSE CLAIRE ===================
  {
    id: "snare-tech-tekno", nom: "Caisse claire sèche", styles: ["tekno"], fonction: "percussion", element: "snare", partie: 3,
    idee: "Une caisse claire courte sur 2 et 4, filtrée pour ne garder que le claquement.",
    reglages: [
      r("osc.type", "68 Tech"), v("amp.decay", "30"),
      r("filter.hpf", "electribe HPF"), v("filter.cutoff", "35"),
      r("mfx.send", "OFF"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x.......x.x."),
    relance: "Un coup de plus sur 4.15.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Plus lourde", idee: "Une autre caisse claire.", reglages: [r("osc.type", "65 Hefty")] },
      { nom: "Moins filtrée", idee: "On rend le grave.", reglages: [v("filter.cutoff", "10")] },
    ],
    exercices: ["ex.cutoff"],
  },
  {
    id: "snare-break-tribe", nom: "Caisse claire breakbeat", styles: ["tribe"], fonction: "percussion", element: "snare", partie: 3,
    idee: "Une caisse claire décalée, inspirée des breakbeats : elle casse la régularité du 4/4.",
    reglages: [
      r("osc.type", "96 OldBreaks"), v("amp.decay", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x..x.x..x...", "....x..x.x..x...", "....x..x.x..x...", "....x..x.x..x.xx"),
    relance: "Deux coups en fin de mesure 4.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Jungle", idee: "Une caisse plus vive.", reglages: [r("osc.type", "98 Jungla")] },
      { nom: "Plus simple", idee: "Juste 2 et 4.", reglages: [], mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x..x.x..x.xx") },
    ],
    exercices: ["ex.decay"],
  },
  {
    id: "snare-indus-mentale", nom: "Caisse claire industrielle", styles: ["mentale"], fonction: "percussion", element: "snare", partie: 3, bpm: 180,
    idee: "Une caisse claire explosive et distordue, sans grave : elle frappe comme une plaque de métal.",
    reglages: [
      r("osc.type", "112 Blast"), v("amp.decay", "45"),
      r("filter.hpf", "MS20 HPF"), v("filter.cutoff", "40"), v("filter.resonance", "40"),
      r("ifx.on", "ON"), r("ifx.type", "3 Distortion"), v("ifx.edit", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x..x", "....x...x...xxxx"),
    relance: "La caisse se met à marteler.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Plus métallique", idee: "Modulateur en anneau.", reglages: [r("ifx.type", "6 Ring Modulator")] },
      { nom: "Moins sale", idee: "Overdrive à la place.", reglages: [r("ifx.type", "2 Overdrive")] },
    ],
    exercices: ["ex.ifxedit", "ex.resonance"],
  },
  {
    id: "rim-tribe", nom: "Rimshot syncopé", styles: ["tribe"], fonction: "percussion", element: "snare", partie: 7,
    idee: "Un bord de caisse claire (rimshot) sur un rythme syncopé : il dialogue avec les congas.",
    reglages: [
      r("osc.type", "108 Rimmy"), v("amp.decay", "20"),
      r("ifx.on", "ON"), r("ifx.type", "23 One Delay"), v("ifx.edit", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x..x..x...x.x.", "..x..x..x...x.x.", "..x..x..x...x.x.", "..x..x..x.x.xxx."),
    relance: "Le rimshot se resserre à la fin.",
    apercu: { son: "perc", octave: 2 },
    variantes: [
      { nom: "Rim plus ample", idee: "Un rim avec de l'espace.", reglages: [r("osc.type", "109 AmbiRim")] },
      { nom: "Sans écho", idee: "Plus sec.", reglages: [r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.decay"],
  },
  {
    id: "snare-verb-tekno", nom: "Caisse claire dans la salle", styles: ["tekno", "mentale"], fonction: "percussion", element: "snare", partie: 3,
    idee: "Une seule caisse claire par mesure, sur le temps 4, dans une grande réverbe : elle ouvre l'espace.",
    reglages: [
      r("osc.type", "90 Tubeverb"), v("amp.decay", "60"),
      r("mfx.send", "ON"), r("pat.mfxtype", "4 Hall Reverb"),
    ],
    mesures: M("............x...", "............x...", "............x...", "....x.......x.x."),
    relance: "Elle joue aussi sur le temps 2 et ajoute un coup sur 4.15.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Moins de salle", idee: "Une réverbe de pièce.", reglages: [r("pat.mfxtype", "5 Room Reverb")] },
      { nom: "Autre caisse", idee: "Plus ouverte.", reglages: [r("osc.type", "91 Open1")] },
    ],
    exercices: ["ex.chain.send"],
  },

  // =================== TOMS ===================
  {
    id: "toms-electro-tekno", nom: "Tom électronique qui tombe", styles: ["tekno"], fonction: "percussion", element: "toms", partie: 5,
    idee: "Un tom électronique dont la hauteur chute à chaque coup grâce à l'enveloppe EG+ Pitch.",
    melodique: { key: "D", scale: 34 },
    reglages: [
      r("osc.type", "196 E.Tom"), v("amp.decay", "45"),
      r("mod.type", "2 EG+ Pitch"), v("mod.depth", "60"), v("mod.speed", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("......0.....1...", "......0.....1...", "......0.....1...", "......0...1.1.OO"),
    relance: "La quinte puis l'octave sur la fin.",
    apercu: { son: "tom", octave: 1 },
    variantes: [
      { nom: "Chute plus longue", idee: "L'enveloppe dure plus longtemps.", reglages: [v("mod.speed", "80")] },
      { nom: "Sans chute", idee: "Le tom garde sa hauteur.", reglages: [v("mod.depth", "0")] },
    ],
    astuces: [{ texte: "Speed règle la vitesse de la modulation, Depth son intensité.", ref: OM(23) }],
    exercices: ["ex.depth", "ex.pitch"],
  },
  {
    id: "toms-galop-tribe", nom: "Toms en pentatonique", styles: ["tribe"], fonction: "percussion", element: "toms", partie: 5,
    idee: "Trois toms accordés sur la pentatonique mineure : une petite mélodie de percussions qui tourne.",
    melodique: { key: "D", scale: 16 },
    reglages: [
      r("osc.type", "191 Driven"), v("amp.decay", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..0..1....0..2..", "..0..1....0..2..", "..0..1....0..2..", "..0..1..2.2.1.10"),
    relance: "Les toms descendent de la quinte à la tonique.",
    apercu: { son: "tom", octave: 1 },
    variantes: [
      { nom: "Toms réels", idee: "Plus acoustiques.", reglages: [r("osc.type", "189 Real MidLo")] },
      { nom: "Plus courts", idee: "Plus percussifs.", reglages: [v("amp.decay", "30")] },
    ],
    exercices: ["ex.pitch", "ex.decay"],
  },
  {
    id: "toms-laser-mentale", nom: "Toms laser", styles: ["mentale"], fonction: "percussion", element: "toms", partie: 5, bpm: 175,
    idee: "Un tom synthé aigu avec une forte chute de hauteur et un écho : des tirs de laser.",
    melodique: { key: "D", scale: 2 },
    reglages: [
      r("osc.type", "200 Synth Hi2"), v("amp.decay", "40"),
      r("mod.type", "2 EG+ Pitch"), v("mod.depth", "100"), v("mod.speed", "30"),
      r("ifx.on", "ON"), r("ifx.type", "19 Delay 3/16"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("...0.......0....", "...0.......0....", "...0.......0..4.", "...0..0..4..O.O."),
    relance: "Les tirs montent vers l'octave.",
    apercu: { son: "tom", octave: 2 },
    variantes: [
      { nom: "Qui monte", idee: "L'enveloppe négative fait remonter la note.", reglages: [r("mod.type", "14 EG- Pitch")] },
      { nom: "Sans écho", idee: "Plus sec.", reglages: [r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.depth", "ex.ifxedit"],
  },
  {
    id: "toms-real-tribe", nom: "Toms de batterie dans la pièce", styles: ["tribe"], fonction: "percussion", element: "toms", partie: 6,
    idee: "Deux vrais toms, grave et aigu, dans une réverbe de pièce : un son de tambours joués à la main.",
    melodique: { key: "D", scale: 34 },
    reglages: [
      r("osc.type", "189 Real MidLo"), v("amp.decay", "55"),
      r("mfx.send", "ON"), r("pat.mfxtype", "5 Room Reverb"),
    ],
    mesures: M("0.....0...1.....", "0.....0...1.....", "0.....0...1...1.", "0...0...1.1.1111"),
    relance: "Les toms aigus roulent sur la fin.",
    apercu: { son: "tom", octave: 1 },
    variantes: [
      { nom: "Tom grave", idee: "Plus profond.", reglages: [r("osc.type", "190 Real Lo")] },
      { nom: "Sec", idee: "Sans réverbe.", reglages: [r("mfx.send", "OFF")] },
    ],
    exercices: ["ex.pitch"],
  },

  // =================== CONGAS ET PERCUSSIONS TRIBALES ===================
  {
    id: "congas-dialogue", nom: "Congas qui se répondent", styles: ["tribe"], fonction: "percussion", element: "congas", partie: 6,
    idee: "Deux hauteurs de conga, grave et aiguë, qui se répondent comme deux joueurs.",
    melodique: { key: "D", scale: 34 },
    reglages: [
      r("osc.type", "203 Conga1"), v("amp.decay", "45"),
      r("part.groovetype", "01 Conga1"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..0.0..1..0.0.1.", "..0.0..1..0.0.1.", "..0.0..1..0.0.1.", "..0.0..1.1.1.111"),
    relance: "Le conga aigu prend le dessus.",
    apercu: { son: "perc", octave: 1 },
    variantes: [
      { nom: "Autre conga", idee: "Plus claquant.", reglages: [r("osc.type", "205 Conga3")] },
      { nom: "Plus court", idee: "Plus sec.", reglages: [v("amp.decay", "30")] },
    ],
    astuces: [{ texte: "GROOVE TYPE décale légèrement les pas pour un jeu plus humain ; GROOVE DEPTH règle combien (0 à 127).", ref: PG(4) }],
    exercices: ["ex.pitch"],
  },
  {
    id: "bongos-tribe", nom: "Bongos qui roulent", styles: ["tribe"], fonction: "percussion", element: "congas", partie: 7,
    idee: "Des bongos en doubles-croches avec des trous : ils roulent sous tout le morceau.",
    melodique: { key: "D", scale: 34 },
    reglages: [
      r("osc.type", "208 Bongo1"), v("amp.decay", "30"),
      r("mod.type", "71 Random Pan"), v("mod.depth", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0.10.1101.10.110", "0.10.1101.10.110", "0.10.1101.10.110", "0.10.11011111O1O"),
    relance: "Les bongos montent à l'octave sur la fin.",
    apercu: { son: "perc", octave: 2 },
    variantes: [
      { nom: "Djembé", idee: "Plus grave.", reglages: [r("osc.type", "214 Djembe1")] },
      { nom: "Au centre", idee: "Sans mouvement stéréo.", reglages: [v("mod.depth", "0")] },
    ],
    exercices: ["ex.pan", "ex.depth"],
  },
  {
    id: "darbuka-mentale", nom: "Darbuka métallique", styles: ["mentale"], fonction: "percussion", element: "congas", partie: 7, bpm: 175,
    idee: "Une darbuka passée dans un modulateur en anneau : une percussion orientale qui devient étrange.",
    melodique: { key: "D", scale: 4 },
    reglages: [
      r("osc.type", "218 Darbuka1"), v("amp.decay", "35"),
      r("ifx.on", "ON"), r("ifx.type", "6 Ring Modulator"), v("ifx.edit", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0..1..0.0..1.0..", "0..1..0.0..1.0..", "0..1..0.0..1.0..", "0..1..0.0.1.1111"),
    relance: "Une rafale de coups aigus.",
    apercu: { son: "perc", octave: 1 },
    variantes: [
      { nom: "Naturelle", idee: "Sans effet.", reglages: [r("ifx.on", "OFF")] },
      { nom: "Cassée", idee: "Bit Crusher.", reglages: [r("ifx.type", "5 Bit Crusher")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "djembe-tekno", nom: "Djembé qui pompe", styles: ["tekno"], fonction: "percussion", element: "congas", partie: 7,
    idee: "Un djembé grave sur les contretemps avec un écho en croches : une percussion qui pousse la tekno.",
    melodique: { key: "D", scale: 34 },
    reglages: [
      r("osc.type", "214 Djembe1"), v("amp.decay", "35"),
      r("ifx.on", "ON"), r("ifx.type", "20 Delay 1/8"), v("ifx.edit", "35"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..0...0...0...0.", "..0...0...0...0.", "..0...0...0..10.", "..0..10..10.1010"),
    relance: "Des coups aigus s'ajoutent entre les contretemps.",
    apercu: { son: "perc", octave: 1 },
    variantes: [
      { nom: "Djembé aigu", idee: "Un autre djembé.", reglages: [r("osc.type", "216 Djembe3")] },
      { nom: "Sans écho", idee: "Plus sec.", reglages: [r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.ifxedit"],
  },

  // =================== SHAKER ===================
  {
    id: "shaker-tekno", nom: "Shaker qui balaie", styles: ["tekno"], fonction: "percussion", element: "shaker", partie: 11,
    idee: "Un shaker sur chaque pas qui voyage de gauche à droite, calé sur le tempo.",
    reglages: [
      r("osc.type", "232 Shaker"), v("amp.decay", "20"),
      r("mod.type", "35 LFOTriB Pan"), v("mod.depth", "60"), v("mod.speed", "40"),
      r("mfx.send", "ON"),
    ],
    mesures: M("xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx", "xxxxxxxxxxxxxxxx", "xxxxxxxx........"),
    relance: "Le shaker se tait sur la deuxième moitié de la mesure 4.",
    apercu: { son: "shaker", octave: 0 },
    variantes: [
      { nom: "Croches", idee: "Moins chargé.", reglages: [], mesures: M("x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.xxxxxxxx") },
      { nom: "Au centre", idee: "Sans mouvement.", reglages: [v("mod.depth", "0")] },
    ],
    exercices: ["ex.pan", "ex.speed"],
  },
  {
    id: "maracas-tribe", nom: "Maracas en contretemps", styles: ["tribe"], fonction: "percussion", element: "shaker", partie: 11,
    idee: "Des maracas qui accentuent les contretemps : le balancement de la tribe.",
    reglages: [
      r("osc.type", "250 DoncaMaracas"), v("amp.decay", "25"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x.xxx...x.xxx.", "..x.xxx...x.xxx.", "..x.xxx...x.xxx.", "..x.xxx.xxxxxxxx"),
    relance: "Les maracas remplissent la fin.",
    apercu: { son: "shaker", octave: 0 },
    variantes: [
      { nom: "Shaker", idee: "Un autre secoueur.", reglages: [r("osc.type", "241 ShakerHit")] },
      { nom: "Tambourin", idee: "Plus brillant.", reglages: [r("osc.type", "227 Tambourine1")] },
    ],
    astuces: [{ texte: "Essaie GROOVE TYPE 15 Off Beat (menu de la partie) pour décaler le jeu vers les contretemps.", ref: PG(16) }],
    exercices: ["ex.decay"],
  },
  {
    id: "cabasa-tribe", nom: "Cabasa en galop", styles: ["tribe", "tekno"], fonction: "percussion", element: "shaker", partie: 12,
    idee: "Une cabasa sur un rythme de galop (un pas sur deux puis deux pas) : du mouvement sans encombrer.",
    reglages: [
      r("osc.type", "231 Cabasa"), v("amp.decay", "20"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxx.xx", "x.xxx.xxxxxxxxxx"),
    relance: "La fin devient continue.",
    apercu: { son: "shaker", octave: 0 },
    variantes: [
      { nom: "Guiro", idee: "Un son plus râpeux.", reglages: [r("osc.type", "230 Guiro")] },
      { nom: "Plus long", idee: "Plus de souffle.", reglages: [v("amp.decay", "40")] },
    ],
    exercices: ["ex.decay"],
  },
  {
    id: "synthshake-mentale", nom: "Shaker numérique qui saute", styles: ["mentale"], fonction: "percussion", element: "shaker", partie: 11, bpm: 175,
    idee: "Un shaker synthé abîmé, qui saute d'un côté à l'autre au hasard à chaque pas.",
    reglages: [
      r("osc.type", "246 SynthShake"), v("amp.decay", "20"),
      r("mod.type", "65 S&HBPM Pan"), v("mod.depth", "90"), v("mod.speed", "80"),
      r("ifx.on", "ON"), r("ifx.type", "4 Decimator"), v("ifx.edit", "50"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.xx.xx.x.xx.xx.", "x.xx.xx.x.xx.xx.", "x.xx.xx.x.xx.xx.", "x.xxxxx.xxxxxxxx"),
    relance: "Presque tous les pas jouent sur la fin.",
    apercu: { son: "shaker", octave: 0 },
    variantes: [
      { nom: "Propre", idee: "Sans Decimator.", reglages: [r("ifx.on", "OFF")] },
      { nom: "Aléatoire lent", idee: "Le Pan glisse au lieu de sauter.", reglages: [r("mod.type", "71 Random Pan")] },
    ],
    exercices: ["ex.pan", "ex.ifxedit"],
  },

  // =================== RIDE ET CYMBALE ===================
  {
    id: "ride-tekno", nom: "Ride à contretemps", styles: ["tekno"], fonction: "percussion", element: "ride", partie: 12,
    idee: "Une ride sur chaque contretemps : elle ajoute de la brillance et de l'énergie dans le haut du spectre.",
    reglages: [
      r("osc.type", "181 NineRide"), v("amp.decay", "50"), v("amp.level", "70"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x...x.", "..x...x...x.x.x."),
    relance: "Les rides passent en croches à la fin.",
    apercu: { son: "ride", octave: 0 },
    variantes: [
      { nom: "Sur les temps", idee: "Plus martelé.", reglages: [], mesures: M("x...x...x...x...", "x...x...x...x...", "x...x...x...x...", "x.x.x.x.x.x.x.x.") },
      { nom: "Plus courte", idee: "Moins de cloche.", reglages: [v("amp.decay", "30")] },
    ],
    exercices: ["ex.decay", "ex.level"],
  },
  {
    id: "ride-jazz-tribe", nom: "Ride qui galope", styles: ["tribe"], fonction: "percussion", element: "ride", partie: 12,
    idee: "Une ride jazz sur un rythme de galop : un fond brillant et dansant.",
    reglages: [
      r("osc.type", "182 JazzRide1"), v("amp.decay", "45"), v("amp.level", "65"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxx.xx", "x.xxx.xxx.xxx.xx", "x.x.x.x.xxxxxxxx"),
    relance: "Croches puis doubles-croches sur la fin.",
    apercu: { son: "ride", octave: 0 },
    variantes: [
      { nom: "Autre ride", idee: "Plus sombre.", reglages: [r("osc.type", "183 JazzRide2")] },
      { nom: "Plus loin", idee: "Plus bas dans le mix.", reglages: [v("amp.level", "45")] },
    ],
    exercices: ["ex.level"],
  },
  {
    id: "crash-drop", nom: "Cymbale du premier temps", styles: ["tribe", "tekno"], fonction: "percussion", element: "ride", partie: 13,
    idee: "Une seule cymbale, sur le premier pas : elle marque le début de la boucle ou l'arrivée du drop.",
    reglages: [
      r("osc.type", "173 NineCym"), v("amp.decay", "90"), v("amp.level", "80"),
      r("mfx.send", "ON"),
    ],
    mesures: M("x...............", "................", "................", "................"),
    relance: "Rien : la cymbale revient au premier pas de la boucle suivante.",
    apercu: { son: "crash", octave: 0 },
    variantes: [
      { nom: "Cymbale synthé", idee: "Plus électronique.", reglages: [r("osc.type", "178 Synth")] },
      { nom: "Deux fois", idee: "Une cymbale en mesure 1 et en mesure 3.", reglages: [], mesures: M("x...............", "................", "x...............", "................") },
    ],
    astuces: [{ texte: "Pour ne l'entendre qu'au drop, coupe la partie avec Part Mute et rallume-la au bon moment.", ref: OM(32) }],
    exercices: ["ex.decay"],
  },
  {
    id: "ride-metal-mentale", nom: "Ride métallique", styles: ["mentale"], fonction: "percussion", element: "ride", partie: 12, bpm: 175,
    idee: "Une ride passée dans un modulateur en anneau : une cloche froide et métallique en contretemps.",
    reglages: [
      r("osc.type", "184 RockRide"), v("amp.decay", "50"),
      r("ifx.on", "ON"), r("ifx.type", "6 Ring Modulator"), v("ifx.edit", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("..x...x...x...x.", "..x...x...x...x.", "..x...x...x..xx.", "..x..xx..xx.xxx."),
    relance: "Les rides se doublent.",
    apercu: { son: "ride", octave: 0 },
    variantes: [
      { nom: "Avec flanger", idee: "La ride tourne.", reglages: [r("ifx.type", "28 Flanger LFO")] },
      { nom: "Naturelle", idee: "Sans effet.", reglages: [r("ifx.on", "OFF")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "revcrash-montee", nom: "Cymbale à l'envers avant le drop", styles: ["tekno", "mentale"], fonction: "percussion", element: "ride", partie: 13,
    idee: "Une cymbale inversée qui commence sur la mesure 4 et monte jusqu'à la boucle suivante : un « aspiré » avant le drop.",
    reglages: [
      r("osc.type", "180 RevCrash"), v("amp.decay", "100"), v("amp.level", "90"),
      r("mfx.send", "ON"),
    ],
    mesures: M("................", "................", "................", "x..............."),
    relance: "C'est toute la recette : la cymbale démarre en 4.01 et finit sur le premier temps suivant.",
    apercu: { son: "crash", octave: 0 },
    variantes: [
      { nom: "Ride à l'envers", idee: "Plus fine.", reglages: [r("osc.type", "186 RevRide")] },
      { nom: "Plus tard", idee: "Démarre au milieu de la mesure 4.", reglages: [], mesures: M("................", "................", "................", "........x.......") },
    ],
    astuces: [{ texte: "Écoute à quel moment la cymbale inversée atteint son maximum, puis décale le pas pour qu'il tombe sur 1.01.", ref: PG(5) }],
    exercices: ["ex.decay"],
  },

  // =================== ROULEMENT ===================
  {
    id: "roll-roller-tekno", nom: "Roulement au Roller", styles: ["tekno"], fonction: "percussion", element: "roll", partie: 4,
    idee: "La caisse claire passe en doubles-croches sur la mesure 4 et le Roller 1/32 double encore la vitesse : un roulement très serré.",
    reglages: [
      r("osc.type", "68 Tech"), v("amp.decay", "25"),
      r("ifx.on", "ON"), r("ifx.type", "22 Roller 1/32"), v("ifx.edit", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "x.x.x.x.xxxxxxxx"),
    relance: "Le roulement occupe toute la mesure 4.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Sans Roller", idee: "Seulement les doubles-croches.", reglages: [r("ifx.on", "OFF")] },
      { nom: "Roulement court", idee: "Seulement le dernier temps.", reglages: [], mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "....x.......xxxx") },
    ],
    astuces: [{ texte: "Pour un crescendo, monte VELOCITY pas après pas sur la mesure 4 en Step Edit (001 à 127).", ref: PG(5) }],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "roll-progressif-tribe", nom: "Roulement qui s'accélère", styles: ["tribe"], fonction: "percussion", element: "roll", partie: 4,
    idee: "Le roulement se construit sur 4 mesures : de plus en plus de coups jusqu'au tapis de doubles-croches.",
    reglages: [
      r("osc.type", "87 Snappy"), v("amp.decay", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.......x..x", "....x...x.x.x.xx", "x.x.x.x.xxxxxxxx"),
    relance: "Toute la mesure 4 est un roulement.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Autre caisse", idee: "Plus aiguë.", reglages: [r("osc.type", "97 Piccolo")] },
      { nom: "Qui s'ouvre", idee: "Un filtre passe-haut qui baisse sur 4 mesures (à faire en Motion Seq).", reglages: [r("filter.hpf", "electribe HPF"), v("filter.cutoff", "60")] },
    ],
    astuces: [{ texte: "Enregistre Cutoff en Motion Seq pendant le roulement pour qu'il s'ouvre tout seul.", ref: OM(31) }],
    exercices: ["ex.cutoff"],
  },
  {
    id: "roll-glitch-mentale", nom: "Roulement glitch", styles: ["mentale"], fonction: "percussion", element: "roll", partie: 4, bpm: 180,
    idee: "L'oscillateur ClickRoll est déjà un roulement : passé dans le Bit Crusher, il devient une rafale numérique.",
    reglages: [
      r("osc.type", "254 ClickRoll"), v("amp.decay", "40"),
      r("ifx.on", "ON"), r("ifx.type", "5 Bit Crusher"), v("ifx.edit", "60"),
      r("mfx.send", "ON"),
    ],
    mesures: M("........x.......", "........x.......", "........x...x...", "x...x...x.x.xxxx"),
    relance: "Les rafales se rapprochent.",
    apercu: { son: "snare", octave: 0 },
    variantes: [
      { nom: "Plus serré", idee: "Le Roller 1/32 en plus.", reglages: [r("ifx.type", "22 Roller 1/32")] },
      { nom: "Autre glitch", idee: "Un autre son de la liste.", reglages: [r("osc.type", "255 GlitchDmg")] },
    ],
    exercices: ["ex.ifxedit"],
  },
  {
    id: "roll-clap-montant", nom: "Roulement de claps qui monte", styles: ["tekno"], fonction: "percussion", element: "roll", partie: 4,
    idee: "Des claps en doubles-croches sur la mesure 4, avec une modulation qui fait monter leur hauteur : la tension monte.",
    reglages: [
      r("osc.type", "121 Small"), v("amp.decay", "20"),
      r("mod.type", "38 SawUpB Pitch"), v("mod.depth", "60"), v("mod.speed", "20"),
      r("mfx.send", "ON"),
    ],
    mesures: M("....x.......x...", "....x.......x...", "....x.......x...", "xxxxxxxxxxxxxxxx"),
    relance: "Toute la mesure 4.",
    apercu: { son: "clap", octave: 0 },
    variantes: [
      { nom: "Moins de montée", idee: "Une rampe plus douce.", reglages: [v("mod.depth", "30")] },
      { nom: "Caisse claire", idee: "Avec une caisse claire.", reglages: [r("osc.type", "58 Sharp")] },
    ],
    astuces: [{ texte: "SawUpB est synchronisé au tempo : règle Speed pour que la rampe dure une mesure.", ref: PG(14) }],
    exercices: ["ex.depth", "ex.speed"],
  },
  {
    id: "roll-toms-tribe", nom: "Roulement de toms qui monte", styles: ["tribe", "mentale"], fonction: "percussion", element: "roll", partie: 5,
    idee: "Un roulement de toms qui monte dans la gamme, du grave à l'aigu : le roulement des batucadas et des fêtes tribe.",
    melodique: { key: "D", scale: 16 },
    reglages: [
      r("osc.type", "197 Synth Hi1"), v("amp.decay", "30"),
      r("mfx.send", "ON"),
    ],
    mesures: M("0.......0.......", "0.......0.......", "0.......0...1.2.", "0011223344OO0OO0"),
    relance: "Le roulement grimpe toutes les notes de la pentatonique.",
    apercu: { son: "tom", octave: 1 },
    variantes: [
      { nom: "Qui descend", idee: "Le roulement part d'en haut.", reglages: [], mesures: M("0.......0.......", "0.......0.......", "0.......0...2.1.", "OO44332211000000") },
      { nom: "Toms réels", idee: "Plus acoustiques.", reglages: [r("osc.type", "188 Real MidHi")] },
    ],
    exercices: ["ex.pitch"],
  },
];
