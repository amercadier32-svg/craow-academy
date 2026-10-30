// Mode vidéo du Visualiseur (OBS, TikTok, YouTube) : plein écran sans menus, 16:9 ou 9:16.
// - Visualisations au choix (spectre en courbe, spectrogramme, oscilloscope, forme d'onde défilante, vumètre,
//   goniomètre) : chacune s'affiche ou se masque, se déplace et se redimensionne à la souris (ou au doigt),
//   avec sa couleur, son épaisseur, sa transparence et une pulsation au kick en option. Dispositions toutes prêtes.
// - Textes (nom d'artiste, BPM, nom du morceau) : police (une douzaine de polices gratuites), taille, couleur,
//   contour ou ombre, position.
// - Fond : couleur, ou image / vidéo importée depuis l'appareil (gardée dans le navigateur, jamais publiée),
//   remplir ou ajuster, opacité, flou, assombrissement, pulsation au kick ; galerie avec suppression.
// - Presets : tous ces choix enregistrés ensemble.
// Échap pour sortir, R pour lancer / arrêter l'enregistrement.
import { Deroulant } from "../components/Deroulant";
import { BoutonSupprimer, confirmer } from "../components/Confirmer";
import { imageASauter } from "../lib/moteurAudio";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as PE } from "react";
import { InfosRec, mmss, type EtatEnregistreur } from "../components/Enregistreur";
import { DUREE_MAX_S } from "../lib/enregistreur";
import { MessageVisu, OndeDefilante, THEMES, dessinerOscillo, dessinerSpectre, dessinerSpectrogramme, dessinerStereo, dessinerVumetre, nouvelEtatSpectre, nouvelEtatSpectrogramme, nouvelEtatVu, type Theme } from "../components/Visus";
import { problemeEntree, useEntree } from "../lib/audioEntree";
import { DetecteurKick, lireImage } from "../lib/visuAudio";
import { prefsSpectre } from "../lib/spectreCourbe";
import { lireJson, ecrireJson } from "../lib/stockage";
import { POLICES, chargerPolices, famille } from "../lib/policesVideo";
import { ACCEPT, ajouterFond, effacerFond, fmtMo, lireFond, listerFonds, surChangementFonds, type InfosFond } from "../lib/fondsVideo";
import "./mode-video.css";

// ---------------------------------------------------------------- Réglages
export type TypeVisu = "spectre" | "spectrogramme" | "oscillo" | "onde" | "vu" | "stereo";
export const VISUS_VIDEO: { id: TypeVisu; nom: string }[] = [
  { id: "spectre", nom: "Spectre en courbe" },
  { id: "spectrogramme", nom: "Spectrogramme" },
  { id: "oscillo", nom: "Oscilloscope" },
  { id: "onde", nom: "Forme d'onde défilante" },
  { id: "vu", nom: "Vumètre" },
  { id: "stereo", nom: "Goniomètre (stéréo)" },
];
export interface Couche {
  type: TypeVisu; on: boolean;
  x: number; y: number; w: number; h: number;      // en % de l'écran vidéo
  couleur: string; epais: number; opacite: number; pulse: boolean;
  reperes: boolean;                                // Hz, zones, graduations
  palette: boolean;                                // spectrogramme : dégradé de couleurs (sinon : la couleur choisie)
}
export type Pos = "haut-gauche" | "haut" | "haut-droite" | "centre" | "bas-gauche" | "bas" | "bas-droite";
const POSITIONS: { id: Pos; nom: string }[] = [
  { id: "haut-gauche", nom: "Haut à gauche" }, { id: "haut", nom: "Haut" }, { id: "haut-droite", nom: "Haut à droite" },
  { id: "centre", nom: "Centre" },
  { id: "bas-gauche", nom: "Bas à gauche" }, { id: "bas", nom: "Bas" }, { id: "bas-droite", nom: "Bas à droite" },
];
export interface TexteV { on: boolean; valeur: string; police: string; taille: number; couleur: string; style: "aucun" | "contour" | "ombre"; bord: string; position: Pos; auto?: boolean }
type CleTexte = "artiste" | "morceau" | "bpm";
/** `incrust` : fond vert (incrustation, « chroma key ») ou transparent, pour OBS. Absent = fond normal. */
export interface FondV { mediaId: string | null; couleur: string; grille: boolean; ajuster: "remplir" | "ajuster"; opacite: number; flou: number; sombre: number; pulse: boolean; incrust?: "vert" | "transparent" }
export interface ConfigVideo { format: "16:9" | "9:16"; couches: Couche[]; textes: Record<CleTexte, TexteV>; fond: FondV; ondeDuree: number }

const c0 = (type: TypeVisu, on: boolean, x: number, y: number, w: number, h: number, couleur: string, extra: Partial<Couche> = {}): Couche =>
  ({ type, on, x, y, w, h, couleur, epais: 3, opacite: 1, pulse: false, reperes: false, palette: true, ...extra });
export const CONFIG0: ConfigVideo = {
  format: "16:9",
  couches: [
    c0("spectre", true, 4, 30, 92, 44, "#7fe0ff", { pulse: true }),
    c0("spectrogramme", false, 4, 30, 92, 44, "#e255c8"),
    c0("oscillo", false, 15, 38, 70, 26, "#ffd84d"),
    c0("onde", false, 4, 72, 92, 20, "#4fd18b"),
    c0("vu", false, 90, 25, 6, 50, "#4fd18b"),
    c0("stereo", false, 38, 28, 24, 44, "#7fe0ff"),
  ],
  textes: {
    artiste: { on: true, valeur: "CrAoW", police: "jersey", taille: 13, couleur: "#ff3b3b", style: "ombre", bord: "#000000", position: "haut" },
    morceau: { on: false, valeur: "", police: "jersey", taille: 6, couleur: "#eef1f6", style: "ombre", bord: "#000000", position: "bas" },
    bpm: { on: true, valeur: "130", police: "jersey", taille: 6, couleur: "#eef1f6", style: "ombre", bord: "#000000", position: "bas", auto: false },
  },
  fond: { mediaId: null, couleur: "#0c0d11", grille: true, ajuster: "remplir", opacite: 1, flou: 0, sombre: 0.35, pulse: true },
  ondeDuree: 8,
};
const CLE = "e2academy.video";
const CLE_PRESETS = "e2academy.video.presets";
export interface PresetVideo { id: string; nom: string; config: ConfigVideo; creeLe: string }

