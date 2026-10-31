// Mesures en direct pour le Visualiseur : spectre, forme d'onde, stéréo (largeur, phase, grave centré),
// note dominante (estimation) et détection du kick. Lit l'entrée ouverte par audioEntree.ts.
import { telephone } from "./moteurAudio";
import { contexteEntree, signalerErreurAffichage, sortieEntree } from "./audioEntree";
import { FREQS_SPECTRE } from "./masterAnalyse";
import { nomMidi } from "./music";

interface Noeuds { ctx: AudioContext; sortie: GainNode; aM: AnalyserNode; aL: AnalyserNode; aR: AnalyserNode; bL: AnalyserNode; bR: AnalyserNode; wL: AnalyserNode; wR: AnalyserNode }
let noeuds: Noeuds | null = null;

/** Crée (une fois par entrée ouverte) les analyseurs du visualiseur. */
function brancher(): Noeuds | null {
  const ctx = contexteEntree(), sortie = sortieEntree();
  if (!ctx || !sortie) { noeuds = null; return null; }
  // Même contexte mais nouvelle `sortie` (entrée refermée puis rouverte) : les anciens analyseurs sont débranchés, on les refait.
  if (noeuds && noeuds.ctx === ctx && noeuds.sortie === sortie) return noeuds;
  try { return creerNoeuds(ctx, sortie); }
  catch { noeuds = null; signalerErreurAffichage(); return null; }
}
function creerNoeuds(ctx: AudioContext, sortie: GainNode): Noeuds {
  const mono = ctx.createGain(); mono.channelCount = 1; mono.channelCountMode = "explicit"; mono.channelInterpretation = "speakers";
  sortie.connect(mono);
  const aM = ctx.createAnalyser(); aM.fftSize = telephone ? 4096 : 8192;   // téléphone : analyse deux fois plus légère
  aM.minDecibels = -120; aM.maxDecibels = 0; aM.smoothingTimeConstant = 0.6;
  mono.connect(aM);
  const sp = ctx.createChannelSplitter(2); sortie.connect(sp);
  const aL = ctx.createAnalyser(), aR = ctx.createAnalyser(); aL.fftSize = aR.fftSize = 2048;
  sp.connect(aL, 0); sp.connect(aR, 1);
  // pour la forme d'onde défilante : les 8192 derniers échantillons de chaque côté (≈ 170 ms)
  const wL = ctx.createAnalyser(), wR = ctx.createAnalyser(); wL.fftSize = wR.fftSize = 8192;
  sp.connect(wL, 0); sp.connect(wR, 1);
  // le grave seul (sous 150 Hz), pour vérifier qu'il est centré
  const pb = ctx.createBiquadFilter(); pb.type = "lowpass"; pb.frequency.value = 150; pb.Q.value = 0.7;
  pb.channelCount = 2; pb.channelCountMode = "explicit"; pb.channelInterpretation = "discrete";
  sortie.connect(pb);
  const sp2 = ctx.createChannelSplitter(2); pb.connect(sp2);
  const bL = ctx.createAnalyser(), bR = ctx.createAnalyser(); bL.fftSize = bR.fftSize = 4096;
  sp2.connect(bL, 0); sp2.connect(bR, 1);
  noeuds = { ctx, sortie, aM, aL, aR, bL, bR, wL, wR };
  return noeuds;
}

export interface Image {
  sr: number;
  spectreBins: Float32Array;   // dB par case de FFT (4096 cases)
  bandes: number[];            // dB par bande de 1/6 d'octave (FREQS_SPECTRE)
  temps: Float32Array;         // forme d'onde mono (8192 échantillons)
  L: Float32Array; R: Float32Array; // 2048 échantillons
  correlation: number;         // −1 (opposition de phase) … +1 (mono)
  largeur: number;             // 0 = mono, 1 = très large (énergie côté / centre)
  graveCorr: number; graveCote: number; graveNiveauDb: number;  // grave sous 150 Hz
  basseEnergie: number;        // énergie 40–120 Hz (pour le kick)
  nfft: number;                // taille de la FFT du spectre
  ondeL: Float32Array; ondeR: Float32Array; // 8192 derniers échantillons (forme d'onde défilante)
  tAudio: number;              // heure du moteur audio (s) : combien d'échantillons sont nouveaux
}

