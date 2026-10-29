// Lecteur-séquenceur sur 4 mesures, utilisé par les Recettes, Gammes et tonalités (et plus tard le Labo sonore et les Grilles).
// Les 4 blocs s'appellent Step 1 à Step 4, comme les 4 boutons Step de l'E2 (un bloc = 16 pas = 1 mesure).
import { BoutonLecture, ChoixMode } from "./Lecteur";
import { lireJson, lireObjet, ecrireJson, garderSiModifie } from "../lib/stockage";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ALL_KEYS, GAMMES, degreeSemi, gammeByN, keyByEn, nomMidi, normKey, notesIn, type Gamme } from "../lib/music";
import { bornes, engine, useEngine, type Mode, type Pas, type SeqState, type Son, SONS_PERCU } from "../lib/seq";
import { paramById } from "../lib/data";
import { plageComplete, useStore } from "../lib/store";
import { Badge, SourceRef } from "./common";

/** `base` : KEY et SCALE dans lesquelles les notes ont été écrites, quand elles diffèrent de la KEY / SCALE affichées
 *  (interrupteur « Adapter les notes à la gamme » coupé : les notes gardent leur hauteur). */
export interface SeqData { mesures: Pas[][]; key: string; scale: number; bpm: number; knobs: Record<string, number>; base?: Ton }
export interface Ton { key: string; scale: number }
type Hist = { key: string; scale: number; base?: Ton };
const clone = (d: SeqData): SeqData => ({ ...d, mesures: d.mesures.map((m) => [...m]), knobs: { ...d.knobs } });
const same = (a: SeqData, b: SeqData) => JSON.stringify(a) === JSON.stringify(b);

function load(key?: string): SeqData | null {
  if (!key) return null;
  return lireJson<SeqData | null>(key, null);
}

/** État modifiable d'une grille de 4 mesures. `persist` = clé localStorage pour garder tes changements. */
export function useSeqEdit(origine: SeqData, persist?: string) {
  const [ed, setEd] = useState<SeqData>(() => {
    const l = load(persist);
    return l && l.mesures?.length === 4 ? { ...l, key: normKey(l.key), base: l.base && { ...l.base, key: normKey(l.base.key) } } : clone(origine);
  });
  useEffect(() => {
    if (!persist) return;
    garderSiModifie(persist, ed, origine);
  }, [ed, origine, persist]);
  return {
    ed,
    origine,
    garde: Boolean(persist),
    modifie: !same(ed, origine),
    set: (p: Partial<SeqData>) => setEd((e) => ({ ...e, ...p })),
    setPas: (bar: number, i: number, v: Pas) => setEd((e) => ({ ...e, mesures: e.mesures.map((m, b) => (b === bar ? m.map((x, j) => (j === i ? v : x)) : m)) })),
    setKnob: (id: string, v: number) => setEd((e) => ({ ...e, knobs: { ...e.knobs, [id]: v } })),
    copier: (from: number, to: number) => setEd((e) => ({ ...e, mesures: e.mesures.map((m, b) => (b === to ? [...e.mesures[from]] : m)) })),
    reset: () => setEd(clone(origine)),
  };
}
export type SeqEdit = ReturnType<typeof useSeqEdit>;

// Préférences de lecture communes à tous les lecteurs (gardées d'une recette à l'autre).
const PREFS = "e2academy.player";
type Prefs = { mode: Mode; une: boolean; adapt: boolean };
const PREFS0: Prefs = { mode: "loop", une: false, adapt: true };
function loadPrefs(): Prefs {
  return lireObjet(PREFS, PREFS0);
}

/** Mode (une fois / boucle), longueur (1 ou 4 mesures) et « Adapter les notes à la gamme », communs à tous les lecteurs. */
export function usePlayerPrefs() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const upd = (p: Partial<Prefs>) => setPrefs((x) => { const n = { ...x, ...p }; ecrireJson(PREFS, n); return n; });
  return [prefs, upd] as const;
}

/** Plage du potard : celle relevée sur ta machine si tu l'as notée, sinon 0 à 127 (à vérifier). */
export function useKnobRange() {
  const { plages } = useStore();
  return (id: string) => {
    const p = plages[id];
    if (p && plageComplete(p)) return { min: Number(p.min), max: Number(p.max), lue: true };
    return { min: 0, max: 127, lue: false };
  };
}

/** Nom de la note d'un pas, comme l'écran de l'E2 : dièses et numéro d'octave (« D#2 »), français dessous.
 *  `octave` = octave de la voix de l'aperçu (0 = la basse, D2 pour KEY = D). */
