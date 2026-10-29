// Parcours d'apprentissage : 11 modules, 45 leçons, un mini-projet par module.
// Plan : doc « E2 Academy — Parcours d'apprentissage » (28/10/2026).
// Les gestes viennent des procédures extraites du manuel (data/electribe2/procedures.json, badge « Manuel »).
// Les exercices pratiques (mission), critères « Réussi quand… » et mini-projets sont des propositions
// pour ton style (badge « Pratique ») : ils n'utilisent que des réglages qui existent dans le manuel.
// Fil rouge : ton motif de travail à 165 BPM, KEY = D, SCALE = Aeolian, enrichi de module en module.
// Les ids des anciennes leçons (l1.motif, l3.filter…) sont gardés quand le contenu est le même,
// pour que les leçons déjà cochées le restent.
import type { Source } from "../lib/data";

const OM = (page: number): Source => ({ doc: "OM", page });
const PG = (page: number): Source => ({ doc: "PG", page });

export interface Lecon {
  id: string;
  titre: string;
  objectif: string;
  procedures?: string[];             // ids de data/electribe2/procedures.json
  faits?: { texte: string; ref: Source }[];
  controles?: string[];              // liens vers la Carte
  exercices?: string[];              // exercices d'écoute
  mission?: { texte: string; refs: Source[] };
  reussite?: string;                 // « Réussi quand… »
  lien?: { href: string; label: string };
}

export interface Niveau { n: number; titre: string; resume: string; projet: string; lecons: Lecon[] }

