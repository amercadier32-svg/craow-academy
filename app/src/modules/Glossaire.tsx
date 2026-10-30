// Glossaire (lexique en 10 catégories) et recherche globale : mots, paramètres, contrôles, gestes, oscillateurs, gammes, recettes, grilles.
// Chaque terme : définition simple, nom anglais / abréviation, schéma, aperçu sonore, comment le faire sur l'E2,
// liens vers les recettes, les fiches d'effets, les leçons et les étapes de « Construire un morceau ».
import { BoutonLecture } from "../components/Lecteur";
import { lireJson, ecrireJson } from "../lib/stockage";
import { Etoile } from "../components/Etoile";
import { Fenetre } from "../components/Fenetre";
import { fermerFenetre, ouvrirFenetre, useEtatPage } from "../lib/retour";
import { useEffect, useMemo, useState } from "react";
import { CATS_LEX, CLE_QUIZ_LEX, LEXIQUE, lexById, type Cat, type Mot } from "../content/lexique";
import { ELEMENTS, RECETTES, recetteParId } from "../content/recettes";
import { FICHES } from "../content/effets";
import { ETAPES, etapeById, type EtapeId } from "../content/morceau";
import { NIVEAUX } from "../content/parcours";
import { engine, useEngine } from "../lib/seq";
import { BPM_APERCU, fxEngine, touchFx, useFx } from "../lib/fxaudio";
import { Badge, SourceRef } from "../components/common";
import { Infos, Rangement } from "../components/Rangement";
import { FiltreMenu, type FmValeur } from "../components/FiltreMenu";
import { estFavori, idFavori, useStore } from "../lib/store";
import { LexSchema } from "../components/LexSchema";
import { useKnobRange } from "../components/SeqPlayer";
import { indexRecherche, norm, score, TYPES, type Type } from "../lib/recherche";
import { etatPistes, etatRecette, toutArreter } from "../lib/apercus";
import "./glossaire.css";

const rcById = recetteParId;   // table commune (content/recettes.ts)
const ficheById = new Map(FICHES.map((f) => [f.id, f]));
const catById = new Map(CATS_LEX.map((c) => [c.id, c]));
const index = indexRecherche;

// ---------- Sélection pour le quiz ----------
function lireSel(): string[] { const x = lireJson<string[]>(CLE_QUIZ_LEX, []); return Array.isArray(x) ? x : []; }
function useSelection() {
  const [sel, setSel] = useState<string[]>(lireSel);
  useEffect(() => { ecrireJson(CLE_QUIZ_LEX, sel); }, [sel]);
  const basculer = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return { sel, setSel, basculer };
}
type Sel = ReturnType<typeof useSelection>;

// ---------- Aperçu sonore ----------
function Ecouter({ m }: { m: Mot }) {
  const id = `lex-${m.id}`;
  const snap = useEngine(), fsnap = useFx();
  const range = useKnobRange();
  const ec = m.ec!;
  const playing = snap.owner === id || fsnap.owner === id;
  const rc = "recette" in ec ? rcById.get(ec.recette) : undefined;
  const lancer = () => {
    if ("fx" in ec) { touchFx(id); fxEngine.play(id, { kind: ec.fx.kind, nom: ec.fx.nom, ab: "ab", loop: false, edit: 0.6, x: 0.5, y: 0.5, depth: 0.6, speed: 0.5, bpm: BPM_APERCU }); return; }
    const st = "pistes" in ec ? etatPistes(ec.pistes, ec.bpm, ec.swing, ec.scale) : rc ? etatRecette(rc, range) : null;
    if (!st) return;
    fxEngine.stop(); engine.touch(id); engine.play(id, st);
  };
  useEffect(() => engine.register(id, () => (engine.snap.owner === id || fxEngine.snap.owner === id ? toutArreter() : lancer())), [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (engine.snap.owner === id) engine.stop(); if (fxEngine.snap.owner === id) fxEngine.stop(); }, [id]);
  return (
    <div className="lx-ecoute">
      <BoutonLecture joue={playing} onClick={() => (playing ? toutArreter() : lancer())} libelle="Écouter" />
      <Badge kind="interp">Approximation pédagogique</Badge>
      <span className="small muted">
        {"fx" in ec ? `Le motif commun joué 4 mesures sans l'effet ${ec.fx.nom}, puis 4 mesures avec.` : rc ? `Aperçu de la recette « ${rc.nom} ».` : "Un son simple du navigateur, pas le son réel de l'Electribe."}
      </span>
    </div>
  );
}

