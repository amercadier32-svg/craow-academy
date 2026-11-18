// Les machines de l'app et leurs modules, rangés en groupes numérotés.
// Pour ajouter une machine (ex. la TD-3) : une entrée de plus ici, avec ses groupes,
// et ses modules dans App.tsx. Le menu « Machines ▼ » et le repère se construisent tout seuls.
// Studio, Carnet et Glossaire sont communs : ils ne sont dans aucune machine.

export interface ModuleMachine { id: string; nom: string; icone: string }
export interface GroupeMachine { num: number; titre: string; couleur: string; modules: ModuleMachine[] }
export interface Machine {
  id: string;
  nom: string;        // nom complet dans le menu
  court: string;      // nom court dans le repère « Machines › … »
  detail?: string;    // petite ligne sous le nom
  icone: string;
  pal?: Record<string, string>;
  bientot?: boolean;  // guide pas encore prêt : badge « Bientôt »
  groupes: GroupeMachine[];
  /** Écrans rattachés à un module du menu (ex. les fiches des styles → Recettes). */
  sousPages?: Record<string, string>;
}

export const MACHINES: Machine[] = [
  {
    id: "electribe2",
    nom: "Korg Electribe 2",
    court: "Electribe 2",
    detail: "Synth",
    icone: "machine",
    groupes: [
      { num: 1, titre: "Comprendre la machine", couleur: "#5b8bd0", modules: [
        { id: "carte", nom: "Machine", icone: "machine" },
        { id: "chaine", nom: "Chaîne du son", icone: "chaine" },
        { id: "setup", nom: "Setup", icone: "setup" },
        { id: "midi", nom: "MIDI", icone: "midi" },
      ] },
      { num: 2, titre: "Créer", couleur: "#ff6a3d", modules: [
        { id: "recettes", nom: "Recettes", icone: "recettes" },
        { id: "morceau", nom: "Morceau", icone: "morceau" },
        { id: "session", nom: "Session", icone: "session" },
        { id: "jeu", nom: "Groove", icone: "groove" },
      ] },
      // Gammes et Effets réunis (17/11/2026) : deux groupes d'un seul module demandaient un toucher de plus.
      { num: 3, titre: "Sons, effets et gammes", couleur: "#e255c8", modules: [
        { id: "effets", nom: "Effets", icone: "effets" },
        { id: "gammes", nom: "Gammes", icone: "gammes" },
      ] },
    ],
    // Groove, MIDI et Setup étaient dans le Labo ; depuis octobre 2026 ils sont rangés directement dans les groupes.
    sousPages: { styles: "recettes" },
  },
  {
    id: "td3",
    nom: "Behringer TD-3",
    court: "TD-3",
    detail: "Basse acid",
    icone: "td3",
    // Plus tard, le groupe « 2 · Créer » de la TD-3 aura sa Session : { id: "td3-session", nom: "Session", icone: "session" }
    // (ses propres défis et sessions, voir src/lib/sessionMachines.ts).
    groupes: [
      { num: 1, titre: "Comprendre et programmer", couleur: "#c9ccd3", modules: [
        { id: "td3-machine", nom: "Machine", icone: "td3" },
        { id: "td3-sequenceur", nom: "Séquenceur", icone: "grille" },
        { id: "td3-parcours", nom: "Parcours", icone: "parcours" },
      ] },
      { num: 2, titre: "Créer", couleur: "#ff3b3b", modules: [
        { id: "td3-recettes", nom: "Recettes acid", icone: "recettes" },
      ] },
    ],
  },
];

export interface Position { machine: Machine; groupe?: GroupeMachine; module?: ModuleMachine; sousPage?: string }

/** Où se trouve un écran : quelle machine, quel groupe, quel module du menu. Rien si c'est un module commun. */
export function positionDe(ecran: string): Position | undefined {
  for (const machine of MACHINES) {
    if (ecran === machine.id) return { machine };
    const idModule = machine.sousPages?.[ecran] ?? ecran;
    for (const groupe of machine.groupes) {
      const module = groupe.modules.find((m) => m.id === idModule);
      if (module) return { machine, groupe, module, sousPage: idModule !== ecran ? ecran : undefined };
    }
  }
  return undefined;
}
