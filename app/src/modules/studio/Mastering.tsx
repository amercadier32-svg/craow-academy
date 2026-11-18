// Onglet « Masteriser » du Studio : un chemin en 3 étapes (Le son, Régler, Exporter), 6 gros curseurs (mode Simple),
// et la barre de lecture fixe en bas (A/B au même volume, bypass, mono, mesures), partagée par les 4 onglets du Studio.
// Le son masterisé est le « son en cours » du Studio (lib/studioSon.ts).
// Tout reste sur l'appareil : aucun fichier n'est envoyé nulle part.
import { imageASauter } from "../../lib/audio/moteurAudio";
import { BoutonLecture, ChoixMode } from "../../components/audio/Lecteur";
import { lireJson, ecrireJson } from "../../lib/donnees/stockage";
import { noterExport } from "../../lib/mastering/exportsMaster";
import { decoderNavigateur } from "../../lib/audio/decodage";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Badge, DoneToggle, ObservationBox } from "../../components/ui/common";
import { PixelArt } from "../../components/ui/PixelArt";
import { telecharger } from "../../lib/donnees/telecharger";
import { ouvrirEnregistrementDansStudio, poserSonStudio, useSonStudio } from "../../lib/enregistrement/studioSon";
import { fmtTemps, lireWav, sonDemo, type Analyse, type Son } from "../../lib/mastering/masterAnalyse";
import { completer, copie, type Reglages } from "../../lib/mastering/masterDsp";
import { Lecteur, type Source } from "../../lib/mastering/masterLecteur";
import { demander } from "../../lib/mastering/masterClient";
import { ecrireMp3, mp3Possible } from "../../lib/mastering/masterMp3";
import { avecProtections, CURSEURS, depuisSimples, ecrireSimple, PRESETS, egaux, lireSimples, reglagesSimples, type CleSimple, type InfoCurseur } from "../../lib/mastering/masterSimple";
import { AIDES, BLOCS_M, LECONS, POINTS_DEPART, type Aide, type Lecon } from "../../content/mastering";
import { preparerCanvas as preparerCourbe } from "../../lib/audio/spectreCourbe";
import "./mastering.css";

const CLE_REGLAGES = "e2academy.mastering.reglages";
const CLE_PREFS = "e2academy.mastering.prefs2"; // v2 : « Même volume » éteint par défaut (il annulait l'effet des réglages)

const lireLS = lireJson;
const ecrireLS = (cle: string, v: unknown): void => { ecrireJson(cle, v); };
const c3 = (f: string) => (f === "mp3" ? "MP3 320" : f === "wav16" ? "WAV 16 bits" : "WAV 24 bits");


