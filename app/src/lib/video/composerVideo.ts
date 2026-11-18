// Enregistrement vidéo du Mode vidéo : la scène (fond, webcam, visualisations, textes) est recomposée sur un canvas
// caché, puis capturée avec le son de l'entrée audio (la Scarlett) dans un seul fichier mp4 ou webm.
// Aucune nouvelle autorisation : le micro (entrée audio) et la caméra sont déjà ouverts par le mode vidéo.
import type { ConfigVideo, Pos, TexteV, TypeVisu } from "../../modules/studio/ModeVideo";
import { contexteEntree, sortieEntree } from "../audio/audioEntree";
import { famille } from "./policesVideo";

/** Style de rendu d'une visualisation (filtre CSS / canvas) ; `s` = échelle (hauteur de l'image / 720). */
export function renduFiltre(rendu: string | undefined, couleur: string, s: number): string {
  if (rendu === "neon") return `drop-shadow(0 0 ${(4 * s).toFixed(1)}px ${couleur}) drop-shadow(0 0 ${(12 * s).toFixed(1)}px ${couleur})`;
  if (rendu === "doux") return `blur(${(1.5 * s).toFixed(1)}px)`;
  return "none";
}

/** Emplacement réel d'un texte : la position choisie (haut / centre / bas) + l'alignement gauche / centre / droite (sans effet au centre). */
export function posEff(t: TexteV): Pos {
  if (!t.align || t.position === "centre") return t.position;
  const v = t.position.startsWith("haut") ? "haut" : "bas";
  return (t.align === "center" ? v : `${v}-${t.align === "left" ? "gauche" : "droite"}`) as Pos;
}

export interface Degrade { on: boolean; stops: { p: number; c: string }[]; vertical?: boolean }
const trier = (d: Degrade) => [...d.stops].sort((a, b) => a.p - b.p);
export const cssDegrade = (d: Degrade, sens = d.vertical ? "180deg" : "90deg") => `linear-gradient(${sens}, ${trier(d).map((x) => `${x.c} ${(x.p * 100).toFixed(1)}%`).join(", ")})`;
/** Recolore tout ce qui est dessiné sur le canvas avec le dégradé (l'opacité de chaque pixel est gardée). */
export function appliquerDegrade(cv: HTMLCanvasElement, d: Degrade) {
  const g = cv.getContext("2d"); if (!g || !cv.width || d.stops.length < 2) return;
  const gr = d.vertical ? g.createLinearGradient(0, 0, 0, cv.height) : g.createLinearGradient(0, 0, cv.width, 0);
  trier(d).forEach((x) => gr.addColorStop(Math.min(1, Math.max(0, x.p)), x.c));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height); g.restore();
}

export interface Sources {
  cfg: ConfigVideo; pulse: number;
  canvases: Partial<Record<TypeVisu, HTMLCanvasElement | null>>;
  cam: HTMLVideoElement | null; fond: HTMLImageElement | HTMLVideoElement | null; bpm: string;
}

/** Dessine `src` comme le ferait object-fit (cover ou contain) dans le rectangle donné. */
function ajuster(g: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, x: number, y: number, w: number, h: number, cover: boolean, miroir = false) {
  if (!sw || !sh) return;
  const k = (cover ? Math.max : Math.min)(w / sw, h / sh), dw = sw * k, dh = sh * k;
  g.save();
  if (miroir) { g.translate(x + w, y); g.scale(-1, 1); g.translate(-x, -y); }
  g.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  g.restore();
}
const dimsDe = (s: HTMLImageElement | HTMLVideoElement): [number, number] => s instanceof HTMLVideoElement ? [s.videoWidth, s.videoHeight] : [s.naturalWidth, s.naturalHeight];

