// Recherche globale de l'app : glossaire, recettes, effets, gammes, leçons, fiches de la machine…
// Utilisée par la barre de recherche de l'accueil et par la page Glossaire et recherche.
import { LEXIQUE, type Mot } from "../content/lexique";
import { RECETTES } from "../content/recettes";
import { FICHES, pageListe } from "../content/effets";
import { NIVEAUX } from "../content/parcours";
import { allControls, oscillators, parameters, procedures, type Source } from "./data";
import { GAMMES, enDiese } from "./music";
import { DEFIS } from "../content/defis";
import { LECONS } from "../content/mastering";
import { FICHES as STYLES } from "../content/styles";
import { getState, listeAnalyses, listeGenerees, listeSessions } from "./store";

export type Type = "page" | "lecon" | "param" | "ctl" | "geste" | "fx" | "osc" | "gamme" | "recette" | "grille" | "defi" | "session" | "analyse";
export const TYPES: Record<Type, string> = { page: "Pages de l'app", recette: "Recettes", fx: "Effets et modulations", gamme: "Gammes", lecon: "Leçons", defi: "Défis de Session", session: "Mes sessions", analyse: "Mes analyses", param: "Paramètres", ctl: "Boutons et potards", geste: "Gestes", grille: "Grilles", osc: "Oscillateurs" };

/** Les pages et onglets de l'app : taper « studio », « masteriser », « groove », « midi »… mène au bon endroit. */
const PAGES: { titre: string; texte: string; lien: string; mots: string }[] = [
  { titre: "Studio", texte: "Enregistrer, visualiser, analyser et masteriser ton son.", lien: "#studio", mots: "studio son audio" },
  { titre: "Studio · Enregistrer", texte: "Enregistrer l'E2 par la Scarlett, et Mes enregistrements.", lien: "#studio/enregistrer", mots: "enregistrer enregistrement enregistrements prise rec scarlett" },
  { titre: "Studio · Visualiser", texte: "Spectre en courbe, onde, oscilloscope, stéréo en direct, mode vidéo (OBS, fond vert).", lien: "#studio/visualiser", mots: "visualiser visualiseur spectre oscilloscope video obs fond vert transparent" },
  { titre: "Studio · Mode vidéo", texte: "Plein écran pour OBS, TikTok, YouTube : visualisations, polices, fonds, presets.", lien: "#studio/visualiser/video", mots: "mode video obs fond vert transparent chroma" },
  { titre: "Studio · Analyser", texte: "Tempo, tonalité et son d'un morceau, recettes de départ.", lien: "#studio/analyser", mots: "analyser analyse reference morceau bpm tonalite" },
  { titre: "Studio · Masteriser", texte: "6 curseurs, presets, A/B au même volume, export WAV et MP3.", lien: "#studio/masteriser", mots: "masteriser mastering master export lufs" },
  { titre: "Recettes", texte: "Les sons prêts à copier, le bouton 🎲 et la recette vierge.", lien: "#recettes", mots: "recettes recette vierge generer generateur hasard testee" },
  { titre: "Gammes et tonalités", texte: "Les gammes utiles d'abord, puis toutes les autres.", lien: "#gammes", mots: "gammes gamme scale key tonalite" },
  { titre: "Guide des effets et modulations", texte: "Insert FX, Master FX et modulations.", lien: "#effets", mots: "effets effet ifx mfx modulation" },
  { titre: "Construire un morceau", texte: "Un morceau couche par couche, grille et structure.", lien: "#morceau", mots: "morceau grille structure" },
  { titre: "Session", texte: "Défis chronométrés et historique.", lien: "#session", mots: "session sessions defi chrono historique" },
  { titre: "Groove", texte: "Swing, Groove, Chord et Gate Arp.", lien: "#jeu", mots: "groove swing chord gate arp" },
  { titre: "MIDI", texte: "L'app parle à ton E2 en USB.", lien: "#midi", mots: "midi usb" },
  { titre: "Mon setup", texte: "2 E2, TD-3, Scarlett et FL Studio.", lien: "#setup", mots: "setup branchements td3 fl studio scarlett" },
  { titre: "Carte de la machine", texte: "Chaque potard, bouton et pad.", lien: "#carte", mots: "carte machine potards boutons" },
  { titre: "Chaîne du son", texte: "De l'oscillateur à la sortie.", lien: "#chaine", mots: "chaine son signal" },
  { titre: "Les styles", texte: "Les fiches des styles (BPM, gammes, son).", lien: "#styles", mots: "styles style fiches" },
  { titre: "Parcours", texte: "Les leçons pas à pas.", lien: "#parcours", mots: "parcours lecons apprendre" },
  { titre: "Quiz", texte: "Flashcards et répétition espacée.", lien: "#quiz", mots: "quiz flashcards" },
  { titre: "Carnet", texte: "Toutes tes notes.", lien: "#carnet", mots: "carnet notes observations" },
  { titre: "Mes favoris", texte: "Tout ce que tu as marqué d'une étoile.", lien: "#favoris", mots: "favoris etoile" },
  { titre: "Mes données", texte: "Sauvegarde, export, import, place utilisée.", lien: "#donnees", mots: "donnees sauvegarde export import" },
  { titre: "Réglages audio", texte: "Entrée de la Scarlett, test, mono / stéréo.", lien: "#audio", mots: "reglages audio entree scarlett frequence" },
  { titre: "Raccourcis clavier", texte: "Toutes les touches de l'app.", lien: "#raccourcis", mots: "raccourcis clavier touches" },
];
export interface Entree { type: Type; titre: string; texte: string; plus?: string[]; kind: "manuel" | "pratique"; source?: Source; lien?: string; cle: string }

