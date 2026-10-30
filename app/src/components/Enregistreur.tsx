// L'enregistreur : ● REC, Stop, décompte d'une mesure, vumètre et alerte de saturation,
// puis forme d'onde avec réécoute, découpe du début et de la fin, normalisation, export WAV et « Garder ».
// Il s'ouvre partout (recettes, exercices, relevés, Session, Référence, Mastering, Mes enregistrements).
import { sortie } from "../lib/moteurAudio";
import { usePrefs } from "../lib/stockage";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent as PE } from "react";
import { fmtDb, fmtHz, paireEffective, reessayer, useEntree, useEntreeEtat, versDb } from "../lib/audioEntree";
import {
  arreterLecture, bornesUtiles, crete, cretes, decoderBlob, demarrerCapture, DUREE_MAX_S, etatLecture, gainNormalise, jouerFichier, jouerPrise, jouerTampon,
  lacherPrise, lecteur, libererPrise, nomAuto, priseIci, recupererPrise, surLecture, tailleWav, wavDe, type Capture, type Prise,
} from "../lib/enregistreur";
import { ajouterEnregistrement, fmtTaille, listerEnregistrements, etatPrise, listerPrises, lireEnregistrement, surChangement, type Ligne, type MetaPrise, type ModuleRec } from "../lib/recordings";
import { telecharger } from "../lib/telecharger";
import { Etoile } from "./Etoile";
import { Vumetre } from "./Vumetre";
import "./enregistreur.css";

export interface SourceRec { module: ModuleRec; ref?: string; titre: string; href?: string }
export const NOM_MODULE: Record<ModuleRec, string> = {
  recette: "Recette", exercice: "Exercice d'écoute", releve: "Relevé de potard", session: "Session", reference: "Analyser une référence",
  mastering: "Mastering", visualiseur: "Visualiseur en direct", libre: "Enregistrement libre", fichier: "Fichier ajouté",
};

// ---------------------------------------------------------------- Préférences (gardées sur l'appareil)
interface Prefs { decompte: boolean; bip: boolean; bpm: number; bits: 16 | 24; normaliser: boolean }
const CLE_PREFS = "e2academy.rec.prefs";
const PREFS0: Prefs = { decompte: true, bip: true, bpm: 130, bits: 24, normaliser: false };
const usePrefsRec = () => usePrefs(CLE_PREFS, PREFS0);

export const fmtDuree = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0").replace(".", ",")}`;

