// Onglet « Masteriser » du Studio : un chemin en 3 étapes (Le son, Régler, Exporter), 6 gros curseurs (mode Simple),
// et la barre de lecture fixe en bas (A/B au même volume, bypass, mono, mesures), partagée par les 4 onglets du Studio.
// Le son masterisé est le « son en cours » du Studio (lib/studioSon.ts).
// Tout reste sur l'appareil : aucun fichier n'est envoyé nulle part.
import { Deroulant } from "../components/Deroulant";
import { BoutonSupprimer } from "../components/Confirmer";
import { imageASauter } from "../lib/moteurAudio";
import { BoutonLecture, ChoixMode } from "../components/Lecteur";
import { lireJson, ecrireJson } from "../lib/stockage";
import { noterExport } from "../lib/exportsMaster";
import { decoderNavigateur } from "../lib/decodage";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Infos } from "../components/Rangement";
import { Badge, DoneToggle, ObservationBox } from "../components/common";
import { PixelArt } from "../components/PixelArt";
import { Etoile } from "../components/Etoile";
import { telecharger } from "../lib/telecharger";
import { ouvrirEnregistrementDansStudio, poserSonStudio, useSonStudio } from "../lib/studioSon";
import { alertes, fmtTemps, FREQS_SPECTRE, lireWav, sonDemo, spectreExtrait, type Analyse, type Son } from "../lib/masterAnalyse";
import { completer, copie, courbeEq, NOMS_BANDES, type Reglages } from "../lib/masterDsp";
import { Lecteur, type Source } from "../lib/masterLecteur";
import { demander } from "../lib/masterClient";
import { ecrireMp3, mp3Possible } from "../lib/masterMp3";
import { avecProtections, compDepuis, CURSEURS, ecrireSimple, egaux, estSimple, FREQ_PASSE_HAUT, lireSimples, protections, reglagesSimples, versSimple, type CleSimple, type InfoCurseur } from "../lib/masterSimple";
import { useStyles } from "../content/styles";
import { AIDES, BLOCS_M, LECONS, POINTS_DEPART, PRESETS_RAPIDES, reglagesPreset, type Aide, type Lecon } from "../content/mastering";
import { Cretes, dessinerCourbes, fDeX, preparerCanvas as preparerCourbe, prefsSpectre, usePrefsSpectre, xDeF, zoneCourbe, type Courbe } from "../lib/spectreCourbe";
import { ReglagesSpectre } from "../components/SpectreCourbe";
import "./mastering.css";

const CLE_REGLAGES = "e2academy.mastering.reglages";
const CLE_PRESETS = "e2academy.mastering.presets";
const CLE_PREFS = "e2academy.mastering.prefs";

const lireLS = lireJson;
const ecrireLS = (cle: string, v: unknown): void => { ecrireJson(cle, v); };
const c3 = (f: string) => (f === "mp3" ? "MP3 320" : f === "wav16" ? "WAV 16 bits" : "WAV 24 bits");


const f1 = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d).replace(".", ",") : "–");
const signe = (x: number, d = 1) => (Number.isFinite(x) ? `${x > 0 ? "+" : ""}${f1(x, d)}` : "–");
const fHz = (f: number) => (f >= 1000 ? `${f1(f / 1000, f >= 10000 || f % 1000 === 0 ? 0 : 1)} kHz` : `${Math.round(f)} Hz`);

export interface PresetPerso { id: string; nom: string; reglages: Reglages; majLe: string }

interface Prefs { boucle: boolean; compensation: boolean; analyse: boolean; preset: string | null }
interface Etat { r: Reglages; preset: string | null }
const FORMATS = ".wav,.mp3,.flac,.m4a,.aac,audio/*";

/** Ce que l'adresse demande : #mastering/eq, /lecon-comp, /depart-tribe, /analyse, /exporter… */
function initialRoute(focus?: string): { aide?: string; depart?: Etat; analyse?: boolean; cible?: string } {
  if (!focus) return {};
  // anciens liens vers le mode Avancé (#mastering/eq, /chaine…) : l'étape « Régler » avec les 6 curseurs
  if (BLOCS_M.some((b) => b.id === focus) || focus === "chaine") return { cible: "ms-etape-2" };
  if (focus.startsWith("lecon-")) return { aide: focus.slice(6) };
  if (focus.startsWith("depart-")) {
    const p = POINTS_DEPART.find((x) => x.id === focus.slice(7));
    return p ? { depart: { r: avecProtections(copie(p.reglages)), preset: `style-${p.id}` }, cible: "ms-etape-2" } : { cible: "ms-etape-2" };
  }
  if (focus === "depart") return { cible: "ms-etape-2" };
  if (focus === "analyse") return { analyse: true, cible: "ms-etape-1" };
  if (focus === "exporter") return { cible: "ms-etape-3" };
  return {};
}

