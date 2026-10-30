// Aperçu sonore du Guide des effets : le même petit motif de 4 mesures, joué sans puis avec l'effet.
// C'est une approximation pédagogique faite avec Web Audio : ce n'est pas le son réel de l'Electribe.
// Elle sert à entendre l'idée de l'effet (saturer, répéter, filtrer, faire bouger…), pas ses réglages exacts.
import { useSyncExternalStore } from "react";
import { engine as seqEngine } from "./seq";
import { contexte, declarerLecteur, liberer, prendreLaMain, quandNouveauContexte, sortie as sortieMoteur, telephone } from "./moteurAudio";

export type FxKind = "ifx" | "mfx" | "mod";
export type AB = "sans" | "avec" | "ab";

export interface FxParams {
  kind: FxKind;
  nom: string;          // nom exact de la liste du Guide (ex. « Overdrive », « EG+ BPM Filter »)
  ab: AB;               // sans effet, avec, ou 4 mesures sans puis 4 mesures avec
  loop: boolean;
  edit: number;         // potard Edit (IFX), 0…1 dans l'aperçu
  x: number; y: number; // pad tactile (MFX), 0…1
  depth: number; speed: number; // Depth / Speed (modulation), 0…1
  bpm: number;
}

export interface FxSnap { owner: string | null; bar: number; wet: boolean }

const BPM0 = 165;
const D3 = 50;
// Le motif commun : une basse en ré mineur (KEY = D, SCALE = Aeolian), un kick sur chaque temps, un charleston à contretemps.
// null = silence. Mesure 4 = petite relance.
const RIFF: (number | null)[][] = [
  [50, null, 50, 62, null, 50, 53, null, 50, null, 57, 50, null, 55, 53, null],
  [50, null, 50, 62, null, 50, 53, null, 50, null, 57, 50, null, 60, 57, null],
  [50, null, 50, 62, null, 50, 53, null, 50, null, 57, 50, null, 55, 53, null],
  [50, null, 50, 62, null, 50, 53, 55, 57, null, 60, 57, 62, 60, 57, 55],
];
export const MOTIF_TEXTE = "Basse en ré mineur (KEY = D, SCALE = Aeolian), kick sur chaque temps, charleston à contretemps, 165 BPM, 4 mesures.";

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const curve = (f: (x: number) => number, n = 2048): Float32Array<ArrayBuffer> => {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = f((i / (n - 1)) * 2 - 1);
  return c;
};

/** Un effet construit en Web Audio : une entrée, une sortie, une mise à jour en direct. */
interface Built {
  inp: AudioNode;
  out: AudioNode;
  update: (p: FxParams) => void;
  /** Effets rythmiques : appelé à chaque pas (t = début du pas, pos = 0…63, sd = durée d'un pas). */
  onStep?: (t: number, pos: number, sd: number, p: FxParams) => void;
  /** Effets qui jouent avec le séquenceur (Looper, Seq Reverse…) : quel pas faire entendre à la place. */
  mapStep?: (pos: number, p: FxParams) => { pos: number; semi?: number; skip?: boolean; speed?: number };
  stop?: () => void;
}

type Ctx = AudioContext;

function shaperFx(c: Ctx, make: (amt: number) => Float32Array<ArrayBuffer>, pre: (amt: number) => number, tone?: (amt: number) => number): Built {
  const inp = c.createGain(), sh = c.createWaveShaper(), lp = c.createBiquadFilter(), out = c.createGain();
  sh.oversample = "2x";
  lp.type = "lowpass";
  inp.connect(sh).connect(lp).connect(out);
  let last = -1;
  return {
    inp, out,
    update: (p) => {
      const a = clamp(p.edit);
      if (Math.abs(a - last) > 0.01) { sh.curve = make(a); last = a; }
      inp.gain.value = pre(a);
      lp.frequency.value = tone ? tone(a) : 9000;
      out.gain.value = 0.9 / Math.max(1, Math.sqrt(pre(a)) * 0.6);
    },
  };
}

/** Réduction de fréquence d'échantillonnage (Decimator) ou de résolution (Bit Crusher). */
function crushFx(c: Ctx, mode: "rate" | "bits", getAmt: (p: FxParams) => number): Built {
  // Téléphone : tampon plus grand (calcul moins souvent), pas de grésillement.
  const sp = c.createScriptProcessor(telephone ? 4096 : 1024, 1, 1);
  const inp = c.createGain(), out = c.createGain();
  let amt = 0.5, held = 0, cnt = 0;
  sp.onaudioprocess = (e) => {
    const i = e.inputBuffer.getChannelData(0), o = e.outputBuffer.getChannelData(0);
    if (mode === "rate") {
      const hold = 1 + Math.floor(amt * amt * 60);
      for (let k = 0; k < i.length; k++) { if (cnt++ % hold === 0) held = i[k]; o[k] = held; }
    } else {
      const bits = 12 - amt * 10.5, q = Math.pow(2, bits);
      for (let k = 0; k < i.length; k++) o[k] = Math.round(i[k] * q) / q;
    }
  };
  inp.connect(sp).connect(out);
  return { inp, out, update: (p) => { amt = clamp(getAmt(p)); }, stop: () => { sp.onaudioprocess = null; sp.disconnect(); } };
}

function ringFx(c: Ctx, getF: (p: FxParams) => number): Built {
  const inp = c.createGain(), vca = c.createGain(), out = c.createGain();
  vca.gain.value = 0;
  const o = c.createOscillator();
  o.type = "sine";
  o.connect(vca.gain);
  o.start();
  inp.connect(vca).connect(out);
  out.gain.value = 1.4;
  return { inp, out, update: (p) => { o.frequency.setTargetAtTime(getF(p), c.currentTime, 0.02); }, stop: () => o.stop() };
}