const f1 = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d).replace(".", ",") : "–");
const signe = (x: number, d = 1) => (Number.isFinite(x) ? `${x > 0 ? "+" : ""}${f1(x, d)}` : "–");

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
  const prefs0 = useMemo<Prefs>(() => ({ boucle: true, compensation: false, analyse: false, preset: null, ...lireLS<Partial<Prefs>>(CLE_PREFS, {}) }), []);
  const init = useMemo(() => initialRoute(focus), [focus]);

  const [son, setSon] = useState<Son | null>(null);
  const [erreur, setErreur] = useState("");
  const [avant, setAvant] = useState<Analyse | null>(null);
  const [apres, setApres] = useState<{ a: Analyse; version: number } | null>(null);
  const [calcul, setCalcul] = useState(false);
  const [reglages, setReglagesBrut] = useState<Reglages>(() => {
    if (init.depart) return init.depart.r;
    return avecProtections(completer(lireLS<Partial<Reglages> | undefined>(CLE_REGLAGES, undefined)));
  });
  const [preset, setPresetBrut] = useState<string | null>(init.depart ? init.depart.preset : prefs0.preset);
  const [lecture, setLecture] = useState(false);
  const [boucle, setBoucle] = useState<boolean>(prefs0.boucle);
  const [zone, setZone] = useState<[number, number] | null>(null);
  const [source, setSource] = useState<Source>("B");
  const [compensation, setCompensation] = useState<boolean>(prefs0.compensation);
  const [mono, setMono] = useState(false);
  const [bypass, setBypass] = useState(false);
  const [aide, setAide] = useState<string | null>(init.aide ?? null);

  useEffect(() => ecrireLS(CLE_PREFS, { boucle, compensation, analyse: false, preset }), [boucle, compensation, preset]);
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

  const ouvrirFichier = useCallback(async (f: File) => {
    setErreur("");
    try {
      const buf = await f.arrayBuffer();
      let s: Son;
      try { s = lireWav(buf, f.name); }
      catch (e) {
        if (/\.wave?$/i.test(f.name)) throw e;
        s = await decoderNavigateur(buf, f.name); // MP3, FLAC, M4A, AAC : décodés par le navigateur
      }
      poserSonStudio(s, "fichier");   // devient le son en cours du Studio (chargé ci-dessous)
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
  const compenser = compensation && !bypass;
  const gains = useMemo(() => {
    if (!compenser) return { A: 1, B: 1, R: 1 };
    const vals = [luA, luB].filter(Number.isFinite);
    const cible = Math.min(...vals);
    const g = (x: number) => (Number.isFinite(x) ? Math.pow(10, (cible - x) / 20) : 1);
    return { A: g(luA), B: g(luB), R: 1 };
  }, [compenser, luA, luB]);
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

  /** Play Preview : écoute la version masterisée (B) avec les réglages en cours, ou arrête. */
  const apercu = useCallback(async () => {
    if (lecteur.lecture) { lecteur.arreter(); setLecture(false); return; }
    setSource("B"); setBypass(false);
    await lancer();
  }, [lecteur, lancer]);

  const ctx: Ctx = {
    son, avant, apres: apresAJour, apresAncien: apres?.a ?? null, calcul, reglages,
    setReglages: (r: Reglages) => changer(r, null, true), changer, lecteur, cpt, luA, luB, gains, compensation, setCompensation,
    source, setSource, bypass, setBypass, ecouter, ouvrirFichier, mono, setMono, setAide,
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
      <Barre mini={!visible} refDiv={barre} ctx={ctx} lecture={lecture} jouer={jouer} boucle={boucle} setBoucle={setBoucle} zone={zone} setZone={setZone} />
      {aide && <PanneauAide ctx={ctx} id={aide} fermer={() => setAide(null)} />}
    </>
  );
  if (!visible) return barreEtAide;

  return (
    <div className="ms ms2">
      <Etape n={1} id="ms-etape-1" titre="Le son" sous={son ? son.nom : "WAV, MP3, FLAC, M4A ou AAC"}>
        <Import ctx={ctx} />
        {erreur && <p className="ms-erreur" role="alert">{erreur}</p>}
      </Etape>

      <Etape n={2} id="ms-etape-2" titre="Régler" off={off} sous={off ? "Importe un son à l'étape 1 pour régler." : undefined}
        droite={!off && (
          <span className="ms-et-outils">
            <button type="button" className="chipbtn" onClick={annuler} disabled={!peutAnnuler} title="Annuler (Ctrl+Z)">↶ Annuler</button>
            <button type="button" className="chipbtn" onClick={retablir} disabled={!peutRetablir} title="Rétablir (Ctrl+Y)">↷ Rétablir</button>
          </span>
        )}>
        <ModeSimple ctx={ctx} lecture={lecture} apercu={apercu} />
        <div className="ms-et-pied">
          <button type="button" className="chipbtn" onClick={() => changer(reglagesSimples(), null)} title="Tout remettre à zéro" aria-label="Tout remettre à zéro">↺</button>
                  </div>
      </Etape>

      <details className="ms-export-plie" id="ms-etape-3">
        <summary>⚙ Format d'export</summary>
        <Export ctx={ctx} />
      </details>

      {barreEtAide}
    </div>
  );
}

// ------------------------------------------------------------------ contexte partagé
interface Ctx {
  son: Son | null; avant: Analyse | null; apres: Analyse | null; apresAncien: Analyse | null; calcul: boolean;
  reglages: Reglages; setReglages: (r: Reglages) => void; changer: (r: Reglages, p?: string | null, fusion?: boolean) => void;
  lecteur: Lecteur; cpt: Lecteur["cpt"] & { t: number };
  luA: number; luB: number; gains: { A: number; B: number; R: number };
  compensation: boolean; setCompensation: (b: boolean) => void;
  source: Source; setSource: (s: Source) => void;
  bypass: boolean; setBypass: (b: boolean) => void;
  ecouter: (r: Reglages, comp?: boolean) => Promise<void>;
  ouvrirFichier: (f: File) => Promise<void>;
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
  const input = useRef<HTMLInputElement>(null);
  const s = ctx.son;
  const specs = s ? `${fmtTemps(s.L.length / s.sr)} · ${f1(s.sr / 1000, s.sr % 1000 ? 1 : 0)} kHz · ${s.bits ? `${s.bits} bits` : s.decodeNavigateur ? "décodé" : "générée"} · ${s.canaux === 1 ? "mono" : "stéréo"}${ctx.lecteur.frequenceCarte > 0 && ctx.lecteur.frequenceCarte !== s.sr ? ` · écoute convertie à ${f1(ctx.lecteur.frequenceCarte / 1000)} kHz` : ""}` : "";
  const aide = "Pour masteriser ton E2 : enregistre-le dans l'onglet Enregistrer, la prise arrive ici toute seule. Le son chargé est le même dans les 4 onglets du Studio. Tout se passe dans ton navigateur.";
  return (
    <Depot className={`ms-depot ms-depot-grand ${s ? "charge" : ""}`} onFichier={(f) => void ctx.ouvrirFichier(f)}>
      {!s && <PixelArt name="mastering" size={64} />}
      <div className="ms-depot-txt">
        <b>{s ? <><span title={s.nom}>{s.nom}</span> chargé ✓ <span className="ms-info" title={specs} aria-label={specs}>ⓘ</span></> : <>Glisse ton fichier ici <span className="ms-info" title={aide} aria-label="Info">ⓘ</span></>}</b>
        {!s && <span>WAV, MP3, FLAC, M4A ou AAC</span>}
      </div>
      <div className="ms-depot-btns">
        <button type="button" className={s ? "chipbtn" : "px-btn green"} onClick={() => input.current?.click()}>{s ? "Changer" : "Choisir un fichier"}</button>
        <button type="button" className={s ? "chipbtn" : "px-btn"} onClick={() => poserSonStudio(sonDemo(), "demo")} title="Une boucle de 8 mesures générée par l'app, pour essayer sans fichier">Démo</button>
      </div>
      <input ref={input} type="file" accept={FORMATS} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void ctx.ouvrirFichier(f); e.target.value = ""; }} />
    </Depot>
  );
}

