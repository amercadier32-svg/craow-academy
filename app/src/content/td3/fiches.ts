// Fiches visuelles de chaque contrôle de la TD-3 (page Machine) : une phrase, un dessin, un potard à essayer,
// et les combinaisons de touches sous forme de boutons. Les combinaisons et les « bon à savoir » viennent
// des gestes du guide TD-3 (data/td3/manuel.json) ; les mots « gauche / droite » des potards sont des repères d'écoute.

export type Dessin =
  | "filtre" | "enveloppe" | "accent" | "tune" | "onde" | "drive" | "tone" | "niveau" | "tempo" | "bypass"
  | "mode" | "track" | "clavier" | "bouton" | "prise" | "led";

/** Réglage de l'aperçu que le potard de la fiche fait bouger. */
export type CleEssai = "cutoff" | "resonance" | "envelope" | "decay" | "accent" | "tune" | "drive" | "tone" | "level" | "tempo" | "volume";

export interface Combo { touches: string[]; effet: string; proc?: string; mode?: string }

export interface FicheTd3 {
  bref: string;                 // une phrase, en gros
  dessin: Dessin;
  essai?: { cle: CleEssai; gauche: string; droite: string };
  combos?: Combo[];
  savoir?: string[];
  imprime?: string[];           // ce qui est écrit sur le bouton (plusieurs fonctions)
  sens?: "entree" | "sortie";   // prises
}

