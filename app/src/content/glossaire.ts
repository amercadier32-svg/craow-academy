// Ancien glossaire, remplacé par content/lexique.ts (gardé pour mémoire, plus utilisé).
// Glossaire : les mots de la machine (badge « Manuel », avec la page) et les mots de musique / de style
// expliqués simplement (badge « Pratique »), chacun relié à la grille du séquenceur quand c'est possible.
import type { Source } from "../lib/data";

export interface Terme { terme: string; aussi?: string[]; def: string; kind: "manuel" | "pratique"; source?: Source; lien?: string }
const OM = (page: number): Source => ({ doc: "OM", page });
const PG = (page: number): Source => ({ doc: "PG", page });

export const GLOSSAIRE: Terme[] = [
  // Mots de la machine
  { terme: "Motif", aussi: ["Pattern"], kind: "manuel", source: OM(27), def: "Ce que joue l'E2 : 16 parties, leurs sons et leurs séquences, le tempo, la gamme. On en garde 250.", lien: "#parcours" },
  { terme: "Partie", aussi: ["Part"], kind: "manuel", source: OM(27), def: "Un des 16 instruments d'un motif (kick, basse…). <Part et Part> choisissent la partie à éditer.", lien: "#carte/partsel" },
  { terme: "Pas", aussi: ["Step", "STEP NUMBER"], kind: "manuel", source: PG(5), def: "Une case de la grille. En mode Sequencer, un pad = un pas. Numéro bloc.pas, de 1.01 à 4.16.", lien: "#morceau/grille" },
  { terme: "Bouton Step", aussi: ["Step 1", "Step 4", "bloc"], kind: "manuel", source: OM(24), def: "Les 4 boutons Step choisissent le bloc de 16 pas affiché sur les pads (1 bloc = 1 mesure).", lien: "#carte/step" },
  { terme: "LENGTH", kind: "manuel", source: PG(3), def: "Longueur du motif : de 1 à 4 blocs de 16 pas, soit jusqu'à 64 pas (4 mesures)." },
  { terme: "KEY", aussi: ["tonalité"], kind: "manuel", source: PG(3), def: "La note de départ du motif (C à B). Écrite « KEY = D » dans l'app.", lien: "#gammes" },
  { terme: "SCALE", aussi: ["gamme"], kind: "manuel", source: PG(15), def: "La gamme du motif, parmi 35. Les pads en mode Keyboard ne jouent que ses notes.", lien: "#gammes" },
  { terme: "GATE TIME", aussi: ["TIE"], kind: "manuel", source: PG(5), def: "Durée d'une note dans un pas. TIE lie la note à la suivante sans la relancer (« ~ » dans l'app)." },
  { terme: "VOICE ASSIGN", aussi: ["Mono1", "Mono2", "Poly1", "Poly2", "legato"], kind: "manuel", source: PG(4), def: "Comment la partie joue ses notes : Mono1 (legato : deux notes liées ne relancent pas l'enveloppe), Mono2, Poly1, Poly2." },
  { terme: "Motion Sequence", kind: "manuel", source: OM(31), def: "Enregistre un mouvement de potard pendant la lecture : il se rejoue tout seul à chaque tour." },
  { terme: "Insert Fx", aussi: ["IFX"], kind: "manuel", source: OM(23), def: "L'effet propre à une partie (saturation, écho, filtre…), 38 types.", lien: "#chaine" },
  { terme: "Master Fx", aussi: ["MFX", "MFX Send"], kind: "manuel", source: OM(29), def: "L'effet commun, joué au pad tactile. MFX Send choisit les parties qui y passent.", lien: "#chaine" },
  { terme: "Init Pattern", kind: "manuel", source: PG(18), def: "Motifs vides (n° 201 à 250) pour partir de zéro." },
  { terme: "Part Mute", kind: "manuel", source: OM(32), def: "Coupe ou rallume une partie d'un appui sur son pad. Base du live et des structures.", lien: "#morceau/structure" },
  { terme: "Chain", aussi: ["CHAIN TO", "CHAIN REPEAT", "CHAIN MODE"], kind: "manuel", source: PG(3), def: "Enchaîne les motifs tout seul : CHAIN TO = motif suivant, CHAIN REPEAT = nombre de lectures. CHAIN MODE = On dans Global (Guide p. 8).", lien: "#morceau/structure" },
  { terme: "Pattern Set", kind: "manuel", source: OM(30), def: "Range des motifs sur les pads pour en changer d'un seul appui en live.", lien: "#morceau/structure" },
  { terme: "Write", kind: "manuel", source: OM(31), def: "Sauvegarde le motif. Changer de motif sans Write = tout perdre." },
  { terme: "Gate Arp", kind: "manuel", source: OM(29), def: "Arpégiateur joué au pad tactile : X = vitesse, Y = longueur des notes." },
  // Mots de musique et de style
  { terme: "Mesure", kind: "pratique", def: "4 temps. Sur l'E2 : 16 pas = 1 bloc Step = 1 mesure. Les temps tombent sur les pads 1, 5, 9 et 13.", lien: "#morceau/grille" },
  { terme: "Temps", kind: "pratique", def: "Le battement qu'on tape du pied. 4 par mesure ; à 165 BPM il y en a 165 par minute." },
  { terme: "BPM", kind: "pratique", def: "Battements par minute : la vitesse du morceau. Tribe et mentale : 165 à 170." },
  { terme: "Contretemps", kind: "pratique", def: "Entre deux temps : pads 3, 7, 11, 15. C'est là que tape le charley ouvert « tchi »." },
  { terme: "Double-croche", kind: "pratique", def: "Un quart de temps = un pas de l'E2 (avec BEAT = 16)." },
  { terme: "Tonique", kind: "pratique", def: "La note de départ de la gamme (la KEY). Rang 0 sur la grille de l'app." },
  { terme: "Octave", def: "La même note, plus aiguë ou plus grave. Le chiffre après la note donne l'octave, comme sur l'écran : D3 est une octave au-dessus de D2. C4 = la note que pose un pad en mode Sequencer.", source: OM(30), kind: "manuel" },
  { terme: "Demi-ton", aussi: ["ton"], kind: "pratique", def: "Le plus petit écart entre deux notes (deux touches voisines du clavier). Un ton = 2 demi-tons.", lien: "#gammes" },
  { terme: "Mineur", kind: "pratique", def: "Une couleur de gamme sombre. Le mineur naturel s'appelle Aeolian sur l'E2.", lien: "#gammes/7" },
  { terme: "Quinte", kind: "pratique", def: "La note 7 demi-tons au-dessus de la tonique (A pour D). Sonne toujours « juste » avec elle.", lien: "#gammes/34" },
  { terme: "Enveloppe", aussi: ["EG", "Attack", "Decay"], kind: "pratique", def: "Comment un son démarre (Attack) et s'éteint (Decay). EG Int fait bouger le filtre avec elle." },
  { terme: "Cutoff", aussi: ["filtre"], kind: "pratique", def: "Le point où le filtre coupe les aigus (passe-bas) : fermé = sourd, ouvert = brillant.", lien: "#carte/cutoff" },
  { terme: "Résonance", kind: "pratique", def: "Accentue la zone autour du Cutoff : à fond, le filtre siffle (son acide)." },
  { terme: "LFO", kind: "pratique", def: "Un mouvement automatique et régulier (vibrato, filtre qui respire). Speed = vitesse, Depth = quantité." },
  { terme: "Glide", aussi: ["portamento"], kind: "pratique", def: "La note glisse vers la suivante au lieu de sauter. Typique de l'acide." },
  { terme: "Kick", kind: "pratique", def: "La grosse caisse : le « boum » sur chaque temps." },
  { terme: "Acid", aussi: ["acide"], kind: "pratique", def: "Une ligne de synthé avec beaucoup de résonance, de glide et d'enveloppe sur le filtre.", lien: "#recettes/lead-acide" },
  { terme: "Reese", kind: "pratique", def: "Une basse faite de deux dents de scie désaccordées : elle « frotte » et bouge.", lien: "#recettes/reese-mentale" },
  { terme: "Stab", kind: "pratique", def: "Un accord très court, joué comme un coup.", lien: "#recettes/stab-tekno" },
  { terme: "Drone", aussi: ["nappe"], kind: "pratique", def: "Une note tenue longtemps, qui sert de fond.", lien: "#recettes/drone-sombre" },
  { terme: "Tresillo", kind: "pratique", def: "Le rythme 3 + 3 + 2 pas (pads 1, 4, 7) qui fait balancer la tribe.", lien: "#recettes/percu-tresillo" },
  { terme: "Relance", aussi: ["fill"], kind: "pratique", def: "Une variation à la fin d'un tour (souvent la mesure 4) qui annonce la suite." },
  { terme: "Break", kind: "pratique", def: "Le passage où le kick s'arrête.", lien: "#morceau/structure" },
  { terme: "Drop", kind: "pratique", def: "Le retour de toutes les parties après un break ou une montée.", lien: "#morceau/structure" },
];
