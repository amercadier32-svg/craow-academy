// Les machines de l'app et leurs modules, rangés en groupes numérotés.
// Pour ajouter une machine (ex. la TD-3) : une entrée de plus ici, avec ses groupes,
// et ses modules dans App.tsx. Le menu « Machines ▼ » et le repère se construisent tout seuls.
// Mastering, Carnet et Glossaire sont communs : ils ne sont dans aucune machine.

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
  /** Écrans rattachés à un module du menu (ex. les outils du Labo → Labo). */
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
      ] },
      { num: 2, titre: "Créer", couleur: "#ff6a3d", modules: [
        { id: "recettes", nom: "Recettes", icone: "recettes" },
        { id: "morceau", nom: "Morceau", icone: "morceau" },
        { id: "session", nom: "Session", icone: "session" },
      ] },
      { num: 3, titre: "Théorie", couleur: "#ffd84d", modules: [
        { id: "gammes", nom: "Gammes", icone: "gammes" },
      ] },
      { num: 4, titre: "Sons et effets", couleur: "#e255c8", modules: [
        { id: "effets", nom: "Effets", icone: "effets" },
        { id: "labo", nom: "Labo", icone: "labo" },
      ] },
    ],
    sousPages: { jeu: "labo", midi: "labo", setup: "labo", styles: "recettes" },
  },
  {
    id: "td3",
    nom: "Behringer TD-3",
    court: "TD-3",
    detail: "Guide en préparation",
    icone: "td3",
    bientot: true,
    // Plus tard, le groupe « 2 · Créer » de la TD-3 aura sa Session : { id: "td3-session", nom: "Session", icone: "session" }
    // (ses propres défis et sessions, voir src/lib/sessionMachines.ts).
    groupes: [],
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
