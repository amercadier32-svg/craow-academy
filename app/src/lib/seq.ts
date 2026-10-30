// Séquenceur d'aperçu sur 4 mesures (64 pas), joué par le navigateur (Web Audio).
// C'est une approximation pédagogique : le son n'est PAS celui de l'Electribe.
// Il imite seulement : la hauteur des notes, le filtre (Cutoff, Resonance, EG Int), l'enveloppe (Attack, Decay),
// le niveau, le panoramique, une saturation, un écho simple et un LFO. Les autres effets ne sont pas imités.
import { useSyncExternalStore } from "react";
import { degreeSemi, type Gamme } from "./music";
import { contexte, sortie as sortieMoteur, declarerLecteur, liberer, nouvelleVoix, prendreLaMain, quandNouveauContexte } from "./moteurAudio";

/** Un pas : rang de la note dans la gamme (0 = note de départ), "O" = note de départ une octave plus haut,
 *  "~" = la note d'avant continue (GATE TIME = TIE), null = silence. Pour une percussion, 0 = un coup. */
export type Pas = number | "O" | "~" | null;
export type Son =
  | "kick" | "hat" | "openhat" | "clap" | "snare" | "shaker" | "perc" | "tom" | "ride" | "crash"
  | "synth" | "square" | "sub" | "reese" | "stab" | "pad" | "noise" | "riser" | "voix";
/** Sons joués sans choix de note : un pad = un coup. */
export const SONS_PERCU: Son[] = ["kick", "hat", "openhat", "clap", "snare", "shaker", "perc", "noise", "riser", "ride", "crash"];

export type Mode = "once" | "loop";
export type Range = "all" | 0 | 1 | 2 | 3;

export interface SeqState {
  mesures: Pas[][];          // 4 mesures de 16 pas
  keySemi: number;           // 0 = C … 11 = B
  gamme: Gamme;
  gammesParMesure?: Gamme[]; // pour comparer deux gammes (mesures 1-2 / 3-4)
  bpm: number;
  son: Son;
  octave: number;            // 0 = octave de la basse (D1 ≈ 37 Hz pour KEY = D)
  knobs: Record<string, number>; // id du paramètre → position 0…1 sur la plage
  ifx?: string;              // type d'Insert Fx (nom de la liste)
  mod?: string;              // type de modulation (nom de la liste)
  filtre?: "lpf" | "hpf" | "bpf";
  kickRepere: boolean;       // grosse caisse de repère sur les pas 1, 5, 9, 13
  mode: Mode;
  range: Range;
  pistes?: Piste[];          // plusieurs parties jouées ensemble (module Grilles) ; sinon une seule voix
  swing?: number;            // SWING en % (-50 à +50) : décale les pas pairs (Guide p. 3)
}

/** Une partie de la grille : son, potards, effets et ses 4 mesures. */
export interface Piste {
  son: Son;
  octave: number;
  knobs: Record<string, number>;
  ifx?: string;
  mod?: string;
  filtre?: "lpf" | "hpf" | "bpf";
  mesures: Pas[][];
  muet?: boolean;
}
type Bus = { inp: GainNode; shaper: WaveShaperNode; drive: number; pan: StereoPannerNode; lvl: GainNode; dly?: { d: DelayNode; wet: GainNode } };

export const stepSec = (bpm: number) => 60 / bpm / 4;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export function bornes(r: Range): [number, number] {
  return r === "all" ? [0, 63] : [r * 16, r * 16 + 15];
}

/** Hauteur MIDI d'un pas. */
export function midiOf(st: Pick<SeqState, "keySemi" | "octave">, g: Gamme, p: number | "O") {
  return 36 + st.keySemi + 12 * st.octave + degreeSemi(g, p);
}

type Snap = { owner: string | null; step: number };

class Engine {
  private c: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private buses: Bus[] = [];
  private ifxSig = "";
  private st: SeqState | null = null;
  private pos = 0;
  private next = 0;
  private timer = 0;
  private raf = 0;
  private queue: { t: number; step: number }[] = [];
  private fini = false;
  private endAt = 0;
  private lastMidi: (number | null)[] = [];
  private listeners = new Set<() => void>();
  snap: Snap = { owner: null, step: -1 };