function compFx(c: Ctx, cfg: (p: FxParams) => { thr: number; ratio: number; att: number; rel: number; make: number }): Built {
  const inp = c.createGain(), cp = c.createDynamicsCompressor(), out = c.createGain();
  inp.connect(cp).connect(out);
  return {
    inp, out,
    update: (p) => {
      const k = cfg(p);
      cp.threshold.value = k.thr; cp.ratio.value = k.ratio; cp.attack.value = k.att; cp.release.value = k.rel; cp.knee.value = 3;
      out.gain.value = k.make;
    },
  };
}

function eqFx(c: Ctx, type: BiquadFilterType, f: number, q: number, getGain: (p: FxParams) => number): Built {
  const b = c.createBiquadFilter();
  b.type = type; b.frequency.value = f; b.Q.value = q;
  return { inp: b, out: b, update: (p) => { b.gain.value = getGain(p); } };
}

function filterFx(c: Ctx, type: BiquadFilterType, getF: (p: FxParams) => number, getQ: (p: FxParams) => number, mixDry = 0): Built {
  const inp = c.createGain(), b = c.createBiquadFilter(), out = c.createGain(), dry = c.createGain();
  b.type = type;
  inp.connect(b).connect(out);
  inp.connect(dry).connect(out);
  dry.gain.value = mixDry;
  return {
    inp, out,
    update: (p) => { b.frequency.setTargetAtTime(getF(p), c.currentTime, 0.03); b.Q.value = getQ(p); out.gain.value = type === "bandpass" ? 1.6 : 1; },
  };
}

/** Écho : temps (secondes), retour, mélange, et filtre dans la boucle de retour. */
function delayFx(c: Ctx, cfg: (p: FxParams) => { time: number; fb: number; wet: number; hp?: number; lp?: number; ring?: number; wobble?: number }): Built {
  const inp = c.createGain(), out = c.createGain(), d = c.createDelay(4), fb = c.createGain(), wet = c.createGain();
  const hp = c.createBiquadFilter(), lp = c.createBiquadFilter();
  hp.type = "highpass"; lp.type = "lowpass";
  const ringVca = c.createGain(); ringVca.gain.value = 1;
  const ringOsc = c.createOscillator(); const ringAmt = c.createGain(); ringAmt.gain.value = 0;
  ringOsc.frequency.value = 220; ringOsc.connect(ringAmt).connect(ringVca.gain); ringOsc.start();
  const wob = c.createOscillator(); const wobAmt = c.createGain(); wob.frequency.value = 0.7; wobAmt.gain.value = 0;
  wob.connect(wobAmt).connect(d.delayTime); wob.start();
  inp.connect(out);
  inp.connect(d);
  d.connect(hp).connect(lp).connect(ringVca);
  ringVca.connect(fb).connect(d);
  ringVca.connect(wet).connect(out);
  return {
    inp, out,
    update: (p) => {
      const k = cfg(p);
      d.delayTime.setTargetAtTime(k.time, c.currentTime, 0.05);
      fb.gain.value = Math.min(0.92, k.fb);
      wet.gain.value = k.wet;
      hp.frequency.value = k.hp ?? 20;
      lp.frequency.value = k.lp ?? 16000;
      ringAmt.gain.value = k.ring ? 1 : 0;
      ringVca.gain.value = k.ring ? 0 : 1;
      if (k.ring) ringOsc.frequency.value = k.ring;
      wobAmt.gain.value = k.wobble ?? 0;
    },
    stop: () => { ringOsc.stop(); wob.stop(); },
  };
}

/** Effets à ligne de retard courte modulée : chorus, flanger. */
function modDelayFx(c: Ctx, cfg: (p: FxParams) => { base: number; depth: number; rate: number; fb: number; wet: number }): Built {
  const inp = c.createGain(), out = c.createGain(), d = c.createDelay(0.1), fb = c.createGain(), wet = c.createGain();
  const lfo = c.createOscillator(), amt = c.createGain();
  lfo.type = "triangle";
  lfo.connect(amt).connect(d.delayTime);
  lfo.start();
  inp.connect(out); inp.connect(d); d.connect(fb).connect(d); d.connect(wet).connect(out);
  return {
    inp, out,
    update: (p) => {
      const k = cfg(p);
      d.delayTime.setTargetAtTime(k.base, c.currentTime, 0.03);
      amt.gain.value = k.depth; lfo.frequency.value = k.rate; fb.gain.value = k.fb; wet.gain.value = k.wet;
      out.gain.value = 0.8;
    },
    stop: () => lfo.stop(),
  };
}

function phaserFx(c: Ctx, cfg: (p: FxParams) => { center: number; depth: number; rate: number; fb: number }): Built {
  const inp = c.createGain(), out = c.createGain(), fb = c.createGain();
  const aps = Array.from({ length: 6 }, () => { const a = c.createBiquadFilter(); a.type = "allpass"; a.Q.value = 0.7; return a; });
  const lfo = c.createOscillator(), amt = c.createGain();
  lfo.type = "sine"; lfo.connect(amt); lfo.start();
  aps.forEach((a) => amt.connect(a.detune));
  inp.connect(aps[0]);
  for (let i = 0; i < aps.length - 1; i++) aps[i].connect(aps[i + 1]);
  aps[aps.length - 1].connect(fb).connect(aps[0]);
  inp.connect(out); aps[aps.length - 1].connect(out);
  out.gain.value = 0.6;
  return {
    inp, out,
    update: (p) => {
      const k = cfg(p);
      aps.forEach((a) => a.frequency.setTargetAtTime(k.center, c.currentTime, 0.03));
      amt.gain.value = k.depth; lfo.frequency.value = k.rate; fb.gain.value = k.fb;
    },
    stop: () => lfo.stop(),
  };
}

