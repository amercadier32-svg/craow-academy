// Dessins du Visualiseur en direct (canvas) : spectre en barres, spectrogramme, oscilloscope, stéréo.
// Le même code sert à la page Visualiseur, au petit spectre des recettes et au mode vidéo.
import { imageASauter } from "../lib/moteurAudio";
import { useEffect, useMemo, useRef, useState } from "react";
import { FREQS_SPECTRE } from "../lib/masterAnalyse";
import { alignement, lireImage, noteDominante, type Image, type Note } from "../lib/visuAudio";
import { useEntree } from "../lib/audioEntree";
import "./visus.css";

export type Echelle = "log" | "lin";
export interface Theme { id: string; nom: string; fond: string; grille: string; texte: string; barres: string[]; onde: string; accent: string }
export const THEMES: Theme[] = [
  { id: "craow", nom: "CrAoW", fond: "#0c0d11", grille: "#ffffff12", texte: "#eef1f6", barres: ["#4fd18b", "#ffd84d", "#ff6a3d", "#ff3b3b"], onde: "#7fe0ff", accent: "#ff3b3b" },
  { id: "tribe", nom: "Tribe", fond: "#140b07", grille: "#ff6a3d18", texte: "#ffe6d6", barres: ["#ff6a3d", "#ffb020", "#ffd84d", "#fff3c2"], onde: "#ffb020", accent: "#ff6a3d" },
  { id: "acid", nom: "Acid", fond: "#060d06", grille: "#b8ff3a14", texte: "#eaffd6", barres: ["#2e9a62", "#4fd18b", "#b8ff3a", "#f2ff7a"], onde: "#b8ff3a", accent: "#e255c8" },
  { id: "glace", nom: "Glace", fond: "#05090f", grille: "#7fe0ff14", texte: "#e6f6ff", barres: ["#3f6dae", "#5b8bd0", "#7fe0ff", "#ffffff"], onde: "#7fe0ff", accent: "#9b6bff" },
  { id: "rave", nom: "Rave", fond: "#0b0612", grille: "#e255c814", texte: "#ffe6fb", barres: ["#9b6bff", "#e255c8", "#ff6a9a", "#ffd84d"], onde: "#3fd6d0", accent: "#e255c8" },
];
export const ZONES = [
  { nom: "sub", f1: 20, f2: 60, couleur: "#9b6bff" },
  { nom: "grave", f1: 60, f2: 250, couleur: "#ff6a3d" },
  { nom: "médium", f1: 250, f2: 4000, couleur: "#ffd84d" },
  { nom: "aigu", f1: 4000, f2: 20000, couleur: "#3fd6d0" },
];
const ETIQ = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
const fmtF = (f: number) => (f >= 1000 ? `${f / 1000}k` : String(f));

export interface OptsSpectre { echelle: Echelle; plancher: number; gain: number; theme: Theme; ref?: number[] | null; zones?: boolean; etiquettes?: boolean; pixel?: number; pics?: number[] }

/** Position (0 à 1) d'une fréquence sur l'axe. */
export const xDeF = (f: number, e: Echelle) => (e === "log" ? Math.log(f / 20) / Math.log(1000) : f / 20000);

/** Hauteur (0 à 1) d'un niveau en dB. */
const hDb = (db: number, o: OptsSpectre) => Math.max(0, Math.min(1, (db + o.gain - o.plancher) / -o.plancher));

/** Barres du spectre en bandes : 61 bandes de 1/6 d'octave (log) ou 80 bandes égales (linéaire). */
function barresDe(img: Image, e: Echelle): { f1: number; f2: number; db: number }[] {
  if (e === "log") return FREQS_SPECTRE.map((f, i) => ({ f1: f / Math.pow(2, 1 / 12), f2: f * Math.pow(2, 1 / 12), db: img.bandes[i] }));
  const n = 80, bin = img.sr / 8192, out: { f1: number; f2: number; db: number }[] = [];
  for (let i = 0; i < n; i++) {
    const f1 = (i / n) * 20000, f2 = ((i + 1) / n) * 20000;
    let s = 0;
    for (let k = Math.max(1, Math.floor(f1 / bin)); k < Math.ceil(f2 / bin) && k < img.spectreBins.length; k++) s += Math.pow(10, img.spectreBins[k] / 10);
    out.push({ f1, f2, db: 10 * Math.log10(s + 1e-20) });
  }
  return out;
}

