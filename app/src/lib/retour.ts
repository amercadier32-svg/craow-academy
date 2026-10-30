// Flèches ← et → (comme dans Chrome), Alt + ← / Alt + →, bouton retour du navigateur et geste retour du téléphone.
// Chaque entrée de l'historique reçoit un numéro (history.state.k). L'état d'une page (filtres, sections ouvertes,
// onglets) et sa position dans la page sont gardés sous ce numéro, dans la session de l'onglet :
// en revenant en arrière, la page retrouve exactement l'endroit où on était.
// Une fenêtre (recette, effet, gamme, glossaire) ajoute sa propre entrée : ← la ferme d'abord.
// Le numéro le plus haut atteint (CLE.max) dit s'il y a une page « en avant » après un retour.
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

interface Etat { k: string; i: number; fenetre?: boolean }
const CLE = "e2academy.retour";
const nouvelId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
let dernierI = 0;
let premier = true;

const lire = <T,>(cle: string): T | undefined => {
  try { const x = sessionStorage.getItem(cle); return x === null ? undefined : (JSON.parse(x) as T); } catch { return undefined; }
};
const ecrire = (cle: string, v: unknown) => { try { sessionStorage.setItem(cle, JSON.stringify(v)); } catch { /* */ } };

/** L'état de l'entrée actuelle (créé s'il manque : arrivée par un lien ou au lancement). */
export function etatHisto(): Etat {
  const s = history.state as Partial<Etat> | null;
  if (s && typeof s.k === "string" && typeof s.i === "number") { dernierI = s.i; premier = false; return s as Etat; }
  const e: Etat = { ...(s ?? {}), k: nouvelId(), i: premier ? 0 : dernierI + 1 };
  premier = false;
  try { history.replaceState(e, "", location.href); } catch { /* */ }
  dernierI = e.i;
  // nouvelle page : les pages « en avant » n'existent plus (comme dans le navigateur)
  ecrire(`${CLE}.max`, e.i);
  return e;
}
/** Une page avant celle-ci dans l'app : la flèche ← est active. */
export const peutRevenir = () => etatHisto().i > 0;
/** Une page après celle-ci (on a reculé) : la flèche → est active. */
export const peutAvancer = () => { const e = etatHisto(); return e.i < (lire<number>(`${CLE}.max`) ?? e.i); };

/** Change l'adresse sans créer d'entrée (choix d'une fiche dans une page) en gardant le numéro de l'entrée. */
export function remplacerAdresse(url: string) {
  try { history.replaceState(etatHisto(), "", url); } catch { /* */ }
}

/** Ouvre une fenêtre : nouvelle entrée dans l'historique (le retour la ferme). Dans une fenêtre déjà ouverte : remplace. */
export function ouvrirFenetre(url: string) {
  const e = etatHisto();
  try {
    if (e.fenetre) history.replaceState(e, "", url);
    else { history.pushState({ k: nouvelId(), i: e.i + 1, fenetre: true } satisfies Etat, "", url); ecrire(`${CLE}.max`, e.i + 1); }
  } catch { /* */ }
  dernierI = etatHisto().i;
}
/** Ferme une fenêtre : revient à l'entrée d'avant si la fenêtre en avait créé une, sinon remet l'adresse de la liste. */
export function fermerFenetre(urlListe: string, fermer: () => void) {
  const e = etatHisto();
  if (e.fenetre && e.i > 0) { history.back(); return; }
  remplacerAdresse(urlListe);
  fermer();
}

/** Comme useState, mais gardé avec l'entrée de l'historique : revenir en arrière retrouve la même valeur. */
export function useEtatPage<T>(nom: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [cle] = useState(() => { const e = etatHisto(); return `${CLE}.${e.k}.${nom}`; });
  const [v, setV] = useState<T>(() => {
    const x = lire<T>(cle);
    if (x !== undefined) return reviver(x);
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });
  useEffect(() => { ecrire(cle, v instanceof Set ? { __set: [...v] } : v); }, [cle, v]);
  return [v, setV];
}
// Les Set (sections ouvertes) passent en tableau dans la session.
function reviver<T>(x: T): T {
  const o = x as unknown as { __set?: unknown[] };
  return (o && typeof o === "object" && Array.isArray(o.__set) ? new Set(o.__set) : x) as T;
}

// ---------- Position dans la page ----------
let attente = 0;
let retrouveJusqua = 0;   // pendant qu'on retrouve une position, on ne l'écrase pas
/** À appeler une fois (App) : garde la position de défilement de chaque entrée. */
export function suivrePosition() {
  try { history.scrollRestoration = "manual"; } catch { /* */ }
  window.addEventListener("scroll", () => {
    window.clearTimeout(attente);
    attente = window.setTimeout(() => {
      if (performance.now() < retrouveJusqua) return;
      const e = etatHisto();
      if (!document.body.classList.contains("fen-ouverte")) ecrire(`${CLE}.y.${e.k}`, window.scrollY);
    }, 120);
  }, { passive: true });
}
/** Après un changement de page : retrouve la position gardée (ou le haut de la page). La page peut se charger
 *  en plusieurs fois (module chargé à la demande) : on réessaie quelques fois. */
export function retrouverPosition() {
  const y = lire<number>(`${CLE}.y.${etatHisto().k}`) ?? 0;
  window.scrollTo({ top: y });
  if (!y) return;
  retrouveJusqua = performance.now() + 2500;
  let n = 0;
  const encore = () => {
    if (Math.abs(window.scrollY - y) > 2 && n++ < 30) { window.scrollTo({ top: y }); window.setTimeout(encore, 80); }
    else retrouveJusqua = 0;
  };
  window.setTimeout(encore, 80);
}
