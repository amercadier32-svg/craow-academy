import { BoutonJeter, Corbeille, EntreeCorbeille } from "../components/Corbeille";
import { BoutonsEcoute } from "../components/Lecteur";
import { lireObjet, ecrireJson } from "../lib/stockage";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Etoile } from "../components/Etoile";
import { COULEURS, Infos, Rangement } from "../components/Rangement";
import { Confirmer, FiltreMenu, type FmGroupe, type FmValeur } from "../components/FiltreMenu";
import { PixelArt } from "../components/PixelArt";
import { GENERATEURS, genererVariante } from "../lib/generateur";
import { etatRecette, jouerSeq } from "../lib/apercus";
import { engine, type Mode } from "../lib/seq";
import { CATEGORIES, ELEMENTS, FONCTIONS, KNOBS_APERCU, RECETTES, STYLE_NOM, type ElementId, type Recette, type Reglage, type Style, type StyleBase } from "../content/recettes";
import { exerciseById, type Exercise } from "../content/exercises";
import { paramById, parameterGroups } from "../lib/data";
import { ALL_KEYS, GAMMES, gammeByN } from "../lib/music";
import { SONS_PERCU } from "../lib/seq";
import { CTL, CopierPanel, LIGNE_NOTES, LIGNE_SEQUENCER, LIGNE_WRITE, MonEnregistrement, fusion, lignesPrep, lignesSequence, lignesSon, listPage, val } from "../components/Machine";
import { estFavori, etatDe, garderRecette, idFavori, listeGenerees, mettreALaCorbeille, restaurerRecette, supprimerDefinitivement, useStore, viderCorbeille } from "../lib/store";
import { Badge, DoneToggle, ObservationBox, SourceRef, StartValueChip } from "../components/common";
import { ExerciseCard } from "../components/ExerciseCard";
import { SeqPlayer, useKnobRange, usePlayerPrefs, useSeqEdit, type SeqData } from "../components/SeqPlayer";
import { Editeur } from "./Grilles";
import { SelecteurStyles } from "../components/Styles";
import { FICHE, useStyles } from "../content/styles";
import { VIDES_STYLES } from "../content/recettesStylesSuite";

const BPM = 165;
/** Badge des recettes gardées : « 🎲 Générée » ou « 🔍 D'après une référence » (module Analyser une référence). */
function BadgeGen({ rc }: { rc: Recette }) {
  return rc.origine?.type === "reference"
    ? <Badge kind="ref" title={`D'après « ${rc.origine.morceau} »`} />
    : <Badge kind="genere" />;
}
const ORDER = ["oscillateur", "filtre", "modulation", "ampli", "ifx", "mfx", "motif", "partie", "pas"];
const TITRES: Record<string, string> = { oscillateur: "Oscillator", filtre: "Filter", modulation: "Modulation", ampli: "Amp/EG", ifx: "Insert Fx", mfx: "Master Fx", motif: "Motif", partie: "Partie", pas: "Pas" };

function origineDe(rc: Recette): SeqData {
  const knobs: Record<string, number> = {};
  for (const x of rc.reglages) if (KNOBS_APERCU.includes(x.param) && /^\d+$/.test(x.valeur)) knobs[x.param] = Number(x.valeur);
  return { mesures: rc.mesures, key: rc.melodique?.key ?? "D", scale: rc.melodique?.scale ?? 7, bpm: rc.bpm ?? BPM, knobs };
}

const COULEUR_CAT: Record<string, string> = { rythmique: COULEURS.rythmique, basse: COULEURS.basse, melodie: COULEURS.melodie, ambiance: COULEURS.ambiance, transitions: COULEURS.effets };
const ICONE_CAT: Record<string, string> = { rythmique: "rythmique", basse: "basse", melodie: "melodie", ambiance: "ambiance", transitions: "transitions" };

type RecetteEl = Recette & { element: ElementId };
type SourceRc = "pratique" | "mes" | "generees" | "reference";
const SOURCES: { id: SourceRc; nom: string }[] = [
  { id: "pratique", nom: "Pratique (recettes de l'app)" }, { id: "mes", nom: "Mes recettes (testées ou avec ma version)" }, { id: "generees", nom: "Générées (🎲 gardées)" }, { id: "reference", nom: "D'après une référence (🔍)" },
];
const catDe = (x: Recette) => (x.element ? ELEMENTS.get(x.element)?.categorie : undefined);
const FILTRES0: FmValeur = { style: [], cat: [], el: [], source: [], favoris: [] };