export function dessinerSpectre(c: HTMLCanvasElement, img: Image, o: OptsSpectre) {
  const g = c.getContext("2d"); if (!g) return;
  const W = c.width, H = c.height, bas = o.zones ? Math.round(H * 0.1) + 2 : 0, h = H - bas, px = o.pixel ?? 4;
  g.fillStyle = o.theme.fond; g.fillRect(0, 0, W, H);
  // grille : un trait tous les 12 dB
  g.fillStyle = o.theme.grille;
  for (let db = 0; db >= o.plancher; db -= 12) { const y = Math.round(h - hDb(db - o.gain, o) * h); g.fillRect(0, y, W, 1); }
  const b = barresDe(img, o.echelle);
  const pics = o.pics;
  b.forEach((x, i) => {
    const x1 = Math.round(xDeF(Math.max(20, x.f1), o.echelle) * W), x2 = Math.round(xDeF(Math.min(20000, x.f2), o.echelle) * W);
    const w = Math.max(1, x2 - x1 - (x2 - x1 > 3 ? 1 : 0));
    const v = hDb(x.db, o), hh = Math.floor((v * h) / px) * px;
    for (let y = 0; y < hh; y += px) {
      const r = y / h;
      g.fillStyle = o.theme.barres[r > 0.9 ? 3 : r > 0.75 ? 2 : r > 0.5 ? 1 : 0];
      g.fillRect(x1, h - y - px, w, Math.max(1, px - (px > 2 ? 1 : 0)));
    }
    if (pics) {
      pics[i] = Math.max(hh, (pics[i] ?? 0) - h * 0.006);
      g.fillStyle = o.theme.texte; g.fillRect(x1, h - pics[i] - 2, w, 2);
    }
  });
  if (o.ref && o.echelle === "log") {
    const d = alignement(img.bandes, o.ref);
    g.strokeStyle = "#ffffff"; g.lineWidth = Math.max(1.5, W / 500); g.setLineDash([6, 4]);
    g.beginPath();
    FREQS_SPECTRE.forEach((f, i) => { const X = xDeF(f, "log") * W, Y = h - hDb(o.ref![i] + d, o) * h; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); });
    g.stroke(); g.setLineDash([]);
  }
  if (o.zones) {
    ZONES.forEach((z) => {
      const x1 = xDeF(z.f1, o.echelle) * W, x2 = xDeF(z.f2, o.echelle) * W;
      g.fillStyle = z.couleur; g.globalAlpha = 0.85; g.fillRect(x1 + 1, h + 2, Math.max(1, x2 - x1 - 2), bas - 2); g.globalAlpha = 1;
      if (x2 - x1 > 34) { g.fillStyle = "#0b0d12"; g.font = `${Math.round(bas * 0.75)}px "Jersey 10", monospace`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(z.nom, (x1 + x2) / 2, h + 1 + bas / 2); }
    });
  }
  if (o.etiquettes) {
    g.fillStyle = o.theme.texte; g.globalAlpha = 0.6; g.font = `${Math.max(10, Math.round(H / 18))}px "Jersey 10", monospace`; g.textAlign = "center"; g.textBaseline = "top";
    for (const f of ETIQ) { if (o.echelle === "lin" && f < 1000) continue; const X = xDeF(f, o.echelle) * W; g.fillRect(X, 0, 1, 6); g.fillText(fmtF(f), X, 8); }
    g.globalAlpha = 1;
  }
}

// Couleurs du spectrogramme : noir → bleu → violet → orange → jaune
const CMAP: [number, number, number][] = [[12, 13, 17], [30, 50, 120], [120, 60, 190], [226, 85, 200], [255, 106, 61], [255, 216, 77], [255, 255, 230]];
function couleurCmap(v: number) {
  const x = Math.max(0, Math.min(0.9999, v)) * (CMAP.length - 1), i = Math.floor(x), t = x - i, a = CMAP[i], b = CMAP[i + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}
/** Le spectrogramme défile de droite à gauche : grave en bas, aigu en haut. */
export function dessinerSpectrogramme(c: HTMLCanvasElement, img: Image, o: OptsSpectre, pas = 2) {
  const g = c.getContext("2d"); if (!g) return;
  const W = c.width, H = c.height;
  g.drawImage(c, -pas, 0);
  const bin = img.sr / 8192;
  for (let y = 0; y < H; y += 2) {
    const r = 1 - y / H;
    const f = o.echelle === "log" ? 20 * Math.pow(1000, r) : r * 20000;
    const k = Math.max(1, Math.min(img.spectreBins.length - 1, Math.round(f / bin)));
    g.fillStyle = couleurCmap(hDb(img.spectreBins[k] + 20, o));
    g.fillRect(W - pas, y, pas, 2);
  }
}

/** Oscilloscope déclenché sur un passage par zéro en montant (image stable). */
export function dessinerOscillo(c: HTMLCanvasElement, img: Image, o: { theme: Theme; gain: number; fenetre?: number; epais?: number }) {
  const g = c.getContext("2d"); if (!g) return;
  const W = c.width, H = c.height, x = img.temps, n = Math.min(o.fenetre ?? 2048, x.length / 2);
  g.fillStyle = o.theme.fond; g.fillRect(0, 0, W, H);
  g.fillStyle = o.theme.grille; g.fillRect(0, H / 2, W, 1); g.fillRect(0, H / 4, W, 1); g.fillRect(0, (3 * H) / 4, W, 1);
  let d = 0;
  for (let i = 1; i < x.length - n; i++) if (x[i - 1] < 0 && x[i] >= 0) { d = i; break; }
  const gain = Math.pow(10, o.gain / 20);
  g.strokeStyle = o.theme.onde; g.lineWidth = o.epais ?? Math.max(1.5, W / 400);
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const X = (i / (n - 1)) * W, Y = H / 2 - Math.max(-1, Math.min(1, x[d + i] * gain)) * (H / 2 - 2);
    if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
  }
  g.stroke();
}

