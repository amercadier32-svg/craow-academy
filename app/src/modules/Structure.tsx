// Structure de morceau : intro / montée / break / drop / outro, construite à partir d'une grille.
// Trois façons de la jouer sur l'E2 : Part Mute en direct, Chain (motifs enchaînés), Pattern Set.
import { BoutonLecture, ChoixMode } from "../components/Lecteur";
import { lireJson, garderSiModifie } from "../lib/stockage";
import { Infos, Rangement } from "../components/Rangement";
import { useEffect, useMemo, useRef, useState } from "react";
import { GRILLES, STYLE_GRILLE, type Grille } from "../content/grilles";
import { RECETTES, FONCTIONS } from "../content/recettes";
import { LONGUEURS, SECTIONS } from "../content/structure";
import { gammeByN, keyByEn } from "../lib/music";
import { engine, useEngine, type SeqState } from "../lib/seq";
import { Badge, DoneToggle, ObservationBox, SourceRef } from "../components/common";
import { useKnobRange } from "../components/SeqPlayer";
import { load, pisteDe } from "./Grilles";

const rcById = new Map(RECETTES.map((r) => [r.id, r]));
interface Sec { nom: string; couleur: string; mesures: number; on: boolean[]; role: string }
interface SData { sections: Sec[]; base: number }

function origineDe(g: Grille): SData {
  const fns = g.pistes.map((p) => rcById.get(p.recette)!.fonction);
  return {
    base: 101,
    sections: SECTIONS[g.style].map((s) => {
      let on = fns.map((f) => s.fonctions.includes(f));
      if (!on.some(Boolean)) on = fns.map((f) => f === "percussion");
      return { nom: s.nom, couleur: s.couleur, mesures: s.mesures, on, role: s.role };
    }),
  };
}
const KEY = (id: string) => `e2academy.structure.${id}`;
function loadS(g: Grille): SData {
  const d = lireJson<SData | null>(KEY(g.id), null); if (d?.sections?.[0]?.on.length === g.pistes.length) return d;
  return origineDe(g);
}
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

const COUL_STYLE: Record<string, string> = { tribe: "#ff6a3d", mentale: "#9b6bff", tekno: "#6aa2ee" };

export default function Structure({ focus }: { focus?: string }) {
  const [sel, setSel] = useState<string | null>(() => (focus && GRILLES.some((g) => g.id === focus) ? focus : GRILLES[0].id));
  const [style, setStyle] = useState<string>("tous");
  const g = GRILLES.find((x) => x.id === sel);
  const choose = (id: string | null) => { setSel(id); history.replaceState(null, "", id ? `#structure/${id}` : "#structure"); };
  return (
    <div className="structure">
      <h2 className="page-title">Structure de morceau</h2>
      <Infos>
        <p>
          Un morceau = la même grille jouée plusieurs fois, en coupant ou en rallumant des parties. <Badge kind="pratique" /> pour les longueurs et le choix des parties ;
          les gestes sur la machine viennent du manuel.
        </p>
      </Infos>
      <Rangement
        racine="Structure"
        filtre={{ label: "Style", value: style, onChange: setStyle, options: [
          { id: "tous", nom: "Toutes", n: GRILLES.length },
          ...(["tribe", "mentale", "tekno"] as const).map((st) => ({ id: st, nom: STYLE_GRILLE[st], n: GRILLES.filter((x) => x.style === st).length })),
        ] }}
        labelCategorie="À partir de la grille"
        categories={GRILLES.filter((x) => style === "tous" || x.style === style).map((x) => ({ id: x.id, nom: x.nom, texte: STYLE_GRILLE[x.style], icone: "structure", couleur: COUL_STYLE[x.style], n: x.bpm }))}
        cat={sel} onCat={choose}
      />
      {g ? <Plan key={g.id} g={g} /> : <p className="rg-hint">Choisis une grille pour construire ton morceau.</p>}
    </div>
  );
}