export default function Recettes({ focus }: { focus?: string }) {
  const st = useStore();
  const range = useKnobRange();
  const generees = useMemo(() => listeGenerees(st).map((x) => ({ ...x, element: x.element ?? "kick" }) as RecetteEl), [st]);
  const genIds = useMemo(() => new Set(Object.keys(st.recettesGenerees)), [st.recettesGenerees]);
  const toutes: RecetteEl[] = useMemo(() => [...RECETTES, ...generees], [generees]);
  // Styles masqués (« Gérer les styles ») : leurs recettes sont cachées mais conservées.
  const { visibles, masques } = useStyles();
  const cacheeParStyle = (x: Recette) => x.styles.length > 0 && x.styles.every((s) => masques.has(s));
  const actives = toutes.filter((x) => etatDe(st, x.id) === "active" && !cacheeParStyle(x));
  const nbCachees = toutes.filter((x) => etatDe(st, x.id) === "active" && cacheeParStyle(x)).length;
  const corbeille = toutes.filter((x) => etatDe(st, x.id) === "corbeille");
  const depart = focus ? actives.find((x) => x.id === focus) : undefined;

  const [f, setF] = useState<FmValeur>(() => {
    // « Voir les recettes Hardtek » depuis une fiche de style.
    let style: string[] = [];
    try { const x = sessionStorage.getItem("e2academy.recettes.style"); if (x) { style = [x]; sessionStorage.removeItem("e2academy.recettes.style"); } } catch { /* */ }
    return { ...FILTRES0, style, cat: depart ? [catDe(depart)!] : [] };
  });
  const [vue, setVue] = useState<"liste" | "corbeille">("liste");
  const [ouverts, setOuverts] = useState<Set<string>>(() => new Set(depart ? [depart.element] : []));
  const [onglet, setOnglet] = useState<Record<string, "recettes" | "generer">>({});
  const [sel, setSel] = useState<string | null>(depart ? depart.id : null);
  const [brouillon, setBrouillon] = useState<RecetteEl | null>(null);
  const [confirm, setConfirm] = useState<null | { texte: string; detail?: string; faire: () => void }>(null);
  const [annonce, setAnnonce] = useState<null | { texte: string; annuler?: () => void }>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (sel) detailRef.current?.scrollTo({ top: 0 }); }, [sel]);
  useEffect(() => { if (!annonce) return; const t = setTimeout(() => setAnnonce(null), 6000); return () => clearTimeout(t); }, [annonce]);

  const sourcesDe = (x: Recette): SourceRc[] => [genIds.has(x.id) ? (x.origine?.type === "reference" ? "reference" : "generees") : "pratique", ...(st.faits[`recette:${x.id}`] || st.observations[`recette:${x.id}`] ? ["mes" as const] : [])];
  // Filtres qui ne dépendent pas de la place (style, source, favoris).
  const passe = (x: Recette) => (!f.style.length || x.styles.some((s) => f.style.includes(s)))
    && (!f.source.length || sourcesDe(x).some((s) => f.source.includes(s)))
    && (!f.favoris.length || estFavori(st, idFavori("recette", x.id)));
  const filtrees = actives.filter(passe);
  const autres = f.style.length + f.source.length + f.favoris.length + f.el.length > 0;
  const elsDe = (c: (typeof CATEGORIES)[number]) => {
    const choisis = c.elements.filter((e) => f.el.includes(e.id));
    return choisis.length ? choisis : f.el.length && !f.cat.includes(c.id) ? [] : c.elements;
  };
  const catsVues = vue === "corbeille" ? [] : CATEGORIES.filter((c) => {
    if (f.cat.length) return f.cat.includes(c.id);
    if (!autres) return false;
    return elsDe(c).some((e) => filtrees.some((x) => x.element === e.id));
  });
  const nbVues = catsVues.reduce((n, c) => n + filtrees.filter((x) => elsDe(c).some((e) => e.id === x.element)).length, 0);

  const groupes: FmGroupe[] = [
    { id: "style", titre: "Style", options: visibles.map((s) => ({ id: s.id, nom: s.nom, couleur: s.couleur, n: actives.filter((x) => x.styles.includes(s.id)).length })) },
    { id: "cat", titre: "Catégorie", options: CATEGORIES.map((c) => ({ id: c.id, nom: c.nom, couleur: COULEUR_CAT[c.id], n: filtrees.filter((x) => catDe(x) === c.id).length })) },
    { id: "el", titre: "Sous-catégorie", options: CATEGORIES.filter((c) => !f.cat.length || f.cat.includes(c.id)).flatMap((c) => c.elements.map((e) => ({
      id: e.id, nom: e.nom, section: c.nom, couleur: COULEUR_CAT[c.id], n: filtrees.filter((x) => x.element === e.id).length }))) },
    { id: "source", titre: "Source", options: SOURCES.map((s) => ({ ...s, n: actives.filter((x) => sourcesDe(x).includes(s.id)).length })) },
    { id: "favoris", titre: "Favoris", options: [{ id: "oui", nom: "★ Favoris seulement", n: actives.filter((x) => estFavori(st, idFavori("recette", x.id))).length }] },
  ];

  const choose = (id: string) => { setSel(id); if (!brouillon || brouillon.id !== id) history.replaceState(null, "", `#recettes/${id}`); };
  const basculer = (id: string) => setOuverts((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const jeter = (x: Recette) => {
    mettreALaCorbeille(x.id, x.nom);
    if (sel === x.id) setSel(null);
    setAnnonce({ texte: `« ${x.nom} » est dans la Corbeille.`, annuler: () => restaurerRecette(x.id, x.nom) });
  };
  const supprimer = (x: Recette) => setConfirm({
    texte: `Supprimer définitivement « ${x.nom} » ?`, detail: "Elle disparaît de l'app. Tu ne pourras pas la restaurer.",
    faire: () => supprimerDefinitivement(x.id, x.nom),
  });
  const vider = () => setConfirm({
    texte: `Supprimer définitivement ${corbeille.length} recette${corbeille.length > 1 ? "s" : ""} ?`, detail: "Toute la Corbeille est vidée. Tu ne pourras pas les restaurer.",
    faire: () => viderCorbeille(),
  });
  const stopSi = (id: string) => { if (engine.snap.owner === `rc:${id}`) engine.stop(); };
  const ecouter = (rc: Recette, mode: Mode) => jouerSeq(`rc:${rc.id}`, etatRecette(rc, range, mode));
  const nouveauBrouillon = (rc: Recette, mode?: Mode) => {
    if (brouillon) stopSi(brouillon.id);
    const x = { ...rc, element: rc.element ?? "kick" } as RecetteEl;
    setBrouillon(x);
    // Sur ordinateur, la fiche s'ouvre à droite ; sur téléphone elle cacherait le générateur (bouton « Réglages… »).
    if (window.matchMedia("(min-width: 1100px)").matches) setSel(x.id); else if (sel === brouillon?.id) setSel(null);
    if (mode) ecouter(x, mode);
  };
  const garder = () => {
    if (!brouillon) return;
    garderRecette(brouillon);
    setAnnonce({ texte: `« ${brouillon.nom} » est gardée dans ${ELEMENTS.get(brouillon.element)?.nom} avec le badge « Générée ».` });
    setBrouillon(null);
  };
  const jeterBrouillon = () => { if (brouillon) { stopSi(brouillon.id); if (sel === brouillon.id) setSel(null); setBrouillon(null); } };

  const rc = brouillon && sel === brouillon.id ? brouillon : actives.find((x) => x.id === sel);
  const carte = (x: RecetteEl, e: { nom: string }) => (
    <div key={x.id} className="rc-card-wrap">
      <button type="button" className={`rc-card ${sel === x.id ? "on" : ""} ${st.faits[`recette:${x.id}`] ? "done" : ""}`} onClick={() => choose(x.id)}>
        <span className="rc-role">{x.kit ? `Kit de ${x.kit.pistes.length} parties` : e.nom}{st.faits[`recette:${x.id}`] ? " · testée ✓" : ""}</span>
        <b>{x.nom}</b>
        <span className="rc-styles">{genIds.has(x.id) && <BadgeGen rc={x} />}{x.styles.map((s) => <span key={s} className={`st st-${s}`}>{STYLE_NOM[s]}</span>)}</span>
        <span className="rc-strip4" aria-hidden>
          {x.mesures.map((m, bi) => <span key={bi}>{m.map((p, i) => <i key={i} className={p === null ? "" : p === "~" ? "tie" : "on"} />)}</span>)}
        </span>
      </button>
      <BoutonJeter className="rc-trash" titre={x.nom} onClick={() => jeter(x)} />
    </div>
  );

  return (
    <div className={`map recettes ${rc ? "has-sel" : ""}`}>
      <div className="map-main">
        <h2 className="page-title">Recettes</h2>
        <Infos>
          <p>
            Des points de départ pour tes sons <Badge kind="pratique" />, sur 4 mesures (les 4 boutons Step). Les réglages et les listes viennent du manuel. Les valeurs de potard marquées « à vérifier sur l'écran » sont des propositions, et ta plage relevée s'affiche dès que tu l'as notée.
          </p>
          <p>
            Base commune : motif vide Init Pattern (201 à 250) <SourceRef src={{ doc: "PG", page: 18 }} compact />, BPM = 165.0 sauf indication, KEY = D, LENGTH = 4 <SourceRef src={{ doc: "PG", page: 3 }} compact />.
          </p>
          <p>🎲 Générer : dans une sous-catégorie, l'onglet « Générer » tire une recette au hasard dans les listes du manuel. 🗑 envoie une recette dans la Corbeille (menu ☰). Les recettes gardées, générées et supprimées partent avec « Exporter mes relevés ».</p>
        </Infos>
        <Rangement
          racine="Recettes" sansAriane cats={f.cat}
          categories={CATEGORIES.map((c) => ({
            id: c.id, nom: c.nom, icone: ICONE_CAT[c.id], couleur: COULEUR_CAT[c.id] ?? COULEURS.effets,
            n: filtrees.filter((x) => catDe(x) === c.id).length,
          }))}
          cat={null} onCat={(id) => { setVue("liste"); setF({ ...f, cat: id === null || (f.cat.length === 1 && f.cat[0] === id) ? [] : [id], el: [] }); }}
        />
        <SelecteurStyles valeur={f.style} onChange={(v) => { setVue("liste"); setF({ ...f, style: v }); }} label="Style des recettes" />
        {nbCachees > 0 && <p className="small muted">{nbCachees} recette{nbCachees > 1 ? "s" : ""} de styles masqués {nbCachees > 1 ? "sont cachées" : "est cachée"} (conservée{nbCachees > 1 ? "s" : ""}) : <a href="#styles/gerer">Gérer les styles</a>.</p>}
        <FiltreMenu groupes={groupes} valeur={f} onChange={(v) => { setVue("liste"); setF(v); if (v.el.length > f.el.length) setOuverts((s) => new Set([...s, ...v.el])); }}
          resultat={vue === "corbeille" ? `${corbeille.length} dans la corbeille` : catsVues.length ? `${nbVues} recette${nbVues > 1 ? "s" : ""}` : `${filtrees.length} recette${filtrees.length > 1 ? "s" : ""}`}
          autres={vue === "corbeille" ? [{ id: "corbeille", nom: "🗑 Corbeille", retirer: () => setVue("liste") }] : []}
          onToutEffacer={() => setVue("liste")}
          bas={(fermer) => (<>
            <span className="fm-liens-styles">
              <a className="e2-ui-btn" href="#styles">📖 Fiches des styles</a>
              <a className="e2-ui-btn" href="#styles/gerer">🎨 Gérer les styles</a>
            </span>
            <EntreeCorbeille n={corbeille.length} ouverte={vue === "corbeille"} onClick={() => { setVue(vue === "corbeille" ? "liste" : "corbeille"); fermer(); }} />
          </>)} />

        {annonce && (
          <p className="rc-annonce" role="status">{annonce.texte}
            {annonce.annuler && <button type="button" className="e2-ui-btn" onClick={() => { annonce.annuler!(); setAnnonce(null); }}>Annuler</button>}
          </p>
        )}

        {vue === "corbeille" ? (
          <Corbeille quoi="une recette" onRetour={() => setVue("liste")} onVider={vider}
            onRestaurer={(id) => restaurerRecette(id, corbeille.find((x) => x.id === id)?.nom)}
            onSupprimer={(id) => { const x = corbeille.find((r) => r.id === id); if (x) supprimer(x); }}
            elements={corbeille.map((x) => {
              const c = CATEGORIES.find((k) => k.id === catDe(x));
              return { id: x.id, couleur: COULEUR_CAT[c?.id ?? "transitions"], titre: <>{x.nom} {genIds.has(x.id) && <BadgeGen rc={x} />}</>,
                infos: `${c?.nom} · ${ELEMENTS.get(x.element)?.nom} · mise à la corbeille le ${new Date(st.etatsRecettes[x.id].majLe).toLocaleDateString("fr-FR")}` };
            })} />
        ) : catsVues.length === 0 ? (
          <p className="rg-hint">{autres ? "Aucune recette pour ces filtres." : `Choisis une catégorie (ou ouvre ☰ Filtres) pour voir les ${actives.length} recettes.`}</p>
        ) : catsVues.map((c) => {
          const els = elsDe(c);
          const n = filtrees.filter((x) => els.some((e) => e.id === x.element)).length;
          return (
            <section key={c.id} className="acc-cat" style={{ "--cc": COULEUR_CAT[c.id] } as CSSProperties}>
              <div className="acc-cat-top">
                <h3 className="acc-cat-titre"><PixelArt name={ICONE_CAT[c.id]} size={28} /> {c.nom} <small>{n}</small></h3>
                <div className="acc-cat-btns">
                  <button type="button" className="e2-ui-btn" onClick={() => setOuverts((s) => new Set([...s, ...els.map((e) => e.id)]))}>Tout ouvrir</button>
                  <button type="button" className="e2-ui-btn" onClick={() => setOuverts((s) => new Set([...s].filter((id) => !els.some((e) => e.id === id))))}>Tout fermer</button>
                </div>
              </div>
              {els.map((e) => {
                const liste = filtrees.filter((x) => x.element === e.id);
                const ouvert = ouverts.has(e.id);
                const gen = GENERATEURS[e.id];
                const tab = gen ? onglet[e.id] ?? "recettes" : "recettes";
                return (
                  <div key={e.id} className={`acc ${ouvert ? "on" : ""} ${liste.length === 0 ? "vide" : ""}`}>
                    <button type="button" className="acc-tete" aria-expanded={ouvert} aria-controls={`acc-${e.id}`} onClick={() => basculer(e.id)}>
                      <PixelArt name={ICONE_CAT[c.id]} size={22} />
                      <span className="acc-nom">{e.nom}</span>
                      {gen && <span className="acc-gen" title="Cette sous-catégorie a un générateur">🎲</span>}
                      <span className="acc-n">{liste.length}</span>
                      <span className="acc-chev" aria-hidden>▸</span>
                    </button>
                    {ouvert && (
                      <div className="acc-corps" id={`acc-${e.id}`}>
                        {gen && (
                          <div className="acc-onglets" role="tablist">
                            <button type="button" role="tab" aria-selected={tab === "recettes"} className={tab === "recettes" ? "on" : ""} onClick={() => setOnglet({ ...onglet, [e.id]: "recettes" })}>Recettes <small>{liste.length}</small></button>
                            <button type="button" role="tab" aria-selected={tab === "generer"} className={tab === "generer" ? "on" : ""} onClick={() => setOnglet({ ...onglet, [e.id]: "generer" })}>🎲 Générer</button>
                          </div>
                        )}
                        {tab === "generer" ? (
                          <Generateur element={e.id} nomEl={e.nom} styleDefaut={(f.style.length === 1 ? f.style[0] as Style : "tous")} bases={(liste.some((x) => !x.kit) ? liste : actives.filter((x) => x.element === e.id)).filter((x) => !x.kit)}
                            brouillon={brouillon?.element === e.id ? brouillon : null} onBrouillon={nouveauBrouillon} onGarder={garder} onJeter={jeterBrouillon}
                            onVoir={() => brouillon && setSel(brouillon.id)} ecouter={ecouter} />
                        ) : liste.length ? <div className="rc-grid">{liste.map((x) => carte(x, e))}</div>
                          : <p className="small muted">{(() => {
                              // Sous-catégorie laissée vide exprès pour ce style : on dit pourquoi.
                              const v = f.style.length === 1 ? VIDES_STYLES[f.style[0]]?.find((x) => x.el === e.id) : undefined;
                              return v ? `Pas de recette ${STYLE_NOM[f.style[0] as Style]} ici, exprès : ${v.pourquoi}.` : "Aucune recette ici avec ces filtres.";
                            })()}{gen ? " Essaie l'onglet 🎲 Générer : il reprend les recettes des styles proches." : ""}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
      <aside className="detail" ref={detailRef} aria-live="polite">
        {rc ? (
          <Detail key={rc.id} rc={rc} generee={genIds.has(rc.id)} onClose={() => setSel(null)} onJeter={brouillon?.id === rc.id ? undefined : () => jeter(rc)}
            brouillon={brouillon?.id === rc.id ? { onGarder: garder, onJeter: jeterBrouillon } : undefined} />
        ) : (
          <div className="empty">
            <h2>Choisis une recette</h2>
            <p>Chaque recette donne les réglages par section, comme sur ta machine, et une séquence de 4 mesures que tu peux écouter, modifier et recopier sur l'E2.</p>
            <p className="muted small">Quand une recette te plaît, note ta version et marque-la « testée ».</p>
          </div>
        )}
      </aside>
      {confirm && <Confirmer texte={confirm.texte} detail={confirm.detail} onNon={() => setConfirm(null)} onOui={() => { confirm.faire(); setConfirm(null); }} />}
    </div>
  );
}

// ---------- 🎲 Générer ----------
interface GenProps {
  element: ElementId; nomEl: string; styleDefaut: Style | "tous"; bases: Recette[];
  brouillon: Recette | null; onBrouillon: (rc: Recette, mode?: Mode) => void; onGarder: () => void; onJeter: () => void; onVoir: () => void;
  ecouter: (rc: Recette, mode: Mode) => void;
}
const CLE_GEN = "e2academy.generateur";
function Generateur({ element, nomEl, styleDefaut, bases, brouillon, onBrouillon, onGarder, onJeter, onVoir, ecouter }: GenProps) {
  const gen = GENERATEURS[element]!;
  const range = useKnobRange();
  const [prefs] = usePlayerPrefs();
  const { visibles } = useStyles();
  // scale = 0 : « gamme de la fiche » (tirée parmi les gammes conseillées du style). style = « tous » : un style visible au hasard.
  const [cfg, setCfg] = useState<{ style: Style | "tous"; hasard: number; key: string; scale: number; base?: string }>(() => {
    const d = { style: styleDefaut, hasard: 25, key: "D", scale: 0 };
    return { ...lireObjet(CLE_GEN, d), ...(styleDefaut !== "tous" ? { style: styleDefaut } : {}) };
  });
  const upd = (p: Partial<typeof cfg>) => setCfg((c) => { const n = { ...c, ...p }; ecrireJson(CLE_GEN, n); return n; });
  const base = bases.find((x) => x.id === cfg.base) ?? bases[0];
  // Un style masqué entre-temps compte comme « Tous ».
  const styleCfg = cfg.style !== "tous" && visibles.some((s) => s.id === cfg.style) ? cfg.style : "tous";
  const tirerStyle = (): Style => (styleCfg !== "tous" ? styleCfg : (visibles[Math.floor(Math.random() * visibles.length)]?.id ?? "tekno"));
  const generer = () => onBrouillon(gen.generer({ ...cfg, style: tirerStyle() }, range), prefs.mode);
  const variante = () => base && onBrouillon(genererVariante(base, { ...cfg, style: base.styles[0] ?? tirerStyle(), scale: cfg.scale || (base.melodique?.scale ?? 7) }, range), prefs.mode);
  const h = cfg.hasard;
  const fiche = styleCfg !== "tous" ? FICHE[styleCfg] : null;

  return (
    <div className="gen">
      <div className="gen-reglages">
        <div className="gen-ligne">
          <span className="gen-lab">Style</span>
        </div>
        <SelecteurStyles valeur={styleCfg === "tous" ? [] : [styleCfg]} onChange={(v) => upd({ style: v[0] ?? "tous" })} label="Style de la recette générée" tous="Tous" />
        {fiche ? (
          <div className="gen-fiche" style={{ "--sc": fiche.couleur } as CSSProperties}>
            <span><b>Fiche {fiche.nom}</b> · {fiche.bpm.min} à {fiche.bpm.max} BPM · gammes : {fiche.gammes.map((g) => gammeByN.get(g.n)?.nom).join(", ")}</span>
            <span className="muted">{element === "kick" ? `Kick : ${fiche.kick}` : fiche.caractere[0]} <a href={`#styles/${fiche.id}`}>Voir la fiche →</a></span>
          </div>
        ) : <p className="small muted gen-aide">Tous : à chaque clic, un des styles affichés est tiré au hasard, et la recette suit sa fiche (BPM, gammes, type de son).</p>}
        <label className="gen-ligne gen-hasard">
          <span className="gen-lab">Hasard</span>
          <span className="gen-bout">Sage</span>
          <input type="range" min={0} max={100} step={5} value={h} onChange={(e) => upd({ hasard: Number(e.target.value) })} aria-valuetext={`${h} %`} />
          <span className="gen-bout">Expérimental</span>
          <kbd>{h} %</kbd>
        </label>
        {!gen.percu && (
          <div className="gen-ligne">
            <span className="gen-lab">Tonalité</span>
            <select className="gen-sel" value={cfg.key} onChange={(e) => upd({ key: e.target.value })} aria-label="KEY">
              {ALL_KEYS.map((k) => <option key={k.en} value={k.en}>KEY = {k.en} ({k.fr})</option>)}
            </select>
            <select className="gen-sel" value={cfg.scale} onChange={(e) => upd({ scale: Number(e.target.value) })} aria-label="SCALE">
              <option value={0}>SCALE = gamme conseillée par la fiche du style</option>
              {GAMMES.map((g) => <option key={g.n} value={g.n}>SCALE = {g.nom}</option>)}
            </select>
          </div>
        )}
        <p className="small muted gen-aide">
          {h <= 20 ? "Sage : des réglages classiques du style, le motif bouge peu." : h >= 80 ? "Expérimental : n'importe quel oscillateur de la catégorie, des effets et modulations inattendus, des coups en plus." : "Entre les deux : surtout les choix du style, avec quelques surprises."}
          {gen.percu ? ` ${nomEl} : percussion, pas de notes, la tonalité ne change rien ici.` : " Les notes sont tirées dans la tonalité et la gamme choisies (4 mesures)."}
        </p>
        <div className="gen-actions">
          <button type="button" className="e2-ui-btn gen-go" onClick={generer}><PixelArt name="hasard" size={20} /> Générer une recette</button>
          {bases.length > 0 && (
            <span className="gen-var">
              <select value={base?.id} onChange={(e) => upd({ base: e.target.value })} aria-label="Recette de départ pour la variante">
                {bases.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
              </select>
              <button type="button" className="e2-ui-btn" onClick={variante}>Générer une variante</button>
            </span>
          )}
        </div>
      </div>

      {brouillon ? (
        <div className="gen-res">
          <p className="rc-role">Recette générée · pas encore gardée</p>
          <b className="gen-nom">{brouillon.nom}</b>
          <span className="rc-styles"><Badge kind="genere" />{brouillon.styles.map((s) => <span key={s} className={`st st-${s}`}>{STYLE_NOM[s]}</span>)}<kbd>{brouillon.bpm ?? BPM} BPM</kbd>{brouillon.melodique && !gen.percu && <kbd>KEY = {brouillon.melodique.key} · {gammeByN.get(brouillon.melodique.scale)?.nom}</kbd>}</span>
          <p className="small">{brouillon.idee}</p>
          <p className="small gen-regl">{brouillon.reglages.map((x) => <kbd key={x.param}>{paramById.get(x.param)?.nom} = {x.valeur}</kbd>)}</p>
          <span className="rc-strip4" aria-hidden>{brouillon.mesures.map((m, b) => <span key={b}>{m.map((p, j) => <i key={j} className={p === null ? "" : p === "~" ? "tie" : "on"} />)}</span>)}</span>
          <div className="gen-btns">
            <BoutonsEcoute joue={null} onJouer={(m) => ecouter(brouillon, m)} />
            <button type="button" className="e2-ui-btn" onClick={onVoir}>Réglages et Copier vers ma machine</button>
          </div>
          <div className="gen-btns gen-choix">
            <button type="button" className="e2-ui-btn gen-garder" onClick={onGarder}>✔ Garder</button>
            <button type="button" className="e2-ui-btn gen-jeter" onClick={() => { onJeter(); generer(); }}>🗑 Supprimer et en générer une autre</button>
          </div>
        </div>
      ) : <p className="small muted">Règle le style et le hasard, puis « Générer une recette ». Elle se joue tout de suite ; garde-la si elle te plaît.</p>}
    </div>
  );
}

function Detail({ rc, onClose, onJeter, brouillon, generee }: { rc: Recette; onClose: () => void; onJeter?: () => void; brouillon?: Brouillon; generee?: boolean }) {
  if (rc.kit) return <DetailKit rc={rc} onClose={onClose} />;
  return <DetailSimple rc={rc} onClose={onClose} onJeter={onJeter} brouillon={brouillon} generee={generee} />;
}
interface Brouillon { onGarder: () => void; onJeter: () => void }

/** Kit : plusieurs recettes sur plusieurs parties, jouées avec le lecteur des grilles. */
function DetailKit({ rc, onClose }: { rc: Recette; onClose: () => void }) {
  const kit = rc.kit!;
  const g = useMemo(() => ({
    id: `kit-${rc.id}`, nom: rc.nom, style: ((["tekno", "tribe", "mentale"] as string[]).includes(rc.styles[0]) ? rc.styles[0] : "tekno") as StyleBase, bpm: rc.bpm ?? BPM,
    key: rc.melodique?.key ?? "D", scale: rc.melodique?.scale ?? 7, idee: rc.idee, lecture: kit.lecture, pistes: kit.pistes, astuces: rc.astuces,
  }), [rc, kit]);
  return (
    <div className="detail-inner">
      <div className="detail-top">
        <div><p className="muted small">Kit · {(rc.element && ELEMENTS.get(rc.element)?.nom) ?? "Toms"} · {rc.styles.map((st) => STYLE_NOM[st]).join(", ")} · {kit.pistes.length} parties</p><h2>{rc.nom} <Etoile type="recette" cle={rc.id} titre={rc.nom} /></h2></div>
        <button type="button" className="close" onClick={onClose} aria-label="Fermer">✕</button>
      </div>
      <div className="block">
        <p className="fn"><Badge kind="pratique" /> {rc.idee}</p>
        {rc.melodique && (
          <p>Motif : <kbd>KEY = {rc.melodique.key}</kbd> <kbd>SCALE = {gammeByN.get(rc.melodique.scale)!.nom}</kbd> <a href={`#gammes/${rc.melodique.scale}`}>voir la gamme ↗</a></p>
        )}
        <p className="small"><b>Mesure 4 (relance) :</b> {rc.relance}</p>
        <p className="small">Les sons du kit : {kit.pistes.map((p, i) => {
          const x = RECETTES.find((y) => y.id === p.recette);
          return <span key={p.recette}>{i > 0 && " · "}Partie {i + 1} = <a href={`#recettes/${p.recette}`}>{x?.nom ?? p.recette}</a></span>;
        })}</p>
      </div>
      <Editeur g={g} sansTitre noteId={`recette:${rc.id}`} />
    </div>
  );
}

function DetailSimple({ rc, onClose, onJeter, brouillon, generee }: { rc: Recette; onClose: () => void; onJeter?: () => void; brouillon?: Brouillon; generee?: boolean }) {
  const [vi, setVi] = useState<number | null>(null);
  const variante = vi === null ? undefined : rc.variantes[vi];
  const reglages = useMemo(() => fusion(rc.reglages, variante?.reglages), [rc, variante]);
  const origine = useMemo(() => origineDe(rc), [rc]);
  const edit = useSeqEdit(origine, brouillon ? undefined : `e2academy.recette.${rc.id}`);
  const groups = ORDER.map((g) => ({ g, items: reglages.filter((x) => paramById.get(x.param)?.groupe === g) })).filter((x) => x.items.length);
  const exs = (rc.exercices ?? []).map((id) => exerciseById.get(id)).filter(Boolean) as Exercise[];
  const knobParams = KNOBS_APERCU.filter((k) => reglages.some((x) => x.param === k) || k === "amp.decay");
  const percu = SONS_PERCU.includes(rc.apercu.son);
  const ifx = val(reglages, "ifx.on") === "ON" ? val(reglages, "ifx.type")?.replace(/^\d+ /, "") : undefined;
  const mod = val(reglages, "mod.type")?.replace(/^\d+ /, "");
  const filtre = val(reglages, "filter.hpf") ? "hpf" : val(reglages, "filter.bpf") ? "bpf" : "lpf";

  const essayer = (i: number | null) => {
    const avant = vi === null ? undefined : rc.variantes[vi];
    setVi(i);
    const v = i === null ? undefined : rc.variantes[i];
    const src = v ? v.reglages : rc.reglages;
    for (const x of src) if (KNOBS_APERCU.includes(x.param) && /^\d+$/.test(x.valeur)) edit.setKnob(x.param, Number(x.valeur));
    // Variante avec sa propre séquence : elle remplace les 4 mesures dans le lecteur ; en revenant, on remet celles de la recette.
    if (v?.mesures) edit.set({ mesures: v.mesures.map((m) => [...m]), key: v.ton?.key ?? origine.key, scale: v.ton?.scale ?? origine.scale, base: undefined });
    else if (avant?.mesures) edit.set({ mesures: rc.mesures.map((m) => [...m]), key: origine.key, scale: origine.scale, base: undefined });
  };

  return (
    <div className="detail-inner">
      <div className="detail-top">
        <div><p className="muted small">Recette · {(rc.element && ELEMENTS.get(rc.element)?.nom) ?? FONCTIONS.find((f) => f.id === rc.fonction)!.nom} · {rc.styles.map((st) => STYLE_NOM[st]).join(", ")} · partie {rc.partie} conseillée</p><h2>{rc.nom} {!brouillon && <Etoile type="recette" cle={rc.id} titre={rc.nom} />}</h2>
          {(generee || brouillon) && (rc.origine?.type === "reference" ? <><BadgeGen rc={rc} /><Badge kind="genere">Point de départ, à ajuster à l'oreille</Badge></> : <span className="badge-gen">🎲 Générée{brouillon ? " · pas encore gardée" : ""}</span>)}</div>
        <div className="detail-top-btns">
          {onJeter && <BoutonJeter className="close rc-trash-d" titre="cette recette" onClick={onJeter} />}
          <button type="button" className="close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
      </div>
      {brouillon && (
        <div className="gen-choix gen-choix-d">
          <button type="button" className="e2-ui-btn gen-garder" onClick={brouillon.onGarder}>✔ Garder</button>
          <button type="button" className="e2-ui-btn gen-jeter" onClick={brouillon.onJeter}>🗑 Supprimer</button>
        </div>
      )}
      <div className="block">
        <p className="fn"><Badge kind="pratique" /> {rc.idee}</p>
        {rc.melodique && (
          <p>Motif : <kbd>KEY = {rc.melodique.key}</kbd> <kbd>SCALE = {gammeByN.get(rc.melodique.scale)!.nom}</kbd> <a href={`#gammes/${rc.melodique.scale}`}>voir la gamme ↗</a></p>
        )}
        <p className="small"><b>Mesure 4 (relance) :</b> {rc.relance}</p>
      </div>

      <div className="block">
        <h3>Écouter et modifier les 4 mesures</h3>
        <SeqPlayer id={`rc:${rc.id}`} edit={edit} son={rc.apercu.son} octave={rc.apercu.octave} ifx={ifx} mod={mod} filtre={filtre}
          knobParams={knobParams} choixGamme={!percu} kickRepere={rc.fonction !== "kick"} />
      </div>

      {!brouillon && <MonEnregistrement id={rc.id} titre={rc.nom} bpm={edit.ed.bpm} />}

      <div className="block">
        <h3>Réglages, section par section{variante ? ` (variante « ${variante.nom} »)` : ""}</h3>
        <div className="rc-sections">
          {groups.map(({ g, items }) => (
            <div key={g} className="rc-sec">
              <h4>{TITRES[g] ?? parameterGroups[g]}</h4>
              {items.map((x) => {
                const p = paramById.get(x.param)!;
                const ctl = CTL.get(x.param);
                const changed = variante?.reglages.some((y) => y.param === x.param);
                return (
                  <div key={x.param} className={`rc-set ${changed ? "changed" : ""}`}>
                    {ctl ? <a href={`#carte/${ctl}`} className="rc-name">{p.nom} ↗</a> : <span className="rc-name">{p.nom}</span>}
                    {x.aVerifier
                      ? <StartValueChip nom={p.nom} valeur={x.valeur} aVerifier param={x.param} />
                      : <span className="startval"><kbd>{x.valeur}</kbd> <SourceRef src={listPage(x.param, x.valeur)} compact /></span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {rc.variantes.length > 0 && <div className="block">
        <h3>Variantes</h3>
        <div className="rc-vars">
          {rc.variantes.map((x, i) => (
            <div key={x.nom} className={`rc-var ${vi === i ? "on" : ""}`}>
              <b>{x.nom}</b> <Badge kind="pratique" />
              <p className="small">{x.idee}</p>
              {x.reglages.length > 0 && <p className="small">{x.reglages.map((y) => <kbd key={y.param}>{paramById.get(y.param)!.nom} = {y.valeur}</kbd>)}</p>}
              {x.mesures && (
                <>
                  <p className="small">Nouvelle séquence{x.ton ? <> en <kbd>KEY = {x.ton.key}</kbd> <kbd>SCALE = {gammeByN.get(x.ton.scale)!.nom}</kbd></> : ""} : rangs {[...new Set(x.mesures.flat().filter((p) => typeof p === "number"))].sort().join(", ")}{x.mesures.flat().includes("O") ? " et l'octave" : ""} de la gamme.</p>
                  <span className="rc-strip4" aria-hidden>{x.mesures.map((m, b) => <span key={b}>{m.map((p, j) => <i key={j} className={p === null ? "" : p === "~" ? "tie" : "on"} />)}</span>)}</span>
                </>
              )}
              <button type="button" className="e2-ui-btn" onClick={() => essayer(vi === i ? null : i)}>{vi === i ? "Revenir à la recette" : x.mesures ? "Écouter cette variante" : "Essayer cette variante"}</button>
            </div>
          ))}
        </div>
        <p className="small muted">Les potards de la variante passent dans l'aperçu ; les changements de type (oscillateur, effet) ne changent que la liste de réglages et « Copier vers ma machine ». Une variante avec une nouvelle séquence la met dans le lecteur (elle remplace tes changements de notes) ; « Revenir à la recette » remet la séquence d'origine.</p>
      </div>}

      <CopierMachine rc={rc} reglages={reglages} data={edit.ed} />

      {rc.astuces && (
        <div className="block">
          <h3>Astuces</h3>
          <ul className="facts">{rc.astuces.map((a) => <li key={a.texte}>{a.texte} {a.ref && <SourceRef src={a.ref} compact />}</li>)}</ul>
        </div>
      )}

      {exs.length > 0 && (
        <div className="block">
          <h3>Pour régler à l'oreille</h3>
          {exs.map((e) => <ExerciseCard key={e.id} ex={e} />)}
        </div>
      )}

      {!brouillon && <div className="block">
        <h3>Ma version</h3>
        <ObservationBox id={`recette:${rc.id}`} titre={`Recette · ${rc.nom}`} placeholder="Mes valeurs qui marchent, ce que j'ai changé…" />
        <DoneToggle id={`recette:${rc.id}`} />
      </div>}
    </div>
  );
}

// ---------- Copier vers ma machine ----------
function CopierMachine({ rc, reglages, data }: { rc: Recette; reglages: Reglage[]; data: SeqData }) {
  const range = useKnobRange();
  const percu = SONS_PERCU.includes(rc.apercu.son);
  const g = gammeByN.get(data.scale)!;
  const b = data.base ?? { key: data.key, scale: data.scale };   // gamme où sonnent vraiment les notes
  const seq = [LIGNE_SEQUENCER, ...lignesSequence(data.mesures, percu, gammeByN.get(b.scale)!, b.key, rc.apercu.octave), ...(percu ? [] : [LIGNE_NOTES]), LIGNE_WRITE];
  return (
    <CopierPanel titre={rc.nom} note={`Avec tes changements actuels (notes, BPM, potards${percu ? "" : ", KEY, SCALE"}).`} sections={[
      { titre: "1. Préparer le motif", lignes: lignesPrep(data.bpm, data.key, percu ? null : g) },
      { titre: `2. Le son (partie ${rc.partie})`, lignes: lignesSon(rc.partie, reglages, data.knobs, (id) => range(id).lue) },
      { titre: "3. La séquence, bloc par bloc", lignes: seq },
    ]} />
  );
}