// ------------------------------------------------------------------ 2. Régler : mode Simple
function ModeSimple({ ctx, apercu, lecture }: { ctx: Ctx; apercu: () => void; lecture: boolean }) {
  const r = ctx.reglages;
  const v = lireSimples(r);
  const direct: Partial<Record<CleSimple, number>> = lecture ? { comp: r.comp.on ? ctx.cpt.grComp : 0, volume: r.lim.on ? ctx.cpt.grLim : 0 } : {};
  const bloc = (g: "eq" | "dyn", titre: string) => (
    <section className={`ms-bloc ms-bloc-${g}`}>
      <h4>{titre}</h4>
      {CURSEURS.filter((c) => c.groupe === g).map((c) => (
        <GrosCurseur key={c.cle} info={c} val={v[c.cle]} direct={direct[c.cle]} ctx={ctx}
          onChange={(x) => ctx.setReglages(ecrireSimple(ctx.reglages, c.cle, x))} />
      ))}
    </section>
  );
  return (
    <div className="ms-simple">
      <div className="ms-cartes" role="group" aria-label="Presets">
        {PRESETS.map((p) => {
          const cible = lireSimples(depuisSimples(p.valeurs));
          const on = CURSEURS.every((c) => Math.abs(cible[c.cle] - v[c.cle]) < 0.01);
          return (
            <button key={p.id} type="button" className={`ms-carte ${on ? "on" : ""}`} aria-pressed={on}
              onClick={() => ctx.changer(depuisSimples(p.valeurs), null)}>
              <span className="ms-carte-ico" aria-hidden>{p.icone}</span><span>{p.nom}</span>
            </button>
          );
        })}
      </div>
      <div className="ms-blocs">{bloc("eq", "EQ")}{bloc("dyn", "Dynamics")}</div>
      <div className="ms-gros">
        <button type="button" className="ms-gros-btn bleu" disabled={!ctx.son} onClick={apercu}>{lecture ? "■ Stop" : "▶ Play Preview"}</button>
        <button type="button" className="ms-gros-btn vert" disabled={!ctx.son} onClick={() => { (document.getElementById("ms-etape-3") as HTMLDetailsElement | null)?.setAttribute("open", ""); window.dispatchEvent(new Event("ms-exporter")); }}>⬇ Master Track</button>
      </div>
    </div>
  );
}