export { norm } from "./texte";
import { norm } from "./texte";

export function indexRecherche(): Entree[] {
  const e: Entree[] = [];
  for (const p of parameters) e.push({ type: "param", titre: p.nom, texte: p.effet + (p.plage ? ` Plage : ${p.plage}.` : p.valeurs ? ` Valeurs : ${p.valeurs.join(", ")}.` : " Plage absente du manuel."), kind: "manuel", source: p.source, lien: p.controle ? `#carte/${p.controle}` : undefined, cle: `${p.nom} ${p.id} ${p.effet}` });
  for (const c of allControls) e.push({ type: "ctl", titre: c.nom, texte: c.fonction + (c.shift?.length ? ` ${c.shift.map((s) => `${s.combo} : ${s.effet}`).join(" ")}` : ""), kind: "manuel", source: c.source, lien: c.sectionId === "rear" ? "#carte" : `#carte/${c.id}`, cle: `${c.nom} ${c.fonction} ${(c.shift ?? []).map((s) => s.combo + " " + s.effet).join(" ")}` });
  for (const p of procedures) e.push({ type: "geste", titre: p.titre, texte: p.but, plus: p.etapes, kind: "manuel", source: p.sources[0], cle: `${p.titre} ${p.but} ${p.etapes.join(" ")} ${(p.astuces ?? []).join(" ")}` });
  for (const g of GAMMES) e.push({ type: "gamme", titre: `${g.n} · ${g.nom}`, texte: `Notes en C : ${g.notesEnDo.map(enDiese).join(" ")}`, kind: "manuel", source: { doc: "PG", page: 15 }, lien: `#gammes/${g.n}`, cle: `${g.nom} gamme scale ${g.n}` });
  for (const p of PAGES) e.push({ type: "page", titre: p.titre, texte: p.texte, kind: "pratique", lien: p.lien, cle: `${p.titre} ${p.mots} ${p.texte}` });
  for (const f of STYLES) e.push({ type: "page", titre: `Style · ${f.nom}`, texte: `${f.bpm.min} à ${f.bpm.max} BPM`, kind: "pratique", lien: `#styles/${f.id}`, cle: `${f.nom} style fiche ${f.caractere.join(" ")}` });
  for (const l of LECONS) e.push({ type: "lecon", titre: `Mastering · ${l.nom}`, texte: l.idee, kind: "pratique", lien: `#studio/masteriser/lecon-${l.id}`, cle: `${l.nom} mastering masteriser ${l.idee} ${l.points.join(" ")}` });
  // ce que tu as créé : tes recettes gardées (générées, vierges, d'après une référence), tes sessions, tes analyses
  const st = getState();
  for (const r of listeGenerees(st)) e.push({ type: "recette", titre: r.nom, texte: `${r.origine?.type === "perso" ? "Mes recettes" : r.origine?.type === "reference" ? "D'après une référence" : "Générée"} · ${r.idee}`, kind: "pratique", lien: `#recettes/${r.id}`, cle: `${r.nom} ${r.idee} ${r.styles.join(" ")} ${r.fonction} ${r.element ?? ""} mes recettes` });
  for (const x of listeSessions(st)) e.push({ type: "session", titre: x.titre, texte: `${new Date(x.le).toLocaleDateString("fr-FR")} · ${x.statut === "finie" ? "finie" : "à reprendre"}${x.pattern ? ` · motif ${x.pattern}` : ""}`, kind: "pratique", lien: "#session/historique", cle: `${x.titre} session ${x.style ?? ""} ${x.marche} ${x.difficile} ${x.referais} ${x.pattern}` });
  for (const a of listeAnalyses(st)) e.push({ type: "analyse", titre: a.nom, texte: `Analyse · ${a.bpm ? `${Math.round(a.bpm)} BPM` : "BPM ?"}${a.key ? ` · ${a.key}` : ""}`, kind: "pratique", lien: `#studio/analyser/${a.id}`, cle: `${a.nom} ${a.fichier} ${a.notes} analyse reference` });
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