/** Effets de volume rythmiques : une enveloppe de volume posée à chaque pas. */
function gateFx(c: Ctx, shape: (t: number, pos: number, sd: number, g: AudioParam, p: FxParams) => void, free?: (p: FxParams) => { rate: number; depth: number }): Built {
  const inp = c.createGain(), vca = c.createGain(), out = c.createGain();
  inp.connect(vca).connect(out);
  let lfo: OscillatorNode | null = null, amt: GainNode | null = null;
  if (free) { lfo = c.createOscillator(); amt = c.createGain(); lfo.connect(amt).connect(vca.gain); lfo.start(); }
  return {
    inp, out,
    update: (p) => { if (free && lfo && amt) { const k = free(p); lfo.frequency.value = k.rate; amt.gain.value = k.depth * 0.5; vca.gain.value = 1 - k.depth * 0.5; } },
    onStep: free ? undefined : (t, pos, sd, p) => shape(t, pos, sd, vca.gain, p),
    stop: () => lfo?.stop(),
  };
}

function reverbFx(c: Ctx, kind: "hall" | "room" | "wet"): Built {
  const inp = c.createGain(), out = c.createGain(), conv = c.createConvolver(), wet = c.createGain(), pre = c.createDelay(0.2), lp = c.createBiquadFilter();
  lp.type = "lowpass";
  const len = kind === "hall" ? 3.2 : kind === "room" ? 0.9 : 2.2;
  const n = Math.floor(c.sampleRate * len), buf = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, kind === "room" ? 3.5 : 2.2);
  }
  conv.buffer = buf;
  inp.connect(out);
  inp.connect(pre).connect(conv).connect(lp).connect(wet).connect(out);
  return {
    inp, out,
    update: (p) => {
      // X : longueur perçue (filtre de la queue) ; Y : quantité d'effet. Interprétation.
      lp.frequency.value = 1500 + clamp(p.x) * 9000;
      pre.delayTime.value = kind === "room" ? 0.008 : 0.03 + clamp(p.x) * 0.06;
      wet.gain.value = (kind === "wet" ? 1.4 : 0.9) * (0.15 + clamp(p.y) * 0.85);
      out.gain.value = kind === "wet" ? 0.75 : 0.9;
    },
  };
}

function panFx(c: Ctx, getRate: (p: FxParams) => number, getDepth: (p: FxParams) => number): Built {
  const pan = c.createStereoPanner(), lfo = c.createOscillator(), amt = c.createGain();
  lfo.connect(amt).connect(pan.pan); lfo.start();
  return { inp: pan, out: pan, update: (p) => { lfo.frequency.value = getRate(p); amt.gain.value = getDepth(p); }, stop: () => lfo.stop() };
}

function chain(c: Ctx, a: Built, b: Built): Built {
  a.out.connect(b.inp);
  return {
    inp: a.inp, out: b.out,
    update: (p) => { a.update(p); b.update(p); },
    onStep: a.onStep || b.onStep ? (t, pos, sd, p) => { a.onStep?.(t, pos, sd, p); b.onStep?.(t, pos, sd, p); } : undefined,
    mapStep: a.mapStep ?? b.mapStep,
    stop: () => { a.stop?.(); b.stop?.(); },
  };
}

function seqOnly(c: Ctx, map: Built["mapStep"]): Built {
  const g = c.createGain();
  return { inp: g, out: g, update: () => {}, mapStep: map };
}

const SYNC = [64, 32, 16, 8, 4, 2, 1, 0.5]; // durée en pas : 4 mesures … 1/32

