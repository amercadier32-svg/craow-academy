// Module « Construire un morceau » : un assistant en étapes pour monter un morceau dans l'un des 7 styles de l'app
// couche par couche, avec les recettes de l'app. Chaque nouvelle couche s'écoute par-dessus les couches déjà choisies.
// Le morceau en cours est gardé sur cet appareil (localStorage).
import { BoutonLecture, ChoixMode } from "../components/Lecteur";
import { lireJson, ecrireJson } from "../lib/stockage";
import { Etoile } from "../components/Etoile";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Infos } from "../components/Rangement";
import { PixelArt } from "../components/PixelArt";
import { Badge, SourceRef } from "../components/common";
import { nomPas, useKnobRange, usePlayerPrefs } from "../components/SeqPlayer";
import { knobsDe } from "./Grilles";
import { INFO } from "../content/gammes";
import { ETAPES, EXEMPLES, LONGUEURS, PAGES, STRUCTURES, etapeById, styleM, type Etape, type EtapeId, type Exemple, type Section } from "../content/morceau";
import { KNOBS_APERCU, RECETTES, STYLE_NOM, type Recette } from "../content/recettes";
import { FICHE, stylesGamme, useStyles, type Style } from "../content/styles";
import { paramById } from "../lib/data";
import { ALL_KEYS, GAMMES, degreeSemi, gammeByN, keyByEn, notesIn, type Gamme } from "../lib/music";
import { bornes, engine, useEngine, SONS_PERCU, type Mode, type Pas, type Piste, type SeqState } from "../lib/seq";
import { CopierPanel, LIGNE_NOTES, LIGNE_SEQUENCER, LIGNE_WRITE, fusion, lignesPrep, lignesSequence, lignesSon, val, type Ligne } from "../components/Machine";
import type { Reglage } from "../content/recettes";
import { setObservation } from "../lib/store";
import { telecharger } from "../lib/telecharger";
import "./morceau.css";
import { POTARDS, etatMix, pisteCouche, triees, type Couche, type Morceau } from "../lib/pistes";
export { etatMix, type Couche, type Morceau };

const CLE = "e2academy.morceau.encours";
const rcById = new Map(RECETTES.map((r) => [r.id, r]));
const percu = (rc: Recette) => SONS_PERCU.includes(rc.apercu.son);
const uid = () => Math.random().toString(36).slice(2, 9);

function nouveau(style: Style = "tribe"): Morceau {
  const s = styleM(style);
  return { v: 1, nom: "Mon morceau", style, bpm: s.bpm, key: s.key, scale: s.scale, couches: [], passees: [], majLe: new Date().toISOString() };
}
function charger(): Morceau {
  const m = lireJson<Morceau | null>(CLE, null);
  if (m?.v === 1 && Array.isArray(m.couches)) return { ...m, couches: m.couches.filter((c) => rcById.has(c.recette)) };
  return nouveau();
}

/** Les notes d'une recette sont écrites dans sa propre gamme : on pose chaque note sur la note la plus proche de la gamme du morceau. */
export function rapprocher(mesures: Pas[][], src: Gamme | undefined, dst: Gamme): Pas[][] {
  if (!src || src.n === dst.n) return mesures.map((m) => [...m]);
  const cand = Array.from({ length: 16 }, (_, d) => ({ d, s: degreeSemi(dst, d) }));
  const map = (p: Pas): Pas => {
    if (p === null || p === "~" || p === "O") return p;
    const s = degreeSemi(src, p);
    let best = cand[0];
    for (const c of cand) if (Math.abs(c.s - s) < Math.abs(best.s - s)) best = c;
    return best.d;
  };
  return mesures.map((m) => m.map(map));
}

const structureDe = (m: Morceau) => m.structure ?? STRUCTURES[m.style].map((x) => ({ ...x, etapes: [...x.etapes] }));
const partiesDe = (m: Morceau, etapes: EtapeId[]) => triees(m.couches).map((c, i) => (etapes.includes(c.etape) ? i + 1 : 0)).filter(Boolean);
const listeParts = (xs: number[]) => (xs.length ? xs.join(", ") : "aucune");

/** Construit un morceau d'exemple à partir de ses recettes. */
export function morceauDe(ex: Exemple): Morceau {
  const g = gammeByN.get(ex.scale)!;
  return {
    v: 1, nom: ex.nom, style: ex.style, bpm: ex.bpm, key: ex.key, scale: ex.scale, passees: [...ex.passees], majLe: new Date().toISOString(),
    couches: ex.couches.filter((c) => rcById.has(c.recette)).map((c) => {
      const rc = rcById.get(c.recette)!;
      return { uid: uid(), etape: c.etape, recette: rc.id, mesures: rapprocher(rc.mesures, rc.melodique ? gammeByN.get(rc.melodique.scale) : undefined, g), knobs: knobsDe(rc), octave: rc.apercu.octave };
    }),
  };
}

// ---------- Module ----------
const VUES = [
  { id: "assistant", nom: "Assistant" },
  { id: "grille", nom: "Grille du morceau" },
  { id: "structure", nom: "Structure" },
  { id: "exemples", nom: "Exemples" },
  { id: "emporter", nom: "Emporter sur l'E2" },
] as const;
type Vue = (typeof VUES)[number]["id"];

export default function Morceau({ focus }: { focus?: string }) {
  const [m, setM] = useState<Morceau>(charger);
  const [vue, setVue] = useState<Vue>(() => (VUES.find((v) => v.id === focus)?.id ?? "assistant"));
  const [pos, setPos] = useState<number>(() => {
    const i = ETAPES.findIndex((e) => e.id === focus);
    return i >= 0 ? i + 1 : 0;
  });
  useEffect(() => {
    ecrireJson(CLE, m);
  }, [m]);
  const maj = (f: (x: Morceau) => Morceau) => setM((x) => ({ ...f(x), majLe: new Date().toISOString() }));
  const etape = pos > 0 ? ETAPES[pos - 1] : null;
  const aller = (i: number) => { setPos(i); setVue("assistant"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const changerVue = (v: Vue) => { engine.stop(); setVue(v); history.replaceState(null, "", v === "assistant" ? "#morceau" : `#morceau/${v}`); };
  const ouvrir = (x: Morceau, v: Vue = "assistant") => { engine.stop(); setM({ ...x, majLe: new Date().toISOString() }); setPos(0); changerVue(v); };

  return (
    <div className="morceau">
      <h2 className="page-title">Construire un morceau</h2>
      <Infos>
        <p>
          Un assistant pour monter un morceau complet sur ton E2, une couche à la fois : tu choisis le style, le tempo et la gamme,
          puis pour chaque couche tu écoutes des recettes <b>par-dessus</b> ce que tu as déjà, tu choisis, et tu ajustes.
          Chaque couche devient une partie de l'E2 (Part 1, Part 2…). Un motif de l'E2 a 16 parties. <SourceRef src={PAGES.parties16} compact />
        </p>
        <p className="small"><Badge kind="pratique" /> Les ambiances de style, les rôles des couches, les structures et les conseils sont des conseils de pratique, pas le manuel.</p>
      </Infos>

      <div className="rg-tabs" role="tablist" aria-label="Vues du morceau">
        {VUES.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={vue === v.id} className={`rg-tab ${vue === v.id ? "on" : ""}`} onClick={() => changerVue(v.id)}>{v.nom}</button>
        ))}
      </div>
      <p className="small muted mc-nomcourant"><Etoile type="morceau" cle={`perso-${m.nom.toLowerCase().trim()}`} titre={m.nom} data={() => m} /> Morceau en cours : <b>{m.nom}</b> · {styleM(m.style).nom} · {m.bpm} BPM · KEY {m.key} · {gammeByN.get(m.scale)!.nom} · {m.couches.length} couche{m.couches.length > 1 ? "s" : ""}</p>

      {vue === "assistant" && <>
        <Progression m={m} pos={pos} aller={aller} />
        {etape === null
          ? <Depart m={m} maj={maj} suivant={() => aller(1)} recommencer={() => { setM(nouveau(m.style)); }} />
          : <EtapeVue key={etape.id} m={m} maj={maj} etape={etape} precedent={() => aller(pos - 1)} suivant={() => (pos < ETAPES.length ? aller(pos + 1) : changerVue("grille"))} />}
      </>}
      {vue === "grille" && <GrilleVue m={m} maj={maj} />}
      {vue === "structure" && <StructureVue m={m} maj={maj} />}
      {vue === "exemples" && <ExemplesVue courant={m} ouvrir={ouvrir} />}
      {vue === "emporter" && <EmporterVue m={m} ouvrir={ouvrir} />}
    </div>
  );
}