function GrosCurseur({ info, val, direct, onChange, ctx }: { info: InfoCurseur; val: number; direct?: number; onChange: (v: number) => void; ctx: Ctx }) {
  const { min, max, pas, unite } = info;
  const ecrire = (x: number) => (unite === "%" ? String(Math.round(x)) : `${x > 0 ? "+" : ""}${String(Math.round(x * 10) / 10).replace(".", ",")}`);
  const [txt, setTxt] = useState(ecrire(val));
  useEffect(() => setTxt(ecrire(val)), [val]); // eslint-disable-line react-hooks/exhaustive-deps
  const valider = (s: string) => { const x = Number(s.replace(",", ".").replace(/^\+/, "")); if (Number.isFinite(x)) onChange(Math.min(max, Math.max(min, Math.round(x / pas) * pas))); else setTxt(ecrire(val)); };
  const pc = (x: number) => ((x - min) / (max - min)) * 100;
  const z = pc(info.neutre ?? Math.max(min, Math.min(max, 0))), p = pc(val);
  const id = `ms-gc-${info.cle}`;
  return (
    <div className={`ms-gc ${val !== (info.neutre ?? 0) ? "actif" : ""}`} style={{ "--cc": info.couleur, "--a": `${Math.min(z, p)}%`, "--b": `${Math.max(z, p)}%` } as CSSProperties}>
      <div className="ms-gc-tete">
        <label htmlFor={id}>{info.nom}</label>
        <span className="ms-gc-val">
          <input type="text" inputMode="decimal" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={(e) => valider(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && valider((e.target as HTMLInputElement).value)} aria-label={`${info.nom} (${unite})`} />
          <small>{unite}</small>
        </span>
      </div>
      <input id={id} type="range" className="ms-gc-range" min={min} max={max} step={pas} value={val} onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(info.neutre ?? 0)} title="Double-clic : remettre à 0" />
            {direct !== undefined && direct > 0.05 && <small className="ms-gc-sous"><b>-{f1(direct)} dB</b></small>}
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
  const lancerExport = useRef<() => void>();
  useEffect(() => { const f = () => lancerExport.current?.(); window.addEventListener("ms-exporter", f); return () => window.removeEventListener("ms-exporter", f); }, []);
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
  lancerExport.current = () => { if (progres === null) void exporter(); };
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
function Barre({ mini = false, refDiv, ctx, lecture, jouer, boucle, setBoucle, zone, setZone }: {
  mini?: boolean; refDiv: React.RefObject<HTMLDivElement>; ctx: Ctx; lecture: boolean; jouer: () => void; boucle: boolean; setBoucle: (b: boolean) => void; zone: [number, number] | null; setZone: (z: [number, number] | null) => void;
}) {
  const s = ctx.son;
  const ecoute: Source = ctx.bypass ? "A" : ctx.source;
  const dB = ctx.compensation && !ctx.bypass ? 20 * Math.log10(ctx.gains[ecoute]) : 0;
  const a = ctx.avant, b = ctx.apres ?? (ctx.calcul ? null : ctx.apresAncien);
  const live = lecture ? (ecoute === "A" ? ctx.cpt.momA : ctx.cpt.momB) : NaN;
  return (
    <div ref={refDiv} className={`ms-barre ${s ? "" : "vide"} ${mini ? "mini" : ""}`} role="region" aria-label="Lecture et comparaison">
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
