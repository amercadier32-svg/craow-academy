// Onglet « Analyser » du Studio : comprendre un morceau que tu aimes et partir d'une recette E2 pour t'en approcher.
// #studio/analyser        analyse le son en cours du Studio (ou un fichier chargé ici), zones, recettes de départ, comparer
// #studio/analyser/<id>   rouvre une analyse gardée (l'audio n'est pas gardé : il faut recharger le fichier)
// Tout est calculé dans le navigateur ; le fichier n'est envoyé nulle part. Les mesures sont des estimations.
import { BoutonLecture, ChoixMode } from "../components/Lecteur";
import { contexte as contexteMoteur, declarerLecteur, liberer, prendreLaMain, sortieDirecte } from "../lib/moteurAudio";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Badge } from "../components/common";
import { BarrePixel, Deroulant, ToutOuvrirFermer } from "../components/Deroulant";
import { Etoile } from "../components/Etoile";
import { BoutonSupprimer } from "../components/Confirmer";
import { FiltreMenu, fmVide, type FmGroupe, type FmValeur } from "../components/FiltreMenu";
import { PixelArt } from "../components/PixelArt";
import { useKnobRange } from "../components/SeqPlayer";
import { ELEMENTS, type Recette } from "../content/recettes";
import { STYLE_NOM, useStyles, type Style } from "../content/styles";
import { etatRecette, jouerSeq, toutArreter } from "../lib/apercus";
import { paramById } from "../lib/data";
import { ouvrirAudio } from "../lib/decodage";
import { EnregistrerVersion } from "../components/Enregistreur";
import { FREQS_SPECTRE, lufsIntegre, spectreMoyen, type Son } from "../lib/masterAnalyse";
import { setSpectreRefCourant } from "../lib/visuAudio";
import { ouvrirDansStudio, sonStudio, useSonStudio } from "../lib/studioSon";
import { SpectreCourbes } from "../components/SpectreCourbe";
import { gammeByN, nomMidi } from "../lib/music";
import { analyserSon, comparer, monoDe, pics, statsZone, tempo, tonalite, trouverKick, type AnaSon, type StatsZone, type Tempo, type Tonalite, type Zone } from "../lib/refAnalyse";
import { recettesDepuisSon } from "../lib/refRecettes";
import { engine, type Mode } from "../lib/seq";
import { estFavori, garderAnalyse, garderRecette, idFavori, listeAnalyses, supprimerAnalyse, useStore, type AnalyseRef, type ZoneRef } from "../lib/store";
import "./reference.css";

const FORMATS = ".wav,.mp3,.flac,.m4a,.aac,audio/*";
const VIOLET = "#9b6bff";

// ============================================================ Lecture de l'audio (zone, une fois ou en boucle)
let enCours: { src: AudioBufferSourceNode; owner: string } | null = null;
const tampons = new WeakMap<Son, AudioBuffer>();
const ecouteurs = new Set<() => void>();
const prevenir = () => ecouteurs.forEach((f) => f());
const contexte = () => contexteMoteur();   // le moteur audio partagé
declarerLecteur("reference", () => arreterRef());
function tampon(s: Son) {
  let b = tampons.get(s);
  if (!b) { const c = contexte(); b = c.createBuffer(2, s.L.length, s.sr); b.copyToChannel(s.L as Float32Array<ArrayBuffer>, 0); b.copyToChannel(s.R as Float32Array<ArrayBuffer>, 1); tampons.set(s, b); }
  return b;
}
export function arreterRef() { if (enCours) { try { enCours.src.stop(); } catch { /* déjà fini */ } enCours = null; liberer("reference"); prevenir(); } }
/** Joue une zone d'un son. `gainDb` sert à comparer au même volume. */
function jouerZone(owner: string, s: Son, z: Zone, mode: Mode, gainDb = 0) {
  if (enCours?.owner === owner) { arreterRef(); return; }
  arreterRef(); toutArreter();
  prendreLaMain("reference");
  const c = contexte();
  const src = c.createBufferSource(); src.buffer = tampon(s);
  const g = c.createGain(); g.gain.value = Math.pow(10, gainDb / 20);
  src.connect(g).connect(sortieDirecte());
  const d = Math.max(0.02, z.fin - z.debut);
  if (mode === "loop") { src.loop = true; src.loopStart = z.debut; src.loopEnd = z.fin; src.start(0, z.debut); }
  else src.start(0, z.debut, d);
  src.onended = () => { if (enCours?.src === src) { enCours = null; liberer("reference"); prevenir(); } };
  enCours = { src, owner }; prevenir();
}
/** Une sinusoïde à la note de base, 1,5 s. */
function jouerNote(f: number) {
  arreterRef(); toutArreter();
  const c = contexte(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
  o.type = "sine"; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.02); g.gain.setValueAtTime(0.35, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 1.5);
  o.connect(g).connect(sortieDirecte()); o.start(t); o.stop(t + 1.55);
}
/** Ce qui joue en ce moment (zone de référence ou aperçu d'une recette) ; ne redessine que quand ça change. */
function useLecture() {
  const [, set] = useState("");
  useEffect(() => {
    const f = () => set(`${enCours?.owner ?? ""}|${engine.snap.owner ?? ""}`);
    ecouteurs.add(f); const u = engine.subscribe(f);
    return () => { ecouteurs.delete(f); u(); };
  }, []);
  return enCours?.owner ?? null;
}

// ============================================================ État de la page (gardé tant que l'onglet est ouvert)
interface Global { tempo: Tempo; tona: Tonalite; lufs: number | null; spectre: number[] }
interface Proposee { rc: Recette; statut: "proposee" | "gardee" }
interface Page {
  id: string | null;            // id de l'analyse gardée
  nom: string; notes: string; fichier: string; duree: number;
  son: Son | null; mono: Float32Array | null; global: Global | null;
  enregistre?: Pick<AnalyseRef, "bpm" | "bpmConfiance" | "key" | "mineur" | "keyConfiance" | "gammes" | "lufs" | "sons" | "spectre">;
  zone: Zone | null; zones: ZoneRef[]; zoneActive: string | null;
  propositions: Proposee[]; style: Style | "";
  moi: Son | null; moiMono: Float32Array | null; zoneMoi: Zone | null;
  vu?: number;                  // version du son en cours du Studio déjà analysée
}
const VIDE: Page = { id: null, nom: "", notes: "", fichier: "", duree: 0, son: null, mono: null, global: null, zone: null, zones: [], zoneActive: null, propositions: [], style: "", moi: null, moiMono: null, zoneMoi: null };
let memoire: Page = VIDE;

const fmt = (x: number, d = 1) => x.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d });
const sec = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0").replace(".", ",")}`;
const noteE2 = (m: number | null) => (m === null ? "?" : `${nomMidi(m).en} (${nomMidi(m).fr})`);
const nomFichier = (f: string) => f.replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " ").trim();
const pct = (x: number) => `${Math.round(x)} %`;

