// Module « Visualiseur en direct » (#visualiseur) : le son de l'E2 par la Scarlett, en direct.
// Spectre en barres, spectrogramme, oscilloscope, vumètre, stéréo ; plusieurs à la fois dans une grille.
// Réglages : vitesse, sensibilité, échelle, Figer, note dominante (estimation), comparaison avec une référence.
// Mode vidéo plein écran (OBS, TikTok, YouTube) : 16:9 ou 9:16, thèmes, CrAoW, BPM, morceau, pulsation au kick, Échap pour sortir.
// ● REC : l'enregistreur est dans la page (jusqu'à 40 min) ; en mode vidéo, la touche R lance et arrête, avec un petit voyant.
import { imageASauter } from "../lib/moteurAudio";
import { lireObjet, ecrireJson } from "../lib/stockage";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BarreEntree, InfosRec, VueEnregistreur, mmss, useEnregistreur, type EtatEnregistreur } from "../components/Enregistreur";
import { DUREE_MAX_S } from "../lib/enregistreur";
import { FiltreMenu, type FmGroupe, type FmValeur } from "../components/FiltreMenu";
import { PixelArt } from "../components/PixelArt";
import { Vumetre } from "../components/Vumetre";
import { dessinerOscillo, dessinerSpectre, dessinerSpectrogramme, dessinerStereo, THEMES, useNoteSuivie, type Echelle, type Theme } from "../components/Visus";
import { setReglages, useEntree } from "../lib/audioEntree";
import { DetecteurKick, lireImage, spectreRefCourant, type Image, type Note, type SpectreRef } from "../lib/visuAudio";
import { listeAnalyses, useStore } from "../lib/store";
import "../components/visus.css";

type Vue = "spectre" | "spectrogramme" | "oscillo" | "vu" | "stereo";
const VUES: { id: Vue; nom: string; texte: string }[] = [
  { id: "spectre", nom: "Spectre", texte: "Grave à gauche, aigu à droite, zones sub / grave / médium / aigu." },
  { id: "spectrogramme", nom: "Spectrogramme", texte: "Le spectre qui défile : grave en bas, aigu en haut, couleur = force." },
  { id: "oscillo", nom: "Oscilloscope", texte: "La forme d'onde en direct." },
  { id: "vu", nom: "Vumètre", texte: "Crête, maintien et saturation, en dBFS." },
  { id: "stereo", nom: "Stéréo", texte: "Largeur et phase ; alerte si le grave n'est pas centré." },
];

interface PrefsVisu {
  vues: Vue[]; vitesse: "rapide" | "lisse"; echelle: Echelle; gain: number; note: boolean; ref: string;
  video: { format: "16:9" | "9:16"; theme: string; nom: string; afficherNom: boolean; bpm: string; bpmAuto: boolean; afficherBpm: boolean; morceau: string; afficherMorceau: boolean; pulse: boolean; visuel: "spectre" | "oscillo" | "les-deux" };
}
const CLE = "e2academy.visu";
const P0: PrefsVisu = {
  vues: ["spectre", "oscillo", "vu", "stereo"], vitesse: "lisse", echelle: "log", gain: 6, note: true, ref: "",
  video: { format: "16:9", theme: "craow", nom: "CrAoW", afficherNom: true, bpm: "130", bpmAuto: false, afficherBpm: true, morceau: "", afficherMorceau: false, pulse: true, visuel: "les-deux" },
};
function lire(): PrefsVisu { const x = lireObjet<Partial<PrefsVisu>>(CLE, {}); return { ...P0, ...x, video: { ...P0.video, ...(x.video ?? {}) } }; }

const QUI = "visualiseur";
const fmt = (x: number, d = 2) => x.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d });

/** Les spectres de référence disponibles : le morceau chargé dans « Analyser une référence » et les analyses gardées. */
function useRefs(): SpectreRef[] {
  const st = useStore();
  const cour = spectreRefCourant();
  const gardees = listeAnalyses(st).filter((a) => a.spectre?.length).map((a) => ({ id: a.id, nom: a.nom, bandes: a.spectre! }));
  return cour ? [cour, ...gardees.filter((g) => g.id !== cour.id)] : gardees;
}

