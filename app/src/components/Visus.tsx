// Dessins du Visualiseur en direct (canvas) : spectre en courbe, spectrogramme, oscilloscope, forme d'onde défilante,
// vumètre et goniomètre (stéréo). Le même code sert à la page Visualiseur, au mode vidéo et aux petits spectres
// des recettes, exercices et sessions. Chaque canvas est dessiné à sa vraie taille à l'écran (zoom compris).
import { imageASauter } from "../lib/moteurAudio";
import { useEffect, useMemo, useRef, useState } from "react";
import { FREQS_SPECTRE } from "../lib/masterAnalyse";
import { lireImage, noteDominante, type Image, type Note } from "../lib/visuAudio";
import { problemeEntree, useEntree } from "../lib/audioEntree";
import {
  Cretes, FREQS_COURBE, LisseurTemps, REPERES, ZONES, avecAlpha, courbeDepuisBins, dessinerCourbes, fDeX, fmtF, preparerCanvas, prefsSpectre, xDeF,
  type Courbe, type Echelle, type PrefsSpectre,
} from "../lib/spectreCourbe";
import { ReglagesSpectre } from "./SpectreCourbe";
import "./visus.css";

export type { Echelle };
export { ZONES, xDeF };
export interface Theme { id: string; nom: string; fond: string; grille: string; texte: string; barres: string[]; onde: string; accent: string }
export const THEMES: Theme[] = [
  { id: "craow", nom: "CrAoW", fond: "#0c0d11", grille: "#ffffff12", texte: "#eef1f6", barres: ["#4fd18b", "#ffd84d", "#ff6a3d", "#ff3b3b"], onde: "#7fe0ff", accent: "#ff3b3b" },
  { id: "tribe", nom: "Tribe", fond: "#140b07", grille: "#ff6a3d18", texte: "#ffe6d6", barres: ["#ff6a3d", "#ffb020", "#ffd84d", "#fff3c2"], onde: "#ffb020", accent: "#ff6a3d" },
  { id: "acid", nom: "Acid", fond: "#060d06", grille: "#b8ff3a14", texte: "#eaffd6", barres: ["#2e9a62", "#4fd18b", "#b8ff3a", "#f2ff7a"], onde: "#b8ff3a", accent: "#e255c8" },
  { id: "glace", nom: "Glace", fond: "#05090f", grille: "#7fe0ff14", texte: "#e6f6ff", barres: ["#3f6dae", "#5b8bd0", "#7fe0ff", "#ffffff"], onde: "#7fe0ff", accent: "#9b6bff" },
  { id: "rave", nom: "Rave", fond: "#0b0612", grille: "#e255c814", texte: "#ffe6fb", barres: ["#9b6bff", "#e255c8", "#ff6a9a", "#ffd84d"], onde: "#3fd6d0", accent: "#e255c8" },
];

// ---------------------------------------------------------------- Spectre en courbe (direct)
export interface EtatSpectre { brut: Float32Array; lisseur: LisseurTemps; cretes: Cretes }
export const nouvelEtatSpectre = (): EtatSpectre => ({ brut: new Float32Array(FREQS_COURBE.length), lisseur: new LisseurTemps(), cretes: new Cretes() });

export interface OptsSpectre {
  gain: number; theme: Theme;
  ref?: number[] | null;          // spectre de référence (bandes de 1/6 d'octave) à superposer
  zones?: boolean; etiquettes?: boolean;
  couleur?: string; epais?: number; fond?: string | null; echelleTexte?: number; prefs?: PrefsSpectre;
  sansCretes?: boolean;
}
/** Haut et bas de l'échelle en dB selon la sensibilité. */
export const bornesDirect = (gain: number) => ({ haut: -12 - gain, bas: -108 - gain });

const interp = (fs: ArrayLike<number>, v: ArrayLike<number>, f: number) => {
  if (f <= fs[0]) return v[0];
  for (let i = 1; i < fs.length; i++) if (fs[i] >= f) { const t = Math.log(f / fs[i - 1]) / Math.log(fs[i] / fs[i - 1]); return v[i - 1] * (1 - t) + v[i] * t; }
  return v[v.length - 1];
};
/** Une référence (énergie par bande de 1/6 d'octave) ramenée à la même mesure que la courbe en direct
 *  (niveau moyen par case de FFT), puis alignée sur le volume du son en direct entre 60 Hz et 8 kHz. */
