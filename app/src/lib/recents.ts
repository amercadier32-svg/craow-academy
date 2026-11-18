// « Reprendre » sur l'Accueil : les 3 dernières choses ouvertes (recette, fiche d'effet, défi de Session, niveau du Parcours).
import { ecrireJson, lireJson } from "./donnees/stockage";

export const CLE_RECENTS = "e2academy.recents";
export interface Recent { hash: string; titre: string; type: string; le: string }

export function lireRecents(): Recent[] {
  const x = lireJson<Recent[]>(CLE_RECENTS, []);
  return Array.isArray(x) ? x.filter((r) => r && typeof r.hash === "string" && typeof r.titre === "string").slice(0, 3) : [];
}

/** Note une page ouverte (la plus récente en premier, sans doublon, 3 au plus). */
export function noterRecent(hash: string, titre: string, type: string) {
  const liste = lireRecents().filter((r) => r.hash !== hash);
  ecrireJson(CLE_RECENTS, [{ hash, titre, type, le: new Date().toISOString() }, ...liste].slice(0, 3));
}
