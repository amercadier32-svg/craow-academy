// Lecture / écriture WAV et mesures du module Mastering (volume perçu, crêtes, dynamique, stéréo, spectre).
// Les mesures suivent les méthodes publiques (UIT-R BS.1770 pour le LUFS, EBU Tech 3342 pour la plage de volume),
// mais c'est un calcul maison : il est approché, pas certifié.

export interface Son {
  nom: string;
  sr: number;            // fréquence d'échantillonnage du fichier
  bits: number;          // résolution d'origine (0 si inconnue)
  canaux: number;        // canaux d'origine (un fichier mono est dupliqué en L et R)
  L: Float32Array; R: Float32Array;
  decodeNavigateur?: boolean; // true : décodé par le navigateur (MP3…), fréquence = celle du navigateur
}

// ---------------------------------------------------------------- WAV
export function lireWav(buf: ArrayBuffer, nom: string): Son {
  const v = new DataView(buf);
  const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (buf.byteLength < 12 || tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("Ce fichier n'est pas un WAV.");
  let o = 12, fmt = 0, canaux = 0, sr = 0, bits = 0, dataOff = -1, dataLen = 0;
  while (o + 8 <= buf.byteLength) {
    const id = tag(o), len = v.getUint32(o + 4, true);
    if (id === "fmt ") {
      fmt = v.getUint16(o + 8, true); canaux = v.getUint16(o + 10, true); sr = v.getUint32(o + 12, true); bits = v.getUint16(o + 22, true);
      if (fmt === 0xfffe && len >= 40) fmt = v.getUint16(o + 32, true); // WAVE_FORMAT_EXTENSIBLE : le vrai format est dans le sous-type
    } else if (id === "data") { dataOff = o + 8; dataLen = Math.min(len, buf.byteLength - dataOff); break; }
    o += 8 + len + (len & 1);
  }
  if (!sr || dataOff < 0) throw new Error("WAV incomplet (pas de bloc « fmt » ou « data »).");
  if (fmt !== 1 && fmt !== 3) throw new Error(`Format WAV non pris en charge (code ${fmt}). Exporte-le en PCM 16, 24 ou 32 bits.`);
  const oct = bits / 8, cadre = oct * canaux, n = Math.floor(dataLen / cadre);
  const L = new Float32Array(n), R = new Float32Array(n);
  const lire = (p: number): number => {
    if (fmt === 3) return bits === 64 ? v.getFloat64(p, true) : v.getFloat32(p, true);
    if (bits === 16) return v.getInt16(p, true) / 32768;
    if (bits === 24) { const x = v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getInt8(p + 2) << 16); return x / 8388608; }
    if (bits === 32) return v.getInt32(p, true) / 2147483648;
    if (bits === 8) return (v.getUint8(p) - 128) / 128;
    throw new Error(`Résolution ${bits} bits non prise en charge.`);
  };
  for (let i = 0; i < n; i++) {
    const p = dataOff + i * cadre;
    L[i] = lire(p);
    R[i] = canaux > 1 ? lire(p + oct) : L[i];
  }
  return { nom, sr, bits, canaux, L, R };
}

/** WAV PCM stéréo 16 ou 24 bits. En 16 bits, un léger bruit de « dither » (TPDF) évite les artefacts d'arrondi. */
export function ecrireWav(L: Float32Array, R: Float32Array, sr: number, bits: 16 | 24, dither = true): Blob {
  const n = L.length, oct = bits / 8, data = n * 2 * oct;
  const buf = new ArrayBuffer(44 + data), v = new DataView(buf);
  const s = (o: number, t: string) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 36 + data, true); s(8, "WAVE");
  s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2 * oct, true); v.setUint16(32, 2 * oct, true); v.setUint16(34, bits, true);
  s(36, "data"); v.setUint32(40, data, true);
  const max = bits === 16 ? 32767 : 8388607;
  let p = 44;
  for (let i = 0; i < n; i++) {
    for (const ch of [L, R]) {
      let x = ch[i] * max;
      if (bits === 16 && dither) x += Math.random() - Math.random();
      let q = Math.round(x);
      if (q > max) q = max; else if (q < -max - 1) q = -max - 1;
      if (bits === 16) { v.setInt16(p, q, true); p += 2; }
      else { v.setUint8(p, q & 255); v.setUint8(p + 1, (q >> 8) & 255); v.setUint8(p + 2, (q >> 16) & 255); p += 3; }
    }
  }
  return new Blob([buf], { type: "audio/wav" });
}