/** Stéréo : nuage de points (milieu en haut, côtés à gauche et à droite) et barre de phase. */
export function dessinerStereo(c: HTMLCanvasElement, img: Image, o: { theme: Theme; gain: number }) {
  const g = c.getContext("2d"); if (!g) return;
  const W = c.width, H = c.height, barre = Math.round(H * 0.12), h = H - barre - 6, cx = W / 2, cy = h / 2, r = Math.min(W, h) / 2 - 4;
  g.fillStyle = o.theme.fond; g.fillRect(0, 0, W, H);
  g.strokeStyle = o.theme.grille; g.lineWidth = 1;
  g.beginPath(); g.moveTo(cx - r, cy); g.lineTo(cx + r, cy); g.moveTo(cx, cy - r); g.lineTo(cx, cy + r); g.stroke();
  g.beginPath(); g.moveTo(cx - r * 0.7, cy - r * 0.7); g.lineTo(cx + r * 0.7, cy + r * 0.7); g.moveTo(cx + r * 0.7, cy - r * 0.7); g.lineTo(cx - r * 0.7, cy + r * 0.7); g.stroke();
  const gain = Math.pow(10, o.gain / 20) * 1.4;
  g.fillStyle = o.theme.onde;
  for (let i = 0; i < img.L.length; i += 2) {
    const l = img.L[i] * gain, rr = img.R[i] * gain;
    const X = cx + ((rr - l) / Math.SQRT2) * r, Y = cy - ((l + rr) / Math.SQRT2) * r;
    g.fillRect(X, Y, 2, 2);
  }
  g.font = `${Math.max(10, Math.round(H / 16))}px "Jersey 10", monospace`; g.fillStyle = o.theme.texte; g.globalAlpha = 0.6;
  g.textAlign = "left"; g.fillText("G", 4, cy - 4); g.textAlign = "right"; g.fillText("D", W - 4, cy - 4); g.textAlign = "center"; g.fillText("centre", cx, 12); g.globalAlpha = 1;
  // barre de corrélation −1 … +1
  const y = H - barre;
  g.fillStyle = "#2a2d36"; g.fillRect(0, y, W, barre);
  const k = (img.correlation + 1) / 2;
  g.fillStyle = img.correlation < 0 ? "#ff3b3b" : img.correlation < 0.3 ? "#ffb020" : "#4fd18b";
  g.fillRect(W / 2, y, (k - 0.5) * W, barre);
  g.fillStyle = o.theme.texte; g.fillRect(W / 2, y, 1, barre);
}

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
  useEffect(() => {
    if (!on || e.statut !== "ouvert") return;
    let raf = 0, t0 = 0;
    const pics: number[] = [], cadence = { t: 0 };
    const f = (t: number) => {
      raf = requestAnimationFrame(f);
      if (imageASauter(t, cadence)) return;   // 30 images/s sur téléphone
      const img = lireImage(0.75); const c = cv.current;
      if (!img || !c) return;
      dessinerSpectre(c, img, { echelle: "log", plancher: -84, gain: 6, theme: THEMES[0], zones: true, pixel: 3, pics });
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
      </div>
      {on && <canvas ref={cv} className="mini-spectre-cv" width={640} height={120} role="img" aria-label="Spectre en direct de l'entrée audio" />}
    </div>
  );
}
