// Analyse d'un morceau de référence (module « Analyser une référence ») : tempo, tonalité, forme d'onde, spectre,
// et analyse d'un son (kick…) : note de base, chute de hauteur, longueur, attaque, grave/médium/aigu, distorsion.
// Tout est calculé dans le navigateur. Ce sont des estimations : chaque mesure dit si elle est approximative.
import { bandesDepuisPuissance, energieBande, fenetre, fft, lufsIntegre } from "./masterAnalyse";

export const monoDe = (L: Float32Array, R: Float32Array) => { const m = new Float32Array(L.length); for (let i = 0; i < L.length; i++) m[i] = (L[i] + R[i]) * 0.5; return m; };
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const db = (x: number) => 20 * Math.log10(Math.max(x, 1e-9));
const mediane = (a: number[]) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

// ---------------------------------------------------------------- Forme d'onde
/** Min et max par colonne, pour dessiner la forme d'onde. */
export function pics(x: Float32Array, n: number): { min: Float32Array; max: Float32Array } {
  const min = new Float32Array(n), max = new Float32Array(n), pas = x.length / n;
  for (let c = 0; c < n; c++) {
    let lo = 0, hi = 0;
    const a = Math.floor(c * pas), b = Math.min(x.length, Math.floor((c + 1) * pas));
    for (let i = a; i < b; i++) { const v = x[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    min[c] = lo; max[c] = hi;
  }
  return { min, max };
}

// ---------------------------------------------------------------- Tempo
export interface Tempo { bpm: number; confiance: number; autre?: number }

/** Enveloppe des attaques : hausse d'énergie toutes les 5 ms. */
function enveloppeAttaques(x: Float32Array, sr: number) {
  const H = Math.max(1, Math.round(sr * 0.005)), W = H * 4;
  const n = Math.max(0, Math.floor((x.length - W) / H));
  const e = new Float32Array(n);
  let prev = 0;
  for (let f = 0; f < n; f++) {
    let s = 0; const o = f * H;
    for (let i = 0; i < W; i++) { const v = x[o + i]; s += v * v; }
    const l = Math.log10(1e-6 + s / W);
    e[f] = Math.max(0, l - prev); prev = l;
  }
  // retire la moyenne glissante (0,5 s) pour ne garder que les pics
  const k = 100, out = new Float32Array(n); let acc = 0;
  for (let i = 0; i < n; i++) { acc += e[i]; if (i >= k) acc -= e[i - k]; out[i] = Math.max(0, e[i] - acc / Math.min(i + 1, k)); }
  return { env: out, dt: H / sr };
}

/** BPM probable par autocorrélation des attaques. Préfère 120-215 BPM quand le double ou la moitié est aussi plausible. */
export function tempo(x: Float32Array, sr: number): Tempo {
  const max = Math.min(x.length, sr * 120);
  const debut = x.length > max ? Math.floor((x.length - max) / 2) : 0;
  const { env, dt } = enveloppeAttaques(x.subarray(debut, debut + max), sr);
  const N = env.length, lagMax = Math.min(N - 1, Math.ceil(4 * 60 / 55 / dt) + 2);
  if (N < 400) return { bpm: NaN, confiance: 0 };
  const ac = new Float64Array(lagMax + 1);
  for (let l = 1; l <= lagMax; l++) { let s = 0; for (let i = l; i < N; i++) s += env[i] * env[i - l]; ac[l] = s / (N - l); }
  const at = (l: number) => { const i = Math.floor(l), f = l - i; return i + 1 > lagMax ? 0 : ac[i] * (1 - f) + ac[i + 1] * f; };
  const score = (b: number) => { const L = 60 / b / dt; let s = 0; for (let k = 1; k <= 4; k++) s += at(k * L) / k; return s; };
  const res: { b: number; s: number }[] = [];
  for (let b = 60; b <= 220; b += 0.05) res.push({ b, s: score(b) });
  const best = res.reduce((a, c) => (c.s > a.s ? c : a));
  const sMoy = res.reduce((a, c) => a + c.s, 0) / res.length;
  const sd = Math.sqrt(res.reduce((a, c) => a + (c.s - sMoy) ** 2, 0) / res.length) || 1e-9;
  let choisi = best.b;
  const essai = (b: number) => (b >= 60 && b <= 220 ? score(b) : -1);
  if (best.b < 120 && essai(best.b * 2) >= 0.6 * best.s) choisi = best.b * 2;
  else if (best.b > 215 && essai(best.b / 2) >= 0.6 * best.s) choisi = best.b / 2;
  // affine autour du choix
  let fin = choisi, sf = -1;
  for (let b = choisi - 0.6; b <= choisi + 0.6; b += 0.01) { const s = score(b); if (s > sf) { sf = s; fin = b; } }
  const autre = fin < 120 ? fin * 2 : fin > 140 ? fin / 2 : undefined;
  return { bpm: Math.round(fin * 10) / 10, confiance: clamp((best.s - sMoy) / sd / 8, 0, 1), autre: autre ? Math.round(autre * 10) / 10 : undefined };
}

// ---------------------------------------------------------------- Tonalité et gamme
const NOMS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
/** Gammes de l'E2 (numéro de SCALE) comparées à la note de base trouvée. */
const GAMMES_TEST: { n: number; nom: string; ecarts: number[] }[] = [
  { n: 7, nom: "Aeolian", ecarts: [0, 2, 3, 5, 7, 8, 10] },
  { n: 3, nom: "Dorian", ecarts: [0, 2, 3, 5, 7, 9, 10] },
  { n: 4, nom: "Phrygian", ecarts: [0, 1, 3, 5, 7, 8, 10] },
  { n: 9, nom: "Harm minor", ecarts: [0, 2, 3, 5, 7, 8, 11] },
  { n: 16, nom: "minor Penta", ecarts: [0, 3, 5, 7, 10] },
  { n: 2, nom: "Ionian", ecarts: [0, 2, 4, 5, 7, 9, 11] },
  { n: 6, nom: "Mixolydian", ecarts: [0, 2, 4, 5, 7, 9, 10] },
  { n: 15, nom: "Major Penta", ecarts: [0, 2, 4, 7, 9] },
];
const correl = (a: number[], b: number[]) => {
  const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length;
  let n = 0, da = 0, dbb = 0;
  for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; dbb += (b[i] - mb) ** 2; }
  return n / Math.sqrt(da * dbb + 1e-20);
};

export interface Tonalite { key: string; mineur: boolean; confiance: number; relative: string; gammes: { n: number; nom: string; score: number }[]; chroma: number[] }

/** Tonalité probable (profils de Krumhansl) et gammes de l'E2 qui collent le mieux. */
export function tonalite(x: Float32Array, sr: number): Tonalite {
  const N = 8192, w = fenetre(N), re = new Float64Array(N), im = new Float64Array(N);
  const chroma = new Array(12).fill(0);
  const max = Math.min(x.length, sr * 120);
  const debut = x.length > max ? Math.floor((x.length - max) / 2) : 0;
  const bin = sr / N;
  const kLo = Math.ceil(55 / bin), kHi = Math.min(N / 2 - 1, Math.floor(2000 / bin));
  const pc = new Int8Array(N / 2).fill(-1);
  for (let k = kLo; k <= kHi; k++) { const m = 69 + 12 * Math.log2((k * bin) / 440); if (Math.abs(m - Math.round(m)) < 0.35) pc[k] = ((Math.round(m) % 12) + 12) % 12; }
  for (let d = debut; d + N <= debut + max; d += N) {
    for (let i = 0; i < N; i++) { re[i] = x[d + i] * w[i]; im[i] = 0; }
    fft(re, im);
    const frame = new Array(12).fill(0);
    for (let k = kLo; k <= kHi; k++) if (pc[k] >= 0) frame[pc[k]] += Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    const s = frame.reduce((a, b) => a + b, 0) || 1;
    for (let i = 0; i < 12; i++) chroma[i] += frame[i] / s;
  }
  const scores: { t: number; mineur: boolean; r: number }[] = [];
  for (let t = 0; t < 12; t++) {
    const rot = chroma.map((_, i) => chroma[(i + t) % 12]);
    scores.push({ t, mineur: false, r: correl(rot, MAJ) }, { t, mineur: true, r: correl(rot, MIN) });
  }
  scores.sort((a, b) => b.r - a.r);
  const [b1, b2] = scores;
  const tot = chroma.reduce((a, b) => a + b, 0) || 1;
  const c = chroma.map((v) => v / tot);
  const rot = c.map((_, i) => c[(i + b1.t) % 12]);
  const gammes = GAMMES_TEST.map((g) => {
    const dans = g.ecarts.reduce((s, e) => s + rot[e], 0) / g.ecarts.length;
    const hors = (1 - g.ecarts.reduce((s, e) => s + rot[e], 0)) / (12 - g.ecarts.length);
    return { n: g.n, nom: g.nom, score: dans - hors };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
  const rel = b1.mineur ? `${NOMS[(b1.t + 3) % 12]} majeur` : `${NOMS[(b1.t + 9) % 12]} mineur`;
  return { key: NOMS[b1.t], mineur: b1.mineur, confiance: clamp((b1.r - b2.r) / 0.25 + (b1.r - 0.5) * 0.6, 0, 1), relative: rel, gammes, chroma: c };
}

// ---------------------------------------------------------------- Une zone
export interface Zone { debut: number; fin: number }   // en secondes
export interface StatsZone { spectre: number[]; lufs: number | null; rms: number; crete: number }

/** Spectre (bandes de 1/6 d'octave), volume perçu (si la zone fait au moins 0,4 s), RMS et crête. */
export function statsZone(L: Float32Array, R: Float32Array, sr: number, z: Zone): StatsZone {
  const a = clamp(Math.floor(z.debut * sr), 0, L.length), b = clamp(Math.ceil(z.fin * sr), a, L.length);
  const l = L.subarray(a, b), r = R.subarray(a, b);
  let s = 0, pk = 0;
  for (let i = 0; i < l.length; i++) { s += (l[i] * l[i] + r[i] * r[i]) / 2; pk = Math.max(pk, Math.abs(l[i]), Math.abs(r[i])); }
  return { spectre: spectreSegment(monoDe(l, r), sr), lufs: l.length >= sr * 0.4 ? lufsIntegre(l, r, sr) : null, rms: 10 * Math.log10(s / Math.max(1, l.length) + 1e-20), crete: db(pk) };
}

/** Spectre moyen d'un segment de n'importe quelle longueur (fenêtres de 8192, ou une seule fenêtre plus courte complétée de zéros). */
export function spectreSegment(x: Float32Array, sr: number): number[] {
  const N = 8192;
  if (x.length < N) {
    const M = Math.max(1024, 1 << Math.ceil(Math.log2(Math.max(2, x.length))));
    const re = new Float64Array(M), im = new Float64Array(M), w = fenetre(x.length);
    for (let i = 0; i < x.length; i++) re[i] = x[i] * w[i];
    fft(re, im);
    const p = new Float64Array(M / 2);
    for (let k = 0; k < M / 2; k++) p[k] = (re[k] * re[k] + im[k] * im[k]) * 4 / (x.length * x.length) / 0.375 * 2;
    return bandesDepuisPuissance(p, sr, M);
  }
  const w = fenetre(N), re = new Float64Array(N), im = new Float64Array(N), acc = new Float64Array(N / 2);
  let n = 0;
  for (let d = 0; d + N <= x.length; d += N / 2) {
    for (let i = 0; i < N; i++) { re[i] = x[d + i] * w[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) acc[k] += re[k] * re[k] + im[k] * im[k];
    n++;
  }
  for (let k = 0; k < N / 2; k++) acc[k] = (acc[k] / n) * 4 / (N * N) / 0.375 * 2;
  return bandesDepuisPuissance(acc, sr, N);
}

// ---------------------------------------------------------------- Un son (kick…)
export type TypeSon = "kick" | "basse" | "aigu" | "autre";
export interface AnaSon {
  type: TypeSon;
  attaqueA: number;          // début du son dans le fichier (s)
  duree: number;             // durée analysée (s)
  fBase: number | null;      // Hz
  midiBase: number | null;   // note de base (arrondie)
  ecartCents: number | null; // écart à la note arrondie
  baseFiable: boolean;
  fDebut: number | null;     // Hz au tout début
  chuteDemi: number | null;  // demi-tons entre le début et la note de base
  chuteMs: number | null;    // temps pour arriver à la note de base
  decayMs: number;           // temps pour descendre de 20 dB après la crête
  longueurMs: number;        // temps jusqu'à -40 dB (ou fin de zone)
  coupe: boolean;            // le son n'est pas redescendu à -40 dB (coup suivant, autre instrument ou fin de zone)
  monteeMs: number;          // 10 % → 90 % de la crête
  clic: number;              // énergie au-dessus de 2 kHz dans les 10 premières ms, en dB par rapport au corps
  attaque: "forte" | "moyenne" | "douce";
  parts: { sub: number; grave: number; medium: number; aigu: number };   // % de l'énergie (sub compris dans grave)
  distorsion: number | null; // énergie des harmoniques / fondamentale (0 = sinus pur)
  motDistorsion: "propre" | "un peu saturé" | "distordu" | "non mesurable";
  enveloppe: number[];       // dB par rapport à la crête, une valeur toutes les 2 ms
  hauteur: { t: number; f: number }[]; // Hz au fil du temps (ms)
  spectre: number[];
}

export function passeBas(x: Float32Array, sr: number, fc: number) {
  const w = (2 * Math.PI * fc) / sr, cw = Math.cos(w), al = Math.sin(w) / (2 * 0.707), a0 = 1 + al;
  const b0 = (1 - cw) / 2 / a0, b1 = (1 - cw) / a0, b2 = b0, a1 = (-2 * cw) / a0, a2 = (1 - al) / a0;
  let y = new Float32Array(x.length);
  for (let pass = 0; pass < 2; pass++) {
    const src = pass === 0 ? x : y, out = new Float32Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < src.length; i++) { const v = src[i]; const o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = o; out[i] = o; }
    y = out;
  }
  return y;
}
function passeHaut(x: Float32Array, sr: number, fc: number) {
  const lp = passeBas(x, sr, fc); const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] - lp[i];
  return y;
}

/** Analyse le premier son fort de la zone (un kick, une basse, un charleston…). */
export function analyserSon(x: Float32Array, sr: number, z: Zone): AnaSon | null {
  const a0 = clamp(Math.floor(z.debut * sr), 0, x.length), b0 = clamp(Math.ceil(z.fin * sr), a0, x.length);
  const zone = x.subarray(a0, b0);
  if (zone.length < sr * 0.02) return null;
  // enveloppe 1 ms
  const H = Math.max(1, Math.round(sr * 0.001));
  const nE = Math.floor(zone.length / H);
  const env = new Float32Array(nE);
  for (let f = 0; f < nE; f++) { let m = 0; for (let i = 0; i < H; i++) m = Math.max(m, Math.abs(zone[f * H + i])); env[f] = m; }
  let pk = 0, ip = 0;
  for (let f = 0; f < nE; f++) if (env[f] > pk) { pk = env[f]; ip = f; }
  if (pk < 1e-4) return null;
  // le premier son fort : on recule depuis la première crête à plus de 50 % du max
  let premier = 0; while (premier < nE && env[premier] < pk * 0.5) premier++;
  let crete = premier, pc = env[premier];
  for (let f = premier; f < Math.min(nE, premier + 40); f++) if (env[f] > pc) { pc = env[f]; crete = f; }
  ip = crete; pk = pc;
  // enveloppe lissée (crête sur ±10 ms) : une basse à 35 Hz passe par zéro toutes les 14 ms
  const envS = new Float32Array(nE);
  for (let f = 0; f < nE; f++) { let m = 0; for (let j = Math.max(0, f - 10); j <= Math.min(nE - 1, f + 10); j++) m = Math.max(m, env[j]); envS[f] = m; }
  let debut = ip; while (debut > 0 && env[debut - 1] > pk * 0.05 && ip - debut < 40) debut--;
  // fin : -40 dB, fin de zone, ou retour d'une nouvelle attaque (le coup suivant)
  let fin = nE;
  for (let f = ip + 40; f < nE - 5; f++) if (envS[f + 5] > envS[f] * 2.5 && envS[f + 5] > pk * 0.3) { fin = f; break; }
  const lim = Math.min(fin, ip + 1500);
  const dB = (f: number) => db(envS[f] / pk);
  let f20 = ip; while (f20 < lim && dB(f20) > -20) f20++;
  let f40 = f20; while (f40 < lim && dB(f40) > -40) f40++;
  let f10 = debut; while (f10 < ip && env[f10] < pk * 0.1) f10++;
  let f90 = f10; while (f90 < ip && env[f90] < pk * 0.9) f90++;
  const seg = zone.subarray(debut * H, Math.max(debut * H + 64, lim * H));
  const t0 = debut * H;

  // hauteur : passages par zéro du signal filtré (passe-bas 600 Hz)
  const lp = passeBas(seg, sr, 600);
  const hauteur: { t: number; f: number }[] = [];
  let last = -1;
  for (let i = 1; i < lp.length; i++) {
    if (lp[i - 1] < 0 && lp[i] >= 0) {
      const tz = i - 1 + lp[i - 1] / (lp[i - 1] - lp[i]);
      if (last >= 0) { const f = sr / (tz - last); if (f >= 25 && f <= 700) hauteur.push({ t: ((last + tz) / 2 / sr) * 1000, f }); }
      last = tz;
    }
  }
  // note de base : sur le corps du son, filtré plus bas (180 Hz) pour ignorer les autres instruments
  const lp2 = passeBas(seg, sr, 180);
  const hauteurBas: { t: number; f: number }[] = [];
  last = -1;
  for (let i = 1; i < lp2.length; i++) {
    if (lp2[i - 1] < 0 && lp2[i] >= 0) {
      const tz = i - 1 + lp2[i - 1] / (lp2[i - 1] - lp2[i]);
      if (last >= 0) { const f = sr / (tz - last); if (f >= 25 && f <= 400) hauteurBas.push({ t: ((last + tz) / 2 / sr) * 1000, f }); }
      last = tz;
    }
  }
  const tCrete = ((ip - debut) * H / sr) * 1000, t20 = ((f20 - debut) * H / sr) * 1000, t35 = Math.max(t20, ((f40 - debut) * H / sr) * 1000 * 0.85);
  let corps = hauteur.filter((h) => h.t > Math.max(50, tCrete + 30) && h.t < Math.max(t35, 90));
  const corpsBas = hauteurBas.filter((h) => h.t > Math.max(50, tCrete + 30) && h.t < Math.max(t35, 90));
  const mBas = mediane(corpsBas.map((h) => h.f));
  if (corpsBas.length >= 3 && mBas < 150) corps = corpsBas;
  // la hauteur finit parfois de descendre au début du corps : on garde les 2/3 de la fin
  if (corps.length >= 6) corps = corps.slice(Math.floor(corps.length / 3));
  const fBase0 = mediane(corps.map((h) => h.f));
  const fBase = Number.isFinite(fBase0) ? fBase0 : null;
  const dispersion = fBase ? mediane(corps.map((h) => Math.abs(1200 * Math.log2(h.f / fBase)))) : Infinity;
  const premiers = hauteur.slice(0, 3).map((h) => h.f);
  const fDebut = premiers.length ? Math.max(...premiers) : null;
  const midiF = fBase ? 69 + 12 * Math.log2(fBase / 440) : null;
  const chuteDemi = fBase && fDebut ? 12 * Math.log2(fDebut / fBase) : null;
  const arrive = fBase ? hauteur.find((h) => h.f < fBase * 1.06) : undefined;

  // spectre du son, et répartition grave / médium / aigu
  const spectre = spectreSegment(seg, sr);
  const e = (f1: number, f2: number) => Math.pow(10, energieBande(spectre, f1, f2) / 10);
  const tot = e(20, 20001) || 1e-20;
  const parts = { sub: (100 * e(20, 60)) / tot, grave: (100 * e(20, 250)) / tot, medium: (100 * e(250, 4000)) / tot, aigu: (100 * e(4000, 20001)) / tot };

  // clic : énergie > 2 kHz dans les 10 premières ms, comparée au corps
  const hp = passeHaut(seg, sr, 2000);
  const n10 = Math.min(seg.length, Math.round(sr * 0.01));
  let sh = 0, sb = 0; for (let i = 0; i < n10; i++) { sh += hp[i] * hp[i]; sb += seg[i] * seg[i]; }
  const clic = 10 * Math.log10((sh + 1e-20) / (sb + 1e-20));
  const monteeMs = ((f90 - f10) * H / sr) * 1000;
  const attaque = monteeMs <= 3 && clic > -18 ? "forte" : monteeMs <= 8 ? "moyenne" : "douce";

  // distorsion : harmoniques / fondamentale sur le corps du son
  let distorsion: number | null = null;
  if (fBase && fBase < 400) {
    // début du corps (là où une saturation s'entend le plus), entre 40 et 150 ms
    const aMs = Math.max(20, tCrete + 10), bMs = aMs + clamp(t20 - aMs, 40, 150);
    const a = Math.round((aMs / 1000) * sr), b = Math.round((bMs / 1000) * sr);
    const c = seg.subarray(Math.min(a, seg.length), Math.min(b, seg.length));
    if (c.length > sr * 0.02) {
      const M = 1 << Math.ceil(Math.log2(Math.max(16384, c.length)));
      const re = new Float64Array(M), im = new Float64Array(M), w = fenetre(c.length);
      for (let i = 0; i < c.length; i++) re[i] = c[i] * w[i];
      fft(re, im);
      const bin = sr / M;
      const pe = (f1: number, f2: number) => { let t = 0; for (let k = Math.ceil(f1 / bin); k <= Math.min(M / 2 - 1, Math.floor(f2 / bin)); k++) t += re[k] * re[k] + im[k] * im[k]; return t; };
      distorsion = pe(fBase * 1.6, 8000) / (pe(fBase * 0.6, fBase * 1.45) + 1e-20);
    }
  }
  const motDistorsion = distorsion === null ? "non mesurable" : distorsion < 0.015 ? "propre" : distorsion < 0.06 ? "un peu saturé" : "distordu";

  const enveloppe: number[] = [];
  for (let f = debut; f < lim; f += 2) enveloppe.push(Math.max(-60, dB(f)));
  const decayMs = ((f20 - ip) * H / sr) * 1000, longueurMs = ((f40 - debut) * H / sr) * 1000;
  const type: TypeSon = parts.aigu > 45 || (fBase === null && parts.grave < 30) ? "aigu"
    : fBase && fBase < 140 && decayMs < 700 && ((chuteDemi ?? 0) > 2 || parts.grave > 55) ? "kick"
    : fBase && fBase < 260 ? "basse" : "autre";
  return {
    type, attaqueA: (a0 + t0) / sr, duree: seg.length / sr,
    fBase, midiBase: midiF === null ? null : Math.round(midiF), ecartCents: midiF === null ? null : Math.round((midiF - Math.round(midiF)) * 100),
    baseFiable: dispersion < 60 && corps.length >= 4,
    fDebut, chuteDemi, chuteMs: arrive ? arrive.t : null,
    decayMs, longueurMs, coupe: f40 >= lim, monteeMs, clic, attaque, parts, distorsion, motDistorsion, enveloppe,
    hauteur: hauteur.filter((h) => h.t <= Math.max(t20 * 1.3, 150)), spectre,
  };
}

// ---------------------------------------------------------------- Comparer deux sons
export function comparer(ref: AnaSon, moi: AnaSon, nomRef = "la référence"): string[] {
  const p: string[] = [];
  const dLong = moi.decayMs - ref.decayMs;
  if (Math.abs(dLong) > Math.max(25, ref.decayMs * 0.15)) p.push(`ton son est plus ${dLong < 0 ? "court" : "long"} (${Math.round(moi.decayMs)} ms contre ${Math.round(ref.decayMs)} ms avant de baisser de 20 dB)`);
  const dSub = moi.parts.sub - ref.parts.sub;
  if (Math.abs(dSub) > 6) p.push(`il a ${dSub < 0 ? "moins" : "plus"} de sub (${Math.round(moi.parts.sub)} % contre ${Math.round(ref.parts.sub)} %)`);
  const dAigu = moi.parts.aigu - ref.parts.aigu;
  if (Math.abs(dAigu) > 4) p.push(`il est ${dAigu < 0 ? "plus sombre" : "plus brillant"} (${Math.round(moi.parts.aigu)} % d'aigu contre ${Math.round(ref.parts.aigu)} %)`);
  if (ref.midiBase !== null && moi.midiBase !== null && ref.midiBase !== moi.midiBase) {
    const d = moi.midiBase - ref.midiBase;
    p.push(`sa note de base est ${Math.abs(d)} demi-ton${Math.abs(d) > 1 ? "s" : ""} plus ${d < 0 ? "bas" : "haut"}`);
  }
  if (ref.chuteDemi !== null && moi.chuteDemi !== null && Math.abs(moi.chuteDemi - ref.chuteDemi) > 4) p.push(`sa chute de hauteur est ${moi.chuteDemi < ref.chuteDemi ? "plus petite" : "plus grande"}`);
  if (ref.attaque !== moi.attaque) p.push(`son attaque est ${moi.attaque} (celle de ${nomRef} est ${ref.attaque})`);
  if (ref.motDistorsion !== moi.motDistorsion && ref.motDistorsion !== "non mesurable" && moi.motDistorsion !== "non mesurable") p.push(`il est ${moi.motDistorsion} alors que ${nomRef} est ${ref.motDistorsion}`);
  return p;
}

// ---------------------------------------------------------------- Trouver un kick
/** Cherche un coup grave bien net (souvent un kick) dans le milieu du morceau. Renvoie son début en secondes, ou null. */
export function trouverKick(x: Float32Array, sr: number, bpm?: number): number | null {
  const tiers = Math.floor(x.length / 3);
  const a = x.length > sr * 20 ? tiers : 0, b = x.length > sr * 20 ? Math.min(x.length, a + Math.max(tiers, sr * 30)) : x.length;
  const seg = x.subarray(a, Math.min(b, a + sr * 60));
  const lp = passeBas(seg, sr, 150), hp = passeHaut(seg, sr, 300);
  const H = Math.round(sr * 0.005);
  const n = Math.floor(lp.length / H);
  const eb = new Float32Array(n), eh = new Float32Array(n);
  for (let f = 0; f < n; f++) { let s = 0, t = 0; for (let i = 0; i < H; i++) { const v = lp[f * H + i], w = hp[f * H + i]; s += v * v; t += w * w; } eb[f] = Math.sqrt(s / H); eh[f] = Math.sqrt(t / H); }
  let max = 0, maxH = 0; for (let f = 0; f < n; f++) { max = Math.max(max, eb[f]); maxH = Math.max(maxH, eh[f]); }
  if (max < 1e-4) return null;
  const beat = bpm && bpm > 0 ? 60 / bpm : 0.5, nb = Math.round(beat / 0.005);
  let best = -1, score = -Infinity;
  for (let f = 4; f < n - nb; f++) {
    // une attaque dans le grave : l'énergie sous 150 Hz monte d'un coup
    if (!(eb[f] >= eb[f - 1] && eb[f - 4] < eb[f] * 0.45)) continue;
    let pic = 0; for (let j = f; j < f + 6; j++) pic = Math.max(pic, eb[j]);
    if (pic < max * 0.6) continue;
    // un kick net : fort dans le grave, sans trop d'autres sons aigus juste avant
    let avant = 0; for (let j = Math.max(0, f - 10); j < f; j++) avant = Math.max(avant, eh[j]);
    const s = pic / max - 0.3 * (avant / (maxH + 1e-9));
    if (s > score) { score = s; best = f; }
  }
  if (best < 0) return null;
  return (a + Math.max(0, best - 1) * H) / sr;
}
