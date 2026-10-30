// Grilles de séquenceur : plusieurs parties sur 4 mesures, éditées comme sur l'E2
// (bouton Step = mesure, pads = 16 pas, Part Mute = couper une partie).
import { BoutonLecture, ChoixMode } from "../components/Lecteur";
import { garderSiModifie } from "../lib/stockage";
import { load, knobsDe, pisteDe, origineDe, same, type GData as GDataT } from "../lib/pistes";
import { Etoile } from "../components/Etoile";
import { Infos, Rangement } from "../components/Rangement";
import { useEffect, useMemo, useState } from "react";
import { GRILLES, GRILLE_VIDE, STYLE_GRILLE, type Grille } from "../content/grilles";
import { RECETTES, type Recette } from "../content/recettes";
import { ALL_KEYS, GAMMES, gammeByN, keyByEn } from "../lib/music";
import { bornes, engine, useEngine, SONS_PERCU, type Pas, type Piste, type SeqState } from "../lib/seq";
import { Badge, DoneToggle, ObservationBox, SourceRef } from "../components/common";
import { AdaptBar, STEP_PAGES, nomPas, useAdapt, useKnobRange, usePlayerPrefs } from "../components/SeqPlayer";
import { CopierPanel, LIGNE_NOTES, LIGNE_SEQUENCER, LIGNE_WRITE, MonEnregistrement, lignesPrep, lignesSequence, lignesSon } from "../components/Machine";

const TOUTES = [...GRILLES, GRILLE_VIDE];
const rcById = new Map(RECETTES.map((r) => [r.id, r]));
export { load, knobsDe, pisteDe };

type GData = GDataT;

const COUL_STYLE: Record<string, string> = { tribe: "#ff6a3d", mentale: "#9b6bff", tekno: "#6aa2ee", vide: "#4fd18b" };