export default function Visualiseur({ focus }: { focus?: string }) {
  const [p, setP] = useState<PrefsVisu>(() => {
    const x = lire();
    // #visualiseur/ref=<id> : arrive depuis « Analyser une référence » avec cette référence choisie
    return focus?.startsWith("ref=") ? { ...x, ref: decodeURIComponent(focus.slice(4)) } : x;
  });
  const maj = (x: Partial<PrefsVisu>) => setP((o) => { const n = { ...o, ...x }; ecrireJson(CLE, n); return n; });
  const [on, setOn] = useState(getPermission);
  const [fige, setFige] = useState(false);
  const [video, setVideo] = useState(focus === "video");
  const e = useEntree(QUI, on || video);
  // l'enregistreur vit ici : il continue quand on passe en mode vidéo et qu'on en revient
  const r = useEnregistreur({ source: { module: "visualiseur", titre: "Visualiseur en direct", href: "#visualiseur" }, qui: "visualiseur-rec", actif: on || video });
  const refs = useRefs();
  const refChoisie = refs.find((r) => r.id === p.ref) ?? null;

  const canvases = useRef<Partial<Record<Vue, HTMLCanvasElement | null>>>({});
  const [note, setNote] = useState<Note | null>(null);
  const [stats, setStats] = useState<{ corr: number; largeur: number; graveOk: boolean | null } | null>(null);
  const suivre = useNoteSuivie();
  const figeRef = useRef(fige); figeRef.current = fige;
  const pRef = useRef(p); pRef.current = p;
  const refRef = useRef(refChoisie); refRef.current = refChoisie;

  useEffect(() => {
    if (!on || video || e.statut !== "ouvert") return;
    let raf = 0, t0 = 0, mauvais = 0;
    const cadence = { t: 0 };
    const pics: number[] = [];
    const boucle = (t: number) => {
      raf = requestAnimationFrame(boucle);
      if (imageASauter(t, cadence)) return;   // 30 images/s sur téléphone
      if (figeRef.current) return;
      const q = pRef.current, th = THEMES[0];
      const img = lireImage(q.vitesse === "rapide" ? 0.45 : 0.85);
      if (!img) return;
      const o = { echelle: q.echelle, plancher: -96, gain: q.gain, theme: th, zones: true, etiquettes: true, pics, ref: refRef.current?.bandes };
      const c = canvases.current;
      if (c.spectre) dessinerSpectre(c.spectre, img, o);
      if (c.spectrogramme) dessinerSpectrogramme(c.spectrogramme, img, { ...o, gain: q.gain });
      if (c.oscillo) dessinerOscillo(c.oscillo, img, { theme: th, gain: q.gain });
      if (c.stereo) dessinerStereo(c.stereo, img, { theme: th, gain: q.gain });
      if (t - t0 > 110) {
        t0 = t;
        if (q.note) setNote(suivre(img));
        // l'alerte « grave pas centré » ne s'allume qu'après ~1 s de suite, pour ne pas clignoter
        const gc = graveCentre(img);
        mauvais = gc === false ? mauvais + 1 : 0;
        setStats({ corr: img.correlation, largeur: img.largeur, graveOk: gc === null ? null : mauvais >= 9 ? false : true });
      }
    };
    raf = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(raf);
  }, [on, video, e.statut]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupes: FmGroupe[] = [
    { id: "vues", titre: "Affichages", options: VUES.map((v) => ({ id: v.id, nom: v.nom })) },
    { id: "vitesse", titre: "Vitesse de réaction", fixe: true, defaut: "lisse", options: [{ id: "rapide", nom: "Rapide" }, { id: "lisse", nom: "Lisse" }] },
    { id: "echelle", titre: "Échelle des fréquences", fixe: true, defaut: "log", options: [{ id: "log", nom: "Musicale (log)" }, { id: "lin", nom: "Linéaire (Hz)" }] },
  ];
  const valeur: FmValeur = { vues: p.vues, vitesse: [p.vitesse], echelle: [p.echelle] };
  const changerFiltres = (v: FmValeur) => maj({ vues: (v.vues?.length ? v.vues : ["spectre"]) as Vue[], vitesse: (v.vitesse?.[0] ?? "lisse") as PrefsVisu["vitesse"], echelle: (v.echelle?.[0] ?? "log") as Echelle });

  if (video) return <ModeVideo p={p} maj={maj} r={r} onSortir={() => { setVideo(false); setOn(true); if (focus === "video") history.replaceState(null, "", "#visualiseur"); }} />;

  return (
    <div className="visu-page">
      <h2 className="page-title"><PixelArt name="visualiseur" size={34} /> Visualiseur en direct</h2>
      <p className="audio-intro muted">Le son de ton E2 par la Scarlett, en direct. Tourne un potard et regarde ce qui change. <a href="#audio">Réglages audio</a></p>

      {!on ? (
        <div className="visu-demarrer">
          <p>Le navigateur va demander d'utiliser le « micro » : c'est ta Scarlett, clique sur <b>Autoriser</b>.</p>
          <button type="button" className="px-btn green" onClick={() => { setReglages({ permissionExpliquee: true }); setOn(true); }}>▶ Démarrer le visualiseur</button>
          <button type="button" className="px-btn" onClick={() => setVideo(true)}>🎬 Mode vidéo</button>
        </div>
      ) : (
        <>
          <BarreEntree qui={QUI} />
          <div className="visu-outils">
            <FiltreMenu groupes={groupes} valeur={valeur} onChange={changerFiltres} resultat={`${p.vues.length} affichage${p.vues.length > 1 ? "s" : ""}`} />
            <label className="visu-curseur">Sensibilité <input type="range" min={-12} max={30} step={1} value={p.gain} onChange={(x) => maj({ gain: Number(x.target.value) })} /> <b>{p.gain > 0 ? "+" : ""}{p.gain} dB</b></label>
            <button type="button" className={`px-btn ${fige ? "on-fige" : ""}`} onClick={() => setFige((f) => !f)} aria-pressed={fige}>{fige ? "▶ Reprendre" : "❄ Figer"}</button>
            <button type="button" className={`chipbtn ${p.note ? "on" : ""}`} onClick={() => maj({ note: !p.note })} aria-pressed={p.note}>♪ Note dominante</button>
            <label className="visu-ref">Comparer avec la référence
              <select value={p.ref} onChange={(x) => maj({ ref: x.target.value })}>
                <option value="">— aucune —</option>
                {refs.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </label>
            <button type="button" className="px-btn" onClick={() => setVideo(true)}>🎬 Mode vidéo</button>
          </div>
          {!refs.length && <p className="small muted visu-aide-ref">Pour comparer : charge un morceau dans <a href="#reference">Analyser une référence</a> (ou rouvre une analyse gardée), son spectre apparaîtra ici en pointillés.</p>}
          {fige && <p className="visu-fige" role="status">❄ Image figée : regarde cet instant, puis « Reprendre ».</p>}

          <section className={`visu-rec ${r.phase}`} aria-label="Enregistrer pendant le visualiseur">
            {r.phase === "rec" && <div className="visu-rec-voyant" role="status"><i aria-hidden /> REC <b>{mmss(r.t)}</b><small>reste {mmss(r.restant)}</small>{r.sat > 0 && <em>⚠ saturation</em>}</div>}
            <h3><span aria-hidden>●</span> Enregistrer <small className="muted">· le spectre continue pendant l'enregistrement, jusqu'à {DUREE_MAX_S / 60} min</small></h3>
            <VueEnregistreur r={r} sansBarre />
          </section>

          <div className={`visu-grille n${p.vues.length}`}>
            {VUES.filter((v) => p.vues.includes(v.id)).map((v) => (
              <section key={v.id} className={`visu-panneau v-${v.id}`}>
                <header>
                  <b>{v.nom}</b>
                  {v.id === "spectre" && p.note && <span className="visu-note">{note ? <>≈ <b>{note.nom}</b> <small>{note.fr} · {note.cents > 0 ? "+" : ""}{note.cents} cents · estimation</small></> : <small className="muted">pas de hauteur claire</small>}</span>}
                  {v.id === "spectre" && refChoisie && <span className="visu-legende"><i /> {refChoisie.nom} (volume aligné)</span>}
                  {v.id === "stereo" && stats && <span className="small">Phase <b>{stats.corr >= 0 ? "+" : ""}{fmt(stats.corr)}</b> · Largeur <b>{Math.round(stats.largeur * 100)} %</b></span>}
                </header>
                {v.id === "vu" ? (
                  <div className="visu-vu"><Vumetre actif={!fige && e.statut === "ouvert"} mono={e.reglages.mode === "mono"} /></div>
                ) : (
                  <canvas ref={(c) => { canvases.current[v.id] = c; }} width={v.id === "stereo" ? 480 : 960} height={v.id === "stereo" ? 480 : 360} className="visu-cv" role="img" aria-label={v.texte} />
                )}
                {v.id === "stereo" && stats?.graveOk === false && <p className="audio-alerte rouge small">⚠ Le grave n'est pas centré : sous 150 Hz, la gauche et la droite sont différentes. Sur l'E2, garde le kick et la basse au centre (Pan) et évite les effets stéréo sur eux.</p>}
                <p className="small muted visu-txt">{v.texte}</p>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function getPermission() { return Boolean(lireObjet<{ permissionExpliquee?: boolean }>("e2academy.audio", {}).permissionExpliquee); }

/** Grave centré : null s'il n'y a pas assez de grave pour juger. */
function graveCentre(img: Image): boolean | null {
  if (img.graveNiveauDb < -45) return null;
  return img.graveCorr > 0.7 && img.graveCote < 0.15;
}

// ============================================================ Mode vidéo
function ModeVideo({ p, maj, onSortir, r }: { p: PrefsVisu; maj: (x: Partial<PrefsVisu>) => void; onSortir: () => void; r: EtatEnregistreur }) {
  const v = p.video;
  const [reglage, setReglage] = useState(true);
  const e = useEntree("visualiseur-video", true);
  const setV = (x: Partial<PrefsVisu["video"]>) => maj({ video: { ...v, ...x } });
  const cadre = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [fenetre, setFenetre] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [souris, setSouris] = useState(true);
  const vRef = useRef(v); vRef.current = v;
  const theme: Theme = THEMES.find((t) => t.id === v.theme) ?? THEMES[0];
  const thRef = useRef(theme); thRef.current = theme;

  // Échap, ou sortie du plein écran du navigateur → on sort du mode vidéo
  useEffect(() => {
    const k = (x: KeyboardEvent) => {
      if (x.key === "Escape") sortir();
      // R : lancer / arrêter l'enregistrement (pas pendant la saisie d'un texte)
      const cible = x.target as HTMLElement | null;
      if ((x.key === "r" || x.key === "R") && !x.ctrlKey && !x.metaKey && !x.altKey && !(cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))) { x.preventDefault(); recRef.current(); }
    };
    const fs = () => { if (!document.fullscreenElement && !reglage) sortir(); };
    const r = () => setFenetre({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("keydown", k); document.addEventListener("fullscreenchange", fs); window.addEventListener("resize", r);
    return () => { window.removeEventListener("keydown", k); document.removeEventListener("fullscreenchange", fs); window.removeEventListener("resize", r); };
  }, [reglage]); // eslint-disable-line react-hooks/exhaustive-deps
  // en mode vidéo, l'arrêt range directement la prise entière dans Mes enregistrements (pas de menus à l'écran)
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
  const lancer = () => { setReglage(false); void cadre.current?.parentElement?.requestFullscreen?.().catch(() => {}); };

  // la souris disparaît après 2 s sans bouger
  useEffect(() => {
    if (reglage) return;
    let t = window.setTimeout(() => setSouris(false), 2000);
    const m = () => { setSouris(true); window.clearTimeout(t); t = window.setTimeout(() => setSouris(false), 2000); };
    window.addEventListener("mousemove", m);
    return () => { window.clearTimeout(t); window.removeEventListener("mousemove", m); };
  }, [reglage]);

  const [W, H] = v.format === "16:9" ? [480, 270] : [270, 480];
  useEffect(() => {
    if (e.statut !== "ouvert") return;
    let raf = 0;
    const kick = new DetecteurKick();
    const off = document.createElement("canvas"); off.width = 240; off.height = 100;
    const boucle = (t: number) => {
      raf = requestAnimationFrame(boucle);
      const c = cv.current; if (!c) return;
      const img = lireImage(0.7); if (!img) return;
      dessinerVideo(c, off, img, vRef.current, thRef.current, kick, t);
    };
    raf = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(raf);
  }, [e.statut, v.format]);

  const ratio = v.format === "16:9" ? 16 / 9 : 9 / 16;
  const aw = Math.min(fenetre.w, fenetre.h * ratio), ah = aw / ratio;
  return (
    <div className={`visu-video ${souris || reglage ? "" : "sans-souris"}`} style={{ background: "#000" }}>
      <div ref={cadre} className="visu-video-cadre" style={{ width: aw, height: ah }}>
        <canvas ref={cv} width={W} height={H} className="visu-video-cv" />
        {e.statut !== "ouvert" && <p className="visu-video-msg">{e.statut === "erreur" ? <>Entrée audio indisponible. <a href="#audio" onClick={sortir}>Réglages audio</a></> : "Ouverture de l'entrée audio… (clique sur « Autoriser » si le navigateur le demande)"}</p>}
      </div>
      {r.phase === "rec" && (
        <p className={`visu-video-rec ${r.restant <= 60 ? "fin" : r.restant <= 300 ? "bientot" : ""}`} role="status">
          <i aria-hidden /> REC {mmss(r.t)}{r.restant <= 300 && <small> · reste {mmss(r.restant)}</small>}{r.sat > 0 && <small> · ⚠ sature</small>}
        </p>
      )}
      {r.phase !== "rec" && r.msg && !reglage && souris && <p className="visu-video-rec garde">✓ {r.msg}</p>}
      {!reglage && souris && <p className="visu-video-aide">Échap pour sortir · R : {r.phase === "rec" ? "arrêter" : "enregistrer"} · <button type="button" onClick={() => setReglage(true)}>⚙ Réglages</button></p>}
      {reglage && (
        <div className="visu-video-reglages" role="dialog" aria-label="Réglages du mode vidéo">
          <h3>🎬 Mode vidéo</h3>
          <p className="small muted">Plein écran sans menus, pour OBS (capture de fenêtre), TikTok ou YouTube. <b>Échap</b> pour sortir. <b>R</b> lance et arrête l'enregistrement (jusqu'à {DUREE_MAX_S / 60} min) : à l'arrêt, la prise entière va dans Mes enregistrements.</p>
          {r.phase === "rec" && <InfosRec r={r} />}
          <div className="vv-ligne"><span>Format</span>
            {(["16:9", "9:16"] as const).map((f) => <button key={f} type="button" className={`chipbtn ${v.format === f ? "on" : ""}`} onClick={() => setV({ format: f })}>{f} {f === "16:9" ? "YouTube" : "TikTok (vertical)"}</button>)}
          </div>
          <div className="vv-ligne"><span>Thème</span>
            {THEMES.map((t) => <button key={t.id} type="button" className={`chipbtn vv-theme ${v.theme === t.id ? "on" : ""}`} style={{ "--t1": t.barres[0], "--t2": t.barres[2], "--t3": t.accent } as CSSProperties} onClick={() => setV({ theme: t.id })}><i />{t.nom}</button>)}
          </div>
          <div className="vv-ligne"><span>Visuel</span>
            {([["spectre", "Spectre"], ["oscillo", "Oscilloscope"], ["les-deux", "Les deux"]] as const).map(([id, n]) => <button key={id} type="button" className={`chipbtn ${v.visuel === id ? "on" : ""}`} onClick={() => setV({ visuel: id })}>{n}</button>)}
          </div>
          <label className="vv-ligne"><input type="checkbox" checked={v.afficherNom} onChange={(x) => setV({ afficherNom: x.target.checked })} /> Nom d'artiste <input type="text" value={v.nom} onChange={(x) => setV({ nom: x.target.value })} maxLength={24} /></label>
          <label className="vv-ligne"><input type="checkbox" checked={v.afficherBpm} onChange={(x) => setV({ afficherBpm: x.target.checked })} /> BPM <input type="number" min={40} max={300} value={v.bpm} disabled={v.bpmAuto} onChange={(x) => setV({ bpm: x.target.value })} />
            <label className="small"><input type="checkbox" checked={v.bpmAuto} onChange={(x) => setV({ bpmAuto: x.target.checked })} /> estimer d'après le kick</label></label>
          <label className="vv-ligne"><input type="checkbox" checked={v.afficherMorceau} onChange={(x) => setV({ afficherMorceau: x.target.checked })} /> Nom du morceau <input type="text" value={v.morceau} placeholder="Ex. Tribe du jeudi" onChange={(x) => setV({ morceau: x.target.value })} maxLength={40} /></label>
          <label className="vv-ligne"><input type="checkbox" checked={v.pulse} onChange={(x) => setV({ pulse: x.target.checked })} /> Pulsation au rythme du kick</label>
          <div className="vv-btns">
            <button type="button" className="px-btn green" onClick={lancer}>▶ Plein écran</button>
            <button type="button" className="px-btn" onClick={sortir}>✕ Quitter le mode vidéo</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Une image du mode vidéo, en basse résolution (480 × 270 ou 270 × 480), agrandie en gros pixels. */
function dessinerVideo(c: HTMLCanvasElement, off: HTMLCanvasElement, img: Image, v: PrefsVisu["video"], th: Theme, kick: DetecteurKick, t: number) {
  const g = c.getContext("2d"); if (!g) return;
  const W = c.width, H = c.height, vertical = H > W;
  kick.suivre(img.basseEnergie, t);
  const p = v.pulse ? kick.pulse : 0;
  // fond + grille de séquenceur qui pulse
  g.fillStyle = th.fond; g.fillRect(0, 0, W, H);
  g.fillStyle = th.grille;
  for (let x = 0; x < W; x += 16) g.fillRect(x, 0, 1, H);
  for (let y = 0; y < H; y += 16) g.fillRect(0, y, W, 1);
  if (p > 0.05) { g.globalAlpha = p * 0.18; g.fillStyle = th.accent; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  // cadre pixel
  const bord = 4 + Math.round(p * 4);
  g.fillStyle = th.accent; g.fillRect(0, 0, W, bord); g.fillRect(0, H - bord, W, bord); g.fillRect(0, 0, bord, H); g.fillRect(W - bord, 0, bord, H);

  const zoneH = vertical ? H * 0.42 : H * 0.5;
  const yZone = vertical ? H * 0.36 : H * 0.36;
  const s = 1 + p * 0.06;
  g.save();
  g.translate(W / 2, yZone + zoneH / 2); g.scale(s, s); g.translate(-W / 2, -(yZone + zoneH / 2));
  if (v.visuel !== "oscillo") {
    // spectre en miroir : le grave au centre, l'aigu vers les bords
    const demi = vertical ? 115 : 200;
    off.width = demi; off.height = Math.round(zoneH);
    dessinerSpectre(off, img, { echelle: "log", plancher: -84, gain: 6, theme: { ...th, fond: "rgba(0,0,0,0)", grille: "rgba(0,0,0,0)" }, pixel: 4 });
    g.drawImage(off, W / 2, yZone);
    g.save(); g.translate(W / 2, 0); g.scale(-1, 1); g.drawImage(off, 0, yZone); g.restore();
  }
  if (v.visuel !== "spectre") {
    off.width = vertical ? 230 : 420; off.height = Math.round(v.visuel === "oscillo" ? zoneH : zoneH * 0.5);
    dessinerOscillo(off, img, { theme: { ...th, fond: "rgba(0,0,0,0)", grille: "rgba(0,0,0,0)" }, gain: 6, fenetre: 1024, epais: 2 });
    g.drawImage(off, (W - off.width) / 2, v.visuel === "oscillo" ? yZone : yZone + zoneH * 0.25);
  }
  g.restore();

  // textes (police pixel)
  g.textAlign = "center"; g.textBaseline = "middle";
  if (v.afficherNom && v.nom) {
    const taille = Math.round((vertical ? 44 : 40) * (1 + p * 0.12));
    g.font = `${taille}px "Jersey 10", monospace`;
    const y = vertical ? H * 0.18 : H * 0.17;
    g.fillStyle = "#000"; g.fillText(v.nom, W / 2 + 3, y + 3);
    g.fillStyle = th.accent; g.fillText(v.nom, W / 2, y);
  }
  const lignes: string[] = [];
  if (v.afficherMorceau && v.morceau) lignes.push(v.morceau);
  if (v.afficherBpm) { const b = v.bpmAuto ? kick.bpm() : Number(v.bpm); lignes.push(b ? `${b} BPM` : "… BPM"); }
  g.font = `${vertical ? 22 : 18}px "Jersey 10", monospace`;
  lignes.forEach((l, i) => {
    const y = (vertical ? H * 0.86 : H * 0.92) - (lignes.length - 1 - i) * (vertical ? 26 : 20);
    g.fillStyle = "#000"; g.fillText(l, W / 2 + 2, y + 2);
    g.fillStyle = th.texte; g.fillText(l, W / 2, y);
  });
}
