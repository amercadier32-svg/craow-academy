// Onglet « Visualiser » du Studio (#studio/visualiser) : le son de l'E2 par la Scarlett, en direct.
// Spectre en courbe, spectrogramme, oscilloscope, forme d'onde défilante, vumètre, stéréo ; plusieurs à la fois.
// Réglages : sensibilité, lissage, maintien des crêtes, échelle, Figer, note dominante (estimation), comparaison avec une référence.
// Mode vidéo plein écran (OBS, TikTok, YouTube) : voir ModeVideo.tsx.
// ● REC : l'enregistreur est celui du Studio (le même que l'onglet Enregistrer) ; en mode vidéo, la touche R lance et arrête, avec un petit voyant.
import { imageASauter } from "../lib/moteurAudio";
import { lireObjet, ecrireJson } from "../lib/stockage";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { BarreEntree, mmss, type EtatEnregistreur } from "../components/Enregistreur";
import { DUREE_MAX_S } from "../lib/enregistreur";
import { FiltreMenu, type FmGroupe, type FmValeur } from "../components/FiltreMenu";
import { Vumetre } from "../components/Vumetre";
import { MessageVisu, OndeDefilante, THEMES, dessinerOscillo, dessinerSpectre, dessinerSpectrogramme, dessinerStereo, nouvelEtatSpectre, nouvelEtatSpectrogramme, useNoteSuivie } from "../components/Visus";
import { ReglagesSpectre } from "../components/SpectreCourbe";
import { prefsSpectre } from "../lib/spectreCourbe";
import { problemeEntree, setReglages, useEntree } from "../lib/audioEntree";
import { lireImage, spectreRefCourant, type Image, type Note, type SpectreRef } from "../lib/visuAudio";
import { listeAnalyses, useStore } from "../lib/store";
import type { AncienVideo } from "./ModeVideo";
import "../components/visus.css";

// Le mode vidéo (polices, fonds) ne se charge qu'à son ouverture.
const ModeVideo = lazy(() => import("./ModeVideo"));

type Vue = "spectre" | "spectrogramme" | "oscillo" | "onde" | "vu" | "stereo";
const VUES: { id: Vue; nom: string; texte: string }[] = [
  { id: "spectre", nom: "Spectre en courbe", texte: "Grave à gauche, aigu à droite (chaque octave a la même largeur), zones sub / grave / médium / aigu." },
  { id: "spectrogramme", nom: "Spectrogramme", texte: "Le spectre qui défile : grave en bas, aigu en haut, couleur = force. Même échelle que le spectre." },
  { id: "onde", nom: "Forme d'onde défilante", texte: "Le son défile de droite à gauche, comme dans FL Studio. En rouge : les passages qui saturent (0 dBFS)." },
  { id: "oscillo", nom: "Oscilloscope", texte: "La forme d'onde en direct." },
  { id: "vu", nom: "Vumètre", texte: "Crête, maintien et saturation, en dBFS." },
  { id: "stereo", nom: "Stéréo (goniomètre)", texte: "Largeur et phase ; alerte si le grave n'est pas centré." },
];

interface PrefsVisu {
  vues: Vue[]; gain: number; note: boolean; ref: string; ondeDuree: number; ondeHauteur: number; ondeVue?: boolean;
  video: AncienVideo;
}
const CLE = "e2academy.visu";
const P0: PrefsVisu = {
  vues: ["spectre", "onde", "oscillo", "vu", "stereo"], gain: 6, note: true, ref: "", ondeDuree: 8, ondeHauteur: 160, ondeVue: true,
  video: { format: "16:9", theme: "craow", nom: "CrAoW", afficherNom: true, bpm: "130", bpmAuto: false, afficherBpm: true, morceau: "", afficherMorceau: false, pulse: true },
};
function lire(): PrefsVisu {
  const x = lireObjet<Partial<PrefsVisu>>(CLE, {});
  const p = { ...P0, ...x, video: { ...P0.video, ...(x.video ?? {}) } };
  // nouvel affichage (octobre 2026) : la forme d'onde défilante s'ajoute une fois aux affichages déjà choisis
  if (!p.ondeVue) { p.ondeVue = true; if (!p.vues.includes("onde")) p.vues = [...p.vues.filter((v) => v === "spectre"), "onde", ...p.vues.filter((v) => v !== "spectre")]; }
  p.vues = p.vues.filter((v) => VUES.some((x) => x.id === v));
  return p;
}

const QUI = "visualiseur";
const fmt = (x: number, d = 2) => x.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d });

/** Les spectres de référence disponibles : le morceau analysé dans l'onglet Analyser et les analyses gardées. */
function useRefs(): SpectreRef[] {
  const st = useStore();
  const cour = spectreRefCourant();
  const gardees = listeAnalyses(st).filter((a) => a.spectre?.length).map((a) => ({ id: a.id, nom: a.nom, bandes: a.spectre! }));
  return cour ? [cour, ...gardees.filter((g) => g.id !== cour.id)] : gardees;
}