const buf = { wL: new Float32Array(8192), wR: new Float32Array(8192), bins: new Float32Array(4096), t: new Float32Array(8192), L: new Float32Array(2048), R: new Float32Array(2048), bL: new Float32Array(4096), bR: new Float32Array(4096) };

/** Lit une image de toutes les mesures. `lissage` : 0 = rapide, 0,9 = très lisse. */
export function lireImage(lissage: number): Image | null {
  const n = brancher();
  if (!n) return null;
  n.aM.smoothingTimeConstant = lissage;
  n.aM.getFloatFrequencyData(buf.bins);
  n.aM.getFloatTimeDomainData(buf.t);
  n.aL.getFloatTimeDomainData(buf.L); n.aR.getFloatTimeDomainData(buf.R);
  n.bL.getFloatTimeDomainData(buf.bL); n.bR.getFloatTimeDomainData(buf.bR);
  n.wL.getFloatTimeDomainData(buf.wL); n.wR.getFloatTimeDomainData(buf.wR);
  const sr = n.ctx.sampleRate;
  const st = stereo(buf.L, buf.R), gr = stereo(buf.bL, buf.bR);
  return {
    sr, spectreBins: buf.bins, bandes: bandesLive(buf.bins, sr), temps: buf.t, L: buf.L, R: buf.R,
    correlation: st.corr, largeur: st.largeur, graveCorr: gr.corr, graveCote: gr.largeur, graveNiveauDb: gr.niveauDb,
    basseEnergie: energie(buf.bins, sr, 40, 120),
    nfft: NFFT, ondeL: buf.wL, ondeR: buf.wR, tAudio: n.ctx.currentTime,
  };
}

function stereo(L: Float32Array, R: Float32Array) {
  let lr = 0, ll = 0, rr = 0, m = 0, s = 0;
  for (let i = 0; i < L.length; i++) {
    const l = L[i], r = R[i];
    lr += l * r; ll += l * l; rr += r * r;
    const mi = (l + r) * 0.5, si = (l - r) * 0.5; m += mi * mi; s += si * si;
  }
  const corr = ll > 1e-9 && rr > 1e-9 ? lr / Math.sqrt(ll * rr) : 1;
  return { corr, largeur: m + s > 1e-9 ? s / (m + s) : 0, niveauDb: 10 * Math.log10((ll + rr) / (2 * L.length) + 1e-12) };
}

const NFFT = 8192;
/** dB par case → dB par bande de 1/6 d'octave (somme d'énergie, comme pour le spectre des références). */
export function bandesLive(bins: Float32Array, sr: number): number[] {
  const bin = sr / NFFT;
  return FREQS_SPECTRE.map((f) => {
    const lo = f / Math.pow(2, 1 / 12), hi = f * Math.pow(2, 1 / 12);
    const a = Math.max(1, Math.floor(lo / bin));
    const b = Math.max(a, Math.min(bins.length - 1, Math.ceil(hi / bin)));
    let s = 0;
    for (let k = a; k <= b; k++) s += Math.pow(10, bins[k] / 10);
    return 10 * Math.log10(s + 1e-20);
  });
}
function energie(bins: Float32Array, sr: number, f1: number, f2: number) {
  const bin = sr / NFFT; let s = 0;
  for (let k = Math.max(1, Math.floor(f1 / bin)); k <= Math.ceil(f2 / bin) && k < bins.length; k++) s += Math.pow(10, bins[k] / 10);
  return s;
}