function refAlignee(ref: number[], live: Float32Array, sr: number, nfft: number): number[] {
  const pas = sr / nfft, larg = Math.pow(2, 1 / 12) - Math.pow(2, -1 / 12);
  const d = ref.map((db, i) => db - 10 * Math.log10(Math.max(1, (FREQS_SPECTRE[i] * larg) / pas)));
  let s = 0, n = 0;
  FREQS_SPECTRE.forEach((f, i) => { if (f >= 60 && f <= 8000) { const l = interp(FREQS_COURBE, live, f); if (l > -130) { s += l - d[i]; n++; } } });
  const k = n ? s / n : 0;
  return d.map((x) => x + k);
}

export function dessinerSpectre(c: HTMLCanvasElement, img: Image, o: OptsSpectre, etat: EtatSpectre) {
  const pr = preparerCanvas(c); if (!pr) return;
  const p = o.prefs ?? prefsSpectre(), now = performance.now();
  courbeDepuisBins(img.spectreBins, img.sr, img.nfft, p.lissage, etat.brut);
  const v = etat.lisseur.maj(etat.brut, p.lissage, now);
  let cretes = null;
  if (p.cretes && !o.sansCretes) cretes = { v: etat.cretes.maj(v, now), couleur: avecAlpha(o.theme.texte, 0.8) };
  else etat.cretes.vider();
  const couleur = o.couleur ?? o.theme.onde;
  const courbes: Courbe[] = [{ v, couleur, epais: o.epais ?? 2.2, remplir: true }];
  if (o.ref) courbes.push({ v: refAlignee(o.ref, v, img.sr, img.nfft), f: FREQS_SPECTRE, couleur: "#ff6aa8", epais: 2, pointille: true });
  const b = bornesDirect(o.gain);
  dessinerCourbes(pr.g, pr.w, pr.h, courbes, {
    echelle: p.echelle, haut: b.haut, bas: b.bas, fond: o.fond === undefined ? o.theme.fond : o.fond, grille: o.theme.grille, texte: o.theme.texte,
    zones: o.zones, reperes: o.etiquettes !== false, cretes, echelleTexte: o.echelleTexte,
  });
}

