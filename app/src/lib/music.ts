// Outils de musique : gammes du Guide (p. 15), transposition, et petit synthé Web Audio.
import { contexte, declarerLecteur, liberer, prendreLaMain, sortie } from "./moteurAudio";
import sequencerJson from "@data/electribe2/sequencer.json";

export interface Gamme { n: number; nom: string; notesEnDo: string[] }
export const GAMMES = (sequencerJson as unknown as { gammes: { liste: Gamme[] } }).gammes.liste;
export const gammeByN = new Map(GAMMES.map((g) => [g.n, g]));

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
// Notation de l'écran de l'E2 : dièses seulement (#), jamais de bémol ; octave numérotée, C4 = note MIDI 60
// (Mode d'emploi p. 30, Guide p. 5 : NOTE va de C-1 à G9).
export const DIESES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const DIESES_FR = ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
/** Nom d'une note jouée, comme l'écran : « D#2 » (français dessous : « Ré# »). */
export const nomMidi = (midi: number) => ({ en: DIESES[mod12(midi)] + (Math.floor(midi / 12) - 1), fr: DIESES_FR[mod12(midi)] });
/** Nom d'une note sans octave (KEY, notes d'une gamme) : « D# ». */
export const nomPc = (pc: number) => ({ en: DIESES[mod12(pc)], fr: DIESES_FR[mod12(pc)] });
/** Une note écrite avec ♯ ou ♭ (liste du Guide p. 15) réécrite en dièse : « E♭ » → « D# ». */
export const enDiese = (raw: string) => DIESES[parse(raw).semi];

export interface Note { en: string; fr: string; pc: number }   // pc = 0 (Do) … 11 (Si)

function parse(n: string) {
  const letter = LETTERS.indexOf(n[0]);
  const acc = n.includes("♯") ? 1 : n.includes("♭") ? -1 : 0;
  return { letter, semi: (NATURAL[letter] + acc + 12) % 12 };
}

function mod12(x: number) { return ((x % 12) + 12) % 12; }

/** Note de départ (KEY) : C, D… */
export const KEYS = [
  { en: "D", fr: "Ré", letter: 1, semi: 2 },
  { en: "A", fr: "La", letter: 5, semi: 9 },
];

/** Les 12 valeurs de KEY (C … B), écrites en dièses comme l'écran. */
export const ALL_KEYS = DIESES.map((en, semi) => ({ en, fr: DIESES_FR[semi], letter: LETTERS.indexOf(en[0]), semi }));
// Anciennes valeurs gardées dans le navigateur (avant le passage aux dièses).
const ANCIENNES: Record<string, string> = { "C♯": "C#", "E♭": "D#", "F♯": "F#", "A♭": "G#", "B♭": "A#" };   // controle: notation-ok
export const normKey = (en: string) => ANCIENNES[en] ?? en;
export const keyByEn = (en: string) => ALL_KEYS.find((k) => k.en === normKey(en)) ?? ALL_KEYS[2];

/** Notes d'une gamme du Guide, transposées sur une autre note de départ, écrites en dièses comme l'écran. */
export function notesIn(g: Gamme, key: { semi: number }): Note[] {
  return g.notesEnDo.map((raw) => { const pc = mod12(parse(raw).semi + key.semi); return { ...nomPc(pc), pc }; });
}

/** Écarts en demi-tons entre notes voisines, en revenant à la note de départ une octave plus haut. */
export function ecarts(g: Gamme): number[] {
  const s = g.notesEnDo.map((n) => parse(n).semi);
  return s.map((v, i) => (i + 1 < s.length ? s[i + 1] - v : 12 - v));
}

export const semis = (g: Gamme) => g.notesEnDo.map((n) => parse(n).semi);

/** Disposition des 8 pads d'une rangée : la gamme dans l'ordre, puis on continue à l'octave au-dessus. */
export function padRow(g: Gamme, key: { letter: number; semi: number }) {
  const ns = notesIn(g, key);
  return Array.from({ length: 8 }, (_, i) => ({ ...ns[i % ns.length], octave: Math.floor(i / ns.length) }));
}

/** Rang dans la gamme → décalage en demi-tons depuis la note de départ. */
export function degreeSemi(g: Gamme, d: number | "O" | "~") {
  if (d === "O") return 12;
  if (d === "~") return 0;
  const s = semis(g);
  return s[d % s.length] + 12 * Math.floor(d / s.length);
}

// ---------- Petit synthé Web Audio ----------
// Une dent de scie filtrée, proche d'un son de base de synthé. Ce n'est pas le son de l'Electribe.
let stopAll: (() => void) | null = null;
const audio = () => contexte();   // le moteur audio partagé (lib/moteurAudio.ts)
declarerLecteur("notes", () => stop());

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

function voice(c: AudioContext, out: AudioNode, midi: number, t: number, dur: number) {
  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = freq(midi);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.Q.value = 7;
  f.frequency.setValueAtTime(3200, t);
  f.frequency.exponentialRampToValueAtTime(500, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
  return o;
}

function kick(c: AudioContext, out: AudioNode, t: number) {
  const o = c.createOscillator();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  const g = c.createGain();
  g.gain.setValueAtTime(1, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.32);
  return o;
}

export interface PlayEvent { midi: number | null; dur: number }

/** Joue une suite de notes. onStep(i) suit la lecture (i = -1 à la fin). */
export function play(events: PlayEvent[], opts: { kickEvery?: number; onStep?: (i: number) => void; onEnd?: () => void } = {}) {
  stop();
  prendreLaMain("notes");
  const c = audio();
  const out = c.createGain();
  out.gain.value = 0.3;
  out.connect(sortie());
  const nodes: OscillatorNode[] = [];
  const timers: number[] = [];
  let t = c.currentTime + 0.06;
  const t0 = t;
  events.forEach((e, i) => {
    if (e.midi !== null) nodes.push(voice(c, out, e.midi, t, Math.max(0.08, e.dur * 0.9)));
    if (opts.kickEvery && i % opts.kickEvery === 0) nodes.push(kick(c, out, t));
    const at = (t - t0) * 1000;
    timers.push(window.setTimeout(() => opts.onStep?.(i), at + 60));
    t += e.dur;
  });
  timers.push(window.setTimeout(() => { opts.onStep?.(-1); opts.onEnd?.(); stopAll = null; liberer("notes"); }, (t - t0) * 1000 + 80));
  stopAll = () => {
    const t1 = c.currentTime;
    out.gain.cancelScheduledValues(t1); out.gain.setTargetAtTime(0, t1, 0.008);   // fondu : pas de clic
    nodes.forEach((n) => { try { n.stop(t1 + 0.06); } catch { /* déjà arrêté */ } });
    timers.forEach(clearTimeout);
    setTimeout(() => out.disconnect(), 120);
    liberer("notes");
    opts.onStep?.(-1);
    opts.onEnd?.();
  };
}

export function stop() {
  const s = stopAll;
  stopAll = null;
  s?.();
}

export const stepDur = (bpm: number) => 60 / bpm / 4; // une double-croche = un pas du séquenceur
