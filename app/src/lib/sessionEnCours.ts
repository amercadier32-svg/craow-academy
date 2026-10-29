// La session chronométrée en cours (module Session). Gardée sur cet appareil (localStorage) :
// le minuteur continue quand tu ouvres une recette, une gamme ou une fiche, et après un rechargement.
import { lireJson, ecrireJson, effacer } from "./stockage";
import { contexte, sortie } from "./moteurAudio";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Defi } from "../content/defis";

export interface EnCours {
  defi: Defi;
  style?: string;          // style choisi au lancement
  debut: number;           // Date.now() au lancement
  pause: number;           // ms passées en pause (pauses terminées)
  pauseDepuis: number | null;
  alertes: number[];       // alertes déjà données (300 = 5 min, 60 = 1 min, 0 = fin)
}

const CLE = "e2academy.session.encours";
function lire(): EnCours | null {
  const x = lireJson<EnCours | null>(CLE, null); return x && x.defi && typeof x.debut === "number" ? x : null;
}
let cur = lire();
const ecoute = new Set<() => void>();
function ecrire(x: EnCours | null) {
  cur = x;
  if (x) ecrireJson(CLE, x); else effacer(CLE);
  ecoute.forEach((l) => l());
}
const abonner = (l: () => void) => { ecoute.add(l); return () => { ecoute.delete(l); }; };

export const useEnCours = () => useSyncExternalStore(abonner, () => cur, () => cur);
export const getEnCours = () => cur;

export function lancer(defi: Defi, style?: string) {
  ecrire({ defi, style, debut: Date.now(), pause: 0, pauseDepuis: null, alertes: [] });
  debloquerSon();
}
export function basculerPause() {
  if (!cur) return;
  const t = Date.now();
  ecrire(cur.pauseDepuis ? { ...cur, pause: cur.pause + (t - cur.pauseDepuis), pauseDepuis: null } : { ...cur, pauseDepuis: t });
}
export const arreter = () => ecrire(null);
export function noterAlerte(s: number) { if (cur && !cur.alertes.includes(s)) ecrire({ ...cur, alertes: [...cur.alertes, s] }); }
/** Termine tout de suite (bouton « J'ai fini ») : le minuteur passe à 0. */
export function finirMaintenant() {
  if (!cur) return;
  const t = Date.now();
  const ecoule = t - cur.debut - cur.pause - (cur.pauseDepuis ? t - cur.pauseDepuis : 0);
  ecrire({ ...cur, pauseDepuis: null, pause: cur.pause + (cur.pauseDepuis ? t - cur.pauseDepuis : 0), debut: cur.debut - Math.max(0, cur.defi.duree * 60000 - ecoule), alertes: [300, 60, 0] });
}

/** Millisecondes passées (sans les pauses) et restantes. */
export function temps(x: EnCours, t = Date.now()) {
  const ecoule = Math.max(0, t - x.debut - x.pause - (x.pauseDepuis ? t - x.pauseDepuis : 0));
  const total = x.defi.duree * 60000;
  return { ecoule: Math.min(ecoule, total), restant: Math.max(0, total - ecoule), total };
}

/** Rafraîchit l'écran toutes les 250 ms tant qu'une session tourne. */
export function useTic(actif: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!actif) return;
    const id = window.setInterval(() => set((n) => n + 1), 250);
    return () => window.clearInterval(id);
  }, [actif]);
}

export const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

// ---------- Alerte douce : deux notes courtes et faibles ----------
// Par le moteur audio partagé : l'alerte passe même quand un aperçu joue.
function debloquerSon() {
  try { contexte(); } catch { /* pas de son */ }
}
export function carillon(fin = false) {
  try {
    const ctx = contexte();
    const notes = fin ? [659.25, 783.99, 987.77] : [783.99, 659.25];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = ctx.currentTime + i * 0.22;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.08, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
      o.connect(g).connect(sortie());
      o.start(t0); o.stop(t0 + 0.65);
    });
  } catch { /* pas de son */ }
}
