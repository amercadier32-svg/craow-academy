// Le « son en cours » du Studio : un seul son partagé par les 4 onglets (Enregistrer, Visualiser, Analyser, Masteriser).
// Ce que tu enregistres, charges ou ouvres depuis « Mes enregistrements » devient le son en cours :
// l'onglet Analyser l'analyse et l'onglet Masteriser le masterise, sans réimporter le fichier.
// Il reste en mémoire tant que l'onglet du navigateur est ouvert (il n'est pas copié dans tes données).
import { useSyncExternalStore } from "react";
import type { Son } from "./masterAnalyse";
import { ouvrirAudio } from "./decodage";
import { lireEnregistrement } from "./recordings";

export type OrigineSon = "fichier" | "enregistrement" | "prise" | "demo";
export interface SonStudio { son: Son; origine: OrigineSon; version: number }

let courant: SonStudio | null = null;
let version = 0;
const ecoute = new Set<() => void>();

export const sonStudio = () => courant;
export function poserSonStudio(son: Son, origine: OrigineSon) {
  if (courant?.son === son) return;
  courant = { son, origine, version: ++version };
  ecoute.forEach((f) => f());
}
export function useSonStudio(): SonStudio | null {
  return useSyncExternalStore((f) => { ecoute.add(f); return () => { ecoute.delete(f); }; }, () => courant, () => courant);
}

/** Ouvre un fichier audio (WAV, MP3, FLAC…) et en fait le son en cours. */
export async function ouvrirDansStudio(f: File, origine: OrigineSon = "fichier") {
  const s = await ouvrirAudio(f);
  poserSonStudio(s, origine);
  return s;
}

/** Ouvre un enregistrement de « Mes enregistrements » comme son en cours. */
export async function ouvrirEnregistrementDansStudio(cle: string) {
  const e = await lireEnregistrement(cle);
  if (!e) throw new Error("Cet enregistrement n'est plus sur cet appareil.");
  return ouvrirDansStudio(new File([e.blob], e.nom, { type: e.blob.type || "audio/wav" }), "enregistrement");
}

export const NOM_ORIGINE: Record<OrigineSon, string> = { fichier: "fichier importé", enregistrement: "de Mes enregistrements", prise: "ta dernière prise", demo: "son de démo" };
