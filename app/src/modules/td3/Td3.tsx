// Le guide de la Behringer TD-3 : la machine (panneau, chaîne du son, prises), le séquenceur (gestes du guide),
// le parcours et les recettes acid. Les gestes et les rôles viennent du guide de démarrage TD-3 (data/td3/manuel.json).
import { useEffect, useState, type CSSProperties } from "react";
import { Badge, DoneToggle, ObservationBox } from "../../components/ui/common";
import { Deroulant, ToutOuvrirFermer } from "../../components/ui/Deroulant";
import { useStore } from "../../lib/donnees/store";
import { MANUEL_TD3 as manuel, PROCS, ctrl, proc, SourceTd3, avecTouches, type ProcTd3 as Proc } from "./td3Commun";
import { NIVEAUX_TD3, type LeconTd3 } from "../../content/td3/parcours";
import { RECETTES_TD3, geste, lirePattern, recetteTd3ById, type PasTd3, type RecetteTd3 } from "../../content/td3/recettes";
import { arreterTd3, jouerTd3 } from "../../lib/audio/td3Apercu";
import { noterRecent } from "../../lib/recents";
import "./td3.css";

function Approx() {
  return <p className="muted small td3-approx">Approximation pédagogique, pas le son réel de la TD-3.</p>;
}

// ---------------------------------------------------------------- Séquenceur
function Procedure({ p }: { p: Proc }) {
  return (
    <div className="td3-proc">
      <p className="muted">{p.but}</p>
      <ol className="td3-etapes">{p.etapes.map((e, i) => <li key={i}>{avecTouches(e)}</li>)}</ol>
      {p.attention?.map((a, i) => <p key={i} className="td3-attention">⚠ {avecTouches(a)}</p>)}
      <p><SourceTd3 section={p.section} /></p>
    </div>
  );
}

export function Td3Sequenceur() {
  const s = manuel.sequenceur;
  const ids = PROCS.map((p) => `td3.proc.${p.id}`);
  return (
    <div className="td3">
      <h2 className="page-title">TD-3 · Le séquenceur</h2>
      <div className="td3-memo">
        <div><b>{s.groupes}</b><span>groupes (I à IV)</span></div>
        <div><b>16</b><span>patterns par groupe : {s.patternsParGroupe}</span></div>
        <div><b>{s.pasMax}</b><span>pas au plus par pattern. {s.pasDefaut}</span></div>
        <div><b>{s.tracks}</b><span>tracks (suites de patterns)</span></div>
      </div>
      <p className="muted small">Dans l'app, une recette = 4 patterns de 16 pas (1A à 4A) = 4 mesures, enchaînés. <SourceTd3 section={s.section} /></p>

      <div className="td3-methode">
        <h3>La méthode TD-3 en une phrase</h3>
        <div className="td3-deux"><div><span className="td3-etape-n">1</span><b>Les notes</b>{avecTouches(" en PITCH MODE, dans l'ordre : C, D#, UP + C…")}</div><div><span className="td3-etape-n">2</span><b>Le rythme</b>{avecTouches(" en TIME MODE, pas par pas : NOTE, TIE ou REST.")}</div></div><p className="muted small">Chaque NOTE du rythme prend la note suivante de la liste.</p>
      </div>

      <ToutOuvrirFermer ids={ids} />
      {PROCS.map((p, k) => (
        <Deroulant key={p.id} id={ids[k]} petit couleur={p.id === "sync" || p.id === "accorder" ? "#3fd6d0" : p.id.startsWith("track") ? "#4fd18b" : "#ff6a3d"}
          icone={p.id === "sync" ? "midi" : p.id.startsWith("track") ? "morceau" : "grille"} titre={p.titre} texte={p.but}>
          <Procedure p={p} />
          {(p.id === "time" || p.id === "sync") && <ObservationBox id={`td3:proc:${p.id}`} titre={`TD-3 · ${p.titre}`} />}
        </Deroulant>
      ))}

      <h3 className="td3-h3">Ce que le guide ne dit pas</h3>
      <ul className="td3-absent">{manuel.absent.map((a) => <li key={a}>{a} <i>À vérifier sur la machine.</i></li>)}</ul>
      <ObservationBox id="td3:absent" titre="TD-3 · Ce que j'ai vérifié sur la machine" placeholder="Touche REST = …, tempo le plus lent / le plus rapide…" />
    </div>
  );
}

