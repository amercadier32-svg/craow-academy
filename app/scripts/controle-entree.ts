// Point d'entrée du script de contrôle (scripts/controle.mjs) : expose les données de l'app telles que l'app les calcule.
export { RECETTES, CATEGORIES } from "../src/content/recettes";
export { FICHES, ficheById } from "../src/content/effets";
export { LEXIQUE } from "../src/content/lexique";
export { GRILLES } from "../src/content/grilles";
export { NIVEAUX } from "../src/content/parcours";
export { ETAPES, EXEMPLES } from "../src/content/morceau";
export { DEFIS } from "../src/content/defis";
export { EXERCISES, CHAIN_EXERCISES, SETUP } from "../src/content/exercises";
export { BLOCS } from "../src/content/chain";
export { POINTS_DEPART, LECONS, BLOCS_M } from "../src/content/mastering";
export { RACCOURCIS } from "../src/content/raccourcis";
export { GENERATEURS, genererVariante } from "../src/lib/generateur";
export { DOCS, allControls, parameters, oscillators, effects, procedures } from "../src/lib/data";
export { GAMMES, nomMidi, nomPc, notesIn, ALL_KEYS } from "../src/lib/music";
export { STYLES_LISTE } from "./controle-styles";