export default function Reference({ focus }: { focus?: string }) {
  const st = useStore();
  const [p, setP] = useState<Page>(() => {
    if (focus && focus !== memoire.id) {
      const a = st.analysesRef?.[focus];
      if (a && !a.supprimee) return { ...VIDE, vu: sonStudio()?.version, id: a.id, nom: a.nom, notes: a.notes, fichier: a.fichier, duree: a.duree, zones: a.zones, enregistre: a, propositions: a.recettes.map((rc) => ({ rc, statut: st.recettesGenerees[rc.id]?.recette ? "gardee" : "proposee" })) };
    }
    return memoire;
  });
  useEffect(() => { memoire = p; }, [p]);
  // le spectre du morceau chargé sert au « Comparer avec la référence » du Visualiseur
  useEffect(() => { if (p.global?.spectre) setSpectreRefCourant({ id: p.id ?? "courant", nom: `${p.nom || nomFichier(p.fichier)} (chargé)`, bandes: p.global.spectre }); }, [p.global, p.id, p.nom, p.fichier]);
  const maj = (x: Partial<Page>) => setP((o) => ({ ...o, ...x }));
  const [calcul, setCalcul] = useState("");
  const [erreur, setErreur] = useState("");
  const [msg, setMsg] = useState("");

  // Un fichier chargé ici devient le son en cours du Studio (il sera aussi dans Masteriser) ; l'analyse suit ci-dessous.
  const charger = async (f: File) => {
    setErreur(""); setCalcul("Lecture du fichier…"); arreterRef();
    try { await ouvrirDansStudio(f); } catch (e) { setErreur(e instanceof Error ? e.message : String(e)); setCalcul(""); }
  };
  const studio = useSonStudio();
  useEffect(() => {
    if (studio && studio.version !== p.vu) { maj({ vu: studio.version }); void analyser(studio.son); }
  }, [studio]); // eslint-disable-line react-hooks/exhaustive-deps
  const analyser = async (son: Son) => {
    const f = { name: son.nom };
    setErreur(""); arreterRef();
    try {
      setCalcul("Analyse du tempo, de la tonalité et du volume…");
      await new Promise((r) => setTimeout(r, 30));
      const mono = monoDe(son.L, son.R);
      const global: Global = { tempo: tempo(mono, son.sr), tona: tonalite(mono, son.sr), lufs: lufsIntegre(son.L, son.R, son.sr), spectre: spectreMoyen(son.L, son.R, son.sr).map((x) => Math.round(x * 10) / 10) };
      const memeFichier = p.fichier === f.name && p.id;
      const t0 = trouverKick(mono, son.sr, global.tempo.bpm);
      const beat = Number.isFinite(global.tempo.bpm) ? 60 / global.tempo.bpm : 0.5;
      const zone = memeFichier && p.zones[0] ? { debut: p.zones[0].debut, fin: p.zones[0].fin } : t0 !== null ? { debut: Math.max(0, t0 - 0.005), fin: Math.min(son.L.length / son.sr, t0 + Math.min(beat, 0.7)) } : { debut: 0, fin: Math.min(1, son.L.length / son.sr) };
      setP((o) => ({
        ...(memeFichier ? o : { ...VIDE, vu: o.vu, moi: o.moi, moiMono: o.moiMono, zoneMoi: o.zoneMoi, style: o.style }),
        son, mono, global, fichier: f.name, duree: son.L.length / son.sr, nom: memeFichier ? o.nom : nomFichier(f.name), zone, zoneActive: memeFichier ? o.zones[0]?.id ?? null : null,
      }));
    } catch (e) { setErreur(e instanceof Error ? e.message : String(e)); }
    setCalcul("");
  };

  // ---- la zone choisie
  const stats: StatsZone | null = useMemo(() => (p.son && p.zone ? statsZone(p.son.L, p.son.R, p.son.sr, p.zone) : null), [p.son, p.zone]);
  const ana: AnaSon | null = useMemo(() => (p.mono && p.son && p.zone ? analyserSon(p.mono, p.son.sr, p.zone) : null), [p.mono, p.son, p.zone]);
  const bpm = p.global && Number.isFinite(p.global.tempo.bpm) ? p.global.tempo.bpm : p.enregistre?.bpm;

  const garder = () => {
    const id = p.id ?? `ana-${Date.now().toString(36)}`;
    // la zone en cours est gardée aussi si elle n'a pas encore de nom
    let zones = p.zones, zoneActive = p.zoneActive;
    if (p.zone && !zoneActive) {
      const z: ZoneRef = { id: `z-${Date.now().toString(36)}`, nom: ana ? `${TYPE_NOM[ana.type]} ${p.zones.length + 1}` : `Zone ${p.zones.length + 1}`, debut: Math.round(p.zone.debut * 1000) / 1000, fin: Math.round(p.zone.fin * 1000) / 1000 };
      zones = [...zones, z]; zoneActive = z.id;
    }
    const sons = { ...(p.enregistre?.sons ?? {}) };
    if (ana && zoneActive) sons[zoneActive] = { type: ana.type, midiBase: ana.midiBase, decayMs: Math.round(ana.decayMs), attaque: ana.attaque, motDistorsion: ana.motDistorsion, sub: Math.round(ana.parts.sub) };
    const g = p.global;
    const a: AnalyseRef = {
      id, nom: p.nom.trim() || nomFichier(p.fichier) || "Sans titre", fichier: p.fichier, duree: Math.round(p.duree * 10) / 10, notes: p.notes.trim(),
      bpm: g && Number.isFinite(g.tempo.bpm) ? g.tempo.bpm : p.enregistre?.bpm, bpmConfiance: g ? Math.round(g.tempo.confiance * 100) / 100 : p.enregistre?.bpmConfiance,
      key: g?.tona.key ?? p.enregistre?.key, mineur: g?.tona.mineur ?? p.enregistre?.mineur, keyConfiance: g ? Math.round(g.tona.confiance * 100) / 100 : p.enregistre?.keyConfiance,
      gammes: g?.tona.gammes.map((x) => x.n) ?? p.enregistre?.gammes, lufs: g ? (g.lufs === null ? null : Math.round(g.lufs * 10) / 10) : p.enregistre?.lufs,
      zones, sons, spectre: g?.spectre ?? p.enregistre?.spectre, recettes: p.propositions.map((x) => x.rc), le: st.analysesRef?.[id]?.le ?? new Date().toISOString(), majLe: "",
    };
    garderAnalyse(a);
    maj({ id, enregistre: a, zones, zoneActive });
    setMsg(`Analyse « ${a.nom} » enregistrée dans « Mes analyses ». L'audio du morceau n'est pas gardé.`);
  };
  const nouvelle = () => { arreterRef(); setP({ ...VIDE, style: p.style, vu: sonStudio()?.version }); history.replaceState(history.state, "", "#studio/analyser"); setMsg(""); };

  const ids = ["ref.charger", "ref.morceau", "ref.son", "ref.recettes", "ref.comparer", "ref.garder", "ref.mes"];
  const aDonnees = Boolean(p.son || p.enregistre);
  return (
    <div className="ref-page">
      <p className="ref-intro">Analyse le son en cours du Studio, ou charge un morceau que tu aimes : l'app estime son tempo, sa tonalité et le son d'un passage (un kick, une basse…), puis propose des recettes E2 pour t'en approcher. <b>Tout reste dans ton navigateur</b> : le fichier n'est envoyé nulle part. <Badge kind="interp">Estimations</Badge></p>

      <ToutOuvrirFermer ids={ids} />
      <Deroulant id="ref.charger" defaut icone="reference" couleur={VIOLET} titre="1. Le morceau à analyser" texte="Le son en cours du Studio, ou un fichier WAV, MP3, FLAC. Rien n'est envoyé sur internet." badge={p.son ? "chargé" : p.enregistre ? "à recharger" : "WAV · MP3 · FLAC"}>
        <Chargeur p={p} maj={maj} charger={(f) => void charger(f)} calcul={calcul} erreur={erreur} nouvelle={nouvelle} />
      </Deroulant>

      {aDonnees && (
        <>
          <BarrePixel couleurs={[VIOLET, "#6aa2ee", "#3fd6d0"]} />
          <Deroulant id="ref.morceau" defaut icone="gammes" couleur="#6aa2ee" titre="2. Le morceau et la zone" texte="BPM, tonalité, forme d'onde, spectre et volume perçu." badge={bpm ? `${fmt(bpm)} BPM` : "?"}>
            <Morceau p={p} maj={maj} stats={stats} bpm={bpm} />
          </Deroulant>
          <Deroulant id="ref.son" defaut icone="rythmique" couleur="#ff6a3d" titre="3. Le son de la zone" texte="Note de base, chute de hauteur, longueur, attaque, grave/médium/aigu, distorsion." badge={ana ? (ana.midiBase !== null ? nomMidi(ana.midiBase).en : TYPE_NOM[ana.type]) : "—"}>
            {ana && p.son ? <AnalyseSon a={ana} /> : <p className="drl-vide">{p.son ? "Choisis une zone avec un son (glisse sur la forme d'onde, ou « 🔍 Trouver un kick »)." : "Recharge le fichier pour analyser une zone."}</p>}
          </Deroulant>
          <Deroulant id="ref.recettes" defaut icone="recettes" couleur="#ffd84d" titre="4. Recettes de départ pour l'E2" texte="2 ou 3 points de départ d'après le son de la zone. Écoute, garde ou jette." badge={p.propositions.length || "—"}>
            <Recettes p={p} maj={maj} ana={ana} bpm={bpm} />
          </Deroulant>
          <Deroulant id="ref.comparer" icone="mastering" couleur="#4fd18b" titre="5. Comparer avec mon son E2" texte="Charge ton enregistrement : spectres, longueur, note, volume et écoute A/B au même volume." badge={p.moi ? "chargé" : "WAV"}>
            <Comparer p={p} maj={maj} ana={ana} />
          </Deroulant>
          <BarrePixel couleurs={["#4fd18b", "#ffd84d", VIOLET]} />
          <Deroulant id="ref.garder" icone="carnet" couleur="#ffd84d" titre="Enregistrer l'analyse" texte="Nom du morceau, notes, zones et recettes. L'audio n'est pas copié." badge={p.id ? "gardée" : "—"}>
            <div className="ref-garder">
              <label className="ss-champ">Nom du morceau<input value={p.nom} onChange={(e) => maj({ nom: e.target.value })} placeholder="Ex. Mon morceau préféré" /></label>
              <label className="ss-champ large">Mes notes<textarea rows={3} value={p.notes} onChange={(e) => maj({ notes: e.target.value })} placeholder="Ce qui me plaît, ce que je veux reprendre…" /></label>
              <p className="small muted">Gardé : {p.zones.length} zone(s), {p.propositions.length} recette(s) proposée(s){bpm ? `, ${fmt(bpm)} BPM` : ""}. Le fichier audio reste sur ton appareil : il n'est ni gardé ni copié dans « Exporter mes relevés ».</p>
              <div className="ref-btns">
                <button type="button" className="px-btn green" onClick={garder}>💾 {p.id ? "Mettre à jour l'analyse" : "Enregistrer l'analyse"}</button>
                {p.id && <Etoile type="reference" cle={p.id} titre={p.nom || p.fichier} />}
              </div>
              {msg && <p className="ref-ok">{msg}</p>}
            </div>
          </Deroulant>
        </>
      )}
      <Deroulant id="ref.mes" icone="favoris" couleur={VIOLET} titre="Mes analyses" texte="Les analyses gardées : rouvre-les et recharge le fichier pour réécouter." badge={listeAnalyses(st).length}>
        <MesAnalyses actuelle={p.id} />
      </Deroulant>
    </div>
  );
}

