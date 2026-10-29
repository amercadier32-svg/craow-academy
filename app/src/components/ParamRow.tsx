import { parameterGroups, type Parameter } from "../lib/data";
import { plageComplete, useStore } from "../lib/store";
import { Badge, PlageLue, SourceRef } from "./common";

/** Fiche d'un paramètre : plage du manuel ou plage relevée, Shift, notes. */
export function ParamRow({ p }: { p: Parameter }) {
  const { observations, plages } = useStore();
  const obs = observations[`param:${p.id}`];
  const complete = plageComplete(plages[p.id]);
  const missing = !p.plage && !p.valeurs;
  return (
    <div className="param">
      <div className="param-head">
        <strong>{p.nom}</strong>
        <span className="muted small">{parameterGroups[p.groupe] ?? p.groupe}</span>
        {p.enregistrableMotionSeq && <span className="chip" title="Enregistrable en Motion Sequence (Mode d'emploi p. 31)">Motion Seq</span>}
      </div>
      <p>{p.effet}</p>
      <div className="param-range">
        {p.plage && <span className="range">{p.plage}</span>}
        {p.valeurs && (
          <span className="values">{p.valeurs.map((v) => <span key={v} className="val">{v}</span>)}</span>
        )}
        {missing && !complete && <span className="missing">Plage non indiquée dans le manuel → exercice d'écoute</span>}
        <PlageLue paramId={p.id} />
        <SourceRef src={p.source} compact />
      </div>
      {p.plage && p.plageNote && <p className="muted small">{p.plageNote}</p>}
      {p.shift && (
        <p className="small"><kbd>{p.shift.combo}</kbd> {p.shift.effet} <SourceRef src={p.shift.source} compact /></p>
      )}
      {p.notes?.map((n) => <p key={n} className="note small">{n}</p>)}
      {obs && (
        <div className="obs-view"><Badge kind="obs" /> {obs.texte}</div>
      )}
    </div>
  );
}