// ---------------------------------------------------------------- Parcours
const COUL = ["#e8484e", "#ff6a3d", "#ffb020", "#4fd18b", "#3fd6d0"];
const lid = (l: LeconTd3) => `td3:lesson:${l.id}`;

export function Td3Parcours() {
  const { faits } = useStore();
  const [n, setN] = useState(() => { try { return Number(localStorage.getItem("e2academy.td3.niveau")) || 1; } catch { return 1; } });
  const choisir = (k: number) => { setN(k); try { localStorage.setItem("e2academy.td3.niveau", String(k)); } catch { /* */ } noterRecent("#td3-parcours", `TD-3 · Niveau ${k}`, "Leçon"); };
  const nv = NIVEAUX_TD3[n - 1] ?? NIVEAUX_TD3[0];
  const total = NIVEAUX_TD3.reduce((a, x) => a + x.lecons.length, 0);
  const fait = NIVEAUX_TD3.reduce((a, x) => a + x.lecons.filter((l) => faits[lid(l)]).length, 0);
  return (
    <div className="td3 parcours">
      <h2 className="page-title">TD-3 · Parcours</h2>
      <p className="rg-hint pc-total">{fait} leçon{fait > 1 ? "s" : ""} faite{fait > 1 ? "s" : ""} sur {total}</p>
      <p className="muted small">Gestes du guide TD-3 <Badge kind="manuel" /> ; missions, « Réussi quand… » et mini-projets : propositions pour ton style <Badge kind="pratique" />.</p>
      <div className="td3-niveaux" role="tablist">
        {NIVEAUX_TD3.map((x) => {
          const f = x.lecons.filter((l) => faits[lid(l)]).length;
          return (
            <button key={x.n} type="button" role="tab" aria-selected={x.n === nv.n} className={x.n === nv.n ? "on" : ""} style={{ "--cc": COUL[x.n - 1] } as CSSProperties} onClick={() => choisir(x.n)}>
              <span className="td3-niv-n">{x.n}</span><span>{x.titre}</span><small>{f}/{x.lecons.length}</small>
            </button>
          );
        })}
      </div>
      <section className="level-body">
        <h3 className="level-title">Niveau {nv.n} · {nv.titre}</h3>
        <p className="muted">{nv.resume}</p>
        {nv.lecons.map((l, i) => <LeconTd3Carte key={l.id} l={l} num={i + 1} ouverte={!faits[lid(l)] && nv.lecons.findIndex((x) => !faits[lid(x)]) === i} />)}
        <div className="td3-projet"><b>Mini-projet</b> <Badge kind="pratique" /><p>{nv.projet}</p><DoneToggle id={`td3:lesson:projet.${nv.n}`} /></div>
        {nv.n < NIVEAUX_TD3.length && <button type="button" className="e2-ui-btn next" onClick={() => { choisir(nv.n + 1); window.scrollTo({ top: 0 }); }}>Niveau {nv.n + 1} →</button>}
      </section>
    </div>
  );
}

