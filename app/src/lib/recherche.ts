// Recherche globale de l'app : glossaire, recettes, effets, gammes, leçons, fiches de la machine…
// Utilisée par la barre de recherche de l'accueil et par la page Glossaire et recherche.
import { LEXIQUE, type Mot } from "../content/lexique";
import { RECETTES } from "../content/recettes";
import { FICHES, pageListe } from "../content/effets";
import { NIVEAUX } from "../content/parcours";
import { allControls, oscillators, parameters, procedures, type Source } from "./data";
import { GAMMES, enDiese } from "./music";
import { DEFIS } from "../content/defis";

export type Type = "lecon" | "param" | "ctl" | "geste" | "fx" | "osc" | "gamme" | "recette" | "grille" | "defi";
export const TYPES: Record<Type, string> = { param: "Paramètres", ctl: "Boutons et potards", geste: "Gestes", fx: "Effets et modulations", gamme: "Gammes", recette: "Recettes", grille: "Grilles", osc: "Oscillateurs", lecon: "Leçons", defi: "Défis de Session" };
export interface Entree { type: Type; titre: string; texte: string; plus?: string[]; kind: "manuel" | "pratique"; source?: Source; lien?: string; cle: string }

export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function indexRecherche(): Entree[] {
  const e: Entree[] = [];
  for (const p of parameters) e.push({ type: "param", titre: p.nom, texte: p.effet + (p.plage ? ` Plage : ${p.plage}.` : p.valeurs ? ` Valeurs : ${p.valeurs.join(", ")}.` : " Plage absente du manuel."), kind: "manuel", source: p.source, lien: p.controle ? `#carte/${p.controle}` : undefined, cle: `${p.nom} ${p.id} ${p.effet}` });
  for (const c of allControls) e.push({ type: "ctl", titre: c.nom, texte: c.fonction + (c.shift?.length ? ` ${c.shift.map((s) => `${s.combo} : ${s.effet}`).join(" ")}` : ""), kind: "manuel", source: c.source, lien: c.sectionId === "rear" ? "#carte" : `#carte/${c.id}`, cle: `${c.nom} ${c.fonction} ${(c.shift ?? []).map((s) => s.combo + " " + s.effet).join(" ")}` });
  for (const p of procedures) e.push({ type: "geste", titre: p.titre, texte: p.but, plus: p.etapes, kind: "manuel", source: p.sources[0], cle: `${p.titre} ${p.but} ${p.etapes.join(" ")} ${(p.astuces ?? []).join(" ")}` });
  for (const g of GAMMES) e.push({ type: "gamme", titre: `${g.n} · ${g.nom}`, texte: `Notes en C : ${g.notesEnDo.map(enDiese).join(" ")}`, kind: "manuel", source: { doc: "PG", page: 15 }, lien: `#gammes/${g.n}`, cle: `${g.nom} gamme scale ${g.n}` });
  for (const r of RECETTES) e.push({ type: "recette", titre: r.nom, texte: r.idee, kind: "pratique", lien: `#recettes/${r.id}`, cle: `${r.nom} ${r.idee} ${r.styles.join(" ")} ${r.fonction} ${r.reglages.map((x) => x.valeur).join(" ")}` });
  for (const f of FICHES) e.push({ type: "fx", titre: `${f.kind === "ifx" ? "IFX" : f.kind === "mfx" ? "MFX" : "Modulation"} ${f.n} · ${f.nom}`, texte: f.kind === "mod" ? `${f.sourceManuel} → ${f.destManuel}` : f.quoi, kind: "manuel", source: f.kind === "mod" && f.n > 64 ? { doc: "PG", page: 15 } : pageListe(f.kind), lien: `#effets/${f.id}`, cle: `${f.nom} ${f.kind} ${f.n} effet ${f.kind === "mod" ? f.sourceManuel + " " + f.destManuel : f.quoi}` });
  for (const o of oscillators.oscillateurs) e.push({ type: "osc", titre: `${o.n} ${o.nom}`, texte: o.nomCategorieFr, kind: "manuel", source: { doc: "PG", page: o.n <= 195 ? 11 : o.n <= 392 ? 12 : 13 }, cle: `${o.n} ${o.nom} ${o.nomCategorieFr} ${o.categorie}` });
  for (const n of NIVEAUX) for (const l of n.lecons) e.push({ type: "lecon", titre: `Niveau ${n.n} · ${l.titre}`, texte: l.objectif, kind: "pratique", lien: "#parcours", cle: `${l.titre} ${l.objectif} ${n.titre} ${l.reussite ?? ""}` });
  for (const d of DEFIS) e.push({ type: "defi", titre: d.titre, texte: `${d.duree} min · ${d.objectif}`, kind: "pratique", lien: `#session/defi-${d.id}`, cle: `${d.titre} ${d.objectif} defi session ${d.contraintes.map((c) => c.texte).join(" ")} ${(d.styles ?? []).join(" ")}` });
  return e.map((x) => ({ ...x, cle: norm(x.cle) }));
}

/** Score de recherche d'un terme : nom, abréviation, nom anglais, autres noms d'abord, puis la définition. */
export function score(m: Mot, q: string, mots: string[]) {
  const noms = [m.fr, m.abr ?? "", m.en ?? "", ...(m.aussi ?? [])].map(norm);
  if (noms[0] === q) return 110;
  if (noms.some((n) => n === q)) return 100;
  if (noms.some((n) => n.startsWith(q))) return 80;
  const tout = noms.join(" ");
  if (mots.every((w) => tout.includes(w))) return 60;
  if (mots.every((w) => (tout + " " + norm(m.def)).includes(w))) return 20;
  return 0;
}


/** Cherche partout : les termes du glossaire (classés) et les autres entrées de l'app. */
export function chercher(q: string, all: Entree[]) {
  const qn = norm(q.trim());
  const mots = qn.split(/\s+/).filter(Boolean);
  if (!mots.length) return { lex: [] as Mot[], res: [] as Entree[] };
  const lex = LEXIQUE.map((m) => ({ m, s: score(m, qn, mots) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.m.fr.localeCompare(b.m.fr, "fr")).map((x) => x.m);
  const res = all.filter((x) => mots.every((m) => x.cle.includes(m)));
  return { lex, res };
}
