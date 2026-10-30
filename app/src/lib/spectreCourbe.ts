// Analyseur de spectre en courbe, commun à toute l'app (Visualiseur, mode vidéo, Mastering, Analyser une référence,
// petits spectres des recettes). Une ligne lisse, l'espace dessous légèrement rempli, une échelle de fréquences
// logarithmique (chaque octave a la même largeur) et les zones sub / grave / médium / aigu dessinées dans le même
// canvas, avec le même calcul de position : elles restent alignées sur la courbe à toutes les tailles d'écran.
// Réglages partagés (gardés sur l'appareil) : lissage réactif ↔ lisse, maintien des crêtes, échelle log / linéaire.
import { useSyncExternalStore } from "react";
import { lireObjet, ecrireJson } from "./stockage";

export type Echelle = "log" | "lin";
export const FMIN = 20, FMAX = 20000;
/** Repères de fréquence sous la courbe. */
export const REPERES = [50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000];
export const ZONES = [
  { nom: "sub", f1: 20, f2: 60, couleur: "#9b6bff" },
  { nom: "grave", f1: 60, f2: 250, couleur: "#ff6a3d" },
  { nom: "médium", f1: 250, f2: 4000, couleur: "#ffd84d" },
  { nom: "aigu", f1: 4000, f2: 20000, couleur: "#3fd6d0" },
];
export const fmtF = (f: number) => (f >= 1000 ? `${f / 1000}k` : String(f));

/** Position (0 à 1) d'une fréquence sur l'axe. */
export const xDeF = (f: number, e: Echelle) => (e === "log" ? Math.log(Math.max(FMIN, f) / FMIN) / Math.log(FMAX / FMIN) : f / FMAX);
/** Fréquence à une position (0 à 1) de l'axe. */
export const fDeX = (x: number, e: Echelle) => (e === "log" ? FMIN * Math.pow(FMAX / FMIN, x) : Math.max(FMIN, x * FMAX));

// ---------------------------------------------------------------- Réglages partagés
export interface PrefsSpectre { lissage: number; cretes: boolean; echelle: Echelle }
const CLE = "e2academy.spectre";
const P0: PrefsSpectre = { lissage: 0.55, cretes: true, echelle: "log" };
let prefs: PrefsSpectre = lireObjet(CLE, P0);
const ecoute = new Set<() => void>();
export const prefsSpectre = () => prefs;
export function setPrefsSpectre(x: Partial<PrefsSpectre>) { prefs = { ...prefs, ...x }; ecrireJson(CLE, prefs); ecoute.forEach((f) => f()); }
export function usePrefsSpectre(): PrefsSpectre {
  return useSyncExternalStore((f) => { ecoute.add(f); return () => { ecoute.delete(f); }; }, () => prefs, () => prefs);
}

// ---------------------------------------------------------------- Points de la courbe
/** 1/24 d'octave de 20 Hz à 20 kHz (240 points) : assez fin pour une courbe lisse à toutes les tailles. */
export const FREQS_COURBE: Float32Array = (() => { const n = 240, f = new Float32Array(n + 1); for (let i = 0; i <= n; i++) f[i] = FMIN * Math.pow(FMAX / FMIN, i / n); return f; })();

/** dB par case de FFT → dB par point de la courbe. À chaque point : moyenne de puissance sur une bande autour de
 *  la fréquence (plus large quand le lissage monte). Dans le grave, où une bande est plus étroite qu'une case,
 *  on interpole entre les deux cases voisines : la courbe reste lisse, sans marches. */
export function courbeDepuisBins(bins: Float32Array, sr: number, nfft: number, lissage: number, out: Float32Array = new Float32Array(FREQS_COURBE.length)): Float32Array {
  const pas = sr / nfft, demi = Math.pow(2, 1 / 48 + lissage / 14), n = bins.length;
  for (let i = 0; i < FREQS_COURBE.length; i++) {
    const f = FREQS_COURBE[i], lo = f / demi / pas, hi = f * demi / pas;
    if (hi - lo < 2) {
      const k = Math.min(n - 2, Math.max(1, f / pas)), a = Math.floor(k), t = k - a;
      out[i] = Math.max(-200, bins[a]) * (1 - t) + Math.max(-200, bins[a + 1]) * t;   // -Infinity (silence) → -200 dB
    } else {
      const a = Math.max(1, Math.ceil(lo)), b = Math.min(n - 1, Math.floor(hi));
      let s = 0;
      for (let k = a; k <= b; k++) s += Math.pow(10, bins[k] / 10);
      out[i] = 10 * Math.log10(s / Math.max(1, b - a + 1) + 1e-20);
    }
  }
  return out;
}

