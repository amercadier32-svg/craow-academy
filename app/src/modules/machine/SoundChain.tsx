import { useEffect, useRef, useState } from "react";
import { BLOCS, FLECHES, MOD_CIBLES, RANGEES, type Bloc, type Fleche } from "../../content/chain";
import { exerciseById, type Exercise } from "../../content/exercises";
import { controlById, paramById, type Parameter } from "../../lib/donnees/data";
import { Badge, ObservationBox, SourceRef } from "../../components/ui/common";
import { ExerciseCard } from "../../components/machine/ExerciseCard";
import { ParamRow } from "../../components/machine/ParamRow";

type Sel = { kind: "bloc"; id: string } | { kind: "fleche"; id: string } | null;

const ICONE: Record<string, string> = {
  osc: "〰️", filter: "🎚️", amp: "🔊", ifx: "✨", send: "📤", mod: "🔁", mfx: "🌌", mix: "🎛️", patlevel: "📶",
  volume: "🔈", out: "🎧", audioin: "🔌", inputlevel: "📥", thru: "↔️",
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
        onClick={() => setSel({ kind: "bloc", id })} aria-pressed={on} title={b.role}>
        <span className="cb-ico" aria-hidden>{ICONE[id] ?? "•"}</span>
        <span className="cb-title">{b.titre}</span>
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
        <div className="chain-legend small">
          <span title="Le manuel le dit"><svg viewBox="0 0 40 16" className="lg lg-manuel" aria-hidden><line x1="2" y1="8" x2="31" y2="8" /><path d="M30 3 L38 8 L30 13 Z" /></svg> 📖</span>
          <span title="Ordre supposé, à vérifier à l'écoute"><svg viewBox="0 0 40 16" className="lg lg-interp" aria-hidden><line x1="2" y1="8" x2="31" y2="8" /><path d="M30 3 L38 8 L30 13 Z" /></svg> ❓</span>
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
                    <span className="muted small" title="La modulation agit sur">⤴</span>
                    {MOD_CIBLES.map((c) => (
                      <button key={c.label} type="button" className={`chip-t ${lies.has(c.bloc) && sel?.kind === "bloc" && sel.id === "mod" ? "on" : ""}`}
                        onClick={() => setSel({ kind: "bloc", id: c.bloc })}>
                        ⤴ {c.label}
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
  return <div className="empty"><p className="muted">👆 Touche un bloc ou une flèche.</p></div>;
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
