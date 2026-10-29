import { Infos } from "../components/Rangement";
import { useEffect, useRef, useState } from "react";
import { BLOCS, FLECHES, MOD_CIBLES, RANGEES, type Bloc, type Fleche } from "../content/chain";
import { exerciseById, type Exercise } from "../content/exercises";
import { controlById, paramById, type Parameter } from "../lib/data";
import { Badge, ObservationBox, SourceRef } from "../components/common";
import { ExerciseCard } from "../components/ExerciseCard";
import { ParamRow } from "../components/ParamRow";

type Sel = { kind: "bloc"; id: string } | { kind: "fleche"; id: string } | null;

const LABEL: Record<string, string> = {
  osc: "Osc", pitch: "Pitch", oscedit: "Edit", lpf: "LPF", hpf: "HPF", bpf: "BPF", cutoff: "Filter", resonance: "Reso",
  egint: "EG Int", level: "Level", pan: "Pan", attack: "Att", decay: "Dec", ampeg: "Amp EG", ifxtype: "Type",
  ifxedit: "Edit", ifxon: "IFX On", mfxsend: "MFX Send", modtype: "Type", depth: "Depth", speed: "Speed",
  masterfx: "Master Fx", touchpad: "Pad XY", mfxhold: "Hold", volume: "Volume", audioout: "Out L/R", phones: "Casque",
  audioin: "Audio In", inputlevel: "Input",
};

const exs = (ids?: string[]) => (ids ?? []).map((id) => exerciseById.get(id)).filter(Boolean) as Exercise[];