/** `visible` = false : l'onglet Masteriser est caché, mais le lecteur et la barre du bas restent (partagés par le Studio). */
export default function Mastering({ focus, visible = true }: { focus?: string; visible?: boolean }) {
  const lecteur = useMemo(() => new Lecteur(), []);
  useEffect(() => () => lecteur.fermer(), [lecteur]);
  const prefs0 = useMemo<Prefs>(() => ({ boucle: true, compensation: true, analyse: false, preset: null, ...lireLS<Partial<Prefs>>(CLE_PREFS, {}) }), []);
  const init = useMemo(() => initialRoute(focus), [focus]);

  const [son, setSon] = useState<Son | null>(null);
  const [erreur, setErreur] = useState("");
  const [avant, setAvant] = useState<Analyse | null>(null);
  const [apres, setApres] = useState<{ a: Analyse; version: number } | null>(null);
  const [calcul, setCalcul] = useState(false);
  const [ref, setRef] = useState<Son | null>(null);
  const [refAna, setRefAna] = useState<Analyse | null>(null);
  const [reglages, setReglagesBrut] = useState<Reglages>(() => {
    if (init.depart) return init.depart.r;
    return avecProtections(completer(lireLS<Partial<Reglages> | undefined>(CLE_REGLAGES, undefined)));
  });
  const [preset, setPresetBrut] = useState<string | null>(init.depart ? init.depart.preset : prefs0.preset);
  const [persos, setPersosBrut] = useState<PresetPerso[]>(() => lireLS<PresetPerso[]>(CLE_PRESETS, []));
  const setPersos = useCallback((p: PresetPerso[]) => { setPersosBrut(p); ecrireLS(CLE_PRESETS, p); }, []);
  const [lecture, setLecture] = useState(false);
  const [boucle, setBoucle] = useState<boolean>(prefs0.boucle);
  const [zone, setZone] = useState<[number, number] | null>(null);
  const [source, setSource] = useState<Source>("B");
  const [compensation, setCompensation] = useState<boolean>(prefs0.compensation);
  const [mono, setMono] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [analyseOuverte, setAnalyseOuverte] = useState<boolean>(init.analyse ?? prefs0.analyse);
  const [aide, setAide] = useState<string | null>(init.aide ?? null);

  useEffect(() => ecrireLS(CLE_PREFS, { boucle, compensation, analyse: analyseOuverte, preset }), [boucle, compensation, analyseOuverte, preset]);
  useEffect(() => { if (init.cible) setTimeout(() => document.getElementById(init.cible!)?.scrollIntoView({ block: "start" }), 50); }, [init]);

  // ---- réglages + historique (Annuler / Rétablir)
  const reglagesRef = useRef(reglages), presetRef = useRef(preset);
  const version = useRef(0);
  const [, rafraichir] = useState(0);
  const hist = useRef<{ passe: Etat[]; futur: Etat[]; t: number }>({ passe: [], futur: [], t: 0 });
  useEffect(() => { lecteur.regler(reglagesRef.current); ecrireLS(CLE_REGLAGES, reglagesRef.current); }, [lecteur]);

  const poser = useCallback((r: Reglages, p: string | null) => {
    version.current++;
    reglagesRef.current = r; presetRef.current = p;
    setReglagesBrut(r); setPresetBrut(p);
    lecteur.regler(r);
    ecrireLS(CLE_REGLAGES, r);
  }, [lecteur]);

  /** Change les réglages. `fusion` : un curseur qu'on fait glisser ne crée qu'une seule étape d'historique. */
  const changer = useCallback((r: Reglages, p: string | null = null, fusion = false) => {
    if (egaux(r, reglagesRef.current) && p === presetRef.current) return;
    const h = hist.current, now = Date.now();
    if (!fusion || now - h.t > 700) { h.passe.push({ r: reglagesRef.current, preset: presetRef.current }); if (h.passe.length > 200) h.passe.shift(); }
    h.t = fusion ? now : 0; h.futur = [];
    poser(r, p); rafraichir((x) => x + 1);
  }, [poser]);
  const annuler = useCallback(() => {
    const h = hist.current, e = h.passe.pop(); if (!e) return;
    h.futur.push({ r: reglagesRef.current, preset: presetRef.current }); h.t = 0;
    poser(e.r, e.preset); rafraichir((x) => x + 1);
  }, [poser]);
  const retablir = useCallback(() => {
    const h = hist.current, e = h.futur.pop(); if (!e) return;
    h.passe.push({ r: reglagesRef.current, preset: presetRef.current }); h.t = 0;
    poser(e.r, e.preset); rafraichir((x) => x + 1);
  }, [poser]);

  // ---- chargement
  const chargerSon = useCallback((s: Son) => {
    setErreur(""); setSon(s); setAvant(null); setApres(null); setLecture(false); setZone(null);
    lecteur.charger(s, reglagesRef.current);
    lecteur.surFin = () => setLecture(false);
    void demander({ type: "charger", cle: "son", L: s.L, R: s.R, sr: s.sr }).then(() => demander({ type: "analyser", cle: "son" }))
      .then((r) => setAvant(r.analyse!)).catch((e) => setErreur(String(e.message ?? e)));
  }, [lecteur]);

  const ouvrirFichier = useCallback(async (f: File, pour: "son" | "ref") => {
    setErreur("");
    try {
      const buf = await f.arrayBuffer();
      let s: Son;
      try { s = lireWav(buf, f.name); }
      catch (e) {
        if (/\.wave?$/i.test(f.name)) throw e;
        s = await decoderNavigateur(buf, f.name); // MP3, FLAC, M4A, AAC : décodés par le navigateur
      }
      if (pour === "son") poserSonStudio(s, "fichier");   // devient le son en cours du Studio (chargé ci-dessous)
      else {
        setRef(s); setRefAna(null); lecteur.ref = s; lecteur.refPos = 0;
        await demander({ type: "charger", cle: "ref", L: s.L, R: s.R, sr: s.sr });
        setRefAna((await demander({ type: "analyser", cle: "ref" })).analyse!);
      }
    } catch (e) { setErreur(e instanceof Error ? e.message : String(e)); }
  }, [chargerSon, lecteur]);
  // #studio/masteriser/rec=<clé> : ouvre un enregistrement de « Mes enregistrements »
  useEffect(() => {
    if (!focus?.startsWith("rec=")) return;
    void ouvrirEnregistrementDansStudio(decodeURIComponent(focus.slice(4))).catch((e) => setErreur(String(e.message ?? e)));
  }, [focus]);
  // Le son en cours du Studio (enregistré, importé, ouvert depuis Mes enregistrements) : chargé ici sans réimporter.
  const studio = useSonStudio();
  useEffect(() => { if (studio && studio.son !== son) chargerSon(studio.son); }, [studio]); // eslint-disable-line react-hooks/exhaustive-deps

  const retirerRef = useCallback(() => {
    setRef(null); setRefAna(null); lecteur.ref = null;
    if (source === "R") setSource("B");
  }, [lecteur, source]);

  // ---- analyse de l'après (en arrière-plan, après chaque réglage)
  useEffect(() => {
    if (!son || !avant) return;
    const v = version.current;
    setCalcul(true);
    const t = setTimeout(() => {
      demander({ type: "apres", cle: "son", reglages }).then((r) => { if (v === version.current) { setApres({ a: r.analyse!, version: v }); setCalcul(false); } })
        .catch((e) => { if (!e.annule) { setErreur(e.message); setCalcul(false); } });
    }, 500);
    return () => clearTimeout(t);
  }, [reglages, son, avant]);

  // ---- lecteur
  useEffect(() => { lecteur.boucle = boucle; }, [lecteur, boucle]);
  useEffect(() => { lecteur.zone = zone; }, [lecteur, zone]);
  useEffect(() => { lecteur.source = bypass ? "A" : source; }, [lecteur, source, bypass]);
  useEffect(() => { lecteur.mono = mono; }, [lecteur, mono]);

  const cpt = useTick(lecteur, lecture);
  const apresAJour = apres && apres.version === version.current ? apres.a : null;
  // volume perçu de chaque version : mesure exacte si elle est prête, sinon estimation sur ce qui a été joué
  const luA = avant?.lufs ?? NaN;
  const luB = apresAJour?.lufs ?? (Number.isFinite(cpt.liveB) && Number.isFinite(cpt.liveA) ? luA + (cpt.liveB - cpt.liveA) : apres?.a.lufs ?? luA);
  const luR = refAna?.lufs ?? NaN;
  const compenser = compensation && !bypass;
  const gains = useMemo(() => {
    if (!compenser) return { A: 1, B: 1, R: 1 };
    const vals = [luA, luB, ...(Number.isFinite(luR) ? [luR] : [])].filter(Number.isFinite);
    const cible = Math.min(...vals);
    const g = (x: number) => (Number.isFinite(x) ? Math.pow(10, (cible - x) / 20) : 1);
    return { A: g(luA), B: g(luB), R: g(luR) };
  }, [compenser, luA, luB, luR]);
  useEffect(() => { lecteur.gains = gains; }, [lecteur, gains]);

  const jouer = useCallback(async () => {
    if (lecteur.lecture) { lecteur.arreter(); setLecture(false); }
    else { await lecteur.jouer(); setLecture(true); }
  }, [lecteur]);
  const lancer = useCallback(async () => {
    if (lecteur.son && !lecteur.lecture) { await lecteur.jouer(); setLecture(true); }
  }, [lecteur]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const champTexte = t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && !["range", "checkbox", "radio"].includes((t as HTMLInputElement).type));
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !champTexte) {
        const z = e.key.toLowerCase();
        if (z === "z" && !e.shiftKey) { e.preventDefault(); annuler(); return; }
        if (z === "y" || (z === "z" && e.shiftKey)) { e.preventDefault(); retablir(); return; }
      }
      if (e.key === "Escape" && aide) { setAide(null); return; }
      if (e.code !== "Space" || /INPUT|TEXTAREA|SELECT|BUTTON|SUMMARY/.test(t.tagName)) return;
      if (!lecteur.son || document.querySelector(".visu-video")) return;
      e.preventDefault(); void jouer();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [jouer, lecteur, annuler, retablir, aide]);

  /** Écouter des réglages précis (exercices des leçons) tout de suite, en B. */
  const ecouter = useCallback(async (r: Reglages, comp?: boolean) => {
    changer(r, null);
    if (comp !== undefined) setCompensation(comp);
    setSource("B"); setBypass(false);
    await lancer();
  }, [changer, lancer]);

  const choisirPreset = useCallback((id: string, r: Reglages) => {
    changer(avecProtections(r), id);
    setSource("B"); setBypass(false);
    void lancer();
  }, [changer, lancer]);

  const ctx: Ctx = {
    son, avant, apres: apresAJour, apresAncien: apres?.a ?? null, calcul, ref, refAna, reglages,
    setReglages: (r: Reglages) => changer(r, null, true), changer, lecteur, cpt, luA, luB, luR, gains, compensation, setCompensation,
    source, setSource, bypass, setBypass, ecouter, ouvrirFichier, retirerRef, mono, setMono, setAide,
  };
  const barre = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barre.current; if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--ms-barre", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => { ro.disconnect(); document.documentElement.style.removeProperty("--ms-barre"); };
  }, []);

  const peutAnnuler = hist.current.passe.length > 0, peutRetablir = hist.current.futur.length > 0;
  const off = !son;

  const barreEtAide = (
    <>
      <Barre refDiv={barre} ctx={ctx} lecture={lecture} jouer={jouer} boucle={boucle} setBoucle={setBoucle} zone={zone} setZone={setZone} />
      {aide && <PanneauAide ctx={ctx} id={aide} fermer={() => setAide(null)} />}
    </>
  );
  if (!visible) return barreEtAide;

  return (
    <div className="ms ms2">
      <p className="ms-local"><PixelArt name="mastering" size={18} /> Tout se passe dans ton navigateur : ton son n'est envoyé nulle part.</p>
      <PresetsAvances persos={persos} />

      <Etape n={1} id="ms-etape-1" titre="Le son" sous={son ? son.nom : "WAV, MP3, FLAC, M4A ou AAC"}>
        <Import ctx={ctx} />
        {erreur && <p className="ms-erreur" role="alert">{erreur}</p>}
        <BlocAnalyse ctx={ctx} ouvert={analyseOuverte} setOuvert={setAnalyseOuverte} />
      </Etape>

      <Etape n={2} id="ms-etape-2" titre="Régler" off={off} sous={off ? "Importe un son à l'étape 1 pour régler." : undefined}
        droite={!off && (
          <span className="ms-et-outils">
            <button type="button" className="chipbtn" onClick={annuler} disabled={!peutAnnuler} title="Annuler (Ctrl+Z)">↶ Annuler</button>
            <button type="button" className="chipbtn" onClick={retablir} disabled={!peutRetablir} title="Rétablir (Ctrl+Y)">↷ Rétablir</button>
          </span>
        )}>
        <Presets ctx={ctx} preset={preset} choisir={choisirPreset} persos={persos} setPersos={setPersos} />
        <ModeSimple ctx={ctx} />
        <div className="ms-et-pied">
          <button type="button" className="chipbtn" onClick={() => changer(reglagesSimples(), null)}>Tout remettre à zéro</button>
          <span className="small muted">Ctrl+Z annule, Ctrl+Y rétablit.</span>
        </div>
      </Etape>

      <Etape n={3} id="ms-etape-3" titre="Exporter" off={off} sous={off ? "Importe un son à l'étape 1 pour exporter." : undefined}>
        <Export ctx={ctx} />
      </Etape>

      {barreEtAide}
    </div>
  );
}