function Plan({ g }: { g: Grille }) {
  const id = `structure:${g.id}`;
  const origine = useMemo(() => origineDe(g), [g]);
  const [d, setD] = useState<SData>(() => loadS(g));
  useEffect(() => {
    garderSiModifie(KEY(g.id), d, origine);
  }, [d, origine, g.id]);
  const grille = useMemo(() => load(g.id, g), [g]);   // ta version de la grille si tu l'as modifiée
  const recettes = g.pistes.map((p) => rcById.get(p.recette)!);
  const range = useKnobRange();
  const snap = useEngine();
  const playing = snap.owner === id;
  const total = d.sections.reduce((n, s) => n + s.mesures, 0);
  const sec4 = (4 * 60) / g.bpm;   // durée d'une mesure (4 temps)

  // Lecture : un tour de motif = 4 mesures. On change les parties juste avant chaque nouveau tour.
  const tours = d.sections.flatMap((s, i) => Array.from({ length: s.mesures / 4 }, () => i));
  const [tour, setTour] = useState(-1);
  const tourRef = useRef(-1);
  const lastStep = useRef(-1);
  const [boucle, setBoucle] = useState(false);
  const etat = (t: number): SeqState => {
    const s = d.sections[tours[t]];
    const ps = recettes.map((rc, k) => pisteDe(rc, grille.pistes[k].mesures, !s.on[k], range));
    return { ...ps[0], pistes: ps, keySemi: keyByEn(grille.key).semi, gamme: gammeByN.get(grille.scale)!, bpm: grille.bpm, kickRepere: false, mode: "loop", range: "all" };
  };
  useEffect(() => {
    if (!playing) { if (tourRef.current !== -1) { tourRef.current = -1; setTour(-1); } lastStep.current = -1; return; }
    const st = snap.step;
    if (st < 0) return;
    if (lastStep.current >= 60 && st < 4) { tourRef.current += 1; setTour(tourRef.current); }
    if (st >= 60 && lastStep.current < 60) {
      const nxt = tourRef.current + 1;
      if (nxt >= tours.length) { if (boucle) engine.set(id, { ...etat(0) }); else engine.set(id, { mode: "once" }); }
      else engine.set(id, { pistes: etat(nxt).pistes });
    }
    if (lastStep.current >= 60 && st < 4 && tourRef.current >= tours.length) { tourRef.current = 0; setTour(0); }
    lastStep.current = st;
  }, [snap.step, playing]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = () => {
    engine.touch(id);
    if (playing) { engine.stop(); return; }
    tourRef.current = 0; setTour(0); lastStep.current = -1;
    engine.play(id, etat(0));
  };
  useEffect(() => engine.register(id, () => { tourRef.current = 0; setTour(0); lastStep.current = -1; engine.play(id, etat(0)); }), [id, d, boucle]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (engine.snap.owner === id) engine.stop(); }, [id]);
  const curSec = playing && tour >= 0 ? tours[Math.min(tour, tours.length - 1)] : -1;
  const posMesure = playing && tour >= 0 && snap.step >= 0 ? Math.min(total, tour * 4 + Math.floor(snap.step / 16) + 1) : 0;

  const setSec = (i: number, p: Partial<Sec>) => setD((x) => ({ ...x, sections: x.sections.map((s, k) => (k === i ? { ...s, ...p } : s)) }));

  return (
    <div className="st-plan">
      <div className="block">
        <h3>{g.nom} <span className="muted small">· {total} mesures · {mmss(total * sec4)} à {g.bpm} BPM</span></h3>
        <div className="st-timeline" role="img" aria-label="Plan du morceau">
          {d.sections.map((s, i) => (
            <div key={i} className={`st-seg ${curSec === i ? "now" : ""}`} style={{ flexGrow: s.mesures, background: s.couleur }}>
              <b>{s.nom}</b><span>{s.mesures} mes. · {mmss(s.mesures * sec4)}</span>
            </div>
          ))}
          {playing && <i className="st-head" style={{ left: `${(100 * Math.max(0, posMesure - 1)) / total}%` }} />}
        </div>
        <div className="seqp-transport">
          <BoutonLecture joue={playing} onClick={toggle} libelle="Écouter le morceau" espace />
          <ChoixMode mode={boucle ? "loop" : "once"} onChange={(m) => setBoucle(m === "loop")} />
          {playing && <span className="small">Mesure {posMesure} / {total} · {curSec >= 0 ? d.sections[curSec].nom : ""}</span>}
        </div>
        <p className="seqp-honest"><b>Approximation pédagogique, pas le son réel de l'Electribe.</b> L'aperçu joue ta version de la grille {g.nom} et coupe les parties section par section.</p>
      </div>

      <div className="block">
        <h3>Qui joue dans chaque section</h3>
        <p className="small muted">Touche une case pour allumer ou couper une partie. Change la longueur avec le menu (un tour de motif = 4 mesures).</p>
        <div className="st-matrix" style={{ gridTemplateColumns: `minmax(120px, 1.4fr) repeat(${d.sections.length}, minmax(0, 1fr))` }}>
          <span />
          {d.sections.map((s, i) => (
            <div key={i} className={`st-colhead ${curSec === i ? "now" : ""}`} style={{ borderColor: s.couleur }}>
              <b>{s.nom}</b>
              <select value={s.mesures} onChange={(e) => setSec(i, { mesures: Number(e.target.value) })} aria-label={`Longueur ${s.nom}`}>
                {LONGUEURS.map((n) => <option key={n} value={n}>{n} mes.</option>)}
              </select>
            </div>
          ))}
          {recettes.map((rc, k) => (
            <Row key={k} k={k} nom={rc.nom} fn={FONCTIONS.find((f) => f.id === rc.fonction)!.nom} d={d} cur={curSec} onToggle={(i) => setSec(i, { on: d.sections[i].on.map((v, j) => (j === k ? !v : v)) })} />
          ))}
        </div>
        <ul className="facts small st-roles">{d.sections.map((s) => <li key={s.nom}><b style={{ color: s.couleur }}>{s.nom}</b> <Badge kind="pratique" /> {s.role}</li>)}</ul>
        <button type="button" className="e2-ui-btn" disabled={JSON.stringify(d) === JSON.stringify(origine)} onClick={() => setD(origineDe(g))}>↺ Remettre la structure d'origine</button>
      </div>

      <Methodes g={g} d={d} setBase={(b) => setD((x) => ({ ...x, base: b }))} />

      <div className="block">
        <h3>Ma version</h3>
        <ObservationBox id={id} titre={`Structure · ${g.nom}`} placeholder="Mon plan, ce qui marche en live…" />
        <DoneToggle id={id} />
      </div>
    </div>
  );
}

