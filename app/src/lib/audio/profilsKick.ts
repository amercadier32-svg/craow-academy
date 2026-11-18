// Profils de synthèse du kick. Chaque oscillateur « Kick » de la machine (data/electribe2/oscillators.json, n° 1 à 56)
// est rattaché à un profil par son NOM EXACT : plus de reconnaissance par morceau de nom (c'est ce qui avait classé « Subsonic » en doux).
// base + decay × queue = longueur de la queue (s) ; coude = durée de la chute rapide (s) ; rebond = niveau du petit harmonique juste après le pic.
export interface KickProfile { ratio: number; sweep: number; drive: number; clic: number; clicHz: number; base: number; queue: number; coude: number; rebond: number }
export type KickProfileId = "dur" | "standard" | "doux" | "subsonic";

export const PROFILS_KICK: Record<KickProfileId, KickProfile> = {
  dur: { ratio: 5.5, sweep: 0.07, drive: 0.55, clic: 1, clicHz: 2500, base: 0.04, queue: 0.2, coude: 0.04, rebond: 0.25 },
  standard: { ratio: 3.5, sweep: 0.045, drive: 0.25, clic: 0.7, clicHz: 2000, base: 0.08, queue: 0.45, coude: 0.07, rebond: 0 },
  // 15 Subsonic : sinus grave à longue queue qui garde sa hauteur (Decay 85 ≈ 1 s). Valeurs à l'oreille, d'après une écoute de la vraie machine.
  subsonic: { ratio: 2.4, sweep: 0.05, drive: 0.05, clic: 0.3, clicHz: 1500, base: 0.1, queue: 0.8, coude: 0.07, rebond: 0 },
  doux: { ratio: 2.4, sweep: 0.06, drive: 0.05, clic: 0.3, clicHz: 1500, base: 0.08, queue: 0.45, coude: 0.07, rebond: 0 },
};

/** Profil des kicks connus. Tout kick absent de la table (écoute à faire) prend « standard ». */
export const PROFIL_PAR_OSC: Readonly<Record<string, KickProfileId>> = {
  SubBeef: "doux", Lololow: "doux", ShortBoom: "doux",
  Hardstyle: "dur", Hardcore: "dur", Harder: "dur",
  Subsonic: "subsonic",
};

export const profilIdKick = (osc?: string): KickProfileId => (osc && PROFIL_PAR_OSC[osc]) || "standard";
export const profilKick = (osc?: string): KickProfile => PROFILS_KICK[profilIdKick(osc)];