export function nomPas(g: Gamme, keyEn: string, p: Pas, octave = 0) {
  if (p === null) return null;
  if (p === "~") return { en: "~", fr: "tenue" };
  return nomMidi(36 + keyByEn(keyEn).semi + 12 * octave + degreeSemi(g, p));
}

export const STEP_PAGES = [{ doc: "OM" as const, page: 24 }, { doc: "OM" as const, page: 30 }];

interface Props {
  id: string;
  edit: SeqEdit;
  son: Son;
  octave: number;
  ifx?: string;
  mod?: string;
  filtre?: "lpf" | "hpf" | "bpf";
  knobParams?: string[];
  choixGamme?: boolean;
  gammesParMesure?: number[];
  nomsMesures?: string[];
  kickRepere?: boolean;
  resetLabel?: string;
  swing?: number;
  children?: ReactNode;
}

export function SeqPlayer({ id, edit, son, octave, ifx, mod, filtre, knobParams = [], choixGamme = true, gammesParMesure, nomsMesures, kickRepere: kr0, resetLabel = "Remettre la recette d'origine", swing, children }: Props) {
  const { ed } = edit;
  const snap = useEngine();
  const playing = snap.owner === id;
  const [prefs, updPrefs] = usePlayerPrefs();
  const [sel, setSel] = useState(0);
  const [suivre, setSuivre] = useState(true);
  const [kick, setKick] = useState(kr0 ?? !SONS_PERCU.includes(son) );
  const [choix, setChoix] = useState<{ bar: number; i: number } | null>(null);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(1);
  const range = useKnobRange();
  const percu = SONS_PERCU.includes(son);
  const g = gammeByN.get(ed.scale)!;                     // SCALE affichée (celle du motif)
  const gPlay = gammeByN.get((ed.base ?? ed).scale)!;      // gamme dans laquelle les notes sonnent
  const gpm = useMemo(() => gammesParMesure?.map((n) => gammeByN.get(n)!), [gammesParMesure]);
  const gBar = (b: number) => gpm?.[b] ?? gPlay;
  const ad = useAdapt(ed, edit.set, prefs, updPrefs, Boolean(gpm));
  const { bk, decale, etat } = ad;


  const playBar = snap.owner === id && snap.step >= 0 ? Math.floor(snap.step / 16) : -1;
  const shown = playing && suivre && !prefs.une && playBar >= 0 ? playBar : sel;

  const state = (): SeqState => {
    const knobs: Record<string, number> = {};
    for (const [k, v] of Object.entries(ed.knobs)) { const r = range(k); knobs[k] = (v - r.min) / Math.max(1, r.max - r.min); }
    return {
      mesures: ed.mesures, keySemi: keyByEn(gpm ? ed.key : bk.key).semi, gamme: gPlay, gammesParMesure: gpm, bpm: ed.bpm,
      son, octave, knobs, ifx, mod, filtre, kickRepere: kick, mode: prefs.mode, range: prefs.une ? (sel as 0 | 1 | 2 | 3) : "all", swing,
    };
  };
  const stRef = useRef(state);
  stRef.current = state;

  useEffect(() => { if (playing) engine.set(id, state()); });
  useEffect(() => engine.register(id, () => engine.play(id, stRef.current())), [id]);
  useEffect(() => () => { if (engine.snap.owner === id) engine.stop(); }, [id]);

  const toggle = () => { engine.touch(id); if (playing) engine.stop(); else engine.play(id, state()); };

  const [a, b] = bornes(prefs.une ? (sel as 0) : "all");
  const options: Pas[] = useMemo(() => {
    const n = gPlay.notesEnDo.length;
    const max = Math.min(15, Math.max(2 * n - 1, 2));
    return [null, ...Array.from({ length: max + 1 }, (_, i) => i), "~"];
  }, [gPlay]);

  const clickPad = (bar: number, i: number) => {
    engine.touch(id);
    const p = ed.mesures[bar][i];
    if (son === "riser") { edit.setPas(bar, i, p === null ? 0 : p === "~" ? null : "~"); return; }
    if (percu) { edit.setPas(bar, i, p === null ? 0 : null); if (p === null) engine.audition(state(), 0); return; }
    setChoix((c) => (c && c.bar === bar && c.i === i ? null : { bar, i }));
  };
  const choose = (v: Pas) => {
    if (!choix) return;
    edit.setPas(choix.bar, choix.i, v);
    if (v !== null && v !== "~") engine.audition({ ...state(), gamme: gBar(choix.bar) }, v);
  };

  return (
    <div className="seqp" onPointerDown={() => engine.touch(id)}>
      <p className="seqp-honest"><b>Approximation pédagogique, pas le son réel de l'Electribe.</b> L'aperçu imite le rythme, les notes, le filtre, l'enveloppe, la saturation, l'écho et le LFO ; pas le timbre exact de l'oscillateur ni les autres effets.</p>

      <div className="seqp-transport">
        <BoutonLecture joue={playing} onClick={toggle} espace />
        <ChoixMode mode={prefs.mode} onChange={(mode) => updPrefs({ mode })} />
        <div className="seg" role="radiogroup" aria-label="Longueur lue">
          <button type="button" role="radio" aria-checked={!prefs.une} className={!prefs.une ? "on" : ""} onClick={() => updPrefs({ une: false })}>4 mesures</button>
          <button type="button" role="radio" aria-checked={prefs.une} className={prefs.une ? "on" : ""} onClick={() => updPrefs({ une: true })}>1 mesure (Step {sel + 1})</button>
        </div>
        <label className="seqp-bpm">BPM <input type="number" min={20} max={300} step={1} value={ed.bpm}
          onChange={(e) => { const v = Number(e.target.value); if (v >= 20 && v <= 300) edit.set({ bpm: v }); }} /></label>
        {son !== "kick" && <label className="seqp-chk"><input type="checkbox" checked={kick} onChange={(e) => setKick(e.target.checked)} /> kick repère</label>}
      </div>

      {choixGamme && (
        <div className="seqp-key">
          <label>KEY <select value={ed.key} onChange={(e) => ad.changeTon({ key: e.target.value })}>
            {ALL_KEYS.map((k) => <option key={k.en} value={k.en}>{k.en} ({k.fr})</option>)}
          </select></label>
          <label>SCALE <select value={ed.scale} onChange={(e) => ad.changeTon({ scale: Number(e.target.value) })}>
            {GAMMES.map((x) => <option key={x.n} value={x.n}>{x.n} · {x.nom}</option>)}
          </select></label>
          <a href={`#gammes/${ed.scale}`}>voir la gamme ↗</a>
          <SourceRef src={{ doc: "PG", page: 3 }} compact /> <SourceRef src={{ doc: "PG", page: 15 }} compact />
        </div>
      )}
      {choixGamme && !gpm && <AdaptBar ad={ad} nomMotif={g.nom} />}

      <div className="seqp-steps" role="group" aria-label="Boutons Step 1 à 4">
        {[0, 1, 2, 3].map((bar) => (
          <button key={bar} type="button" className={`stepbtn ${shown === bar ? "sel" : ""} ${playBar === bar ? "playing" : ""} ${prefs.une && sel !== bar ? "dim" : ""}`}
            onClick={() => { setSel(bar); setSuivre(false); setChoix(null); }} aria-pressed={shown === bar}>
            <i className="led" aria-hidden />
            <span>Step {bar + 1}</span>
            {nomsMesures?.[bar] && <small>{nomsMesures[bar]}</small>}
            <span className="mini" aria-hidden>{ed.mesures[bar].map((p, i) => <b key={i} className={`${p === null ? "" : p === "~" ? "tie" : "on"} ${snap.owner === id && snap.step === bar * 16 + i ? "now" : ""}`} />)}</span>
          </button>
        ))}
      </div>
      <p className="small muted seqp-hint">
        Mesure {shown + 1} sur 4 = bouton <kbd>Step {shown + 1}</kbd> de l'E2 (pas {shown + 1}.01 à {shown + 1}.16). <SourceRef src={STEP_PAGES[0]} compact /> <SourceRef src={STEP_PAGES[1]} compact />
        {" "}{playing && !prefs.une && <label className="seqp-chk"><input type="checkbox" checked={suivre} onChange={(e) => setSuivre(e.target.checked)} /> suivre la lecture</label>}
      </p>

      <div className="rc-pads seqp-pads">
        {ed.mesures[shown].map((p, i) => {
          const pos = shown * 16 + i;
          const nm = percu ? null : nomPas(gBar(shown), gpm ? ed.key : bk.key, p, octave);
          const et = percu ? null : etat(p, octave);
          return (
            <button key={i} type="button" className={`rp ${p === null ? "" : p === "~" ? "tie" : "on"} ${et?.chg ? "chg" : ""} ${et?.hors ? "hors" : ""} ${snap.owner === id && snap.step === pos ? "now" : ""} ${pos < a || pos > b ? "out" : ""} ${choix?.bar === shown && choix.i === i ? "editing" : ""}`}
              onClick={() => clickPad(shown, i)} title={`Pas ${shown + 1}.${String(i + 1).padStart(2, "0")}`}>
              <span className="rp-n">{i + 1}</span>
              {son === "riser" ? (p !== null && <b>{p === "~" ? "~" : "●"}</b>) : percu ? (p !== null && <b>●</b>) : nm && <><b>{nm.en}</b><small>{nm.fr}</small>{et?.avant && <em className="rp-avant" title={`Avant : ${et.avant.en}`}>← {et.avant.en}</em>}</>}
            </button>
          );
        })}
      </div>

      {choix && !percu && (
        <div className="seqp-choix" role="group" aria-label={`Note du pas ${choix.bar + 1}.${String(choix.i + 1).padStart(2, "0")}`}>
          <span className="small">Pas {choix.bar + 1}.{String(choix.i + 1).padStart(2, "0")} : seulement les notes de {gBar(choix.bar).nom}{decale ? ` (la gamme où sont écrites les notes ; allume « Adapter » pour passer en ${g.nom})` : ""}</span>
          <div className="seqp-notes">
            {options.map((o, j) => {
              const nm = nomPas(gBar(choix.bar), gpm ? ed.key : bk.key, o, octave);
              const on = ed.mesures[choix.bar][choix.i] === o;
              return (
                <button key={j} type="button" className={on ? "on" : ""} onClick={() => choose(o)}>
                  {o === null ? <b>—</b> : <b>{nm!.en}</b>}<small>{o === null ? "silence" : nm!.fr}</small>
                </button>
              );
            })}
            <button type="button" className="close-choix" onClick={() => setChoix(null)}>OK</button>
          </div>
          <p className="small muted">« ~ tenue » prolonge la note d'avant : sur la machine, GATE TIME = TIE sur le pas d'avant. <SourceRef src={{ doc: "PG", page: 5 }} compact /></p>
        </div>
      )}
      {son === "riser" ? <p className="small muted">Touche un pad : ● départ du bruit, puis ~ il continue (GATE TIME = TIE), puis éteint.</p>
        : percu && <p className="small muted">Touche un pad pour allumer ou éteindre le pas, comme en mode Sequencer.</p>}

      <div className="seqp-copy">
        <span>Copier</span>
        <select value={from} onChange={(e) => setFrom(Number(e.target.value))} aria-label="Mesure à copier">{[0, 1, 2, 3].map((x) => <option key={x} value={x}>Step {x + 1}</option>)}</select>
        <span>vers</span>
        <select value={to} onChange={(e) => setTo(Number(e.target.value))} aria-label="Mesure qui reçoit">{[0, 1, 2, 3].map((x) => <option key={x} value={x}>Step {x + 1}</option>)}</select>
        <button type="button" className="e2-ui-btn" disabled={from === to} onClick={() => { edit.copier(from, to); setSel(to); setSuivre(false); }}>Copier</button>
      </div>

      {knobParams.length > 0 && (
        <div className="seqp-knobs">
          {knobParams.map((k) => {
            const r = range(k);
            const v = ed.knobs[k] ?? Math.round((r.min + r.max) / 2);
            return (
              <label key={k} className="kn">
                <span className="kn-name">{paramById.get(k)?.nom ?? k}</span>
                <input type="range" min={r.min} max={r.max} step={1} value={v} onChange={(e) => edit.setKnob(k, Number(e.target.value))} />
                <kbd>{v}</kbd>
                {r.lue ? <span className="kn-r ok"><Badge kind="obs" /> {r.min} à {r.max}</span> : <span className="kn-r verify">à vérifier sur l'écran</span>}
              </label>
            );
          })}
        </div>
      )}

      <div className="seqp-foot">
        <button type="button" className="e2-ui-btn" disabled={!edit.modifie} onClick={() => { edit.reset(); setChoix(null); ad.oublier(); }}>↺ {resetLabel}</button>
        {edit.modifie && edit.garde && <span className="small muted">Tes changements sont gardés sur cet ordinateur.</span>}
      </div>
      {children}
    </div>
  );
}

// ---------- « Adapter les notes à la gamme » (aide de l'app, pas une fonction de l'E2) ----------
type TonEd = { key: string; scale: number; base?: Ton };
const hauteur = (t: Ton, p: Pas) => (p === null || p === "~" ? null : keyByEn(t.key).semi + degreeSemi(gammeByN.get(t.scale)!, p));

/** Changer KEY / SCALE : avec « Adapter », chaque note garde son rang dans la nouvelle gamme ; sinon elle garde sa hauteur
 *  (comme l'E2 avec SCALE MODE = Off). Garde l'historique pour « Annuler » et repère les notes qui ont changé. */
export function useAdapt(ed: TonEd, apply: (p: TonEd) => void, prefs: Prefs, updPrefs: (p: Partial<Prefs>) => void, off = false) {
  const adapt = prefs.adapt;
  const [hist, setHist] = useState<Hist[]>([]);
  const bk: Ton = ed.base ?? { key: ed.key, scale: ed.scale };
  const decale = Boolean(ed.base);
  const garder = () => setHist((h) => [...h.slice(-19), { key: ed.key, scale: ed.scale, base: ed.base }]);
  const changeTon = (p: Partial<Ton>) => {
    garder();
    const next = { key: p.key ?? ed.key, scale: p.scale ?? ed.scale };
    const b = adapt ? undefined : bk;
    apply({ ...next, base: b && (b.key !== next.key || b.scale !== next.scale) ? b : undefined });
  };
  const annuler = () => {
    const prev = hist[hist.length - 1];
    if (!prev) return;
    setHist((h) => h.slice(0, -1));
    apply({ key: prev.key, scale: prev.scale, base: prev.base });
  };
  const setAdapt = (on: boolean) => {
    updPrefs({ adapt: on });
    if (on && ed.base) { garder(); apply({ key: ed.key, scale: ed.scale, base: undefined }); }
  };
  const avant = !off && hist.length ? hist[hist.length - 1] : null;
  const tonAvant: Ton | null = avant ? avant.base ?? { key: avant.key, scale: avant.scale } : null;
  const pcsMotif = useMemo(() => new Set(notesIn(gammeByN.get(ed.scale)!, keyByEn(ed.key)).map((n) => n.pc)), [ed.scale, ed.key]);
  /** chg : la note a changé depuis le dernier changement de KEY / SCALE ; hors : elle n'est pas dans la SCALE affichée. */
  const etat = (p: Pas, octave = 0) => {
    const h = hauteur(bk, p);
    if (h === null || off) return { chg: false, hors: false, avant: null as ReturnType<typeof nomPas> };
    const ha = tonAvant ? hauteur(tonAvant, p) : h;
    return { chg: ha !== h, hors: decale && !pcsMotif.has(((h % 12) + 12) % 12), avant: ha !== h && tonAvant ? nomPas(gammeByN.get(tonAvant.scale)!, tonAvant.key, p, octave) : null };
  };
  return { adapt, bk, gPlay: gammeByN.get(bk.scale)!, decale, changeTon, annuler, setAdapt, etat, peutAnnuler: hist.length > 0, avant, oublier: () => setHist([]) };
}
export type Adapt = ReturnType<typeof useAdapt>;

export function AdaptBar({ ad, nomMotif, keyMotif }: { ad: Adapt; nomMotif: string; keyMotif?: string }) {
  return (
    <div className="seqp-adapt">
      <div className="seqp-adapt-row">
        <label className="seqp-switch">
          <input type="checkbox" role="switch" checked={ad.adapt} onChange={(e) => ad.setAdapt(e.target.checked)} />
          <i aria-hidden /> Adapter les notes à la gamme
        </label>
        <button type="button" className="e2-ui-btn" disabled={!ad.peutAnnuler} onClick={ad.annuler} title="Revenir aux notes d'avant le dernier changement de KEY ou de SCALE">↶ Annuler</button>
      </div>
      <p className="small">
        <Badge kind="pratique" /> <b>Aide de l'app, pas une fonction de l'E2.</b>{" "}
        {ad.adapt
          ? "Allumé : quand tu changes KEY ou SCALE, chaque note va sur la note de même rang de la nouvelle gamme (la 3e note reste la 3e note), tout de suite, même pendant la lecture."
          : "Éteint : les notes gardent leur hauteur, comme sur l'E2 avec SCALE MODE = Off. La SCALE ne change alors que les notes proposées (pads en mode Keyboard, pad tactile)."}
        {" "}Sur l'E2, c'est SCALE MODE (réglage de partie) qui décide si KEY et SCALE déplacent les notes déjà enregistrées ; le manuel ne dit pas vers quelle note. <a href="#gammes">En savoir plus ↗</a> <SourceRef src={{ doc: "PG", page: 3 }} compact /> <SourceRef src={{ doc: "PG", page: 4 }} compact />
      </p>
      {ad.avant && <p className="small seqp-legend"><span className="lg chg" /> notes qui ont changé (en petit, après ← : la note d'avant)</p>}
      {ad.decale && <p className="small seqp-legend"><span className="lg hors" /> notes hors de {nomMotif}{keyMotif ? ` sur ${keyMotif}` : ""} : elles restent en {ad.gPlay.nom} sur {ad.bk.key}, comme l'E2 avec SCALE MODE = Off</p>}
    </div>
  );
}