/** Ancien mode vidéo (nom, BPM, morceau, thème) : repris une fois dans les nouveaux réglages. */
export interface AncienVideo { format: "16:9" | "9:16"; theme: string; nom: string; afficherNom: boolean; bpm: string; bpmAuto: boolean; afficherBpm: boolean; morceau: string; afficherMorceau: boolean; pulse: boolean }
function completer(x: Partial<ConfigVideo>): ConfigVideo {
  const couches = CONFIG0.couches.map((d) => ({ ...d, ...(x.couches?.find((c) => c.type === d.type) ?? {}) }));
  const t = x.textes ?? ({} as Partial<Record<CleTexte, TexteV>>);
  return {
    ...CONFIG0, ...x, couches,
    textes: { artiste: { ...CONFIG0.textes.artiste, ...t.artiste }, morceau: { ...CONFIG0.textes.morceau, ...t.morceau }, bpm: { ...CONFIG0.textes.bpm, ...t.bpm } },
    fond: { ...CONFIG0.fond, ...(x.fond ?? {}) },
  };
}
function lireConfig(ancien?: AncienVideo): ConfigVideo {
  const x = lireJson<Partial<ConfigVideo> | null>(CLE, null);
  if (x) return completer(x);
  if (!ancien) return CONFIG0;
  const th = THEMES.find((t) => t.id === ancien.theme) ?? THEMES[0];
  return appliquerTheme(completer({
    format: ancien.format,
    textes: {
      artiste: { ...CONFIG0.textes.artiste, on: ancien.afficherNom, valeur: ancien.nom },
      morceau: { ...CONFIG0.textes.morceau, on: ancien.afficherMorceau, valeur: ancien.morceau },
      bpm: { ...CONFIG0.textes.bpm, on: ancien.afficherBpm, valeur: ancien.bpm, auto: ancien.bpmAuto },
    },
  }), th);
}
function appliquerTheme(c: ConfigVideo, th: Theme): ConfigVideo {
  const coul: Record<TypeVisu, string> = { spectre: th.onde, spectrogramme: th.accent, oscillo: th.barres[2], onde: th.barres[1], vu: th.barres[0], stereo: th.onde };
  return {
    ...c, couches: c.couches.map((k) => ({ ...k, couleur: coul[k.type] })),
    textes: { ...c.textes, artiste: { ...c.textes.artiste, couleur: th.accent }, morceau: { ...c.textes.morceau, couleur: th.texte }, bpm: { ...c.textes.bpm, couleur: th.texte } },
    fond: { ...c.fond, couleur: th.fond },
  };
}

// ---------------------------------------------------------------- Dispositions toutes prêtes
type Dispo = "plein" | "bandeau" | "deux" | "grille4";
const DISPOS: { id: Dispo; nom: string; texte: string }[] = [
  { id: "plein", nom: "Plein écran", texte: "Une seule visualisation sur tout l'écran." },
  { id: "bandeau", nom: "Bandeau en bas", texte: "Les visualisations côte à côte dans une bande en bas." },
  { id: "deux", nom: "Deux côte à côte", texte: "Deux visualisations, l'une à côté de l'autre." },
  { id: "grille4", nom: "Grille de quatre", texte: "Quatre visualisations en carré." },
];
const ORDRE_DEFAUT: TypeVisu[] = ["spectre", "spectrogramme", "onde", "stereo", "oscillo", "vu"];
function disposer(c: ConfigVideo, d: Dispo): ConfigVideo {
  const vertical = c.format === "9:16";
  const visibles = c.couches.filter((k) => k.on).map((k) => k.type);
  const voulu = d === "plein" ? 1 : d === "deux" ? 2 : d === "grille4" ? 4 : Math.max(1, Math.min(4, visibles.length));
  const choix = [...visibles, ...ORDRE_DEFAUT.filter((t) => !visibles.includes(t))].slice(0, voulu);
  const rects: { x: number; y: number; w: number; h: number }[] = [];
  const m = 2;
  if (d === "plein") rects.push({ x: 0, y: 0, w: 100, h: 100 });
  else if (d === "bandeau") {
    const h = vertical ? 22 : 28, y = 100 - h - m, w = (100 - m * (voulu + 1)) / voulu;
    for (let i = 0; i < voulu; i++) rects.push({ x: m + i * (w + m), y, w, h });
  } else if (d === "deux") {
    if (vertical) { rects.push({ x: m, y: 22, w: 100 - 2 * m, h: 30 }); rects.push({ x: m, y: 55, w: 100 - 2 * m, h: 30 }); }
    else { rects.push({ x: m, y: 22, w: 48 - m, h: 56 }); rects.push({ x: 50 + m / 2, y: 22, w: 48 - m, h: 56 }); }
  } else {
    const haut = vertical ? 20 : 16, bas = vertical ? 12 : 12, w = (100 - 3 * m) / 2, h = (100 - haut - bas - m) / 2;
    for (let i = 0; i < 4; i++) rects.push({ x: m + (i % 2) * (w + m), y: haut + Math.floor(i / 2) * (h + m), w, h });
  }
  return { ...c, couches: c.couches.map((k) => { const i = choix.indexOf(k.type); return i < 0 ? { ...k, on: false } : { ...k, on: true, ...rects[i] }; }) };
}