// ============================================================ 1. Charger
function Chargeur({ p, maj, charger, calcul, erreur, nouvelle }: { p: Page; maj: (x: Partial<Page>) => void; charger: (f: File) => void; calcul: string; erreur: string; nouvelle: () => void }) {
  const [survol, setSurvol] = useState(false);
  return (
    <div className="ref-charger">
      {p.enregistre && !p.son && (
        <p className="ref-recharge">📂 Analyse gardée de <b>{p.nom}</b>. Pour réécouter et réanalyser, recharge le fichier <kbd>{p.fichier}</kbd> : tes zones seront reprises.</p>
      )}
      <label className={`ref-depot ${survol ? "survol" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }} onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); const f = e.dataTransfer.files[0]; if (f) charger(f); }}>
        <input type="file" accept={FORMATS} onChange={(e) => { const f = e.target.files?.[0]; if (f) charger(f); e.target.value = ""; }} />
        <PixelArt name="reference" size={40} />
        <span><b>{p.son ? "Charger un autre morceau" : "Choisir un fichier"}</b> ou le glisser ici</span>
        <small className="muted">WAV, MP3, FLAC (M4A et AAC selon ton navigateur)</small>
      </label>
      {calcul && <p className="ref-calcul">⏳ {calcul}</p>}
      {erreur && <p className="ss-err">{erreur}</p>}
      {p.son && (
        <div className="ref-fichier">
          <span>🎵 <b>{p.fichier}</b> · {sec(p.duree)} · {p.son.sr} Hz{p.son.decodeNavigateur ? " (décodé par le navigateur)" : ""}</span>
          <label className="ss-champ">Nom du morceau<input value={p.nom} onChange={(e) => maj({ nom: e.target.value })} /></label>
        </div>
      )}
      {(p.son || p.enregistre) && <button type="button" className="e2-ui-btn" onClick={nouvelle}>＋ Nouvelle analyse</button>}
    </div>
  );
}

// ============================================================ 2. Morceau, forme d'onde, zone, spectre
function Confiance({ v }: { v: number }) {
  const mot = v >= 0.66 ? "bonne" : v >= 0.33 ? "moyenne" : "faible";
  return <span className={`ref-conf c-${mot}`} title={`Confiance ${Math.round(v * 100)} %`}><i style={{ width: `${Math.round(v * 100)}%` }} />confiance {mot}</span>;
}

function Morceau({ p, maj, stats, bpm }: { p: Page; maj: (x: Partial<Page>) => void; stats: StatsZone | null; bpm?: number }) {
  const lecture = useLecture();
  const [mode, setMode] = useState<Mode>("once");
  const [nomZone, setNomZone] = useState("");
  const g = p.global, e = p.enregistre;
  const key = g?.tona.key ?? e?.key, mineur = g?.tona.mineur ?? e?.mineur;
  const gammes = g ? g.tona.gammes.map((x) => x.n) : e?.gammes ?? [];
  const beat = bpm ? 60 / bpm : 0.5;
  const fixerLongueur = (d: number) => { if (p.zone && p.son) maj({ zone: { debut: p.zone.debut, fin: Math.min(p.duree, p.zone.debut + d) }, zoneActive: null }); };
  const kick = () => { if (!p.mono || !p.son) return; const t = trouverKick(p.mono, p.son.sr, bpm); if (t !== null) maj({ zone: { debut: Math.max(0, t - 0.005), fin: Math.min(p.duree, t + Math.min(beat, 0.7)) }, zoneActive: null }); };
  const ajouterZone = () => {
    if (!p.zone) return;
    const z: ZoneRef = { id: `z-${Date.now().toString(36)}`, nom: nomZone.trim() || `Zone ${p.zones.length + 1}`, debut: Math.round(p.zone.debut * 1000) / 1000, fin: Math.round(p.zone.fin * 1000) / 1000 };
    maj({ zones: [...p.zones, z], zoneActive: z.id }); setNomZone("");
  };
  return (
    <div className="ref-morceau">
      <div className="ref-chiffres">
        <div className="ref-chiffre"><span>Tempo (estimation)</span><b>{bpm ? `${fmt(bpm)} BPM` : "?"}</b>
          {g && <Confiance v={g.tempo.confiance} />}
          {g?.tempo.autre && <small className="muted">ou {fmt(g.tempo.autre)} BPM ({g.tempo.autre > (bpm ?? 0) ? "double" : "moitié"})</small>}
        </div>
        <div className="ref-chiffre"><span>Tonalité probable</span><b>{key ? `${key} ${mineur ? "mineur" : "majeur"}` : "?"}</b>
          {g && <Confiance v={g.tona.confiance} />}
          {g && <small className="muted">ou sa relative : {g.tona.relative}</small>}
        </div>
        <div className="ref-chiffre"><span>Gammes de l'E2 qui collent</span>
          <span className="ref-gammes">{gammes.map((n, i) => <a key={n} className={`chipbtn ${i === 0 ? "on" : ""}`} href={`#gammes/${n}`}>SCALE {n} · {gammeByN.get(n)?.nom ?? n}</a>)}</span>
          {key && <small className="muted">Sur l'E2 : KEY = {key}, SCALE = {gammes[0] ?? "?"}</small>}
        </div>
        <div className="ref-chiffre"><span>Volume perçu (tout le morceau)</span><b>{g ? (g.lufs === null ? "?" : `${fmt(g.lufs)} LUFS`) : e?.lufs != null ? `${fmt(e.lufs)} LUFS` : "?"}</b><small className="muted">Plus le chiffre est proche de 0, plus c'est fort.</small></div>
      </div>
      <p className="small muted">Tempo et tonalité sont des <b>estimations</b> calculées sur le milieu du morceau : vérifie à l'oreille (un tempo peut sortir au double ou à la moitié, une tonalité peut sortir sur sa relative).</p>

      {p.son && p.mono ? (
        <>
          <h4 className="ref-h">Forme d'onde : glisse pour choisir une zone</h4>
          <Onde x={p.mono} sr={p.son.sr} debut={0} fin={p.duree} zone={p.zone} onZone={(z) => maj({ zone: z, zoneActive: null })} hauteur={90} />
          {p.zone && <Onde x={p.mono} sr={p.son.sr} {...fenetreZoom(p.zone, p.duree)} zone={p.zone} onZone={(z) => maj({ zone: z, zoneActive: null })} hauteur={120} zoom />}
          <div className="ref-zone-barre">
            {p.zone && <span className="ref-zone-info">Zone : {sec(p.zone.debut)} → {sec(p.zone.fin)} ({fmt((p.zone.fin - p.zone.debut) * 1000, 0)} ms)</span>}
            <BoutonLecture pixel joue={lecture === "ref:zone"} disabled={!p.zone} onClick={() => p.zone && jouerZone("ref:zone", p.son!, p.zone, mode)} libelle="Écouter la zone" />
            <ModeBtn mode={mode} setMode={setMode} />
            <button type="button" className="e2-ui-btn" onClick={kick}>🔍 Trouver un kick</button>
            {bpm && <>
              <button type="button" className="chipbtn" onClick={() => fixerLongueur(beat)}>1 temps</button>
              <button type="button" className="chipbtn" onClick={() => fixerLongueur(beat * 4)}>1 mesure</button>
              <button type="button" className="chipbtn" onClick={() => fixerLongueur(beat * 16)}>4 mesures</button>
            </>}
          </div>
          <div className="ref-zones">
            <input className="ref-zone-nom" value={nomZone} onChange={(e) => setNomZone(e.target.value)} placeholder="Nom de la zone (Kick, Drop…)" />
            <button type="button" className="e2-ui-btn" disabled={!p.zone} onClick={ajouterZone}>＋ Garder cette zone</button>
          </div>
        </>
      ) : <p className="drl-vide">Recharge le fichier pour voir la forme d'onde et écouter les zones.</p>}
      {p.zones.length > 0 && (
        <ul className="ref-zones-liste">
          {p.zones.map((z) => (
            <li key={z.id} className={p.zoneActive === z.id ? "on" : ""}>
              <button type="button" className="chipbtn" disabled={!p.son} onClick={() => maj({ zone: { debut: z.debut, fin: z.fin }, zoneActive: z.id })}>{z.nom} · {sec(z.debut)} ({fmt((z.fin - z.debut) * 1000, 0)} ms)</button>
              {p.enregistre?.sons?.[z.id]?.midiBase != null && <small className="muted">{nomMidi(p.enregistre.sons[z.id].midiBase!).en}</small>}
              <button type="button" className="chipbtn" aria-label={`Retirer la zone ${z.nom}`} onClick={() => maj({ zones: p.zones.filter((y) => y.id !== z.id), zoneActive: p.zoneActive === z.id ? null : p.zoneActive })}>✕</button>
            </li>
          ))}
        </ul>
      )}
      {stats && (
        <>
          <h4 className="ref-h">Spectre de la zone (grave → aigu)</h4>
          <SpectreSvg courbes={[{ nom: "Zone de la référence", couleur: "#6aa2ee", v: stats.spectre }]} />
          <p className="ref-mesures-zone">
            <span>Volume perçu de la zone : <b>{stats.lufs === null ? "zone trop courte (au moins 0,4 s)" : `${fmt(stats.lufs)} LUFS`}</b></span>
            <span>Niveau moyen : <b>{fmt(stats.rms)} dB</b></span>
            <span>Crête : <b>{fmt(stats.crete)} dB</b></span>
          </p>
        </>
      )}
    </div>
  );
}

function ModeBtn({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return <ChoixMode mode={mode} onChange={setMode} />;
}

function fenetreZoom(z: Zone, duree: number) {
  const d = Math.max(1.5, (z.fin - z.debut) * 3);
  const c = (z.debut + z.fin) / 2;
  const debut = Math.max(0, Math.min(duree - d, c - d / 2));
  return { debut, fin: Math.min(duree, debut + d) };
}

/** Forme d'onde d'une partie d'un son. Glisser = choisir une zone ; toucher = déplacer la zone à cet endroit. */
function Onde({ x, sr, debut, fin, zone, onZone, hauteur, zoom, couleur = "#4e7ec2" }: { x: Float32Array; sr: number; debut: number; fin: number; zone: Zone | null; onZone: (z: Zone) => void; hauteur: number; zoom?: boolean; couleur?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [sel, setSel] = useState<Zone | null>(null);
  const drag = useRef<{ x0: number; t0: number } | null>(null);
  const [larg, setLarg] = useState(800);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ro = new ResizeObserver(() => setLarg(Math.max(200, Math.round(c.clientWidth))));
    ro.observe(c); return () => ro.disconnect();
  }, []);
  const pk = useMemo(() => pics(x.subarray(Math.floor(debut * sr), Math.ceil(fin * sr)), larg), [x, sr, debut, fin, larg]);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const g = c.getContext("2d")!; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    let m = 0; for (let i = 0; i < pk.max.length; i++) m = Math.max(m, pk.max[i], -pk.min[i]);
    const k = m > 0 ? 0.95 / m : 1;
    const X = (t: number) => ((t - debut) / (fin - debut)) * w;
    const z = sel ?? zone;
    if (z) { g.fillStyle = "#ffd84d26"; g.fillRect(X(z.debut), 0, X(z.fin) - X(z.debut), h); }
    g.fillStyle = couleur;
    for (let i = 0; i < pk.max.length; i++) { const px = (i / pk.max.length) * w; g.fillRect(px, h / 2 - pk.max[i] * k * (h / 2), Math.max(1, w / pk.max.length), Math.max(1, (pk.max[i] - pk.min[i]) * k * (h / 2))); }
    if (z) { g.fillStyle = "#ffd84d"; g.fillRect(X(z.debut) - 1, 0, 2, h); g.fillRect(X(z.fin) - 1, 0, 2, h); }
    if (zoom) { g.fillStyle = "#a3abba"; g.font = "11px ui-monospace, monospace"; g.fillText(`${sec(debut)}`, 4, h - 4); const t = sec(fin); g.fillText(t, w - g.measureText(t).width - 4, h - 4); }
  }, [pk, zone, sel, debut, fin, zoom, couleur, larg]);
  const temps = (e: React.PointerEvent) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); return debut + Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (fin - debut); };
  return (
    <canvas ref={ref} className={`ref-onde ${zoom ? "zoom" : ""}`} style={{ height: hauteur }}
      aria-label={zoom ? "Zoom sur la zone : glisse pour l'ajuster" : "Forme d'onde du morceau : glisse pour choisir une zone, touche pour la déplacer"}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x0: e.clientX, t0: temps(e) }; }}
      onPointerMove={(e) => { const d = drag.current; if (d && Math.abs(e.clientX - d.x0) > 3) { const t = temps(e); setSel({ debut: Math.min(d.t0, t), fin: Math.max(d.t0, t) }); } }}
      onPointerUp={(e) => {
        const d = drag.current; drag.current = null; setSel(null);
        if (!d) return;
        if (Math.abs(e.clientX - d.x0) <= 3) { const l = zone ? zone.fin - zone.debut : 0.5; onZone({ debut: d.t0, fin: Math.min(d.t0 + l, x.length / sr) }); return; }
        const t = temps(e), z = { debut: Math.min(d.t0, t), fin: Math.max(d.t0, t) };
        if (z.fin - z.debut >= 0.03) onZone(z);
      }} />
  );
}

