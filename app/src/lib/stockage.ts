import { useCallback, useState } from "react";
// Accès unique au stockage du navigateur (localStorage). Toute l'app lit et écrit ses données ici :
// chaque écriture prévient la sauvegarde automatique (lib/donnees.ts), et un stockage indisponible
// (navigation privée, stockage plein) ne fait jamais planter l'app.

type Ecouteur = (cle: string) => void;
const ecouteurs = new Set<Ecouteur>();

/** Prévient `f` à chaque écriture ou effacement d'une clé. Renvoie la fonction pour arrêter. */
export function surEcriture(f: Ecouteur): () => void {
  ecouteurs.add(f);
  return () => { ecouteurs.delete(f); };
}
const prevenir = (cle: string) => ecouteurs.forEach((f) => { try { f(cle); } catch { /* */ } });

export function lireTexte(cle: string): string | null {
  try { return localStorage.getItem(cle); } catch { return null; }
}

/** Lit une valeur JSON. Absente ou illisible : `defaut`. */
export function lireJson<T>(cle: string, defaut: T): T {
  const s = lireTexte(cle);
  if (s == null) return defaut;
  try { return JSON.parse(s) as T; } catch { return defaut; }
}

/** Lit un objet JSON et le complète avec `defaut` (les nouveaux réglages gardent leur valeur par défaut). */
export function lireObjet<T extends object>(cle: string, defaut: T): T {
  const x = lireJson<Partial<T> | null>(cle, null);
  return x && typeof x === "object" && !Array.isArray(x) ? { ...defaut, ...x } : defaut;
}

/** Écrit du texte. Renvoie false si le navigateur refuse (stockage plein ou bloqué). */
export function ecrireTexte(cle: string, v: string): boolean {
  try {
    if (localStorage.getItem(cle) === v) return true;
    localStorage.setItem(cle, v);
  } catch { return false; }
  prevenir(cle);
  return true;
}

export const ecrireJson = (cle: string, v: unknown): boolean => ecrireTexte(cle, JSON.stringify(v));

export function effacer(cle: string): void {
  try {
    if (localStorage.getItem(cle) === null) return;
    localStorage.removeItem(cle);
  } catch { return; }
  prevenir(cle);
}

/** Toutes les clés de l'app (préfixe « e2academy. »). */
export function clesApp(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("e2academy.")) out.push(k);
    }
  } catch { /* */ }
  return out.sort();
}

/** Garde `v` sous `cle` seulement s'il diffère de l'original (sinon efface la clé : l'original suffit). */
export function garderSiModifie(cle: string, v: unknown, origine: unknown): void {
  const s = JSON.stringify(v);
  if (s === JSON.stringify(origine)) effacer(cle); else ecrireTexte(cle, s);
}

/** Réglages d'un module gardés sur cet appareil : [valeur, mettre à jour une partie]. */
export function usePrefs<T extends object>(cle: string, defaut: T): [T, (p: Partial<T>) => void] {
  const [v, setV] = useState<T>(() => lireObjet(cle, defaut));
  const maj = useCallback((p: Partial<T>) => setV((o) => { const n = { ...o, ...p }; ecrireJson(cle, n); return n; }), [cle]);
  return [v, maj];
}