export function composer(g: CanvasRenderingContext2D, W: number, H: number, s: Sources) {
  const { cfg, pulse: p } = s;
  g.clearRect(0, 0, W, H);
  // fond (shortcut : la grille de séquenceur et la pulsation du fond ne sont pas reproduites)
  if (cfg.fond.incrust) { g.fillStyle = cfg.fond.incrust === "vert" ? "#00ff00" : "#000"; g.fillRect(0, 0, W, H); }
  else {
    g.fillStyle = cfg.fond.couleur; g.fillRect(0, 0, W, H);
    if (s.fond) {
      const [sw, sh] = dimsDe(s.fond);
      g.save(); g.globalAlpha = cfg.fond.opacite;
      if (cfg.fond.flou) g.filter = `blur(${(cfg.fond.flou * H) / 1080}px)`;
      ajuster(g, s.fond, sw, sh, 0, 0, W, H, cfg.fond.ajuster === "remplir");
      g.restore();
    }
    if (cfg.fond.sombre > 0) { g.fillStyle = `rgba(0,0,0,${cfg.fond.sombre})`; g.fillRect(0, 0, W, H); }
  }
  const w = cfg.webcam, cam = w.on && s.cam && s.cam.videoWidth ? s.cam : null;
  if (cam && w.plein) { g.save(); g.globalAlpha = w.opacite; ajuster(g, cam, cam.videoWidth, cam.videoHeight, 0, 0, W, H, true, w.miroir); g.restore(); }
  const calque = () => {
    if (!cam || w.plein) return;
    const bw = (w.w / 100) * W, bh = w.forme === "cercle" ? bw : (w.h / 100) * H, bx = (w.x / 100) * W, by = (w.y / 100) * H;
    const b = ((w.epais * H) / 1080) * (1 + (w.pulse ? p : 0) * 0.9);
    const rayon = w.forme === "cercle" ? bw / 2 : w.forme === "arrondi" ? H * 0.045 : 0;
    const forme = () => { g.beginPath(); g.roundRect(bx, by, bw, bh, rayon); };
    g.save(); g.globalAlpha = w.opacite;
    forme(); g.clip(); g.fillStyle = "#0c0d11"; g.fillRect(bx, by, bw, bh);
    ajuster(g, cam, cam.videoWidth, cam.videoHeight, bx, by, bw, bh, true, w.miroir);
    g.restore();
    if (b > 0) {
      g.save(); g.globalAlpha = w.opacite; g.strokeStyle = w.bord; g.lineWidth = b * 2; // moitié rognée par le clip : contour intérieur
      if (w.pulse && p > 0.02) { g.shadowColor = w.bord; g.shadowBlur = p * 28 * Math.max(0.6, H / 720); }
      forme(); g.clip(); forme(); g.stroke(); g.restore();
    }
  };
  const ondes = () => {
  for (const k of cfg.couches) {
    const cv = s.canvases[k.type];
    if (!k.on || !cv || !cv.width) continue;
    const x = (k.x / 100) * W, y = (k.y / 100) * H, cw = (k.w / 100) * W, ch = (k.h / 100) * H, sc = k.pulse ? 1 + p * 0.07 : 1;
    g.save(); g.globalAlpha = k.opacite; g.filter = renduFiltre(k.rendu, k.couleur, H / 720); g.translate(x + cw / 2, y + ch / 2); g.scale(sc, sc);
    g.drawImage(cv, -cw / 2, -ch / 2, cw, ch); g.restore();
  }
  };
  // ordre : webcam derrière les visualisations (par défaut) ou devant
  if (w.devant) { ondes(); calque(); } else { calque(); ondes(); }
  // textes : mêmes 7 positions et mêmes marges que l'écran (3 % de la hauteur et de la largeur)
  const POS: Pos[] = ["haut-gauche", "haut", "haut-droite", "centre", "bas-gauche", "bas", "bas-droite"];
  for (const pos of POS) {
    const ici = (["artiste", "morceau", "bpm"] as const).filter((c) => cfg.textes[c].on && posEff(cfg.textes[c]) === pos)
      .map((c) => ({ t: cfg.textes[c], txt: c === "bpm" ? (cfg.textes.bpm.auto ? s.bpm : `${cfg.textes.bpm.valeur || "?"} BPM`) : cfg.textes[c].valeur }))
      .filter((x) => x.txt);
    if (!ici.length) continue;
    const px = ici.map((x) => (x.t.taille / 100) * H), gap = H * 0.004, total = px.reduce((a, b) => a + b, 0) + gap * (ici.length - 1);
    const my = H * 0.03, mx = W * 0.03;
    let y = pos.startsWith("haut") ? my : pos.startsWith("bas") ? H - my - total : (H - total) / 2;
    const align: CanvasTextAlign = pos.endsWith("gauche") ? "left" : pos.endsWith("droite") ? "right" : "center";
    const x = align === "left" ? mx : align === "right" ? W - mx : W / 2;
    ici.forEach(({ t, txt }, i) => {
      g.save(); g.font = `${t.italique ? "italic " : ""}${t.gras ? "bold " : ""}${px[i]}px ${famille(t.police)}`; g.textAlign = align; g.textBaseline = "top"; g.fillStyle = t.couleur;
      if (t.style === "contour") { g.lineJoin = "round"; g.lineWidth = Math.max(1, px[i] * 0.06) * 2; g.strokeStyle = t.bord; g.strokeText(txt, x, y); }
      if (t.style === "ombre") { g.shadowColor = t.bord; g.shadowBlur = Math.max(3, px[i] * 0.3); g.shadowOffsetY = Math.max(1, px[i] * 0.05); }
      g.fillText(txt, x, y);
      if (t.souligne) { const tw = g.measureText(txt).width; g.shadowColor = "transparent"; g.fillRect(align === "left" ? x : align === "right" ? x - tw : x - tw / 2, y + px[i] * 0.92, tw, Math.max(1, px[i] * 0.06)); }
      g.restore();
      y += px[i] + gap;
    });
  }
}