/** Spectre en courbe (bandes de 1/6 d'octave), une ou plusieurs courbes superposées de couleurs différentes. */
function SpectreSvg({ courbes }: { courbes: { nom: string; couleur: string; v: number[]; pointille?: boolean }[] }) {
  return <SpectreCourbes courbes={courbes} f={FREQS_SPECTRE} hauteur={220} />;
}

// ============================================================ 3. Le son de la zone
const TYPE_NOM: Record<AnaSon["type"], string> = { kick: "Kick", basse: "Basse", aigu: "Son aigu (charleston…)", autre: "Autre son" };

function AnalyseSon({ a, b }: { a: AnaSon; b?: AnaSon }) {
  const approx = <small className="ref-approx">approximatif</small>;
  return (
    <div className="ref-son">
      <div className="ref-chiffres">
        <div className="ref-chiffre"><span>Type de son (estimation)</span><b>{TYPE_NOM[a.type]}</b><small className="muted">à {sec(a.attaqueA)} dans le fichier</small></div>
        <div className="ref-chiffre"><span>Note de base</span><b>{noteE2(a.midiBase)}</b>
          {a.fBase && <small className="muted">{fmt(a.fBase)} Hz{a.ecartCents ? `, ${a.ecartCents > 0 ? "+" : ""}${a.ecartCents} centièmes de demi-ton` : ""}</small>}
          {!a.baseFiable && approx}
          {a.fBase && <button type="button" className="chipbtn" onClick={() => jouerNote(a.fBase!)}>♪ Écouter la note</button>}
        </div>
        <div className="ref-chiffre"><span>Chute de hauteur</span>
          <b>{a.chuteDemi !== null && a.chuteDemi > 0.5 ? `${fmt(a.chuteDemi, 0)} demi-tons` : "pas de chute nette"}</b>
          {a.fDebut && a.chuteDemi !== null && a.chuteDemi > 0.5 && <small className="muted">de {fmt(a.fDebut, 0)} Hz à {a.midiBase !== null ? nomMidi(a.midiBase).en : "?"}{a.chuteMs ? ` en ${fmt(a.chuteMs, 0)} ms` : ""}</small>}
          {approx}
        </div>
        <div className="ref-chiffre"><span>Longueur (decay)</span><b>{fmt(a.decayMs, 0)} ms</b><small className="muted">avant de baisser de 20 dB ; fin du son à {fmt(a.longueurMs, 0)} ms</small>{a.coupe && <small className="ref-approx">coupé par le son suivant : approximatif</small>}</div>
        <div className="ref-chiffre"><span>Attaque</span><b>{a.attaque}</b><small className="muted">montée en {fmt(a.monteeMs, 0)} ms, clic {a.clic > -12 ? "marqué" : a.clic > -22 ? "léger" : "presque absent"}</small></div>
        <div className="ref-chiffre"><span>Distorsion</span><b>{a.motDistorsion}</b><small className="muted">harmoniques comparées à la note de base</small>{a.motDistorsion !== "non mesurable" && approx}</div>
      </div>
      <h4 className="ref-h">Grave, médium, aigu</h4>
      <Parts a={a} b={b} />
      <h4 className="ref-h">Enveloppe (volume au fil du temps) et hauteur</h4>
      <EnveloppeSvg a={a} b={b} />
      <p className="small muted">Les mesures viennent du premier son fort de la zone. Si d'autres instruments jouent en même temps (basse, nappe), la note et la longueur sont moins sûres : choisis de préférence un passage où le son est seul (intro, break).</p>
    </div>
  );
}