// ---------- Liens ----------
interface Lien { href: string; label: string; type: string; voir?: string }
const ORDRE_LIENS = ["Voir aussi", "Recette", "Fiche d'effet", "Leçon", "Construire un morceau", "Module", "Recettes"];
function liensDe(m: Mot): Lien[] {
  const out: Lien[] = [];
  const vu = new Set<string>();
  const add = (l: Lien) => { if (!vu.has(l.href + l.label)) { vu.add(l.href + l.label); out.push(l); } };
  for (const l of m.liens ?? []) {
    if (l.startsWith("r:")) { const rc = rcById.get(l.slice(2)); if (rc) add({ href: `#recettes/${rc.id}`, label: rc.nom, type: "Recette" }); }
    else if (l.startsWith("fx:")) { const f = ficheById.get(l.slice(3)); if (f) add({ href: `#effets/${f.id}`, label: `${f.kind.toUpperCase()} ${f.n} · ${f.nom}`, type: "Fiche d'effet" }); }
    else if (l.startsWith("e:")) { const e = etapeById.get(l.slice(2) as EtapeId); if (e) add({ href: `#morceau/${e.id}`, label: `Étape ${e.nom}`, type: "Construire un morceau" }); }
    else if (l.startsWith("voir:")) { const t = lexById.get(l.slice(5)); if (t) add({ href: `#glossaire/${t.id}`, label: t.fr, type: "Voir aussi", voir: t.id }); }
    else if (l.startsWith("#")) { const [href, label] = l.split("|"); add({ href, label: label ?? href, type: href.startsWith("#studio/masteriser/lecon") ? "Leçon" : href.startsWith("#morceau") ? "Construire un morceau" : "Module" }); }
  }
  if (m.ec && "recette" in m.ec) { const rc = rcById.get(m.ec.recette); if (rc) add({ href: `#recettes/${rc.id}`, label: rc.nom, type: "Recette" }); }
  if (m.el?.length) {
    const deja = out.filter((l) => l.type === "Recette").length;
    for (const r of RECETTES.filter((r) => r.element && m.el!.includes(r.element)).slice(0, Math.max(0, 5 - deja))) add({ href: `#recettes/${r.id}`, label: r.nom, type: "Recette" });
    for (const e of ETAPES) if (e.elements.some((x) => m.el!.includes(x.id))) add({ href: `#morceau/${e.id}`, label: `Étape ${e.nom}`, type: "Construire un morceau" });
    const elNoms = m.el.map((x) => ELEMENTS.get(x)?.nom).filter(Boolean);
    if (elNoms.length) add({ href: "#recettes", label: `Toutes les recettes : ${elNoms.join(", ")}`, type: "Recettes" });
  }
  // Leçons du parcours dont le titre cite le terme
  const noms = [m.fr, m.en, m.abr].filter((x): x is string => !!x && x.length >= 3).map(norm);
  for (const n of NIVEAUX) for (const l of n.lecons) {
    const t = norm(l.titre);
    if (noms.some((x) => new RegExp(`(^|[^a-z])${x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s?([^a-z]|$)`).test(t))) add({ href: "#parcours", label: `Parcours ${n.n} · ${l.titre}`, type: "Leçon" });
  }
  return out;
}