const TYPES = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
export interface EnregVideo { arreter: () => Promise<{ blob: Blob; ext: string }> }

/** Démarre l'enregistrement image + son. Lève une erreur claire si le son ou le format n'est pas disponible. */
export function demarrerVideo(format: "16:9" | "9:16", lire: () => Sources): EnregVideo {
  const ctx = contexteEntree(), sortie = sortieEntree();
  if (!ctx || !sortie) throw new Error("L'entrée audio n'est pas ouverte : attends qu'elle s'ouvre, puis relance.");
  if (typeof MediaRecorder === "undefined") throw new Error("Ce navigateur ne sait pas enregistrer de vidéo.");
  const mime = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
  if (!mime) throw new Error("Aucun format vidéo (mp4 ou webm) n'est disponible dans ce navigateur.");
  const W = format === "16:9" ? 1280 : 720, H = format === "16:9" ? 720 : 1280;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d")!;
  const dest = ctx.createMediaStreamDestination();
  sortie.connect(dest);
  const flux = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const rec = new MediaRecorder(flux, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const morceaux: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data); };
  // shortcut : la composition s'arrête si l'onglet passe en arrière-plan (rAF suspendu), à upgrader avec un Worker si besoin
  let raf = 0;
  const boucle = () => { raf = requestAnimationFrame(boucle); composer(g, W, H, lire()); };
  raf = requestAnimationFrame(boucle);
  rec.start(1000);
  return {
    arreter: () => new Promise((ok) => {
      rec.onstop = () => {
        cancelAnimationFrame(raf);
        try { sortie.disconnect(dest); } catch { /* déjà débranché */ }
        flux.getTracks().forEach((t) => t.stop());
        ok({ blob: new Blob(morceaux, { type: mime.split(";")[0] }), ext: mime.startsWith("video/mp4") ? "mp4" : "webm" });
      };
      if (rec.state !== "inactive") rec.stop(); else rec.onstop?.(new Event("stop"));
    }),
  };
}