/** Construit l'effet Insert Fx / Master Fx demandé. Les choix de réglage sont des approximations. */
function buildFx(c: Ctx, kind: "ifx" | "mfx", nom: string, bpm: number): Built {
  const sd = 60 / bpm / 4;
  const E = (p: FxParams) => clamp(p.edit);
  const X = (p: FxParams) => clamp(p.x), Y = (p: FxParams) => clamp(p.y);
  const A = kind === "ifx" ? E : X;            // réglage principal
  const B = kind === "ifx" ? (() => 0.5) : Y;  // réglage secondaire (MFX)
  const syncTime = (frac: number) => frac * 16 * sd; // frac = fraction de mesure

  switch (nom) {
    case "Punch": return chain(c,
      compFx(c, (p) => ({ thr: -18 - A(p) * 18, ratio: 3 + A(p) * 9, att: 0.012, rel: 0.09, make: 1 + A(p) * 1.4 })),
      eqFx(c, "lowshelf", 110, 0.7, (p) => A(p) * 9));
    case "Overdrive":
      return shaperFx(c, (a) => curve((x) => Math.tanh((1 + a * 6) * x) / Math.tanh(1 + a * 6)), (a) => 1 + a * 5, (a) => 7000 - a * 3000);
    case "Distortion":
      return shaperFx(c, (a) => curve((x) => { const y = x * (1 + a * 30); return Math.max(-0.35, Math.min(0.35, y)) / 0.35; }), (a) => 1 + a * 3, (a) => 6000 - a * 2500);
    case "Decimator": return crushFx(c, "rate", A);
    case "Bit Crusher": return crushFx(c, "bits", A);
    case "Ring Modulator": return ringFx(c, (p) => 30 * Math.pow(2, A(p) * 7));
    case "Sustainer": return compFx(c, (p) => ({ thr: -20 - A(p) * 30, ratio: 12, att: 0.003, rel: 0.4 + A(p) * 0.6, make: 1.2 + A(p) * 3 }));
    case "Limiter": return compFx(c, (p) => ({ thr: -6 - A(p) * 24, ratio: 20, att: 0.001, rel: 0.08, make: 1 + A(p) * 2.2 }));
    case "Compressor": return compFx(c, (p) => ({ thr: -10 - A(p) * 30, ratio: 2 + B(p) * 10, att: 0.01, rel: 0.15, make: 1 + A(p) * 2 }));
    case "Low EQ": return eqFx(c, "lowshelf", 120, 0.7, (p) => (A(p) - 0.5) * 30);
    case "Mid EQ": return eqFx(c, "peaking", 1000, 1.2, (p) => (A(p) - 0.5) * 30);
    case "High EQ": return eqFx(c, "highshelf", 4500, 0.7, (p) => (A(p) - 0.5) * 30);
    case "Radio EQ": return chain(c, filterFx(c, "bandpass", (p) => 700 + A(p) * 2500, () => 1.4), shaperFx(c, () => curve((x) => Math.tanh(2.5 * x)), () => 1.6));
    case "Exciter": {
      const inp = c.createGain(), hp = c.createBiquadFilter(), sh = c.createWaveShaper(), amt = c.createGain(), out = c.createGain();
      hp.type = "highpass"; hp.frequency.value = 3000; sh.curve = curve((x) => Math.tanh(4 * x));
      inp.connect(out); inp.connect(hp).connect(sh).connect(amt).connect(out);
      return { inp, out, update: (p) => { amt.gain.value = A(p) * 0.9; hp.frequency.value = 5000 - A(p) * 2500; } };
    }
    case "Tube EQ": return chain(c, eqFx(c, "lowshelf", 150, 0.7, (p) => (X(p) - 0.5) * 18), chain(c, eqFx(c, "highshelf", 5000, 0.7, (p) => (Y(p) - 0.5) * 18), shaperFx(c, () => curve((x) => Math.tanh(1.8 * x)), () => 1.2)));
    case "Low Pass Filter": return filterFx(c, "lowpass", (p) => 80 * Math.pow(2, A(p) * 7.5), (p) => kind === "ifx" ? 4 : 0.7 + B(p) * 16);
    case "High Pass Filter": return filterFx(c, "highpass", (p) => 30 * Math.pow(2, A(p) * 8), (p) => kind === "ifx" ? 4 : 0.7 + B(p) * 16);
    case "Band Plus Filter": return filterFx(c, "bandpass", (p) => 120 * Math.pow(2, A(p) * 6.5), (p) => kind === "ifx" ? 5 : 1 + B(p) * 12, 0.35);
    case "Talk Filter": {
      const inp = c.createGain(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), out = c.createGain();
      [f1, f2].forEach((f) => { f.type = "bandpass"; f.Q.value = 8; inp.connect(f).connect(out); });
      out.gain.value = 3;
      // De « ou » (Edit à gauche) à « a » puis « i » (Edit à droite) : deux formants qui bougent ensemble.
      return { inp, out, update: (p) => { const a = A(p); f1.frequency.setTargetAtTime(300 + a * 500, c.currentTime, 0.03); f2.frequency.setTargetAtTime(800 + a * 1600, c.currentTime, 0.03); } };
    }
    case "Touch Wah": return filterFx(c, "bandpass", (p) => 300 * Math.pow(2, X(p) * 4), (p) => 3 + Y(p) * 10, 0.2);
    case "Jag Filter": {
      // Le filtre saute par paliers au hasard, au rythme des pas (comme un échantillonneur-bloqueur).
      const inp = c.createGain(), bq = c.createBiquadFilter(), out = c.createGain();
      bq.type = "lowpass"; inp.connect(bq).connect(out); out.gain.value = 1.1;
      return {
        inp, out,
        update: (p) => { bq.Q.value = 2 + Y(p) * 12; },
        onStep: (t, pos, _sd, p) => {
          const every = 4 - Math.round(X(p) * 3); // X à droite : un saut à chaque pas
          if (pos % every === 0) bq.frequency.setValueAtTime(250 + Math.random() * (1200 + Y(p) * 5000), t);
        },
      };
    }
    case "Delay 1/4": return delayFx(c, (p) => ({ time: syncTime(1 / 4), fb: 0.25 + A(p) * 0.5, wet: 0.2 + A(p) * 0.6 }));
    case "Delay 3/16": return delayFx(c, (p) => ({ time: syncTime(3 / 16), fb: 0.25 + A(p) * 0.5, wet: 0.2 + A(p) * 0.6 }));
    case "Delay 1/8": return delayFx(c, (p) => ({ time: syncTime(1 / 8), fb: 0.25 + A(p) * 0.5, wet: 0.2 + A(p) * 0.6 }));
    case "Delay 1/16": return delayFx(c, (p) => ({ time: syncTime(1 / 16), fb: 0.25 + A(p) * 0.5, wet: 0.2 + A(p) * 0.6 }));
    case "Roller 1/32": return delayFx(c, (p) => ({ time: syncTime(1 / 32), fb: 0.5 + A(p) * 0.42, wet: 0.3 + A(p) * 0.6 }));
    case "One Delay": return delayFx(c, (p) => ({ time: 0.05 + A(p) * 0.6, fb: 0, wet: 0.7 }));
    case "Short Delay": return delayFx(c, (p) => ({ time: 0.01 + A(p) * 0.07, fb: 0.2, wet: 0.6 }));
    case "Ring Delay 1": return delayFx(c, (p) => ({ time: syncTime(3 / 16), fb: 0.5, wet: 0.6, ring: 200 + A(p) * 1200 }));
    case "Ring Delay 2": return delayFx(c, (p) => ({ time: syncTime(1 / 8), fb: 0.6, wet: 0.6, ring: 400 + A(p) * 2400 }));
    case "Mod Delay": return delayFx(c, (p) => ({ time: syncTime(1 / 16) + X(p) * syncTime(5 / 16), fb: 0.2 + Y(p) * 0.65, wet: 0.6, wobble: 0.004 }));
    case "Tape Delay": return delayFx(c, (p) => ({ time: syncTime(1 / 16) + X(p) * syncTime(5 / 16), fb: 0.2 + Y(p) * 0.7, wet: 0.6, lp: 2800, wobble: 0.0025 }));
    case "High Pass Delay": return delayFx(c, (p) => ({ time: syncTime(1 / 16) + X(p) * syncTime(5 / 16), fb: 0.2 + Y(p) * 0.65, wet: 0.6, hp: 900 }));
    case "Hall Reverb": return reverbFx(c, "hall");
    case "Room Reverb": return reverbFx(c, "room");
    case "Wet Reverb": return reverbFx(c, "wet");
    case "Chorus": return modDelayFx(c, (p) => ({ base: 0.018, depth: 0.004 * (0.3 + A(p)), rate: 0.4 + B(p) * 2, fb: 0, wet: 0.8 }));
    case "Flanger LFO": case "LFO Flanger": return modDelayFx(c, (p) => ({ base: 0.004, depth: 0.003, rate: 0.1 + A(p) * 2, fb: 0.7, wet: 0.7 }));
    case "Flanger +": return modDelayFx(c, (p) => ({ base: 0.0015 + A(p) * 0.008, depth: 0, rate: 0.1, fb: 0.75, wet: 0.7 }));
    case "Flanger -": return modDelayFx(c, (p) => ({ base: 0.0015 + A(p) * 0.008, depth: 0, rate: 0.1, fb: -0.75, wet: 0.7 }));
    case "XY Flanger": return modDelayFx(c, (p) => ({ base: 0.001 + X(p) * 0.009, depth: 0, rate: 0.1, fb: -0.2 + Y(p) * 1.05 > 0.9 ? 0.9 : -0.2 + Y(p) * 1.05, wet: 0.7 }));
    case "Phaser LFO 1": return phaserFx(c, (p) => ({ center: 700, depth: 1200, rate: 0.1 + A(p) * 2, fb: 0.4 }));
    case "Phaser LFO 2": return phaserFx(c, (p) => ({ center: 1200, depth: 1800, rate: 0.1 + A(p) * 4, fb: 0.7 }));
    case "LFO Phaser": return phaserFx(c, (p) => ({ center: 900, depth: 1500, rate: 0.1 + X(p) * 3, fb: 0.2 + Y(p) * 0.6 }));
    case "Phaser Manual": return phaserFx(c, (p) => ({ center: 150 * Math.pow(2, A(p) * 6), depth: 0, rate: 0.1, fb: 0.6 }));
    case "XY Phaser": return phaserFx(c, (p) => ({ center: 150 * Math.pow(2, X(p) * 6), depth: 0, rate: 0.1, fb: Y(p) * 0.85 }));
    case "Tremolo": return gateFx(c, () => {}, (p) => ({ rate: 1 + A(p) * 11, depth: 0.9 }));
    case "Auto Pan": return panFx(c, (p) => 0.2 + X(p) * 6, (p) => 0.3 + Y(p) * 0.7);
    case "Off Beater": return gateFx(c, (t, pos, sdur, g, p) => {
      // Le volume se creuse sur chaque temps et remonte entre les temps : la partie sonne « à contretemps ».
      if (pos % 4 !== 0) return;
      g.cancelScheduledValues(t); g.setValueAtTime(0.05, t); g.linearRampToValueAtTime(1, t + sdur * (1.2 + A(p) * 2.6));
    });
    case "Pumper": return gateFx(c, (t, pos, sdur, g, p) => {
      if (pos % 4 !== 0) return;
      g.cancelScheduledValues(t); g.setValueAtTime(1 - (0.4 + A(p) * 0.58), t); g.setTargetAtTime(1, t + sdur * 0.3, sdur * (0.8 + A(p) * 0.8));
    });
    case "Slicer": return gateFx(c, (t, pos, sdur, g, p) => {
      // Découpe le son en tranches régulières. IFX : Edit = finesse. MFX : X = finesse, Y = longueur des tranches (interprétation).
      const per = [2, 1, 0.5, 0.25][Math.min(3, Math.floor((kind === "ifx" ? A(p) : X(p)) * 4))]; // en pas
      const len = kind === "ifx" ? 0.5 : 0.2 + Y(p) * 0.7;
      if (per >= 1) { if (pos % per !== 0) return; g.setValueAtTime(1, t); g.setValueAtTime(0, t + per * sdur * len); return; }
      for (let k = 0; k < 1 / per; k++) { const t0 = t + k * per * sdur; g.setValueAtTime(1, t0); g.setValueAtTime(0, t0 + per * sdur * len); }
    });
    case "Repeater": return gateFx(c, (t, pos, sdur, g, p) => {
      const n = 1 + Math.floor(A(p) * 4); // nombre de répétitions par pas
      for (let k = 0; k < n; k++) { const t0 = t + (k * sdur) / n; g.setValueAtTime(1, t0); g.setValueAtTime(0.15, t0 + (sdur / n) * 0.6); }
    });
    // ----- Effets qui rejouent des morceaux du motif (approximation au niveau des pas) -----
    case "Looper": return seqOnly(c, (pos, p) => { const L = SYNC[2 + Math.floor(X(p) * 5.99)]; const start = pos - (pos % 16); return { pos: start + (pos % L) }; });
    case "Pitch Looper": return seqOnly(c, (pos, p) => { const L = SYNC[3 + Math.floor(X(p) * 4.99)]; const k = Math.floor((pos % 16) / L); return { pos: pos - (pos % 16) + (pos % L), semi: (Y(p) - 0.5) * 24 * (k / 4) }; });
    case "Step Shifter": return seqOnly(c, (pos, p) => { const sh = Math.floor(X(p) * 7.99) + 1; return { pos: pos - (pos % 16) + ((pos % 16) + sh * (Y(p) > 0.5 ? 2 : 1)) % 16 }; });
    case "Grain Shifter": return seqOnly(c, (pos, p) => { const L = Math.max(1, Math.round(1 + X(p) * 3)); return { pos: pos - (pos % L), speed: 1 + Y(p) * 2 }; });
    case "Vinyl Break": return seqOnly(c, (pos, p) => { const i = pos % 16; return { pos, semi: -i * (0.5 + X(p) * 2), skip: i > 8 + Y(p) * 7 }; });
    case "Seq Reverse": return seqOnly(c, (pos) => ({ pos: pos - (pos % 16) + 15 - (pos % 16) }));
    case "Seq Doubler": return seqOnly(c, (pos) => ({ pos: pos - (pos % 16) + ((pos % 16) * 2) % 16 }));
    case "Odd Stepper": return seqOnly(c, (pos) => ({ pos: pos - (pos % 2) }));
    case "Even Stepper": return seqOnly(c, (pos) => ({ pos: pos - (pos % 2) + 1 }));
    default: { const g = c.createGain(); return { inp: g, out: g, update: () => {} }; }
  }
}