// ---------------------------------------------------------------- FFT (radix 2, en place)
export function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

/** Fréquences des bandes d'affichage du spectre (1/6 d'octave, 20 Hz → 20 kHz). */
export const FREQS_SPECTRE: number[] = (() => { const f: number[] = []; for (let x = 20; x <= 20000; x *= Math.pow(2, 1 / 6)) f.push(x); return f; })();

/** Spectre de puissance d'une fenêtre → niveau (dB) par bande de 1/6 d'octave. */
export function bandesDepuisPuissance(p: Float64Array, sr: number, nfft: number): number[] {
  const bin = sr / nfft;
  return FREQS_SPECTRE.map((f) => {
    const lo = f / Math.pow(2, 1 / 12), hi = f * Math.pow(2, 1 / 12);
    let a = Math.max(1, Math.floor(lo / bin)), b = Math.min(p.length - 1, Math.ceil(hi / bin));
    if (b < a) b = a;
    let s = 0; for (let k = a; k <= b; k++) s += p[k];
    // somme d'énergie dans la bande : un bruit rose donne une courbe plate
    return 10 * Math.log10(s + 1e-20);
  });
}

const hann = (n: number) => { const w = new Float64Array(n); for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)); return w; };
const HANN: Record<number, Float64Array> = {};
export const fenetre = (n: number) => (HANN[n] ??= hann(n));

/** Spectre moyen de tout le morceau (mono L+R), en bandes de 1/6 d'octave. */
export function spectreMoyen(L: Float32Array, R: Float32Array, sr: number): number[] {
  const N = 8192, w = fenetre(N);
  const nb = Math.max(1, Math.min(300, Math.floor(L.length / N)));
  const pas = Math.max(N, Math.floor((L.length - N) / nb));
  const acc = new Float64Array(N / 2);
  const re = new Float64Array(N), im = new Float64Array(N);
  let fen = 0;
  for (let d = 0; d + N <= L.length; d += pas) {
    for (let i = 0; i < N; i++) { re[i] = (L[d + i] + R[d + i]) * 0.5 * w[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) acc[k] += re[k] * re[k] + im[k] * im[k];
    fen++;
  }
  if (!fen) return FREQS_SPECTRE.map(() => -120);
  for (let k = 0; k < N / 2; k++) acc[k] = (acc[k] / fen) * 4 / (N * N) / 0.375 * 2;
  return bandesDepuisPuissance(acc, sr, N);
}

// ---------------------------------------------------------------- Volume perçu (BS.1770)
export interface Biq { b0: number; b1: number; b2: number; a1: number; a2: number }
/** Filtres de pondération K pour n'importe quelle fréquence d'échantillonnage (formules de libebur128). */
export function filtresK(sr: number): [Biq, Biq] {
  let f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
  let K = Math.tan((Math.PI * f0) / sr);
  const Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
  let a0 = 1 + K / Q + K * K;
  const pre: Biq = { b0: (Vh + (Vb * K) / Q + K * K) / a0, b1: (2 * (K * K - Vh)) / a0, b2: (Vh - (Vb * K) / Q + K * K) / a0, a1: (2 * (K * K - 1)) / a0, a2: (1 - K / Q + K * K) / a0 };
  f0 = 38.13547087602444; Q = 0.5003270373238773; K = Math.tan((Math.PI * f0) / sr);
  a0 = 1 + K / Q + K * K;
  const rlb: Biq = { b0: 1, b1: -2, b2: 1, a1: (2 * (K * K - 1)) / a0, a2: (1 - K / Q + K * K) / a0 };
  return [pre, rlb];
}

function filtrer(x: Float32Array, c: Biq): Float32Array {
  const y = new Float32Array(x.length);
  let z1 = 0, z2 = 0;
  for (let i = 0; i < x.length; i++) {
    const s = x[i], o = c.b0 * s + z1;
    z1 = c.b1 * s - c.a1 * o + z2; z2 = c.b2 * s - c.a2 * o; y[i] = o;
  }
  return y;
}

/** Puissance moyenne pondérée K par blocs de 100 ms (somme des canaux). */
function puissances100ms(L: Float32Array, R: Float32Array, sr: number): Float64Array {
  const [a, b] = filtresK(sr);
  const kl = filtrer(filtrer(L, a), b), kr = filtrer(filtrer(R, a), b);
  const pas = Math.round(sr / 10), nb = Math.floor(L.length / pas);
  const out = new Float64Array(nb);
  for (let j = 0; j < nb; j++) {
    let s = 0;
    for (let i = j * pas; i < (j + 1) * pas; i++) s += kl[i] * kl[i] + kr[i] * kr[i];
    out[j] = s / pas;
  }
  return out;
}

const lufs = (ms: number) => -0.691 + 10 * Math.log10(ms + 1e-20);

/** Fenêtres glissantes (4 blocs = 400 ms ; 30 blocs = 3 s) avec pas de 100 ms. */
function fenetres(p: Float64Array, nb: number): number[] {
  const out: number[] = [];
  for (let j = 0; j + nb <= p.length; j++) { let s = 0; for (let k = 0; k < nb; k++) s += p[j + k]; out.push(s / nb); }
  return out;
}

function integre(blocs: number[]): number {
  const abs = blocs.filter((m) => lufs(m) > -70);
  if (!abs.length) return -Infinity;
  const moy = abs.reduce((a, b) => a + b, 0) / abs.length;
  const rel = abs.filter((m) => lufs(m) > lufs(moy) - 10);
  return lufs(rel.reduce((a, b) => a + b, 0) / rel.length);
}

function plageVolume(court: number[]): number {
  const abs = court.filter((m) => lufs(m) > -70);
  if (abs.length < 2) return 0;
  const moy = abs.reduce((a, b) => a + b, 0) / abs.length;
  const v = abs.filter((m) => lufs(m) > lufs(moy) - 20).map(lufs).sort((a, b) => a - b);
  if (v.length < 2) return 0;
  const q = (p: number) => v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))];
  return q(0.95) - q(0.1);
}