function LeconTd3Carte({ l, num, ouverte }: { l: LeconTd3; num: number; ouverte: boolean }) {
  const { faits } = useStore();
  const [open, setOpen] = useState(ouverte);
  const done = Boolean(faits[lid(l)]);
  return (
    <article className={`lesson ${done ? "is-done" : ""}`}>
      <button type="button" className="lesson-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={`lesson-num ${done ? "done" : ""}`}>{done ? "✓" : num}</span>
        <span className="lesson-title"><span>{l.titre}</span><span className="muted small">{l.objectif}</span></span>
        <span className="chev" aria-hidden>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="lesson-body td3-lecon">
          {l.procedures?.map((id) => { const p = proc.get(id)!; return <div key={id}><h4>{p.titre}</h4><Procedure p={p} /></div>; })}
          {l.controles && l.controles.length > 0 && (
            <p className="td3-chips">Contrôles : {l.controles.map((id) => <a key={id} className="td3-chip" href={`#td3-machine/${id}`}>{ctrl.get(id)!.nom.replace(" ON/OFF", "")}</a>)}</p>
          )}
          <div className="td3-mission"><b>Mission</b> <Badge kind="pratique" /><p>{avecTouches(l.mission)}</p></div>
          <p className="td3-reussite"><b>Réussi quand…</b> {avecTouches(l.reussite)}</p>
          {l.lien && <p><a className="px-btn" href={l.lien.href}>{l.lien.label} →</a></p>}
          <ObservationBox id={`td3:obs:${l.id}`} titre={`TD-3 · ${l.titre}`} />
          <DoneToggle id={lid(l)} />
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------- Recettes
const NOMS_REG: [keyof RecetteTd3["reglages"], string][] = [["cutoff", "CUTOFF"], ["resonance", "RESONANCE"], ["envelope", "ENVELOPE"], ["decay", "DECAY"], ["accent", "ACCENT"]];

export function Td3Recettes({ focus }: { focus?: string }) {
  const r = focus ? recetteTd3ById.get(focus) : undefined;
  useEffect(() => () => arreterTd3(), []);
  if (r) return <RecetteTd3Detail r={r} />;
  return (
    <div className="td3">
      <h2 className="page-title">TD-3 · Recettes acid</h2>
      <p className="muted td3-intro">Chaque recette = 4 patterns de 16 pas (4 mesures), à écrire dans 1A à 4A puis à enchaîner. <Badge kind="pratique" /></p>
      <div className="td3-cartes">
        {RECETTES_TD3.map((x) => (
          <a key={x.id} className="td3-carte" href={`#td3-recettes/${x.id}`}>
            <span className="td3-carte-style">{x.style} · {x.bpm} BPM</span>
            <b>{x.nom}</b>
            <span className="muted small">{x.idee}</span>
            <MiniPattern pas={lirePattern(x.patterns[0])} />
          </a>
        ))}
      </div>
      <Approx />
    </div>
  );
}

function MiniPattern({ pas }: { pas: PasTd3[] }) {
  return <span className="td3-mini" aria-hidden>{pas.map((p, i) => <span key={i} className={`m-${p.t} ${p.acc ? "m-acc" : ""}`} style={{ height: p.t === "note" ? 6 + (["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C'"].indexOf(p.touche!) + 12 * ((p.oct ?? 0) + 1)) * 0.5 : 4 }} />)}</span>;
}

function RecetteTd3Detail({ r }: { r: RecetteTd3 }) {
  const { faits } = useStore();
  const patterns = r.patterns.map(lirePattern);
  const tous = patterns.flat();
  const [lecture, setLecture] = useState<null | { quoi: number | "tout"; pas: number }>(null);
  useEffect(() => { noterRecent(`#td3-recettes/${r.id}`, `TD-3 · ${r.nom}`, "Recette"); }, [r.id, r.nom]);

  const jouer = (quoi: number | "tout") => {
    if (lecture?.quoi === quoi) { arreterTd3(); return; }
    const pas = quoi === "tout" ? tous : patterns[quoi];
    setLecture({ quoi, pas: -1 });
    jouerTd3({ pas, bpm: r.bpm, reglages: r.reglages, boucle: true, surPas: (i) => setLecture({ quoi, pas: i }), surFin: () => setLecture(null) });
  };
  const allume = (k: number, i: number) => lecture && (lecture.quoi === "tout" ? lecture.pas === k * 16 + i : lecture.quoi === k && lecture.pas === i);
  const g = r.reglages;

  return (
    <div className="td3 td3-recette">
      <p><a href="#td3-recettes" className="td3-retour">← Toutes les recettes TD-3</a></p>
      <h2 className="page-title">{r.nom}</h2>
      <p className="td3-carte-style">{r.style} · aperçu à {r.bpm} BPM <Badge kind="pratique" /></p>
      <p>{r.idee}</p>

      <h3 className="td3-h3">Les potards</h3>
      <div className="td3-regs">
        <div className="td3-reg"><span>WAVEFORM</span><b>{g.waveform === "saw" ? "Dent de scie" : "Pulse"}</b></div>
        {NOMS_REG.map(([k, nom]) => <div key={k} className="td3-reg"><span>{nom}</span><b>{g[k] as number}</b><Jauge v={g[k] as number} /></div>)}
        <div className="td3-reg"><span>DISTORTION</span><b>{g.distortion ? "ON" : "OFF"}</b></div>
        {g.distortion && (["drive", "tone", "level"] as const).map((k) => <div key={k} className="td3-reg"><span>{k.toUpperCase()}</span><b>{g[k]}</b><Jauge v={g[k] ?? 0} /></div>)}
      </div>
      <p className="muted small">De 0 (tout à gauche) à 10 (tout à droite), à l'oreille : la TD-3 n'a pas d'écran. TEMPO à l'oreille, ou synchro sur l'E2.</p>

      <div className="td3-lecteur">
        <button type="button" className={`px-btn ${lecture?.quoi === "tout" ? "on" : ""}`} onClick={() => jouer("tout")}>{lecture?.quoi === "tout" ? "■ Stop" : "▶ Écouter les 4 mesures"}</button>
        <Approx />
      </div>

      <h3 className="td3-h3">Les 4 patterns</h3>
      <p className="muted small">Lettre = touche du clavier · <b>▲</b> UP · <b>▼</b> DOWN · <b className="td3-acc-l">A</b> accent · <b className="td3-sl-l">S</b> slide · — tie · vide = rest</p>
      {patterns.map((pas, k) => (
        <div key={k} className="td3-pattern">
          <div className="td3-pattern-tete">
            <b>Pattern {k + 1}A</b>
            <button type="button" className="td3-mini-btn" onClick={() => jouer(k)}>{lecture?.quoi === k ? "■" : "▶"}</button>
          </div>
          <div className="td3-pas">
            {pas.map((p, i) => (
              <span key={i} className={`td3-case c-${p.t} ${p.acc ? "c-acc" : ""} ${allume(k, i) ? "c-joue" : ""}`}>
                <small>{i + 1}</small>
                {p.t === "note" ? <>
                  <b>{p.touche}</b>
                  <span className="td3-flags">{p.oct === 1 ? "▲" : p.oct === -1 ? "▼" : ""}{p.acc && <i className="td3-acc-l">A</i>}{p.slide && <i className="td3-sl-l">S</i>}</span>
                </> : p.t === "tie" ? <b>—</b> : null}
              </span>
            ))}
          </div>
          <details className="td3-sur-machine">
            <summary>Sur la TD-3 : PITCH MODE puis TIME MODE</summary>
            <p><b>PITCH MODE</b> (dans l'ordre) : {pas.filter((p) => p.t === "note").map((p, i) => <span key={i} className="td3-geste">{geste(p)}{p.acc ? " · ACCENT" : ""}{p.slide ? " · SLIDE" : ""}</span>)}</p>
            <p><b>TIME MODE</b> (16 pas) : {pas.map((p, i) => <span key={i} className={`td3-geste g-${p.t}`}>{p.t === "note" ? "NOTE" : p.t === "tie" ? "TIE" : "REST"}</span>)}</p>
            <p className="muted small">Accent et slide : après les notes, en suivant « Ajouter accent et slide » (page Séquenceur).</p>
          </details>
        </div>
      ))}

      <div className="td3-methode">
        <h3>Pour l'enchaîner</h3>
        <p>{avecTouches("Écris les patterns dans 1A, 2A, 3A et 4A (groupe I), puis en PATTERN PLAY : maintiens PATTERN 1 et appuie sur PATTERN 4.")} <SourceTd3 section="Playing patterns" /></p>
        <p><b>En jouant :</b> {avecTouches(r.astuce)}</p>
        <p><a href="#td3-sequenceur">Revoir les gestes du séquenceur →</a></p>
      </div>

      <ObservationBox id={`td3:recette:${r.id}`} titre={`TD-3 · ${r.nom}`} placeholder="Mes vraies positions de potards, ce que j'ai changé…" />
      <div className="td3-fait">
        <DoneToggle id={`td3:recette:${r.id}`} />
        {faits[`td3:recette:${r.id}`] && <span className="muted small">Recette testée sur ta TD-3.</span>}
      </div>
    </div>
  );
}

function Jauge({ v }: { v: number }) {
  return <span className="td3-jauge" aria-hidden><span style={{ width: `${v * 10}%` }} /></span>;
}

