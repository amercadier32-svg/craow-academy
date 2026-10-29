import { lireTexte, ecrireTexte } from "../lib/stockage";
import { useState } from "react";
import { NIVEAUX, type Lecon, type Niveau } from "../content/parcours";
import { exerciseById, type Exercise } from "../content/exercises";
import { controlById, procedureById } from "../lib/data";
import { useStore } from "../lib/store";
import { Badge, DoneToggle, ObservationBox, SourceRef } from "../components/common";
import { ExerciseCard } from "../components/ExerciseCard";
import { Infos, Rangement } from "../components/Rangement";

const KEY = "e2academy.parcours.niveau";
const lid = (l: Lecon) => `lesson:${l.id}`;

function readNiveau() {
  const n = Number(lireTexte(KEY)); return n >= 1 && n <= NIVEAUX.length ? n : 1;
}

export default function Parcours() {
  const { faits } = useStore();
  const [n, setN] = useState(readNiveau);
  const choose = (k: number) => { setN(k); ecrireTexte(KEY, String(k)); };
  const niveau = n ? NIVEAUX[n - 1] : undefined;
  const total = NIVEAUX.reduce((a, nv) => a + nv.lecons.length, 0);
  const faitsTotal = NIVEAUX.reduce((a, nv) => a + nv.lecons.filter((l) => faits[lid(l)]).length, 0);

  const couleur = (k: number) => ["#e8484e", "#ff6a3d", "#ffb020", "#ffd84d", "#4fd18b", "#3fd6d0", "#6aa2ee", "#9b6bff", "#e255c8", "#ff86d9", "#c9ccd3"][(k - 1) % 11];

  return (
    <div className="parcours">
      <h2 className="page-title">Parcours d'apprentissage</h2>
      <p className="rg-hint pc-total">{faitsTotal} leçon{faitsTotal > 1 ? "s" : ""} faite{faitsTotal > 1 ? "s" : ""} sur {total}</p>
      <Infos>
        <p>Les gestes viennent du manuel <Badge kind="manuel" />, les exercices pratiques, les critères « Réussi quand… » et les mini-projets sont des propositions pour ton style <Badge kind="pratique" />.</p>
        <p>Fil rouge : ton motif de travail à 165 BPM, KEY = D, SCALE = Aeolian.</p>
      </Infos>

      <Rangement
        racine="Parcours"
        labelCategorie="Niveau"
        categories={NIVEAUX.map((nv) => {
          const done = nv.lecons.filter((l) => faits[lid(l)]).length;
          return { id: String(nv.n), nom: `${nv.n}. ${nv.titre}`, icone: "parcours", couleur: couleur(nv.n), n: `${done}/${nv.lecons.length}` };
        })}
        cat={niveau ? String(niveau.n) : null}
        onCat={(c) => (c ? choose(Number(c)) : setN(0))}
      />

      {!niveau ? <p className="rg-hint">Choisis un niveau pour voir ses leçons.</p> : (
      <section className="level-body" role="tabpanel">
        <h3 className="level-title">Niveau {niveau.n} · {niveau.titre}</h3>
        <p className="muted">{niveau.resume}</p>
        {niveau.lecons.map((l, i) => <LeconCard key={l.id} l={l} num={i + 1} defaultOpen={!faits[lid(l)] && niveau.lecons.findIndex((x) => !faits[lid(x)]) === i} />)}
        <ProjetCard niveau={niveau} />
        {n < NIVEAUX.length && (
          <button type="button" className="e2-ui-btn next" onClick={() => { choose(n + 1); window.scrollTo({ top: 0 }); }}>Niveau {n + 1} →</button>
        )}
      </section>
      )}
    </div>
  );
}

function LeconCard({ l, num, defaultOpen }: { l: Lecon; num: number; defaultOpen: boolean }) {
  const { faits } = useStore();
  const [open, setOpen] = useState(defaultOpen);
  const done = Boolean(faits[lid(l)]);
  const exs = (l.exercices ?? []).map((id) => exerciseById.get(id)).filter(Boolean) as Exercise[];
  const exDone = exs.filter((e) => faits[e.id]).length;

  return (
    <article className={`lesson ${done ? "is-done" : ""}`}>
      <button type="button" className="lesson-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={`lesson-num ${done ? "done" : ""}`}>{done ? "✓" : num}</span>
        <span className="lesson-title">
          <span>{l.titre}</span>
          <span className="muted small">{l.objectif}{exs.length ? ` · ${exDone}/${exs.length} exercice${exs.length > 1 ? "s" : ""}` : ""}</span>
        </span>
        <span className="chev" aria-hidden>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="lesson-body">
          {l.faits && (
            <ul className="facts">{l.faits.map((f) => <li key={f.texte}>{f.texte} <SourceRef src={f.ref} compact /></li>)}</ul>
          )}
          {(l.procedures ?? []).map((pid) => {
            const p = procedureById.get(pid);
            if (!p) return null;
            return (
              <div key={pid} className="proc">
                <h4>{p.titre} {p.sources.map((s) => <SourceRef key={`${s.doc}${s.page}`} src={s} compact />)}</h4>
                <ol className="steps">{p.etapes.map((e) => <li key={e}>{e}</li>)}</ol>
                {p.astuces?.map((a) => <p key={a} className="small tip">💡 {a}</p>)}
                {p.attention?.map((a) => <p key={a} className="small note">⚠ {a}</p>)}
              </div>
            );
          })}
          {l.mission && (
            <div className="mission">
              <Badge kind="pratique">Exercice pratique</Badge> {l.mission.texte} {l.mission.refs.map((r) => <SourceRef key={`${r.doc}${r.page}`} src={r} compact />)}
            </div>
          )}
          {l.reussite && (
            <p className="reussite"><strong>Réussi quand…</strong> {l.reussite}</p>
          )}
          {(l.controles?.length || l.lien) && (
            <p className="onmap">
              {l.lien && <a className="e2-ui-btn" href={l.lien.href}>{l.lien.label}</a>}
              {l.controles?.map((id) => controlById.get(id) && (
                <a key={id} className="maplink" href={`#carte/${id}`}>{controlById.get(id)!.nom} ↗</a>
              ))}
            </p>
          )}
          {exs.length > 0 && (
            <div className="lesson-ex">
              <h4>Exercices d'écoute</h4>
              {exs.map((e) => <ExerciseCard key={e.id} ex={e} />)}
            </div>
          )}
          <ObservationBox id={lid(l)} titre={`Parcours · ${l.titre}`} placeholder="Ce que j'ai retenu, ce qui coince…" />
          <DoneToggle id={lid(l)} />
        </div>
      )}
    </article>
  );
}

function ProjetCard({ niveau }: { niveau: Niveau }) {
  const { faits } = useStore();
  const id = `lesson:projet.m${niveau.n}`;
  const done = Boolean(faits[id]);
  return (
    <article className={`lesson projet ${done ? "is-done" : ""}`}>
      <div className="lesson-body">
        <h4 className="projet-title"><Badge kind="pratique">Mini-projet</Badge> Fin du module {niveau.n}</h4>
        <p>{niveau.projet}</p>
        <ObservationBox id={id} titre={`Parcours · Mini-projet du module ${niveau.n}`} placeholder="Ce que j'ai fait, ce que je garde…" />
        <DoneToggle id={id} />
      </div>
    </article>
  );
}