// ---------------------------------------------------------------- crête vraie (estimée, suréchantillonnage x4)
const TAPS = 12;
const PHASES: Float64Array[] = [1, 2, 3].map((ph) => {
  const t = ph / 4, h = new Float64Array(TAPS);
  for (let k = 0; k < TAPS; k++) {
    const x = k - TAPS / 2 + 1 - t; // position relative
    const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const win = 0.5 + 0.5 * Math.cos((Math.PI * x) / (TAPS / 2 + 0.5));
    h[k] = sinc * win;
  }
  const s = h.reduce((a, b) => a + b, 0); for (let k = 0; k < TAPS; k++) h[k] /= s;
  return h;
});

export function crete(x: Float32Array): { echantillon: number; vraie: number } {
  let pk = 0, tp = 0;
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > pk) pk = a; }
  tp = pk;
  // on ne suréchantillonne que près des crêtes (au-dessus de -6 dB du maximum) : beaucoup plus rapide
  const seuil = pk * 0.5;
  for (let i = TAPS; i < x.length - TAPS; i++) {
    if (Math.abs(x[i]) < seuil && Math.abs(x[i + 1]) < seuil) continue;
    for (const h of PHASES) {
      let s = 0;
      for (let k = 0; k < TAPS; k++) s += h[k] * x[i - TAPS / 2 + 1 + k];
      const a = Math.abs(s); if (a > tp) tp = a;
    }
  }
  return { echantillon: pk, vraie: tp };
}

// ---------------------------------------------------------------- analyse complète
export interface Analyse {
  duree: number; sr: number;
  lufs: number; lufsCourtMax: number; lra: number;
  crete: number; creteVraie: number;      // dBFS / dBTP estimé
  plr: number;                            // crête vraie − LUFS : la marge entre les pics et le volume moyen
  rms: number;
  correlation: number; correlationGrave: number; largeur: number; perteMono: number;
  ecretages: number; dc: number;
  spectre: number[];
  bandes: { sub: number; grave: number; basMed: number; med: number; hautMed: number; aigu: number };
}

const db = (x: number) => 20 * Math.log10(Math.max(x, 1e-12));

/** Énergie (dB) d'une plage de fréquences, à partir des bandes de 1/6 d'octave. */
export function energieBande(spectre: number[], f1: number, f2: number): number {
  let s = 0;
  FREQS_SPECTRE.forEach((f, i) => { if (f >= f1 && f < f2) s += Math.pow(10, spectre[i] / 10); });
  return 10 * Math.log10(s + 1e-20);
}