/** Bip du décompte (sortie audio du PC). */
function bip(fort: boolean) {
  const c = lecteur(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
  o.type = "square"; o.frequency.value = fort ? 1760 : 880;
  g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  o.connect(g).connect(sortie()); o.start(t); o.stop(t + 0.09);
}

// ---------------------------------------------------------------- Barre « entrée audio »
export function BarreEntree({ qui }: { qui: string }) {
  const e = useEntreeEtat();
  const r = e.reglages;
  if (e.statut === "erreur" && e.erreur) {
    return (
      <div className="audio-alerte rouge rec-erreur" role="alert">
        <b>{e.erreur.titre}</b>
        <ul>{e.erreur.aides.map((a) => <li key={a}>{a}</li>)}</ul>
        <div className="rec-btns"><button type="button" className="e2-ui-btn" onClick={() => void reessayer(qui)}>↻ Réessayer</button><a className="e2-ui-btn" href="#audio">⚙ Réglages audio</a></div>
      </div>
    );
  }
  if (e.statut === "ouvert" && e.bloque) {
    return (
      <div className="audio-alerte orange rec-erreur" role="alert">
        <b>Le moteur audio du navigateur est à l'arrêt : les affichages et l'enregistrement sont figés.</b>
        <ul>
          <li>Vérifie que la sortie son de Windows (Paramètres → Son → Sortie) n'est pas prise en mode exclusif par un autre logiciel.</li>
          <li>Clique sur « Réessayer » : l'entrée se rouvre et l'enregistrement en cours continue.</li>
        </ul>
        <div className="rec-btns"><button type="button" className="e2-ui-btn" onClick={() => void reessayer(qui)}>↻ Réessayer</button><a className="e2-ui-btn" href="#audio">⚙ Réglages audio</a></div>
      </div>
    );
  }
  return (
    <p className="audio-mini">
      {e.statut === "ouvert" ? <span className="rec-led on" aria-hidden /> : <span className="rec-led" aria-hidden />}
      <span>{e.statut === "ouvert" ? <b>{e.nomAppareil}</b> : e.statut === "demande" ? "Autorisation demandée : clique sur « Autoriser » en haut de la fenêtre" : "Entrée fermée"}</span>
      {e.statut === "ouvert" && <span>{fmtHz(e.srApp)} · {r.mode === "mono" ? "mono" : "stéréo"} · entrées {paireEffective(e) === 0 ? "1-2" : "3-4"}</span>}
      <a href="#audio">⚙ Réglages audio</a>
    </p>
  );
}

// ---------------------------------------------------------------- Forme d'onde (dessin + découpe)
function Onde({ pics, debut, fin, pos, onBornes, hauteur = 110, couleur = "#4fd18b" }: {
  pics: number[]; debut?: number; fin?: number; pos?: number | null; onBornes?: (a: number, b: number) => void; hauteur?: number; couleur?: string;
}) {
  const cv = useRef<HTMLCanvasElement>(null);
  const prise = useRef<"a" | "b" | null>(null);
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const g = c.getContext("2d"); if (!g) return;
    const W = c.width, H = c.height, n = pics.length;
    g.fillStyle = "#0c0d11"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#ffffff10"; g.fillRect(0, H / 2, W, 1);
    const bw = W / Math.max(1, n);
    for (let i = 0; i < n; i++) {
      const f = i / n;
      const dans = debut === undefined || (f >= debut && f <= (fin ?? 1));
      const v = Math.min(1, pics[i]);
      g.fillStyle = v >= 0.999 ? "#ff3b3b" : dans ? couleur : "#3a3e4a";
      const h = Math.max(1, v * (H - 6));
      g.fillRect(Math.floor(i * bw), (H - h) / 2, Math.max(1, Math.ceil(bw) - (bw > 3 ? 1 : 0)), h);
    }
    if (debut !== undefined && fin !== undefined) {
      g.fillStyle = "#00000088"; g.fillRect(0, 0, debut * W, H); g.fillRect(fin * W, 0, W - fin * W, H);
      g.fillStyle = "#ffd84d"; g.fillRect(debut * W - 1, 0, 3, H); g.fillRect(fin * W - 2, 0, 3, H);
      g.fillRect(debut * W - 1, 0, 8, 8); g.fillRect(fin * W - 7, H - 8, 8, 8);
    }
    if (pos !== null && pos !== undefined) { g.fillStyle = "#ffffff"; g.fillRect(pos * W, 0, 2, H); }
  }, [pics, debut, fin, pos, couleur]);
  const x = (e: PE<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
  const bas = (e: PE<HTMLCanvasElement>) => {
    if (!onBornes || debut === undefined || fin === undefined) return;
    const f = x(e);
    prise.current = Math.abs(f - debut) < Math.abs(f - fin) ? "a" : "b";
    e.currentTarget.setPointerCapture(e.pointerId);
    bouge(e);
  };
  const bouge = (e: PE<HTMLCanvasElement>) => {
    if (!prise.current || !onBornes || debut === undefined || fin === undefined) return;
    const f = x(e);
    if (prise.current === "a") onBornes(Math.min(f, fin - 0.002), fin); else onBornes(debut, Math.max(f, debut + 0.002));
  };
  return <canvas ref={cv} className={`rec-onde ${onBornes ? "editable" : ""}`} width={900} height={hauteur} onPointerDown={bas} onPointerMove={bouge} onPointerUp={() => { prise.current = null; }}
    role="img" aria-label="Forme d'onde de l'enregistrement" />;
}

