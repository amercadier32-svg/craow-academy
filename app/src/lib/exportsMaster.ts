import { lireJson, ecrireJson } from "./stockage";
// Les derniers exports du Mastering (nom, format, volume), montrés dans la section Mastering de l'accueil.
// Gardés sur cet appareil seulement : le fichier audio lui-même n'est pas copié.
export interface ExportMaster { nom: string; format: string; lufs: number; le: string }
const CLE = "e2academy.mastering.exports";

export function derniersExports(): ExportMaster[] {
  const x = lireJson<ExportMaster[]>(CLE, []); return Array.isArray(x) ? x : [];
}
export function noterExport(e: ExportMaster) {
  ecrireJson(CLE, [e, ...derniersExports()].slice(0, 8));
}