function Parts({ a, b }: { a: AnaSon; b?: AnaSon }) {
  const ligne = (nom: string, v: number, w: number | undefined, c: string) => (
    <div className="ref-part" key={nom}>
      <span>{nom}</span>
      <span className="ref-part-barre"><i style={{ width: `${Math.min(100, v)}%`, background: c }} />{w !== undefined && <i className="moi" style={{ width: `${Math.min(100, w)}%` }} />}</span>
      <b>{pct(v)}{w !== undefined ? ` · moi ${pct(w)}` : ""}</b>
    </div>
  );
  return (
    <div className="ref-parts">
      {ligne("Sub (20-60 Hz)", a.parts.sub, b?.parts.sub, "#9b6bff")}
      {ligne("Grave (20-250 Hz)", a.parts.grave, b?.parts.grave, "#ff6a3d")}
      {ligne("Médium (250 Hz-4 kHz)", a.parts.medium, b?.parts.medium, "#ffd84d")}
      {ligne("Aigu (4-20 kHz)", a.parts.aigu, b?.parts.aigu, "#3fd6d0")}
    </div>
  );
}

const crete = (a: AnaSon) => a.enveloppe.reduce((b, d, i) => (d > a.enveloppe[b] ? i : b), 0) * 2;

function EnveloppeSvg({ a, b }: { a: AnaSon; b?: AnaSon }) {
  const W = 640, H = 170;
  const tMax = Math.max(60, Math.min(1500, Math.max(a.enveloppe.length, b?.enveloppe.length ?? 0) * 2));
  const X = (ms: number) => (ms / tMax) * W;
  const Y = (d: number) => (-d / 60) * H;
  const Yf = (f: number) => H - (Math.log(Math.max(25, f) / 25) / Math.log(700 / 25)) * H;
  const env = (s: AnaSon) => s.enveloppe.map((d, i) => `${X(i * 2).toFixed(1)},${Y(d).toFixed(1)}`).join(" ");
  const hau = (s: AnaSon) => s.hauteur.filter((h) => h.t <= tMax).map((h) => `${X(h.t).toFixed(1)},${Yf(h.f).toFixed(1)}`).join(" ");
  const pas = tMax > 600 ? 200 : tMax > 250 ? 100 : 50;
  return (
    <figure className="ref-env">
      <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label="Enveloppe du son : volume (en haut = fort) et hauteur au fil du temps">
        {[-20, -40].map((d) => <g key={d}><line x1={0} x2={W} y1={Y(d)} y2={Y(d)} stroke="#ffffff14" /><text x={4} y={Y(d) - 3} className="ref-ax">{d} dB</text></g>)}
        {Array.from({ length: Math.floor(tMax / pas) }, (_, i) => (i + 1) * pas).map((t) => <g key={t}><line x1={X(t)} x2={X(t)} y1={0} y2={H} stroke="#ffffff10" /><text x={X(t) + 2} y={H + 13} className="ref-ax">{t} ms</text></g>)}
        <line x1={X(crete(a) + a.decayMs)} x2={X(crete(a) + a.decayMs)} y1={0} y2={H} stroke="#ff6a3d66" strokeDasharray="4 4" />
        {[50, 100, 200, 400].map((f) => <text key={f} x={W - 4} y={Yf(f) + 4} textAnchor="end" className="ref-ax hz">{f} Hz</text>)}
        <polyline fill="none" stroke="#ff6a3d" strokeWidth={2.5} points={env(a)} />
        {a.hauteur.length > 2 && <polyline fill="none" stroke="#ffd84d" strokeWidth={1.5} strokeDasharray="3 3" points={hau(a)} />}
        {b && <polyline fill="none" stroke="#4fd18b" strokeWidth={2.5} points={env(b)} />}
        {b && b.hauteur.length > 2 && <polyline fill="none" stroke="#4fd18b" strokeWidth={1.2} strokeDasharray="3 3" points={hau(b)} />}
      </svg>
      <figcaption className="ms-legende">
        <span><i style={{ background: "#ff6a3d", borderColor: "#ff6a3d" }} />Volume {b ? "de la référence" : ""}</span>
        <span><i className="pt" style={{ borderColor: "#ffd84d" }} />Hauteur (Hz, échelle à droite)</span>
        {b && <span><i style={{ background: "#4fd18b", borderColor: "#4fd18b" }} />Mon son</span>}
      </figcaption>
    </figure>
  );
}

