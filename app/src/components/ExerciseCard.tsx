import { useState } from "react";
import { SETUP, type Exercise } from "../content/exercises";
import { useStore } from "../lib/store";
import { EnregistrerVersion } from "./Enregistreur";
import { MiniSpectre } from "./Visus";
import { Badge, DoneToggle, ObservationBox, RangeBox, SourceRef, StartValueChip } from "./common";

function Steps({ ex }: { ex: Exercise }) {
  return (
    <ol className="steps">
      {ex.etapes.map((s, i) => (
        <li key={i}>
          <span>{s.texte}</span> {s.ref && <SourceRef src={s.ref} compact />}
          {s.valeurs && <span className="startvals">{s.valeurs.map((v) => <StartValueChip key={v.param} {...v} />)}</span>}
        </li>
      ))}
    </ol>
  );
}

export function ExerciseCard({ ex, defaultOpen }: { ex: Exercise; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const [setupOpen, setSetupOpen] = useState(false);
  const { observations, faits } = useStore();
  const notes = ex.cibles.filter((c) => observations[c.id]).length;

  return (
    <section className={`exercise ${faits[ex.id] ? "is-done" : ""}`}>
      <button type="button" className="exercise-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ear" aria-hidden>🎧</span>
        <span className="exercise-title">
          <span>Exercice d'écoute · {ex.titre}</span>
          <span className="muted small">
            {faits[ex.id] ? "fait · " : ""}{notes}/{ex.cibles.length} note{ex.cibles.length > 1 ? "s" : ""}
          </span>
        </span>
        <span className="chev" aria-hidden>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="exercise-body">
          <p className="why"><Badge kind="pratique" /> {ex.pourquoi}</p>
          {ex.prepa && (
            <div className="setup">
              <button type="button" className="link" onClick={() => setSetupOpen(!setupOpen)}>
                {setupOpen ? "▾" : "▸"} D'abord : {SETUP.titre.toLowerCase()}
              </button>
              {setupOpen && <Steps ex={SETUP} />}
            </div>
          )}
          <Steps ex={ex} />
          <div className="listen">
            <strong>À écouter</strong>
            <ul>{ex.questions.map((q) => <li key={q}>{q}</li>)}</ul>
          </div>
          {ex.plages && ex.plages.length > 0 && (
            <div className="obs-list">{ex.plages.map((id) => <RangeBox key={id} paramId={id} />)}</div>
          )}
          <div className="obs-list">
            {ex.cibles.map((c) => <ObservationBox key={c.id} id={c.id} titre={c.label} placeholder={c.aide} />)}
          </div>
          <MiniSpectre />
          <EnregistrerVersion source={{ module: "exercice", ref: ex.id, titre: ex.titre }} texte="Enregistre ce que tu entends sur l'E2 pour le réécouter plus tard." />
          <DoneToggle id={ex.id} />
        </div>
      )}
    </section>
  );
}