// ---------- Barre de progression ----------
function Progression({ m, pos, aller }: { m: Morceau; pos: number; aller: (i: number) => void }) {
  const faites = ETAPES.filter((e) => m.couches.some((c) => c.etape === e.id) || m.passees.includes(e.id)).length;
  return (
    <nav className="mc-prog" aria-label="Étapes du morceau">
      <div className="mc-prog-bar" aria-hidden><i style={{ width: `${(faites / ETAPES.length) * 100}%` }} /></div>
      <ol>
        <li>
          <button type="button" className={`mc-pstep ${pos === 0 ? "cur" : "ok"}`} onClick={() => aller(0)} aria-current={pos === 0 ? "step" : undefined}>
            <span className="mc-pnum">0</span><span className="mc-pnom">Départ</span>
          </button>
        </li>
        {ETAPES.map((e, i) => {
          const n = m.couches.filter((c) => c.etape === e.id).length;
          const etat = n ? "ok" : m.passees.includes(e.id) ? "skip" : "";
          return (
            <li key={e.id}>
              <button type="button" className={`mc-pstep ${pos === i + 1 ? "cur" : ""} ${etat} ${e.pret ? "" : "locked"}`} style={{ "--cc": e.couleur } as CSSProperties}
                onClick={() => aller(i + 1)} aria-current={pos === i + 1 ? "step" : undefined} title={e.pret ? e.nom : `${e.nom} : à venir`}>
                <span className="mc-pnum">{etat === "ok" ? "✓" : etat === "skip" ? "–" : i + 1}</span>
                <span className="mc-pnom">{e.nom}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="small muted mc-prog-txt">{faites} étape{faites > 1 ? "s" : ""} sur {ETAPES.length} · {m.couches.length} couche{m.couches.length > 1 ? "s" : ""} (= {m.couches.length} partie{m.couches.length > 1 ? "s" : ""} de l'E2 sur 16)</p>
    </nav>
  );
}

const ICONE_STYLE: Record<Style, string> = { tribe: "rythmique", "acid-tribe": "basse", mentale: "ambiance", hardtek: "rythmique", tekno: "basse", raggatek: "melodie", "dub-tekno": "ambiance" };

// ---------- 1. Départ ----------
function Depart({ m, maj, suivant, recommencer }: { m: Morceau; maj: (f: (x: Morceau) => Morceau) => void; suivant: () => void; recommencer: () => void }) {
  const s = styleM(m.style);
  const g = gammeByN.get(m.scale)!;
  const k = keyByEn(m.key);
  const conseillees = GAMMES.filter((x) => stylesGamme(x.n, INFO[x.n]?.styles ?? []).includes(m.style));
  const { tous } = useStyles();
  // Les styles visibles, dans l'ordre et les couleurs de « Gérer les styles » (plus celui du morceau s'il est masqué).
  const choix = tous.filter((x) => !x.masque || x.id === m.style).map((x) => ({ ...styleM(x.id), couleur: x.couleur }));
  const changerStyle = (id: Style) => maj((x) => {
    const n = styleM(id);
    // Le BPM et la gamme suivent le style tant qu'ils sont ceux proposés par l'ancien style.
    const ancien = styleM(x.style);
    return { ...x, style: id, bpm: x.bpm === ancien.bpm ? n.bpm : x.bpm, scale: x.scale === ancien.scale && !x.couches.length ? n.scale : x.scale };
  });
  return (
    <section className="mc-depart">
      <h3 className="mc-h">1. Départ</h3>

      <div className="mc-styles" role="radiogroup" aria-label="Style">
        {choix.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={m.style === x.id} className={`rg-cat ${m.style === x.id ? "on" : ""}`}
            style={{ "--cc": x.couleur } as CSSProperties} onClick={() => changerStyle(x.id)}>
            <PixelArt name={ICONE_STYLE[x.id]} size={40} />
            <span className="rg-cat-nom">{x.nom}</span>
            <span className="rg-cat-txt">{x.bpm} BPM</span>
          </button>
        ))}
      </div>
      <div className="mc-ambiance" style={{ "--cc": s.couleur } as CSSProperties}>
        <Badge kind="pratique" />
        <p>{s.ambiance[0]}</p>
        <p>{s.ambiance[1]}</p>
      </div>

      <div className="mc-reglages">
        <label className="mc-field">
          <span>Nom du morceau</span>
          <input type="text" value={m.nom} maxLength={40} onChange={(e) => maj((x) => ({ ...x, nom: e.target.value }))} />
        </label>
        <div className="mc-field">
          <span>BPM <Badge kind="pratique">{s.nom} : {s.bpmTexte}</Badge></span>
          <div className="mc-bpm">
            <input type="number" min={20} max={300} step={1} value={m.bpm}
              onChange={(e) => { const v = Number(e.target.value); if (v >= 20 && v <= 300) maj((x) => ({ ...x, bpm: v })); }} />
            <button type="button" className="e2-ui-btn" disabled={m.bpm === s.bpm} onClick={() => maj((x) => ({ ...x, bpm: s.bpm }))}>Proposition : {s.bpm}</button>
            <SourceRef src={{ doc: "PG", page: 3 }} compact />
          </div>
        </div>
        <label className="mc-field">
          <span>Tonalité (KEY)</span>
          <select value={m.key} onChange={(e) => maj((x) => ({ ...x, key: e.target.value }))}>
            {ALL_KEYS.map((x) => <option key={x.en} value={x.en}>{x.en} ({x.fr})</option>)}
          </select>
        </label>
        <label className="mc-field">
          <span>Gamme (SCALE)</span>
          <select value={m.scale} onChange={(e) => maj((x) => ({ ...x, scale: Number(e.target.value) }))}>
            {GAMMES.map((x) => <option key={x.n} value={x.n}>{x.n} · {x.nom}{conseillees.includes(x) ? ` ★ ${s.nom}` : ""}</option>)}
          </select>
        </label>
      </div>

      <div className="mc-gamme">
        <div className="mc-notes" aria-label={`Notes de ${g.nom} sur ${k.en}`}>
          {notesIn(g, k).map((n, i) => <span key={i} className={i === 0 ? "key" : ""}><b>{n.en}</b><small>{n.fr}</small></span>)}
        </div>
        <p className="small"><Badge kind="pratique" /> {INFO[g.n]?.caractere} <a href={`#gammes/${g.n}`}>Voir et écouter la gamme ↗</a></p>
        {conseillees.length > 0 && (
          <p className="small">Gammes souvent choisies en {s.nom} :{" "}
            {conseillees.map((x) => (
              <button key={x.n} type="button" className={`chipbtn ${x.n === m.scale ? "on" : ""}`} onClick={() => maj((y) => ({ ...y, scale: x.n }))}>{x.n} {x.nom}</button>
            ))}
          </p>
        )}
        <p className="small muted">Sur l'E2 : KEY et SCALE se règlent une fois pour tout le motif (Shift + Touch Scale ouvre SCALE). <SourceRef src={{ doc: "PG", page: 3 }} compact /> <SourceRef src={{ doc: "PG", page: 10 }} compact />
          {m.couches.length > 0 && " Les notes déjà posées suivent : chaque note garde son rang dans la nouvelle gamme."}</p>
      </div>

      <div className="mc-nav">
        {m.couches.length > 0 && <button type="button" className="e2-ui-btn" onClick={() => { if (confirm("Effacer ce morceau et recommencer ?")) recommencer(); }}>↺ Nouveau morceau</button>}
        <button type="button" className="px-btn green" onClick={suivant}>{m.couches.length ? "Reprendre les couches →" : "Commencer : le kick →"}</button>
      </div>
    </section>
  );
}

// ---------- 2. Une étape (une couche) ----------
function EtapeVue({ m, maj, etape, precedent, suivant }: { m: Morceau; maj: (f: (x: Morceau) => Morceau) => void; etape: Etape; precedent: () => void; suivant: () => void }) {
  const s = styleM(m.style);
  const gam = gammeByN.get(m.scale)!;
  const [el, setEl] = useState(etape.elements[0].id);
  const [essai, setEssai] = useState<string | null>(null);
  const [edit, setEdit] = useState<string | null>(() => m.couches.find((c) => c.etape === etape.id)?.uid ?? null);
  const elInfo = etape.elements.find((e) => e.id === el)!;

  const propositions = useMemo(() => {
    const toutes = RECETTES.filter((r) => r.element === el && !r.kit);
    const du = toutes.filter((r) => r.styles.includes(m.style));
    // Pas assez de recettes de ce style : d'abord celles des styles proches (fiche du style), puis les autres.
    const parents = FICHE[m.style].generateur.parents;
    const proches = toutes.filter((r) => !r.styles.includes(m.style) && r.styles.some((x) => parents.includes(x)));
    const autres = toutes.filter((r) => !r.styles.includes(m.style) && !proches.includes(r));
    return [...du, ...proches, ...autres].slice(0, 5);
  }, [el, m.style]);

  const coucheDe = (rc: Recette): Couche => ({
    uid: uid(), etape: etape.id, recette: rc.id,
    mesures: rapprocher(rc.mesures, rc.melodique ? gammeByN.get(rc.melodique.scale) : undefined, gam),
    knobs: knobsDe(rc), octave: rc.apercu.octave,
  });
  const essaiCouche = useMemo(() => {
    const rc = essai ? rcById.get(essai) : undefined;
    return rc ? { ...coucheDe(rc), uid: "essai" } : undefined;
  }, [essai, m.scale]); // eslint-disable-line react-hooks/exhaustive-deps

  const choisir = (rc: Recette) => {
    const c = coucheDe(rc);
    const ancienne = m.couches.find((x) => x.etape === etape.id && rcById.get(x.recette)?.element === rc.element);
    maj((x) => ({ ...x, couches: [...x.couches.filter((y) => y !== ancienne && y.uid !== ancienne?.uid), c], passees: x.passees.filter((p) => p !== etape.id) }));
    setEdit(c.uid);
    setEssai(null);
  };
  const retirer = (u: string) => { maj((x) => ({ ...x, couches: x.couches.filter((c) => c.uid !== u) })); if (edit === u) setEdit(null); };
  const passer = () => { maj((x) => ({ ...x, passees: x.passees.includes(etape.id) ? x.passees : [...x.passees, etape.id] })); suivant(); };
  const ici = m.couches.filter((c) => c.etape === etape.id);
  const idx = ETAPES.indexOf(etape);

  return (
    <section className="mc-etape" style={{ "--cc": etape.couleur } as CSSProperties}>
      <header className="mc-etape-h">
        <PixelArt name={etape.icone} size={44} />
        <div>
          <h3 className="mc-h">Étape {idx + 1} · {etape.nom}</h3>
          <p className="mc-role"><Badge kind="pratique" /> <b>En {s.nom} :</b> {etape.role[m.style]}</p>
        </div>
      </header>

      {etape.elements.length > 1 && (
        <div className="rg-els" style={{ "--cc": etape.couleur } as CSSProperties} role="radiogroup" aria-label="Type de couche">
          <span className="rg-els-titre">Type de {etape.nom.toLowerCase()}</span>
          <div className="rg-els-liste">
            {etape.elements.map((x) => {
              const pris = ici.some((c) => rcById.get(c.recette)?.element === x.id);
              return (
                <button key={x.id} type="button" role="radio" aria-checked={el === x.id} className={`rg-el ${el === x.id ? "on" : ""}`} onClick={() => { setEl(x.id); setEssai(null); }}>
                  {pris ? "✓ " : ""}{x.nom}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <p className="small mc-eltxt"><b>{elInfo.nom} :</b> {elInfo.texte}</p>

      <h4>Propositions : écoute-les par-dessus tes couches, puis choisis</h4>
      <div className="mc-props">
        {propositions.map((rc) => {
          const choisie = ici.find((c) => c.recette === rc.id);
          const autre = !rc.styles.includes(m.style);
          return (
            <article key={rc.id} className={`mc-prop ${essai === rc.id ? "essai" : ""} ${choisie ? "choisie" : ""}`}>
              <div className="mc-prop-h">
                <b>{rc.nom}</b>
                <span className="mc-tags">{rc.styles.map((x) => <span key={x} className={`mc-tag ${x === m.style ? "on" : ""}`}>{STYLE_NOM[x]}</span>)}</span>
              </div>
              <p className="small">{rc.idee}</p>
              {autre && <p className="small muted">Recette d'un autre style : elle peut quand même coller, écoute.</p>}
              <div className="mc-prop-btns">
                <button type="button" className={`e2-ui-btn ${essai === rc.id ? "lit" : ""}`} aria-pressed={essai === rc.id}
                  onClick={() => setEssai((e) => (e === rc.id ? null : rc.id))}>{essai === rc.id ? "✕ Retirer l'essai" : "♪ Essayer par-dessus"}</button>
                {choisie
                  ? <span className="mc-choisie">✓ Choisie · Part {triees(m.couches).indexOf(choisie) + 1}</span>
                  : <button type="button" className="e2-ui-btn" onClick={() => choisir(rc)}>✓ Choisir</button>}
                <a className="small" href={`#recettes/${rc.id}`}>fiche ↗</a>
              </div>
            </article>
          );
        })}
      </div>

      <Lecteur m={m} maj={maj} essai={essaiCouche} edit={edit} setEdit={setEdit} editable={(c) => c.etape === etape.id} />

      {ici.length > 0 && (
        <div className="mc-ici">
          {ici.map((c) => {
            const rc = rcById.get(c.recette)!;
            return (
              <div key={c.uid} className={`mc-ici-row ${edit === c.uid ? "on" : ""}`}>
                <span>Part {triees(m.couches).indexOf(c) + 1} · <b>{rc.nom}</b></span>
                <button type="button" className="e2-ui-btn" onClick={() => setEdit((e) => (e === c.uid ? null : c.uid))} aria-expanded={edit === c.uid}>✎ Modifier les notes et les potards</button>
                <button type="button" className="e2-ui-btn" onClick={() => retirer(c.uid)}>✕ Retirer</button>
              </div>
            );
          })}
          {edit && ici.some((c) => c.uid === edit) && <Potards m={m} maj={maj} c={ici.find((c) => c.uid === edit)!} />}
        </div>
      )}

      <div className="block mc-conseils">
        <h4>Pour que ça s'emboîte</h4>
        <Verifs m={m} maj={maj} etape={etape} />
        <ul className="facts">
          {etape.conseils.map((x) => <li key={x.texte}><Badge kind="pratique" /> {x.texte} {x.ref && <SourceRef src={x.ref} compact />}</li>)}
        </ul>
      </div>

      <div className="mc-nav">
        <button type="button" className="e2-ui-btn" onClick={precedent}>← {idx === 0 ? "Départ" : ETAPES[idx - 1].nom}</button>
        {!ici.length && <button type="button" className="e2-ui-btn" onClick={passer}>Passer cette étape</button>}
        {idx + 1 < ETAPES.length
          ? <button type="button" className="px-btn green" onClick={suivant}>{ici.length ? "Couche suivante" : "Suivant"} : {ETAPES[idx + 1].nom} →</button>
          : <button type="button" className="px-btn green" onClick={suivant}>Voir la grille du morceau →</button>}
      </div>
    </section>
  );
}

// ---------- Vérifications d'emboîtement ----------
const notesSur = (c: Couche, coups: Set<number>) => {
  let n = 0;
  c.mesures.forEach((mm, b) => mm.forEach((p, i) => { if (p !== null && p !== "~" && coups.has(b * 16 + i)) n++; }));
  return n;
};
const positions = (cs: Couche[]) => {
  const out = new Set<number>();
  cs.forEach((k) => k.mesures.forEach((mm, b) => mm.forEach((p, i) => { if (p !== null && p !== "~") out.add(b * 16 + i); })));
  return out;
};
/** Hauteur MIDI la plus basse / la plus haute d'une couche mélodique. */
function registre(c: Couche, m: Morceau) {
  const g = gammeByN.get(m.scale)!;
  const k = keyByEn(m.key).semi;
  const hs: number[] = [];
  c.mesures.forEach((mm) => mm.forEach((p) => { if (p !== null && p !== "~") hs.push(36 + k + 12 * c.octave + degreeSemi(g, p)); }));
  return hs.length ? { bas: Math.min(...hs), haut: Math.max(...hs) } : null;
}

function Verifs({ m, maj, etape }: { m: Morceau; maj: (f: (x: Morceau) => Morceau) => void; etape: Etape }) {
  const kicks = m.couches.filter((c) => c.etape === "kick");
  const coups = positions(kicks);
  const liberer = (u: string, sur: Set<number>) => maj((x) => ({ ...x, couches: x.couches.map((y) => (y.uid !== u ? y : { ...y, mesures: y.mesures.map((mm, b) => mm.map((p, i) => (sur.has(b * 16 + i) && p !== "~" ? null : p))) })) }));
  const ici = m.couches.filter((c) => c.etape === etape.id);
  const out: JSX.Element[] = [];
  if (etape.id === "kick" && kicks.length) {
    const temps = [0, 4, 8, 12].every((i) => coups.has(i));
    out.push(<li key="k" className={temps ? "ok" : "warn"}>{temps ? "Ton kick tape sur les 4 temps de la mesure : la base est posée." : "Ton kick ne tape pas sur tous les temps de la mesure 1 : c'est possible (style cassé), mais dans tous les styles de l'app, le 4×4 est la base."}</li>);
  }
  if (etape.id !== "kick" && !kicks.length && ici.length) out.push(<li key="nk" className="warn">Tu n'as pas de kick : cette couche n'a pas de repère. Reviens à l'étape Kick pour l'entendre ensemble.</li>);
  if ((etape.id === "basse" || etape.id === "percs") && kicks.length) {
    ici.forEach((c) => {
      const rc = rcById.get(c.recette)!;
      const n = notesSur(c, coups);
      const tenu = rc.apercu.son === "sub" || rc.apercu.son === "reese";
      out.push(
        <li key={c.uid} className={n > 8 && !tenu ? "warn" : "ok"}>
          <b>{rc.nom}</b> : {n === 0 ? "aucun coup ne tombe en même temps que le kick : ils se partagent bien la place." : `${n} coup${n > 1 ? "s tombent" : " tombe"} en même temps que le kick.`}
          {n > 0 && !tenu && <> Ils se marchent dessus dans le grave.{" "}<button type="button" className="e2-ui-btn" onClick={() => liberer(c.uid, coups)}>Libérer les coups du kick</button></>}
          {n > 0 && tenu && <> Pour un son tenu c'est normal : garde son Level plus bas que le kick pour que le kick passe devant.</>}
        </li>,
      );
    });
    if (etape.id === "basse" && ici.length > 1) out.push(<li key="2b" className="warn">Tu as {ici.length} basses : écoute-les en Solo (S) puis ensemble ; baisse le Level de celle qui accompagne.</li>);
  }
  if (etape.id === "hats") {
    const ouv = ici.filter((c) => rcById.get(c.recette)?.element === "hat-ouvert");
    const fer = ici.filter((c) => rcById.get(c.recette)?.element === "hat-ferme");
    if (ouv.length && fer.length) {
      const po = positions(ouv);
      fer.forEach((c) => {
        const n = notesSur(c, po);
        out.push(<li key={c.uid} className={n ? "warn" : "ok"}>{n ? <>{n} charleston{n > 1 ? "s fermés tombent" : " fermé tombe"} sur un charleston ouvert. <button type="button" className="e2-ui-btn" onClick={() => liberer(c.uid, po)}>Retirer ces fermés</button></> : "Fermé et ouvert ne tombent jamais ensemble : c'est propre."}</li>);
      });
    }
    ouv.forEach((c) => {
      const p = positions([c]);
      const contre = [2, 6, 10, 14].filter((i) => p.has(i)).length;
      out.push(<li key={`o${c.uid}`} className="ok">Charleston ouvert : {contre}/4 contretemps de la mesure 1 occupés{contre >= 3 ? ", le balancier tekno classique." : "."}</li>);
    });
  }
  if (etape.id === "melodie") {
    const basses = m.couches.filter((c) => c.etape === "basse" && !percu(rcById.get(c.recette)!)).map((c) => registre(c, m)).filter(Boolean) as { bas: number; haut: number }[];
    const hautBasse = basses.length ? Math.max(...basses.map((x) => x.haut)) : null;
    ici.forEach((c) => {
      const r = registre(c, m);
      if (!r || hautBasse === null) return;
      const masque = r.bas <= hautBasse;
      out.push(
        <li key={c.uid} className={masque ? "warn" : "ok"}>
          <b>{rcById.get(c.recette)!.nom}</b> : {masque ? "certaines notes descendent dans le registre de la basse, elles vont la masquer." : "la mélodie reste au-dessus de la basse : chacune a sa place."}
          {masque && c.octave < 3 && <> <button type="button" className="e2-ui-btn" onClick={() => maj((x) => ({ ...x, couches: x.couches.map((y) => (y.uid === c.uid ? { ...y, octave: y.octave + 1 } : y)) }))}>Monter d'une octave</button></>}
        </li>,
      );
    });
  }
  if (etape.id === "effets" && ici.length) out.push(<li key="fx" className="ok">Ici, la transition joue en boucle pour que tu l'entendes. Dans la vue Structure, elle ne joue que dans les sections où tu l'allumes (Montée, Break).</li>);
  const total = m.couches.length;
  if (total > 16) out.push(<li key="16" className="warn">Tu as {total} couches : l'E2 n'a que 16 parties par motif. <SourceRef src={PAGES.parties16} compact /></li>);
  return out.length ? <ul className="mc-verifs">{out}</ul> : null;
}

// ---------- Lecteur multi-couches ----------
function Lecteur({ m, maj, essai, edit, setEdit, editable, aide = "Les couches de cette étape se modifient en cliquant sur les cases ; les autres sont en lecture seule ici (reviens à leur étape pour les changer)." }: {
  m: Morceau; maj: (f: (x: Morceau) => Morceau) => void; essai?: Couche; edit: string | null; setEdit: (u: string | null) => void; editable: (c: Couche) => boolean; aide?: string;
}) {
  const id = "morceau";
  const snap = useEngine();
  const playing = snap.owner === id;
  const [prefs, updPrefs] = usePlayerPrefs();
  const [sel, setSel] = useState(0);
  const [suivre, setSuivre] = useState(true);
  const [choix, setChoix] = useState<{ u: string; i: number } | null>(null);
  const range = useKnobRange();
  const gam = gammeByN.get(m.scale)!;
  const lignes = useMemo(() => [...triees(m.couches), ...(essai ? [essai] : [])], [m.couches, essai]);
  const solo = lignes.some((c) => c.solo);
  const playBar = playing && snap.step >= 0 ? Math.floor(snap.step / 16) : -1;
  const shown = playing && suivre && !prefs.une && playBar >= 0 ? playBar : sel;

  const pisteDeC = (c: Couche): Piste => pisteCouche(c, Boolean(c.muet || (solo && !c.solo)), range);
  const state = (): SeqState | null => {
    if (!lignes.length) return null;
    const ps = lignes.map(pisteDeC);
    return { ...ps[0], keySemi: keyByEn(m.key).semi, gamme: gam, bpm: m.bpm, kickRepere: false, mode: prefs.mode, range: prefs.une ? (sel as 0 | 1 | 2 | 3) : "all", pistes: ps };
  };
  useEffect(() => { if (playing) { const st = state(); if (st) engine.set(id, st); else engine.stop(); } });
  useEffect(() => engine.register(id, () => { const st = state(); if (st) engine.play(id, st); }), [lignes, prefs, sel, m.bpm, m.key, m.scale]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (engine.snap.owner === id) engine.stop(); }, []);
  // Un nouvel essai se lance tout seul, pour l'entendre tout de suite par-dessus.
  useEffect(() => { if (essai && !playing) { const st = state(); if (st) { engine.touch(id); engine.play(id, st); } } }, [essai?.recette]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = () => { engine.touch(id); if (playing) engine.stop(); else { const st = state(); if (st) engine.play(id, st); } };

  const setCouche = (u: string, f: (c: Couche) => Couche) => maj((x) => ({ ...x, couches: x.couches.map((c) => (c.uid === u ? f(c) : c)) }));
  const setPas = (u: string, bar: number, i: number, v: Pas) => setCouche(u, (c) => ({ ...c, mesures: c.mesures.map((mm, b) => (b === bar ? mm.map((y, j) => (j === i ? v : y)) : mm)) }));
  const clickCell = (c: Couche, i: number) => {
    engine.touch(id);
    if (!editable(c) || c.uid === "essai") return;
    setEdit(c.uid);
    const rc = rcById.get(c.recette)!;
    const p = c.mesures[shown][i];
    if (rc.apercu.son === "riser") { setPas(c.uid, shown, i, p === null ? 0 : p === "~" ? null : "~"); return; }
    if (percu(rc)) { setPas(c.uid, shown, i, p === null ? 0 : null); if (p === null) { const st = state(); if (st) engine.audition(st, 0, pisteDeC(c)); } return; }
    setChoix((x) => (x && x.u === c.uid && x.i === i ? null : { u: c.uid, i }));
  };
  const options: Pas[] = useMemo(() => {
    const n = gam.notesEnDo.length;
    return [null, ...Array.from({ length: Math.min(15, Math.max(2 * n - 1, 2)) + 1 }, (_, i) => i), "~"];
  }, [gam]);
  const [a, b] = bornes(prefs.une ? (sel as 0) : "all");
  const cChoix = choix ? lignes.find((c) => c.uid === choix.u) : undefined;

  if (!lignes.length) return <p className="rg-hint">Choisis ou essaie une recette : elle apparaîtra ici sur 4 mesures.</p>;

  return (
    <div className="seqp gr-seqp mc-lecteur" onPointerDown={() => engine.touch(id)}>
      <p className="seqp-honest"><b>Approximation pédagogique, pas le son réel de l'Electribe.</b> Chaque couche est imitée par un son simple du navigateur.</p>
      <div className="seqp-transport">
        <BoutonLecture joue={playing} onClick={toggle} libelle="Tout écouter" espace />
        <ChoixMode mode={prefs.mode} onChange={(mode) => updPrefs({ mode })} />
        <div className="seg" role="radiogroup" aria-label="Longueur lue">
          <button type="button" role="radio" aria-checked={!prefs.une} className={!prefs.une ? "on" : ""} onClick={() => updPrefs({ une: false })}>4 mesures</button>
          <button type="button" role="radio" aria-checked={prefs.une} className={prefs.une ? "on" : ""} onClick={() => updPrefs({ une: true })}>1 mesure (Step {sel + 1})</button>
        </div>
        <span className="small muted">{m.bpm} BPM · KEY {m.key} · {gam.nom}</span>
      </div>

      <div className="seqp-steps" role="group" aria-label="Boutons Step 1 à 4">
        {[0, 1, 2, 3].map((bar) => (
          <button key={bar} type="button" className={`stepbtn ${shown === bar ? "sel" : ""} ${playBar === bar ? "playing" : ""} ${prefs.une && sel !== bar ? "dim" : ""}`}
            onClick={() => { setSel(bar); setSuivre(false); setChoix(null); }} aria-pressed={shown === bar}>
            <i className="led" aria-hidden /><span>Step {bar + 1}</span>
            <span className="mini" aria-hidden>{Array.from({ length: 16 }, (_, i) => {
              const on = lignes.some((c) => c.mesures[bar][i] !== null && c.mesures[bar][i] !== "~");
              return <b key={i} className={`${on ? "on" : ""} ${playing && snap.step === bar * 16 + i ? "now" : ""}`} />;
            })}</span>
          </button>
        ))}
      </div>
      <p className="small muted seqp-hint">
        Mesure {shown + 1} sur 4 = bouton <kbd>Step {shown + 1}</kbd>. M = couper la couche (Part Mute <SourceRef src={PAGES.partMute} compact />), S = écouter seulement les couches en Solo (aide de l'app).
        {" "}{playing && !prefs.une && <label className="seqp-chk"><input type="checkbox" checked={suivre} onChange={(e) => setSuivre(e.target.checked)} /> suivre la lecture</label>}
      </p>

      <div className="gr-matrix" role="grid" aria-label={`Mesure ${shown + 1}`}>
        <div className="gr-row gr-head mc-row" aria-hidden>
          <span className="gr-label" />
          {Array.from({ length: 16 }, (_, i) => <span key={i} className={`gr-num ${i % 4 === 0 ? "beat" : ""}`}>{i + 1}</span>)}
        </div>
        {lignes.map((c, t) => {
          const rc = rcById.get(c.recette)!;
          const est = c.uid === "essai";
          const e = etapeById.get(c.etape)!;
          const coupe = c.muet || (solo && !c.solo);
          return (
            <div key={c.uid} className={`gr-row mc-row ${coupe ? "muted-row" : ""} ${est ? "mc-essai" : ""} ${editable(c) && !est ? "mc-edit" : "mc-lock"} ${edit === c.uid ? "mc-cur" : ""}`} role="row" style={{ "--cc": e.couleur } as CSSProperties}>
              <span className="gr-label">
                {!est && <>
                  <button type="button" className={`gr-mute ${c.muet ? "on" : ""}`} aria-pressed={Boolean(c.muet)} title="Couper (Part Mute)"
                    onClick={() => setCouche(c.uid, (y) => ({ ...y, muet: !y.muet }))}>M</button>
                  <button type="button" className={`gr-mute mc-solo ${c.solo ? "on" : ""}`} aria-pressed={Boolean(c.solo)} title="Solo"
                    onClick={() => setCouche(c.uid, (y) => ({ ...y, solo: !y.solo }))}>S</button>
                </>}
                <span className="gr-pn">{est ? "essai" : `P${t + 1}`}</span>
                <a href={`#recettes/${rc.id}`} title={rc.nom}>{rc.nom}</a>
              </span>
              {c.mesures[shown].map((p, i) => {
                const pos = shown * 16 + i;
                const nm = percu(rc) ? null : nomPas(gam, m.key, p, c.octave);
                return (
                  <button key={i} type="button" role="gridcell"
                    className={`gr-cell ${p === null ? "" : p === "~" ? "tie" : "on"} ${i % 4 === 0 ? "beat" : ""} ${playing && snap.step === pos ? "now" : ""} ${pos < a || pos > b ? "out" : ""} ${choix?.u === c.uid && choix.i === i ? "editing" : ""}`}
                    onClick={() => clickCell(c, i)} title={`${est ? "Essai" : `Part ${t + 1}`}, pas ${shown + 1}.${String(i + 1).padStart(2, "0")}${nm && p !== "~" ? ` : ${nm.en} (${nm.fr})` : ""}`}>
                    {p !== null && (nm && p !== "~" ? <><b>{nm.en}</b><small className="gr-fr">{nm.fr}</small></> : p === "~" ? "~" : "●")}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="small muted">{aide}</p>

      {choix && cChoix && (
        <div className="seqp-choix">
          <span className="small">Pas {shown + 1}.{String(choix.i + 1).padStart(2, "0")} : seulement les notes de {gam.nom} sur {m.key}.</span>
          <div className="seqp-notes">
            {options.map((o, j) => {
              const nm = nomPas(gam, m.key, o, cChoix.octave);
              return (
                <button key={j} type="button" className={cChoix.mesures[shown][choix.i] === o ? "on" : ""}
                  onClick={() => { setPas(cChoix.uid, shown, choix.i, o); if (o !== null && o !== "~") { const st = state(); if (st) engine.audition(st, o, pisteDeC(cChoix)); } }}>
                  {o === null ? <b>—</b> : <b>{nm!.en}</b>}<small>{o === null ? "silence" : nm!.fr}</small>
                </button>
              );
            })}
            <button type="button" className="close-choix" onClick={() => setChoix(null)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Potards principaux et octave d'une couche ----------
function Potards({ m, maj, c }: { m: Morceau; maj: (f: (x: Morceau) => Morceau) => void; c: Couche }) {
  const rc = rcById.get(c.recette)!;
  const range = useKnobRange();
  const origine = knobsDe(rc);
  const set = (f: (y: Couche) => Couche) => maj((x) => ({ ...x, couches: x.couches.map((y) => (y.uid === c.uid ? f(y) : y)) }));
  const ids = POTARDS.filter((p) => KNOBS_APERCU.includes(p) && (c.knobs[p] !== undefined || p === "amp.level" || (!percu(rc) && (p === "filter.cutoff" || p === "amp.decay"))));
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(1);
  return (
    <div className="mc-potards">
      <h4>Potards de « {rc.nom} »</h4>
      <div className="seqp-knobs">
        {ids.map((p) => {
          const r = range(p);
          const v = c.knobs[p];
          const def = paramById.get(p)!;
          return (
            <label key={p} className="mc-knob">
              <span>{def.nom} <b>{v ?? "pas réglé"}</b> {!r.lue && <span className="verify">à vérifier sur l'écran</span>} <SourceRef src={def.source} compact /></span>
              <input type="range" min={r.min} max={r.max} step={1} value={v ?? Math.round((r.min + r.max) / 2)}
                onChange={(e) => { const n = Number(e.target.value); set((y) => ({ ...y, knobs: { ...y.knobs, [p]: n } })); }} />
            </label>
          );
        })}
      </div>
      {!percu(rc) && (
        <label className="mc-field mc-oct">
          <span>Octave de l'aperçu</span>
          <select value={c.octave} onChange={(e) => set((y) => ({ ...y, octave: Number(e.target.value) }))}>
            {[0, 1, 2, 3].map((o) => <option key={o} value={o}>{o === 0 ? "0 (grave, la basse)" : `+${o}`}</option>)}
          </select>
        </label>
      )}
      <div className="seqp-copy">
        <span>Copier</span>
        <select value={from} onChange={(e) => setFrom(Number(e.target.value))} aria-label="Mesure à copier">{[0, 1, 2, 3].map((x) => <option key={x} value={x}>Step {x + 1}</option>)}</select>
        <span>vers</span>
        <select value={to} onChange={(e) => setTo(Number(e.target.value))} aria-label="Mesure qui reçoit">{[0, 1, 2, 3].map((x) => <option key={x} value={x}>Step {x + 1}</option>)}</select>
        <button type="button" className="e2-ui-btn" disabled={from === to} onClick={() => set((y) => ({ ...y, mesures: y.mesures.map((mm, k) => (k === to ? [...y.mesures[from]] : mm)) }))}>Copier</button>
        <button type="button" className="e2-ui-btn" onClick={() => set((y) => ({ ...y, knobs: { ...origine }, octave: rc.apercu.octave, mesures: rapprocher(rc.mesures, rc.melodique ? gammeByN.get(rc.melodique.scale) : undefined, gammeByN.get(m.scale)!) }))}>↺ Remettre la recette d'origine</button>
      </div>
      <p className="small muted">Les valeurs sont celles de l'écran de l'E2. Tant que tu n'as pas relevé la plage d'un potard (Carnet), elle est supposée de 0 à 127.</p>
    </div>
  );
}

// ---------- 3. La grille du morceau ----------
const voixDe = (rc: Recette) => (/^Poly/.test(val(rc.reglages, "part.voiceassign") ?? "") ? 4 : 1);

function GrilleVue({ m, maj }: { m: Morceau; maj: (f: (x: Morceau) => Morceau) => void }) {
  const [edit, setEdit] = useState<string | null>(null);
  const cs = triees(m.couches);
  const voix = cs.reduce((t, c) => t + voixDe(rcById.get(c.recette)!), 0);
  const ed = cs.find((c) => c.uid === edit);
  if (!cs.length) return <p className="rg-hint">Ton morceau n'a pas encore de couche : commence par l'Assistant, ou ouvre un des Exemples.</p>;
  return (
    <section className="mc-vue">
      <p className="small">Chaque ligne est une partie de l'E2, comme sur le séquenceur : Part 1 en haut. M coupe une partie pendant la lecture (Part Mute <SourceRef src={PAGES.partMute} compact />), S l'écoute seule. Clique sur une case pour changer une note ; le nom de la couche ouvre sa recette.</p>
      <Lecteur m={m} maj={maj} edit={edit} setEdit={setEdit} editable={() => true} aide="Toutes les couches se modifient ici. Pour changer de recette, reviens à l'étape de la couche dans l'Assistant." />
      {ed && <Potards m={m} maj={maj} c={ed} />}

      <div className="block">
        <h3>Les parties de l'E2</h3>
        <div className="mc-table-wrap">
          <table className="mc-table">
            <thead><tr><th>Part</th><th>Couche</th><th>Recette</th><th>Oscillateur</th><th>VOICE ASSIGN</th><th>Voix max</th><th /></tr></thead>
            <tbody>
              {cs.map((c, i) => {
                const rc = rcById.get(c.recette)!;
                const e = etapeById.get(c.etape)!;
                return (
                  <tr key={c.uid} className={edit === c.uid ? "on" : ""}>
                    <td><b>{i + 1}</b></td>
                    <td><span className="mc-dot" style={{ background: e.couleur }} /> {e.nom}</td>
                    <td><a href={`#recettes/${rc.id}`}>{rc.nom}</a></td>
                    <td>{val(rc.reglages, "osc.type") ?? "—"}</td>
                    <td>{val(rc.reglages, "part.voiceassign") ?? "—"}</td>
                    <td>{voixDe(rc)}</td>
                    <td><button type="button" className="e2-ui-btn" onClick={() => setEdit((x) => (x === c.uid ? null : c.uid))}>✎ Potards</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ul className="mc-verifs">
          <li className={cs.length <= 16 ? "ok" : "warn"}><b>{cs.length} partie{cs.length > 1 ? "s" : ""} sur 16.</b> Un motif de l'E2 a 16 parties. <SourceRef src={PAGES.parties16} compact /></li>
          <li className={voix <= 24 ? "ok" : "warn"}>
            <b>Environ {voix} voix sur 24 au maximum.</b> Le manuel donne 24 voix au maximum pour tout le motif et jusqu'à 4 par partie ; le vrai nombre dépend de l'oscillateur, du filtre et de l'Insert FX choisis. <SourceRef src={PAGES.voix24} compact />
            {" "}<Badge kind="pratique">Estimation de l'app</Badge> : on compte 4 voix pour une partie en Poly, 1 en Mono. <SourceRef src={PAGES.voiceAssign} compact />
          </li>
          <li className="ok">Une seule KEY et une seule SCALE pour tout le motif : {m.key} · {gammeByN.get(m.scale)!.nom}. <SourceRef src={{ doc: "PG", page: 3 }} compact /></li>
        </ul>
      </div>
    </section>
  );
}

// ---------- 4. Structure du morceau ----------
/** Joue une structure section par section : chaque section garde les couches de ses étapes. */
function StructureLecteur({ id, m, sections }: { id: string; m: Morceau; sections: Section[] }) {
  const range = useKnobRange();
  const snap = useEngine();
  const playing = snap.owner === id;
  const [court, setCourt] = useState(true);
  const [jeu, setJeu] = useState<{ plan: number[]; tour: number; seule: boolean } | null>(null);
  const [bascule, setBascule] = useState(false);
  const etat = (si: number, mode: Mode) => etatMix(m, range, (c) => sections[si].etapes.includes(c.etape), mode);
  const lancer = (seule: number | null) => {
    engine.touch(id);
    const plan = seule !== null ? [seule] : sections.flatMap((x, i) => Array.from({ length: court ? 1 : Math.max(1, x.mesures / 4) }, () => i));
    const st = etat(plan[0], seule !== null ? "loop" : plan.length > 1 ? "loop" : "once");
    if (!st) return;
    setJeu({ plan, tour: 0, seule: seule !== null });
    setBascule(false);
    engine.play(id, st);
  };
  // Juste avant la fin de chaque tour de 4 mesures, on passe à la section suivante.
  useEffect(() => {
    if (!playing || !jeu || jeu.seule) return;
    if (snap.step >= 60 && !bascule) {
      setBascule(true);
      const next = jeu.tour + 1;
      if (next >= jeu.plan.length) return;
      const st = etat(jeu.plan[next], next === jeu.plan.length - 1 ? "once" : "loop");
      if (st) engine.set(id, { pistes: st.pistes, mode: st.mode });
      setJeu({ ...jeu, tour: next });
    } else if (snap.step >= 0 && snap.step < 16 && bascule) setBascule(false);
  }, [snap.step]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (engine.snap.owner === id) engine.stop(); }, [id]);
  const cur = playing && jeu ? jeu.plan[snap.step >= 60 && bascule ? Math.max(0, jeu.tour - 1) : jeu.tour] : -1;
  const total = sections.reduce((t, x) => t + x.mesures, 0);
  const duree = Math.round((total * 4 * 60) / m.bpm);

  return (
    <div className="mc-struct-play">
      <div className="mc-timeline" role="group" aria-label="Sections du morceau">
        {sections.map((x, i) => (
          <button key={i} type="button" className={`mc-sec ${cur === i ? "now" : ""}`} style={{ "--cc": x.couleur, flexGrow: x.mesures } as CSSProperties}
            onClick={() => (playing && jeu?.seule && cur === i ? engine.stop() : lancer(i))} title={`Écouter seulement : ${x.nom}`}>
            <b>{x.nom}</b><small>{x.mesures} mes.</small><span className="mc-sec-play">{playing && jeu?.seule && cur === i ? "■" : "▶"}</span>
          </button>
        ))}
      </div>
      <div className="seqp-transport">
        <button type="button" className={`e2-ui-btn play ${playing && !jeu?.seule ? "on" : ""}`} onClick={() => (playing ? engine.stop() : lancer(null))}>{playing ? "■ Stop" : "▶ Écouter tout le morceau"}</button>
        <div className="seg" role="radiogroup" aria-label="Longueur">
          <button type="button" role="radio" aria-checked={court} className={court ? "on" : ""} onClick={() => setCourt(true)}>Version courte (4 mesures par section)</button>
          <button type="button" role="radio" aria-checked={!court} className={!court ? "on" : ""} onClick={() => setCourt(false)}>Vraie longueur ({total} mesures, {Math.floor(duree / 60)} min {String(duree % 60).padStart(2, "0")})</button>
        </div>
        {cur >= 0 && <span className="small">En cours : <b>{sections[cur].nom}</b></span>}
      </div>
      <p className="seqp-honest"><b>Approximation pédagogique, pas le son réel de l'Electribe.</b> Clique sur une section pour l'écouter seule, en boucle.</p>
    </div>
  );
}

function StructureVue({ m, maj }: { m: Morceau; maj: (f: (x: Morceau) => Morceau) => void }) {
  const sections = structureDe(m);
  const set = (f: (s: Section[]) => Section[]) => maj((x) => ({ ...x, structure: f(structureDe(x)) }));
  const presentes = ETAPES.filter((e) => m.couches.some((c) => c.etape === e.id));
  if (!m.couches.length) return <p className="rg-hint">Construis d'abord quelques couches (Assistant) : la structure dit lesquelles jouent dans chaque section.</p>;
  return (
    <section className="mc-vue">
      <p className="small"><Badge kind="pratique" /> Une structure classique en {styleM(m.style).nom}. Clique sur une case pour allumer ou couper une couche dans une section ; change la longueur avec le menu. Une section = ton motif de 4 mesures joué plusieurs fois.</p>
      <StructureLecteur id="morceau-structure" m={m} sections={sections} />

      <div className="mc-table-wrap">
        <table className="mc-table mc-struct">
          <thead>
            <tr><th>Couche (Part)</th>{sections.map((x, i) => <th key={i} style={{ "--cc": x.couleur } as CSSProperties}>{x.nom}</th>)}</tr>
          </thead>
          <tbody>
            <tr className="mc-len"><td>Longueur</td>{sections.map((x, i) => (
              <td key={i}><select value={x.mesures} aria-label={`Longueur de ${x.nom}`} onChange={(e) => set((ss) => ss.map((y, j) => (j === i ? { ...y, mesures: Number(e.target.value) } : y)))}>
                {LONGUEURS.map((n) => <option key={n} value={n}>{n} mesures</option>)}
              </select></td>
            ))}</tr>
            {presentes.map((e) => (
              <tr key={e.id}>
                <td><span className="mc-dot" style={{ background: e.couleur }} /> {e.nom} <small className="muted">(Part {partiesDe(m, [e.id]).join(", ")})</small></td>
                {sections.map((x, i) => {
                  const on = x.etapes.includes(e.id);
                  return (
                    <td key={i}><button type="button" className={`mc-on ${on ? "on" : ""}`} aria-pressed={on} style={{ "--cc": x.couleur } as CSSProperties}
                      onClick={() => set((ss) => ss.map((y, j) => (j === i ? { ...y, etapes: on ? y.etapes.filter((z) => z !== e.id) : [...y.etapes, e.id] } : y)))}>{on ? "●" : "·"}</button></td>
                  );
                })}
              </tr>
            ))}
            <tr className="mc-role-row"><td>Rôle</td>{sections.map((x, i) => <td key={i} className="small">{x.role}</td>)}</tr>
          </tbody>
        </table>
      </div>
      {m.structure && <button type="button" className="e2-ui-btn" onClick={() => maj((x) => ({ ...x, structure: undefined }))}>↺ Remettre la structure proposée</button>}

      <div className="block">
        <h3>Sur l'E2, section par section</h3>
        <ol className="steps">
          {sections.map((x, i) => {
            const avant = i > 0 ? partiesDe(m, sections[i - 1].etapes) : [];
            const ici = partiesDe(m, x.etapes);
            const coupe = triees(m.couches).map((_, k) => k + 1).filter((p) => !ici.includes(p));
            return (
              <li key={i}><b>{x.nom}</b> ({x.mesures} mesures = {Math.max(1, x.mesures / 4)} tour{x.mesures > 4 ? "s" : ""} du motif) : jouent les parties {listeParts(ici)}{coupe.length ? `, coupées : ${listeParts(coupe)}` : ""}.
                {i > 0 && (() => {
                  const on = ici.filter((p) => !avant.includes(p)), off = avant.filter((p) => !ici.includes(p));
                  const t = [on.length ? `rallume ${listeParts(on)}` : "", off.length ? `coupe ${listeParts(off)}` : ""].filter(Boolean).join(", ");
                  return <> Depuis la section d'avant : {t || "rien ne change"}.</>;
                })()}
              </li>
            );
          })}
        </ol>
        <h4>Trois façons de le faire</h4>
        <ul className="facts">
          <li><b>En live avec Part Mute</b> : allume <kbd>Part Mute</kbd>, puis un appui sur le pad d'une partie la coupe, un autre la rallume. Compte les tours du motif et change à la fin d'un tour. <SourceRef src={PAGES.partMute} compact /></li>
          <li><b>Avec un enchaînement de motifs (chaîne)</b> : copie ton motif une fois par section (<kbd>Shift</kbd> + <kbd>Write</kbd>, nouveau numéro <SourceRef src={PAGES.write} compact />), efface dans chaque copie les parties coupées (PART UTILITY &gt; CLEAR SEQUENCE <SourceRef src={PAGES.partMute} compact />), puis règle CHAIN TO = le motif suivant et CHAIN REPEAT = le nombre de tours (avec LENGTH = 4, un tour = 4 mesures). <SourceRef src={PAGES.chain} compact /> Allume CHAIN MODE dans les réglages Global. <SourceRef src={PAGES.chainMode} compact /></li>
          <li><b>Avec Pattern Set</b> : range chaque motif-section sous un pad (<kbd>Pattern Set</kbd> allumé, choisis le motif, tiens <kbd>Pattern Set</kbd> et appuie sur le pad), puis en jouant, un pad = une section. <SourceRef src={PAGES.patternSet} compact /></li>
          <li><b>Pour la Montée</b> : enregistre l'ouverture du Cutoff avec Motion Sequence (MOTION SEQ = Smooth, Rec, tourne le potard pendant un tour) : la machine la rejoue toute seule. <SourceRef src={PAGES.motionSeq} compact /></li>
        </ul>
      </div>
    </section>
  );
}

// ---------- 5. Deux exemples complets ----------
function ExemplesVue({ courant, ouvrir }: { courant: Morceau; ouvrir: (m: Morceau, v?: Vue) => void }) {
  const [sel, setSel] = useState<string>(EXEMPLES[0].id);
  const ex = EXEMPLES.find((x) => x.id === sel)!;
  const m = useMemo(() => morceauDe(ex), [ex]);
  const cs = triees(m.couches);
  const [k, setK] = useState(cs.length);
  useEffect(() => setK(cs.length), [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  const range = useKnobRange();
  const snap = useEngine();
  const id = "morceau-demonter";
  const playing = snap.owner === id;
  const etat = (n: number) => etatMix(m, range, (_c, i) => i < n, "loop");
  useEffect(() => { if (playing) { const st = etat(k); if (st) engine.set(id, { pistes: st.pistes }); } }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (engine.snap.owner === id) engine.stop(); }, []);
  const toggle = () => { engine.touch(id); if (playing) engine.stop(); else { const st = etat(k); if (st) engine.play(id, st); } };
  const modifier = () => {
    if (courant.couches.length && !confirm(`Remplacer ton morceau en cours (« ${courant.nom} ») par l'exemple ? Enregistre-le d'abord dans « Emporter sur l'E2 » si tu veux le garder.`)) return;
    ouvrir({ ...m, nom: `${ex.nom} (ma version)` }, "grille");
  };
  return (
    <section className="mc-vue">
      <div className="mc-styles" role="radiogroup" aria-label="Exemple">
        {EXEMPLES.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={sel === x.id} className={`rg-cat ${sel === x.id ? "on" : ""}`} style={{ "--cc": styleM(x.style).couleur } as CSSProperties}
            onClick={() => { engine.stop(); setSel(x.id); }}>
            <PixelArt name="morceau" size={40} />
            <span className="rg-cat-nom">{x.nom}</span>
            <span className="rg-cat-txt">{styleM(x.style).nom} · {x.bpm} BPM · {x.key} {gammeByN.get(x.scale)!.nom}</span>
          </button>
        ))}
      </div>
      <p><Badge kind="pratique" /> {ex.idee}</p>

      <h3>Écouter en entier <Etoile type="morceau" cle={`ex-${ex.id}`} titre={ex.nom} /></h3>
      <StructureLecteur key={ex.id} id="morceau-exemple" m={m} sections={structureDe(m)} />

      <h3>Démonter couche par couche</h3>
      <div className="seqp mc-demonter">
        <div className="seqp-transport">
          <BoutonLecture joue={playing} onClick={toggle} libelle="Écouter" />
          <button type="button" className="e2-ui-btn" disabled={k <= 1} onClick={() => setK((x) => x - 1)}>− Retirer une couche</button>
          <button type="button" className="e2-ui-btn" disabled={k >= cs.length} onClick={() => setK((x) => x + 1)}>+ Ajouter une couche</button>
          <span className="small">{k} couche{k > 1 ? "s" : ""} sur {cs.length}</span>
        </div>
        <ol className="mc-couches">
          {cs.map((c, i) => {
            const e = etapeById.get(c.etape)!;
            return (
              <li key={c.uid} className={i < k ? "on" : ""}>
                <button type="button" onClick={() => setK(i + 1)} title="Écouter jusqu'à cette couche">
                  <span className="mc-dot" style={{ background: e.couleur }} /> Part {i + 1} · {e.nom} : <b>{rcById.get(c.recette)!.nom}</b>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="small muted">Clique sur une couche pour entendre le morceau jusqu'à elle : tu entends ce que chaque couche ajoute.</p>
      </div>

      <div className="mc-nav">
        <button type="button" className="px-btn green" onClick={modifier}>✎ Ouvrir cet exemple pour le modifier</button>
      </div>
    </section>
  );
}

// ---------- 6. Emporter sur la machine ----------
const CLE_LISTE = "e2academy.morceaux";
function lireListe(): Morceau[] {
  const x = lireJson<Morceau[]>(CLE_LISTE, []); return Array.isArray(x) ? x.filter((m) => m?.v === 1) : [];
}
function ecrireListe(l: Morceau[]) { ecrireJson(CLE_LISTE, l); }
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "morceau";

function ficheSections(m: Morceau, lue: (id: string) => boolean): { titre: string; lignes: Ligne[] }[] {
  const gam = gammeByN.get(m.scale)!;
  const cs = triees(m.couches);
  const sections = structureDe(m);
  return [
    { titre: "1. Préparer le motif", lignes: lignesPrep(m.bpm, m.key, gam) },
    ...cs.map((c, i) => {
      const rc = rcById.get(c.recette)!;
      const extra: Reglage[] = Object.entries(c.knobs).filter(([p]) => !rc.reglages.some((x) => x.param === p)).map(([p, v]) => ({ param: p, valeur: String(v), aVerifier: true }));
      return {
        titre: `${i + 2}. Part ${i + 1} · ${etapeById.get(c.etape)!.nom} · ${rc.nom}`,
        lignes: [
          ...lignesSon(i + 1, fusion(rc.reglages, extra), c.knobs, lue),
          LIGNE_SEQUENCER,
          ...lignesSequence(c.mesures, percu(rc), gam, m.key, c.octave),
          ...(percu(rc) ? [] : [LIGNE_NOTES]),
        ],
      };
    }),
    { titre: `${cs.length + 2}. Sauvegarder le motif`, lignes: [LIGNE_WRITE] },
    {
      titre: `${cs.length + 3}. Structure`,
      lignes: [
        ...sections.map((x) => ({ texte: `${x.nom} : ${x.mesures} mesures (${Math.max(1, x.mesures / 4)} tour${x.mesures > 4 ? "s" : ""} du motif), parties qui jouent : ${listeParts(partiesDe(m, x.etapes))}.` })),
        { texte: "En live : Part Mute coupe ou rallume une partie (un appui sur son pad).", ref: [PAGES.partMute] },
        { texte: "Ou une copie du motif par section (Shift + Write), puis CHAIN TO et CHAIN REPEAT, avec CHAIN MODE allumé.", ref: [PAGES.write, PAGES.chain, PAGES.chainMode] },
        { texte: "Ou chaque section sous un pad avec Pattern Set.", ref: [PAGES.patternSet] },
      ],
    },
  ];
}
const texteFiche = (m: Morceau, ss: { titre: string; lignes: Ligne[] }[]) =>
  `CrAoW ACADEMY · Morceau « ${m.nom} » · ${styleM(m.style).nom} · ${m.bpm} BPM · KEY ${m.key} · ${gammeByN.get(m.scale)!.nom}\n\n${ss.map((s) => `${s.titre}\n${s.lignes.map((l, i) => `${i + 1}. ${l.texte}${l.verifier ? " (à vérifier sur l'écran)" : ""}`).join("\n")}`).join("\n\n")}\n`;
const echap = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function EmporterVue({ m, ouvrir }: { m: Morceau; ouvrir: (m: Morceau, v?: Vue) => void }) {
  const range = useKnobRange();
  const ss = ficheSections(m, (p) => range(p).lue);
  const [liste, setListe] = useState<Morceau[]>(lireListe);
  const [msg, setMsg] = useState("");
  const dire = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 4000); };
  const majListe = (l: Morceau[]) => { setListe(l); ecrireListe(l); };
  const enregistrer = () => { majListe([{ ...m }, ...liste.filter((x) => x.nom !== m.nom)]); dire(`« ${m.nom} » est enregistré dans Mes morceaux.`); };
  const carnet = () => { setObservation(`morceau:${slug(m.nom)}`, `Morceau · ${m.nom}`, texteFiche(m, ss)); dire("La fiche est copiée dans ton Carnet (rubrique Morceaux)."); };
  const imprimer = () => {
    const w = window.open("", "_blank");
    if (!w) { dire("Le navigateur a bloqué la fenêtre d'impression : utilise « Télécharger la fiche »."); return; }
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echap(m.nom)}</title><style>body{font:14px/1.45 system-ui,sans-serif;margin:24px;color:#111}h1{font-size:20px}h2{font-size:15px;margin:18px 0 4px;border-bottom:1px solid #999}ol{margin:0;padding-left:22px}.v{color:#a05a00;font-size:12px}</style></head><body>
<h1>${echap(m.nom)}</h1><p>${echap(styleM(m.style).nom)} · ${m.bpm} BPM · KEY ${echap(m.key)} · ${echap(gammeByN.get(m.scale)!.nom)}</p>
${ss.map((s) => `<h2>${echap(s.titre)}</h2><ol>${s.lignes.map((l) => `<li>${echap(l.texte)}${l.verifier ? ' <span class="v">à vérifier sur l\'écran</span>' : ""}${l.ref ? ` <small>(${l.ref.map((r) => `${r.doc === "OM" ? "Mode d'emploi" : "Guide"} p. ${r.page}`).join(", ")})</small>` : ""}</li>`).join("")}</ol>`).join("")}
</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };
  const exporter = async (ms: Morceau[], nom: string) => {
    const ok = await telecharger(nom, JSON.stringify({ type: "e2academy-morceaux", v: 1, exporteLe: new Date().toISOString(), morceaux: ms }, null, 2), "application/json");
    if (ok) dire("Fichier proposé au téléchargement.");
  };
  const importer = async (f?: File) => {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      const ms: Morceau[] = (Array.isArray(d?.morceaux) ? d.morceaux : d?.v === 1 ? [d] : []).filter((x: Morceau) => x?.v === 1 && Array.isArray(x.couches))
        .map((x: Morceau) => ({ ...x, couches: x.couches.filter((c) => rcById.has(c.recette)) }));
      if (!ms.length) { dire("Ce fichier ne contient pas de morceau CrAoW ACADEMY."); return; }
      majListe([...ms, ...liste.filter((x) => !ms.some((y) => y.nom === x.nom))]);
      dire(`${ms.length} morceau${ms.length > 1 ? "x importés" : " importé"} dans Mes morceaux.`);
    } catch { dire("Impossible de lire ce fichier."); }
  };
  return (
    <section className="mc-vue">
      {!m.couches.length && <p className="rg-hint">Ton morceau est vide : construis des couches ou ouvre un exemple.</p>}
      {m.couches.length > 0 && <>
        <CopierPanel titre={`Morceau « ${m.nom} »`} note="La fiche complète : préparation du motif, puis pour chaque partie l'oscillateur, le filtre et les valeurs, la séquence mesure par mesure, et la structure. Avec tes changements actuels." sections={ss} />
        <div className="mc-nav mc-left">
          <button type="button" className="e2-ui-btn" onClick={imprimer}>🖨 Version imprimable</button>
          <button type="button" className="e2-ui-btn" onClick={() => void telecharger(`${slug(m.nom)}-fiche.txt`, texteFiche(m, ss), "text/plain")}>⇩ Télécharger la fiche (.txt)</button>
          <button type="button" className="e2-ui-btn" onClick={carnet}>✎ Copier dans mon Carnet</button>
        </div>
      </>}

      <div className="block">
        <h3>Mes morceaux</h3>
        <p className="small muted">Le morceau en cours est gardé tout seul sur cet appareil. Enregistre-le sous son nom pour en commencer un autre, et exporte-les en fichier pour les passer du PC au téléphone (comme tes relevés).</p>
        <label className="mc-field mc-oct"><span>Nom du morceau en cours</span>
          <input type="text" value={m.nom} maxLength={40} onChange={(e) => ouvrir({ ...m, nom: e.target.value }, "emporter")} />
        </label>
        <div className="mc-nav mc-left">
          <button type="button" className="e2-ui-btn" disabled={!m.couches.length} onClick={enregistrer}>💾 Enregistrer dans Mes morceaux</button>
          <button type="button" className="e2-ui-btn" disabled={!m.couches.length} onClick={() => void exporter([m], `${slug(m.nom)}.e2morceau.json`)}>⇩ Exporter ce morceau</button>
          <button type="button" className="e2-ui-btn" disabled={!liste.length} onClick={() => void exporter(liste, "mes-morceaux.e2morceau.json")}>⇩ Exporter tous mes morceaux</button>
          <label className="e2-ui-btn mc-import">⇧ Importer un fichier<input type="file" accept=".json,application/json" onChange={(e) => { void importer(e.target.files?.[0]); e.target.value = ""; }} /></label>
        </div>
        {msg && <p className="mc-msg" role="status">{msg}</p>}
        {liste.length > 0 && (
          <ul className="mc-liste">
            {liste.map((x) => (
              <li key={x.nom}>
                <span><b>{x.nom}</b> <small className="muted">· {styleM(x.style).nom} · {x.bpm} BPM · {x.couches.length} couches · {new Date(x.majLe).toLocaleDateString("fr-FR")}</small></span>
                <button type="button" className="e2-ui-btn" onClick={() => { if (!m.couches.length || x.nom === m.nom || confirm(`Ouvrir « ${x.nom} » ? Le morceau en cours (« ${m.nom} ») sera remplacé ; enregistre-le d'abord si tu veux le garder.`)) ouvrir(x, "grille"); }}>Ouvrir</button>
                <button type="button" className="e2-ui-btn" onClick={() => { if (confirm(`Supprimer « ${x.nom} » de Mes morceaux ?`)) majListe(liste.filter((y) => y.nom !== x.nom)); }}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