// ---------------------------------------------------------------- Spectrogramme (échelle logarithmique)
// Couleurs : noir → bleu → violet → rose → orange → jaune
const CMAP: [number, number, number][] = [[12, 13, 17], [30, 50, 120], [120, 60, 190], [226, 85, 200], [255, 106, 61], [255, 216, 77], [255, 255, 230]];
const CMAP_LUT = (() => {
  const t = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * 0.9999 * (CMAP.length - 1), k = Math.floor(x), f = x - k, a = CMAP[k], b = CMAP[k + 1];
    for (let j = 0; j < 3; j++) t[i * 3 + j] = a[j] + (b[j] - a[j]) * f;
  }
  return t;
})();
const rgbDe = (c: string): [number, number, number] => { const n = parseInt(c.replace("#", "").slice(0, 6), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export interface EtatSpectrogramme { buf: HTMLCanvasElement | null; col: ImageData | null }
export const nouvelEtatSpectrogramme = (): EtatSpectrogramme => ({ buf: null, col: null });

/** Le spectrogramme défile de droite à gauche : grave en bas, aigu en haut, avec la même échelle que le spectre.
 *  Bande de couleur sub / grave / médium / aigu et repères en Hz sur la gauche. */
export function dessinerSpectrogramme(c: HTMLCanvasElement, img: Image, o: { gain: number; echelle?: Echelle; etiquettes?: boolean; echelleTexte?: number; transparent?: boolean; teinte?: string }, etat: EtatSpectrogramme) {
  const pr = preparerCanvas(c, 2); if (!pr) return;
  const W = c.width, H = c.height, e = o.echelle ?? prefsSpectre().echelle;
  if (!etat.buf || etat.buf.width !== W || etat.buf.height !== H) {
    const ancien = etat.buf;
    etat.buf = document.createElement("canvas"); etat.buf.width = W; etat.buf.height = H;
    const b = etat.buf.getContext("2d")!; if (!o.transparent) { b.fillStyle = "rgb(12,13,17)"; b.fillRect(0, 0, W, H); }
    // nouvelle taille (fenêtre, plein écran) : on garde l'image déjà dessinée, étirée
    if (ancien) b.drawImage(ancien, 0, 0, W, H);
    etat.col = null;
  }
  const bg = etat.buf.getContext("2d")!;
  const pas = Math.max(1, Math.round(1.5 * pr.dpr));
  if (o.transparent) { bg.globalCompositeOperation = "copy"; bg.drawImage(etat.buf, -pas, 0); bg.globalCompositeOperation = "source-over"; }
  else bg.drawImage(etat.buf, -pas, 0);
  if (!etat.col || etat.col.width !== pas || etat.col.height !== H) etat.col = bg.createImageData(pas, H);
  const teinte = o.teinte ? rgbDe(o.teinte) : null;
  const d = etat.col.data, bins = img.spectreBins, n = bins.length, bin = img.sr / img.nfft;
  for (let y = 0; y < H; y++) {
    const fh = fDeX(1 - y / H, e), fb = fDeX(1 - (y + 1) / H, e);
    let db: number;
    const a = fb / bin, b = fh / bin;
    if (b - a < 1) { const k = Math.min(n - 2, Math.max(1, (a + b) / 2)), i = Math.floor(k), t = k - i; db = bins[i] * (1 - t) + bins[i + 1] * t; }
    else { db = -200; for (let k = Math.max(1, Math.floor(a)); k <= Math.min(n - 1, Math.ceil(b)); k++) if (bins[k] > db) db = bins[k]; }
    const v = Math.max(0, Math.min(255, Math.round(((db + 8 + o.gain + 96) / 96) * 255)));
    const rr = teinte ? teinte[0] : CMAP_LUT[v * 3], gg = teinte ? teinte[1] : CMAP_LUT[v * 3 + 1], bb = teinte ? teinte[2] : CMAP_LUT[v * 3 + 2];
    const aa = teinte ? Math.min(255, Math.max(0, (v - 40) * 1.6)) : o.transparent ? Math.min(255, v * 2) : 255;
    for (let x = 0; x < pas; x++) { const j = (y * pas + x) * 4; d[j] = rr; d[j + 1] = gg; d[j + 2] = bb; d[j + 3] = aa; }
  }
  bg.putImageData(etat.col, W - pas, 0);
  const g = pr.g;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(etat.buf, 0, 0); g.restore();
  if (o.etiquettes === false) return;
  // bande des zones (même calcul de position que les lignes du spectrogramme) et repères en Hz
  const k = o.echelleTexte ?? 1, w = pr.w, h = pr.h, larg = Math.round(9 * k);
  for (const z of ZONES) {
    const y1 = (1 - xDeF(z.f2, e)) * h, y2 = (1 - xDeF(z.f1, e)) * h;
    g.fillStyle = z.couleur; g.globalAlpha = 0.9; g.fillRect(0, y1 + 1, larg, Math.max(1, y2 - y1 - 2)); g.globalAlpha = 1;
  }
  const taille = Math.round(Math.max(10, Math.min(15, h / 18)) * k);
  g.font = `${taille}px "Jersey 10", ui-monospace, monospace`; g.textAlign = "left"; g.textBaseline = "middle";
  for (const f of REPERES) {
    if (e === "lin" && f < 1000) continue;
    if (h < 200 * k && ![100, 1000, 10000].includes(f)) continue;
    const y = Math.round((1 - xDeF(f, e)) * h);
    if (y < taille / 2 || y > h - taille / 2) continue;
    g.fillStyle = "#ffffff55"; g.fillRect(larg, y, 6 * k, 1);
    g.fillStyle = "#000000aa"; g.fillText(fmtF(f), larg + 8 * k + 1, y + 1);
    g.fillStyle = "#eef1f6"; g.fillText(fmtF(f), larg + 8 * k, y);
  }
  void w;
}

// ---------------------------------------------------------------- Oscilloscope
/** Oscilloscope déclenché sur un passage par zéro en montant (image stable). */
export function dessinerOscillo(c: HTMLCanvasElement, img: Image, o: { theme: Theme; gain: number; fenetre?: number; epais?: number; couleur?: string; fond?: string | null; grille?: boolean }) {
  const pr = preparerCanvas(c); if (!pr) return;
  const { g, w: W, h: H } = pr, x = img.temps, n = Math.min(o.fenetre ?? 2048, x.length / 2);
  if (o.fond === null) g.clearRect(0, 0, W, H); else { g.fillStyle = o.fond ?? o.theme.fond; g.fillRect(0, 0, W, H); }
  if (o.grille !== false) { g.fillStyle = o.theme.grille; g.fillRect(0, H / 2, W, 1); g.fillRect(0, H / 4, W, 1); g.fillRect(0, (3 * H) / 4, W, 1); }
  let d = 0;
  for (let i = 1; i < x.length - n; i++) if (x[i - 1] < 0 && x[i] >= 0) { d = i; break; }
  const gain = Math.pow(10, o.gain / 20);
  g.strokeStyle = o.couleur ?? o.theme.onde; g.lineWidth = o.epais ?? Math.max(1.5, W / 500); g.lineJoin = "round";
  g.beginPath();
  const pasI = Math.max(1, Math.floor(n / (W * 2)));
  for (let i = 0; i < n; i += pasI) {
    const X = (i / (n - 1)) * W, Y = H / 2 - Math.max(-1, Math.min(1, x[d + i] * gain)) * (H / 2 - 2);
    if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
  }
  g.stroke();
}

// ---------------------------------------------------------------- Goniomètre (stéréo)
/** Stéréo : nuage de points (milieu en haut, côtés à gauche et à droite) et barre de phase. */
export function dessinerStereo(c: HTMLCanvasElement, img: Image, o: { theme: Theme; gain: number; couleur?: string; fond?: string | null; barre?: boolean; epais?: number; textes?: boolean }) {
  const pr = preparerCanvas(c); if (!pr) return;
  const { g, w: W, h: H } = pr, avecBarre = o.barre !== false;
  const barre = avecBarre ? Math.round(H * 0.08) : 0, h = H - barre - (avecBarre ? 6 : 0), cx = W / 2, cy = h / 2, r = Math.min(W, h) / 2 - 4;
  if (o.fond === null) g.clearRect(0, 0, W, H); else { g.fillStyle = o.fond ?? o.theme.fond; g.fillRect(0, 0, W, H); }
  g.strokeStyle = o.theme.grille === "transparent" ? "#ffffff22" : o.theme.grille; g.lineWidth = 1;
  g.beginPath(); g.moveTo(cx - r, cy); g.lineTo(cx + r, cy); g.moveTo(cx, cy - r); g.lineTo(cx, cy + r); g.stroke();
  g.beginPath(); g.moveTo(cx - r * 0.7, cy - r * 0.7); g.lineTo(cx + r * 0.7, cy + r * 0.7); g.moveTo(cx + r * 0.7, cy - r * 0.7); g.lineTo(cx - r * 0.7, cy + r * 0.7); g.stroke();
  const gain = Math.pow(10, o.gain / 20) * 1.4, pt = Math.max(1.5, (o.epais ?? 2) * (r / 150));
  g.fillStyle = o.couleur ?? o.theme.onde;
  for (let i = 0; i < img.L.length; i += 2) {
    const l = img.L[i] * gain, rr = img.R[i] * gain;
    const X = cx + ((rr - l) / Math.SQRT2) * r, Y = cy - ((l + rr) / Math.SQRT2) * r;
    g.fillRect(X - pt / 2, Y - pt / 2, pt, pt);
  }
  if (o.textes !== false) {
    g.font = `${Math.max(10, Math.round(H / 16))}px "Jersey 10", monospace`; g.fillStyle = o.theme.texte; g.globalAlpha = 0.6;
    g.textBaseline = "alphabetic";
    g.textAlign = "left"; g.fillText("G", 4, cy - 4); g.textAlign = "right"; g.fillText("D", W - 4, cy - 4); g.textAlign = "center"; g.fillText("centre", cx, 14); g.globalAlpha = 1;
  }
  if (!avecBarre) return;
  // barre de corrélation −1 … +1
  const y = H - barre;
  g.fillStyle = "#2a2d36"; g.fillRect(0, y, W, barre);
  const k = (img.correlation + 1) / 2;
  g.fillStyle = img.correlation < 0 ? "#ff3b3b" : img.correlation < 0.3 ? "#ffb020" : "#4fd18b";
  g.fillRect(W / 2, y, (k - 0.5) * W, barre);
  g.fillStyle = o.theme.texte; g.fillRect(W / 2, y, 1, barre);
}

// ---------------------------------------------------------------- Vumètre (canvas, pour le mode vidéo)
export interface EtatVu { aff: [number, number]; tenue: [number, number]; tenueT: [number, number] }
export const nouvelEtatVu = (): EtatVu => ({ aff: [-120, -120], tenue: [-120, -120], tenueT: [0, 0] });
const db = (x: number) => (x > 1e-6 ? 20 * Math.log10(x) : -120);
/** Deux barres gauche / droite (verticales si la zone est haute), crête maintenue, rouge au-dessus de −3 dBFS. */
export function dessinerVumetre(c: HTMLCanvasElement, img: Image, o: { couleur: string; fond?: string | null; epais?: number }, etat: EtatVu) {
  const pr = preparerCanvas(c); if (!pr) return;
  const { g, w: W, h: H } = pr, t = performance.now();
  if (o.fond === null || o.fond === undefined) g.clearRect(0, 0, W, H); else { g.fillStyle = o.fond; g.fillRect(0, 0, W, H); }
  let pl = 0, pr2 = 0;
  for (let i = 0; i < img.L.length; i++) { const l = Math.abs(img.L[i]), r = Math.abs(img.R[i]); if (l > pl) pl = l; if (r > pr2) pr2 = r; }
  const niv = [db(pl), db(pr2)];
  for (let i = 0; i < 2; i++) {
    etat.aff[i] = niv[i] > etat.aff[i] ? niv[i] : Math.max(niv[i], etat.aff[i] - 0.4);
    if (niv[i] >= etat.tenue[i] || t - etat.tenueT[i] > 1500) { etat.tenue[i] = niv[i]; etat.tenueT[i] = t; }
  }
  const vertical = H > W * 0.8, MIN = -60, segs = 30, ecart = Math.max(2, (o.epais ?? 2) * 2);
  const pos = (d: number) => Math.max(0, Math.min(1, (d - MIN) / -MIN));
  for (let k = 0; k < 2; k++) {
    const v = pos(etat.aff[k]), tn = pos(etat.tenue[k]);
    for (let s = 0; s < segs; s++) {
      const a = s / segs, dbS = MIN + a * -MIN, allume = a < v;
      g.fillStyle = dbS > -3 ? "#ff3b3b" : dbS > -12 ? "#ffd84d" : o.couleur;
      g.globalAlpha = allume ? 1 : 0.14;
      if (vertical) { const bw = (W - ecart) / 2, sh = H / segs; g.fillRect(k * (bw + ecart), H - (s + 1) * sh + 1, bw, sh - 2); }
      else { const bh = (H - ecart) / 2, sw = W / segs; g.fillRect(s * sw + 1, k * (bh + ecart), sw - 2, bh); }
    }
    g.globalAlpha = 1; g.fillStyle = "#ffffff";
    if (vertical) { const bw = (W - ecart) / 2; g.fillRect(k * (bw + ecart), H - tn * H, bw, 3); }
    else { const bh = (H - ecart) / 2; g.fillRect(tn * W - 3, k * (bh + ecart), 3, bh); }
  }
}

// ---------------------------------------------------------------- Forme d'onde défilante
/** Le son qui défile de droite à gauche, comme dans FL Studio. Garde jusqu'à 30 s : pour chaque petit bloc
 *  de 64 échantillons, le minimum, le maximum et s'il a saturé (|x| ≥ 0,999). */
export class OndeDefilante {
  private taille = 0; private mn = new Float32Array(0); private mx = new Float32Array(0); private sat = new Uint8Array(0);
  private ecrit = 0;        // nombre total de blocs écrits
  private tDernier = -1; private sr = 0;
  private bloc = { n: 0, mn: 1, mx: -1, sat: 0 };
  static readonly BLOC = 64;
  /** Ajoute les échantillons arrivés depuis l'image précédente. */
  suivre(img: Image) {
    if (img.sr !== this.sr) { this.sr = img.sr; this.taille = Math.ceil((31 * img.sr) / OndeDefilante.BLOC); this.mn = new Float32Array(this.taille); this.mx = new Float32Array(this.taille); this.sat = new Uint8Array(this.taille); this.ecrit = 0; this.tDernier = -1; }
    const L = img.ondeL, R = img.ondeR, N = L.length;
    let nouveaux: number, manque = 0;
    if (this.tDernier < 0) nouveaux = Math.min(N, 2048);
    else {
      const n = Math.round((img.tAudio - this.tDernier) * img.sr);
      if (n <= 0) return;
      nouveaux = Math.min(N, n); manque = Math.min(n - nouveaux, this.taille * OndeDefilante.BLOC);
    }
    this.tDernier = img.tAudio;
    for (let i = 0; i < manque; i++) this.echantillon(0, 0);     // onglet en pause : du silence à la place du trou
    for (let i = N - nouveaux; i < N; i++) this.echantillon(L[i], R[i]);
  }
  private echantillon(l: number, r: number) {
    const b = this.bloc;
    const hi = l > r ? l : r, lo = l < r ? l : r;
    if (hi > b.mx) b.mx = hi; if (lo < b.mn) b.mn = lo;
    if (l >= 0.999 || l <= -0.999 || r >= 0.999 || r <= -0.999) b.sat = 1;
    if (++b.n === OndeDefilante.BLOC) {
      const k = this.ecrit % this.taille;
      this.mn[k] = b.mn; this.mx[k] = b.mx; this.sat[k] = b.sat; this.ecrit++;
      b.n = 0; b.mn = 1; b.mx = -1; b.sat = 0;
    }
  }
  /** Dessine les `duree` dernières secondes sur toute la largeur. */
  dessiner(c: HTMLCanvasElement, o: { duree: number; couleur: string; fond?: string | null; grille?: string; epais?: number; texte?: string; echelleTexte?: number }) {
    const pr = preparerCanvas(c, 2); if (!pr || !this.sr) return;
    const { g, w: W, h: H } = pr;
    if (o.fond === null) g.clearRect(0, 0, W, H); else { g.fillStyle = o.fond ?? "#0c0d11"; g.fillRect(0, 0, W, H); }
    const mid = H / 2, amp = H / 2 - 2;
    // repères : ligne du milieu, −6 dB et une graduation par seconde
    g.fillStyle = o.grille ?? "#ffffff14";
    g.fillRect(0, Math.round(mid), W, 1); g.fillRect(0, Math.round(mid - amp * 0.5), W, 1); g.fillRect(0, Math.round(mid + amp * 0.5), W, 1);
    const nb = Math.max(1, Math.round((o.duree * this.sr) / OndeDefilante.BLOC)), dispo = Math.min(this.ecrit, this.taille);
    const pasS = o.duree > 12 ? 5 : o.duree > 5 ? 2 : 1;
    for (let s = pasS; s < o.duree; s += pasS) g.fillRect(Math.round(W - (s / o.duree) * W), 0, 1, H);
    const cols = Math.max(1, Math.round(W * pr.dpr));
    const lx = W / cols;
    const normal = o.couleur, rouge = "#ff3b3b";
    for (let x = 0; x < cols; x++) {
      // blocs couverts par cette colonne (le plus récent à droite)
      const a = Math.floor((x * nb) / cols), b = Math.max(a + 1, Math.floor(((x + 1) * nb) / cols));
      let mn = 1, mx = -1, sat = 0;
      for (let j = a; j < b; j++) {
        const age = nb - 1 - j;                    // 0 = le bloc le plus récent
        if (age >= dispo) continue;
        const k = (this.ecrit - 1 - age) % this.taille;
        if (this.mn[k] < mn) mn = this.mn[k]; if (this.mx[k] > mx) mx = this.mx[k]; if (this.sat[k]) sat = 1;
      }
      if (mx < mn) continue;
      const y1 = mid - Math.min(1, mx) * amp, y2 = mid - Math.max(-1, mn) * amp;
      g.fillStyle = sat ? rouge : normal;
      g.fillRect(x * lx, y1, lx + 0.4, Math.max(1, y2 - y1));
    }
    if (o.texte) {
      const k = o.echelleTexte ?? 1;
      g.font = `${Math.round(12 * k)}px "Jersey 10", ui-monospace, monospace`; g.fillStyle = o.texte; g.globalAlpha = 0.6; g.textAlign = "left"; g.textBaseline = "top";
      g.fillText(`${o.duree} s`, 4, 3); g.textAlign = "right"; g.fillText("maintenant", W - 4, 3); g.globalAlpha = 1;
    }
  }
}

// ---------------------------------------------------------------- Note dominante
/** La note dominante, mise à jour 10 fois par seconde, gardée quelques images pour ne pas clignoter. */
export function useNoteSuivie() {
  const hist = useRef<(Note | null)[]>([]);
  return (img: Image): Note | null => {
    const n = noteDominante(img.temps, img.sr);
    hist.current.push(n); if (hist.current.length > 5) hist.current.shift();
    const ok = hist.current.filter(Boolean) as Note[];
    if (ok.length < 3) return null;
    const cpt = new Map<number, number>(); ok.forEach((x) => cpt.set(x.midi, (cpt.get(x.midi) ?? 0) + 1));
    const [m, c] = [...cpt.entries()].sort((a, b) => b[1] - a[1])[0];
    return c >= 3 ? ok.filter((x) => x.midi === m).pop()! : null;
  };
}

// ---------------------------------------------------------------- Petit spectre en direct (recettes, exercices, sessions)
let nMini = 0;
export function MiniSpectre({ texte = "Tourne un potard sur l'E2 et regarde le spectre bouger." }: { texte?: string }) {
  const [on, setOn] = useState(false);
  const qui = useMemo(() => `mini-spectre-${++nMini}`, []);
  const e = useEntree(qui, on);
  const cv = useRef<HTMLCanvasElement>(null);
  const [note, setNote] = useState<Note | null>(null);
  const suivre = useNoteSuivie();
  const souci = problemeEntree(e);
  useEffect(() => {
    if (!on || e.statut !== "ouvert") return;
    let raf = 0, t0 = 0;
    const etat = nouvelEtatSpectre(), cadence = { t: 0 };
    const f = (t: number) => {
      raf = requestAnimationFrame(f);
      if (imageASauter(t, cadence)) return;   // 30 images/s sur téléphone
      const img = lireImage(Math.min(0.8, prefsSpectre().lissage * 0.85)); const c = cv.current;
      if (!img || !c) return;
      dessinerSpectre(c, img, { gain: 6, theme: THEMES[0], zones: true }, etat);
      if (t - t0 > 120) { t0 = t; setNote(suivre(img)); }
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [on, e.statut]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`mini-spectre ${on ? "on" : ""}`}>
      <div className="mini-spectre-tete">
        <button type="button" className={`chipbtn ${on ? "on" : ""}`} onClick={() => setOn((o) => !o)} aria-pressed={on}>{on ? "■ Spectre en direct" : "▶ Spectre en direct"}</button>
        <span className="small muted">{on ? (e.statut === "ouvert" ? texte : e.statut === "erreur" ? <>Entrée indisponible : <a href="#audio">Réglages audio</a></> : "Ouverture de l'entrée…") : "Le son de l'E2 par la Scarlett, pendant que tu tournes un potard."}</span>
        {on && note && <span className="mini-note" title="Estimation de la note dominante">≈ <b>{note.nom}</b> <small>estimation</small></span>}
        {on && <ReglagesSpectre compact />}
      </div>
      {on && (
        <div className="mini-spectre-boite">
          <canvas ref={cv} className="mini-spectre-cv" role="img" aria-label="Spectre en direct de l'entrée audio" />
          {souci && <MessageVisu souci={souci} petit />}
        </div>
      )}
    </div>
  );
}

/** Message affiché par-dessus un affichage quand l'entrée ne donne rien (au lieu d'un écran vide). */
export function MessageVisu({ souci, petit }: { souci: { titre: string; texte: string }; petit?: boolean }) {
  return (
    <div className={`visu-souci ${petit ? "petit" : ""}`} role="alert">
      <b>⚠ {souci.titre}</b>
      {!petit && <span>{souci.texte}</span>}
      <a href="#audio">⚙ Réglages audio</a>
    </div>
  );
}
