// Parcours d'apprentissage de la TD-3 : 5 niveaux, du premier pattern à la synchro avec l'E2.
// Les gestes viennent du guide de démarrage TD-3 (data/td3/manuel.json, badge « Manuel »).
// Missions, critères « Réussi quand… » et mini-projets sont des propositions (badge « Pratique »).

export interface LeconTd3 {
  id: string;
  titre: string;
  objectif: string;
  procedures?: string[];   // ids de data/td3/manuel.json
  controles?: string[];    // ids des contrôles (page Machine)
  mission: string;
  reussite: string;
  lien?: { href: string; label: string };
}
export interface NiveauTd3 { n: number; titre: string; resume: string; projet: string; lecons: LeconTd3[] }

export const NIVEAUX_TD3: NiveauTd3[] = [
  {
    n: 1, titre: "Prise en main", resume: "Brancher, écouter un pattern, régler le tempo, accorder.",
    projet: "Ta TD-3 est branchée, accordée et tu sais écouter n'importe quel pattern en mémoire.",
    lecons: [
      { id: "td3.l1.brancher", titre: "Brancher et allumer", objectif: "Entendre la TD-3 sans risque pour les oreilles.",
        controles: ["volume"],
        mission: "Branche OUTPUT vers la Scarlett (ou le casque sur PHONES), VOLUME en bas, allume la TD-3 avant les enceintes, puis remonte VOLUME doucement.",
        reussite: "Tu entends la TD-3 et tu sais dans quel ordre allumer et éteindre." },
      { id: "td3.l1.jouer", titre: "Jouer un pattern en mémoire", objectif: "Lancer et arrêter un pattern.",
        procedures: ["jouer"], controles: ["mode", "track", "function", "acc", "slide", "start"],
        mission: "Écoute les patterns 1A à 8A du groupe I, puis 1B à 8B.",
        reussite: "Tu passes d'un pattern à l'autre sans regarder la notice." },
      { id: "td3.l1.tempo", titre: "Le tempo sans écran", objectif: "Régler le TEMPO à l'oreille.",
        controles: ["tempo"],
        mission: "Lance un pattern sur l'E2 à 165 BPM et règle TEMPO de la TD-3 pour qu'elle suive à l'oreille. Note dans « Mes observations » où est le potard.",
        reussite: "Les deux machines restent ensemble pendant 4 mesures (sans synchro, elles finiront par se décaler : c'est normal, le niveau 5 règle ça)." },
      { id: "td3.l1.accorder", titre: "Accorder la TD-3", objectif: "Être juste avec l'E2.",
        procedures: ["accorder"], controles: ["tune", "pitch"],
        mission: "Après 15 minutes de chauffe, accorde le A sur 220 Hz avec un accordeur (téléphone ou FL Studio).",
        reussite: "L'accordeur affiche A, juste, et la TD-3 sonne juste avec l'E2." },
    ],
  },
  {
    n: 2, titre: "Le son acid", resume: "Oscillateur, filtre, enveloppe, accent, distorsion.",
    projet: "Sur un même pattern, trouve 3 sons différents (doux, acide, saturé) et note les positions des potards dans « Mes observations ».",
    lecons: [
      { id: "td3.l2.onde", titre: "Dent de scie ou pulse", objectif: "Entendre la différence des deux ondes.",
        controles: ["waveform"],
        mission: "Joue un pattern et bascule WAVEFORM : écoute le son plein (dent de scie) puis creux (pulse).",
        reussite: "Les yeux fermés, tu dis quelle onde joue." },
      { id: "td3.l2.filtre", titre: "CUTOFF et RESONANCE", objectif: "Faire « chanter » le filtre.",
        controles: ["cutoff", "resonance"],
        mission: "RESONANCE à mi-course, balaie CUTOFF de tout fermé à tout ouvert sur 4 mesures. Recommence avec RESONANCE au maximum.",
        reussite: "Tu entends le sifflement de la résonance suivre la coupure." },
      { id: "td3.l2.env", titre: "ENVELOPE et DECAY", objectif: "Donner une attaque à chaque note.",
        controles: ["envelope", "decay"],
        mission: "CUTOFF assez bas, monte ENVELOPE : chaque note s'ouvre. Puis joue avec DECAY, court puis long.",
        reussite: "Tu sais faire un son « pluck » court et un son qui « parle » longtemps." },
      { id: "td3.l2.accent", titre: "ACCENT", objectif: "Faire ressortir certaines notes.",
        controles: ["accent"],
        mission: "Sur la recette « Première ligne acid », tourne ACCENT de 0 au maximum : seules les notes accentuées changent.",
        reussite: "Tu entends quelles notes portent un accent.",
        lien: { href: "#td3-recettes", label: "Ouvrir les recettes TD-3" } },
      { id: "td3.l2.dist", titre: "La distorsion", objectif: "Salir le son sans exploser le volume.",
        controles: ["distortion", "drive", "tone", "level"],
        mission: "DISTORTION sur ON, monte DRIVE, règle TONE, puis LEVEL pour retrouver le même volume qu'en OFF.",
        reussite: "ON et OFF ont le même volume : seule la couleur change." },
    ],
  },
  {
    n: 3, titre: "Écrire un pattern", resume: "PITCH MODE, TIME MODE, accent et slide : la méthode de la TD-3.",
    projet: "Recopie la recette « Première ligne acid » (pattern 1) dans le pattern 1A du groupe I, et vérifie qu'elle sonne comme l'aperçu.",
    lecons: [
      { id: "td3.l3.vide", titre: "Préparer un pattern vide", objectif: "Ne pas écraser un pattern que tu aimes.",
        procedures: ["nouveau"], controles: ["mode", "clear", "function", "down"],
        mission: "Choisis 8B du groupe IV (loin des patterns d'usine), efface-le, règle 16 pas.",
        reussite: "START / STOP ne joue rien : le pattern est vide et prêt." },
      { id: "td3.l3.pitch", titre: "Les notes en PITCH MODE", objectif: "Entrer une suite de notes.",
        procedures: ["pitch"], controles: ["pitch", "clavier", "up", "down", "back", "write"],
        mission: "Entre C, C, UP + C, C, D#, G, puis relis-les avec WRITE/NEXT et corrige-en une avec BACK.",
        reussite: "Tu relis ta liste de notes sans te tromper." },
      { id: "td3.l3.time", titre: "Le rythme en TIME MODE", objectif: "Placer NOTE, TIE et REST.",
        procedures: ["time", "tap"], controles: ["time", "down", "up"],
        mission: "Donne un rythme de 16 pas avec au moins 2 TIE et 3 REST. Essaie aussi la méthode au TAP.",
        reussite: "Tu sais pourquoi une note « avance » quand tu changes une NOTE en REST : chaque NOTE prend la note suivante de la liste." },
      { id: "td3.l3.accslide", titre: "Accent et slide", objectif: "Faire vivre la ligne.",
        procedures: ["accslide"], controles: ["acc", "slide", "write"],
        mission: "Mets un ACCENT sur chaque UP et un SLIDE sur l'avant-dernière note.",
        reussite: "Tu entends le glissé et les notes qui claquent." },
    ],
  },
  {
    n: 4, titre: "Jouer en live", resume: "Transposer, enchaîner 4 patterns, écrire une track.",
    projet: "Une track de 8 patterns (deux fois ta chaîne de 4), dont une transposée, qui tourne en TRACK PLAY.",
    lecons: [
      { id: "td3.l4.transpo", titre: "Transposer en jouant", objectif: "Changer de tonalité sans réécrire.",
        procedures: ["transposer"], controles: ["pitch", "clavier"],
        mission: "Pendant la lecture, transpose sur D, puis F, puis retour sur C.",
        reussite: "La transposition tombe pile au début du pattern." },
      { id: "td3.l4.chaine", titre: "Enchaîner 4 patterns", objectif: "Faire une boucle de 4 mesures.",
        procedures: ["enchainer"],
        mission: "Écris une recette (4 patterns) dans 1A à 4A, puis maintiens PATTERN 1 et appuie sur PATTERN 4.",
        reussite: "Les 4 patterns tournent en boucle, dans l'ordre.",
        lien: { href: "#td3-recettes", label: "Choisir une recette" } },
      { id: "td3.l4.track", titre: "Écrire et jouer une track", objectif: "Ranger un morceau.",
        procedures: ["trackwrite", "trackplay", "trackedit"], controles: ["mode", "track", "write", "clear"],
        mission: "Écris la track 1, puis retire un pattern et insère-en un autre.",
        reussite: "La track joue du début à la fin et s'arrête sur le dernier pattern." },
    ],
  },
  {
    n: 5, titre: "Avec ton setup", resume: "La TD-3 suit l'E2 : synchro MIDI ou USB.",
    projet: "Une session de 10 minutes : l'E2 donne le tempo, la TD-3 suit et tu enchaînes deux recettes TD-3.",
    lecons: [
      { id: "td3.l5.sync", titre: "Choisir la source d'horloge", objectif: "Que la TD-3 suive le tempo de l'E2.",
        procedures: ["sync"], controles: ["back", "write", "function"],
        mission: "Câble MIDI de l'E2 (MIDI OUT) vers MIDI IN de la TD-3, source = MIDI, lance l'E2.",
        reussite: "La TD-3 démarre et s'arrête avec l'E2, au même tempo.",
        lien: { href: "#setup", label: "Mon setup (E2, TD-3, FL Studio)" } },
      { id: "td3.l5.retour", titre: "Revenir en interne", objectif: "Jouer la TD-3 seule.",
        procedures: ["sync"],
        mission: "Remets la source sur INT et vérifie que START / STOP relance bien la TD-3 seule.",
        reussite: "Tu sais toujours dans quel mode est ta TD-3." },
    ],
  },
];