function Row({ k, nom, fn, d, cur, onToggle }: { k: number; nom: string; fn: string; d: SData; cur: number; onToggle: (i: number) => void }) {
  return (
    <>
      <span className="st-rowlabel"><span className="gr-pn">{k + 1}</span> {nom} <small className="muted">{fn}</small></span>
      {d.sections.map((s, i) => (
        <button key={i} type="button" className={`st-cell ${s.on[k] ? "on" : ""} ${cur === i ? "now" : ""}`} aria-pressed={s.on[k]} onClick={() => onToggle(i)}
          title={`${nom} · ${s.nom}`}>{s.on[k] ? "●" : ""}</button>
      ))}
    </>
  );
}

function Methodes({ g, d, setBase }: { g: Grille; d: SData; setBase: (n: number) => void }) {
  const [m, setM] = useState<"mute" | "chain" | "set">("mute");
  const n = g.pistes.length;
  const parts = (on: boolean[], want: boolean) => on.map((v, i) => (v === want ? i + 1 : 0)).filter(Boolean);
  const base = d.base;
  return (
    <div className="block">
      <h3>Le jouer sur ta machine</h3>
      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={m === "mute"} className={m === "mute" ? "on" : ""} onClick={() => setM("mute")}>En direct : Part Mute</button>
        <button type="button" role="tab" aria-selected={m === "chain"} className={m === "chain" ? "on" : ""} onClick={() => setM("chain")}>Tout seul : Chain</button>
        <button type="button" role="tab" aria-selected={m === "set"} className={m === "set" ? "on" : ""} onClick={() => setM("set")}>En live : Pattern Set</button>
      </div>

      {m === "mute" && (
        <div className="st-meth">
          <p className="small">Un seul motif (ta grille), qui tourne en boucle. Tu coupes et rallumes les parties à la main. <Badge kind="pratique" /> Compte les tours : un tour = 4 mesures.</p>
          <ol className="steps">
            <li>Allume <kbd>Part Mute</kbd> : un appui sur le pad d'une partie la coupe, un autre la rallume. <SourceRef src={{ doc: "OM", page: 32 }} compact /></li>
            <li>Avant de lancer : coupe {(() => { const x = parts(d.sections[0].on, false); return x.length === 0 ? "aucune partie" : x.length === 1 ? `la partie ${x[0]}` : `les parties ${x.join(", ")}`; })()}. Lance avec <kbd>Lecture/Pause</kbd>. <SourceRef src={{ doc: "OM", page: 27 }} compact /></li>
            {d.sections.slice(1).map((s, i) => {
              const prev = d.sections[i].on;
              const allume = s.on.map((v, k) => (v && !prev[k] ? k + 1 : 0)).filter(Boolean);
              const coupe = s.on.map((v, k) => (!v && prev[k] ? k + 1 : 0)).filter(Boolean);
              return (
                <li key={i}>Après {d.sections[i].mesures / 4} tour{d.sections[i].mesures > 4 ? "s" : ""} ({d.sections[i].mesures} mesures), <b>{s.nom}</b> :
                  {allume.length ? <> rallume {allume.length > 1 ? "les parties" : "la partie"} {allume.join(", ")}</> : null}{allume.length && coupe.length ? " ;" : ""}{coupe.length ? <> coupe {coupe.length > 1 ? "les parties" : "la partie"} {coupe.join(", ")}</> : null}{!allume.length && !coupe.length ? " rien ne change" : ""}.</li>
              );
            })}
            <li>Astuce : <kbd>Shift</kbd> + <kbd>Part Mute</kbd> rallume toutes les parties d'un coup (pratique pour le Drop). <SourceRef src={{ doc: "PG", page: 10 }} compact /></li>
          </ol>
        </div>
      )}

      {m === "chain" && (
        <div className="st-meth">
          <p className="small">Un motif par section, enchaînés automatiquement. Chaque motif est une copie de ta grille où tu effaces les parties qui ne jouent pas.</p>
          <label className="small">Premier numéro de motif libre : <input type="number" min={1} max={250 - d.sections.length} value={base} onChange={(e) => { const v = Number(e.target.value); if (v >= 1 && v <= 250 - d.sections.length) setBase(v); }} className="st-base" /></label>
          <span className="verify small"> vérifie sur l'écran que ces {d.sections.length} emplacements sont libres</span>
          <div className="st-tablewrap">
            <table className="st-table">
              <thead><tr><th>Section</th><th>Motif n°</th><th>Parties à effacer</th><th>CHAIN TO</th><th>CHAIN REPEAT</th></tr></thead>
              <tbody>
                {d.sections.map((s, i) => (
                  <tr key={i}>
                    <td><b style={{ color: s.couleur }}>{s.nom}</b></td>
                    <td><kbd>{base + i}</kbd></td>
                    <td>{parts(s.on, false).join(", ") || "aucune"}</td>
                    <td><kbd>{i + 1 < d.sections.length ? base + i + 1 : "Off"}</kbd></td>
                    <td><kbd>{s.mesures / 4}</kbd></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ol className="steps">
            <li>Global : <kbd>CHAIN MODE = On</kbd>. <SourceRef src={{ doc: "PG", page: 8 }} compact /></li>
            <li>Ouvre ta grille, puis pour chaque ligne du tableau : <kbd>Shift</kbd> + <kbd>Write</kbd>, choisis le numéro, <kbd>Write</kbd>. <SourceRef src={{ doc: "OM", page: 31 }} compact /></li>
            <li>Dans chaque copie, efface les notes des parties indiquées : PART UTILITY &gt; CLEAR SEQUENCE sur la partie (le son reste). <SourceRef src={{ doc: "OM", page: 32 }} compact /></li>
            <li>Dans chaque copie, règle CHAIN TO et CHAIN REPEAT comme dans le tableau, puis <kbd>Write</kbd>. CHAIN REPEAT = nombre de lectures du motif ; avec LENGTH = 4, une lecture = 4 mesures. <SourceRef src={{ doc: "PG", page: 3 }} compact /></li>
            <li>Lance le motif {base} : le morceau se joue tout seul. Pour qu'il recommence au lieu de s'arrêter, mets CHAIN TO = {base} dans le dernier. <SourceRef src={{ doc: "PG", page: 3 }} compact /></li>
          </ol>
          <p className="small muted">{n} parties × {d.sections.length} motifs. Le tableau suit tes changements de longueur et de parties.</p>
        </div>
      )}

      {m === "set" && (
        <div className="st-meth">
          <p className="small">Les mêmes motifs que la méthode Chain, mais c'est toi qui décides quand changer, d'un seul pad.</p>
          <ol className="steps">
            <li>Prépare un motif par section (voir l'onglet Chain, sans régler CHAIN TO).</li>
            <li>Allume <kbd>Pattern Set</kbd>, choisis un groupe avec un bouton Step, choisis le motif avec la molette, puis tiens <kbd>Pattern Set</kbd> et appuie sur le pad où le ranger. <SourceRef src={{ doc: "OM", page: 30 }} compact /></li>
            <li>Range {d.sections.map((s, i) => `${s.nom} (n° ${base + i}) sur le pad ${i + 1}`).join(", ")}.</li>
            <li>En jouant : <kbd>Pattern Set</kbd> allumé, un appui sur un pad lance son motif. <SourceRef src={{ doc: "OM", page: 30 }} compact /></li>
          </ol>
        </div>
      )}
    </div>
  );
}