export default function Visualiseur({ focus, r }: { focus?: string; r: EtatEnregistreur }) {
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
  const souci = problemeEntree(e);
  // l'enregistreur est celui du Studio : il continue quand on passe en mode vidéo, ou dans un autre onglet
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
    const etatS = nouvelEtatSpectre(), etatG = nouvelEtatSpectrogramme(), onde = new OndeDefilante();
    const boucle = (t: number) => {
      raf = requestAnimationFrame(boucle);
      if (imageASauter(t, cadence)) return;   // 30 images/s sur téléphone
      const q = pRef.current, th = THEMES[0];
      const img = lireImage(Math.min(0.8, prefsSpectre().lissage * 0.85));
      if (!img) return;
      // la forme d'onde continue d'avancer pendant « Figer » (l'image, elle, reste figée)
      if (q.vues.includes("onde")) onde.suivre(img);
      if (figeRef.current) return;
      const c = canvases.current;
      if (c.spectre) dessinerSpectre(c.spectre, img, { gain: q.gain, theme: th, zones: true, etiquettes: true, ref: refRef.current?.bandes }, etatS);
      if (c.spectrogramme) dessinerSpectrogramme(c.spectrogramme, img, { gain: q.gain }, etatG);
      if (c.oscillo) dessinerOscillo(c.oscillo, img, { theme: th, gain: q.gain });
      if (c.onde) onde.dessiner(c.onde, { duree: q.ondeDuree, couleur: "#4fd18b", fond: th.fond, grille: th.grille, texte: th.texte });
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
  ];
  const valeur: FmValeur = { vues: p.vues };
  const changerFiltres = (v: FmValeur) => maj({ vues: (v.vues?.length ? v.vues : ["spectre"]) as Vue[] });

  if (video) return (
    <Suspense fallback={<div className="visu-video"><p className="visu-video-msg">Chargement du mode vidéo…</p></div>}>
      <ModeVideo ancien={p.video} r={r} onSortir={() => { setVideo(false); setOn(true); if (focus === "video") history.replaceState(history.state, "", "#studio/visualiser"); }} />
    </Suspense>
  );

  return (
    <div className="visu-page">
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
          <div className="visu-outils visu-outils-spectre"><b>Spectre</b><ReglagesSpectre /></div>
          {!refs.length && <p className="small muted visu-aide-ref">Pour comparer : analyse un morceau dans l'onglet <a href="#studio/analyser">Analyser</a> (ou rouvre une analyse gardée), sa courbe apparaîtra ici en pointillés roses.</p>}
          {fige && <p className="visu-fige" role="status">❄ Image figée : regarde cet instant, puis « Reprendre ».</p>}

          <section className={`visu-rec visu-rec-mini ${r.phase}`} aria-label="Enregistrer pendant le visualiseur">
            {r.phase === "rec" || r.phase === "decompte"
              ? <button type="button" className="rec-stop" onClick={r.stop}>■ Stop</button>
              : <button type="button" className="rec-rec" disabled={!r.pret} onClick={() => r.rec()}>● REC</button>}
            {r.phase === "rec" ? <span className="visu-rec-voyant" role="status"><i aria-hidden /> REC <b>{mmss(r.t)}</b><small>reste {mmss(r.restant)}</small>{r.sat > 0 && <em>⚠ saturation</em>}</span>
              : r.phase === "fini" || r.phase === "garde" ? <span className="small">Prise terminée : <a href="#studio/enregistrer">garde-la ou coupe-la dans l'onglet Enregistrer</a>.</span>
              : <span className="small muted">Le spectre continue pendant l'enregistrement (jusqu'à {DUREE_MAX_S / 60} min). C'est le même enregistreur que l'onglet Enregistrer.</span>}
          </section>

          <div className={`visu-grille n${p.vues.length}`}>
            {VUES.filter((v) => p.vues.includes(v.id)).map((v) => (
              <section key={v.id} className={`visu-panneau v-${v.id}`}>
                <header>
                  <b>{v.nom}</b>
                  {v.id === "spectre" && p.note && <span className="visu-note">{note ? <>≈ <b>{note.nom}</b> <small>{note.fr} · {note.cents > 0 ? "+" : ""}{note.cents} cents · estimation</small></> : <small className="muted">pas de hauteur claire</small>}</span>}
                  {v.id === "spectre" && refChoisie && <span className="visu-legende"><i /> {refChoisie.nom} (volume aligné)</span>}
                  {v.id === "stereo" && stats && <span className="small">Phase <b>{stats.corr >= 0 ? "+" : ""}{fmt(stats.corr)}</b> · Largeur <b>{Math.round(stats.largeur * 100)} %</b></span>}
                  {v.id === "onde" && (
                    <span className="visu-onde-reg">
                      <label className="visu-curseur">Durée <input type="range" min={2} max={30} step={1} value={p.ondeDuree} onChange={(x) => maj({ ondeDuree: Number(x.target.value) })} /> <b>{p.ondeDuree} s</b></label>
                      <label className="visu-curseur">Hauteur <input type="range" min={80} max={480} step={10} value={p.ondeHauteur} onChange={(x) => maj({ ondeHauteur: Number(x.target.value) })} /> <b>{p.ondeHauteur} px</b></label>
                    </span>
                  )}
                </header>
                <div className="visu-boite">
                  {v.id === "vu" ? (
                    <div className="visu-vu"><Vumetre actif={!fige && e.statut === "ouvert"} mono={e.reglages.mode === "mono"} /></div>
                  ) : (
                    <canvas ref={(c) => { canvases.current[v.id] = c; }} className={`visu-cv cv-${v.id}`} style={v.id === "onde" ? { height: p.ondeHauteur } : undefined} role="img" aria-label={v.texte} />
                  )}
                  {souci && v.id !== "vu" && <MessageVisu souci={souci} petit={v.id === "stereo" || v.id === "oscillo"} />}
                </div>
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