function usePositionLecture(owner: string, duree: number) {
  const [pos, setPos] = useState<number | null>(null);
  const actif = useSyncExternalStore(surLecture, () => etatLecture()?.owner === owner, () => false);
  useEffect(() => {
    if (!actif) { setPos(null); return; }
    let raf = 0;
    const f = () => { const e = etatLecture(); setPos(e && e.owner === owner ? e.pos / duree : null); raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [actif, owner, duree]);
  return { pos, actif };
}

// ---------------------------------------------------------------- L'enregistreur
export interface EnregistreurProps {
  source: SourceRec;
  bpm?: number;
  /** Bouton en plus après la prise (ex. « Utiliser pour cette session », « Masteriser ce son »). */
  utiliser?: { libelle: string; action: (f: File) => void | Promise<void> };
  /** false : la prise n'est pas gardée dans « Mes enregistrements » (le module la garde lui-même). */
  garderDansListe?: boolean;
  onFermer?: () => void;
}

type Phase = "pret" | "decompte" | "rec" | "fini" | "garde";
let compteur = 0;

/** « 40:00 » */
export const mmss = (s: number) => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

/** L'état de l'enregistreur, séparé de son affichage : le Visualiseur le garde pendant qu'il passe en mode vidéo. */
export function useEnregistreur({ source, bpm, qui: quiDonne, actif = true }: { source: SourceRec; bpm?: number; qui?: string; actif?: boolean }) {
  const qui = useMemo(() => quiDonne ?? `rec-${++compteur}`, [quiDonne]);
  const e = useEntree(qui, actif);
  const [prefs, setPrefs] = usePrefsRec();
  const [phase, setPhase] = useState<Phase>("pret");
  const [compte, setCompte] = useState(0);
  const [t, setT] = useState(0);
  const [taille, setTaille] = useState(0);
  const [sat, setSat] = useState(0);
  const [alerte, setAlerte] = useState<number | null>(null);
  const [disque, setDisque] = useState(true);
  const [prise, setPrise] = useState<Prise | null>(null);
  const [bornes, setBornes] = useState<[number, number]>([0, 1]);
  const [nom, setNom] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [prepa, setPrepa] = useState<number | null>(null);
  const [live, setLive] = useState<number[]>([]);
  const capture = useRef<Capture | null>(null);
  const minuteries = useRef<number[]>([]);
  const priseRef = useRef<Prise | null>(null); priseRef.current = prise;
  const utilisee = useRef(false);
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const bpmUtilise = bpm ?? prefs.bpm;

  // en quittant : une prise gardée ou utilisée est effacée du disque ; une prise de plus de 30 s pas encore gardée
  // reste sur le disque, et l'app propose de la récupérer au prochain lancement.
  useEffect(() => () => {
    minuteries.current.forEach((x) => { window.clearTimeout(x); window.clearInterval(x); });
    const c = capture.current; capture.current = null;
    if (c) void c.arreter().then((p) => lacherPrise(p));
    const p = priseRef.current;
    if (p) { if (phaseRef.current === "garde" || utilisee.current || p.frames / p.sr < 30) void libererPrise(p); else lacherPrise(p); }
    arreterLecture();
  }, []);

  // pendant l'enregistrement : prévenir avant de fermer l'onglet
  useEffect(() => {
    if (phase !== "rec") return;
    const f = (x: BeforeUnloadEvent) => { x.preventDefault(); x.returnValue = ""; };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [phase]);

  const lancerCapture = async () => {
    setErr(""); setAlerte(null); setDisque(true);
    try {
      capture.current = await demarrerCapture({
        source: { module: source.module, ref: source.ref, titre: source.titre, href: source.href }, bpm: bpmUtilise,
        quandPlein: () => void stop(true),
        quandAlerte: (s) => setAlerte(s),
      });
      setPhase("rec"); setT(0); setSat(0); setTaille(0);
      const iv = window.setInterval(() => {
        const c = capture.current; if (!c) { window.clearInterval(iv); return; }
        setT(c.duree()); setSat(c.saturations()); setTaille(c.taille()); setDisque(!c.erreurDisque()); setLive(c.apercu.slice(-300));
      }, 100);
      minuteries.current.push(iv);
    } catch (x) { setErr(x instanceof Error ? x.message : String(x)); setPhase("pret"); }
  };

  const rec = (sansDecompte = false) => {
    if (e.statut !== "ouvert" || phase === "rec" || phase === "decompte") return;
    arreterLecture(); setMsg("");
    const ancienne = priseRef.current;
    if (ancienne) { void libererPrise(ancienne); setPrise(null); }
    utilisee.current = false;
    if (!prefs.decompte || sansDecompte) { void lancerCapture(); return; }
    const temps = 60 / Math.max(40, Math.min(300, bpmUtilise));
    setPhase("decompte"); setCompte(4);
    for (let i = 0; i < 4; i++) {
      minuteries.current.push(window.setTimeout(() => { setCompte(4 - i); if (prefs.bip) bip(i === 0); }, i * temps * 1000));
    }
    minuteries.current.push(window.setTimeout(() => void lancerCapture(), 4 * temps * 1000));
  };

  const stop = async (auto = false) => {
    minuteries.current.forEach((x) => { window.clearTimeout(x); window.clearInterval(x); });
    minuteries.current = [];
    const c = capture.current; capture.current = null;
    if (!c) { setPhase("pret"); return; }
    setPrepa(0);
    const p = await c.arreter();
    setPrepa(null);
    if (p.frames < p.sr * 0.1) { void libererPrise(p); setPhase("pret"); setErr("Enregistrement trop court."); return; }
    setPrise(p); setBornes([0, 1]); setNom(nomAuto(source.module, source.titre)); setPhase("fini"); setAlerte(null);
    if (auto) setMsg(`Arrêt automatique à ${DUREE_MAX_S / 60} minutes : la prise est sauvegardée, garde-la ou exporte-la.`);
  };

  // ---- après la prise
  const n = prise?.frames ?? 0;
  const ia = Math.floor(bornes[0] * n), ib = Math.max(ia + 1, Math.floor(bornes[1] * n));
  const pics = useMemo(() => (prise ? cretes(prise, 450) : []), [prise]);
  const pic = useMemo(() => (prise ? crete(prise, ia, ib) : 0), [prise, ia, ib]);
  const gain = prefs.normaliser ? gainNormalise(pic) : 1;
  const duree = prise ? n / prise.sr : 0;
  const { pos, actif: joue } = usePositionLecture(qui, duree || 1);
  const ecouter = (boucle: boolean) => { if (!prise) return; if (joue) { arreterLecture(); return; } void jouerPrise(qui, prise, ia / prise.sr, ib / prise.sr, gain, boucle); };
  const fichier = async () => {
    if (!prise) return null;
    setPrepa(0);
    try {
      const b = await wavDe(prise, ia, ib, gain, prefs.bits, (x) => setPrepa(x));
      return new File([b], nom.endsWith(".wav") ? nom : `${nom}.wav`, { type: "audio/wav" });
    } finally { setPrepa(null); }
  };
  const garder = async () => {
    if (!prise) return;
    try {
      const f = await fichier(); if (!f) return;
      await ajouterEnregistrement(f, f.name, {
        id: prise.id, titre: source.titre || NOM_MODULE[source.module], module: source.module, source: source.ref, sourceTitre: source.titre, href: source.href,
        duree: (ib - ia) / prise.sr, sr: prise.sr, canaux: prise.canaux, bits: prefs.bits, creteDb: versDb(pic * gain), normalise: prefs.normaliser,
        bpm: bpmUtilise, apercu: cretes(prise, 120, ia, ib).map((x) => Math.round(Math.min(1, x * gain) * 100) / 100),
      });
      void etatPrise(prise.id, "gardee").catch(() => {});
      setPhase("garde"); setMsg(`Gardé dans Mes enregistrements (${fmtTaille(f.size)}).`);
    } catch { setErr("Le navigateur n'a pas pu garder l'enregistrement (stockage plein ou bloqué). Exporte-le en WAV pour ne pas le perdre."); }
  };
  const exporter = async () => { const f = await fichier(); if (f) await telecharger(f.name, f, "audio/wav"); };
  const utiliserPrise = async (u: NonNullable<EnregistreurProps["utiliser"]>) => { const f = await fichier(); if (f) { utilisee.current = true; await u.action(f); void etatPrise(prise!.id, "gardee").catch(() => {}); } };
  const recommencer = () => { arreterLecture(); if (prise) void libererPrise(prise); setPrise(null); setPhase("pret"); setMsg(""); setErr(""); };
  const basculer = (sansDecompte = false) => { if (phase === "rec" || phase === "decompte") void stop(); else rec(sansDecompte); };

  return {
    qui, e, prefs, setPrefs, phase, compte, t, taille, sat, alerte, disque, prise, bornes, setBornes, nom, setNom, msg, err, prepa, live,
    bpm, bpmUtilise, ia, ib, pics, pic, gain, pos, joue, n,
    rec, stop: () => void stop(), basculer, ecouter, garder, exporter, utiliserPrise, recommencer,
    pret: e.statut === "ouvert", restant: DUREE_MAX_S - t,
  };
}
export type EtatEnregistreur = ReturnType<typeof useEnregistreur>;

export function Enregistreur(props: EnregistreurProps) {
  const r = useEnregistreur({ source: props.source, bpm: props.bpm });
  return <VueEnregistreur r={r} {...props} />;
}

/** Durée, temps restant avant 40 min, taille du fichier et alertes, pendant l'enregistrement. */
export function InfosRec({ r }: { r: EtatEnregistreur }) {
  if (r.phase !== "rec") return null;
  return (
    <>
      <p className="rec-compteurs small" aria-live="off">
        <span>Durée <b>{mmss(r.t)}</b></span>
        <span>Reste <b>{mmss(r.restant)}</b> <small>sur {DUREE_MAX_S / 60} min</small></span>
        <span>Fichier <b>{fmtTaille(r.taille)}</b> <small>WAV 24 bits, sauvegardé toutes les 5 s</small></span>
      </p>
      {!r.disque && <p className="audio-alerte rouge small" role="alert">⚠ Le stockage du navigateur est plein : la suite est gardée en mémoire. Arrête bientôt et exporte en WAV.</p>}
      {r.sat > 0 && <p className="audio-alerte rouge small" role="alert">⚠ Saturation ({r.sat.toLocaleString("fr-FR")} échantillon{r.sat > 1 ? "s" : ""} à 0 dBFS) : baisse le gain de la Scarlett ou le Master Volume de l'E2.</p>}
      {r.restant <= 60 ? (
        <p className="audio-alerte rouge small" role="alert">⏰ Moins d'1 minute : arrêt et sauvegarde automatiques dans {Math.ceil(r.restant)} s (maximum {DUREE_MAX_S / 60} minutes).</p>
      ) : r.alerte === 300 || r.restant <= 300 ? (
        <p className="audio-alerte orange small" role="alert">⏰ Plus que 5 minutes avant la limite de {DUREE_MAX_S / 60} minutes. L'enregistrement s'arrêtera et se sauvegardera tout seul.</p>
      ) : null}
    </>
  );
}

export function VueEnregistreur({ r, utiliser, garderDansListe = true, onFermer, bpm, sansBarre }: Omit<EnregistreurProps, "source"> & { r: EtatEnregistreur; sansBarre?: boolean }) {
  const { phase, prise, prefs, setPrefs, e } = r;
  return (
    <div className={`rec ${phase}`}>
      {!sansBarre && <BarreEntree qui={r.qui} />}
      {(phase === "pret" || phase === "decompte" || phase === "rec") && (
        <>
          <div className="rec-commandes">
            {phase === "rec" || phase === "decompte" ? (
              <button type="button" className="rec-stop" onClick={r.stop} disabled={r.prepa !== null}>■ Stop</button>
            ) : (
              <button type="button" className="rec-rec" disabled={!r.pret} onClick={() => r.rec()} title={r.pret ? "Enregistrer" : "L'entrée audio n'est pas ouverte"}>● REC</button>
            )}
            <span className="rec-temps" aria-live="off">{phase === "decompte" ? <b className="rec-compte">{r.compte}</b> : fmtDuree(r.t)}</span>
            {phase === "rec" && <span className="rec-on">● ENREGISTREMENT</span>}
            {r.prepa !== null && <span className="small muted">Sauvegarde de la fin…</span>}
            {phase === "pret" && (
              <span className="rec-opts">
                <label><input type="checkbox" checked={prefs.decompte} onChange={(x) => setPrefs({ decompte: x.target.checked })} /> Décompte d'une mesure</label>
                {prefs.decompte && (
                  <>
                    {bpm === undefined
                      ? <label>à <input type="number" min={40} max={300} value={prefs.bpm} onChange={(x) => setPrefs({ bpm: Number(x.target.value) || 130 })} /> BPM</label>
                      : <span>à {bpm.toLocaleString("fr-FR")} BPM</span>}
                    <label><input type="checkbox" checked={prefs.bip} onChange={(x) => setPrefs({ bip: x.target.checked })} /> bips</label>
                  </>
                )}
                <span className="muted">jusqu'à {DUREE_MAX_S / 60} min</span>
              </span>
            )}
            {onFermer && phase === "pret" && <button type="button" className="rec-fermer" onClick={onFermer} aria-label="Fermer l'enregistreur">✕</button>}
          </div>
          <Vumetre actif={r.pret} mono={e.reglages.mode === "mono"} compact />
          {phase === "rec" && <Onde pics={r.live} hauteur={60} couleur="#ff6a6a" />}
          <InfosRec r={r} />
        </>
      )}
      {prise && (phase === "fini" || phase === "garde") && (
        <div className="rec-edition">
          <Onde pics={r.pics} debut={r.bornes[0]} fin={r.bornes[1]} pos={r.pos} onBornes={phase === "fini" ? (a, b) => r.setBornes([a, b]) : undefined} />
          <div className="rec-infos small">
            <span>Début <b>{fmtDuree(r.ia / prise.sr)}</b></span><span>Fin <b>{fmtDuree(r.ib / prise.sr)}</b></span>
            <span>Durée <b>{fmtDuree((r.ib - r.ia) / prise.sr)}</b></span>
            <span>Crête <b>{fmtDb(versDb(r.pic * r.gain))}</b> dBFS</span>
            <span>{fmtHz(prise.sr)} · {prise.canaux === 1 ? "mono" : "stéréo"} · {prefs.bits} bits</span>
            <span>Fichier <b>{fmtTaille(tailleWav(r.ib - r.ia, prise.canaux, prefs.bits))}</b></span>
          </div>
          {prise.saturations > 0 && <p className="audio-alerte rouge small">⚠ Cette prise a saturé {prise.saturations.toLocaleString("fr-FR")} fois (en rouge sur la forme d'onde). Refais-la avec un peu moins de gain.</p>}
          <div className="rec-btns">
            <button type="button" className="px-btn" onClick={() => r.ecouter(false)}>{r.joue ? "■ Stop" : "▶ Réécouter"}</button>
            <button type="button" className="e2-ui-btn" onClick={() => r.ecouter(true)} disabled={r.joue}>🔁 En boucle</button>
            {phase === "fini" && <button type="button" className="e2-ui-btn" onClick={() => { const [a, b] = bornesUtiles(prise); r.setBornes([a / r.n, b / r.n]); }}>✂ Couper les silences</button>}
            {phase === "fini" && <button type="button" className="e2-ui-btn" onClick={() => r.setBornes([0, 1])}>Tout garder</button>}
            <label className="rec-check"><input type="checkbox" checked={prefs.normaliser} disabled={phase !== "fini"} onChange={(x) => setPrefs({ normaliser: x.target.checked })} /> Normaliser {prefs.normaliser && r.pic > 0 ? `(${r.gain >= 1 ? "+" : "−"}${Math.abs(20 * Math.log10(r.gain)).toFixed(1).replace(".", ",")} dB, crête à −1 dBFS)` : "(crête à −1 dBFS)"}</label>
          </div>
          {phase === "fini" && <p className="small muted">Glisse les poignées jaunes pour couper le début et la fin.</p>}
          <div className="rec-sauver">
            <label className="rec-nom">Nom du fichier <input type="text" value={r.nom} onChange={(x) => r.setNom(x.target.value)} disabled={phase !== "fini"} /></label>
            <label className="rec-nom court">Qualité
              <select value={prefs.bits} onChange={(x) => setPrefs({ bits: Number(x.target.value) as 16 | 24 })} disabled={phase !== "fini"}>
                <option value={24}>WAV 24 bits</option><option value={16}>WAV 16 bits</option>
              </select>
            </label>
          </div>
          <div className="rec-btns">
            {garderDansListe && phase === "fini" && <button type="button" className="px-btn green" disabled={r.prepa !== null} onClick={() => void r.garder()}>💾 Garder dans Mes enregistrements</button>}
            {utiliser && <button type="button" className="px-btn green" disabled={r.prepa !== null} onClick={() => void r.utiliserPrise(utiliser)}>{utiliser.libelle}</button>}
            <button type="button" className="e2-ui-btn" disabled={r.prepa !== null} onClick={() => void r.exporter()}>⬇ Exporter en WAV</button>
            <button type="button" className="e2-ui-btn" onClick={r.recommencer}>● Nouvelle prise</button>
            {phase === "fini" && <button type="button" className="e2-ui-btn" onClick={r.recommencer}>🗑 Jeter</button>}
            {onFermer && <button type="button" className="e2-ui-btn" onClick={onFermer}>Fermer</button>}
          </div>
          {r.prepa !== null && <p className="small muted" role="status">Préparation du fichier… {Math.round(r.prepa * 100)} %</p>}
          {r.msg && <p className="small ok" role="status">✓ {r.msg} {phase === "garde" && <a href="#enregistrements">Voir Mes enregistrements</a>}</p>}
        </div>
      )}
      {r.err && <p className="small err" role="alert">{r.err}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Mes versions d'une fiche
/** Les enregistrements gardés d'une fiche (recette, exercice…), à côté de l'aperçu pour comparer. */
export function useLignes() {
  const [l, setL] = useState<Ligne[] | null>(null);
  useEffect(() => {
    let vivant = true;
    const lire = () => listerEnregistrements().then((x) => { if (vivant) setL(x); }).catch(() => { if (vivant) setL([]); });
    lire();
    const u = surChangement(lire);
    return () => { vivant = false; u(); };
  }, []);
  return l;
}

export function MesVersions({ module, refId }: { module: ModuleRec; refId: string }) {
  const lignes = useLignes();
  const v = (lignes ?? []).filter((x) => x.meta && x.meta.module === module && x.meta.source === refId && x.meta.etat === "active")
    .sort((a, b) => b.ajouteLe.localeCompare(a.ajouteLe));
  if (!v.length) return null;
  return (
    <ul className="rec-versions">
      {v.slice(0, 5).map((x, i) => (
        <li key={x.cle}>
          <LireRec cle={x.cle} petit />
          <MiniOnde pics={x.meta!.apercu} />
          <span className="rec-v-txt"><b>Ma version {v.length - i}</b><small>{new Date(x.ajouteLe).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {fmtDuree(x.meta!.duree)}</small></span>
          <Etoile type="enregistrement" cle={x.cle} titre={`${x.meta!.titre} (ma version ${v.length - i})`} />
        </li>
      ))}
      {v.length > 5 && <li className="small muted"><a href="#enregistrements">+ {v.length - 5} autre(s) dans Mes enregistrements</a></li>}
    </ul>
  );
}

export function MiniOnde({ pics, couleur = "#4fd18b" }: { pics: number[]; couleur?: string }) {
  return (
    <svg className="rec-mini" viewBox={`0 0 ${pics.length} 20`} preserveAspectRatio="none" aria-hidden>
      {pics.map((p, i) => <rect key={i} x={i} y={10 - Math.max(0.5, p * 10)} width={0.8} height={Math.max(1, p * 20)} fill={p >= 0.999 ? "#ff3b3b" : couleur} />)}
    </svg>
  );
}

const GROS_FICHIER = 40e6;
/** Bouton ▶ / ■ pour un enregistrement gardé. */
export function LireRec({ cle, petit, boucle }: { cle: string; petit?: boolean; boucle?: boolean }) {
  const joue = useSyncExternalStore(surLecture, () => etatLecture()?.owner === cle, () => false);
  const [charge, setCharge] = useState(false);
  const clic = async () => {
    if (joue) { arreterLecture(); return; }
    setCharge(true);
    try {
      const e = await lireEnregistrement(cle);
      if (e && e.blob.size > GROS_FICHIER) {
        // long enregistrement (plus de ~2 min) : lu depuis le disque, sans tout décoder en mémoire
        const u = URL.createObjectURL(e.blob);
        jouerFichier(cle, u, 0, Number.POSITIVE_INFINITY, 1, boucle);
        const off = surLecture(() => { if (etatLecture()?.owner !== cle) { off(); window.setTimeout(() => URL.revokeObjectURL(u), 1000); } });
      } else if (e) { const b = await decoderBlob(e.blob); jouerTampon(cle, b, 0, b.duration, 1, boucle); }
    } catch { /* fichier illisible */ }
    setCharge(false);
  };
  return <button type="button" className={`chipbtn rec-lire ${petit ? "petit" : ""} ${joue ? "on" : ""}`} onClick={() => void clic()} aria-label={joue ? "Arrêter" : "Écouter"}>{charge ? "…" : joue ? "■" : boucle ? "🔁" : "▶"}</button>;
}

/** Bouton « ● Enregistrer ma version » qui ouvre l'enregistreur juste en dessous, avec mes versions déjà gardées. */
export function EnregistrerVersion({ source, bpm, libelle = "● Enregistrer ma version", texte, utiliser, garderDansListe, sansVersions }: {
  source: SourceRec; bpm?: number; libelle?: string; texte?: string; utiliser?: EnregistreurProps["utiliser"]; garderDansListe?: boolean; sansVersions?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="rec-version">
      <div className="rec-version-tete">
        <button type="button" className={`rec-ouvrir ${ouvert ? "on" : ""}`} onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}>{ouvert ? "✕ Fermer l'enregistreur" : libelle}</button>
        {texte && !ouvert && <span className="small muted">{texte}</span>}
      </div>
      {source.ref && !sansVersions && <MesVersions module={source.module} refId={source.ref} />}
      {ouvert && <Enregistreur source={source} bpm={bpm} utiliser={utiliser} garderDansListe={garderDansListe} onFermer={() => setOuvert(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------- Récupération après un plantage
/** Bandeau en haut de l'app : une prise est restée sur le disque (onglet fermé ou planté pendant l'enregistrement,
 *  ou prise arrêtée mais pas gardée). « Récupérer » la range dans Mes enregistrements. */
export function RecupPrises() {
  const [prises, setPrises] = useState<MetaPrise[]>([]);
  const [occupe, setOccupe] = useState("");
  const [fait, setFait] = useState("");
  useEffect(() => {
    let vivant = true;
    const lire = () => listerPrises().then((l) => {
      // une prise d'un autre onglet qui enregistre encore (écrite il y a moins de 20 s) n'est pas proposée
      if (!vivant) return;
      // déjà gardée (dans Mes enregistrements ou une session) : ses morceaux partent sans rien demander
      for (const m of l) if (!priseIci(m.id) && (m.etat === "gardee" || m.frames === 0) && (m.etat !== "rec" || Date.now() - m.majLe > 20000)) void libererPrise(m.id);
      setPrises(l.filter((m) => !priseIci(m.id) && m.frames > 0 && m.etat !== "gardee" && (m.etat === "arretee" || Date.now() - m.majLe > 20000)));
      // écrite il y a peu (plantage juste avant le lancement, ou un autre onglet) : on regarde de nouveau dans 20 s
      if (l.some((m) => !priseIci(m.id) && m.etat === "rec" && Date.now() - m.majLe <= 20000)) { window.clearTimeout(relire); relire = window.setTimeout(lire, 21000); }
    }).catch(() => {});
    let relire = 0;
    lire();
    const u = surChangement(lire);
    window.addEventListener("hashchange", lire);
    return () => { vivant = false; u(); window.clearTimeout(relire); window.removeEventListener("hashchange", lire); };
  }, []);
  if (!prises.length && !fait) return null;
  const recuperer = async (m: MetaPrise) => {
    setOccupe(m.id);
    try { const d = await recupererPrise(m); setFait(`✓ Récupéré : ${mmss(d)} rangées dans Mes enregistrements.`); }
    catch { setFait("Impossible de récupérer cet enregistrement (stockage plein ?)."); }
    setOccupe(""); setPrises((l) => l.filter((x) => x.id !== m.id));
  };
  const jeter = async (m: MetaPrise) => { await libererPrise(m.id); setPrises((l) => l.filter((x) => x.id !== m.id)); };
  return (
    <div className="recup-prises" role="alert">
      {prises.map((m) => (
        <div key={m.id} className="recup-ligne">
          <span>
            <b>{m.etat === "rec" ? "⚠ Un enregistrement s'est arrêté avant la fin" : "Un enregistrement n'a pas été gardé"}</b>
            {" "}· {mmss(m.frames / m.sr)} enregistrées le {new Date(m.debut).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {NOM_MODULE[m.source.module]}{m.source.titre && m.source.titre !== NOM_MODULE[m.source.module] ? ` : ${m.source.titre}` : ""}
          </span>
          <span className="recup-btns">
            <button type="button" className="px-btn green" disabled={occupe !== ""} onClick={() => void recuperer(m)}>{occupe === m.id ? "Récupération…" : "💾 Récupérer dans Mes enregistrements"}</button>
            <button type="button" className="e2-ui-btn" disabled={occupe !== ""} onClick={() => void jeter(m)}>🗑 Jeter</button>
          </span>
        </div>
      ))}
      {fait && <div className="recup-ligne"><span>{fait} <a href="#enregistrements">Voir</a></span><button type="button" className="e2-ui-btn" onClick={() => setFait("")}>✕</button></div>}
    </div>
  );
}