export const FICHES_TD3: Record<string, FicheTd3> = {
  // ---- Son ----
  tune: { bref: "Monte ou descend toute la ligne, comme un accordeur.", dessin: "tune",
    essai: { cle: "tune", gauche: "plus grave", droite: "plus aigu" },
    savoir: ["Environ une octave de chaque côté du centre.", "Pour accorder juste : la note A doit donner 220 Hz (voir « Accorder la TD-3 »)."],
    combos: [{ touches: ["PITCH MODE", "+", "A"], effet: "Joue la note d'accordage", proc: "accorder", mode: "PATTERN PLAY" }] },
  cutoff: { bref: "Ouvre ou ferme le filtre : sombre à gauche, brillant à droite.", dessin: "filtre",
    essai: { cle: "cutoff", gauche: "sourd", droite: "brillant" },
    savoir: ["C'est LE potard de l'acid : on le fait bouger pendant que ça joue."] },
  resonance: { bref: "Fait siffler le filtre autour de la coupure : le « chant » acid.", dessin: "filtre",
    essai: { cle: "resonance", gauche: "lisse", droite: "qui siffle" },
    savoir: ["Avec CUTOFF : monte RESONANCE, puis balaie CUTOFF pour entendre le sifflement bouger."] },
  envelope: { bref: "À chaque note, le filtre s'ouvre d'un coup puis se referme. ENVELOPE dit de combien.", dessin: "enveloppe",
    essai: { cle: "envelope", gauche: "plat", droite: "« wouw » à chaque note" } },
  decay: { bref: "Le temps que met le filtre pour se refermer après chaque note.", dessin: "enveloppe",
    essai: { cle: "decay", gauche: "court, claqué", droite: "long, qui parle" } },
  accent: { bref: "Rend plus forts et plus brillants les pas marqués ACCENT. Les autres ne bougent pas.", dessin: "accent",
    essai: { cle: "accent", gauche: "accents discrets", droite: "accents qui claquent" },
    combos: [{ touches: ["WRITE/NEXT (maintenu)", "+", "ACCENT"], effet: "Met ou retire l'accent sur la note", proc: "accslide", mode: "PITCH MODE" }] },
  waveform: { bref: "Choisit la forme de l'onde : dent de scie (plein) ou pulse (creux).", dessin: "onde",
    savoir: ["Dent de scie inversée ou pulse : ce sont les deux seules ondes de la TD-3."] },
  // ---- Distorsion ----
  distortion: { bref: "Allume ou éteint la distorsion (elle se place juste avant VOLUME).", dessin: "bypass",
    savoir: ["Sur OFF, DRIVE, TONE et LEVEL ne font rien."] },
  drive: { bref: "La quantité de saturation : propre à gauche, écrasé à droite.", dessin: "drive",
    essai: { cle: "drive", gauche: "propre", droite: "saturé" }, savoir: ["Marche seulement si DISTORTION est sur ON."] },
  tone: { bref: "La couleur de la saturation : sombre à gauche, mordant à droite.", dessin: "tone",
    essai: { cle: "tone", gauche: "sombre", droite: "mordant" }, savoir: ["Marche seulement si DISTORTION est sur ON."] },
  level: { bref: "Le volume après la distorsion, pour qu'ON et OFF sonnent aussi fort.", dessin: "niveau",
    essai: { cle: "level", gauche: "moins fort", droite: "plus fort" }, savoir: ["Marche seulement si DISTORTION est sur ON."] },
  // ---- Jeu ----
  tempo: { bref: "La vitesse des patterns et des tracks.", dessin: "tempo",
    essai: { cle: "tempo", gauche: "lent", droite: "rapide" },
    savoir: ["Pas d'écran : pas de BPM affiché. Pour un tempo exact, fais suivre l'E2 (voir « Régler la synchro »)."] },
  volume: { bref: "Le volume de la sortie OUTPUT et du casque.", dessin: "niveau",
    essai: { cle: "volume", gauche: "doux", droite: "fort" },
    savoir: ["Baisse-le avant de brancher un casque ou d'allumer."] },
  mode: { bref: "Le mode de travail : écouter ou écrire, un pattern ou une track.", dessin: "mode",
    savoir: ["PATTERN PLAY est le mode sûr pour écouter : CLEAR n'y efface rien."] },
  track: { bref: "Choisit la track (1 à 7) ou le groupe de patterns (I à IV).", dessin: "track" },
  powerled: { bref: "Dit si la TD-3 est allumée (et en mode Poly Chain).", dessin: "led",
    savoir: ["Orange : normal.", "Rouge : Poly Chain, à l'arrêt. Vert : Poly Chain, en lecture."] },
  // ---- Clavier et programmation ----
  clavier: { bref: "13 touches de C à C. Elles jouent les notes, et les 8 du bas choisissent aussi les patterns 1 à 8.", dessin: "clavier",
    combos: [
      { touches: ["PATTERN 1", "(maintenu)", "+", "PATTERN 4"], effet: "Chaîne 1, 2, 3, 4", proc: "enchainer", mode: "PATTERN PLAY" },
      { touches: ["PITCH MODE", "(maintenu)", "+", "une note"], effet: "Transpose le pattern", proc: "transposer" },
      { touches: ["FUNCTION", "+", "C#"], effet: "DEL : retire un pattern de la track", proc: "trackedit", mode: "TRACK WRITE" },
      { touches: ["FUNCTION", "+", "D#"], effet: "INS : insère un pattern dans la track", proc: "trackedit", mode: "TRACK WRITE" },
    ] },
  function: { bref: "La touche à tout faire. Seule, elle ramène au mode normal (LED NORMAL MODE).", dessin: "bouton",
    imprime: ["FUNCTION"],
    combos: [
      { touches: ["FUNCTION"], effet: "Sort du PITCH MODE ou du TIME MODE", proc: "pitch" },
      { touches: ["FUNCTION", "(maintenu)", "+", "STEP", "× n"], effet: "Longueur du pattern (n pas)", proc: "nouveau", mode: "PATTERN WRITE" },
      { touches: ["FUNCTION", "→", "BACK", "+", "WRITE/NEXT"], effet: "Ouvre le réglage de synchro", proc: "sync" },
      { touches: ["FUNCTION", "→", "START/STOP", "→", "CLEAR"], effet: "Métronome pour entrer le rythme au TAP", proc: "tap" },
    ] },
  pitch: { bref: "Le mode des notes : tu tapes la mélodie, note après note.", dessin: "bouton",
    imprime: ["PITCH MODE"],
    combos: [
      { touches: ["PITCH MODE", "→", "notes"], effet: "Entre les notes dans l'ordre", proc: "pitch", mode: "PATTERN WRITE" },
      { touches: ["PITCH MODE", "(maintenu)", "+", "une note"], effet: "Transpose en jouant", proc: "transposer" },
    ] },
  time: { bref: "Le mode du rythme : pour chaque pas, NOTE, TIE (tenue) ou REST (silence). Muet pendant ce mode.", dessin: "bouton",
    imprime: ["TIME MODE"],
    combos: [
      { touches: ["TIME MODE", "→", "NOTE / TIE / REST", "× 16"], effet: "Donne le rythme pas par pas", proc: "time", mode: "PATTERN WRITE" },
      { touches: ["TIME MODE", "→", "WRITE/NEXT"], effet: "Relit le rythme (LED)", proc: "time" },
    ] },
  back: { bref: "Recule d'une note pour la corriger.", dessin: "bouton", imprime: ["BACK"],
    combos: [
      { touches: ["BACK", "→", "bonne note"], effet: "Corrige une note", proc: "pitch", mode: "PITCH MODE" },
      { touches: ["FUNCTION", "→", "BACK", "+", "WRITE/NEXT"], effet: "Réglage de synchro", proc: "sync" },
    ] },
  write: { bref: "Avance à la note suivante. Sert aussi à écrire une track et à taper le rythme (TAP).", dessin: "bouton",
    imprime: ["D.S.", "WRITE/NEXT", "TAP"],
    combos: [
      { touches: ["WRITE/NEXT"], effet: "Note suivante", proc: "pitch", mode: "PITCH MODE" },
      { touches: ["WRITE/NEXT (maintenu)", "+", "ACCENT / SLIDE"], effet: "Accent ou slide sur la note", proc: "accslide" },
      { touches: ["WRITE/NEXT"], effet: "Range le pattern dans la track", proc: "trackwrite", mode: "TRACK WRITE" },
      { touches: ["TAP", "(maintenu = note tenue)"], effet: "Rythme au tap", proc: "tap" },
    ] },
  down: { bref: "Trois rôles selon le mode : octave en dessous, NOTE, ou nombre de pas.", dessin: "bouton",
    imprime: ["TRANSPOSE DOWN", "NOTE", "STEP"],
    combos: [
      { touches: ["DOWN (maintenu)", "+", "une note"], effet: "Note une octave plus bas", proc: "pitch", mode: "PITCH MODE" },
      { touches: ["NOTE"], effet: "Ce pas joue une nouvelle note", proc: "time", mode: "TIME MODE" },
      { touches: ["FUNCTION", "+", "STEP", "× n"], effet: "Longueur du pattern", proc: "nouveau" },
    ] },
  up: { bref: "Trois rôles selon le mode : octave au-dessus, TIE, ou triolet.", dessin: "bouton",
    imprime: ["TRANSPOSE UP", "TIE", "TRIPLET"],
    combos: [
      { touches: ["UP (maintenu)", "+", "une note"], effet: "Note une octave plus haut", proc: "pitch", mode: "PITCH MODE" },
      { touches: ["TIE"], effet: "Ce pas prolonge la note d'avant", proc: "time", mode: "TIME MODE" },
    ],
    savoir: ["Le mode triolet (TRIPLET) n'a pas de procédure dans le guide : à vérifier sur la machine."] },
  acc: { bref: "En écriture : met un accent sur la note. En lecture : choisit les patterns A.", dessin: "bouton",
    imprime: ["ACCENT", "PATTERN A"],
    combos: [
      { touches: ["WRITE/NEXT (maintenu)", "+", "ACCENT"], effet: "Accent sur la note", proc: "accslide", mode: "PITCH MODE" },
      { touches: ["PATTERN 1-8", "→", "A"], effet: "Choisit 1A à 8A", proc: "jouer", mode: "PATTERN PLAY" },
    ] },
  slide: { bref: "En écriture : la note glisse vers la suivante. En lecture : choisit les patterns B.", dessin: "bouton",
    imprime: ["SLIDE", "PATTERN B"],
    combos: [
      { touches: ["WRITE/NEXT (maintenu)", "+", "SLIDE"], effet: "Slide sur la note", proc: "accslide", mode: "PITCH MODE" },
      { touches: ["PATTERN 1-8", "→", "B"], effet: "Choisit 1B à 8B", proc: "jouer", mode: "PATTERN PLAY" },
    ],
    savoir: ["Un slide sur la dernière note glisse vers le début du pattern, ou vers le pattern suivant dans une chaîne."] },
  clear: { bref: "Efface un pattern, remet une track au début, marque la fin d'une track.", dessin: "bouton",
    imprime: ["D.C.", "BAR RESET", "CLEAR"],
    combos: [
      { touches: ["PATTERN n (maintenu)", "+", "CLEAR"], effet: "Efface le pattern n", proc: "nouveau", mode: "PATTERN WRITE" },
      { touches: ["CLEAR", "→", "START/STOP"], effet: "Joue la track depuis le début", proc: "trackplay", mode: "TRACK PLAY" },
      { touches: ["CLEAR", "→", "WRITE/NEXT"], effet: "Dernier pattern de la track", proc: "trackwrite", mode: "TRACK WRITE" },
    ],
    savoir: ["Pour écouter sans risque, reste en PATTERN PLAY : CLEAR n'y efface rien."] },
  start: { bref: "Lance ou arrête la lecture. Sa LED est allumée pendant que ça joue.", dessin: "bouton",
    imprime: ["START / STOP"],
    combos: [{ touches: ["START/STOP"], effet: "Lecture / arrêt", proc: "jouer" }] },
  // ---- Prises ----
  filterin: { bref: "Fais entrer un autre son dans le filtre de la TD-3, à la place de son oscillateur.", dessin: "prise", sens: "entree" },
  syncin: { bref: "Reçoit une horloge (et départ / arrêt) d'une autre machine.", dessin: "prise", sens: "entree",
    savoir: ["Source TRIG dans le réglage de synchro (touche 4)."] },
  cvout: { bref: "Envoie la hauteur des notes (1 V par octave) vers un autre synthé modulaire.", dessin: "prise", sens: "sortie" },
  gateout: { bref: "Envoie « une note joue » vers un autre synthé modulaire.", dessin: "prise", sens: "sortie" },
  phones: { bref: "Le casque.", dessin: "prise", sens: "sortie", savoir: ["Baisse VOLUME avant de brancher."] },
};
