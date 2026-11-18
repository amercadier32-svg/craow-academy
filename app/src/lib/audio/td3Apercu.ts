// Aperçu sonore d'une ligne TD-3 dans le navigateur : un oscillateur (dent de scie ou carré), un filtre passe-bas
// avec enveloppe, l'accent, le slide et une distorsion. Approximation pédagogique, pas le son réel de la TD-3.
// Passe par le moteur audio unique (sortie avec limiteur, un seul lecteur à la fois).
// Les réglages peuvent changer pendant la lecture (reglerTd3) : c'est ce qu'utilisent les potards des fiches.
import { contexte, declarerLecteur, liberer, prendreLaMain, sortie, SURECH } from "./moteurAudio";
import { demiTons, type PasTd3, type ReglagesTd3 } from "../../content/td3/recettes";

const NOM = "td3";
const BASE = 65.41;   // C grave de l'aperçu (fréquence en Hz)

/** Réglages de l'aperçu : ceux d'une recette, plus TUNE (0 à 10, 5 = centre) et VOLUME (0 à 10). */
export type ReglagesApercu = ReglagesTd3 & { tune?: number; volume?: number };

let arret: (() => void) | null = null;
let regler: ((r: Partial<ReglagesApercu>, bpm?: number) => void) | null = null;

export interface LectureTd3 { pas: PasTd3[]; bpm: number; reglages: ReglagesApercu; boucle: boolean; surPas?: (i: number) => void; surFin?: () => void }

export function arreterTd3() { arret?.(); }
/** Change un réglage pendant la lecture (sans rien relancer). */
export function reglerTd3(r: Partial<ReglagesApercu>, bpm?: number) { regler?.(r, bpm); }

function courbe(drive: number) {
  const k = 1 + drive * 4;
  const c = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
  return c;
}

export function jouerTd3(o: LectureTd3): void {
  arreterTd3();
  const c = contexte();
  prendreLaMain(NOM);
  let r: ReglagesApercu = { ...o.reglages };
  let pas16 = 60 / o.bpm / 4;

  const osc = c.createOscillator();
  const f1 = c.createBiquadFilter(); const f2 = c.createBiquadFilter();
  f1.type = f2.type = "lowpass"; f2.Q.value = 0.7;
  const vca = c.createGain(); vca.gain.value = 0;
  const sec = c.createGain(); const mouille = c.createGain();
  const ws = c.createWaveShaper(); ws.oversample = SURECH;
  const ton = c.createBiquadFilter(); ton.type = "lowpass";
  const niv = c.createGain();
  const vol = c.createGain();
  osc.connect(f1).connect(f2).connect(vca);
  vca.connect(sec).connect(vol);
  vca.connect(ws).connect(ton).connect(niv).connect(mouille).connect(vol);
  vol.connect(sortie());

  let coupure = 400, decay = 0.4, envMax = 2, dec = 0;
  const appliquer = () => {
    const now = c.currentTime;
    osc.type = r.waveform === "square" ? "square" : "sawtooth";
    f1.Q.setTargetAtTime(0.7 + (r.resonance / 10) * 14, now, 0.02);
    coupure = 60 * Math.pow(2, (r.cutoff / 10) * 6.5);           // environ 60 Hz à 5,4 kHz
    decay = 0.06 + (r.decay / 10) * 1.4;
    envMax = (r.envelope / 10) * 4.5;                              // octaves d'ouverture
    dec = ((r.tune ?? 5) - 5) / 5 * 12;                            // TUNE : environ une octave de chaque côté
    osc.detune.setTargetAtTime(dec * 100, now, 0.02);
    ws.curve = courbe(r.drive ?? 5);
    ton.frequency.setTargetAtTime(800 * Math.pow(10, (r.tone ?? 5) / 10), now, 0.02);
    niv.gain.setTargetAtTime(0.25 + ((r.level ?? 5) / 10) * 0.6, now, 0.02);
    sec.gain.setTargetAtTime(r.distortion ? 0 : 1, now, 0.01);
    mouille.gain.setTargetAtTime(r.distortion ? 1 : 0, now, 0.01);
    vol.gain.setTargetAtTime(0.5 * Math.pow((r.volume ?? 8) / 8, 2), now, 0.02);
  };
  appliquer();
  f1.frequency.value = coupure; f2.frequency.value = coupure;
  osc.frequency.value = BASE;

  let t0 = c.currentTime + 0.06;
  osc.start(t0);
  let i = 0;
  let fini = false;
  let precSlide = false;
  const timers: number[] = [];

  const planifier = () => {
    while (!fini && t0 < c.currentTime + 0.2) {
      const p = o.pas[i];
      const t = t0;
      if (p.t === "note") {
        const f = BASE * Math.pow(2, demiTons(p) / 12);
        const acc = p.acc ? 1 + r.accent / 10 : 1;
        if (precSlide) osc.frequency.setTargetAtTime(f, t, pas16 / 4);
        else {
          osc.frequency.setValueAtTime(f, t);
          // enveloppe du filtre (plus forte et plus courte avec l'accent) et du volume
          const pic = Math.min(coupure * Math.pow(2, envMax * acc), 12000);
          for (const fl of [f1, f2]) { fl.frequency.cancelScheduledValues(t); fl.frequency.setValueAtTime(pic, t); fl.frequency.setTargetAtTime(coupure, t + 0.003, (p.acc ? decay * 0.5 : decay) / 3); }
          vca.gain.cancelScheduledValues(t);
          vca.gain.setTargetAtTime(0.32 * acc, t, 0.002);
        }
        // durée : la note, plus ses TIE ; le slide tient jusqu'à la note suivante
        let n = 1;
        while (o.pas[(i + n) % o.pas.length]?.t === "tie" && n < o.pas.length) n++;
        if (!p.slide) vca.gain.setTargetAtTime(0, t + pas16 * (n - 0.5), 0.006);
        precSlide = Boolean(p.slide);
      } else if (p.t === "rest") {
        precSlide = false;
      }
      const ii = i;
      timers.push(window.setTimeout(() => o.surPas?.(ii), Math.max(0, (t - c.currentTime) * 1000)));
      t0 += pas16;
      i++;
      if (i >= o.pas.length) {
        if (o.boucle) i = 0;
        else { fini = true; timers.push(window.setTimeout(() => stop(), (t0 - c.currentTime) * 1000 + 50)); }
      }
    }
  };
  planifier();
  const iv = window.setInterval(planifier, 50);

  const stop = () => {
    if (arret !== stop) return;
    arret = null; regler = null;
    window.clearInterval(iv); timers.forEach((x) => window.clearTimeout(x));
    const now = c.currentTime;
    vol.gain.cancelScheduledValues(now);
    vol.gain.setTargetAtTime(0, now, 0.008);
    window.setTimeout(() => { try { osc.stop(); } catch { /* */ } vol.disconnect(); }, 120);
    liberer(NOM);
    o.surFin?.();
  };
  arret = stop;
  regler = (nv, bpm) => { r = { ...r, ...nv }; if (bpm) pas16 = 60 / bpm / 4; appliquer(); };
  declarerLecteur(NOM, stop);
}