// ---------- Modulations : source (LFO ou enveloppe) → destination ----------
export interface ModInfo {
  source: "EG+" | "EG-" | "LFOTri" | "LFOTriB" | "SawUpB" | "SawDwnB" | "SquUpB" | "SquDwnB" | "S&HBPM" | "Random";
  dest: "Filter" | "Pitch" | "OSC" | "Level" | "Pan" | "IFX";
  bpm: boolean;
  key: boolean;
}

export function parseMod(nom: string): ModInfo {
  const dest = nom.split(" ").pop() as ModInfo["dest"];
  const first = nom.split(" ")[0];
  const source = first as ModInfo["source"];
  const bpm = / BPM /.test(nom) || /B$/.test(first) || first === "S&HBPM";
  const key = /B$/.test(first);
  return { source, dest, bpm, key };
}

/** Vitesse de l'aperçu : Hz si libre, ou durée en pas si synchro au tempo (interprétation : le Guide ne donne pas les valeurs). */
export function vitesseApercu(info: ModInfo, speed: number, bpm = BPM0) {
  const sd = 60 / bpm / 4;
  if (info.bpm) {
    const pasN = SYNC[Math.min(SYNC.length - 1, Math.floor(clamp(speed) * SYNC.length))];
    return { hz: 1 / (pasN * sd), label: pasN >= 16 ? `${pasN / 16} mesure${pasN > 16 ? "s" : ""}` : `1/${16 / pasN}` };
  }
  const h = 0.1 * Math.pow(2, clamp(speed) * 7.6);
  return { hz: h, label: `${h.toFixed(h < 1 ? 2 : 1)} Hz` };
}