// ---------------------------------------------------------------- Note dominante (estimation)
export interface Note { midi: number; nom: string; fr: string; cents: number; hz: number; clarte: number }
/** Hauteur par autocorrélation normalisée, sur le signal sous-échantillonné par 4. Rend null si le son n'a pas de hauteur claire. */
export function noteDominante(x: Float32Array, sr: number): Note | null {
  const d = 4, n = Math.floor(x.length / d), y = new Float32Array(n);
  let e = 0;
  for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < d; k++) s += x[i * d + k]; y[i] = s / d; e += y[i] * y[i]; }
  if (e / n < 1e-6) return null; // trop faible (sous ≈ −60 dBFS)
  const srd = sr / d, minLag = Math.floor(srd / 1200), maxLag = Math.min(Math.floor(srd / 28), Math.floor(n / 2));
  const W = n - maxLag;
  let meilleur = -1, lag = 0;
  const c = new Float32Array(maxLag + 2);
  for (let l = minLag; l <= maxLag + 1; l++) {
    let ac = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < W; i++) { const a = y[i], b = y[i + l]; ac += a * b; e1 += a * a; e2 += b * b; }
    c[l] = ac / Math.sqrt(e1 * e2 + 1e-12);
  }
  // premier pic au-dessus de 90 % du maximum (évite l'octave du dessous)
  let max = 0;
  for (let l = minLag; l <= maxLag; l++) if (c[l] > max) max = c[l];
  for (let l = minLag + 1; l <= maxLag; l++) {
    if (c[l] > c[l - 1] && c[l] >= c[l + 1] && c[l] >= max * 0.9) { lag = l; meilleur = c[l]; break; }
  }
  if (!lag || meilleur < 0.8) return null;
  const a = c[lag - 1], b = c[lag], g = c[lag + 1];
  const dec = (a - g) / (2 * (a - 2 * b + g) || 1);
  const hz = srd / (lag + (Number.isFinite(dec) ? dec : 0));
  const m = 69 + 12 * Math.log2(hz / 440), mr = Math.round(m);
  const nm = nomMidi(mr);
  return { midi: mr, nom: nm.en, fr: nm.fr, cents: Math.round((m - mr) * 100), hz, clarte: meilleur };
}

// ---------------------------------------------------------------- Kick (pour la pulsation du mode vidéo)
export class DetecteurKick {
  private moy = 0; private dernier = 0; pulse = 0; intervalles: number[] = [];
  /** À appeler à chaque image ; rend true au moment d'un kick. */
  suivre(e: number, t: number): boolean {
    const coup = this.moy > 0 && e > this.moy * 2.2 && e > 1e-4 && t - this.dernier > 180;
    this.moy = this.moy * 0.93 + e * 0.07;
    this.pulse *= 0.86;
    if (coup) {
      if (this.dernier && t - this.dernier < 2000) { this.intervalles.push(t - this.dernier); if (this.intervalles.length > 16) this.intervalles.shift(); }
      this.dernier = t; this.pulse = 1;
    }
    return coup;
  }
  /** BPM estimé d'après les derniers kicks (médiane), ou null. */
  bpm(): number | null {
    if (this.intervalles.length < 4) return null;
    const s = [...this.intervalles].sort((a, b) => a - b), med = s[Math.floor(s.length / 2)];
    let b = 60000 / med;
    while (b < 70) b *= 2; while (b > 200) b /= 2;
    return Math.round(b);
  }
}

// ---------------------------------------------------------------- Spectre de référence à superposer
export interface SpectreRef { id: string; nom: string; bandes: number[] }
let refsMemoire: SpectreRef | null = null;
/** Le module « Analyser une référence » donne ici le spectre du morceau chargé. */
export function setSpectreRefCourant(x: SpectreRef | null) { refsMemoire = x; }
export const spectreRefCourant = () => refsMemoire;

/** Décalage (dB) qui aligne le niveau moyen de la référence sur le son en direct, entre 60 Hz et 8 kHz. */
export function alignement(live: number[], ref: number[]): number {
  let s = 0, n = 0;
  FREQS_SPECTRE.forEach((f, i) => { if (f >= 60 && f <= 8000 && live[i] > -110) { s += live[i] - ref[i]; n++; } });
  return n ? s / n : 0;
}