// ============================================================ 4. Recettes de départ
function Recettes({ p, maj, ana, bpm }: { p: Page; maj: (x: Partial<Page>) => void; ana: AnaSon | null; bpm?: number }) {
  const range = useKnobRange();
  const { visibles } = useStyles();
  const lecture = useLecture();
  const [mode, setMode] = useState<Mode>("once");
  const [annonce, setAnnonce] = useState("");
  const g = p.global;
  const proposer = () => {
    if (!ana) return;
    const rcs = recettesDepuisSon(ana, { morceau: p.nom || nomFichier(p.fichier), analyse: p.id ?? undefined, bpm, key: g?.tona.key ?? p.enregistre?.key, gamme: g?.tona.gammes[0]?.n ?? p.enregistre?.gammes?.[0], style: p.style || undefined }, range);
    maj({ propositions: [...p.propositions.filter((x) => x.statut === "gardee"), ...rcs.map((rc) => ({ rc, statut: "proposee" as const }))] });
    setAnnonce("");
  };
  const garder = (rc: Recette) => {
    garderRecette(rc);
    maj({ propositions: p.propositions.map((x) => (x.rc.id === rc.id ? { ...x, statut: "gardee" } : x)) });
    setAnnonce(`« ${rc.nom} » est gardée dans Recettes › ${ELEMENTS.get(rc.element ?? "kick")?.nom}, avec le badge « D'après une référence ».`);
  };
  const jeter = (rc: Recette) => { if (engine.snap.owner === `refrc:${rc.id}`) engine.stop(); maj({ propositions: p.propositions.filter((x) => x.rc.id !== rc.id) }); };
  const ecouter = (rc: Recette) => { if (engine.snap.owner === `refrc:${rc.id}`) { engine.stop(); return; } arreterRef(); jouerSeq(`refrc:${rc.id}`, etatRecette(rc, range, mode)); };
  return (
    <div className="ref-recettes">
      <div className="ss-styles" role="radiogroup" aria-label="Style des recettes">
        <span className="ss-lbl">Style :</span>
        <button type="button" role="radio" aria-checked={!p.style} className={`ss-style ${!p.style ? "on" : ""}`} onClick={() => maj({ style: "" })}>Aucun</button>
        {visibles.map((s) => <button key={s.id} type="button" role="radio" aria-checked={p.style === s.id} className={`ss-style ${p.style === s.id ? "on" : ""}`} style={{ "--sc": s.couleur } as CSSProperties} onClick={() => maj({ style: s.id as Style })}>{s.nom}</button>)}
      </div>
      <div className="ref-btns">
        <button type="button" className="px-btn" disabled={!ana} onClick={proposer}>🔍 {p.propositions.some((x) => x.statut === "proposee") ? "Proposer d'autres recettes" : "Proposer des recettes"}{ana ? ` (${TYPE_NOM[ana.type].toLowerCase()})` : ""}</button>
        <ModeBtn mode={mode} setMode={setMode} />
        {p.son && p.zone && <BoutonLecture joue={lecture === "ref:zone"} onClick={() => jouerZone("ref:zone", p.son!, p.zone!, mode)} libelle="La référence" />}
      </div>
      {!ana && !p.propositions.length && <p className="drl-vide">{p.son ? "Choisis d'abord une zone avec un son." : "Recharge le fichier pour proposer des recettes."}</p>}
      {annonce && <p className="ref-ok">{annonce} <a href="#recettes">Ouvrir Recettes</a></p>}
      <ul className="ref-rc-liste">
        {p.propositions.map(({ rc, statut }) => (
          <li key={rc.id}>
            <CarteRecette rc={rc} gardee={statut === "gardee"} joue={engine.snap.owner === `refrc:${rc.id}`} onEcouter={() => ecouter(rc)} onGarder={() => garder(rc)} onJeter={() => jeter(rc)}
              refBtn={p.son && p.zone ? <button type="button" className="chipbtn" onClick={() => jouerZone("ref:zone", p.son!, p.zone!, mode)}>{lecture === "ref:zone" ? "■" : "▶"} Référence</button> : null} />
          </li>
        ))}
      </ul>
      <p className="small muted">Oscillateurs, filtres, effets et modulations viennent des listes du manuel. Les potards sans plage dans le manuel sont sur 0 à 127 « à vérifier sur l'écran » (ou dans ta plage si tu l'as notée dans le Carnet). L'aperçu est une approximation, pas le son réel de l'E2.</p>
    </div>
  );
}