/** Lissage dans le temps : montée rapide, descente plus lente selon le réglage (0 = réactif, 1 = lisse). */
export class LisseurTemps {
  v: Float32Array | null = null; private t = 0;
  maj(x: Float32Array, lissage: number, now: number): Float32Array {
    const dt = this.t ? Math.min(0.25, (now - this.t) / 1000) : 0; this.t = now;
    if (!this.v || this.v.length !== x.length) { this.v = Float32Array.from(x); return this.v; }
    const tauB = 0.015 + lissage * lissage * 0.7, tauH = tauB * 0.25;
    const aH = 1 - Math.exp(-dt / tauH), aB = 1 - Math.exp(-dt / tauB), v = this.v;
    for (let i = 0; i < x.length; i++) { v[i] += (x[i] - v[i]) * (x[i] > v[i] ? aH : aB); if (!Number.isFinite(v[i])) v[i] = Number.isFinite(x[i]) ? x[i] : -200; }
    return v;
  }
}

/** Maintien des crêtes : garde le niveau le plus haut pendant `tenue` ms, puis le laisse redescendre doucement. */
export class Cretes {
  v: Float32Array | null = null; private t: Float32Array | null = null; private dernier = 0;
  constructor(public tenue = 2500, public chute = 18) {}
  maj(x: ArrayLike<number>, now: number): Float32Array {
    if (!this.v || this.v.length !== x.length) { this.v = Float32Array.from(x); this.t = new Float32Array(x.length).fill(now); this.dernier = now; return this.v; }
    const dt = Math.min(0.25, (now - this.dernier) / 1000); this.dernier = now;
    const v = this.v, t = this.t!;
    for (let i = 0; i < x.length; i++) {
      if (x[i] >= v[i] || !Number.isFinite(v[i])) { v[i] = x[i]; t[i] = now; }
      else if (now - t[i] > this.tenue) v[i] = Math.max(x[i], v[i] - this.chute * dt);
    }
    return v;
  }
  vider() { this.v = null; }
}

// ---------------------------------------------------------------- Dessin
export interface Courbe {
  v: ArrayLike<number>;            // dB à chaque fréquence de `f`
  f?: ArrayLike<number>;           // fréquences (par défaut FREQS_COURBE)
  couleur: string;
  epais?: number;                  // en pixels CSS
  remplir?: boolean;               // remplit légèrement l'espace sous la courbe
  pointille?: boolean;
  decalage?: number;               // dB ajoutés (alignement d'une référence)
}
export interface OptsCourbes {
  echelle: Echelle;
  bas: number; haut: number;       // dB en bas et en haut de la zone de la courbe
  fond?: string | null;            // null : fond transparent (mode vidéo)
  grille?: string; texte?: string;
  zones?: boolean;                 // bandeau sub / grave / médium / aigu sous la courbe
  reperes?: boolean;               // repères en Hz
  grilleDb?: number;               // un trait tous les N dB (0 : aucun)
  cretes?: { v: ArrayLike<number>; f?: ArrayLike<number>; couleur?: string } | null;
  police?: string;
  echelleTexte?: number;           // agrandit les textes (mode vidéo sur grand écran)
}

/** La zone de la courbe (sans le bandeau des zones) pour une hauteur donnée : la même pour le dessin et les clics. */
export function zoneCourbe(h: number, o: Pick<OptsCourbes, "zones" | "echelleTexte">) {
  const k = o.echelleTexte ?? 1;
  const bandeau = o.zones ? Math.round(Math.max(13, Math.min(34, h * 0.07)) * k) : 0;
  return { haut: 0, bas: h - bandeau, bandeau };
}

/** Prépare un canvas à sa taille réelle à l'écran (pixels de l'écran, zoom de Windows compris). Dessin en pixels CSS. */
export function preparerCanvas(c: HTMLCanvasElement, maxDpr = 3): { g: CanvasRenderingContext2D; w: number; h: number; dpr: number } | null {
  const w = c.clientWidth, h = c.clientHeight;
  if (!w || !h) return null;
  // limite la taille du dessin (TV 4K à 200 % : jusqu'à 3840 px de large, pas plus de 8 millions de pixels)
  let dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
  if (w * h * dpr * dpr > 8.3e6) dpr = Math.sqrt(8.3e6 / (w * h));
  const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
  if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
  const g = c.getContext("2d");
  if (!g) return null;
  g.setTransform(W / w, 0, 0, H / h, 0, 0);
  return { g, w, h, dpr: W / w };
}

const POLICE = `"Jersey 10", ui-monospace, monospace`;

/** Trace une courbe lisse (courbes de Bézier entre les milieux des points). */
function tracer(g: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  if (!pts.length) return;
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
    g.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const d = pts[pts.length - 1];
  g.lineTo(d.x, d.y);
}

function points(v: ArrayLike<number>, f: ArrayLike<number>, w: number, y: (db: number) => number, e: Echelle, decalage = 0) {
  const pts: { x: number; y: number }[] = [];
  let dernierX = -1e9;
  // en linéaire, les points du grave tombent tous dans les premiers pixels : on n'en garde qu'un par demi-pixel
  for (let i = 0; i < v.length; i++) {
    const x = xDeF(f[i], e) * w;
    if (x - dernierX < 0.5 && i < v.length - 1) continue;
    dernierX = x;
    pts.push({ x, y: y(v[i] + decalage) });
  }
  return pts;
}

