// Cartes de quiz générées automatiquement à partir des données extraites du manuel (data/).
// Aucune question n'est écrite à la main : chaque réponse vient d'un fichier data/ avec sa page,
// ou du glossaire (content/lexique.ts : thème « Glossaire », lancé depuis les termes cochés).
import { lireObjet, ecrireJson } from "./stockage";
import { allControls, oscillators, parameters, procedures, type Source } from "./data";
import { GAMMES, enDiese } from "./music";
import { CATS_LEX, LEXIQUE } from "../content/lexique";

export type Theme = "boutons" | "shift" | "params" | "plages" | "gestes" | "gammes" | "osc" | "lexique";
export const THEMES: { id: Theme; nom: string }[] = [
  { id: "boutons", nom: "Boutons" }, { id: "shift", nom: "Raccourcis Shift" }, { id: "params", nom: "Paramètres" },
  { id: "plages", nom: "Plages et valeurs" }, { id: "gestes", nom: "Gestes" }, { id: "gammes", nom: "Gammes" }, { id: "osc", nom: "Oscillateurs" },
  { id: "lexique", nom: "Glossaire" },
];

export interface Carte {
  id: string;
  theme: Theme;
  question: string;
  reponse: string;          // réponse courte (choix multiple)
  detail?: string[];        // réponse complète (flashcard), ex. les étapes
  choix: string[];          // réponse + 3 autres, dans le désordre au moment du tirage
  source?: Source;          // absente pour les mots « Pratique » du glossaire
  lien?: string;            // #carte/… pour aller voir
}

const uniq = (xs: string[]) => [...new Set(xs)];
function autres(bonne: string, pool: string[], n = 3) {
  const p = uniq(pool.filter((x) => x && x !== bonne));
  const out: string[] = [];
  while (out.length < n && p.length) out.push(p.splice(Math.floor(Math.random() * p.length), 1)[0]);
  return out;
}
export function melange<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Toutes les cartes. Les mauvaises réponses sont tirées au hasard à chaque appel de `tirerChoix`. */
export function genererCartes(): (Omit<Carte, "choix"> & { pool: string[] })[] {
  const cartes: (Omit<Carte, "choix"> & { pool: string[] })[] = [];
  const ctls = allControls.filter((c) => c.fonction && c.sectionId !== "rear");
  const nomsCtl = ctls.map((c) => c.nom);
  for (const c of ctls) {
    cartes.push({ id: `btn:${c.id}`, theme: "boutons", question: `Quel contrôle : « ${c.fonction} »`, reponse: c.nom, pool: nomsCtl, source: c.source, lien: `#carte/${c.id}` });
  }
  const shifts = allControls.flatMap((c) => (c.shift ?? []).map((s) => ({ ...s, ctl: c.id })));
  for (const s of shifts) {
    cartes.push({ id: `shift:${s.combo}`, theme: "shift", question: `Que fait ${s.combo} ?`, reponse: s.effet, pool: shifts.map((x) => x.effet), source: s.source, lien: `#carte/${s.ctl}` });
  }
  for (const p of parameters) {
    const memeGroupe = parameters.filter((x) => x.groupe === p.groupe).map((x) => x.effet);
    cartes.push({ id: `param:${p.id}`, theme: "params", question: `Que fait le paramètre ${p.nom} ?`, reponse: p.effet, pool: memeGroupe.length > 3 ? memeGroupe : parameters.map((x) => x.effet), source: p.source, lien: p.controle ? `#carte/${p.controle}` : undefined });
    if (p.plage) cartes.push({ id: `plage:${p.id}`, theme: "plages", question: `Quelle est la plage de ${p.nom} ?`, reponse: p.plage, pool: parameters.map((x) => x.plage ?? ""), source: p.source });
    else if (p.valeurs && p.valeurs.length > 1) cartes.push({ id: `val:${p.id}`, theme: "plages", question: `Quelles valeurs peut prendre ${p.nom} ?`, reponse: p.valeurs.join(", "), pool: parameters.filter((x) => (x.valeurs?.length ?? 0) > 1).map((x) => x.valeurs!.join(", ")), source: p.source });
  }
  for (const pr of procedures) {
    cartes.push({ id: `geste:${pr.id}`, theme: "gestes", question: `« ${pr.titre} » : quelle est la première étape ?`, reponse: pr.etapes[0], detail: pr.etapes, pool: procedures.map((x) => x.etapes[0]), source: pr.sources[0] });
  }
  for (const g of GAMMES.filter((x) => x.n > 1)) {
    cartes.push({ id: `gamme:${g.n}`, theme: "gammes", question: `Quelle gamme a ces notes (KEY = C) : ${g.notesEnDo.map(enDiese).join(" ")} ?`, reponse: g.nom, pool: GAMMES.map((x) => x.nom), source: { doc: "PG", page: 15 }, lien: `#gammes/${g.n}` });
  }
  for (const c of oscillators.categories) {
    const page = c.de <= 195 ? 11 : c.de <= 392 ? 12 : 13;
    cartes.push({ id: `osc:${c.categorie}`, theme: "osc", question: `Les oscillateurs n° ${c.de} à ${c.a}, ce sont… ?`, reponse: c.nomFr, pool: oscillators.categories.map((x) => x.nomFr), source: { doc: "PG", page } });
  }
  for (const m of LEXIQUE) {
    const memeCat = LEXIQUE.filter((x) => x.cat === m.cat).map((x) => x.def);
    const noms = [m.abr && m.abr !== m.fr ? m.abr : "", m.en && m.en.toLowerCase() !== m.fr.toLowerCase() ? `en anglais : ${m.en}` : ""].filter(Boolean).join(" · ");
    cartes.push({ id: `lex:${m.id}`, theme: "lexique", question: `Que veut dire « ${m.fr} » ?${noms ? ` (${noms})` : ""} · ${CATS_LEX.find((c) => c.id === m.cat)!.nom}`, reponse: m.def, detail: m.e2 ? [`Sur l'E2 : ${m.e2}`] : undefined, pool: memeCat.length > 3 ? memeCat : LEXIQUE.map((x) => x.def), source: m.src ?? m.e2src?.[0], lien: `#glossaire/${m.id}` });
  }
  return cartes;
}

export const tirerChoix = (c: { reponse: string; pool: string[] }) => melange([c.reponse, ...autres(c.reponse, c.pool)]);

// ---------- Répétition espacée (boîtes de Leitner) ----------
// Bonne réponse : la carte monte d'une boîte et revient plus tard. Erreur : retour en boîte 1, à revoir tout de suite.
export const INTERVALLES_JOURS = [0, 1, 2, 4, 8, 16];
export interface Suivi { boite: number; due: number; vues: number; justes: number }
const CLE = "e2academy.quiz";
export function lireSuivi(): Record<string, Suivi> {
  return lireObjet<Record<string, Suivi>>(CLE, {});
}
export function ecrireSuivi(s: Record<string, Suivi>) {
  ecrireJson(CLE, s);
}
export function noter(s: Suivi | undefined, juste: boolean, now = Date.now()): Suivi {
  const b = juste ? Math.min(5, (s?.boite ?? 0) + 1) : 1;
  return { boite: b, due: now + (juste ? INTERVALLES_JOURS[b] : 0) * 86400000, vues: (s?.vues ?? 0) + 1, justes: (s?.justes ?? 0) + (juste ? 1 : 0) };
}