export function analyser(L: Float32Array, R: Float32Array, sr: number): Analyse {
  const p = puissances100ms(L, R, sr);
  const lu = integre(fenetres(p, 4));
  const court = fenetres(p, 30);
  const courtMax = court.length ? Math.max(...court.map(lufs)) : lu;
  const cl = crete(L), cr = crete(R);
  const pk = Math.max(cl.echantillon, cr.echantillon), tp = Math.max(cl.vraie, cr.vraie);
  let sLL = 0, sRR = 0, sLR = 0, sM = 0, sS = 0, dcl = 0, dcr = 0, clips = 0, run = 0;
  for (let i = 0; i < L.length; i++) {
    const l = L[i], r = R[i];
    sLL += l * l; sRR += r * r; sLR += l * r; dcl += l; dcr += r;
    const m = (l + r) / 2, s = (l - r) / 2; sM += m * m; sS += s * s;
    // écrêtage : au moins 3 échantillons de suite collés au maximum
    if (Math.abs(l) >= 0.999 || Math.abs(r) >= 0.999) { run++; if (run === 3) clips++; } else run = 0;
  }
  const n = Math.max(1, L.length);
  // corrélation du grave (< 150 Hz)
  const lp: Biq = (() => {
    const w = (2 * Math.PI * 150) / sr, cw = Math.cos(w), al = Math.sin(w) / (2 * 0.71), a0 = 1 + al;
    return { b0: (1 - cw) / 2 / a0, b1: (1 - cw) / a0, b2: (1 - cw) / 2 / a0, a1: (-2 * cw) / a0, a2: (1 - al) / a0 };
  })();
  const gl = filtrer(L, lp), gr = filtrer(R, lp);
  let gLL = 0, gRR = 0, gLR = 0;
  for (let i = 0; i < n; i++) { gLL += gl[i] * gl[i]; gRR += gr[i] * gr[i]; gLR += gl[i] * gr[i]; }
  // perte en mono : volume perçu de (L+R)/2 dans les deux enceintes, comparé à la stéréo
  const M = new Float32Array(L.length); for (let i = 0; i < L.length; i++) M[i] = (L[i] + R[i]) / 2;
  const luMono = integre(fenetres(puissances100ms(M, M, sr), 4));
  const spectre = spectreMoyen(L, R, sr);
  return {
    duree: L.length / sr, sr,
    lufs: lu, lufsCourtMax: courtMax, lra: plageVolume(court),
    crete: db(pk), creteVraie: db(tp), plr: db(tp) - lu,
    rms: 10 * Math.log10((sLL + sRR) / (2 * n) + 1e-20),
    correlation: sLR / Math.sqrt(sLL * sRR + 1e-20),
    correlationGrave: gLR / Math.sqrt(gLL * gRR + 1e-20),
    largeur: Math.sqrt(sS / (sM + 1e-20)),
    perteMono: lu - luMono,
    ecretages: clips, dc: db(Math.max(Math.abs(dcl), Math.abs(dcr)) / n),
    spectre,
    bandes: {
      sub: energieBande(spectre, 20, 60), grave: energieBande(spectre, 60, 250), basMed: energieBande(spectre, 250, 500),
      med: energieBande(spectre, 500, 2000), hautMed: energieBande(spectre, 2000, 6000), aigu: energieBande(spectre, 6000, 20001),
    },
  };
}

/** Volume perçu (LUFS) seulement, pour la compensation A/B. */
export function lufsIntegre(L: Float32Array, R: Float32Array, sr: number): number {
  return integre(fenetres(puissances100ms(L, R, sr), 4));
}

// ---------------------------------------------------------------- alertes en mots simples
export interface Alerte { niveau: "rouge" | "orange" | "info"; titre: string; texte: string }

