// Tous les raccourcis clavier de l'app (page « Raccourcis clavier », #raccourcis).
// `fichier` : où le raccourci est programmé (le script de contrôle vérifie qu'il y est toujours).
export interface Raccourci { touches: string[]; action: string; ou: string; lien?: string; fichier: string }

export const RACCOURCIS: { groupe: string; liste: Raccourci[] }[] = [
  {
    groupe: "Partout",
    liste: [
      { touches: ["Échap"], action: "Fermer le menu ☰, le menu Machines, le menu Plus ou un panneau de filtres", ou: "Toute l'app", fichier: "components/useFermeture.ts" },
      { touches: ["Entrée"], action: "Voir tous les résultats de la recherche", ou: "Accueil (barre de recherche)", lien: "#accueil", fichier: "modules/Accueil.tsx" },
    ],
  },
  {
    groupe: "Lecteurs (aperçus sonores)",
    liste: [
      { touches: ["Espace"], action: "Lancer ou arrêter le dernier lecteur utilisé (recettes, grilles, morceau, gammes, effets)", ou: "Pages avec un lecteur", lien: "#recettes", fichier: "lib/seq.ts" },
    ],
  },
  {
    groupe: "Carte de la machine et Chaîne du son",
    liste: [
      { touches: ["Échap"], action: "Fermer la fiche du contrôle choisi", ou: "Carte de la machine", lien: "#carte", fichier: "modules/MachineMap.tsx" },
      { touches: ["Échap"], action: "Fermer la fiche de l'étape choisie", ou: "Chaîne du son", lien: "#chaine", fichier: "modules/SoundChain.tsx" },
    ],
  },
  {
    groupe: "Quiz",
    liste: [
      { touches: ["1", "2", "3", "4"], action: "Choisir la réponse 1, 2, 3 ou 4", ou: "Quiz", lien: "#quiz", fichier: "modules/Quiz.tsx" },
      { touches: ["Entrée"], action: "Question suivante", ou: "Quiz", lien: "#quiz", fichier: "modules/Quiz.tsx" },
    ],
  },
  {
    groupe: "Mastering",
    liste: [
      { touches: ["Espace"], action: "Lire ou arrêter", ou: "Mastering", lien: "#mastering", fichier: "modules/Mastering.tsx" },
      { touches: ["Ctrl", "Z"], action: "Annuler le dernier réglage", ou: "Mastering", lien: "#mastering", fichier: "modules/Mastering.tsx" },
      { touches: ["Ctrl", "Y"], action: "Rétablir (aussi Ctrl + Maj + Z)", ou: "Mastering", lien: "#mastering", fichier: "modules/Mastering.tsx" },
      { touches: ["Échap"], action: "Fermer l'aide d'un réglage", ou: "Mastering", lien: "#mastering", fichier: "modules/Mastering.tsx" },
      { touches: ["Entrée"], action: "Valider une valeur tapée ou le nom d'un preset", ou: "Mastering", lien: "#mastering", fichier: "modules/Mastering.tsx" },
    ],
  },
  {
    groupe: "Visualiseur",
    liste: [
      { touches: ["R"], action: "Lancer ou arrêter l'enregistrement (mode vidéo)", ou: "Visualiseur, mode vidéo", lien: "#visualiseur/video", fichier: "modules/Visualiseur.tsx" },
      { touches: ["Échap"], action: "Sortir du mode vidéo", ou: "Visualiseur, mode vidéo", lien: "#visualiseur/video", fichier: "modules/Visualiseur.tsx" },
    ],
  },
  {
    groupe: "Carnet",
    liste: [
      { touches: ["Entrée"], action: "Créer la note avec le titre tapé", ou: "Carnet", lien: "#carnet", fichier: "modules/Carnet.tsx" },
    ],
  },
];