// ---------- Fiche d'un terme ----------
function Fiche({ m, sel, onVoir }: { m: Mot; sel: Sel; onVoir: (id: string) => void }) {
  const c = catById.get(m.cat)!;
  const liens = liensDe(m);
  const groupes = ORDRE_LIENS.filter((g) => liens.some((l) => l.type === g));
  return (
    <article className="lx-fiche" style={{ ["--cc" as string]: c.couleur }}>
      <header className="lx-fiche-h">
        <div>
          <p className="small muted">{c.nom}</p>
          <h3>{m.fr} {m.ec && <Etoile type="lex" cle={m.id} titre={m.fr} />}</h3>
          <p className="lx-noms">
            {m.abr && m.abr !== m.fr && <span><b>Abréviation</b> {m.abr}</span>}
            {m.en && <span><b>En anglais</b> {m.en}</span>}
            {m.aussi?.length ? <span><b>Aussi</b> {m.aussi.join(", ")}</span> : null}
          </p>
        </div>
        <div className="lx-badges">
          <Badge kind={m.kind} />{m.src && <SourceRef src={m.src} />}
          <label className="lx-check"><input type="checkbox" checked={sel.sel.includes(m.id)} onChange={() => sel.basculer(m.id)} /> Pour le quiz</label>
        </div>
      </header>
      <p className="lx-def">{m.def}</p>
      {(m.sch || m.ec) && (
        <div className="lx-media">
          {m.sch && <LexSchema s={m.sch} />}
          {m.ec && <Ecouter m={m} />}
        </div>
      )}
      {(m.e2 || m.e2src?.length) && (
        <div className="lx-e2">
          <h4>Sur l'E2</h4>
          {m.e2 && <p>{m.e2}</p>}
          {m.e2src?.length ? <p className="lx-pages">{m.e2src.map((s, i) => <SourceRef key={i} src={s} />)}</p> : null}
        </div>
      )}
      {groupes.length > 0 && (
        <div className="lx-liens">
          {groupes.map((g) => (
            <div key={g}>
              <h4>{g === "Recette" ? "Recettes" : g === "Fiche d'effet" ? "Fiches d'effets" : g === "Leçon" ? "Leçons" : g === "Recettes" ? "Dans Recettes" : g === "Module" ? "Dans l'app" : g}</h4>
              <div className="lx-chips">
                {liens.filter((l) => l.type === g).map((l) => l.voir
                  ? <button key={l.href} type="button" className="chipbtn" onClick={() => onVoir(l.voir!)}>{l.label}</button>
                  : <a key={l.href + l.label} className="chipbtn" href={l.href}>{l.label}</a>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Carte({ m, sel, onOpen, avecCat }: { m: Mot; sel: Sel; onOpen: () => void; avecCat?: boolean }) {
  const c = catById.get(m.cat)!;
  return (
    <li className="lx-carte" style={{ ["--cc" as string]: c.couleur }}>
      <input type="checkbox" aria-label={`Ajouter ${m.fr} au quiz`} checked={sel.sel.includes(m.id)} onChange={() => sel.basculer(m.id)} />
      <button type="button" className="lx-carte-b" onClick={onOpen}>
        <span className="lx-carte-h"><b>{m.fr}</b>{m.abr && m.abr !== m.fr && <small>{m.abr}</small>}{m.en && <small className="muted">{m.en}</small>}</span>
        <span className="lx-carte-def">{m.def}</span>
        <span className="lx-carte-pied">
          <Badge kind={m.kind} />
          {avecCat && <span className="mc-tag">{c.nom}</span>}
          {m.sch && <span className="mc-tag">schéma</span>}
          {m.ec && <span className="mc-tag">▶ écouter</span>}
        </span>
      </button>
    </li>
  );
}

export default function Glossaire({ focus }: { focus?: string }) {
  const all = useMemo(index, []);
  const sel = useSelection();
  const f0 = focus && !focus.startsWith("q=") ? lexById.get(focus) : undefined;
  const [q, setQ] = useEtatPage("glossaire.recherche", focus?.startsWith("q=") ? decodeURIComponent(focus.slice(2)) : "");
  const [cat, setCat] = useEtatPage<Cat | null>("glossaire.cat", f0?.cat ?? null);
  const [el, setEl] = useState<string | null>(f0?.id ?? null);
  const [open, setOpen] = useState<string | null>(null);
  const [fl, setFl] = useEtatPage<FmValeur>("glossaire.filtres", { cat: [], source: [], ecoute: [], favoris: [] });
  const voir = (id: string | null) => { setEl(id); if (id) ouvrirFenetre(`#glossaire/${id}`); };
  const fermer = () => fermerFenetre("#glossaire", () => setEl(null));
  // Retour du navigateur : la fenêtre suit l'adresse (#glossaire = fermée, #glossaire/<terme> = ouverte).
  useEffect(() => {
    const suivre = () => { const [m, id] = location.hash.replace("#", "").split("/"); if (m === "glossaire") setEl(id && lexById.has(id) ? id : null); };
    window.addEventListener("popstate", suivre);
    return () => window.removeEventListener("popstate", suivre);
  }, []);
  const st = useStore();
  const passe = (m: Mot) => (!fl.cat.length || fl.cat.includes(m.cat)) && (!fl.source.length || fl.source.includes(m.kind)) && (!fl.ecoute.length || Boolean(m.ec))
    && (!fl.favoris.length || estFavori(st, idFavori("lex", m.id)));
  const filtre = fl.cat.length + fl.source.length + fl.ecoute.length + fl.favoris.length > 0;
  const filtres = LEXIQUE.filter(passe).sort((a, b) => a.fr.localeCompare(b.fr, "fr"));
  const ouvrir = (id: string) => { const t = lexById.get(id); if (!t) return; setQ(""); setCat(t.cat); voir(t.id); };

  const qn = norm(q.trim());
  const mots = qn.split(/\s+/).filter(Boolean);
  const lex = mots.length ? LEXIQUE.map((m) => ({ m, s: score(m, qn, mots) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.m.fr.localeCompare(b.m.fr, "fr")).map((x) => x.m) : [];
  const res = mots.length ? all.filter((x) => mots.every((m) => x.cle.includes(m))) : [];
  const parType = (Object.keys(TYPES) as Type[]).map((t) => ({ t, items: res.filter((x) => x.type === t) })).filter((x) => x.items.length);
  const termes = cat ? LEXIQUE.filter((m) => m.cat === cat && passe(m)).sort((a, b) => a.fr.localeCompare(b.fr, "fr")) : [];
  const fiche = el ? lexById.get(el) : undefined;
  const lancerQuiz = () => { location.hash = "#quiz/lexique"; };

  return (
    <div className="glossaire">
      <h2 className="page-title">Glossaire et recherche</h2>
      <Infos>
        <p>{LEXIQUE.length} mots pour faire de la tekno sur l'E2, du Tribe au Dub tekno, rangés en {CATS_LEX.length} catégories. Les mots de la machine viennent du manuel <Badge kind="manuel" /> avec la page ; les mots de musique et de style sont expliqués simplement <Badge kind="pratique" />, de façon neutre. Les boutons « Écouter » jouent une <Badge kind="interp">Approximation pédagogique</Badge>, pas le son réel de l'Electribe.</p>
        <p>Coche des termes, puis « Quiz » : ils partent dans les flashcards.</p>
      </Infos>
      <input className="gl-search" type="search" placeholder="Cherche en français, en anglais ou une abréviation (ex. HHO, charleston ouvert, open hat, cutoff, 326)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Recherche" />

      <div className="lx-quizbar">
        <span><b>{sel.sel.length}</b> terme{sel.sel.length > 1 ? "s" : ""} pour le quiz</span>
        {cat && !mots.length && <button type="button" className="chipbtn" onClick={() => sel.setSel((s) => [...new Set([...s, ...termes.map((t) => t.id)])])}>Cocher toute la catégorie</button>}
        {sel.sel.length > 0 && <button type="button" className="chipbtn" onClick={() => sel.setSel([])}>Tout décocher</button>}
        <button type="button" className="e2-ui-btn" onClick={lancerQuiz} disabled={!sel.sel.length}>▶ Quiz</button>
      </div>

      {mots.length > 0 ? (
        <div className="gl-results">
          <p className="small muted">{lex.length + res.length} résultat{lex.length + res.length > 1 ? "s" : ""}{lex.length + res.length === 0 ? " : ce mot n'apparaît pas dans le manuel ni dans l'app." : ""}</p>
          {lex.length > 0 && (
            <section>
              <h3>Glossaire <small className="muted">({lex.length})</small></h3>
              <ul className="lx-cartes">{lex.slice(0, 40).map((m) => <Carte key={m.id} m={m} sel={sel} avecCat onOpen={() => ouvrir(m.id)} />)}</ul>
            </section>
          )}
          {parType.map(({ t, items }) => (
            <section key={t}>
              <h3>{TYPES[t]} <small className="muted">({items.length})</small></h3>
              <ul className="gl-list">
                {items.slice(0, t === "osc" ? 30 : 60).map((x) => {
                  const id = x.type + x.titre;
                  return (
                    <li key={id}>
                      <div className="gl-head">
                        {x.lien ? <a href={x.lien}><b>{x.titre}</b></a> : <b>{x.titre}</b>}
                        <Badge kind={x.kind} />
                        {x.source && <SourceRef src={x.source} compact />}
                      </div>
                      <p>{x.texte}</p>
                      {x.plus && (open === id
                        ? <ol className="steps">{x.plus.map((s) => <li key={s}>{s}</li>)}</ol>
                        : <button type="button" className="chipbtn" onClick={() => setOpen(id)}>Voir les étapes</button>)}
                    </li>
                  );
                })}
              </ul>
              {t === "osc" && items.length > 30 && <p className="small muted">… et {items.length - 30} autres : précise ta recherche.</p>}
            </section>
          ))}
        </div>
      ) : (
        <>
          <Rangement racine="Glossaire" sansAriane cats={fl.cat} labelCategorie="Catégorie" labelElement="Terme" feuille={fiche && !cat ? fiche.fr : undefined}
            categories={CATS_LEX.map((c) => ({ id: c.id, nom: c.nom, icone: c.icone, couleur: c.couleur, texte: c.texte, n: LEXIQUE.filter((m) => m.cat === c.id).length,
              elements: LEXIQUE.filter((m) => m.cat === c.id).sort((a, b) => a.fr.localeCompare(b.fr, "fr")).map((m) => ({ id: m.id, nom: m.fr })) }))}
            cat={cat} onCat={(c) => { setCat(c as Cat | null); setEl(null); setFl((v) => ({ ...v, cat: [] })); }} element={el} onElement={voir} />
          <FiltreMenu valeur={fl} onChange={(v) => { setFl(v); setEl(null); if (v.cat.length) setCat(null); }} resultat={`${cat ? termes.length : filtres.length} terme${(cat ? termes.length : filtres.length) > 1 ? "s" : ""}`}
            groupes={[
              { id: "cat", titre: "Catégorie", options: CATS_LEX.map((c) => ({ id: c.id, nom: c.nom, couleur: c.couleur, n: LEXIQUE.filter((m) => m.cat === c.id).length })) },
              { id: "source", titre: "Source", options: [{ id: "manuel", nom: "Manuel", n: LEXIQUE.filter((m) => m.kind === "manuel").length }, { id: "pratique", nom: "Pratique", n: LEXIQUE.filter((m) => m.kind === "pratique").length }] },
              { id: "ecoute", titre: "Écoute", options: [{ id: "oui", nom: "▶ Avec un aperçu à écouter", n: LEXIQUE.filter((m) => m.ec).length }] },
              { id: "favoris", titre: "Favoris", options: [{ id: "oui", nom: "★ Favoris seulement", n: LEXIQUE.filter((m) => estFavori(st, idFavori("lex", m.id))).length }] },
            ]}
            autres={cat ? [{ id: cat, nom: catById.get(cat)!.nom, couleur: catById.get(cat)!.couleur, retirer: () => { setCat(null); setEl(null); } }] : []}
            onToutEffacer={() => { setCat(null); setEl(null); }} />
          {fiche && (
            <Fenetre sorte="fiche" titre={fiche.fr} label={fiche.fr} onFermer={fermer}
              etoile={fiche.ec ? <Etoile type="lex" cle={fiche.id} titre={fiche.fr} /> : undefined}>
              <Fiche key={fiche.id} m={fiche} sel={sel} onVoir={ouvrir} />
            </Fenetre>
          )}
          {cat ? (
            <ul className="lx-cartes">{termes.map((m) => <Carte key={m.id} m={m} sel={sel} onOpen={() => voir(m.id)} />)}</ul>
          ) : filtre ? (
            filtres.length ? <ul className="lx-cartes">{filtres.map((m) => <Carte key={m.id} m={m} sel={sel} avecCat onOpen={() => ouvrir(m.id)} />)}</ul>
              : <p className="rg-hint">Aucun terme pour ces filtres.</p>
          ) : (
            <div className="lx-abc">
              <h3>Tous les mots, de A à Z</h3>
              <div className="lx-chips">
                {[...LEXIQUE].sort((a, b) => a.fr.localeCompare(b.fr, "fr")).map((m) => (
                  <button key={m.id} type="button" className="chipbtn lx-az" style={{ ["--cc" as string]: catById.get(m.cat)!.couleur }} onClick={() => ouvrir(m.id)}>{m.fr}</button>
                ))}
              </div>
              <p className="small muted">La barre de recherche cherche aussi dans tout le reste de l'app : {all.length} entrées (paramètres, boutons, gestes, recettes, effets, oscillateurs, gammes).</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