export function alertes(a: Analyse, ref?: Analyse | null): Alerte[] {
  const out: Alerte[] = [];
  const total = 10 * Math.log10(Object.values(a.bandes).reduce((s, x) => s + Math.pow(10, x / 10), 0));
  const part = (x: number) => x - total; // dB par rapport à l'énergie totale
  if (a.ecretages > 0) out.push({ niveau: "rouge", titre: "Saturation numérique probable", texte: `Le son reste collé au maximum à ${a.ecretages} endroit${a.ecretages > 1 ? "s" : ""} (au moins 3 échantillons de suite). Ça s'entend comme un craquement : baisse le niveau avant le mastering (dans FL Studio ou à la sortie de l'E2).` });
  else if (a.creteVraie > 0) out.push({ niveau: "orange", titre: "Crête au-dessus de 0 dB", texte: `La crête vraie estimée est à ${a.creteVraie.toFixed(1)} dBTP : entre deux échantillons, l'onde dépasse le maximum. Certains lecteurs ou conversions en MP3 peuvent saturer. Un limiteur avec un plafond un peu sous 0 règle ça.` });
  if (a.plr < 6) out.push({ niveau: "rouge", titre: "Son très écrasé", texte: `Les pics ne dépassent le volume moyen que de ${a.plr.toFixed(1)} dB : les coups (kick, claps) n'ont presque plus de relief. Ça fatigue l'oreille et les plateformes baissent quand même le volume des morceaux trop forts.` });
  else if (a.plr < 8) out.push({ niveau: "orange", titre: "Son déjà assez compressé", texte: `Écart pics / volume moyen de ${a.plr.toFixed(1)} dB. Vas-y doucement sur le compresseur et le limiteur pour garder du punch.` });
  if (ref) {
    const dGrave = (part(a.bandes.sub) - part(ref.bandes.sub) + part(a.bandes.grave) - part(ref.bandes.grave)) / 2;
    if (dGrave > 3) out.push({ niveau: "orange", titre: "Grave plus chargé que ta référence", texte: `Ton grave (sub + basse) pèse environ ${dGrave.toFixed(1)} dB de plus que dans le morceau de référence, par rapport au reste du spectre.` });
    if (dGrave < -3) out.push({ niveau: "info", titre: "Grave plus léger que ta référence", texte: `Ton grave pèse environ ${(-dGrave).toFixed(1)} dB de moins que dans la référence.` });
    const dAigu = part(a.bandes.aigu) - part(ref.bandes.aigu);
    if (dAigu > 4) out.push({ niveau: "orange", titre: "Aigus plus brillants que ta référence", texte: `Environ ${dAigu.toFixed(1)} dB de plus au-dessus de 6 kHz : risque de son agressif.` });
    if (dAigu < -4) out.push({ niveau: "info", titre: "Aigus plus sombres que ta référence", texte: `Environ ${(-dAigu).toFixed(1)} dB de moins au-dessus de 6 kHz.` });
  } else {
    // repères sans référence : à prendre comme une indication, pas une règle
    if (part(a.bandes.sub) > -4) out.push({ niveau: "orange", titre: "Grave très chargé", texte: "Le sub (sous 60 Hz) prend une très grande part de l'énergie. Sur un gros système ça peut gronder et faire baisser tout le reste quand tu limites. Charge une référence pour comparer." });
    else if (part(a.bandes.grave) > -1.5 && part(a.bandes.sub) > -8) out.push({ niveau: "orange", titre: "Grave chargé", texte: "Le grave (sous 250 Hz) écrase le reste du spectre. Vérifie que le kick et la basse ne se marchent pas dessus. Charge une référence pour comparer." });
    if (part(a.bandes.hautMed) > -8) out.push({ niveau: "orange", titre: "Haut-médium fort", texte: "Beaucoup d'énergie entre 2 et 6 kHz : la zone où l'oreille fatigue vite (hats, acid, leads). Écoute à volume moyen pendant un moment." });
  }
  if (a.correlation < 0) out.push({ niveau: "rouge", titre: "Problème de phase en mono", texte: `La corrélation est négative (${a.correlation.toFixed(2)}) : gauche et droite s'opposent. En mono (certains systèmes de soirée, téléphones), des parties peuvent disparaître. Clique « Écouter en mono » pour vérifier.` });
  else if (a.perteMono > 3) out.push({ niveau: "orange", titre: "Le son perd beaucoup en mono", texte: `En mono, le volume baisse d'environ ${a.perteMono.toFixed(1)} LU : des éléments très larges risquent de s'affaiblir. Écoute en mono.` });
  if (a.correlationGrave < 0.7) out.push({ niveau: "orange", titre: "Grave en stéréo", texte: `Sous 150 Hz, gauche et droite sont différentes (corrélation ${a.correlationGrave.toFixed(2)}). Sur un sound system le grave est souvent en mono : active « Grave en mono » dans le bloc Largeur stéréo.` });
  if (a.dc > -50) out.push({ niveau: "orange", titre: "Décalage continu (DC)", texte: "Le signal n'est pas centré sur zéro. Ça mange de la marge pour rien : le coupe-bas de l'EQ (vers 20 à 30 Hz) le retire." });
  if (a.crete < -6 && a.ecretages === 0) out.push({ niveau: "info", titre: "Il reste de la marge", texte: `La crête est à ${a.crete.toFixed(1)} dBFS : c'est normal et même bien avant un mastering, le limiteur s'occupera du niveau final.` });
  if (!out.length) out.push({ niveau: "info", titre: "Rien d'alarmant", texte: "Aucune des alertes simples ne s'est déclenchée. Ça ne remplace pas ton oreille : compare avec une référence." });
  return out;
}