// ---------------------------------------------------------------- Composant
export default function ModeVideo({ ancien, onSortir, r }: { ancien?: AncienVideo; onSortir: () => void; r: EtatEnregistreur }) {
  const [cfg, setCfg] = useState<ConfigVideo>(() => lireConfig(ancien));
  const maj = (f: (c: ConfigVideo) => ConfigVideo) => setCfg((o) => { const n = f(o); ecrireJson(CLE, n); return n; });
  const majCouche = (t: TypeVisu, x: Partial<Couche>) => maj((c) => ({ ...c, couches: c.couches.map((k) => (k.type === t ? { ...k, ...x } : k)) }));
  const majTexte = (t: CleTexte, x: Partial<TexteV>) => maj((c) => ({ ...c, textes: { ...c.textes, [t]: { ...c.textes[t], ...x } } }));
  const majFond = (x: Partial<FondV>) => maj((c) => ({ ...c, fond: { ...c.fond, ...x } }));

  const [reglage, setReglage] = useState(true);
  const [deplacer, setDeplacer] = useState(true);
  const [sel, setSel] = useState<TypeVisu | null>(null);
  const e = useEntree("visualiseur-video", true);
  const souci = problemeEntree(e);
  const [fenetre, setFenetre] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [souris, setSouris] = useState(true);
  const [policesPretes, setPolicesPretes] = useState(false);
  useEffect(() => { void chargerPolices().then(() => setPolicesPretes(true)); }, []);
  // Fond transparent (OBS, Source navigateur) : toute la page devient transparente derrière la scène.
  useEffect(() => {
    const t = cfg.fond.incrust === "transparent";
    document.documentElement.classList.toggle("fond-transparent", t);
    return () => document.documentElement.classList.remove("fond-transparent");
  }, [cfg.fond.incrust]);

  // ---- fond (image ou vidéo de la galerie)
  const [media, setMedia] = useState<{ url: string; infos: InfosFond } | null>(null);
  const [mediaAbsent, setMediaAbsent] = useState(false);
  const [saccade, setSaccade] = useState(false);
  useEffect(() => {
    let url = "", fini = false;
    setMediaAbsent(false); setSaccade(false);
    if (!cfg.fond.mediaId) { setMedia(null); return; }
    void lireFond(cfg.fond.mediaId).then((x) => {
      if (fini) return;
      if (!x) { setMedia(null); setMediaAbsent(true); return; }
      url = URL.createObjectURL(x.blob); setMedia({ url, infos: x.infos });
    });
    return () => { fini = true; if (url) URL.revokeObjectURL(url); };
  }, [cfg.fond.mediaId]);

  // ---- Échap, plein écran, R, taille de la fenêtre
  const recRef = useRef(() => {});
  const gardeAuto = useRef(false);
  recRef.current = () => {
    if (r.phase === "rec" || r.phase === "decompte") { gardeAuto.current = true; r.stop(); }
    else if (r.pret && r.prepa === null) r.rec(true);
  };
  useEffect(() => {
    if (r.phase === "fini" && gardeAuto.current) { gardeAuto.current = false; void r.garder(); }
  }, [r.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const sortir = () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); onSortir(); };
  const racine = useRef<HTMLDivElement>(null);
  const lancer = () => { setReglage(false); setSel(null); void racine.current?.requestFullscreen?.().catch(() => {}); };
  useEffect(() => {
    const k = (x: KeyboardEvent) => {
      const cible = x.target as HTMLElement | null;
      const saisie = cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName);
      if (x.key === "Escape") { if (saisie) { (cible as HTMLElement).blur(); return; } sortir(); }
      if ((x.key === "r" || x.key === "R") && !x.ctrlKey && !x.metaKey && !x.altKey && !saisie) { x.preventDefault(); recRef.current(); }
    };
    const fs = () => { if (!document.fullscreenElement && !reglage) sortir(); };
    const rz = () => setFenetre({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("keydown", k); document.addEventListener("fullscreenchange", fs); window.addEventListener("resize", rz);
    return () => { window.removeEventListener("keydown", k); document.removeEventListener("fullscreenchange", fs); window.removeEventListener("resize", rz); };
  }, [reglage]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (reglage) return;
    let t = window.setTimeout(() => setSouris(false), 2000);
    const m = () => { setSouris(true); window.clearTimeout(t); t = window.setTimeout(() => setSouris(false), 2000); };
    window.addEventListener("mousemove", m);
    return () => { window.clearTimeout(t); window.removeEventListener("mousemove", m); };
  }, [reglage]);

  // ---- taille de l'écran vidéo : la place qui reste à côté (ou au-dessus) des réglages
  const large = fenetre.w >= 900;
  const dispoW = reglage && large ? fenetre.w - 432 : fenetre.w;
  const dispoH = reglage && !large ? Math.round(fenetre.h * 0.42) : fenetre.h - (reglage ? 16 : 0);
  const ratio = cfg.format === "16:9" ? 16 / 9 : 9 / 16;
  const aw = Math.max(80, Math.floor(Math.min(dispoW - (reglage ? 16 : 0), dispoH * ratio))), ah = Math.floor(aw / ratio);

  // ---- boucle de dessin
  const canvases = useRef<Partial<Record<TypeVisu, HTMLCanvasElement | null>>>({});
  const couchesEl = useRef<Partial<Record<TypeVisu, HTMLDivElement | null>>>({});
  const fondEl = useRef<HTMLDivElement>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const bpmEl = useRef<HTMLSpanElement>(null);
  const cfgRef = useRef(cfg); cfgRef.current = cfg;
  const ahRef = useRef(ah); ahRef.current = ah;
  useEffect(() => {
    if (e.statut !== "ouvert") return;
    let raf = 0, tBpm = 0, tQualite = 0, qPrec = { total: 0, perdues: 0 };
    const kick = new DetecteurKick();
    const etats = { spectre: nouvelEtatSpectre(), spectrogramme: nouvelEtatSpectrogramme(), onde: new OndeDefilante(), vu: nouvelEtatVu() };
    const th = THEMES[0];
    const cadence = { t: 0 };
    const boucle = (t: number) => {
      raf = requestAnimationFrame(boucle);
      if (imageASauter(t, cadence)) return;   // 30 images/s sur téléphone (60 sur PC)
      const c = cfgRef.current;
      const img = lireImage(Math.min(0.8, prefsSpectre().lissage * 0.85)); if (!img) return;
      kick.suivre(img.basseEnergie, t);
      const p = kick.pulse, k = Math.max(0.6, ahRef.current / 720);
      if (c.couches.some((x) => x.on && x.type === "onde")) etats.onde.suivre(img);
      for (const x of c.couches) {
        const el = couchesEl.current[x.type];
        if (el) el.style.transform = x.pulse && x.on ? `scale(${(1 + p * 0.07).toFixed(4)})` : "";
        if (!x.on) continue;
        const cv = canvases.current[x.type]; if (!cv) continue;
        const thx: Theme = { ...th, texte: x.couleur, grille: x.reperes ? "#ffffff22" : "rgba(0,0,0,0)" };
        switch (x.type) {
          case "spectre": dessinerSpectre(cv, img, { gain: 6, theme: thx, couleur: x.couleur, epais: x.epais, fond: null, zones: x.reperes, etiquettes: x.reperes, echelleTexte: k }, etats.spectre); break;
          case "spectrogramme": dessinerSpectrogramme(cv, img, { gain: 6, etiquettes: x.reperes, echelleTexte: k, transparent: true, teinte: x.palette ? undefined : x.couleur }, etats.spectrogramme); break;
          case "oscillo": dessinerOscillo(cv, img, { theme: thx, gain: 6, couleur: x.couleur, epais: x.epais * k, fond: null, grille: x.reperes, fenetre: 1024 }); break;
          case "onde": etats.onde.dessiner(cv, { duree: c.ondeDuree, couleur: x.couleur, fond: null, grille: x.reperes ? "#ffffff22" : "rgba(0,0,0,0)", texte: x.reperes ? x.couleur : undefined, echelleTexte: k }); break;
          case "vu": dessinerVumetre(cv, img, { couleur: x.couleur, fond: null, epais: x.epais }, etats.vu); break;
          case "stereo": dessinerStereo(cv, img, { theme: thx, gain: 6, couleur: x.couleur, fond: null, barre: x.reperes, epais: x.epais * k, textes: x.reperes }); break;
        }
      }
      // fond qui pulse au kick (un peu agrandi s'il est flou, pour cacher les bords)
      if (fondEl.current) {
        const base = c.fond.flou > 0 ? 1.06 : 1;
        fondEl.current.style.transform = `scale(${(base + (c.fond.pulse ? p * 0.035 : 0)).toFixed(4)})`;
      }
      if (t - tBpm > 500) {
        tBpm = t;
        if (bpmEl.current && c.textes.bpm.auto) { const b = kick.bpm(); bpmEl.current.textContent = b ? `${b} BPM` : "… BPM"; }
      }
      // vidéo de fond : images perdues ? (toutes les 3 s)
      const v = videoEl.current;
      if (v && t - tQualite > 3000 && typeof v.getVideoPlaybackQuality === "function") {
        tQualite = t;
        const q = v.getVideoPlaybackQuality(), tot = q.totalVideoFrames - qPrec.total, perdu = q.droppedVideoFrames - qPrec.perdues;
        qPrec = { total: q.totalVideoFrames, perdues: q.droppedVideoFrames };
        if (tot > 30 && perdu / tot > 0.12) setSaccade(true);
      }
    };
    raf = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(raf);
  }, [e.statut]);

  // ---- déplacer / redimensionner une visualisation
  const prise = useRef<{ t: TypeVisu; mode: "deplacer" | "taille"; x0: number; y0: number; r0: { x: number; y: number; w: number; h: number } } | null>(null);
  const edition = reglage && deplacer;
  const surDown = (ev: PE, t: TypeVisu, mode: "deplacer" | "taille") => {
    if (!edition) return;
    ev.stopPropagation(); ev.preventDefault();
    const k = cfg.couches.find((x) => x.type === t)!;
    prise.current = { t, mode, x0: ev.clientX, y0: ev.clientY, r0: { x: k.x, y: k.y, w: k.w, h: k.h } };
    setSel(t);
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
  };
  const surMove = (ev: PE) => {
    const pz = prise.current; if (!pz) return;
    const dx = ((ev.clientX - pz.x0) / aw) * 100, dy = ((ev.clientY - pz.y0) / ah) * 100;
    const arr = (v: number) => Math.round(v * 2) / 2;
    if (pz.mode === "deplacer") majCouche(pz.t, { x: arr(Math.max(-pz.r0.w + 5, Math.min(95, pz.r0.x + dx))), y: arr(Math.max(-pz.r0.h + 5, Math.min(95, pz.r0.y + dy))) });
    else majCouche(pz.t, { w: arr(Math.max(4, Math.min(200, pz.r0.w + dx))), h: arr(Math.max(4, Math.min(200, pz.r0.h + dy))) });
  };
  const surUp = () => { prise.current = null; };

  // ---- textes
  const styleTexte = (t: TexteV): CSSProperties => {
    const px = (t.taille / 100) * ah;
    const s: CSSProperties = { fontFamily: famille(t.police), fontSize: `${px}px`, color: t.couleur };
    if (t.style === "contour") Object.assign(s, { WebkitTextStroke: `${Math.max(1, px * 0.06).toFixed(1)}px ${t.bord}`, paintOrder: "stroke fill" });
    if (t.style === "ombre") s.textShadow = `0 ${Math.max(1, px * 0.05).toFixed(1)}px ${Math.max(2, px * 0.12).toFixed(1)}px ${t.bord}, 0 0 ${Math.max(3, px * 0.3).toFixed(1)}px ${t.bord}aa`;
    return s;
  };
  const TEXTES: CleTexte[] = ["artiste", "morceau", "bpm"];
  const texteDe = (cle: CleTexte) => {
    const t = cfg.textes[cle];
    if (!t.on) return null;
    if (cle === "bpm") return <span key={cle} ref={bpmEl} className="vv-texte" style={styleTexte(t)}>{t.auto ? "… BPM" : `${t.valeur || "?"} BPM`}</span>;
    if (!t.valeur) return null;
    return <span key={cle} className="vv-texte" style={styleTexte(t)}>{t.valeur}</span>;
  };

  return (
    <div ref={racine} className={`visu-video vv2 ${reglage ? "avec-reglages" : ""} ${large ? "large" : "etroit"} ${souris || reglage ? "" : "sans-souris"}`}
      onPointerMove={surMove} onPointerUp={surUp} onPointerCancel={surUp}>
      <div className="vv-zone">
        <div className="vv-scene" style={{ width: aw, height: ah }} onPointerDown={() => edition && setSel(null)}>
          {/* fond */}
          {cfg.fond.incrust ? <div className={`vv-fond vv-incrust-${cfg.fond.incrust}`} style={{ background: cfg.fond.incrust === "vert" ? "#00ff00" : "transparent" }} /> : (
          <div className="vv-fond" style={{ background: cfg.fond.couleur }}>
            <div ref={fondEl} className="vv-fond-media">
              {!media && cfg.fond.grille && <div className="vv-grille" />}
              {media?.infos.type === "image" && <img src={media.url} alt="" style={{ objectFit: cfg.fond.ajuster === "remplir" ? "cover" : "contain", opacity: cfg.fond.opacite, filter: cfg.fond.flou ? `blur(${(cfg.fond.flou * ah) / 1080}px)` : undefined }} />}
              {media?.infos.type === "video" && <video ref={videoEl} src={media.url} autoPlay muted loop playsInline style={{ objectFit: cfg.fond.ajuster === "remplir" ? "cover" : "contain", opacity: cfg.fond.opacite, filter: cfg.fond.flou ? `blur(${(cfg.fond.flou * ah) / 1080}px)` : undefined }} />}
            </div>
            {cfg.fond.sombre > 0 && <div className="vv-sombre" style={{ background: `rgba(0,0,0,${cfg.fond.sombre})` }} />}
          </div>
          )}
          {/* visualisations */}
          {cfg.couches.map((k) => (
            <div key={k.type} ref={(el) => { couchesEl.current[k.type] = el; }}
              className={`vv-couche ${k.on ? "" : "cachee"} ${edition ? "edition" : ""} ${sel === k.type ? "choisie" : ""}`}
              style={{ left: `${k.x}%`, top: `${k.y}%`, width: `${k.w}%`, height: `${k.h}%`, opacity: k.opacite }}
              onPointerDown={(ev) => surDown(ev, k.type, "deplacer")}>
              {k.on && <canvas ref={(c) => { canvases.current[k.type] = c; }} className="vv-cv" />}
              {edition && k.on && <><span className="vv-etiq">{VISUS_VIDEO.find((v) => v.id === k.type)!.nom}</span><span className="vv-poignee" aria-label="Redimensionner" onPointerDown={(ev) => surDown(ev, k.type, "taille")} /></>}
            </div>
          ))}
          {/* textes */}
          <div className={`vv-textes ${policesPretes ? "" : "chargement"}`}>
            {POSITIONS.map((p) => {
              const ici = TEXTES.filter((t) => cfg.textes[t].on && cfg.textes[t].position === p.id);
              return ici.length ? <div key={p.id} className={`vv-pos pos-${p.id}`}>{ici.map(texteDe)}</div> : null;
            })}
          </div>
          {souci && <MessageVisu souci={souci} />}
          {!souci && e.statut !== "ouvert" && <p className="visu-video-msg">Ouverture de l'entrée audio… (clique sur « Autoriser » si le navigateur le demande)</p>}
        </div>
      </div>

      {r.phase === "rec" && (
        <p className={`visu-video-rec ${r.restant <= 60 ? "fin" : r.restant <= 300 ? "bientot" : ""}`} role="status">
          <i aria-hidden /> REC {mmss(r.t)}{r.restant <= 300 && <small> · reste {mmss(r.restant)}</small>}{r.sat > 0 && <small> · ⚠ sature</small>}
        </p>
      )}
      {r.phase !== "rec" && r.msg && !reglage && souris && <p className="visu-video-rec garde">✓ {r.msg}</p>}
      {!reglage && souris && <p className="visu-video-aide">Échap pour sortir · R : {r.phase === "rec" ? "arrêter" : "enregistrer"} · <button type="button" onClick={() => setReglage(true)}>⚙ Réglages</button></p>}

      {reglage && (
        <Reglages cfg={cfg} maj={maj} majCouche={majCouche} majTexte={majTexte} majFond={majFond} sel={sel} setSel={setSel}
          deplacer={deplacer} setDeplacer={setDeplacer} r={r} lancer={lancer} sortir={sortir}
          media={media?.infos ?? null} mediaAbsent={mediaAbsent} saccade={saccade} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Panneau des réglages
function Reglages(p: {
  cfg: ConfigVideo; maj: (f: (c: ConfigVideo) => ConfigVideo) => void;
  majCouche: (t: TypeVisu, x: Partial<Couche>) => void; majTexte: (t: CleTexte, x: Partial<TexteV>) => void; majFond: (x: Partial<FondV>) => void;
  sel: TypeVisu | null; setSel: (t: TypeVisu | null) => void; deplacer: boolean; setDeplacer: (b: boolean) => void;
  r: EtatEnregistreur; lancer: () => void; sortir: () => void; media: InfosFond | null; mediaAbsent: boolean; saccade: boolean;
}) {
  const { cfg, maj, majCouche, majTexte, majFond, sel, setSel } = p;
  return (
    <div className="vv-reglages" role="dialog" aria-label="Réglages du mode vidéo">
      <div className="vv-reglages-tete">
        <h3>🎬 Mode vidéo</h3>
        <div className="vv-btns">
          <button type="button" className="px-btn green" onClick={p.lancer}>▶ Plein écran</button>
          <button type="button" className="px-btn" onClick={p.sortir}>✕ Quitter</button>
        </div>
      </div>
      <p className="small muted">Plein écran sans menus, pour OBS (capture de fenêtre), TikTok ou YouTube. <b>Échap</b> pour sortir. <b>R</b> lance et arrête l'enregistrement (jusqu'à {DUREE_MAX_S / 60} min) : à l'arrêt, la prise entière va dans Mes enregistrements.</p>
      {p.r.phase === "rec" && <InfosRec r={p.r} />}

      <div className="vv-ligne"><span>Format</span>
        {(["16:9", "9:16"] as const).map((f) => <button key={f} type="button" className={`chipbtn ${cfg.format === f ? "on" : ""}`} onClick={() => maj((c) => ({ ...c, format: f }))}>{f} {f === "16:9" ? "YouTube" : "TikTok (vertical)"}</button>)}
      </div>

      <Deroulant compact id="video.visus" defaut couleur="#4fd18b" titre="Visualisations">
        <p className="small muted">Coche celles à afficher (une ou plusieurs). Clique sur une visualisation dans l'image pour la régler ; glisse-la pour la déplacer, tire le coin en bas à droite pour la redimensionner.</p>
        <label className="vv-ligne"><input type="checkbox" checked={p.deplacer} onChange={(e) => p.setDeplacer(e.target.checked)} /> Déplacer et redimensionner dans l'image</label>
        <ul className="vv-visus">
          {cfg.couches.map((k) => {
            const nom = VISUS_VIDEO.find((v) => v.id === k.type)!.nom;
            const ouvert = sel === k.type;
            return (
              <li key={k.type} className={ouvert ? "ouvert" : ""}>
                <div className="vv-visu-tete">
                  <label><input type="checkbox" checked={k.on} onChange={(e) => { majCouche(k.type, { on: e.target.checked }); if (e.target.checked) setSel(k.type); }} /> <i className="vv-pastille" style={{ background: k.type === "spectrogramme" && k.palette ? "linear-gradient(90deg,#1e3278,#e255c8,#ffd84d)" : k.couleur }} /> {nom}</label>
                  <button type="button" className="chipbtn" aria-expanded={ouvert} onClick={() => setSel(ouvert ? null : k.type)}>{ouvert ? "▲" : "Régler ▼"}</button>
                </div>
                {ouvert && (
                  <div className="vv-visu-corps">
                    {k.type === "spectrogramme" && <label className="vv-ligne"><input type="checkbox" checked={k.palette} onChange={(e) => majCouche(k.type, { palette: e.target.checked })} /> Dégradé de couleurs (sinon : la couleur choisie)</label>}
                    {!(k.type === "spectrogramme" && k.palette) && <label className="vv-ligne"><span>Couleur</span><input type="color" value={k.couleur} onChange={(e) => majCouche(k.type, { couleur: e.target.value })} /></label>}
                    {k.type !== "spectrogramme" && <Curseur nom="Épaisseur" min={1} max={10} pas={0.5} v={k.epais} f={(v) => majCouche(k.type, { epais: v })} txt={`${k.epais}`} />}
                    <Curseur nom="Opacité" min={0.1} max={1} pas={0.05} v={k.opacite} f={(v) => majCouche(k.type, { opacite: v })} txt={`${Math.round(k.opacite * 100)} %`} />
                    {k.type === "onde" && <Curseur nom="Durée affichée" min={2} max={30} pas={1} v={cfg.ondeDuree} f={(v) => maj((c) => ({ ...c, ondeDuree: v }))} txt={`${cfg.ondeDuree} s`} />}
                    <label className="vv-ligne"><input type="checkbox" checked={k.pulse} onChange={(e) => majCouche(k.type, { pulse: e.target.checked })} /> Pulsation au kick</label>
                    {k.type !== "vu" && <label className="vv-ligne"><input type="checkbox" checked={k.reperes} onChange={(e) => majCouche(k.type, { reperes: e.target.checked })} /> Repères ({k.type === "spectre" ? "Hz et zones sub / grave / médium / aigu" : k.type === "spectrogramme" ? "Hz et zones" : k.type === "stereo" ? "texte et barre de phase" : "graduations"})</label>}
                    <div className="vv-ligne vv-pos-num">
                      <span>Position</span>
                      {(["x", "y", "w", "h"] as const).map((c) => (
                        <label key={c}>{({ x: "X", y: "Y", w: "Largeur", h: "Hauteur" })[c]} <input type="number" min={-50} max={200} step={1} value={k[c]} onChange={(e) => majCouche(k.type, { [c]: Number(e.target.value) })} /> %</label>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="vv-ligne"><span>Couleurs rapides</span>
          {THEMES.map((t) => <button key={t.id} type="button" className="chipbtn vv-theme" style={{ "--t1": t.barres[0], "--t2": t.barres[2], "--t3": t.accent } as CSSProperties} onClick={() => maj((c) => appliquerTheme(c, t))}><i />{t.nom}</button>)}
        </div>
      </Deroulant>

      <Deroulant compact id="video.dispo" defaut couleur="#ffd84d" titre="Disposition toute prête">
        <div className="vv-dispos">
          {DISPOS.map((d) => (
            <button key={d.id} type="button" className={`vv-dispo d-${d.id}`} onClick={() => maj((c) => disposer(c, d.id))} title={d.texte}>
              <i aria-hidden><b /><b /><b /><b /></i>{d.nom}
            </button>
          ))}
        </div>
      </Deroulant>

      <Deroulant compact id="video.textes" couleur="#9b6bff" titre="Textes et polices">
        {(["artiste", "morceau", "bpm"] as CleTexte[]).map((cle) => <ReglageTexte key={cle} cle={cle} t={cfg.textes[cle]} maj={(x) => majTexte(cle, x)} />)}
      </Deroulant>

      <Deroulant compact id="video.fond" couleur="#4aa3ff" titre="Fond (image ou vidéo)">
        <ReglageFond fond={cfg.fond} majFond={majFond} media={p.media} absent={p.mediaAbsent} saccade={p.saccade} />
      </Deroulant>

      <Deroulant compact id="video.presets" couleur="#ff6a3d" titre="Presets du mode vidéo">
        <Presets cfg={cfg} appliquer={(c) => maj(() => completer(c))} />
      </Deroulant>
    </div>
  );
}

function Curseur({ nom, min, max, pas, v, f, txt }: { nom: string; min: number; max: number; pas: number; v: number; f: (v: number) => void; txt: string }) {
  return <label className="vv-ligne vv-curseur"><span>{nom}</span><input type="range" min={min} max={max} step={pas} value={v} onChange={(e) => f(Number(e.target.value))} /><b>{txt}</b></label>;
}

const NOMS_TEXTES: Record<CleTexte, string> = { artiste: "Nom d'artiste", morceau: "Nom du morceau", bpm: "BPM" };
function ReglageTexte({ cle, t, maj }: { cle: CleTexte; t: TexteV; maj: (x: Partial<TexteV>) => void }) {
  const [polices, setPolices] = useState(false);
  const exemple = cle === "bpm" ? `${t.valeur || "130"} BPM` : t.valeur || (cle === "artiste" ? "CrAoW" : "Mon morceau");
  return (
    <fieldset className="vv-texte-reg">
      <legend><label><input type="checkbox" checked={t.on} onChange={(e) => maj({ on: e.target.checked })} /> {NOMS_TEXTES[cle]}</label></legend>
      <div className="vv-ligne">
        {cle === "bpm" ? (
          <>
            <input type="number" min={40} max={300} value={t.valeur} disabled={t.auto} onChange={(e) => maj({ valeur: e.target.value })} aria-label="BPM" />
            <label className="small"><input type="checkbox" checked={Boolean(t.auto)} onChange={(e) => maj({ auto: e.target.checked })} /> estimer d'après le kick</label>
          </>
        ) : <input type="text" value={t.valeur} maxLength={cle === "artiste" ? 24 : 40} placeholder={cle === "morceau" ? "Ex. Tribe du jeudi" : ""} onChange={(e) => maj({ valeur: e.target.value })} aria-label={NOMS_TEXTES[cle]} />}
      </div>
      <div className="vv-ligne"><span>Police</span>
        <button type="button" className="chipbtn vv-police-btn" style={{ fontFamily: famille(t.police) }} aria-expanded={polices} onClick={() => setPolices((o) => !o)}>{POLICES.find((x) => x.id === t.police)?.nom ?? "Jersey 10"} ▾</button>
      </div>
      {polices && (
        <div className="vv-polices" role="listbox" aria-label="Choisir une police">
          {POLICES.map((x) => (
            <button key={x.id} type="button" role="option" aria-selected={t.police === x.id} className={t.police === x.id ? "on" : ""} onClick={() => { maj({ police: x.id }); setPolices(false); }}>
              <span style={{ fontFamily: famille(x.id) }}>{exemple}</span><small>{x.nom} · {x.genre}</small>
            </button>
          ))}
        </div>
      )}
      <Curseur nom="Taille" min={2} max={30} pas={0.5} v={t.taille} f={(v) => maj({ taille: v })} txt={`${t.taille} %`} />
      <div className="vv-ligne"><span>Couleur</span><input type="color" value={t.couleur} onChange={(e) => maj({ couleur: e.target.value })} />
        {(["aucun", "contour", "ombre"] as const).map((s) => <button key={s} type="button" className={`chipbtn ${t.style === s ? "on" : ""}`} onClick={() => maj({ style: s })}>{s === "aucun" ? "Sans effet" : s === "contour" ? "Contour" : "Ombre"}</button>)}
        {t.style !== "aucun" && <input type="color" value={t.bord} onChange={(e) => maj({ bord: e.target.value })} aria-label="Couleur du contour ou de l'ombre" />}
      </div>
      <div className="vv-ligne"><span>Position</span>
        <select value={t.position} onChange={(e) => maj({ position: e.target.value as Pos })}>
          {POSITIONS.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
        </select>
      </div>
    </fieldset>
  );
}

function ReglageFond({ fond, majFond, media, absent, saccade }: { fond: FondV; majFond: (x: Partial<FondV>) => void; media: InfosFond | null; absent: boolean; saccade: boolean }) {
  const [liste, setListe] = useState<InfosFond[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [ajout, setAjout] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { const f = () => void listerFonds().then(setListe); f(); return surChangementFonds(f); }, []);
  const importer = async (fichiers: FileList | null) => {
    if (!fichiers?.length) return;
    setAjout(true); setMsg(null);
    let dernier: InfosFond | null = null;
    for (const f of Array.from(fichiers)) {
      const r = await ajouterFond(f);
      if (typeof r === "string") setMsg(r); else { dernier = r; if (r.lourd) setMsg(`⚠ ${r.nom} : ${r.lourd}`); }
    }
    setAjout(false);
    if (dernier) majFond({ mediaId: dernier.id });
    if (input.current) input.current.value = "";
  };
  return (
    <div className="vv-fond-reg">
      <div className="vv-ligne vv-incrust" role="radiogroup" aria-label="Fond pour OBS">
        <span>Fond</span>
        <button type="button" role="radio" aria-checked={!fond.incrust} className={`chipbtn ${!fond.incrust ? "on" : ""}`} onClick={() => majFond({ incrust: undefined })}>Normal</button>
        <button type="button" role="radio" aria-checked={fond.incrust === "vert"} className={`chipbtn ${fond.incrust === "vert" ? "on" : ""}`} onClick={() => majFond({ incrust: "vert" })}>🟩 Fond vert</button>
        <button type="button" role="radio" aria-checked={fond.incrust === "transparent"} className={`chipbtn ${fond.incrust === "transparent" ? "on" : ""}`} onClick={() => majFond({ incrust: "transparent" })}>◻ Transparent</button>
      </div>
      {fond.incrust === "vert" && <p className="small">Fond vert pur (#00FF00) : dans OBS, ajoute le filtre <b>Incrustation chromatique</b> (« Chroma Key ») sur la capture de cette fenêtre, couleur verte. Évite le vert dans tes visualisations.</p>}
      {fond.incrust === "transparent" && <p className="small">Fond transparent : il marche dans OBS avec une <b>Source navigateur</b> qui ouvre l'app. Dans une fenêtre normale, tu vois du noir derrière : c'est normal. Sinon, prends le fond vert.</p>}
      {fond.incrust && <p className="small muted">L'image ou la vidéo de fond est mise de côté (pas effacée) tant que ce mode est choisi.</p>}
      <p className="small muted">🔒 Tes fonds restent sur cet appareil, dans le navigateur : rien n'est publié ni envoyé en ligne. Les vidéos tournent en boucle et sans son.</p>
      <div className="vv-ligne">
        <button type="button" className="px-btn" disabled={ajout} onClick={() => input.current?.click()}>{ajout ? "Import…" : "＋ Importer une image ou une vidéo"}</button>
        <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => void importer(e.target.files)} />
        <small className="muted">JPG, PNG, GIF, MP4, WEBM</small>
      </div>
      {msg && <p className="audio-alerte orange small" role="status">{msg}</p>}
      {absent && <p className="audio-alerte orange small">Le fond de ce réglage n'est plus sur cet appareil (supprimé, ou preset venu d'un autre appareil) : la couleur de fond le remplace.</p>}
      {media?.lourd && <p className="audio-alerte orange small">⚠ {media.lourd}</p>}
      {saccade && <p className="audio-alerte orange small">⚠ La vidéo de fond perd des images : elle est trop lourde pour rester fluide sur cet appareil. Essaie une version plus légère (1920 × 1080, 30 images/s), ou un fond image.</p>}
      <div className="vv-galerie">
        <button type="button" className={`vv-vignette couleur ${fond.mediaId ? "" : "on"}`} onClick={() => majFond({ mediaId: null })}>
          <span className="vv-vign-img" style={{ background: fond.couleur }} /><small>Couleur seule</small>
        </button>
        {liste.map((x) => (
          <div key={x.id} className={`vv-vignette ${fond.mediaId === x.id ? "on" : ""}`}>
            <button type="button" className="vv-vign-choix" onClick={() => majFond({ mediaId: x.id })} title={`${x.nom} · ${x.largeur} × ${x.hauteur} · ${fmtMo(x.taille)}`}>
              <span className="vv-vign-img" style={{ backgroundImage: x.miniature ? `url(${x.miniature})` : undefined }}>{x.type === "video" && <em>▶</em>}{x.lourd && <em className="lourd">⚠</em>}</span>
              <small>{x.nom}</small>
            </button>
            <BoutonSupprimer className="vv-vign-suppr" quoi={`le fond « ${x.nom} » de cet appareil`} onSupprimer={() => { void effacerFond(x.id); if (fond.mediaId === x.id) majFond({ mediaId: null }); }} />
          </div>
        ))}
      </div>
      <div className="vv-ligne"><span>Couleur</span><input type="color" value={fond.couleur} onChange={(e) => majFond({ couleur: e.target.value })} />
        {!fond.mediaId && <label><input type="checkbox" checked={fond.grille} onChange={(e) => majFond({ grille: e.target.checked })} /> Grille de séquenceur</label>}
      </div>
      {fond.mediaId && (
        <>
          <div className="vv-ligne"><span>Cadrage</span>
            <button type="button" className={`chipbtn ${fond.ajuster === "remplir" ? "on" : ""}`} onClick={() => majFond({ ajuster: "remplir" })}>Remplir l'écran</button>
            <button type="button" className={`chipbtn ${fond.ajuster === "ajuster" ? "on" : ""}`} onClick={() => majFond({ ajuster: "ajuster" })}>Ajuster (image entière)</button>
          </div>
          <Curseur nom="Opacité" min={0.05} max={1} pas={0.05} v={fond.opacite} f={(v) => majFond({ opacite: v })} txt={`${Math.round(fond.opacite * 100)} %`} />
          <Curseur nom="Flou" min={0} max={30} pas={1} v={fond.flou} f={(v) => majFond({ flou: v })} txt={`${fond.flou}`} />
        </>
      )}
      <Curseur nom="Assombrir" min={0} max={0.9} pas={0.05} v={fond.sombre} f={(v) => majFond({ sombre: v })} txt={`${Math.round(fond.sombre * 100)} %`} />
      <label className="vv-ligne"><input type="checkbox" checked={fond.pulse} onChange={(e) => majFond({ pulse: e.target.checked })} /> Le fond pulse légèrement au rythme du kick</label>
      <p className="small muted">Pour garder les visualisations et les textes lisibles sur un fond chargé : monte « Assombrir » (40 à 60 %), ajoute un peu de flou, ou donne aux textes un contour ou une ombre.</p>
    </div>
  );
}

function Presets({ cfg, appliquer }: { cfg: ConfigVideo; appliquer: (c: ConfigVideo) => void }) {
  const [liste, setListe] = useState<PresetVideo[]>(() => lireJson<PresetVideo[]>(CLE_PRESETS, []));
  const [nom, setNom] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const garder = (l: PresetVideo[]) => { setListe(l); ecrireJson(CLE_PRESETS, l); };
  const ajouter = async () => {
    const n = nom.trim() || `Preset ${liste.length + 1}`;
    const existe = liste.find((x) => x.nom.toLowerCase() === n.toLowerCase());
    if (existe && !(await confirmer(`Remplacer le preset « ${existe.nom} » ?`, { oui: "Remplacer" }))) return;
    const p: PresetVideo = { id: existe?.id ?? `pv-${Date.now().toString(36)}`, nom: n, config: cfg, creeLe: new Date().toISOString() };
    garder(existe ? liste.map((x) => (x.id === existe.id ? p : x)) : [p, ...liste]);
    setNom(""); setMsg(`✓ « ${n} » enregistré (visualisations, disposition, polices et fond).`);
  };
  const resume = useMemo(() => (c: ConfigVideo) => {
    const v = c.couches.filter((k) => k.on).map((k) => VISUS_VIDEO.find((x) => x.id === k.type)!.nom.split(" ")[0].toLowerCase());
    return `${c.format} · ${v.join(", ") || "aucune visualisation"} · ${c.fond.mediaId ? "fond image/vidéo" : "fond couleur"}`;
  }, []);
  return (
    <div className="vv-presets">
      <p className="small muted">Un preset garde tout ensemble : visualisations, positions, couleurs, polices, textes et fond. Le fond lui-même reste dans ta galerie, sur cet appareil.</p>
      <div className="vv-ligne">
        <input type="text" value={nom} maxLength={40} placeholder="Nom du preset (ex. Live Tribe)" onChange={(e) => setNom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ajouter(); }} aria-label="Nom du preset" />
        <button type="button" className="px-btn green" onClick={ajouter}>💾 Enregistrer</button>
      </div>
      {msg && <p className="small" role="status">{msg}</p>}
      {liste.length ? (
        <ul className="vv-presets-liste">
          {liste.map((x) => (
            <li key={x.id}>
              <div><b>{x.nom}</b><small className="muted">{resume(x.config)}</small></div>
              <button type="button" className="chipbtn" onClick={() => { appliquer(x.config); setMsg(`✓ « ${x.nom} » appliqué.`); }}>Appliquer</button>
              <BoutonSupprimer quoi={`le preset « ${x.nom} »`} onSupprimer={() => garder(liste.filter((y) => y.id !== x.id))} />
            </li>
          ))}
        </ul>
      ) : <p className="small muted">Aucun preset pour l'instant.</p>}
    </div>
  );
}