export default function SoundChain() {
  const [sel, setSel] = useState<Sel>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (sel) detailRef.current?.scrollTo({ top: 0 }); }, [sel]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Bloc choisi + blocs reliés (flèche choisie, ou destinations de la Modulation).
  const lies = new Set<string>();
  if (sel?.kind === "fleche") { lies.add(FLECHES[sel.id].de); lies.add(FLECHES[sel.id].vers); }
  if (sel?.kind === "bloc" && sel.id === "mod") MOD_CIBLES.forEach((c) => lies.add(c.bloc));

  const bloc = (id: string, key: string) => {
    const b = BLOCS[id];
    const on = sel?.kind === "bloc" && sel.id === id;
    return (
      <button key={key} type="button" className={`cb ${on ? "is-sel" : ""} ${lies.has(id) ? "is-linked" : ""} ${b.interp && !b.faits.length ? "cb-interp" : ""}`}
        onClick={() => setSel({ kind: "bloc", id })} aria-pressed={on}>
        <span className="cb-title">{b.titre}</span>
        <span className="cb-role">{b.role}</span>
        {b.controles.length > 0 ? (
          <span className="cb-ctls" aria-hidden>
            {b.controles.map((c) => {
              const t = controlById.get(c)?.type ?? "";
              const k = t === "potard" ? "k" : t === "bouton" ? "b" : t.startsWith("pad") ? "p" : "j";
              return <span key={c} className={`mini mini-${k}`}><i />{LABEL[c] ?? c}</span>;
            })}
          </span>
        ) : b.menu ? <span className="cb-menu">menu d'édition</span> : null}
      </button>
    );
  };

  const fleche = (id: string, vertical = false) => {
    const f = FLECHES[id];
    const on = sel?.kind === "fleche" && sel.id === id;
    return (
      <button key={id} type="button" className={`ca ca-${f.sorte} ${vertical ? "ca-v" : ""} ${on ? "is-sel" : ""}`}
        onClick={() => setSel({ kind: "fleche", id })} aria-pressed={on}
        aria-label={`${BLOCS[f.de].titre} vers ${BLOCS[f.vers].titre} : ${f.sorte === "manuel" ? "d'après le manuel" : "interprétation"}`}>
        <svg viewBox="0 0 40 16" aria-hidden><line x1="2" y1="8" x2="31" y2="8" /><path d="M30 3 L38 8 L30 13 Z" /></svg>
        {f.label && <span className="ca-label">{f.label}</span>}
      </button>
    );
  };

  const selected = sel?.kind === "bloc" ? BLOCS[sel.id] : undefined;
  const selFleche = sel?.kind === "fleche" ? FLECHES[sel.id] : undefined;

  return (
    <div className={`map chain ${sel ? "has-sel" : ""}`}>
      <div className="map-main">
        <h2 className="page-title">Chaîne du son</h2>
        <Infos>
          <p>Le trajet du son, de l'oscillateur jusqu'aux sorties. Touche un bloc ou une flèche pour voir ce que dit le manuel.</p>
        </Infos>
        <div className="chain-legend small">
          <span><svg viewBox="0 0 40 16" className="lg lg-manuel" aria-hidden><line x1="2" y1="8" x2="31" y2="8" /><path d="M30 3 L38 8 L30 13 Z" /></svg> <Badge kind="manuel" /> le manuel le dit</span>
          <span><svg viewBox="0 0 40 16" className="lg lg-interp" aria-hidden><line x1="2" y1="8" x2="31" y2="8" /><path d="M30 3 L38 8 L30 13 Z" /></svg> <Badge kind="interp" /> ordre supposé, à vérifier à l'écoute</span>
        </div>

        {RANGEES.map((r, ri) => (
          <div key={r.id}>
            <section className={`crow crow-${r.id}`}>
              <h3 className="crow-title">{r.titre} <SourceRef src={r.ref} compact /></h3>
              <div className="crow-items">
                {r.items.map((it, i) => (FLECHES[it] ? fleche(it) : bloc(it, `${it}-${i}`)))}
              </div>
              {r.id === "partie" && (
                <div className="mod-row">
                  {bloc("mod", "mod")}
                  <div className="mod-targets">
                    <span className="muted small">agit sur <SourceRef src={{ doc: "PG", page: 14 }} compact /></span>
                    {MOD_CIBLES.map((c) => (
                      <button key={c.label} type="button" className={`chip-t ${lies.has(c.bloc) && sel?.kind === "bloc" && sel.id === "mod" ? "on" : ""}`}
                        onClick={() => setSel({ kind: "bloc", id: c.bloc })}>
                        ⤴ {c.label} <span className="muted">({BLOCS[c.bloc].titre})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
            {ri === 0 && (
              <div className="cjoin" aria-label="Sortie des parties vers le motif">
                <span className="cjoin-from">MFX Send</span>
                {fleche("c1", true)}
                {fleche("c2", true)}
              </div>
            )}
          </div>
        ))}
      </div>

      <aside className="detail" ref={detailRef} aria-live="polite">
        {selected ? <BlocDetail b={selected} onClose={() => setSel(null)} />
          : selFleche ? <FlecheDetail f={selFleche} onClose={() => setSel(null)} onBloc={(id) => setSel({ kind: "bloc", id })} />
          : <Intro />}
      </aside>
    </div>
  );
}

function Intro() {
  return (
    <div className="empty">
      <h2>Comment lire le schéma</h2>
      <ul className="ticks">
        <li>Chaque partie a sa propre chaîne : Oscillator, Filter, Amp/EG, Insert Fx. <SourceRef src={{ doc: "OM", page: 23 }} compact /></li>
        <li>Les 16 parties se retrouvent dans le motif, avec un seul effet master. <SourceRef src={{ doc: "OM", page: 27 }} compact /></li>
        <li>La Modulation fait bouger un réglage d'un des blocs. <SourceRef src={{ doc: "PG", page: 14 }} compact /></li>
        <li>Flèche en pointillés : le manuel ne donne pas l'ordre. L'exercice d'écoute te permet de le vérifier. <Badge kind="interp" /></li>
      </ul>
    </div>
  );
}

function Top({ sur, titre, onClose }: { sur: string; titre: string; onClose: () => void }) {
  return (
    <div className="detail-top">
      <div><p className="muted small">{sur}</p><h2>{titre}</h2></div>
      <button type="button" className="close" onClick={onClose} aria-label="Fermer">✕</button>
    </div>
  );
}

function BlocDetail({ b, onClose }: { b: Bloc; onClose: () => void }) {
  const params = b.params.map((id) => paramById.get(id)).filter(Boolean) as Parameter[];
  const list = exs(b.exercices);
  return (
    <div className="detail-inner">
      <Top sur="Chaîne du son · bloc" titre={b.titre} onClose={onClose} />
      {b.faits.length > 0 && (
        <div className="block">
          <h3>Ce que dit le manuel</h3>
          <ul className="facts">{b.faits.map((f) => <li key={f.texte}>{f.texte} <SourceRef src={f.ref} compact /></li>)}</ul>
        </div>
      )}
      {b.interp && <div className="block"><p><Badge kind="interp" /> {b.interp}</p></div>}
      {b.controles.length > 0 && (
        <div className="block">
          <h3>Sur la machine</h3>
          <ul className="ctl-list">
            {b.controles.map((id) => {
              const c = controlById.get(id);
              if (!c) return null;
              return (
                <li key={id}>
                  <a className="ctl-link" href={`#carte/${id}`} title="Voir sur la Carte">{c.nom} ↗</a>
                  <span>{c.fonction}</span> <SourceRef src={c.source} compact />
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {params.length > 0 && (
        <div className="block">
          <h3>Paramètres</h3>
          {params.map((p) => <ParamRow key={p.id} p={p} />)}
        </div>
      )}
      {list.length > 0 && (
        <div className="block">
          <h3>Ce que le manuel ne dit pas</h3>
          {list.map((e) => <ExerciseCard key={e.id} ex={e} />)}
        </div>
      )}
      <div className="block">
        <h3>Mes notes sur ce bloc</h3>
        <ObservationBox id={`chain:bloc:${b.id}`} titre={`Chaîne du son · ${b.titre}`} />
      </div>
    </div>
  );
}

function FlecheDetail({ f, onClose, onBloc }: { f: Fleche; onClose: () => void; onBloc: (id: string) => void }) {
  const list = exs(f.exercices);
  return (
    <div className="detail-inner">
      <Top sur="Chaîne du son · liaison" titre={`${BLOCS[f.de].titre} → ${BLOCS[f.vers].titre}${f.label ? ` (${f.label})` : ""}`} onClose={onClose} />
      <div className="block">
        <p className="fn">{f.sorte === "manuel" ? <Badge kind="manuel" /> : <Badge kind="interp" />} {f.texte}</p>
        {f.ref && <SourceRef src={f.ref} />}
        <p className="small">
          <button type="button" className="link" onClick={() => onBloc(f.de)}>Voir {BLOCS[f.de].titre}</button> ·{" "}
          <button type="button" className="link" onClick={() => onBloc(f.vers)}>Voir {BLOCS[f.vers].titre}</button>
        </p>
      </div>
      {list.length > 0 && (
        <div className="block">
          <h3>Vérifier à l'écoute</h3>
          {list.map((e) => <ExerciseCard key={e.id} ex={e} defaultOpen={list.length === 1} />)}
        </div>
      )}
    </div>
  );
}