export default function Grilles({ focus }: { focus?: string }) {
  const [sel, setSel] = useState<string | null>(() => (focus && TOUTES.some((g) => g.id === focus) ? focus : GRILLES[0].id));
  const [style, setStyle] = useState<string>("tous");
  const g = TOUTES.find((x) => x.id === sel);
  const choose = (id: string | null) => { setSel(id); history.replaceState(history.state, "", id ? `#grilles/${id}` : "#grilles"); };
  const liste = [...GRILLES.filter((x) => style === "tous" || x.style === style), GRILLE_VIDE];
  return (
    <div className="grilles">
      <h2 className="page-title">Grilles de séquenceur</h2>
      <Infos>
        <p>
          Des motifs complets à 165-170 BPM <Badge kind="pratique" /> : chaque ligne est une partie de l'E2, chaque partie a le son d'une recette.
          Comme sur la machine, les boutons Step choisissent la mesure et les 16 cases sont les 16 pads. <SourceRef src={STEP_PAGES[0]} compact /> <SourceRef src={STEP_PAGES[1]} compact />
        </p>
      </Infos>
      <Rangement
        racine="Grilles"
        filtre={{ label: "Style", value: style, onChange: setStyle, options: [
          { id: "tous", nom: "Toutes", n: GRILLES.length },
          ...(["tribe", "mentale", "tekno"] as const).map((st) => ({ id: st, nom: STYLE_GRILLE[st], n: GRILLES.filter((x) => x.style === st).length })),
        ] }}
        labelCategorie="Grille"
        categories={liste.map((x) => ({
          id: x.id, nom: x.nom, icone: "grille", couleur: COUL_STYLE[x.id === GRILLE_VIDE.id ? "vide" : x.style],
          texte: x.id === GRILLE_VIDE.id ? "Composer" : STYLE_GRILLE[x.style], n: x.id === GRILLE_VIDE.id ? "+" : x.bpm,
        }))}
        cat={sel} onCat={choose}
      />
      {g ? <Editeur key={g.id} g={g} /> : <p className="rg-hint">Choisis une grille pour l'écouter et la modifier.</p>}
    </div>
  );
}

/** Lecteur multi-parties. Aussi utilisé par les kits de Recettes : `sansTitre` (la recette a déjà son titre), `noteId` (notes et « testée » de la recette). */
export function Editeur({ g, sansTitre, noteId }: { g: Grille; sansTitre?: boolean; noteId?: string }) {
  const id = `grille:${g.id}`;
  const origine = useMemo(() => origineDe(g), [g]);
  const [d, setD] = useState<GData>(() => load(g.id, g));
  useEffect(() => {
    garderSiModifie(`e2academy.grille.${g.id}`, d, origine);
  }, [d, origine, g.id]);
  const recettes = g.pistes.map((p) => rcById.get(p.recette)!);
  const [prefs, updPrefs] = usePlayerPrefs();
  const snap = useEngine();
  const playing = snap.owner === id;
  const [sel, setSel] = useState(0);
  const [suivre, setSuivre] = useState(true);
  const [choix, setChoix] = useState<{ t: number; i: number } | null>(null);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(1);
  const range = useKnobRange();
  const gam = gammeByN.get(d.scale)!;                  // SCALE du motif
  const ad = useAdapt(d, (p) => setD((x) => ({ ...x, ...p })), prefs, updPrefs);
  const gPlay = ad.gPlay;                               // gamme où sonnent les notes
  const playBar = playing && snap.step >= 0 ? Math.floor(snap.step / 16) : -1;
  const shown = playing && suivre && !prefs.une && playBar >= 0 ? playBar : sel;
  const percu = (rc: Recette) => SONS_PERCU.includes(rc.apercu.son);

  const pistes = (): Piste[] => recettes.map((rc, t) => pisteDe(rc, d.pistes[t].mesures, d.pistes[t].muet, range));
  const state = (): SeqState => {
    const ps = pistes();
    return {
      ...ps[0], keySemi: keyByEn(ad.bk.key).semi, gamme: gPlay, bpm: d.bpm, kickRepere: false,
      mode: prefs.mode, range: prefs.une ? (sel as 0 | 1 | 2 | 3) : "all", pistes: ps,
    };
  };
  useEffect(() => { if (playing) engine.set(id, state()); });
  useEffect(() => engine.register(id, () => engine.play(id, state())), [id, d, prefs, sel]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (engine.snap.owner === id) engine.stop(); }, [id]);
  const toggle = () => { engine.touch(id); if (playing) engine.stop(); else engine.play(id, state()); };

  const setPas = (t: number, bar: number, i: number, v: Pas) =>
    setD((x) => ({ ...x, pistes: x.pistes.map((p, k) => (k === t ? { ...p, mesures: p.mesures.map((m, b) => (b === bar ? m.map((y, j) => (j === i ? v : y)) : m)) } : p)) }));
  const clickCell = (t: number, i: number) => {
    engine.touch(id);
    const rc = recettes[t];
    const p = d.pistes[t].mesures[shown][i];
    if (rc.apercu.son === "riser") { setPas(t, shown, i, p === null ? 0 : p === "~" ? null : "~"); return; }
    if (percu(rc)) { setPas(t, shown, i, p === null ? 0 : null); if (p === null) engine.audition(state(), 0, pistes()[t]); return; }
    setChoix((c) => (c && c.t === t && c.i === i ? null : { t, i }));
  };
  const options: Pas[] = useMemo(() => {
    const n = gPlay.notesEnDo.length;
    return [null, ...Array.from({ length: Math.min(15, Math.max(2 * n - 1, 2)) + 1 }, (_, i) => i), "~"];
  }, [gPlay]);
  const [a, b] = bornes(prefs.une ? (sel as 0) : "all");

  // Copier vers ma machine : préparation, puis partie par partie.
  const sections = [
    { titre: "1. Préparer le motif", lignes: lignesPrep(d.bpm, d.key, gam) },
    ...recettes.map((rc, t) => ({
      titre: `${t + 2}. Partie ${t + 1} · ${rc.nom}`,
      lignes: [
        ...lignesSon(t + 1, rc.reglages, knobsDe(rc), (pid) => range(pid).lue),
        LIGNE_SEQUENCER,
        ...lignesSequence(d.pistes[t].mesures, percu(rc), gPlay, ad.bk.key, rc.apercu.octave),
        ...(percu(rc) ? [] : [LIGNE_NOTES]),
      ],
    })),
    { titre: `${recettes.length + 2}. Sauvegarder`, lignes: [LIGNE_WRITE] },
  ];

  return (
    <div className="gr-editor">
      {!sansTitre && <div className="block">
        <h3>{g.nom} {g.id !== GRILLE_VIDE.id && <Etoile type="grille" cle={g.id} titre={g.nom} />} <span className="muted small">· {STYLE_GRILLE[g.style]} · {g.bpm} BPM · KEY = {g.key} · {gammeByN.get(g.scale)!.nom}</span></h3>
        <p className="fn"><Badge kind="pratique" /> {g.idee}</p>
      </div>}

      <div className="seqp gr-seqp" onPointerDown={() => engine.touch(id)}>
        <p className="seqp-honest"><b>Approximation pédagogique, pas le son réel de l'Electribe.</b> Chaque partie est imitée par un son simple du navigateur.</p>
        <div className="seqp-transport">
          <BoutonLecture joue={playing} onClick={toggle} espace />
          <ChoixMode mode={prefs.mode} onChange={(mode) => updPrefs({ mode })} />
          <div className="seg" role="radiogroup" aria-label="Longueur lue">
            <button type="button" role="radio" aria-checked={!prefs.une} className={!prefs.une ? "on" : ""} onClick={() => updPrefs({ une: false })}>4 mesures</button>
            <button type="button" role="radio" aria-checked={prefs.une} className={prefs.une ? "on" : ""} onClick={() => updPrefs({ une: true })}>1 mesure (Step {sel + 1})</button>
          </div>
          <label className="seqp-bpm">BPM <input type="number" min={20} max={300} value={d.bpm} onChange={(e) => { const v = Number(e.target.value); if (v >= 20 && v <= 300) setD((x) => ({ ...x, bpm: v })); }} /></label>
        </div>
        <div className="seqp-key">
          <label>KEY <select value={d.key} onChange={(e) => ad.changeTon({ key: e.target.value })}>{ALL_KEYS.map((k) => <option key={k.en} value={k.en}>{k.en} ({k.fr})</option>)}</select></label>
          <label>SCALE <select value={d.scale} onChange={(e) => ad.changeTon({ scale: Number(e.target.value) })}>{GAMMES.map((x) => <option key={x.n} value={x.n}>{x.n} · {x.nom}</option>)}</select></label>
          <a href={`#gammes/${d.scale}`}>voir la gamme ↗</a>
          <span className="small muted">Une seule KEY et SCALE par motif. <SourceRef src={{ doc: "PG", page: 3 }} compact /></span>
        </div>
        <AdaptBar ad={ad} nomMotif={gam.nom} keyMotif={d.key} />

        <div className="seqp-steps" role="group" aria-label="Boutons Step 1 à 4">
          {[0, 1, 2, 3].map((bar) => (
            <button key={bar} type="button" className={`stepbtn ${shown === bar ? "sel" : ""} ${playBar === bar ? "playing" : ""} ${prefs.une && sel !== bar ? "dim" : ""}`}
              onClick={() => { setSel(bar); setSuivre(false); setChoix(null); }} aria-pressed={shown === bar}>
              <i className="led" aria-hidden /><span>Step {bar + 1}</span>
              <span className="mini" aria-hidden>{Array.from({ length: 16 }, (_, i) => {
                const on = d.pistes.some((p) => p.mesures[bar][i] !== null && p.mesures[bar][i] !== "~");
                return <b key={i} className={`${on ? "on" : ""} ${playing && snap.step === bar * 16 + i ? "now" : ""}`} />;
              })}</span>
            </button>
          ))}
        </div>
        <p className="small muted seqp-hint">
          Mesure {shown + 1} sur 4 = bouton <kbd>Step {shown + 1}</kbd> (pas {shown + 1}.01 à {shown + 1}.16). M = Part Mute : la partie se tait. <SourceRef src={{ doc: "OM", page: 32 }} compact />
          {" "}{playing && !prefs.une && <label className="seqp-chk"><input type="checkbox" checked={suivre} onChange={(e) => setSuivre(e.target.checked)} /> suivre la lecture</label>}
        </p>

        <div className="gr-matrix" role="grid" aria-label={`Mesure ${shown + 1}`}>
          <div className="gr-row gr-head" aria-hidden>
            <span className="gr-label" />
            {Array.from({ length: 16 }, (_, i) => <span key={i} className={`gr-num ${i % 4 === 0 ? "beat" : ""}`}>{i + 1}</span>)}
          </div>
          {recettes.map((rc, t) => (
            <div key={t} className={`gr-row ${d.pistes[t].muet ? "muted-row" : ""}`} role="row">
              <span className="gr-label">
                <button type="button" className={`gr-mute ${d.pistes[t].muet ? "on" : ""}`} aria-pressed={d.pistes[t].muet} title="Part Mute"
                  onClick={() => setD((x) => ({ ...x, pistes: x.pistes.map((p, k) => (k === t ? { ...p, muet: !p.muet } : p)) }))}>M</button>
                <span className="gr-pn">{t + 1}</span>
                <a href={`#recettes/${rc.id}`} title="Voir la recette">{rc.nom}</a>
              </span>
              {d.pistes[t].mesures[shown].map((p, i) => {
                const pos = shown * 16 + i;
                const nm = percu(rc) ? null : nomPas(gPlay, ad.bk.key, p, rc.apercu.octave);
                const et = percu(rc) ? null : ad.etat(p, rc.apercu.octave);
                return (
                  <button key={i} type="button" role="gridcell"
                    className={`gr-cell ${p === null ? "" : p === "~" ? "tie" : "on"} ${i % 4 === 0 ? "beat" : ""} ${playing && snap.step === pos ? "now" : ""} ${pos < a || pos > b ? "out" : ""} ${choix?.t === t && choix.i === i ? "editing" : ""} ${et?.chg ? "chg" : ""} ${et?.hors ? "hors" : ""}`}
                    onClick={() => clickCell(t, i)} title={`Partie ${t + 1}, pas ${shown + 1}.${String(i + 1).padStart(2, "0")}${nm && p !== "~" ? ` : ${nm.en} (${nm.fr})` : ""}${et?.avant ? `, avant ${et.avant.en}` : ""}`}>
                    {p !== null && (nm && p !== "~" ? <><b>{nm.en}</b><small className="gr-fr">{nm.fr}</small></> : p === "~" ? "~" : "●")}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {choix && (
          <div className="seqp-choix">
            <span className="small">Partie {choix.t + 1}, pas {shown + 1}.{String(choix.i + 1).padStart(2, "0")} : seulement les notes de {gPlay.nom}{ad.decale ? ` (la gamme où sont écrites les notes ; allume « Adapter » pour passer en ${gam.nom})` : ""}</span>
            <div className="seqp-notes">
              {options.map((o, j) => {
                const nm = nomPas(gPlay, ad.bk.key, o, recettes[choix.t].apercu.octave);
                return (
                  <button key={j} type="button" className={d.pistes[choix.t].mesures[shown][choix.i] === o ? "on" : ""}
                    onClick={() => { setPas(choix.t, shown, choix.i, o); if (o !== null && o !== "~") engine.audition(state(), o, pistes()[choix.t]); }}>
                    {o === null ? <b>—</b> : <b>{nm!.en}</b>}<small>{o === null ? "silence" : nm!.fr}</small>
                  </button>
                );
              })}
              <button type="button" className="close-choix" onClick={() => setChoix(null)}>OK</button>
            </div>
          </div>
        )}

        <div className="seqp-copy">
          <span>Copier toutes les parties de</span>
          <select value={from} onChange={(e) => setFrom(Number(e.target.value))} aria-label="Mesure à copier">{[0, 1, 2, 3].map((x) => <option key={x} value={x}>Step {x + 1}</option>)}</select>
          <span>vers</span>
          <select value={to} onChange={(e) => setTo(Number(e.target.value))} aria-label="Mesure qui reçoit">{[0, 1, 2, 3].map((x) => <option key={x} value={x}>Step {x + 1}</option>)}</select>
          <button type="button" className="e2-ui-btn" disabled={from === to}
            onClick={() => { setD((x) => ({ ...x, pistes: x.pistes.map((p) => ({ ...p, mesures: p.mesures.map((m, k) => (k === to ? [...p.mesures[from]] : m)) })) })); setSel(to); setSuivre(false); }}>Copier</button>
        </div>
        <div className="seqp-foot">
          <button type="button" className="e2-ui-btn" disabled={same(d, origine)} onClick={() => { setD(origineDe(g)); setChoix(null); ad.oublier(); }}>↺ Remettre la grille d'origine</button>
          {!same(d, origine) && <span className="small muted">Tes changements sont gardés sur cet ordinateur.</span>}
        </div>
      </div>

      <div className="gr-cols">
        <div className="block">
          <h3>{noteId ? "Comment lire ce kit" : "Comment lire cette grille"}</h3>
          <ul className="facts">{g.lecture.map((l) => <li key={l}><Badge kind="pratique" /> {l}</li>)}</ul>
          {g.astuces && <ul className="facts">{g.astuces.map((x) => <li key={x.texte}>{x.texte} {x.ref && <SourceRef src={x.ref} compact />}</li>)}</ul>}
          <p className="small">Le son de chaque partie vient de sa recette : clique sur son nom pour voir ses réglages et l'écouter seule.</p>
        </div>
        <div>
          <CopierPanel titre={g.nom} note="Avec tes changements actuels (pads, notes, BPM, KEY, SCALE). Une partie par recette, dans l'ordre des lignes." sections={sections} />
          <MonEnregistrement id={id} titre={g.nom} bpm={d.bpm} href="#morceau/grille" />
        </div>
      </div>

      <div className="block">
        <h3>Ma version</h3>
        <ObservationBox id={noteId ?? id} titre={`${noteId ? "Recette" : "Grille"} · ${g.nom}`} placeholder="Ce que j'ai changé, ce qui marche sur la machine…" />
        <DoneToggle id={noteId ?? id} />
      </div>
    </div>
  );
}