  // Touche Espace : lance ou arrête le dernier lecteur utilisé.
  private toggles = new Map<string, () => void>();
  private last: string | null = null;

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => this.listeners.delete(fn); };
  private emit(s: Snap) { this.snap = s; this.listeners.forEach((f) => f()); }

  register(owner: string, toggle: () => void) {
    this.toggles.set(owner, toggle);
    if (!this.last) this.last = owner;
    return () => { this.toggles.delete(owner); if (this.last === owner) this.last = this.toggles.keys().next().value ?? null; };
  }
  touch(owner: string) { this.last = owner; }
  space() {
    if (this.snap.owner) { this.stop(); return; }
    const t = this.last ? this.toggles.get(this.last) : undefined;
    t?.();
  }

  constructor() {
    declarerLecteur("sequenceur", () => this.stop());
    quandNouveauContexte(() => { this.stop(); this.c = null; });
  }

  // Le contexte du moteur audio partagé (lib/moteurAudio.ts) ; le compresseur de ce lecteur va dans sa sortie générale.
  private ctx() {
    if (!this.c) {
      this.c = contexte();
      const comp = this.c.createDynamicsCompressor();
      comp.threshold.value = -10;
      comp.ratio.value = 6;
      this.master = this.c.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(comp).connect(sortieMoteur());
      const len = this.c.sampleRate;
      this.noise = this.c.createBuffer(1, len, this.c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    contexte();   // réveille le contexte s'il dormait
    return this.c;
  }

  private pistes(st = this.st!): Piste[] {
    return st.pistes ?? [{ son: st.son, octave: st.octave, knobs: st.knobs, ifx: st.ifx, mod: st.mod, filtre: st.filtre, mesures: st.mesures }];
  }

  private buildBuses() {
    this.buses.forEach((b) => b.lvl.disconnect());
    const ps = this.pistes();
    this.buses = ps.map((tr) => this.makeBus(tr));
    this.ifxSig = ps.map((x) => x.ifx ?? "").join("|");
    this.liveBus();
  }

  private makeBus(tr: Piste): Bus {
    const c = this.c!, st = this.st!;
    const inp = c.createGain();
    const shaper = c.createWaveShaper();
    const pan = c.createStereoPanner();
    const lvl = c.createGain();
    inp.connect(shaper).connect(pan).connect(lvl).connect(this.master!);
    const bus: Bus = { inp, shaper, drive: -1, pan, lvl };
    const name = tr.ifx ?? "";
    const m = name.match(/(Delay|Roller) ?(\d+)\/(\d+)/);
    if (/Delay|Roller/.test(name)) {
      const d = c.createDelay(2);
      d.delayTime.value = m ? (4 * stepSec(st.bpm) * 4 * Number(m[2])) / Number(m[3]) : 0.12;
      const fb = c.createGain(); fb.gain.value = 0.35;
      const wet = c.createGain();
      shaper.connect(d); d.connect(fb).connect(d); d.connect(wet).connect(pan);
      bus.dly = { d, wet };
    }
    return bus;
  }

  private liveBus() {
    const st = this.st;
    if (!st) return;
    this.pistes().forEach((tr, i) => {
      const b = this.buses[i];
      if (!b) return;
      const k = tr.knobs;
      const drive = /Punch|Overdrive|Distortion|Decimator|Bit Crusher/.test(tr.ifx ?? "") ? clamp(k["ifx.edit"] ?? 0.5) : 0;
      if (Math.abs(drive - b.drive) > 0.01) {
        b.drive = drive;
        if (drive <= 0) b.shaper.curve = null;
        else {
          const a = 1 + drive * 40, n = 1024, curve = new Float32Array(n);
          for (let x = 0; x < n; x++) { const v = (x / (n - 1)) * 2 - 1; curve[x] = Math.tanh(a * v) / Math.tanh(a); }
          b.shaper.curve = curve;
        }
      }
      b.pan.pan.value = (clamp(k["amp.pan"] ?? 0.5) - 0.5) * 2;
      const lvl = 0.15 + clamp(k["amp.level"] ?? 0.8) * 0.85;
      b.lvl.gain.value = tr.muet ? 0 : (st.pistes ? lvl * 0.7 : lvl);
      if (b.dly) b.dly.wet.gain.value = clamp(k["ifx.edit"] ?? 0.4) * 0.7;
    });
  }

  play(owner: string, st: SeqState) {
    this.stop();
    prendreLaMain("sequenceur");
    const c = this.ctx();
    this.st = { ...st };
    this.last = owner;
    this.pos = bornes(st.range)[0];
    this.next = c.currentTime + 0.08;
    this.fini = false;
    this.queue = [];
    this.lastMidi = [];
    this.buildBuses();
    this.emit({ owner, step: -1 });
    this.timer = window.setInterval(() => this.tick(), 25);
    this.tick();
    const frame = () => { this.frame(); if (this.snap.owner) this.raf = requestAnimationFrame(frame); };
    this.raf = requestAnimationFrame(frame);
  }

  /** Change la lecture en cours sans la relancer. */
  set(owner: string, p: Partial<SeqState>) {
    if (!this.st || this.snap.owner !== owner) return;
    const rangeChange = p.range !== undefined && p.range !== this.st.range;
    const loopOn = p.mode === "loop" && this.st.mode !== "loop";
    Object.assign(this.st, p);
    if (rangeChange || (loopOn && this.fini)) {
      const [a, b] = bornes(this.st.range);
      if (this.pos < a || this.pos > b) this.pos = a;
      if (this.fini && this.c) { this.fini = false; this.next = Math.max(this.next, this.c.currentTime + 0.05); }
    }
    const ps = this.pistes();
    const sig = ps.map((x) => x.ifx ?? "").join("|");
    if (sig !== this.ifxSig || ps.length !== this.buses.length) this.buildBuses(); else this.liveBus();
  }

  stop() {
    clearInterval(this.timer);
    cancelAnimationFrame(this.raf);
    // Fondu de ~25 ms avant de débrancher : pas de clic.
    const now = this.c?.currentTime ?? 0;
    this.buses.forEach((b) => { b.lvl.gain.cancelScheduledValues(now); b.lvl.gain.setTargetAtTime(0, now, 0.008); const l = b.lvl; setTimeout(() => l.disconnect(), 120); });
    this.buses = [];
    this.st = null;
    this.queue = [];
    liberer("sequenceur");
    if (this.snap.owner) this.emit({ owner: null, step: -1 });
  }

  private tick() {
    const c = this.c, st = this.st;
    if (!c || !st || this.fini) return;
    const sd = stepSec(st.bpm);
    while (this.next < c.currentTime + 0.12) {
      // SWING : les pas pairs (2, 4, 6…) sont décalés de swing % d'un pas ; +33 % ≈ shuffle (Guide p. 3). Approximation.
      const t = this.next + (st.swing && this.pos % 2 === 1 ? (st.swing / 100) * sd : 0);
      this.schedule(this.pos, Math.max(t, c.currentTime));
      this.queue.push({ t, step: this.pos });
      this.next += sd;
      const [a, b] = bornes(st.range);
      this.pos++;
      if (this.pos > b) {
        if (st.mode === "loop") this.pos = a;
        else { this.fini = true; this.endAt = this.next; break; }
      }
    }
  }

  private frame() {
    const c = this.c;
    if (!c) return;
    let s = this.snap.step;
    while (this.queue.length && this.queue[0].t <= c.currentTime) s = this.queue.shift()!.step;
    if (s !== this.snap.step) this.emit({ owner: this.snap.owner, step: s });
    if (this.fini && c.currentTime >= this.endAt + 0.05) this.stop();
  }

  private schedule(pos: number, t: number) {
    const st = this.st!;
    const bar = Math.floor(pos / 16), i = pos % 16;
    if (st.kickRepere && i % 4 === 0) this.kick(t, 0.45, 0.35, this.master!);
    this.pistes().forEach((tr, ti) => {
      if (tr.muet || !this.buses[ti]) return;
      const p = tr.mesures[bar]?.[i];
      if (p === null || p === undefined || p === "~") return;
      let n = 1;
      while (pos + n < 64 && tr.mesures[Math.floor((pos + n) / 16)]?.[(pos + n) % 16] === "~") n++;
      this.voice({ ...st, ...tr }, st.gammesParMesure?.[bar] ?? st.gamme, p, t, n * stepSec(st.bpm), this.buses[ti].inp, ti);
    });
  }

  /** Fait entendre une seule note (quand on la choisit sur la grille). */
  audition(st: SeqState, p: Pas, piste?: Piste) {
    if (p === null || p === "~") return;
    const c = this.ctx();
    const vs: SeqState = piste ? { ...st, ...piste, pistes: undefined } : { ...st, pistes: undefined };
    const prev = this.st;
    this.st = vs;
    const bus = this.makeBus(vs);
    const saved = this.buses;
    this.buses = [bus];
    this.liveBus();
    this.buses = saved;
    this.voice(vs, st.gamme, p, c.currentTime + 0.02, stepSec(st.bpm) * 2, bus.inp, 99);
    this.st = prev;
    setTimeout(() => bus.lvl.disconnect(), 3000);
  }

  private noiseSrc(t: number) {
    const s = this.c!.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.start(t, Math.random() * 0.5);
    return s;
  }

  private finVoix = 0;
  private env(g: GainNode, t: number, peak: number, attack: number, hold: number, decay: number) {
    this.finVoix = Math.max(this.finVoix, t + attack + hold + decay * 1.2 + 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.setTargetAtTime(0.0001, t + attack + hold, decay / 3);
    return t + attack + hold + decay * 1.2 + 0.05;
  }

  private kick(t: number, decay: number, peak: number, out: AudioNode, st?: SeqState) {
    const c = this.c!;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(47, t + 0.03 + decay * 0.1);
    const g = c.createGain();
    const end = this.env(g, t, peak, 0.002, 0, 0.1 + decay * 0.5);
    o.connect(g).connect(out);
    o.start(t); o.stop(end);
    const md = st ? modDe(st) : null;
    if (st && md?.cible === "pitch") this.moduler(st, md, t, end, { pitch: [o.detune] });
  }

  /** Une note : elle passe par son propre gain, pour que le moteur puisse limiter le nombre de voix. */
  private voice(st: SeqState, g: Gamme, p: number | "O", t: number, dur: number, out: AudioNode, ti = 0) {
    const c = this.c!;
    const vg = c.createGain();
    // Modulation vers Level ou Pan : appliquée à la voix entière (tous les sons, percussions comprises).
    const md = modDe(st);
    const mg = md && md.cible === "level" ? c.createGain() : null;
    const pn = md && md.cible === "pan" ? c.createStereoPanner() : null;
    // percussions sans filtre propre : un filtre de voix rend audibles les modulations Filter, OSC et IFX
    const fv = md && (md.cible === "filter" || md.cible === "osc" || md.cible === "ifx") && PERCU_SANS_FILTRE.includes(st.son) ? c.createBiquadFilter() : null;
    let x: AudioNode = vg;
    if (fv) { fv.type = "lowpass"; fv.frequency.value = 5000; fv.Q.value = 2; vg.connect(fv); x = fv; }
    if (mg) { x.connect(mg); x = mg; }
    if (pn) { x.connect(pn); x = pn; }
    x.connect(out);
    this.finVoix = t + dur;
    this.voixInterne(st, g, p, t, dur, vg, ti);
    if (md && fv) this.moduler(st, { ...md, cible: "filter" }, t, Math.min(this.finVoix + 0.6, t + 8.6), { filter: fv.frequency, base: 2500 });
    if (md && (mg || pn)) this.moduler(st, md, t, Math.min(this.finVoix + 0.6, t + 8.6), mg ? { level: mg.gain } : { pan: pn!.pan });
    nouvelleVoix(vg, Math.min(this.finVoix + 0.6, t + 8.6));
  }

  private voixInterne(st: SeqState, g: Gamme, p: number | "O", t: number, dur: number, out: AudioNode, ti = 0) {
    const c = this.c!;
    const k = (id: string, d: number) => clamp(st.knobs[id] ?? d);
    const dec = k("amp.decay", 0.4), atk = k("amp.attack", 0);
    const tied = dur > stepSec(st.bpm) * 1.5;
    const midi = midiOf(st, g, p);

    // Percussions
    if (st.son === "kick") { this.kick(t, dec, 0.95, out, st); return; }
    if (st.son === "hat" || st.son === "openhat" || st.son === "shaker") {
      const s = this.noiseSrc(t);
      const f = c.createBiquadFilter();
      f.type = st.son === "shaker" ? "bandpass" : "highpass";
      f.frequency.value = st.son === "shaker" ? 6000 : 6500 + k("filter.cutoff", 0.6) * 4000;
      const gg = c.createGain();
      const d = st.son === "openhat" ? 0.15 + dec * 0.6 : st.son === "shaker" ? 0.05 + dec * 0.12 : 0.02 + dec * 0.15;
      const end = this.env(gg, t, 0.5, st.son === "shaker" ? 0.012 : 0.001, 0, d);
      s.connect(f).connect(gg).connect(out); s.stop(end);
      return;
    }
    if (st.son === "ride" || st.son === "crash") {
      // Cymbales : souffle filtré + quelques ondes carrées désaccordées pour le côté métallique.
      const ride = st.son === "ride";
      const s = this.noiseSrc(t);
      const f = c.createBiquadFilter();
      f.type = ride ? "bandpass" : "highpass"; f.frequency.value = ride ? 9000 : 4500; f.Q.value = ride ? 1.2 : 0.7;
      const gg = c.createGain();
      const d = ride ? 0.25 + dec * 1.2 : 0.6 + dec * 2.4;
      const end = this.env(gg, t, ride ? 0.28 : 0.4, 0.001, 0, d);
      s.connect(f).connect(gg).connect(out); s.stop(end);
      const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 6000;
      const mg = c.createGain(); this.env(mg, t, ride ? 0.12 : 0.08, 0.001, 0, d * 0.8);
      hp.connect(mg).connect(out);
      for (const k of [1, 1.34, 1.78, 2.12, 2.67]) {
        const o = c.createOscillator(); o.type = "square"; o.frequency.value = 410 * k;
        o.connect(hp); o.start(t); o.stop(end);
      }
      return;
    }
    if (st.son === "clap" || st.son === "snare") {
      const s = this.noiseSrc(t);
      const f = c.createBiquadFilter();
      f.type = st.son === "clap" ? "bandpass" : "highpass";
      f.frequency.value = st.son === "clap" ? 1300 : 1500;
      f.Q.value = 1.2;
      const gg = c.createGain();
      gg.gain.setValueAtTime(0.0001, t);
      if (st.son === "clap") for (let b = 0; b < 3; b++) { gg.gain.setValueAtTime(0.8, t + b * 0.011); gg.gain.setTargetAtTime(0.05, t + b * 0.011 + 0.001, 0.003); }
      const tail = t + (st.son === "clap" ? 0.034 : 0);
      gg.gain.setValueAtTime(0.7, tail);
      gg.gain.setTargetAtTime(0.0001, tail, (0.06 + dec * 0.3) / 3);
      s.connect(f).connect(gg).connect(out); s.stop(tail + 0.6);
      if (st.son === "snare") {
        const o = c.createOscillator(); o.frequency.value = 190;
        const og = c.createGain(); const e = this.env(og, t, 0.5, 0.001, 0, 0.08);
        o.connect(og).connect(out); o.start(t); o.stop(e);
      }
      return;
    }
    if (st.son === "tom") {
      // Tom : sinus + petite partielle, chute (EG+ Pitch) ou montée (EG- Pitch) de hauteur, filtre et résonance des potards.
      const f0 = freq(midi);
      const name = st.mod ?? "";
      const md = k("mod.depth", 0.3), ms = k("mod.speed", 0.5);
      let start = f0 * 1.5, sweep = 0.07;
      if (/^EG\+.*Pitch/.test(name)) { start = f0 * (1.5 + md * 4); sweep = 0.02 + (1 - ms) * 0.4; }
      else if (/^EG-.*Pitch/.test(name)) { start = f0 / (1 + md * 1.5); sweep = 0.05 + (1 - ms) * 0.5; }
      const f = c.createBiquadFilter();
      f.type = st.filtre === "hpf" ? "highpass" : st.filtre === "bpf" ? "bandpass" : "lowpass";
      f.frequency.value = 50 * Math.pow(2, k("filter.cutoff", 0.85) * 8.5);
      f.Q.value = 0.6 + k("filter.resonance", 0) * 22;
      const gg = c.createGain();
      const end = this.env(gg, t, 0.8, 0.001, 0, 0.08 + dec * dec * 1.6);
      const os: OscillatorNode[] = [];
      for (const [ratio, type, gain] of [[1, "sine", 1], [1.47, "triangle", 0.25 + k("osc.edit", 0) * 0.5]] as [number, OscillatorType, number][]) {
        const o = c.createOscillator(); o.type = type;
        o.frequency.setValueAtTime(start * ratio, t);
        o.frequency.exponentialRampToValueAtTime(f0 * ratio, t + sweep);
        const og = c.createGain(); og.gain.value = gain;
        o.connect(og).connect(f); o.start(t); o.stop(end); os.push(o);
      }
      f.connect(gg).connect(out);
      if (!/^EG/.test(name)) this.lfo(st, t, end, { filter: f.frequency, base: f.frequency.value, pitch: os.map((o) => o.detune) });
      return;
    }
    if (st.son === "perc") {
      const o = c.createOscillator();
      const f0 = freq(midi);
      o.frequency.setValueAtTime(f0 * 1.8, t);
      o.frequency.exponentialRampToValueAtTime(f0, t + 0.02);
      const gg = c.createGain();
      const end = this.env(gg, t, 0.8, 0.001, 0, 0.08 + dec * 0.5);
      o.connect(gg).connect(out); o.start(t); o.stop(end);
      {
        const s = this.noiseSrc(t); const bf = c.createBiquadFilter(); bf.type = "bandpass"; bf.frequency.value = 3000;
        const ng = c.createGain(); const e2 = this.env(ng, t, 0.35, 0.001, 0, 0.025);
        s.connect(bf).connect(ng).connect(out); s.stop(e2);
      }
      this.lfo(st, t, end, { pitch: [o.detune] });
      return;
    }

    // Sons de synthé et bruits filtrés
    const cut = k("filter.cutoff", 0.6), res = k("filter.resonance", 0.2), eg = k("filter.egint", 0.3);
    const attack = 0.002 + atk * atk * 1.5;
    const decay = 0.05 + dec * dec * 2.5;
    const hold = tied ? Math.max(0, dur - attack) : 0;
    const f = c.createBiquadFilter();
    f.type = st.filtre === "hpf" ? "highpass" : st.filtre === "bpf" ? "bandpass" : "lowpass";
    const base = 50 * Math.pow(2, cut * 8.5);
    f.Q.value = 0.6 + res * 22;
    const amp = c.createGain();
    const peak = st.son === "pad" || st.son === "stab" ? 0.22 : 0.4;
    let end = this.env(amp, t, peak, attack, hold, decay);
    const srcs: AudioScheduledSourceNode[] = [];
    const detunes: AudioParam[] = [];

    if (st.son === "noise" || st.son === "riser") {
      const s = this.noiseSrc(t);
      srcs.push(s);
      s.connect(f);
      if (st.son === "riser") {
        f.type = "bandpass";
        f.frequency.setValueAtTime(base, t);
        f.frequency.exponentialRampToValueAtTime(Math.min(16000, base * 24), t + dur);
        amp.gain.cancelScheduledValues(t);
        amp.gain.setValueAtTime(0.0001, t);
        amp.gain.linearRampToValueAtTime(0.5, t + dur);
        amp.gain.setTargetAtTime(0.0001, t + dur, 0.05);
        end = t + dur + 0.3;
      } else {
        f.frequency.setValueAtTime(Math.min(18000, base * Math.pow(2, eg * 5)), t);
        f.frequency.setTargetAtTime(base, t + attack, decay / 2);
      }
    } else {
      const edit = k("osc.edit", 0.3);
      const notes = st.son === "stab"
        ? [midi, midiOf(st, g, (p === "O" ? g.notesEnDo.length : p) + 2), midiOf(st, g, (p === "O" ? g.notesEnDo.length : p) + 4)]
        : [midi];
      const layers: { type: OscillatorType; cents: number }[] =
        st.son === "reese" ? [{ type: "sawtooth", cents: -(6 + edit * 30) }, { type: "sawtooth", cents: 6 + edit * 30 }]
        : st.son === "pad" ? [{ type: "sawtooth", cents: -(4 + edit * 18) }, { type: "sawtooth", cents: 0 }, { type: "sawtooth", cents: 4 + edit * 18 }]
        : st.son === "square" ? [{ type: "square", cents: 0 }]
        : st.son === "sub" ? [{ type: "sine", cents: 0 }]
        : st.son === "voix" ? [{ type: "sawtooth", cents: -5 }, { type: "sawtooth", cents: 5 }]
        : [{ type: "sawtooth", cents: 0 }];
      // Voix : deux formants (bandes passantes) imitent une voyelle, de « a » (Edit bas) vers « o » (Edit haut).
      let entree: AudioNode = f;
      if (st.son === "voix") {
        const bus = c.createGain();
        for (const [fq, q, gn] of [[750 - edit * 330, 6, 1], [1150 - edit * 400, 8, 0.6], [2600, 10, 0.25]]) {
          const bp = c.createBiquadFilter();
          bp.type = "bandpass"; bp.frequency.value = fq; bp.Q.value = q;
          const gg = c.createGain(); gg.gain.value = gn * 3;
          bus.connect(bp).connect(gg).connect(f);
        }
        entree = bus;
      }
      const glide = k("osc.glide", 0) * 0.25;
      for (const m of notes) for (const L of layers) {
        const o = c.createOscillator();
        o.type = L.type;
        o.detune.value = L.cents;
        const lm = this.lastMidi[ti];
        if (glide > 0.005 && lm != null && notes.length === 1) {
          o.frequency.setValueAtTime(freq(lm), t);
          o.frequency.exponentialRampToValueAtTime(freq(m), t + glide);
        } else o.frequency.value = freq(m);
        o.connect(entree);
        srcs.push(o);
        detunes.push(o.detune);
      }
      this.lastMidi[ti] = midi;
      if (st.son === "sub") f.frequency.value = 18000;
      else {
        f.frequency.setValueAtTime(Math.min(18000, base * Math.pow(2, eg * 5)), t);
        f.frequency.setTargetAtTime(base, t + attack, decay / 2);
      }
    }
    f.connect(amp).connect(out);
    end = Math.min(end, t + 8);
    srcs.forEach((s) => { if (s instanceof OscillatorNode) s.start(t); s.stop(end); });
    this.lfo(st, t, end, { filter: f.frequency, base, pitch: detunes });
  }

  /** Modulation vers le filtre, la hauteur, OSC Edit ou IFX Edit (Level et Pan : voir voice()). */
  private lfo(st: SeqState, t: number, end: number, to: { filter?: AudioParam; base?: number; pitch?: AudioParam[] }) {
    const md = modDe(st);
    if (!md || md.cible === "level" || md.cible === "pan") return;
    this.moduler(st, md, t, end, md.cible === "pitch" ? { pitch: to.pitch } : { filter: to.filter, base: to.base, pitch: md.cible === "osc" ? to.pitch : undefined });
  }

  /** Applique la modulation (approximation) : enveloppe EG+ / EG-, ou LFO triangle, dent de scie, carré, S&H, aléatoire.
   *  Les types « BPM » suivent le tempo (Speed = durée en pas, de 4 mesures à 1/32) ; les autres ont une vitesse libre. */
  private moduler(st: SeqState, md: Mod, t: number, end: number, to: { filter?: AudioParam; base?: number; pitch?: AudioParam[]; level?: AudioParam; pan?: AudioParam }) {
    const c = this.c!;
    const depth = clamp(st.knobs["mod.depth"] ?? 0.3), speed = clamp(st.knobs["mod.speed"] ?? 0.5);
    if (depth < 0.01) return;
    const base = to.base ?? 800;
    // ampleur selon la cible : filtre en Hz, hauteur en cents, OSC / IFX en petite couleur du filtre, niveau, pan
    const amp = md.cible === "pitch" ? depth * 1200 : md.cible === "osc" || md.cible === "ifx" ? base * depth * 1.2 : md.cible === "filter" ? base * depth * 4 : md.cible === "level" ? depth : depth;
    const params: AudioParam[] = md.cible === "pitch" ? to.pitch ?? [] : md.cible === "level" ? (to.level ? [to.level] : []) : md.cible === "pan" ? (to.pan ? [to.pan] : [])
      : [...(to.filter ? [to.filter] : [])];
    const detunesOsc = md.cible === "osc" ? to.pitch ?? [] : [];
    if (!params.length && !detunesOsc.length) return;
    const pas = stepSec(st.bpm);
    if (md.forme === "eg+" || md.forme === "eg-") {
      // EG : un coup d'enveloppe au début de chaque note, qui revient au réglage du potard
      const signe = md.forme === "eg+" ? 1 : -1;
      const duree = md.bpm ? pas * Math.pow(2, Math.round(speed * 6)) : 0.02 + speed * speed * 1.5;
      for (const a of params) {
        const v0 = a.value;
        if (md.cible === "level") { a.setValueAtTime(signe > 0 ? 1 : Math.max(0, 1 - depth), t); a.setTargetAtTime(signe > 0 ? Math.max(0, 1 - depth * 0.8) : 1, t + 0.005, duree / 3); }
        else if (md.cible === "pan") { a.setValueAtTime(Math.max(-1, Math.min(1, signe * depth)), t); a.setTargetAtTime(0, t + 0.005, duree / 3); }
        else if (md.cible === "pitch") { a.setValueAtTime(v0 + signe * amp, t); a.setTargetAtTime(v0, t + 0.002, duree / 3); }
        else { a.setValueAtTime(Math.max(30, Math.min(18000, v0 + signe * amp)), t); a.setTargetAtTime(v0, t + 0.002, duree / 3); }
      }
      for (const d of detunesOsc) { d.setValueAtTime(d.value + signe * depth * 25, t); d.setTargetAtTime(d.value, t + 0.002, duree / 3); }
      return;
    }
    // LFO : vitesse libre (0,1 à 13 Hz) ou calée sur le tempo (de 4 mesures à 1/32 de note)
    const hz = md.bpm ? 1 / (pas * Math.pow(2, 6 - Math.round(speed * 7))) : 0.1 * Math.pow(2, speed * 7);
    if (md.forme === "sh" || md.forme === "random") {
      // paliers au hasard (S&H, au rythme du tempo) ou glissement au hasard (Random)
      const n = Math.min(64, Math.ceil((end - t) * hz) + 1);
      for (const a of params) {
        const v0 = a.value;
        for (let i = 0; i < n; i++) {
          const r = Math.random() * 2 - 1, ti = t + i / hz;
          const v = md.cible === "level" ? Math.max(0, 1 - depth * (r + 1) / 2) : md.cible === "pan" ? r * depth : md.cible === "pitch" ? v0 + r * amp * 0.5 : Math.max(30, Math.min(18000, v0 + r * amp));
          if (md.forme === "sh" || i === 0) a.setValueAtTime(v, ti); else a.linearRampToValueAtTime(v, ti);
        }
      }
      return;
    }
    const o = c.createOscillator();
    o.type = md.forme === "saw-up" || md.forme === "saw-down" ? "sawtooth" : md.forme === "square-up" || md.forme === "square-down" ? "square" : "triangle";
    o.frequency.value = hz;
    const g = c.createGain();
    const inv = md.forme === "saw-down" || md.forme === "square-down" ? -1 : 1;
    g.gain.value = inv * (md.cible === "level" ? depth * 0.5 : md.cible === "pan" ? depth : md.cible === "pitch" ? amp * 0.25 : amp * 0.5);
    o.connect(g);
    for (const a of params) {
      if (md.cible === "level") a.setValueAtTime(1 - depth * 0.5, t);
      g.connect(a);
    }
    if (detunesOsc.length) { const g2 = c.createGain(); g2.gain.value = depth * 20; o.connect(g2); detunesOsc.forEach((d) => g2.connect(d)); }
    o.start(t); o.stop(end);
  }
}

const PERCU_SANS_FILTRE: string[] = ["kick", "hat", "openhat", "shaker", "ride", "crash", "clap", "snare"];
type Mod = { cible: "filter" | "pitch" | "osc" | "level" | "pan" | "ifx"; forme: "eg+" | "eg-" | "tri" | "saw-up" | "saw-down" | "square-up" | "square-down" | "sh" | "random"; bpm: boolean };
/** Lit le nom du type de modulation (« 37 SawUpB Filter ») : source, destination, tempo. */
export function modDe(st: { mod?: string; knobs: Record<string, number> }): Mod | null {
  const n = (st.mod ?? "").replace(/^\d+ /, "");
  if (!n || (st.knobs["mod.depth"] ?? 0.3) < 0.01) return null;
  const cible = /Filter$/.test(n) ? "filter" : /Pitch$/.test(n) ? "pitch" : /OSC$/.test(n) ? "osc" : /Level$/.test(n) ? "level" : /Pan$/.test(n) ? "pan" : /IFX$/.test(n) ? "ifx" : null;
  if (!cible) return null;
  const forme = /^EG\+/.test(n) ? "eg+" : /^EG-/.test(n) ? "eg-" : /^SawUp/.test(n) ? "saw-up" : /^SawDwn/.test(n) ? "saw-down" : /^SquUp/.test(n) ? "square-up" : /^SquDwn/.test(n) ? "square-down" : /^S&H/.test(n) ? "sh" : /^Random/.test(n) ? "random" : "tri";
  const bpm = /BPM|TriB|UpB|DwnB/.test(n);
  return { cible, forme, bpm };
}

export const engine = new Engine();

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" && e.key !== " ") return;
    const el = e.target as HTMLElement | null;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName))) {
      if (!(el.tagName === "BUTTON" && el.closest(".seqp"))) return;
    }
    e.preventDefault();
    if (!e.repeat) engine.space();
  });
  // Sur un bouton du lecteur, Espace ne doit pas aussi « cliquer » le bouton.
  window.addEventListener("keyup", (e) => {
    const el = e.target as HTMLElement | null;
    if ((e.code === "Space" || e.key === " ") && el?.tagName === "BUTTON" && el.closest(".seqp")) e.preventDefault();
  });
}

export function useEngine() {
  return useSyncExternalStore(engine.subscribe, () => engine.snap);
}

/** Lit des mesures écrites en texte : un caractère par pas.
 *  "." silence · "x" coup (= 0) · "0"…"9" rang dans la gamme · "O" octave · "~" tenue. */
export function pas(s: string): Pas[] {
  const out = [...s].map((ch): Pas => (ch === "." ? null : ch === "x" ? 0 : ch === "O" ? "O" : ch === "~" ? "~" : Number(ch)));
  if (out.length !== 16 || out.some((x) => typeof x === "number" && Number.isNaN(x))) throw new Error(`Mesure invalide : ${s}`);
  return out;
}