function CarteRecette({ rc, gardee, joue, onEcouter, onGarder, onJeter, refBtn }: { rc: Recette; gardee: boolean; joue: boolean; onEcouter: () => void; onGarder: () => void; onJeter: () => void; refBtn: ReactNode }) {
  return (
    <article className={`ref-rc ${gardee ? "gardee" : ""}`}>
      <div className="ref-rc-tete">
        <Badge kind="ref" />
        {rc.styles.map((s) => <span key={s} className={`st st-${s}`}>{STYLE_NOM[s]}</span>)}
        {rc.bpm && <kbd>{rc.bpm} BPM</kbd>}
        {rc.melodique && <kbd>KEY = {rc.melodique.key} · {gammeByN.get(rc.melodique.scale)?.nom}</kbd>}
      </div>
      <h4>{rc.nom}</h4>
      <p className="ref-depart">Point de départ, à ajuster à l'oreille.</p>
      <p className="small">{rc.idee}</p>
      <ul className="ref-reglages">
        {rc.reglages.map((x, i) => (
          <li key={`${x.param}-${i}`}><span>{paramById.get(x.param)?.nom ?? x.param}</span><b>{x.valeur}</b>{x.aVerifier && <small className="ref-approx">à vérifier sur l'écran</small>}</li>
        ))}
      </ul>
      <div className="ref-btns">
        <BoutonLecture pixel joue={joue} onClick={onEcouter} libelle="Écouter l'aperçu" />
        {refBtn}
        {gardee ? <a className="e2-ui-btn" href={`#recettes/${rc.id}`}>✓ Gardée · ouvrir</a> : <>
          <button type="button" className="px-btn green" onClick={onGarder}>✓ Garder</button>
          <button type="button" className="e2-ui-btn" onClick={onJeter}>✕ Jeter</button>
        </>}
      </div>
    </article>
  );
}

// ============================================================ 5. Comparer avec mon son
function Comparer({ p, maj, ana }: { p: Page; maj: (x: Partial<Page>) => void; ana: AnaSon | null }) {
  const lecture = useLecture();
  const [mode, setMode] = useState<Mode>("once");
  const [err, setErr] = useState("");
  const charger = async (f: File) => {
    setErr("");
    try {
      const s = await ouvrirAudio(f);
      const mono = monoDe(s.L, s.R);
      const t = trouverKick(mono, s.sr, p.global?.tempo.bpm);
      const l = p.zone ? p.zone.fin - p.zone.debut : 0.5, d = s.L.length / s.sr;
      const debut = t !== null && (ana?.type === "kick" || !ana) ? Math.max(0, t - 0.005) : 0;
      maj({ moi: s, moiMono: mono, zoneMoi: { debut, fin: Math.min(d, debut + l) } });
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };
  const moiAna = useMemo(() => (p.moiMono && p.moi && p.zoneMoi ? analyserSon(p.moiMono, p.moi.sr, p.zoneMoi) : null), [p.moiMono, p.moi, p.zoneMoi]);
  const sRef = useMemo(() => (p.son && p.zone ? statsZone(p.son.L, p.son.R, p.son.sr, p.zone) : null), [p.son, p.zone]);
  const sMoi = useMemo(() => (p.moi && p.zoneMoi ? statsZone(p.moi.L, p.moi.R, p.moi.sr, p.zoneMoi) : null), [p.moi, p.zoneMoi]);
  const phrases = ana && moiAna ? comparer(ana, moiAna, "la référence") : [];
  // même volume : on baisse le plus fort des deux
  const ecart = sRef && sMoi ? (sRef.lufs !== null && sMoi.lufs !== null ? sRef.lufs - sMoi.lufs : sRef.rms - sMoi.rms) : 0;
  const gRef = ecart > 0 ? -ecart : 0, gMoi = ecart < 0 ? ecart : 0;
  return (
    <div className="ref-comparer">
      <label className="ref-depot petit">
        <input type="file" accept={FORMATS} onChange={(e) => { const f = e.target.files?.[0]; if (f) void charger(f); e.target.value = ""; }} />
        <span><b>{p.moi ? `🎛 ${p.moi.nom} · changer` : "Charger mon enregistrement E2"}</b> (WAV de préférence)</span>
      </label>
      <EnregistrerVersion source={{ module: "reference", ref: p.id ?? undefined, titre: `Mon son pour ${p.nom || "la référence"}`, href: p.id ? `#studio/analyser/${p.id}` : "#studio/analyser" }}
        bpm={p.global && Number.isFinite(p.global.tempo.bpm) ? Math.round(p.global.tempo.bpm) : undefined} sansVersions
        libelle="● Enregistrer mon son" texte="Joue ton son sur l'E2 et compare-le tout de suite."
        utiliser={{ libelle: "🔍 Comparer avec la référence", action: (f) => charger(f) }} />
      {p.global && <p className="small"><a href={`#studio/visualiser/ref=${encodeURIComponent(p.id ?? "courant")}`}>📈 Comparer en direct : le spectre de l'E2 par-dessus celui de la référence, dans l'onglet Visualiser</a></p>}
      {err && <p className="ss-err">{err}</p>}
      {p.moi && p.moiMono && (
        <>
          <h4 className="ref-h">Mon son : glisse pour choisir la zone à comparer</h4>
          <Onde x={p.moiMono} sr={p.moi.sr} debut={0} fin={p.moi.L.length / p.moi.sr} zone={p.zoneMoi} onZone={(z) => maj({ zoneMoi: z })} hauteur={80} couleur="#4fd18b" />
          {p.zoneMoi && <Onde x={p.moiMono} sr={p.moi.sr} {...fenetreZoom(p.zoneMoi, p.moi.L.length / p.moi.sr)} zone={p.zoneMoi} onZone={(z) => maj({ zoneMoi: z })} hauteur={100} zoom couleur="#4fd18b" />}
          <div className="ref-btns">
            <button type="button" className="e2-ui-btn" onClick={() => { const t = trouverKick(p.moiMono!, p.moi!.sr, p.global?.tempo.bpm); if (t !== null) { const l = p.zone ? p.zone.fin - p.zone.debut : 0.5; maj({ zoneMoi: { debut: Math.max(0, t - 0.005), fin: t + l } }); } }}>🔍 Trouver un kick</button>
          </div>
        </>
      )}
      {p.moi && p.zoneMoi && p.son && p.zone && (
        <div className="ref-ab">
          <span className="ref-ab-titre">Écoute A/B au même volume</span>
          <button type="button" className={`px-btn ${lecture === "ref:A" ? "green" : ""}`} onClick={() => jouerZone("ref:A", p.son!, p.zone!, mode, gRef)}>A · Référence</button>
          <button type="button" className={`px-btn ${lecture === "ref:B" ? "green" : ""}`} onClick={() => jouerZone("ref:B", p.moi!, p.zoneMoi!, mode, gMoi)}>B · Mon son</button>
          <ModeBtn mode={mode} setMode={setMode} />
          <small className="muted">{Math.abs(ecart) < 0.5 ? "Les deux zones ont déjà presque le même volume." : `${ecart > 0 ? "La référence" : "Ton son"} est baissé${ecart > 0 ? "e" : ""} de ${fmt(Math.abs(ecart))} dB pour comparer au même volume.`}</small>
        </div>
      )}
      {ana && moiAna && (
        <>
          <div className="ref-phrase">
            <PixelArt name="reference" size={28} />
            <p>{phrases.length ? <>Par rapport à la référence, {phrases.join(", ")}.</> : "Ton son est très proche de la référence sur ces mesures. Compare à l'oreille avec l'écoute A/B."}</p>
          </div>
          <table className="ref-table">
            <thead><tr><th /><th>Référence</th><th>Mon son</th></tr></thead>
            <tbody>
              <tr><th>Note de base</th><td>{noteE2(ana.midiBase)}</td><td>{noteE2(moiAna.midiBase)}</td></tr>
              <tr><th>Longueur (-20 dB)</th><td>{fmt(ana.decayMs, 0)} ms</td><td>{fmt(moiAna.decayMs, 0)} ms</td></tr>
              <tr><th>Chute de hauteur</th><td>{ana.chuteDemi !== null ? `${fmt(ana.chuteDemi, 0)} demi-tons` : "?"}</td><td>{moiAna.chuteDemi !== null ? `${fmt(moiAna.chuteDemi, 0)} demi-tons` : "?"}</td></tr>
              <tr><th>Attaque</th><td>{ana.attaque}</td><td>{moiAna.attaque}</td></tr>
              <tr><th>Distorsion</th><td>{ana.motDistorsion}</td><td>{moiAna.motDistorsion}</td></tr>
              <tr><th>Volume perçu</th><td>{sRef?.lufs != null && sMoi?.lufs != null ? `${fmt(sRef.lufs)} LUFS` : `${fmt(sRef?.rms ?? 0)} dB (niveau moyen)`}</td><td>{sRef?.lufs != null && sMoi?.lufs != null ? `${fmt(sMoi.lufs)} LUFS` : `${fmt(sMoi?.rms ?? 0)} dB (niveau moyen)`}</td></tr>
            </tbody>
          </table>
          <h4 className="ref-h">Spectres superposés</h4>
          <SpectreSvg courbes={[{ nom: "Référence", couleur: "#6aa2ee", v: ana.spectre }, { nom: "Mon son", couleur: "#4fd18b", v: moiAna.spectre }]} />
          <h4 className="ref-h">Grave, médium, aigu</h4>
          <Parts a={ana} b={moiAna} />
          <h4 className="ref-h">Enveloppes</h4>
          <EnveloppeSvg a={ana} b={moiAna} />
          <p className="small muted">Comparaison approximative : les deux zones doivent contenir le même genre de son (un kick seul contre un kick seul).</p>
        </>
      )}
      {!p.son && <p className="drl-vide">Recharge d'abord la référence pour comparer.</p>}
    </div>
  );
}

// ============================================================ Mes analyses
function MesAnalyses({ actuelle }: { actuelle: string | null }) {
  const st = useStore();
  const toutes = listeAnalyses(st);
  const keys = [...new Set(toutes.map((a) => (a.key ? `${a.key} ${a.mineur ? "mineur" : "majeur"}` : "")).filter(Boolean))].sort();
  const groupes: FmGroupe[] = [
    { id: "ton", titre: "Tonalité", options: keys.map((k) => ({ id: k, nom: k, n: toutes.filter((a) => `${a.key} ${a.mineur ? "mineur" : "majeur"}` === k).length })) },
    { id: "bpm", titre: "Tempo", options: [{ id: "lent", nom: "Moins de 130 BPM" }, { id: "moyen", nom: "130 à 160 BPM" }, { id: "rapide", nom: "Plus de 160 BPM" }] },
    { id: "autres", titre: "Afficher", options: [{ id: "favoris", nom: "★ Mes favoris" }, { id: "recettes", nom: "Avec des recettes" }] },
  ];
  const [f, setF] = useState<FmValeur>(() => fmVide(groupes));
  const tranche = (b?: number) => (!b ? "" : b < 130 ? "lent" : b <= 160 ? "moyen" : "rapide");
  const liste = toutes.filter((a) => (!f.ton?.length || f.ton.includes(`${a.key} ${a.mineur ? "mineur" : "majeur"}`))
    && (!f.bpm?.length || f.bpm.includes(tranche(a.bpm)))
    && (!f.autres?.includes("favoris") || estFavori(st, idFavori("reference", a.id)))
    && (!f.autres?.includes("recettes") || a.recettes.length > 0));
  if (!toutes.length) return <p className="drl-vide">Pas encore d'analyse gardée. Analyse un morceau puis « 💾 Enregistrer l'analyse ».</p>;
  return (
    <div className="ref-mes">
      <FiltreMenu cle="e2academy.filtres.Reference" groupes={groupes} valeur={f} onChange={setF} resultat={`${liste.length} analyse${liste.length > 1 ? "s" : ""}`} />
      <ul className="ref-mes-liste">
        {liste.map((a) => (
          <li key={a.id} className={a.id === actuelle ? "on" : ""}>
            <div className="ref-mes-tete"><b>{a.nom}</b><Etoile type="reference" cle={a.id} titre={a.nom} /></div>
            <span className="small muted">{new Date(a.le).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })} · {a.bpm ? `${fmt(a.bpm)} BPM` : "BPM ?"}{a.key ? ` · ${a.key} ${a.mineur ? "mineur" : "majeur"}` : ""} · {a.zones.length} zone(s) · {a.recettes.length} recette(s)</span>
            {a.notes && <p className="small">{a.notes}</p>}
            <div className="ref-btns">
              <a className="chipbtn" href={`#studio/analyser/${a.id}`}>📂 Ouvrir</a>
              <BoutonSupprimer quoi={`l'analyse « ${a.nom} »`} detail="Les recettes que tu as gardées restent dans Recettes." onSupprimer={() => supprimerAnalyse(a.id)} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pour l'accueil : les dernières analyses. */
export function dernieresAnalyses(st: ReturnType<typeof useStore>, n = 3) { return listeAnalyses(st).slice(0, n); }