export const NIVEAUX: Niveau[] = [
  {
    n: 1, titre: "Prise en main", resume: "Lancer un motif, choisir une partie, trouver un paramètre, sauvegarder.",
    projet: "Ton motif de travail : un motif à toi, à 165 BPM, KEY = D, SCALE = Aeolian, sauvegardé sous ton numéro. Tu l'enrichiras à chaque module.",
    lecons: [
      {
        id: "l1.motif", titre: "Lancer un motif et régler le tempo", objectif: "Écouter un motif à ton tempo.",
        procedures: ["power", "playpattern", "bpm"], controles: ["power", "play", "stop", "value", "tap"],
        mission: { texte: "Lance NightRace (motif 16), tape le tempo sur Tap, puis règle BPM = 165.0 dans le menu.", refs: [OM(27), OM(30), PG(3)] },
        reussite: "Tu passes d'un motif à l'autre et tu fixes le BPM au dixième près.",
      },
      {
        id: "l1.part", titre: "Choisir une partie et trouver un paramètre", objectif: "Savoir ce que tu édites.",
        procedures: ["selectpart", "menu", "menuglobal"], controles: ["partsel", "trigger", "menu", "cursor", "exit"],
        mission: { texte: "Écoute les 16 parties d'un motif d'usine une par une, puis ouvre LAST STEP et GROOVE TYPE dans le menu.", refs: [OM(27), PG(4)] },
        reussite: "Tu dis quelle partie joue quel son et tu retrouves un paramètre sans le manuel.",
      },
      {
        id: "l1.save", titre: "Sauvegarder", objectif: "Ne jamais perdre un motif.",
        procedures: ["savepattern", "savepatternas"], controles: ["write", "shift"],
        mission: { texte: "Copie un motif d'usine vers un numéro libre : ce sera ton « motif de travail ».", refs: [OM(31)] },
        reussite: "Ton motif de travail est dans la liste et survit à l'extinction.",
      },
      {
        id: "l1.keyboard", titre: "Jouer juste en ré mineur", objectif: "Jouer des notes justes avec les pads.",
        procedures: ["keyboardplay"], controles: ["keyboard", "step"],
        mission: { texte: "Règle KEY = D et SCALE = Aeolian (n° 7, le mineur naturel). Joue une phrase de 8 notes, puis change d'octave avec Step 1 et Step 4.", refs: [PG(3), PG(15), OM(28)] },
        reussite: "Tu joues une phrase sans fausse note, sur 3 octaves.",
        lien: { href: "#gammes", label: "Ouvrir Gammes et tonalités" },
      },
    ],
  },
  {
    n: 2, titre: "Premier rythme", resume: "Kick, snare et hats sur 4 mesures, en pas à pas et en temps réel.",
    projet: "Kick, snare et 2 hats sur 64 pas, avec une relance en mesure 4, sauvegardés dans ton motif de travail.",
    lecons: [
      {
        id: "l2.step", titre: "Programmer pas à pas", objectif: "Écrire un rythme sur les 16 pads.",
        procedures: ["stepedit"], controles: ["sequencer", "step", "pads"],
        mission: { texte: "Partie 1 : oscillateur Hardcore (n° 6, catégorie Kick). Allume les pas 1.01, 1.05, 1.09 et 1.13, à 165 BPM.", refs: [PG(11), OM(30)] },
        reussite: "Le kick tombe sur chaque temps.",
      },
      {
        id: "l2.length", titre: "Passer à 4 mesures", objectif: "Comprendre blocs, LENGTH et boutons Step.",
        faits: [
          { texte: "Les 4 boutons Step choisissent le bloc de 16 pas que tu édites.", ref: OM(24) },
          { texte: "LENGTH règle la longueur du motif en blocs : de 1 à 4 (64 pas).", ref: PG(3) },
        ],
        controles: ["step"],
        mission: { texte: "LENGTH = 4. Recopie le kick dans Step 2 à 4, puis enlève 4.13 et ajoute 4.15 pour une relance.", refs: [OM(24), PG(3)] },
        reussite: "Le motif fait 64 pas et la mesure 4 sonne différemment.",
        lien: { href: "#carte/step", label: "Voir les 4 boutons Step sur la Carte" },
      },
      {
        id: "l2.realtime", titre: "Enregistrer en jouant", objectif: "Capturer une phrase en temps réel.",
        procedures: ["metronome", "realtimerec"], controles: ["rec", "play"],
        mission: { texte: "Enregistre une snare sur les temps 2 et 4, puis des hats en jouant leur pad.", refs: [OM(30), OM(32), PG(7)] },
        reussite: "Les coups enregistrés tombent en place sans retouche.",
      },
      {
        id: "l2.clean", titre: "Nettoyer et dupliquer", objectif: "Corriger une partie sans arrêter la lecture.",
        procedures: ["parterase", "partcopy"], controles: ["parterase"],
        mission: { texte: "Efface les hats ratés en tenant leur pad, puis copie la snare vers une autre partie.", refs: [OM(32)] },
        reussite: "Tu corriges une partie pendant que le motif tourne.",
      },
    ],
  },
  {
    n: 3, titre: "Oscillateur", resume: "Choisir parmi les 409 oscillateurs, régler Pitch, Glide et OSC Edit.",
    projet: "Un kit de 6 parties (kick, snare, 2 hats, basse, lead) dont chaque oscillateur est choisi à l'oreille.",
    lecons: [
      {
        id: "m3.categories", titre: "Se repérer dans les 409 oscillateurs", objectif: "Savoir dans quelle plage chercher un son.",
        faits: [
          { texte: "Chaque partie : Oscillator, Filter, Amp/EG, Insert Fx, et la Modulation qui agit sur eux.", ref: OM(23) },
          { texte: "Les oscillateurs sont rangés en 14 catégories : Kick 1-56, Snare 57-114, Clap 115-130, HiHat 131-172…, Synth 326-380.", ref: PG(11) },
        ],
        controles: ["osc"], exercices: ["ex.chain.ifxfilter", "ex.chain.ifxamp"],
        mission: { texte: "Fais défiler Kick, Snare et HiHat sur la partie 1 et note 3 favoris par catégorie.", refs: [PG(11), PG(12), PG(13)] },
        reussite: "Tu trouves un kick, une snare ou un hat sans chercher au hasard.",
        lien: { href: "#chaine", label: "Ouvrir la Chaîne du son" },
      },
      {
        id: "m3.pitch", titre: "Pitch et Glide", objectif: "Accorder une note et la faire glisser.",
        controles: ["pitch"], exercices: ["ex.pitch", "ex.glide"],
        mission: { texte: "Sur une basse SAW (n° 326), joue D2 puis A2 ; monte Glide (Shift + Pitch) jusqu'à entendre la glissade.", refs: [OM(23), PG(12)] },
        reussite: "Tu as noté la plage de Pitch et de Glide dans Mes relevés.",
      },
      {
        id: "l3.osc", titre: "OSC Edit, à l'oreille", objectif: "Découvrir ce que fait Edit selon l'oscillateur.",
        controles: ["osc", "oscedit"], exercices: ["ex.oscedit"],
        mission: { texte: "Tourne Edit sur SAW (326), PULSE (328), DUAL-SAW (331), SYNC-SAW (343) et VPM-SINE 1 (366). Le manuel ne dit pas son rôle : décris-le.", refs: [OM(23), PG(12)] },
        reussite: "Une note « Mes observations » par oscillateur essayé.",
      },
      {
        id: "m3.synth", titre: "Les familles Synth (326-380)", objectif: "Choisir une famille pour la basse, le lead et la nappe.",
        controles: ["osc"],
        mission: { texte: "Sur la même phrase, compare SAW (326), UNI-SAW (339), X-SAW 1 (355) et RING-SAW (351).", refs: [PG(12)] },
        reussite: "Tu as choisi une famille pour la basse, une pour le lead, une pour la nappe.",
      },
      {
        id: "m3.perc", titre: "Les percussions", objectif: "Un kit qui sonne à toi.",
        controles: ["osc", "partsel"],
        mission: { texte: "Remplace chaque son du mini-projet 2 par un oscillateur que tu préfères, dans les catégories Kick à Percussion.", refs: [PG(11)] },
        reussite: "Ton kit ne ressemble plus au motif d'usine de départ.",
      },
    ],
  },
  {
    n: 4, titre: "Filtre", resume: "Ouvrir, fermer, faire siffler, choisir LPF, HPF, BPF et leur modèle.",
    projet: "Une basse acid sur 4 mesures : filtre Acid LPF, Resonance et EG Int réglés à l'oreille.",
    lecons: [
      {
        id: "l3.filter", titre: "Ouvrir et fermer", objectif: "Entendre ce que fait Cutoff.",
        controles: ["cutoff", "lpf"], exercices: ["ex.cutoff"],
        mission: { texte: "Basse en boucle : ferme Cutoff jusqu'à l'étouffement, puis rouvre lentement.", refs: [OM(23)] },
        reussite: "Tu as noté la plage de Cutoff dans Mes relevés.",
      },
      {
        id: "m4.reso", titre: "Faire siffler", objectif: "Doser la résonance.",
        controles: ["resonance", "cutoff"], exercices: ["ex.resonance"],
        mission: { texte: "Monte Resonance par paliers avec Cutoff au milieu de sa plage, puis balaie Cutoff.", refs: [OM(23)] },
        reussite: "Tu entends le pic de résonance et tu sais le doser.",
      },
      {
        id: "m4.types", titre: "LPF, HPF, BPF et leurs modèles", objectif: "Choisir le bon filtre.",
        faits: [{ texte: "Des appuis successifs sur LPF, HPF ou BPF changent de modèle : electribe, MS20, MG (LPF seulement), P5, OB, Acid.", ref: PG(15) }],
        controles: ["lpf", "hpf", "bpf"], exercices: ["ex.filters"],
        mission: { texte: "Compare les 6 modèles de LPF sur la même basse, puis mets un HPF sur les hats.", refs: [OM(23), PG(15)] },
        reussite: "Une note par modèle et ton choix de filtre pour la basse.",
      },
      {
        id: "m4.egint", titre: "Le filtre qui bouge avec l'enveloppe", objectif: "Faire « parler » une note.",
        controles: ["egint", "cutoff", "decay"], exercices: ["ex.egint"],
        mission: { texte: "Cutoff bas, EG Int vers le haut puis vers le bas : écoute la note s'ouvrir ou se fermer.", refs: [OM(23)] },
        reussite: "Tu entends la différence entre EG Int positif et négatif.",
      },
    ],
  },
  {
    n: 5, titre: "Enveloppes et ampli", resume: "Sons courts ou longs, plucks, volume et place dans la stéréo.",
    projet: "Ton motif de travail mixé : chaque partie à sa place en volume et en stéréo.",
    lecons: [
      {
        id: "l3.amp", titre: "Sons courts, sons longs", objectif: "Régler Attack et Decay/Release.",
        controles: ["attack", "decay"], exercices: ["ex.attack", "ex.decay"],
        mission: { texte: "Hats : Decay au minimum puis au maximum. Nappe : Attack long.", refs: [OM(23)] },
        reussite: "Tu as noté les plages d'Attack et de Decay dans Mes relevés.",
      },
      {
        id: "m5.ampeg", titre: "Amp EG allumé ou éteint", objectif: "Choisir entre enveloppe et volume constant.",
        controles: ["ampeg"], exercices: ["ex.chain.egamp"],
        mission: { texte: "Même basse avec Amp EG allumé, puis éteint : le volume reste constant tant que la note est tenue.", refs: [OM(23)] },
        reussite: "Tu choisis Amp EG selon le son voulu.",
      },
      {
        id: "m5.mix", titre: "Volume et place", objectif: "Équilibrer le motif.",
        controles: ["level", "pan"], exercices: ["ex.level", "ex.pan"],
        mission: { texte: "Équilibre kick et basse, place un hat à gauche et l'autre à droite, puis ajuste PATTERN LEVEL.", refs: [OM(23), PG(3)] },
        reussite: "Le kick domine, rien ne sature, la stéréo est large.",
      },
      {
        id: "m5.pluck", titre: "Pluck et stab", objectif: "Un son court et percutant.",
        controles: ["decay", "egint", "cutoff"],
        mission: { texte: "Lead SAW : Decay court, Cutoff bas, EG Int haut. Joue-le sur les 4 mesures.", refs: [OM(23)] },
        reussite: "Ton stab claque et ne traîne pas.",
      },
    ],
  },
  {
    n: 6, titre: "Modulation", resume: "Animer un son tout seul avec les 72 types de modulation.",
    projet: "Une nappe ou un lead qui bouge seul sur 4 mesures, calé sur le tempo.",
    lecons: [
      {
        id: "m6.types", titre: "Lire un type de modulation", objectif: "Décoder source et destination.",
        faits: [{ texte: "Le potard Modulation choisit une paire source → destination parmi 72 types.", ref: PG(14) }],
        controles: ["modtype"],
        mission: { texte: "Sur ta nappe, compare 25 LFOTri Filter et 31 LFOTriB Filter.", refs: [PG(14)] },
        reussite: "Tu décodes un nom : source (EG+, EG-, LFO, S&H, Random) et destination (Filter, Pitch, OSC, Level, Pan, IFX).",
      },
      {
        id: "l3.mod", titre: "Depth et Speed", objectif: "Doser l'intensité et la vitesse.",
        controles: ["modtype", "depth", "speed"], exercices: ["ex.depth", "ex.speed"],
        mission: { texte: "Vibrato : 26 LFOTri Pitch, Depth faible, Speed moyen.", refs: [OM(23), PG(14)] },
        reussite: "Tu as noté les plages de Depth et Speed dans Mes relevés.",
      },
      {
        id: "m6.bpm", titre: "Caler la modulation sur le tempo", objectif: "Un mouvement qui tombe en rythme.",
        faits: [{ texte: "Shift + Modulation change la forme d'onde en gardant la même destination.", ref: PG(10) }],
        controles: ["modtype", "shift"],
        mission: { texte: "Basse : 37 SawUpB Filter, puis Shift + Modulation pour essayer les autres formes.", refs: [PG(10), PG(14)] },
        reussite: "Le mouvement tombe en rythme avec le kick.",
      },
      {
        id: "m6.eg", titre: "Enveloppes et hasard", objectif: "Choisir entre enveloppe, LFO et hasard.",
        controles: ["modtype", "depth"],
        mission: { texte: "Tom avec chute de hauteur : 2 EG+ Pitch. Lead qui change de couleur à chaque pas : 61 S&HBPM Filter. Compare avec 67 Random Filter.", refs: [PG(14), PG(15)] },
        reussite: "Tu sais quand prendre une enveloppe, un LFO ou le hasard.",
      },
    ],
  },
  {
    n: 7, titre: "Effets", resume: "Salir ou espacer une partie, jouer l'effet master au pad tactile.",
    projet: "Une montée de 4 mesures et un break, joués au pad tactile.",
    lecons: [
      {
        id: "l3.ifx", titre: "Salir une partie", objectif: "Choisir et doser l'effet d'insertion.",
        controles: ["ifxtype", "ifxedit", "ifxon"], exercices: ["ex.ifxedit"],
        mission: { texte: "Kick : 1 Punch puis 3 Distortion. Basse : 4 Decimator.", refs: [OM(23), OM(24), PG(16)] },
        reussite: "Tu as noté la plage d'IFX Edit dans Mes relevés.",
      },
      {
        id: "m7.rythme", titre: "Effets rythmiques", objectif: "Faire bouger une partie avec l'IFX.",
        controles: ["ifxtype", "ifxedit"],
        mission: { texte: "Essaie 19 Delay 3/16, 22 Roller 1/32, 36 Pumper et 38 Slicer sur ta nappe et ton lead.", refs: [PG(16)] },
        reussite: "Un effet rythmique gardé dans ton motif.",
      },
      {
        id: "l4.mfx", titre: "L'effet master", objectif: "Envoyer certaines parties dans l'effet master.",
        procedures: ["mfx"], controles: ["masterfx", "touchpad", "mfxsend"], exercices: ["ex.mfxxy", "ex.chain.send"],
        mission: { texte: "MFX TYPE = 2 Tape Delay. Envoie la snare et le lead (MFX Send), pas le kick.", refs: [PG(3), PG(16), OM(29)] },
        reussite: "Le kick reste sec, le reste prend l'écho.",
      },
      {
        id: "m7.montee", titre: "Montée et break", objectif: "Jouer une transition au pad tactile.",
        controles: ["mfxhold", "masterfx", "touchpad"],
        mission: { texte: "Montée de 4 mesures avec MFX 19 High Pass Filter, puis un break avec 13 Vinyl Break. Essaie aussi 7 Looper et MFX Hold.", refs: [OM(22), OM(31), PG(16)] },
        reussite: "Ta montée est propre et tu retombes sur le temps.",
      },
    ],
  },
  {
    n: 8, titre: "Séquenceur avancé", resume: "Éditer chaque pas, décaler les parties, humaniser, jouer en accords et en arpège.",
    projet: "Un groove tribe : percussions en triolets, hats décalés par LAST STEP, snare au Gate Arp.",
    lecons: [
      {
        id: "m8.stepedit", titre: "Éditer chaque pas", objectif: "Notes liées, accents, notes fantômes.",
        faits: [
          { texte: "NOTE : jusqu'à 4 notes par pas. GATE TIME : 00 à 96, ou TIE pour lier au pas suivant. VELOCITY : 001 à 127.", ref: PG(5) },
          { texte: "Le numéro du pas s'écrit bloc.pas, de 1.01 à 4.16.", ref: PG(5) },
        ],
        controles: ["sequencer", "pads"],
        mission: { texte: "Basse : deux notes liées par TIE, accents à VELOCITY 127, notes fantômes à 040.", refs: [OM(30), PG(5)] },
        reussite: "Ta basse a des notes liées et des accents.",
      },
      {
        id: "m8.laststep", titre: "Mesures impaires", objectif: "Décaler une partie par rapport aux autres.",
        faits: [
          { texte: "LAST STEP (1 à 16) raccourcit une partie pour des mesures impaires.", ref: PG(4) },
          { texte: "Avec une mesure impaire, la partie n'est pas synchronisée avec un séquenceur externe.", ref: PG(4) },
        ],
        mission: { texte: "Hats en LAST STEP = 12, kick en 16 : écoute le décalage sur 4 mesures.", refs: [PG(4)] },
        reussite: "Tu crées un décalage voulu et tu sais le remettre à 16.",
      },
      {
        id: "m8.beat", titre: "Triolets et swing", objectif: "Changer le ressenti du rythme.",
        faits: [
          { texte: "BEAT : 16, 32, 8Tri ou 16Tri. En triolets, un bloc fait 12 pas.", ref: PG(3) },
          { texte: "SWING décale les pas pairs, de -50 % à +50 %.", ref: PG(3) },
        ],
        mission: { texte: "Percussions dans un motif en 16Tri. Puis, dans ton motif en 16, SWING à +20 %.", refs: [PG(3), OM(32)] },
        reussite: "Tu entends la différence et tu choisis le ressenti voulu.",
        lien: { href: "#jeu", label: "Ouvrir Swing, Groove, Chord et Gate Arp" },
      },
      {
        id: "m8.groove", titre: "Humaniser avec Groove", objectif: "Donner du balancement à une partie.",
        faits: [{ texte: "GROOVE TYPE : 25 types (01 Conga1 … 25 Decrescendo). GROOVE DEPTH : 0 à 127.", ref: PG(4) }],
        mission: { texte: "Partie congas : GROOVE TYPE = 01 Conga1, puis monte GROOVE DEPTH. Essaie 3 autres types.", refs: [PG(4), PG(16)] },
        reussite: "Une note « Mes observations » par groove essayé.",
        lien: { href: "#jeu", label: "Ouvrir le module Groove (carte des 25 types)" },
      },
      {
        id: "m8.voix", titre: "Voix, accords, hats alternés", objectif: "Jouer en accords et faire couper le hat fermé.",
        faits: [
          { texte: "VOICE ASSIGN : Mono1, Mono2, Poly1, Poly2 (jusqu'à 4 voix).", ref: PG(4) },
          { texte: "En mode Chord, les pads jouent des accords ; CHORD SET (1 à 5) change leur richesse.", ref: PG(3) },
          { texte: "ALTERNATE 13-14 empêche les parties 13 et 14 de sonner ensemble.", ref: PG(3) },
        ],
        controles: ["chord"],
        mission: { texte: "Nappe en Poly1, jouée en accords. Hat fermé en partie 13, ouvert en 14, ALTERNATE 13-14 = On.", refs: [OM(24), PG(3), PG(4)] },
        reussite: "Le hat ouvert coupe le fermé et tes accords sonnent.",
        lien: { href: "#jeu", label: "Ouvrir le module Groove (Chord, Alternate)" },
      },
      {
        id: "l4.gatearp", titre: "Jouer en direct", objectif: "Varier le motif sans le modifier.",
        procedures: ["gatearp"], controles: ["gatearp", "touchpad", "touchscale", "stepjump"],
        faits: [
          { texte: "GATE ARP : 50 motifs d'arpège.", ref: PG(3) },
          { texte: "Step Jump : un pad saute directement au pas choisi pendant la lecture.", ref: OM(24) },
        ],
        mission: { texte: "Roulement de snare au Gate Arp, phrase au Touch Scale, puis saut de pas avec Step Jump.", refs: [OM(24), OM(29), PG(7)] },
        reussite: "Tu fais une variation en direct sans toucher au motif.",
        lien: { href: "#jeu", label: "Ouvrir le module Groove (Gate Arp)" },
      },
    ],
  },
  {
    n: 9, titre: "Motion Sequence", resume: "Automatiser potards et effets dans le motif.",
    projet: "Ton motif de travail avec une basse qui s'ouvre, un lead qui change de couleur et une montée automatique.",
    lecons: [
      {
        id: "l4.motion", titre: "Enregistrer un mouvement", objectif: "Une ouverture de filtre qui se rejoue seule.",
        procedures: ["motionrec"], controles: ["rec", "cutoff"],
        mission: { texte: "MOTION SEQ = Smooth sur la basse. Ouvre Cutoff lentement pendant les 4 mesures.", refs: [OM(31), PG(4)] },
        reussite: "L'ouverture se rejoue seule à chaque tour.",
      },
      {
        id: "m9.modes", titre: "Smooth, Trigger Hold et plusieurs potards", objectif: "Choisir le mode et nettoyer une motion ratée.",
        procedures: ["motionclear"],
        faits: [
          { texte: "MOTION SEQ : Smooth = fondu continu ; Trigger Hold = valeur tenue à chaque déclenchement.", ref: PG(4) },
          { texte: "Glide, le type de Modulation et Amp EG ne s'enregistrent pas.", ref: OM(30) },
        ],
        controles: ["cutoff", "resonance", "ifxedit"],
        mission: { texte: "Compare Smooth et Trigger Hold sur Cutoff, ajoute Resonance et IFX Edit au même tour, puis efface et recommence.", refs: [OM(31), PG(4)] },
        reussite: "Tu choisis le bon mode et tu effaces une motion ratée.",
      },
      {
        id: "m9.mfx", titre: "Automatiser l'effet master", objectif: "Une montée qui se joue sans toucher le pad.",
        controles: ["masterfx", "touchpad"],
        faits: [{ texte: "Master Fx On, X et Y s'enregistrent ; CLEAR MFX MOTION les efface.", ref: PG(3) }],
        mission: { texte: "Enregistre la montée du module 7 dans la mesure 4.", refs: [OM(31), PG(3)] },
        reussite: "La montée se joue seule à chaque tour.",
      },
    ],
  },
  {
    n: 10, titre: "Patterns et morceau", resume: "Ranger, enchaîner, jouer et enregistrer un morceau.",
    projet: "Ton premier morceau de 4 à 5 minutes, joué en live. À 165 BPM, une mesure dure environ 1,45 s : 4 minutes font environ 165 mesures.",
    lecons: [
      {
        id: "l4.pset", titre: "Un pad = un motif", objectif: "Changer de motif d'un geste.",
        procedures: ["patternset", "patternsetplay"], controles: ["patternset", "step", "pads"],
        mission: { texte: "Sauvegarde 4 variantes de ton motif de travail (intro, groove, break, drop) et range-les sur les pads 1 à 4.", refs: [OM(30), OM(31)] },
        reussite: "Tu passes d'une variante à l'autre d'un seul geste.",
      },
      {
        id: "l5.chain", titre: "Enchaîner des motifs", objectif: "Un morceau qui se joue seul.",
        procedures: ["chain"],
        mission: { texte: "Intro × 8, groove × 16, break × 4, drop × 16 avec CHAIN TO et CHAIN REPEAT.", refs: [PG(3), PG(8)] },
        reussite: "Le morceau se joue seul du début à la fin.",
        lien: { href: "#morceau/structure", label: "Ouvrir la structure du morceau" },
      },
      {
        id: "l4.mute", titre: "Construire en direct", objectif: "Faire entrer les parties une par une.",
        procedures: ["partmute"], controles: ["partmute"],
        mission: { texte: "Pars de toutes les parties coupées et fais entrer kick, basse puis lead, toutes les 8 mesures.", refs: [OM(32)] },
        reussite: "Ta construction est fluide, sans silence involontaire.",
      },
      {
        id: "l5.eventrec", titre: "Enregistrer la performance", objectif: "Garder une trace de ton live.",
        procedures: ["eventrec"], controles: ["sd"],
        mission: { texte: "CLOCK MODE = Internal. Enregistre 3 minutes de jeu, puis réécoute.", refs: [OM(33), OM(34)] },
        reussite: "Le fichier rejoue tes gestes.",
      },
    ],
  },
  {
    n: 11, titre: "Studio", resume: "Synchroniser tes machines, sauvegarder sur SD, exporter en WAV.",
    projet: "Le morceau du module 10, exporté en WAV dans FL Studio et sauvegardé sur la carte SD.",
    lecons: [
      {
        id: "l5.sync", titre: "Synchroniser tes deux E2 et la TD-3", objectif: "Tout le monde au même tempo.",
        procedures: ["sync", "midich"], controles: ["syncin", "syncout", "midi", "usb"],
        mission: { texte: "Ta première E2 en CLOCK MODE = Internal (maître). La seconde E2 et la TD-3 reçoivent l'horloge (la TD-3 n'est pas dans le manuel).", refs: [PG(6), OM(25)] },
        reussite: "Les trois machines restent calées pendant 5 minutes.",
        lien: { href: "#setup", label: "Ouvrir Mon setup (schéma de câblage)" },
      },
      {
        id: "l5.sd", titre: "Sauvegarder sur carte SD", objectif: "Une copie de sécurité de tes motifs.",
        procedures: ["sdformat", "exportpattern", "importpattern"], controles: ["sd"],
        mission: { texte: "Exporte tous tes motifs sur la carte, puis réimportes-en un pour vérifier.", refs: [OM(33)] },
        reussite: "Une copie complète de tes motifs est sur la carte.",
      },
      {
        id: "l5.audio", titre: "Exporter en WAV pour FL Studio", objectif: "Récupérer ton morceau en audio.",
        procedures: ["exportaudio", "exportpsetaudio"], controles: ["sd"],
        mission: { texte: "Exporte ton morceau en WAV, importe-le dans FL Studio et compare avec l'enregistrement par ta Scarlett.", refs: [OM(33), PG(9)] },
        reussite: "Ton morceau est dans FL Studio.",
        lien: { href: "#setup", label: "Ouvrir Mon setup (enregistrement)" },
      },
    ],
  },
];