// ---------- Moteur de l'aperçu ----------
class FxEngine {
  private c: Ctx | null = null;
  private noise: AudioBuffer | null = null;
  private p: FxParams | null = null;
  private timer = 0;
  private raf = 0;
  private pos = 0;
  private total = 64;
  private next = 0;
  private queue: { t: number; pos: number }[] = [];
  private fx: Built | null = null;
  private nodes: { synth: GainNode; hats: GainNode; dry: GainNode; wet: GainNode; out: GainNode; kick: GainNode; modDist?: { dry: GainNode; wet: GainNode } } | null = null;
  private globalLfo: { osc: OscillatorNode | ConstantSourceNode; kind: string } | null = null;
  private wetNow = false;
  private listeners = new Set<() => void>();
  snap: FxSnap = { owner: null, bar: -1, wet: false };

  subscribe = (f: () => void) => { this.listeners.add(f); return () => this.listeners.delete(f); };
  private emit(s: FxSnap) { this.snap = s; this.listeners.forEach((f) => f()); }

  constructor() {
    declarerLecteur("effets", () => this.stop());
    quandNouveauContexte(() => { this.stop(); this.c = null; });
  }

  // Le contexte du moteur audio partagé (lib/moteurAudio.ts).
  private ctx() {
    if (!this.c) {
      this.c = contexte();
      const n = this.c.sampleRate;
      this.noise = this.c.createBuffer(1, n, n);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    contexte();   // réveille le contexte s'il dormait
    return this.c;
  }

  private build() {
    const c = this.c!, p = this.p!;
    const out = c.createGain(); out.gain.value = 0.5;
    const lim = c.createDynamicsCompressor(); lim.threshold.value = -6; lim.ratio.value = 12;
    out.connect(lim).connect(sortieMoteur());
    const kick = c.createGain(); kick.connect(out);
    const synth = c.createGain(), hats = c.createGain();
    const dry = c.createGain(), wet = c.createGain();
    const sum = c.createGain();
    this.nodes = { synth, hats, dry, wet, out, kick };
    if (p.kind === "mod") {
      synth.connect(out); hats.connect(out);
      // Destination « IFX » : la modulation fait varier le mélange d'une saturation (approximation de l'Edit de l'IFX).
      const d = c.createGain(), w = c.createGain(), sh = c.createWaveShaper();
      sh.curve = curve((x) => Math.tanh(8 * x) * 0.6);
      synth.disconnect();
      synth.connect(d).connect(out); synth.connect(sh).connect(w).connect(out);
      d.gain.value = 1; w.gain.value = 0;
      this.nodes.modDist = { dry: d, wet: w };
      this.fx = null;
      return;
    }
    this.fx = buildFx(c, p.kind, p.nom, p.bpm);
    // IFX : seule la basse passe dans l'effet. MFX : basse et charleston (MFX Send = ON), le kick reste sec.
    const into = c.createGain();
    synth.connect(into);
    if (p.kind === "mfx") hats.connect(into); else hats.connect(out);
    into.connect(dry).connect(sum);
    into.connect(this.fx.inp); this.fx.out.connect(wet).connect(sum);
    sum.connect(out);
    this.fx.update(p);
    this.setWet(false, c.currentTime);
  }

  private setWet(w: boolean, t: number) {
    this.wetNow = w;
    const n = this.nodes;
    if (!n) return;
    n.dry.gain.setTargetAtTime(w ? 0 : 1, t, 0.01);
    n.wet.gain.setTargetAtTime(w ? 1 : 0, t, 0.01);
  }

  play(owner: string, p: FxParams) {
    this.stop();
    prendreLaMain("effets");
    const c = this.ctx();
    this.p = { ...p };
    this.build();
    this.pos = 0;
    this.total = p.ab === "ab" ? 128 : 64;
    this.next = c.currentTime + 0.08;
    this.queue = [];
    this.emit({ owner, bar: 0, wet: p.ab === "avec" });
    this.timer = window.setInterval(() => this.tick(), 25);
    this.tick();
    const frame = () => { this.frame(); if (this.snap.owner) this.raf = requestAnimationFrame(frame); };
    this.raf = requestAnimationFrame(frame);
  }

  /** Change un réglage pendant la lecture. */
  set(owner: string, p: Partial<FxParams>) {
    if (!this.p || this.snap.owner !== owner) return;
    const abChange = p.ab && p.ab !== this.p.ab;
    Object.assign(this.p, p);
    this.fx?.update(this.p);
    if (abChange) this.total = this.p.ab === "ab" ? 128 : 64;
  }

  stop() {
    clearInterval(this.timer);
    cancelAnimationFrame(this.raf);
    this.fx?.stop?.();
    const n = this.nodes;
    if (n && this.c) { const t = this.c.currentTime; n.out.gain.setTargetAtTime(0, t, 0.02); const o = n.out; setTimeout(() => o.disconnect(), 200); }
    if (this.globalLfo) { try { (this.globalLfo.osc as OscillatorNode).stop(); } catch { /* déjà arrêté */ } this.globalLfo = null; }
    this.nodes = null; this.fx = null; this.p = null; this.queue = [];
    liberer("effets");
    if (this.snap.owner) this.emit({ owner: null, bar: -1, wet: false });
  }

  private wetAt(pos: number) {
    const p = this.p!;
    return p.ab === "avec" ? true : p.ab === "sans" ? false : pos >= 64;
  }

  private tick() {
    const c = this.c, p = this.p;
    if (!c || !p) return;
    const sd = 60 / p.bpm / 4;
    while (this.next < c.currentTime + 0.12) {
      if (this.pos >= this.total) {
        if (p.loop) this.pos = 0;
        else { if (c.currentTime > this.next + 0.05) { this.stop(); return; } break; }
      }
      this.schedule(this.pos, this.next, sd);
      this.queue.push({ t: this.next, pos: this.pos });
      this.next += sd;
      this.pos++;
    }
  }

  private frame() {
    const c = this.c;
    if (!c) return;
    let pos = -1;
    while (this.queue.length && this.queue[0].t <= c.currentTime) pos = this.queue.shift()!.pos;
    if (pos >= 0) {
      const bar = Math.floor((pos % 64) / 16), wet = this.p ? this.wetAt(pos) : false;
      if (bar !== this.snap.bar || wet !== this.snap.wet) this.emit({ owner: this.snap.owner, bar, wet });
    }
    if (this.p && !this.p.loop && this.pos >= this.total && this.queue.length === 0) this.stop();
  }

  private schedule(pos: number, t: number, sd: number) {
    const p = this.p!, n = this.nodes!;
    const wet = this.wetAt(pos);
    if (wet !== this.wetNow && p.kind !== "mod") this.setWet(wet, t);
    this.wetNow = wet;
    const lp = pos % 64, bar = Math.floor(lp / 16), i = lp % 16;
    if (i % 4 === 0) this.kick(t, n.kick);
    let srcPos = lp, semi = 0, speed = 1, skip = false;
    if (wet && this.fx?.mapStep) { const m = this.fx.mapStep(lp, p); srcPos = ((m.pos % 64) + 64) % 64; semi = m.semi ?? 0; skip = Boolean(m.skip); speed = m.speed ?? 1; }
    if (wet && this.fx?.onStep) this.fx.onStep(t, lp, sd, p);
    const sb = Math.floor(srcPos / 16), si = srcPos % 16;
    if (!skip) {
      if (si % 4 === 2) this.hat(t, n.hats);
      const note = RIFF[sb][si];
      if (note !== null) this.voice(t, note + semi, sd * 0.9 / speed, n.synth, wet);
    }
    void bar;
  }

  private kick(t: number, out: AudioNode) {
    const c = this.c!, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.06);
    g.gain.setValueAtTime(0.9, t); g.gain.setTargetAtTime(0.0001, t + 0.02, 0.06);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.4);
  }

  private hat(t: number, out: AudioNode) {
    const c = this.c!, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = "highpass"; f.frequency.value = 7500;
    g.gain.setValueAtTime(0.25, t); g.gain.setTargetAtTime(0.0001, t + 0.005, 0.02);
    s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + 0.15);
  }

  private voice(t: number, midi: number, dur: number, out: AudioNode, wet: boolean) {
    const c = this.c!, p = this.p!;
    const o1 = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), amp = c.createGain(), pan = c.createStereoPanner();
    o1.type = "sawtooth"; o2.type = "sawtooth";
    o1.frequency.value = hz(midi); o2.frequency.value = hz(midi); o2.detune.value = 7;
    f.type = "lowpass"; f.Q.value = 6; f.frequency.setValueAtTime(2400, t); f.frequency.setTargetAtTime(700, t + 0.005, 0.08);
    const mix = c.createGain(); mix.gain.value = 0.5;
    o1.connect(mix); o2.connect(mix);
    mix.connect(f).connect(amp).connect(pan).connect(out);
    amp.gain.setValueAtTime(0.0001, t); amp.gain.linearRampToValueAtTime(0.45, t + 0.004);
    amp.gain.setValueAtTime(0.45, t + dur * 0.8); amp.gain.setTargetAtTime(0.0001, t + dur * 0.8, 0.03);
    const end = t + dur + 0.25;
    o1.start(t); o2.start(t); o1.stop(end); o2.stop(end);
    if (p.kind === "mod" && wet) this.modulate(t, end, { f, o1, o2, amp, pan });
  }

  /** Applique la modulation à une note : source (LFO / enveloppe) → destination. Approximation. */
  private modulate(t: number, end: number, v: { f: BiquadFilterNode; o1: OscillatorNode; o2: OscillatorNode; amp: GainNode; pan: StereoPannerNode }) {
    const c = this.c!, p = this.p!, info = parseMod(p.nom);
    const depth = clamp(p.depth);
    if (depth < 0.01) return;
    const { hz: rate } = vitesseApercu(info, p.speed, p.bpm);
    // Signal de modulation entre -1 et +1 (enveloppe : 0 → 1 → 0).
    const sig = c.createGain(); sig.gain.value = 1;
    const sources: AudioScheduledSourceNode[] = [];
    if (info.source === "EG+" || info.source === "EG-") {
      const cs = c.createConstantSource(); cs.offset.value = 0;
      const sign = info.source === "EG+" ? 1 : -1;
      const decay = 1 / rate; // Speed = longueur de l'enveloppe (interprétation)
      cs.offset.setValueAtTime(0, t); cs.offset.linearRampToValueAtTime(sign, t + 0.005); cs.offset.setTargetAtTime(0, t + 0.005, decay / 3);
      cs.connect(sig); cs.start(t); cs.stop(end); sources.push(cs);
    } else if (info.source === "S&HBPM" || info.source === "Random") {
      const cs = c.createConstantSource();
      const per = 1 / rate;
      // Valeur au hasard : par paliers (S&H) ou en glissant (Random). Phase libre : calée sur l'horloge, pas sur la note.
      let k = Math.floor(t / per) * per, first = true;
      while (k < end) {
        const val = Math.random() * 2 - 1;
        if (info.source === "S&HBPM" || first) cs.offset.setValueAtTime(val, Math.max(t, k)); else cs.offset.linearRampToValueAtTime(val, k);
        first = false; k += per;
      }
      cs.connect(sig); cs.start(t); cs.stop(end); sources.push(cs);
    } else {
      const type: OscillatorType = /Saw/.test(info.source) ? "sawtooth" : /Squ/.test(info.source) ? "square" : "triangle";
      const inv = /Dwn/.test(info.source) ? -1 : 1;
      if (info.key) {
        // Key Sync : le LFO repart de zéro à chaque note.
        const o = c.createOscillator(); o.type = type; o.frequency.value = rate;
        const g = c.createGain(); g.gain.value = inv;
        o.connect(g).connect(sig); o.start(t); o.stop(end); sources.push(o);
      } else {
        // Sans Key Sync : un seul LFO qui tourne en continu, la note le prend où il en est.
        if (!this.globalLfo || this.globalLfo.kind !== type + rate.toFixed(3)) {
          if (this.globalLfo) { try { (this.globalLfo.osc as OscillatorNode).stop(); } catch { /* */ } }
          const o = c.createOscillator(); o.type = type; o.frequency.value = rate; o.start();
          this.globalLfo = { osc: o, kind: type + rate.toFixed(3) };
        }
        const g = c.createGain(); g.gain.value = inv;
        this.globalLfo.osc.connect(g); g.connect(sig);
        setTimeout(() => { try { g.disconnect(); } catch { /* */ } }, (end - c.currentTime) * 1000 + 300);
      }
    }
    const amt = c.createGain();
    sig.connect(amt);
    switch (info.dest) {
      case "Filter": amt.gain.value = depth * 3600; amt.connect(v.f.detune); break;
      case "Pitch": amt.gain.value = depth * 1200; amt.connect(v.o1.detune); amt.connect(v.o2.detune); break;
      case "OSC": { amt.gain.value = depth * 900; amt.connect(v.o2.detune); break; }
      case "Level": {
        // Le volume ne peut pas descendre sous zéro : le signal module autour de la moitié.
        const vca = c.createGain(); vca.gain.value = 1 - depth * 0.5; amt.gain.value = depth * 0.5;
        v.amp.disconnect(); v.amp.connect(vca).connect(v.pan); amt.connect(vca.gain); break;
      }
      case "Pan": amt.gain.value = depth; amt.connect(v.pan.pan); break;
      case "IFX": {
        const md = this.nodes?.modDist;
        if (md) { const w = c.createGain(); w.gain.value = 0; v.pan.disconnect(); v.pan.connect(md.dry); amt.gain.value = depth; void w; amt.connect(md.wet.gain); }
        break;
      }
    }
    void sources;
  }
}

export const fxEngine = new FxEngine();

// La touche Espace lance ou arrête l'aperçu en cours (même convention que les autres lecteurs).
const toggles = new Map<string, () => void>();
let lastOwner: string | null = null;
export function registerFx(owner: string, toggle: () => void) {
  toggles.set(owner, toggle);
  lastOwner = owner;
  const off = seqEngine.register(owner, () => { if (fxEngine.snap.owner) fxEngine.stop(); else toggle(); });
  return () => { toggles.delete(owner); if (lastOwner === owner) lastOwner = null; off(); };
}
export function touchFx(owner: string) { lastOwner = owner; seqEngine.touch(owner); }

export function useFx() {
  return useSyncExternalStore(fxEngine.subscribe, () => fxEngine.snap);
}

export const BPM_APERCU = BPM0;
export const NOTE_BASSE = D3;