// ---------------------------------------------------------------- son de démo
/** Boucle de démo générée par l'app (kick, basse, charleys, nappe) pour essayer sans fichier. 8 mesures à 145 BPM. */
export function sonDemo(sr = 44100): Son {
  const bpm = 145, pas = (60 / bpm) / 4, nPas = 128, n = Math.round(nPas * pas * sr);
  const L = new Float32Array(n), R = new Float32Array(n);
  let graine = 1;
  const alea = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647 * 2 - 1; };
  const notes = [38, 38, 41, 38, 36, 38, 43, 41];
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  for (let st = 0; st < nPas; st++) {
    const t0 = Math.round(st * pas * sr);
    // kick sur les temps
    if (st % 4 === 0) for (let i = 0; i < 0.35 * sr && t0 + i < n; i++) {
      const t = i / sr, f = 48 + 110 * Math.exp(-t * 30);
      const ph = 2 * Math.PI * (48 * t + (110 / 30) * (1 - Math.exp(-t * 30)));
      void f;
      const x = Math.sin(ph) * Math.exp(-t * 7) * 0.9 + (i < 60 ? alea() * 0.3 * (1 - i / 60) : 0);
      L[t0 + i] += x; R[t0 + i] += x;
    }
    // basse roulante entre les kicks
    if (st % 4 !== 0) {
      const f = hz(notes[Math.floor(st / 16) % notes.length]);
      for (let i = 0; i < pas * sr * 0.9 && t0 + i < n; i++) {
        const t = i / sr, ph = (f * t) % 1;
        const x = (2 * ph - 1) * 0.28 * Math.exp(-t * 18);
        L[t0 + i] += x * 0.95; R[t0 + i] += x * 0.95;
      }
    }
    // charleys, un peu à droite / à gauche
    const ouvert = st % 4 === 2;
    for (let i = 0; i < (ouvert ? 0.12 : 0.03) * sr && t0 + i < n; i++) {
      const t = i / sr, x = alea() * (ouvert ? 0.12 : 0.09) * Math.exp(-t * (ouvert ? 30 : 140));
      L[t0 + i] += x * (st % 2 ? 0.6 : 1); R[t0 + i] += x * (st % 2 ? 1 : 0.6);
    }
  }
  // nappe stéréo : deux scies désaccordées, une par côté
  let pa = 0, pb = 0, lpA = 0, lpB = 0;
  for (let i = 0; i < n; i++) {
    const m = notes[Math.floor((i / sr) / (pas * 16)) % notes.length] + 24;
    pa = (pa + (hz(m) * 1.004) / sr) % 1; pb = (pb + (hz(m) * 0.996) / sr) % 1;
    lpA += 0.08 * ((2 * pa - 1) - lpA); lpB += 0.08 * ((2 * pb - 1) - lpB);
    L[i] += lpA * 0.06; R[i] += lpB * 0.06;
  }
  for (let i = 0; i < n; i++) { L[i] *= 0.45; R[i] *= 0.45; }
  return { nom: "demo-e2-academy.wav", sr, bits: 0, canaux: 2, L, R };
}

export const fmtTemps = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}.${Math.floor((s % 1) * 10)}`;

/** Spectre d'un extrait (le plus récent en dernier), même échelle que spectreMoyen. */
export function spectreExtrait(x: Float32Array, debut: number, sr: number): number[] {
  const N = x.length, w = fenetre(N), re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = x[(debut + i) % N] * w[i];
  fft(re, im);
  const p = new Float64Array(N / 2);
  for (let k = 0; k < N / 2; k++) p[k] = (re[k] * re[k] + im[k] * im[k]) * 4 / (N * N) / 0.375 * 2;
  return bandesDepuisPuissance(p, sr, N);
}