/** Dessine le fond, la grille, les repères en Hz, les courbes, les crêtes et les zones, dans les pixels CSS (w × h). */
export function dessinerCourbes(g: CanvasRenderingContext2D, w: number, h: number, courbes: Courbe[], o: OptsCourbes) {
  const k = o.echelleTexte ?? 1;
  const z = zoneCourbe(h, o), hc = z.bas;
  const yDe = (db: number) => Math.max(0, Math.min(hc, ((o.haut - db) / (o.haut - o.bas)) * hc));
  if (o.fond === null) g.clearRect(0, 0, w, h);
  else { g.fillStyle = o.fond ?? "#0c0d11"; g.fillRect(0, 0, w, h); }
  const grille = o.grille ?? "#ffffff14", texte = o.texte ?? "#eef1f6", police = o.police ?? POLICE;
  // grille horizontale (dB)
  if (o.grilleDb !== 0) {
    const pas = o.grilleDb ?? 12;
    g.fillStyle = grille;
    for (let db = Math.floor(o.haut / pas) * pas; db >= o.bas; db -= pas) g.fillRect(0, Math.round(yDe(db)), w, 1);
  }
  // repères verticaux (Hz) ; sur un petit écran, un sur deux
  const taille = Math.round(Math.max(10, Math.min(24, h / 18, w / 60)) * k);
  if (o.reperes !== false) {
    const liste = REPERES.filter((f) => (o.echelle === "lin" ? f >= 2000 || f === 1000 : true)).filter((f, i) => w >= 420 * k || [100, 1000, 10000].includes(f) || (o.echelle === "lin" && i % 2 === 0));
    g.font = `${taille}px ${police}`; g.textBaseline = "bottom";
    for (const f of liste) {
      const x = Math.round(xDeF(f, o.echelle) * w);
      g.fillStyle = grille; g.fillRect(x, 0, 1, hc);
      g.fillStyle = texte; g.globalAlpha = 0.65;
      g.textAlign = x > w - 20 ? "right" : "left";
      g.fillText(fmtF(f), x > w - 20 ? x - 3 : x + 3, hc - 2);
      g.globalAlpha = 1;
    }
  }
  g.save();
  g.beginPath(); g.rect(0, 0, w, hc); g.clip();
  g.lineJoin = "round"; g.lineCap = "round";
  for (const c of courbes) {
    const pts = points(c.v, c.f ?? FREQS_COURBE, w, yDe, o.echelle, c.decalage);
    if (pts.length < 2) continue;
    if (c.remplir) {
      g.beginPath(); tracer(g, pts); g.lineTo(pts[pts.length - 1].x, hc); g.lineTo(pts[0].x, hc); g.closePath();
      const dg = g.createLinearGradient(0, 0, 0, hc);
      dg.addColorStop(0, avecAlpha(c.couleur, 0.32)); dg.addColorStop(1, avecAlpha(c.couleur, 0.04));
      g.fillStyle = dg; g.fill();
    }
    g.beginPath(); tracer(g, pts);
    g.setLineDash(c.pointille ? [6 * k, 4 * k] : []);
    g.strokeStyle = c.couleur; g.lineWidth = (c.epais ?? 2) * k; g.stroke();
    g.setLineDash([]);
  }
  if (o.cretes) {
    const pts = points(o.cretes.v, o.cretes.f ?? FREQS_COURBE, w, yDe, o.echelle);
    g.beginPath(); tracer(g, pts);
    g.strokeStyle = o.cretes.couleur ?? avecAlpha(texte, 0.75); g.lineWidth = Math.max(1, k); g.stroke();
  }
  g.restore();
  if (o.zones) {
    const tz = Math.round(z.bandeau * 0.72);
    g.font = `${tz}px ${police}`; g.textAlign = "center"; g.textBaseline = "middle";
    for (const zn of ZONES) {
      const x1 = xDeF(zn.f1, o.echelle) * w, x2 = xDeF(zn.f2, o.echelle) * w;
      g.fillStyle = zn.couleur; g.globalAlpha = 0.85;
      g.fillRect(x1 + 1, hc + 2, Math.max(1, x2 - x1 - 2), z.bandeau - 2);
      g.globalAlpha = 1;
      if (x2 - x1 > g.measureText(zn.nom).width + 6) { g.fillStyle = "#0b0d12"; g.fillText(zn.nom, (x1 + x2) / 2, hc + 1 + z.bandeau / 2); }
    }
  }
}

/** « #ff6a3d » + 0,3 → « rgba(255,106,61,0.3) ». Accepte aussi les couleurs à 3 chiffres. */
export function avecAlpha(c: string, a: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(c.trim());
  if (!m) return c;
  let h = m[1]; if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Bornes de dB adaptées à des courbes moyennes (Mastering, référence) : le haut juste au-dessus du maximum. */
export function bornesAuto(courbes: { v: ArrayLike<number> }[], plage = 66): { haut: number; bas: number } {
  let m = -200;
  for (const c of courbes) for (let i = 0; i < c.v.length; i++) if (c.v[i] > m) m = c.v[i];
  const haut = m > -200 ? Math.ceil(m / 6) * 6 + 4 : -10;
  return { haut, bas: haut - plage };
}
