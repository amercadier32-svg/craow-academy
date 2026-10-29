// Structure de morceau : intro / montée / break / drop / outro.
// Les longueurs et les parties qui jouent sont des conseils de style (badge « Pratique »).
// Les gestes sur la machine (Part Mute, Chain, Pattern Set, Write) viennent du manuel, avec leurs pages.
import type { Fonction, StyleBase as Style } from "./recettes";

export interface SectionModele {
  nom: string;
  couleur: string;
  mesures: number;            // multiple de 4 : un tour de motif = LENGTH 4 = 4 mesures
  fonctions: Fonction[];      // familles de parties qui jouent
  role: string;               // à quoi sert la section (Pratique)
}

export const SECTIONS: Record<Style, SectionModele[]> = {
  tribe: [
    { nom: "Intro", couleur: "#3f6dae", mesures: 16, fonctions: ["kick", "percussion"], role: "Le kick et les percussions seuls : les DJ peuvent caler le morceau." },
    { nom: "Montée", couleur: "#7a5bc4", mesures: 16, fonctions: ["kick", "percussion", "basse", "effet"], role: "La basse arrive, la tension monte." },
    { nom: "Break", couleur: "#c47a2a", mesures: 8, fonctions: ["nappe", "lead", "effet"], role: "Le kick s'arrête : on respire, on attend le retour." },
    { nom: "Drop", couleur: "#c41f27", mesures: 32, fonctions: ["kick", "basse", "lead", "percussion", "nappe"], role: "Tout revient d'un coup : le cœur du morceau." },
    { nom: "Outro", couleur: "#3f6dae", mesures: 16, fonctions: ["kick", "percussion"], role: "On retire les parties pour finir comme on a commencé." },
  ],
  mentale: [
    { nom: "Intro", couleur: "#3f6dae", mesures: 8, fonctions: ["nappe", "kick"], role: "Une ambiance sombre et le kick, sans rien d'autre." },
    { nom: "Montée", couleur: "#7a5bc4", mesures: 16, fonctions: ["kick", "nappe", "percussion", "effet"], role: "Les bruits et percussions s'ajoutent, la montée annonce la suite." },
    { nom: "Break", couleur: "#c47a2a", mesures: 16, fonctions: ["nappe", "lead", "effet"], role: "Plus de kick : le lead et la nappe installent la tension." },
    { nom: "Drop", couleur: "#c41f27", mesures: 32, fonctions: ["kick", "basse", "lead", "percussion", "nappe"], role: "Tout le monde : kick, basse, acide ou stabs." },
    { nom: "Outro", couleur: "#3f6dae", mesures: 8, fonctions: ["nappe"], role: "La nappe seule pour finir." },
  ],
  tekno: [
    { nom: "Intro", couleur: "#3f6dae", mesures: 16, fonctions: ["kick", "percussion"], role: "Kick et charleys pour poser le tempo." },
    { nom: "Montée", couleur: "#7a5bc4", mesures: 16, fonctions: ["kick", "percussion", "basse", "effet"], role: "La basse roule, une montée arrive sur la fin." },
    { nom: "Break", couleur: "#c47a2a", mesures: 8, fonctions: ["nappe", "lead", "effet"], role: "On coupe le kick et la basse." },
    { nom: "Drop", couleur: "#c41f27", mesures: 32, fonctions: ["kick", "basse", "lead", "percussion", "nappe"], role: "Tout revient." },
    { nom: "Outro", couleur: "#3f6dae", mesures: 16, fonctions: ["kick", "percussion"], role: "Retour au kick et aux charleys." },
  ],
};

export const LONGUEURS = [4, 8, 12, 16, 24, 32, 48, 64];