/** Mes presets qui utilisaient des réglages de l'ancien mode Avancé : ils sonnent comme avant, mais ne se convertissent pas exactement en 6 curseurs. */
function PresetsAvances({ persos }: { persos: PresetPerso[] }) {
  const avances = persos.filter((p) => !estSimple(completer(p.reglages)));
  if (!avances.length) return null;
  return (
    <p className="audio-alerte orange small" role="note">
      ⚠ {avances.length === 1 ? "Ton preset" : "Tes presets"} {avances.map((p) => `« ${p.nom} »`).join(", ")} {avances.length === 1 ? "utilise" : "utilisent"} des réglages de l'ancien mode Avancé
      qui n'ont pas de curseur (EQ 2 et 4, largeur stéréo, temps du compresseur…). {avances.length === 1 ? "Il sonne" : "Ils sonnent"} exactement comme avant ; si tu bouges un curseur, ces réglages restent.
      Le bouton « ⇢ 6 curseurs » à côté du preset le convertit au plus proche (après, il ne sonne plus tout à fait pareil).
    </p>
  );
}

// ------------------------------------------------------------------ contexte partagé
interface Ctx {
  son: Son | null; avant: Analyse | null; apres: Analyse | null; apresAncien: Analyse | null; calcul: boolean;
  ref: Son | null; refAna: Analyse | null;
  reglages: Reglages; setReglages: (r: Reglages) => void; changer: (r: Reglages, p?: string | null, fusion?: boolean) => void;
  lecteur: Lecteur; cpt: Lecteur["cpt"] & { t: number };
  luA: number; luB: number; luR: number; gains: { A: number; B: number; R: number };
  compensation: boolean; setCompensation: (b: boolean) => void;
  source: Source; setSource: (s: Source) => void;
  bypass: boolean; setBypass: (b: boolean) => void;
  ecouter: (r: Reglages, comp?: boolean) => Promise<void>;
  ouvrirFichier: (f: File, pour: "son" | "ref") => Promise<void>;
  retirerRef: () => void;
  mono: boolean; setMono: (b: boolean) => void;
  setAide: (id: string | null) => void;
}

function Etape({ n, id, titre, sous, off, droite, children }: { n: number; id: string; titre: string; sous?: string; off?: boolean; droite?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className={`ms-etape ${off ? "off" : ""}`} aria-disabled={off || undefined} {...(off ? { inert: "" } : {})}>
      <header className="ms-et-tete">
        <span className="ms-et-num">{n}</span>
        <h3>{titre}</h3>
        {sous && <span className="ms-et-sous" title={sous}>{sous}</span>}
        {droite}
      </header>
      <div className="ms-et-corps">{children}</div>
    </section>
  );
}

function BoutonAide({ id, ctx, nom }: { id: string; ctx: Ctx; nom: string }) {
  return <button type="button" className="ms-q" onClick={() => ctx.setAide(id)} aria-label={`Mini-leçon : ${nom}`} title={`Mini-leçon : ${nom}`}>?</button>;
}

// ------------------------------------------------------------------ 1. Importer
function Depot({ onFichier, className, children }: { onFichier: (f: File) => void; className: string; children: ReactNode }) {
  const [survol, setSurvol] = useState(false);
  return (
    <div className={`${className} ${survol ? "survol" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setSurvol(true); }} onDragLeave={() => setSurvol(false)}
      onDrop={(e) => { e.preventDefault(); setSurvol(false); const f = e.dataTransfer.files[0]; if (f) onFichier(f); }}>
      {children}
    </div>
  );
}

function Import({ ctx }: { ctx: Ctx }) {
  const input = useRef<HTMLInputElement>(null), inputRef = useRef<HTMLInputElement>(null);
  const s = ctx.son;
  return (
    <div className="ms-import">
      <Depot className={`ms-depot ms-depot-grand ${s ? "charge" : ""}`} onFichier={(f) => void ctx.ouvrirFichier(f, "son")}>
        <PixelArt name="mastering" size={s ? 32 : 64} />
        <div className="ms-depot-txt">
          <b>{s ? "Changer de son" : "Glisse ton fichier ici"}</b>
          <span>WAV, MP3, FLAC, M4A ou AAC</span>
        </div>
        <div className="ms-depot-btns">
          <button type="button" className="px-btn green" onClick={() => input.current?.click()}>Choisir un fichier</button>
          <button type="button" className="px-btn" onClick={() => poserSonStudio(sonDemo(), "demo")} title="Une boucle de 8 mesures générée par l'app, pour essayer sans fichier">Son de démo</button>
        </div>
        <input ref={input} type="file" accept={FORMATS} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void ctx.ouvrirFichier(f, "son"); e.target.value = ""; }} />
      </Depot>

      <p className="small muted">Pour masteriser ton E2 : enregistre-le dans l'onglet <a href="#studio/enregistrer">● Enregistrer</a>, la prise arrive ici toute seule. Le son chargé est le même dans les 4 onglets du Studio.</p>

      <Depot className="ms-depot ms-depot-ref" onFichier={(f) => void ctx.ouvrirFichier(f, "ref")}>
        {ctx.ref ? (
          <>
            <span className="ms-ref-tag">R</span>
            <div className="ms-depot-txt"><b>Référence</b><span className="ms-ref-nom" title={ctx.ref.nom}>{ctx.ref.nom} · {fmtTemps(ctx.ref.L.length / ctx.ref.sr)}</span></div>
            <button type="button" className="chipbtn" onClick={() => inputRef.current?.click()}>Changer</button>
            <button type="button" className="chipbtn" onClick={ctx.retirerRef} aria-label="Retirer la référence">✕</button>
          </>
        ) : (
          <button type="button" className="ms-ref-ajout" onClick={() => inputRef.current?.click()}>
            <b>+ Morceau de référence</b>
            <span>Un morceau que tu aimes, pour comparer (bouton R dans la barre du bas).</span>
          </button>
        )}
        <input ref={inputRef} type="file" accept={FORMATS} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void ctx.ouvrirFichier(f, "ref"); e.target.value = ""; }} />
      </Depot>

      {s && (
        <dl className="ms-infos-son">
          <div><dt>Durée</dt><dd>{fmtTemps(s.L.length / s.sr)}</dd></div>
          <div><dt>Fréquence</dt><dd>{f1(s.sr / 1000, s.sr % 1000 ? 1 : 0)} kHz</dd></div>
          <div><dt>Résolution</dt><dd>{s.bits ? `${s.bits} bits` : s.decodeNavigateur ? "décodé" : "générée"}</dd></div>
          <div><dt>Canaux</dt><dd>{s.canaux === 1 ? "mono (copié à gauche et à droite)" : "stéréo"}</dd></div>
          {ctx.lecteur.frequenceCarte > 0 && ctx.lecteur.frequenceCarte !== s.sr && (
            <div className="large"><dt>Écoute</dt><dd>ta carte son tourne à {f1(ctx.lecteur.frequenceCarte / 1000)} kHz : l'app convertit seulement pour l'écoute, l'export garde {f1(s.sr / 1000)} kHz.</dd></div>
          )}
        </dl>
      )}
    </div>
  );
}

function BlocAnalyse({ ctx, ouvert, setOuvert }: { ctx: Ctx; ouvert: boolean; setOuvert: (b: boolean) => void }) {
  const a = ctx.avant;
  const liste = a ? alertes(a, ctx.refAna) : [];
  const graves = liste.filter((x) => x.niveau !== "info").length;
  const norm = (x: Analyse) => x.spectre.map((v) => v - x.lufs - 35);
  return (
    <Deroulant compact id="mastering.analyse" etat={[ouvert, setOuvert]} couleur="#ffb020" titre="Analyse" texte={
        !ctx.son ? <span className="muted">se remplit dès que le son est chargé</span>
          : !a ? <span className="muted">mesure en cours…</span>
          : (
            <span className="ms-an-res">
              <span>{f1(a.lufs)} LUFS <span className="ms-approx">≈</span></span>
              <span>crête {f1(a.creteVraie)} dBTP</span>
              <span className={graves ? "alerte" : "ok"}>{graves ? `${graves} alerte${graves > 1 ? "s" : ""}` : "rien d'alarmant"}</span>
            </span>
          )}>
      {ctx.son && a && (
        <div className="ms-an-corps">
          <h4>Alertes en mots simples <Badge kind="pratique">Repères, pas des règles</Badge></h4>
          <ul className="ms-alertes">
            {liste.map((x) => <li key={x.titre} className={x.niveau}><b>{x.titre}</b> {x.texte}</li>)}
          </ul>
          {!ctx.refAna && <p className="small muted">Ajoute un morceau de référence : les alertes de grave et d'aigu se feront par rapport à lui, c'est plus fiable.</p>}
          <div className="ms-grille2">
            <div>
              <h4>Spectre</h4>
              <Spectre ctx={ctx} courbes={[{ nom: "Moyenne avant", couleur: "#8a91a0", v: a.spectre, pointille: true }]} />
              <Legende items={[{ nom: "Avant (en direct)", couleur: "#8a91a0" }, { nom: "Après (en direct)", couleur: "#4fd18b" }, { nom: "Moyenne de tout le morceau (avant)", couleur: "#8a91a0", pointille: true }]} />
              <p className="small muted">Grave à gauche, aigu à droite. Lance la lecture pour voir le spectre en direct.</p>
              <ReglagesSpectre compact />
            </div>
            <div>
              <h4>Image stéréo</h4>
              <Vectorscope ctx={ctx} />
            </div>
          </div>
          <h4>Mesures</h4>
          <Mesures a={a} b={ctx.apres} noms={["Avant", "Après"]} />
          {ctx.refAna && (
            <>
              <h4>Comparé à la référence</h4>
              <Spectre ctx={ctx} courbes={[
                { nom: "Avant", couleur: "#8a91a0", v: norm(a) },
                ...(ctx.apres ? [{ nom: "Après", couleur: "#4fd18b", v: norm(ctx.apres) }] : []),
                { nom: "Référence", couleur: "#ff6aa8", v: norm(ctx.refAna), pointille: true },
              ]} />
              <Legende items={[{ nom: "Avant", couleur: "#8a91a0" }, { nom: "Après", couleur: "#4fd18b" }, { nom: "Référence", couleur: "#ff6aa8", pointille: true }]} />
              <p className="small muted">Spectres moyens décalés au même volume perçu : seule la forme compte.</p>
              <Ecarts a={ctx.apres ?? a} r={ctx.refAna} nom={ctx.apres ? "après" : "avant"} />
            </>
          )}
          <p className="small muted">Les mesures marquées <span className="ms-approx">≈</span> sont approchées : calcul maison inspiré des normes publiques (UIT-R BS.1770 pour le LUFS, EBU R128 pour la plage de volume), pas un appareil certifié.</p>
        </div>
      )}
    </Deroulant>
  );
}

// ------------------------------------------------------------------ 2. Régler : presets
function Presets({ ctx, preset, choisir, persos, setPersos }: { ctx: Ctx; preset: string | null; choisir: (id: string, r: Reglages) => void; persos: PresetPerso[]; setPersos: (p: PresetPerso[]) => void }) {
  const [nom, setNom] = useState("");
  const [saisie, setSaisie] = useState(false);
  const [msg, setMsg] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const rapide = PRESETS_RAPIDES.find((p) => `rapide-${p.id}` === preset);
  const { tous } = useStyles();
  // Presets de style dans l'ordre et les couleurs de « Gérer les styles » ; un style masqué n'a pas de bouton.
  const departs = tous.flatMap((s) => { const p = POINTS_DEPART.find((x) => x.id === s.id); return p && !s.masque ? [{ ...p, couleur: s.couleur }] : []; });
  const style = POINTS_DEPART.find((p) => `style-${p.id}` === preset);
  const perso = persos.find((p) => `perso-${p.id}` === preset);
  const sauver = () => {
    const n = nom.trim() || `Mon preset ${persos.length + 1}`;
    const exist = persos.find((x) => x.nom === n);
    const pr: PresetPerso = { id: exist?.id ?? `p${Date.now().toString(36)}`, nom: n, reglages: copie(ctx.reglages), majLe: new Date().toISOString() };
    setPersos([...persos.filter((x) => x.id !== pr.id), pr]); setNom(""); setSaisie(false); setMsg(`« ${n} » enregistré.`);
    ctx.changer(ctx.reglages, `perso-${pr.id}`);
  };
  const exporter = async () => {
    const f = { app: "CrAoW ACADEMY", type: "presets-mastering", version: 1, exporteLe: new Date().toISOString(), presets: persos };
    const ok = await telecharger(`e2-academy-presets-mastering-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(f, null, 2), "application/json");
    setMsg(ok ? "Fichier exporté." : "Export annulé.");
  };
  const importer = async (file: File) => {
    try {
      const f = JSON.parse(await file.text());
      if (f?.type !== "presets-mastering" || !Array.isArray(f.presets)) throw new Error("Ce fichier n'est pas un export « presets de mastering » de CrAoW ACADEMY.");
      const m = new Map(persos.map((x) => [x.id, x]));
      let pris = 0;
      for (const x of f.presets as PresetPerso[]) {
        if (!x?.id || !x.reglages) continue;
        const cur = m.get(x.id);
        if (!cur || (x.majLe ?? "") > (cur.majLe ?? "")) { m.set(x.id, { id: x.id, nom: String(x.nom ?? x.id), reglages: completer(x.reglages), majLe: x.majLe ?? "" }); pris++; }
      }
      setPersos([...m.values()]); setMsg(`${pris} preset${pris > 1 ? "s" : ""} importé${pris > 1 ? "s" : ""}.`);
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };
  const bouton = (id: string, nomP: string, couleur: string, r: () => Reglages, titre?: string, etoile?: ReactNode) => (
    <span key={id} className={`ms-pr ${preset === id ? "on" : ""}`} style={{ "--cc": couleur } as CSSProperties}>
      <button type="button" onClick={() => choisir(id, r())} aria-pressed={preset === id} title={titre}>{nomP}</button>
      {etoile}
    </span>
  );
  return (
    <div className="ms-presets2">
      <div className="ms-pr-groupe">
        <h4>Presets rapides</h4>
        <div className="ms-pr-ligne">{PRESETS_RAPIDES.map((p) => bouton(`rapide-${p.id}`, p.nom, p.couleur, () => reglagesPreset(p), p.phrase))}</div>
      </div>
      <div className="ms-pr-groupe">
        <h4>Styles</h4>
        <div className="ms-pr-ligne">{departs.map((p) => bouton(`style-${p.id}`, p.nom.toUpperCase(), p.couleur, () => copie(p.reglages), p.resume,
          <Etoile type="master" cle={p.id} titre={`Point de départ ${p.nom}`} />))}</div>
      </div>
      <div className="ms-pr-groupe">
        <h4>Mes presets</h4>
        <div className="ms-pr-ligne">
          {persos.map((x) => (
            <span key={x.id} className={`ms-pr perso ${preset === `perso-${x.id}` ? "on" : ""}`} style={{ "--cc": "#9cc4ff" } as CSSProperties}>
              <button type="button" onClick={() => choisir(`perso-${x.id}`, completer(x.reglages))} aria-pressed={preset === `perso-${x.id}`} title={`Enregistré le ${x.majLe.slice(0, 10)}`}>{x.nom}</button>
              <Etoile type="master" cle={`perso-${x.id}`} titre={x.nom} data={() => x} />
              {!estSimple(completer(x.reglages)) && <button type="button" className="chipbtn ms-pr-conv" title="Convertir ce preset en 6 curseurs (au plus proche)"
                onClick={() => setPersos(persos.map((y) => (y.id === x.id ? { ...y, reglages: versSimple(completer(y.reglages)), majLe: new Date().toISOString() } : y)))}>⇢ 6 curseurs</button>}
              <BoutonSupprimer className="ms-pr-x" quoi={`le preset « ${x.nom} »`} onSupprimer={() => setPersos(persos.filter((y) => y.id !== x.id))}>✕</BoutonSupprimer>
            </span>
          ))}
          {saisie ? (
            <span className="ms-perso-new">
              <input autoFocus type="text" value={nom} placeholder="Nom (ex. Tribe 170 sombre)" onChange={(e) => setNom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sauver(); if (e.key === "Escape") setSaisie(false); }} aria-label="Nom du preset" />
              <button type="button" className="chipbtn on" onClick={sauver}>Enregistrer</button>
              <button type="button" className="chipbtn" onClick={() => setSaisie(false)}>Annuler</button>
            </span>
          ) : <button type="button" className="chipbtn" onClick={() => setSaisie(true)}>+ Enregistrer mes réglages</button>}
        </div>
      </div>
      {(rapide || style || perso) && (
        <div className="ms-pr-info" style={{ "--cc": rapide?.couleur ?? style?.couleur ?? "#9cc4ff" } as CSSProperties}>
          <b>{rapide?.nom ?? style?.nom ?? perso?.nom}</b> {rapide?.phrase ?? style?.resume ?? "Ton preset, tel que tu l'as enregistré."}
          <Badge kind="pratique">Point de départ, à ajuster à l'oreille</Badge>
          {style && (
            <Infos titre="Ce que fait ce preset">
              <ul className="ms-explics">
                {style.explications.map((e) => <li key={e.bloc}><b style={{ color: BLOCS_M.find((b) => b.id === e.bloc)!.couleur }}>{BLOCS_M.find((b) => b.id === e.bloc)!.nom}</b> {e.texte}</li>)}
              </ul>
            </Infos>
          )}
        </div>
      )}
      {ctx.apres && ctx.apres.plr < 8 && (
        <p className="ms-rap-alerte" role="alert"><b>Attention, son trop écrasé.</b> L'écart crête / volume après la chaîne n'est plus que de {f1(ctx.apres.plr)} dB : le kick et les percus perdent leur relief. Baisse le Volume ou la Compression.</p>
      )}
      <Infos titre="Exporter / importer mes presets">
        <div className="ms-perso-io">
          <button type="button" className="chipbtn" onClick={() => void exporter()} disabled={!persos.length}>Exporter mes presets (JSON)</button>
          <button type="button" className="chipbtn" onClick={() => input.current?.click()}>Importer des presets</button>
          <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importer(f); e.target.value = ""; }} />
        </div>
        <p className="small muted">Comme pour tes relevés : exporte le fichier sur le PC, importe-le sur le téléphone (ou l'inverse). En cas de doublon, la version la plus récente gagne.</p>
      </Infos>
      {msg && <p className="small">{msg}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ 2. Régler : mode Simple
function ModeSimple({ ctx }: { ctx: Ctx }) {
  const r = ctx.reglages;
  const v = lireSimples(r);
  const pr = protections(r);
  const b = r.eq.bandes;
  const sous: Record<CleSimple, string> = {
    graves: `plateau vers ${fHz(b[1].f)}`, mediums: `cloche vers ${fHz(b[3].f)}`, aigus: `plateau vers ${fHz(b[5].f)}`,
    comp: v.comp > 0 ? `seuil ${f1(r.comp.seuil)} dB · ${f1(r.comp.ratio, 1)}:1` : "éteinte",
    sat: v.sat > 0 ? `drive ${f1(r.sat.drive)} dB · mix ${Math.round(r.sat.mix)} %` : "éteinte",
    volume: `gain du limiteur, plafond ${f1(r.lim.plafond)} dB`,
  };
  const direct: Partial<Record<CleSimple, number>> = ctx.lecteur.lecture ? { comp: r.comp.on ? ctx.cpt.grComp : 0, volume: r.lim.on ? ctx.cpt.grLim : 0 } : {};
  // ce que les 6 curseurs ne montrent pas (réglé par un preset de style ou un ancien preset du mode Avancé)
  const autres: string[] = [];
  if (r.larg.on) autres.push(`stéréo ${Math.round(r.larg.largeur)} %${r.larg.monoGrave ? `, grave en mono sous ${Math.round(r.larg.freqMono)} Hz` : ""}`);
  for (const i of [2, 4]) if (r.eq.on && b[i].on && Math.abs(b[i].g) > 0.01) autres.push(`EQ ${NOMS_BANDES[i].toLowerCase()} ${signe(b[i].g)} dB vers ${fHz(b[i].f)}`);
  if (r.comp.on) { const c = compDepuis(v.comp); if (c.attaque !== r.comp.attaque || c.relachement !== r.comp.relachement || c.ratio !== r.comp.ratio) autres.push(`compresseur : attaque ${f1(r.comp.attaque, 0)} ms, relâchement ${f1(r.comp.relachement, 0)} ms`); }
  return (
    <div className="ms-simple">
      <div className="ms-gcs">
        {CURSEURS.map((c) => (
          <GrosCurseur key={c.cle} info={c} val={v[c.cle]} sous={sous[c.cle]} direct={direct[c.cle]} ctx={ctx}
            onChange={(x) => ctx.setReglages(ecrireSimple(ctx.reglages, c.cle, x))} />
        ))}
      </div>
      {autres.length > 0 && <p className="small ms-autres">Aussi dans ce réglage : {autres.join(" ; ")}. Réglé par le preset : pas de curseur pour ça.</p>}
      <div className="ms-protec">
        <span className="ms-protec-titre">Toujours actifs <BoutonAide id="protections" ctx={ctx} nom="Protections" /></span>
        <span className={`ms-led-txt ${pr.passeHaut ? "on" : ""}`}>Passe-haut {fHz(pr.passeHaut ? b[0].f : FREQ_PASSE_HAUT)}</span>
        <span className={`ms-led-txt ${pr.limiteur ? "on" : ""}`}>Limiteur, plafond {f1(r.lim.plafond)} dB</span>
        <span className={`ms-led-txt ${pr.limiteur ? "on" : ""}`}>Anti-écrêtage</span>
        {(!pr.passeHaut || !pr.limiteur) && (
          <span className="ms-protec-off">Éteint par un ancien réglage. <button type="button" className="chipbtn" onClick={() => ctx.changer(avecProtections(ctx.reglages))}>Rallumer</button></span>
        )}
      </div>
    </div>
  );
}

function GrosCurseur({ info, val, sous, direct, onChange, ctx }: { info: InfoCurseur; val: number; sous: string; direct?: number; onChange: (v: number) => void; ctx: Ctx }) {
  const { min, max, pas, unite } = info;
  const ecrire = (x: number) => (unite === "%" ? String(Math.round(x)) : `${x > 0 ? "+" : ""}${String(Math.round(x * 10) / 10).replace(".", ",")}`);
  const [txt, setTxt] = useState(ecrire(val));
  useEffect(() => setTxt(ecrire(val)), [val]); // eslint-disable-line react-hooks/exhaustive-deps
  const valider = (s: string) => { const x = Number(s.replace(",", ".").replace(/^\+/, "")); if (Number.isFinite(x)) onChange(Math.min(max, Math.max(min, Math.round(x / pas) * pas))); else setTxt(ecrire(val)); };
  const pc = (x: number) => ((x - min) / (max - min)) * 100;
  const z = pc(Math.max(min, Math.min(max, 0))), p = pc(val);
  const id = `ms-gc-${info.cle}`;
  return (
    <div className={`ms-gc ${Math.abs(val) > 1e-6 ? "actif" : ""}`} style={{ "--cc": info.couleur, "--a": `${Math.min(z, p)}%`, "--b": `${Math.max(z, p)}%` } as CSSProperties}>
      <div className="ms-gc-tete">
        <label htmlFor={id}>{info.nom}</label>
        <BoutonAide id={info.cle} ctx={ctx} nom={info.nom} />
        <span className="ms-gc-val">
          <input type="text" inputMode="decimal" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={(e) => valider(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && valider((e.target as HTMLInputElement).value)} aria-label={`${info.nom} (${unite})`} />
          <small>{unite}</small>
        </span>
      </div>
      <input id={id} type="range" className="ms-gc-range" min={min} max={max} step={pas} value={val} onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(0)} title="Double-clic : remettre à 0" />
      <div className="ms-gc-bornes"><span>{min > 0 ? min : min}</span><span>{min < 0 ? "0" : ""}</span><span>{min < 0 ? `+${max}` : max}</span></div>
      <small className="ms-gc-sous">{sous}{direct !== undefined && direct > 0.05 && <b> · réduction -{f1(direct)} dB</b>}</small>
    </div>
  );
}

// ------------------------------------------------------------------ 3. Exporter
function Export({ ctx }: { ctx: Ctx }) {
  const [format, setFormat] = useState<"wav24" | "wav16" | "mp3">("wav24");
  const [dither, setDither] = useState(true);
  const [progres, setProgres] = useState<number | null>(null);
  const [res, setRes] = useState<{ nom: string; a: Analyse } | null>(null);
  const [err, setErr] = useState("");
  const s = ctx.son;
  if (!s) return <p className="muted small">Le fichier passera par exactement la même chaîne que ce que tu entends en B.</p>;
  const mp3ok = mp3Possible(s.sr);
  const fmt = format === "mp3" && !mp3ok ? "wav24" : format;
  const base = s.nom.replace(/\.[^.]+$/, "").replace(/[^\w\- ]+/g, "").trim() || "morceau";
  const nom = `${base}-master.${fmt === "mp3" ? "mp3" : "wav"}`;
  const exporter = async () => {
    setErr(""); setRes(null); setProgres(0);
    try {
      const mp3 = fmt === "mp3";
      const r = await demander({ type: "exporter", cle: "son", reglages: ctx.reglages, format: mp3 ? "mp3" : "wav", bits: fmt === "wav16" ? 16 : 24, dither: fmt === "wav16" && dither }, (x) => setProgres(x));
      const fichier = mp3 ? await ecrireMp3(r.L!, r.R!, s.sr, 320, (x) => setProgres(0.5 + x * 0.5)) : r.wav!;
      const ok = await telecharger(nom, fichier, mp3 ? "audio/mpeg" : "audio/wav");
      if (ok) { setRes({ nom, a: r.analyse! }); noterExport({ nom, format: c3(fmt), lufs: r.analyse!.lufs, le: new Date().toISOString() }); } else setErr("Export annulé.");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setProgres(null);
  };
  const choix: { id: typeof format; nom: string; texte: string; dispo: boolean }[] = [
    { id: "wav24", nom: "WAV 24 bits", texte: "La meilleure qualité, pour archiver ou retravailler.", dispo: true },
    { id: "wav16", nom: "WAV 16 bits", texte: "Qualité CD, fichier plus léger.", dispo: true },
    { id: "mp3", nom: "MP3 320 kbps", texte: mp3ok ? "Pour partager ou écouter sur le téléphone." : `Impossible à ${f1(s.sr / 1000)} kHz : le MP3 s'arrête à 48 kHz.`, dispo: mp3ok },
  ];
  return (
    <div className="ms-export">
      <div className="ms-formats" role="radiogroup" aria-label="Format du fichier">
        {choix.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={fmt === c.id} disabled={!c.dispo} className={`ms-format ${fmt === c.id ? "on" : ""}`} onClick={() => setFormat(c.id)}>
            <b>{c.nom}</b><span>{c.texte}</span>
          </button>
        ))}
      </div>
      {fmt === "wav16" && <label className="ms-check"><input type="checkbox" checked={dither} onChange={(e) => setDither(e.target.checked)} /> Ajouter un léger dither (bruit très faible qui évite les artefacts d'arrondi en 16 bits)</label>}
      {s.decodeNavigateur && <p className="ms-attention small">Ce son a été décodé par le navigateur : sa fréquence est celle du navigateur ({f1(s.sr / 1000)} kHz), pas forcément celle du fichier d'origine.</p>}
      <div className="ms-export-ligne">
        <button type="button" className="px-btn green ms-export-btn" onClick={() => void exporter()} disabled={progres !== null}>{progres !== null ? `Calcul… ${Math.round(progres * 100)} %` : `Exporter ${nom}`}</button>
        <span className="small muted">{f1(s.sr / 1000, s.sr % 1000 ? 1 : 0)} kHz, comme le fichier d'origine.</span>
      </div>
      {err && <p className="ms-erreur">{err}</p>}
      {res && (
        <div className="ms-ok">
          <p><b>{res.nom}</b> est prêt. Mesures du fichier exporté :</p>
          <p>Volume perçu {f1(res.a.lufs)} LUFS <span className="ms-approx">≈</span> · crête {f1(res.a.crete)} dBFS · crête vraie estimée {f1(res.a.creteVraie)} dBTP <span className="ms-approx">≈</span> · écart crête / volume {f1(res.a.plr)} dB</p>
        </div>
      )}
      <p className="small muted">Le fichier passe par exactement la même chaîne que ce que tu entends en B, sans la compensation de volume, le bypass ni l'écoute en mono. Il est créé sur ton appareil.</p>
    </div>
  );
}

// ------------------------------------------------------------------ barre de lecture (fixe, en bas)
function Barre({ refDiv, ctx, lecture, jouer, boucle, setBoucle, zone, setZone }: {
  refDiv: React.RefObject<HTMLDivElement>; ctx: Ctx; lecture: boolean; jouer: () => void; boucle: boolean; setBoucle: (b: boolean) => void; zone: [number, number] | null; setZone: (z: [number, number] | null) => void;
}) {
  const s = ctx.son;
  const ecoute: Source = ctx.bypass ? "A" : ctx.source;
  const dB = ctx.compensation && !ctx.bypass ? 20 * Math.log10(ctx.gains[ecoute]) : 0;
  const a = ctx.avant, b = ctx.apres ?? (ctx.calcul ? null : ctx.apresAncien);
  const live = lecture ? (ecoute === "A" ? ctx.cpt.momA : ctx.cpt.momB) : NaN;
  return (
    <div ref={refDiv} className={`ms-barre ${s ? "" : "vide"}`} role="region" aria-label="Lecture et comparaison">
      <div className="ms-b-l1">
        <BoutonLecture joue={lecture} onClick={jouer} libelle="Lire" disabled={!s} />
        <ChoixMode mode={boucle ? "loop" : "once"} onChange={(m) => setBoucle(m === "loop")} />
        <div className="ms-b-onde">
          {s ? <FormeOnde ctx={ctx} zone={zone} setZone={setZone} /> : <div className="ms-onde ms-onde-vide">Importe un son (étape 1) pour l'écouter ici.</div>}
          {s && zone && <span className="ms-b-zone">Boucle {fmtTemps(zone[0] / s.sr)} → {fmtTemps(zone[1] / s.sr)} <button type="button" onClick={() => setZone(null)} aria-label="Enlever la zone de boucle">✕</button></span>}
        </div>
        <span className="ms-temps">{s ? `${fmtTemps(ctx.cpt.t)} / ${fmtTemps(s.L.length / s.sr)}` : "0:00.0"}</span>
      </div>
      <div className="ms-b-l2">
        <div className={`ms-ab ${ctx.bypass ? "grise" : ""}`} role="radiogroup" aria-label="Version écoutée">
          <button type="button" role="radio" aria-checked={ctx.source === "A"} className={`ms-ab-btn ${ctx.source === "A" ? "on" : ""}`} onClick={() => ctx.setSource("A")}><b>A</b> Avant</button>
          <button type="button" role="radio" aria-checked={ctx.source === "B"} className={`ms-ab-btn b ${ctx.source === "B" ? "on" : ""}`} onClick={() => ctx.setSource("B")}><b>B</b> Après</button>
          {ctx.ref && <button type="button" role="radio" aria-checked={ctx.source === "R"} className={`ms-ab-btn r ${ctx.source === "R" ? "on" : ""}`} onClick={() => ctx.setSource("R")}><b>R</b> Réf.</button>}
        </div>
        <BoutonAide id="ab" ctx={ctx} nom="A / B au même volume" />
        <label className="ms-check" title="Baisse la version la plus forte pour comparer au même volume perçu">
          <input type="checkbox" checked={ctx.compensation} onChange={(e) => ctx.setCompensation(e.target.checked)} /> Même volume
          {ctx.compensation && !ctx.bypass && s && <small>{Math.abs(dB) < 0.05 ? "(0 dB)" : `(${signe(dB)} dB)`}</small>}
        </label>
        <button type="button" className={`chipbtn ms-bypass ${ctx.bypass ? "on" : ""}`} aria-pressed={ctx.bypass} onClick={() => ctx.setBypass(!ctx.bypass)} title="Le son d'origine, à son vrai volume (sans compensation)">Bypass</button>
        <button type="button" className={`chipbtn ${ctx.mono ? "on" : ""}`} aria-pressed={ctx.mono} onClick={() => ctx.setMono(!ctx.mono)}>Mono</button>
        <div className="ms-bm" aria-label="Mesures avant / après">
          <Mesure nom="Volume perçu" u="LUFS" a={ctx.luA} b={s && a ? ctx.luB : NaN} approx live={live} />
          <Mesure nom="Crête" u="dBTP" a={a?.creteVraie ?? NaN} b={b?.creteVraie ?? NaN} approx attente={!!a && !b} alerte={!!b && b.creteVraie > 0} />
          <Mesure nom="Dynamique" u="dB" a={a?.plr ?? NaN} b={b?.plr ?? NaN} approx attente={!!a && !b} alerte={!!b && b.plr < 8} />
        </div>
      </div>
    </div>
  );
}

function Mesure({ nom, u, a, b, approx, live, attente, alerte }: { nom: string; u: string; a: number; b: number; approx?: boolean; live?: number; attente?: boolean; alerte?: boolean }) {
  return (
    <div className={`ms-bm-cell ${alerte ? "alerte" : ""}`}>
      <span className="ms-bm-nom">{nom}{approx && <span className="ms-approx" title="Mesure approchée"> ≈</span>}</span>
      <span className="ms-bm-vals">
        <span className="av" title="Avant">{f1(a)}</span>
        <i>→</i>
        <span className="ap" title="Après">{attente ? "…" : f1(b)}</span>
        <small>{u}</small>
      </span>
      {live !== undefined && <small className="ms-bm-live">{Number.isFinite(live) && live > -70 ? `en direct ${f1(live)}` : "avant → après"}</small>}
    </div>
  );
}

// ------------------------------------------------------------------ panneau des mini-leçons (« ? »)
function aideDe(id: string): Aide | null {
  if (AIDES[id]) return AIDES[id];
  const b = BLOCS_M.find((x) => x.id === id);
  if (b) return { titre: b.nom, couleur: b.couleur, lecon: b.id, textes: [b.sert, `Quand l'utiliser : ${b.quand}`, `Attention : ${b.attention}`] };
  return null;
}

function PanneauAide({ ctx, id, fermer }: { ctx: Ctx; id: string; fermer: () => void }) {
  const a = aideDe(id);
  const lecon = LECONS.find((l) => l.id === (a?.lecon ?? id));
  if (!a && !lecon) return null;
  const titre = a?.titre ?? lecon!.nom, couleur = a?.couleur ?? lecon!.couleur;
  return (
    <aside className="ms-aide" role="dialog" aria-label={`Mini-leçon : ${titre}`} style={{ "--cc": couleur } as CSSProperties}>
      <header><h3>{titre}</h3><Badge kind="pratique" /><button type="button" className="chipbtn ms-aide-x" onClick={fermer} aria-label="Fermer">✕ Fermer</button></header>
      <div className="ms-aide-corps">
        {a?.textes.map((t) => <p key={t}>{t}</p>)}
        {lecon && <LeconContenu key={lecon.id} ctx={ctx} lecon={lecon} />}
      </div>
    </aside>
  );
}

function LeconContenu({ ctx, lecon }: { ctx: Ctx; lecon: Lecon }) {
  const sauvegarde = useRef<{ r: Reglages; comp: boolean } | null>(null);
  const [etape, setEtape] = useState<"" | "exagere" | "bon">("");
  const essayer = async (q: "exagere" | "bon") => {
    if (!sauvegarde.current) sauvegarde.current = { r: copie(ctx.reglages), comp: ctx.compensation };
    const x = lecon[q];
    await ctx.ecouter(copie(x.reglages), x.compensation);
    setEtape(q);
  };
  const revenir = () => {
    const s = sauvegarde.current; if (!s) return;
    ctx.changer(s.r); ctx.setCompensation(s.comp); sauvegarde.current = null; setEtape("");
  };
  return (
    <div className="ms-lecon">
      <h4>Leçon : {lecon.nom}</h4>
      <p>{lecon.idee}</p>
      <ul className="facts">{lecon.points.map((p) => <li key={p}>{p}</li>)}</ul>
      <h4>Exercice d'écoute</h4>
      {!ctx.son ? <p className="small muted">Importe un son (étape 1) pour faire l'exercice.</p> : (
        <>
          <div className="ms-ex">
            <button type="button" className={`ms-ex-btn exa ${etape === "exagere" ? "on" : ""}`} onClick={() => void essayer("exagere")}>
              <b>1. Réglage exagéré</b><span>{lecon.exagere.label}</span>
            </button>
            <button type="button" className={`ms-ex-btn bon ${etape === "bon" ? "on" : ""}`} onClick={() => void essayer("bon")}>
              <b>2. Bon réglage</b><span>{lecon.bon.label}</span>
            </button>
          </div>
          <button type="button" className="chipbtn" onClick={revenir} disabled={!sauvegarde.current}>Revenir à mes réglages</button>
          {etape && <p className="ms-ecoute"><b>Ce que tu devrais entendre :</b> {lecon[etape].ecoute}</p>}
          <p className="small muted">{lecon.aEcouter} Les autres blocs sont éteints pendant l'exercice. Compare avec A / B dans la barre du bas.</p>
        </>
      )}
      <ObservationBox id={`master:lecon:${lecon.id}`} titre={`Mastering · ${lecon.nom}`} placeholder="Ce que j'entends entre l'exagéré et le bon réglage…" />
      <DoneToggle id={`master:lecon:${lecon.id}`} />
    </div>
  );
}

// ------------------------------------------------------------------ outils repris de la version précédente
/** Relit les compteurs du lecteur ~12 fois par seconde. */
function useTick(l: Lecteur, actif: boolean) {
  const [c, setC] = useState({ ...l.cpt, t: 0 });
  useEffect(() => {
    const id = setInterval(() => setC({ ...l.cpt, t: l.temps }), actif ? 80 : 400);
    return () => clearInterval(id);
  }, [l, actif]);
  return c;
}

/** Boucle d'animation pour les dessins en direct. */
function useAnim(dessiner: () => void, deps: unknown[]) {
  useEffect(() => {
    let id = 0;
    const cadence = { t: 0 };
    const f = (t: number) => { id = requestAnimationFrame(f); if (!imageASauter(t, cadence)) dessiner(); };   // 30 images/s sur téléphone
    id = requestAnimationFrame(f);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function FormeOnde({ ctx, zone, setZone }: { ctx: Ctx; zone: [number, number] | null; setZone: (z: [number, number] | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const s = ctx.son!;
  const pics = useMemo(() => {
    const nb = 1200, n = s.L.length, p = new Float32Array(nb * 2);
    for (let b = 0; b < nb; b++) {
      let mn = 0, mx = 0;
      const a = Math.floor((b * n) / nb), e = Math.floor(((b + 1) * n) / nb);
      for (let i = a; i < e; i += 4) { const v = (s.L[i] + s.R[i]) * 0.5; if (v < mn) mn = v; if (v > mx) mx = v; }
      p[b * 2] = mn; p[b * 2 + 1] = mx;
    }
    return p;
  }, [s]);
  const drag = useRef<{ x0: number; s0: number } | null>(null);
  const [sel, setSel] = useState<[number, number] | null>(null);
  useAnim(() => {
    const c = ref.current; if (!c) return;
    const pc = preparerCourbe(c); if (!pc) return;
    const { g, w, h } = pc;
    g.clearRect(0, 0, w, h);
    const n = s.L.length, z = sel ?? zone;
    if (z) { g.fillStyle = "#ffd84d22"; g.fillRect((z[0] / n) * w, 0, ((z[1] - z[0]) / n) * w, h); g.fillStyle = "#ffd84d"; g.fillRect((z[0] / n) * w, 0, 2, h); g.fillRect((z[1] / n) * w - 2, 0, 2, h); }
    g.fillStyle = "#4e7ec2";
    const nb = pics.length / 2;
    for (let x = 0; x < w; x++) {
      const b = Math.floor((x / w) * nb), mn = pics[b * 2], mx = pics[b * 2 + 1];
      g.fillRect(x, h / 2 - mx * (h / 2), 1, Math.max(1, (mx - mn) * (h / 2)));
    }
    const t = (ctx.cpt.t * s.sr) / n;
    g.fillStyle = "#ff3b3b"; g.fillRect(t * w - 1, 0, 2, h);
  }, [pics, zone, sel, s, ctx.cpt.t]);
  const pos = (e: React.PointerEvent) => { const r = (e.target as HTMLElement).getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * s.L.length; };
  return (
    <canvas ref={ref} className="ms-onde" aria-label="Forme d'onde : clique pour te placer, glisse pour choisir un passage"
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x0: e.clientX, s0: pos(e) }; }}
      onPointerMove={(e) => { const d = drag.current; if (d && Math.abs(e.clientX - d.x0) > 4) { const p = pos(e); setSel([Math.min(d.s0, p), Math.max(d.s0, p)]); } }}
      onPointerUp={(e) => {
        const d = drag.current; drag.current = null;
        if (!d) return;
        if (Math.abs(e.clientX - d.x0) <= 4) { ctx.lecteur.aller(d.s0); setSel(null); return; }
        const p = pos(e), z: [number, number] = [Math.round(Math.min(d.s0, p)), Math.round(Math.max(d.s0, p))];
        setSel(null);
        if (z[1] - z[0] > s.sr * 0.25) { setZone(z); ctx.lecteur.aller(z[0]); }
      }} />
  );
}

// ------------------------------------------------------------------ spectre
function Spectre({ ctx, eq, courbes, hauteur = 220 }: { ctx: Ctx; eq?: boolean; courbes?: { nom: string; couleur: string; v: number[]; pointille?: boolean }[]; hauteur?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const lisseA = useRef<number[]>([]), lisseB = useRef<number[]>([]);
  const cretesB = useRef(new Cretes());
  const sr = ctx.son?.sr ?? 48000;
  const eqCourbe = useMemo(() => (eq ? courbeEq(ctx.reglages, FREQS_SPECTRE, sr) : null), [eq, ctx.reglages, sr]);
  const [prise, setPrise] = useState<number | null>(null);
  const ps = usePrefsSpectre();
  const X = (f: number, w: number) => xDeF(f, ps.echelle) * w;
  const Fx = (x: number, w: number) => fDeX(x / w, ps.echelle);
  const BAS = -100, HAUT = -10, EQ = 15;
  useAnim(() => {
    const c = ref.current; if (!c) return;
    const pr = preparerCourbe(c); if (!pr) return;
    const { g, w } = pr;
    const hc = zoneCourbe(pr.h, { zones: true }).bas;
    const l = ctx.lecteur, p = prefsSpectre();
    if (l.lecture) {
      // lissage dans le temps selon le réglage commun (réactif ↔ lisse)
      const kH = 0.75 - p.lissage * 0.45, kB = 0.5 - p.lissage * 0.42;
      const lisser = (nv: number[], old: number[]) => nv.map((v, i) => (old[i] === undefined ? v : v > old[i] ? v * kH + old[i] * (1 - kH) : v * kB + old[i] * (1 - kB)));
      lisseA.current = lisser(spectreExtrait(l.ringA, l.ringPos, sr), lisseA.current);
      lisseB.current = lisser(spectreExtrait(l.ringB, l.ringPos, sr), lisseB.current);
    }
    const tout: Courbe[] = (courbes ?? []).map((cb) => ({ v: cb.v, f: FREQS_SPECTRE, couleur: cb.couleur, epais: 2, pointille: cb.pointille }));
    if (lisseA.current.length) {
      tout.push({ v: lisseA.current, f: FREQS_SPECTRE, couleur: "#8a91a0", epais: 1.6 });
      tout.push({ v: lisseB.current, f: FREQS_SPECTRE, couleur: "#4fd18b", epais: 2.2, remplir: true });
    }
    const cretes = p.cretes && l.lecture && lisseB.current.length ? { v: cretesB.current.maj(lisseB.current, performance.now()), f: FREQS_SPECTRE, couleur: "#d9ffe9cc" } : null;
    if (!p.cretes) cretesB.current.vider();
    dessinerCourbes(g, w, pr.h, tout, { echelle: p.echelle, haut: HAUT, bas: BAS, fond: "#0d0e12", zones: true, reperes: true, grilleDb: 10, cretes });
    if (eqCourbe) {
      const Ye = (d: number) => hc / 2 - (d / EQ) * (hc / 2 - 12);
      g.strokeStyle = "#ffd84d55"; g.lineWidth = 1; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(0, hc / 2); g.lineTo(w, hc / 2); g.stroke(); g.setLineDash([]);
      g.beginPath(); eqCourbe.forEach((d, i) => { const x = X(FREQS_SPECTRE[i], w), y = Ye(d); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      g.strokeStyle = ctx.reglages.eq.on ? "#ffd84d" : "#ffd84d66"; g.lineWidth = 2.5; g.stroke();
      ctx.reglages.eq.bandes.forEach((b, i) => {
        if (!b.on) return;
        const x = X(b.f, w), y = b.type === "hp" || b.type === "lp" ? hc / 2 : Ye(b.g);
        g.fillStyle = prise === i ? "#ffffff" : "#ffd84d"; g.strokeStyle = "#050608"; g.lineWidth = 2;
        g.fillRect(x - 6, y - 6, 12, 12); g.strokeRect(x - 6, y - 6, 12, 12);
        g.fillStyle = "#050608"; g.font = "bold 10px ui-monospace, monospace"; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillText(String(i + 1), x - 3, y + 4);
      });
      g.fillStyle = "#ffd84d"; g.font = "11px ui-monospace, monospace"; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillText(`EQ ±${EQ} dB`, w - 70, 12);
    }
  }, [eqCourbe, courbes, prise, sr, ps.echelle]);

  // glisser les points de l'EQ
  const surPoint = (e: React.PointerEvent): number | null => {
    if (!eq) return null;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, hc = zoneCourbe(r.height, { zones: true }).bas;
    let best: number | null = null, bd = 18;
    ctx.reglages.eq.bandes.forEach((b, i) => {
      if (!b.on) return;
      const bx = X(b.f, r.width), by = b.type === "hp" || b.type === "lp" ? hc / 2 : hc / 2 - (b.g / EQ) * (hc / 2 - 12);
      const d = Math.hypot(bx - x, by - y); if (d < bd) { bd = d; best = i; }
    });
    return best;
  };
  return (
    <canvas ref={ref} className={`ms-spectre ${eq ? "eq" : ""}`} style={{ height: hauteur }}
      aria-label="Spectre : grave à gauche, aigu à droite"
      onPointerDown={(e) => { const i = surPoint(e); if (i !== null) { setPrise(i); (e.target as HTMLElement).setPointerCapture(e.pointerId); } }}
      onPointerMove={(e) => {
        if (prise === null) return;
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const f = Math.round(Math.min(20000, Math.max(20, Fx(e.clientX - r.left, r.width))));
        const hc = zoneCourbe(r.height, { zones: true }).bas;
        const gdb = Math.round(Math.max(-EQ, Math.min(EQ, ((hc / 2 - (e.clientY - r.top)) / (hc / 2 - 12)) * EQ)) * 10) / 10;
        const nr = copie(ctx.reglages); const b = nr.eq.bandes[prise];
        b.f = f; if (b.type !== "hp" && b.type !== "lp") b.g = gdb;
        nr.eq.on = true;
        ctx.setReglages(nr);
      }}
      onPointerUp={() => setPrise(null)} />
  );
}

function Legende({ items }: { items: { nom: string; couleur: string; pointille?: boolean }[] }) {
  return <p className="ms-legende">{items.map((i) => <span key={i.nom}><i style={{ background: i.pointille ? "none" : i.couleur, borderColor: i.couleur }} className={i.pointille ? "pt" : ""} />{i.nom}</span>)}</p>;
}

function Vectorscope({ ctx }: { ctx: Ctx }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [corr, setCorr] = useState(NaN);
  const n = useRef(0);
  useAnim(() => {
    const c = ref.current; if (!c) return;
    const pc = preparerCourbe(c); if (!pc) return;
    const { g, w, h } = pc;
    g.fillStyle = "#0b0d12"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#ffffff1a"; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    g.fillStyle = "#a3abba"; g.font = "10px ui-monospace, monospace"; g.fillText("G", 4, 12); g.fillText("D", w - 10, 12); g.fillText("Mono", w / 2 + 3, 12);
    const l = ctx.lecteur;
    if (!l.lecture) return;
    g.fillStyle = "#4fd18b88";
    let sLL = 0, sRR = 0, sLR = 0;
    const N = l.ringL.length;
    for (let k = 0; k < 2048; k++) {
      const i = (l.ringPos - 1 - k * 2 + N * 4) % N, a = l.ringL[i], b = l.ringR[i];
      sLL += a * a; sRR += b * b; sLR += a * b;
      const x = w / 2 + ((b - a) / Math.SQRT2) * w * 0.7, y = h / 2 - ((a + b) / Math.SQRT2) * h * 0.7;
      g.fillRect(x, y, 1.5, 1.5);
    }
    if (n.current++ % 6 === 0) setCorr(sLR / Math.sqrt(sLL * sRR + 1e-20));
  }, []);
  return (
    <div className="ms-vecto">
      <canvas ref={ref} aria-label="Image stéréo : un trait vertical = mono, une tache large = très stéréo" />
      <div className="ms-corr" title="Corrélation : +1 = mono, 0 = très large, négatif = problème de phase">
        <span>-1</span><i><b style={{ left: `${Number.isFinite(corr) ? ((corr + 1) / 2) * 100 : 50}%` }} /></i><span>+1</span>
      </div>
      <p className="small muted">Corrélation en direct : {Number.isFinite(corr) && ctx.lecteur.lecture ? f1(corr, 2) : "lance la lecture"}</p>
    </div>
  );
}

function Mesures({ a, b, noms }: { a: Analyse; b?: Analyse | null; noms?: [string, string] }) {
  const lignes: { nom: string; aide: string; v: (x: Analyse) => string; approx?: boolean }[] = [
    { nom: "Volume perçu (intégré)", aide: "Le volume moyen tel que l'oreille le ressent, sur tout le morceau.", v: (x) => `${f1(x.lufs)} LUFS`, approx: true },
    { nom: "Volume perçu max (3 s)", aide: "Le passage de 3 secondes le plus fort.", v: (x) => `${f1(x.lufsCourtMax)} LUFS`, approx: true },
    { nom: "Crête (échantillon)", aide: "Le point le plus haut du fichier. 0 dBFS = le maximum possible.", v: (x) => `${f1(x.crete)} dBFS` },
    { nom: "Crête vraie (estimée)", aide: "La crête entre les échantillons, comme après conversion. Estimée par suréchantillonnage x4.", v: (x) => `${f1(x.creteVraie)} dBTP`, approx: true },
    { nom: "Écart crête / volume", aide: "Plage dynamique des coups : grand = du relief, petit = son écrasé.", v: (x) => `${f1(x.plr)} dB`, approx: true },
    { nom: "Plage de volume (LRA)", aide: "L'écart entre passages calmes et forts (breaks, montées).", v: (x) => `${f1(x.lra)} LU`, approx: true },
    { nom: "Corrélation stéréo", aide: "+1 = mono ; proche de 0 = très large ; négatif = problème de phase.", v: (x) => f1(x.correlation, 2) },
    { nom: "Corrélation du grave", aide: "La même chose sous 150 Hz : on veut proche de +1.", v: (x) => f1(x.correlationGrave, 2) },
    { nom: "Largeur (côté / centre)", aide: "0 % = mono. Au-delà de 100 %, plus de côté que de centre.", v: (x) => `${Math.round(x.largeur * 100)} %` },
    { nom: "Perte en mono", aide: "Combien le volume baisse quand on écoute en mono.", v: (x) => `${f1(x.perteMono)} LU`, approx: true },
  ];
  return (
    <table className="ms-mesures">
      {b !== undefined && <thead><tr><th /><th>{noms?.[0]}</th><th>{noms?.[1]}</th></tr></thead>}
      <tbody>
        {lignes.map((l) => (
          <tr key={l.nom}>
            <th>{l.nom} {l.approx && <span className="ms-approx" title="Mesure approchée">≈</span>}<small>{l.aide}</small></th>
            <td>{l.v(a)}</td>
            {b !== undefined && <td>{b ? l.v(b) : "…"}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Ecarts({ a, r, nom }: { a: Analyse | null; r: Analyse; nom: string }) {
  if (!a) return null;
  const tot = (x: Analyse) => 10 * Math.log10(Object.values(x.bandes).reduce((s, v) => s + Math.pow(10, v / 10), 0));
  const zones: [keyof Analyse["bandes"], string][] = [["sub", "Sub (20–60 Hz)"], ["grave", "Grave (60–250 Hz)"], ["basMed", "Bas-médium (250–500 Hz)"], ["med", "Médium (0,5–2 kHz)"], ["hautMed", "Haut-médium (2–6 kHz)"], ["aigu", "Aigu (6–20 kHz)"]];
  return (
    <div className="ms-ecarts">
      <h4>Ton son ({nom}) comparé à la référence <Badge kind="pratique">Repère</Badge></h4>
      <ul>
        {zones.map(([k, n]) => {
          const d = (a.bandes[k] - tot(a)) - (r.bandes[k] - tot(r));
          const mot = Math.abs(d) < 1.5 ? "proche" : d > 0 ? "plus fort" : "plus faible";
          return <li key={k} className={Math.abs(d) < 1.5 ? "ok" : d > 0 ? "plus" : "moins"}><span>{n}</span><i><b style={{ width: `${Math.min(50, Math.abs(d) * 5)}%`, [d > 0 ? "left" : "right"]: "50%" } as CSSProperties} /></i><span>{signe(d)} dB · {mot}</span></li>;
        })}
        <li className="vol"><span>Volume perçu</span><span>{signe(a.lufs - r.lufs)} LU par rapport à la référence</span></li>
        <li className="vol"><span>Écart crête / volume</span><span>{f1(a.plr)} dB chez toi, {f1(r.plr)} dB dans la référence</span></li>
      </ul>
    </div>
  );
}