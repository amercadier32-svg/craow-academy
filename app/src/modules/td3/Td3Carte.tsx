// Carte de la TD-3, sur le modèle de la carte de l'Electribe 2 : zones à gauche, panneau jaune avec tous les
// contrôles à leur place, fiche à droite (en bas sur téléphone) avec un dessin, un potard à essayer et les touches.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Badge, ObservationBox } from "../../components/ui/common";
import { Infos, Rangement } from "../../components/ui/Rangement";
import { norm } from "../../lib/texte";
import { FICHES_TD3, type CleEssai, type Combo } from "../../content/td3/fiches";
import { lirePattern, recetteTd3ById } from "../../content/td3/recettes";
import { arreterTd3, jouerTd3, reglerTd3, type ReglagesApercu } from "../../lib/audio/td3Apercu";
import { DessinTd3 } from "./Td3Dessins";
import { CONTROLES, Touche, avecTouches, ctrl, proc, SourceTd3, type ControleTd3 } from "./td3Commun";
import "./td3.css";

// ---- Zones du panneau ----
const ZONES: { id: string; nom: string; icone: string; couleur: string; ids: string[] }[] = [
  { id: "son", nom: "Le son", icone: "potard", couleur: "#f2c230", ids: ["waveform", "tune", "cutoff", "resonance", "envelope", "decay", "accent"] },
  { id: "dist", nom: "Distorsion", icone: "effets", couleur: "#ff6a3d", ids: ["distortion", "drive", "tone", "level"] },
  { id: "jeu", nom: "Lecture et tempo", icone: "lecture", couleur: "#4fd18b", ids: ["start", "tempo", "mode", "track", "volume", "powerled"] },
  { id: "ecrire", nom: "Écrire un pattern", icone: "grille", couleur: "#ff3b3b", ids: ["pitch", "time", "function", "back", "write", "clear"] },
  { id: "notes", nom: "Notes, accent, slide", icone: "gammes", couleur: "#6aa2ee", ids: ["clavier", "down", "up", "acc", "slide"] },
  { id: "prises", nom: "Prises", icone: "prise", couleur: "#9aa3b2", ids: ["filterin", "syncin", "cvout", "gateout", "phones"] },
];
const zoneDe = (id: string) => ZONES.find((z) => z.ids.includes(id));

// ---- Place de chaque contrôle sur le panneau (en % de la largeur et de la hauteur) ----
type Forme = "pot" | "gros" | "inter" | "rot" | "btn" | "jack" | "led";
const PLACE: Record<string, { x: number; y: number; f: Forme; nom?: string; led?: string }> = {
  filterin: { x: 5, y: 8, f: "jack", nom: "FILTER IN" }, syncin: { x: 12, y: 8, f: "jack", nom: "SYNC IN" },
  cvout: { x: 19, y: 8, f: "jack", nom: "CV OUT" }, gateout: { x: 26, y: 8, f: "jack", nom: "GATE OUT" }, phones: { x: 33, y: 8, f: "jack", nom: "PHONES" },
  powerled: { x: 95, y: 7, f: "led", nom: "POWER" },
  waveform: { x: 6, y: 29, f: "inter", nom: "WAVEFORM" },
  tune: { x: 15.5, y: 29, f: "pot", nom: "TUNE" }, cutoff: { x: 25, y: 29, f: "pot", nom: "CUTOFF" }, resonance: { x: 34.5, y: 29, f: "pot", nom: "RESONANCE" },
  envelope: { x: 44, y: 29, f: "pot", nom: "ENVELOPE" }, decay: { x: 53.5, y: 29, f: "pot", nom: "DECAY" }, accent: { x: 63, y: 29, f: "pot", nom: "ACCENT" },
  distortion: { x: 75, y: 29, f: "inter", nom: "DISTORTION" }, drive: { x: 82.5, y: 29, f: "pot", nom: "DRIVE" }, tone: { x: 89, y: 29, f: "pot", nom: "TONE" }, level: { x: 95.5, y: 29, f: "pot", nom: "LEVEL" },
  tempo: { x: 8, y: 52, f: "pot", nom: "TEMPO" }, track: { x: 22, y: 52, f: "rot", nom: "TRACK / PATTERN GROUP" }, mode: { x: 37, y: 52, f: "rot", nom: "MODE" },
  volume: { x: 93, y: 52, f: "gros", nom: "VOLUME" },
  pitch: { x: 5, y: 73, f: "btn", nom: "PITCH MODE", led: "on" }, time: { x: 12.5, y: 73, f: "btn", nom: "TIME MODE", led: "on" },
  function: { x: 5, y: 89, f: "btn", nom: "FUNCTION", led: "on" }, clear: { x: 12.5, y: 89, f: "btn", nom: "CLEAR" },
  down: { x: 74, y: 73, f: "btn", nom: "DOWN" }, up: { x: 80.5, y: 73, f: "btn", nom: "UP" }, acc: { x: 87, y: 73, f: "btn", nom: "ACCENT" }, slide: { x: 93.5, y: 73, f: "btn", nom: "SLIDE" },
  back: { x: 74, y: 89, f: "btn", nom: "BACK" }, write: { x: 80.5, y: 89, f: "btn", nom: "WRITE/NEXT" }, start: { x: 90.3, y: 89, f: "btn", nom: "START/STOP", led: "on" },
};
const BLANCHES = ["C", "D", "E", "F", "G", "A", "B", "C'"];
const NOIRES: [string, number][] = [["C#", 0], ["D#", 1], ["F#", 3], ["G#", 4], ["A#", 5]];   // après la blanche n°
const K0 = 18.5, KW = 6.6;  // début et largeur d'une touche blanche (en %)

// ---- Essai sonore des fiches ----
const BASE: ReglagesApercu = { waveform: "saw", cutoff: 3, resonance: 6, envelope: 5, decay: 4, accent: 6, distortion: false, drive: 5, tone: 5, level: 5, tune: 5, volume: 8 };
const TEST = recetteTd3ById.get("premiere")!;
const bpmDe = (v: number) => Math.round(70 + v * 13);   // tempo de l'aperçu seulement

function texteRecherche(c: ControleTd3) {
  const f = FICHES_TD3[c.id];
  return norm([c.nom, c.role, f?.bref, ...(f?.imprime ?? []), ...(f?.combos ?? []).map((x) => `${x.touches.join(" ")} ${x.effet}`), PLACE[c.id]?.nom].join(" "));
}

export function Td3Carte({ focus }: { focus?: string }) {
  const [sel, setSel] = useState<string | null>(focus && ctrl.has(focus) ? focus : null);
  const [zone, setZone] = useState<string | null>(() => (focus ? zoneDe(focus)?.id ?? null : null));
  const [q, setQ] = useState("");
  const [touche, setTouche] = useState<string | null>(null);
  const detail = useRef<HTMLElement>(null);
  const dansZone = zone ? new Set(ZONES.find((z) => z.id === zone)!.ids) : null;
  const trouves = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return null;
    const mots = t.split(/\s+/);
    return new Set(CONTROLES.filter((c) => mots.every((m) => texteRecherche(c).includes(m))).map((c) => c.id));
  }, [q]);

  useEffect(() => { detail.current?.scrollTo({ top: 0 }); }, [sel]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); arreterTd3(); };
  }, []);

  const choisir = (id: string | null, t?: string) => {
    setSel(id); setTouche(t ?? null);
    history.replaceState(null, "", id ? `#td3-machine/${id}` : "#td3-machine");
  };
  const classe = (id: string) => [
    sel === id ? "is-sel" : "",
    trouves ? (trouves.has(id) ? "is-hit" : "is-dim") : dansZone ? (dansZone.has(id) ? "is-hit" : "is-dim") : "",
  ].join(" ");

  return (
    <div className={`map td3-map ${sel ? "has-sel" : ""}`}>
      <div className="map-main">
        <h2 className="page-title">TD-3 · La machine</h2>
        <Infos>
          <p>Touche un potard, une touche ou une prise : sa fiche s'ouvre avec un dessin, un potard à essayer à l'oreille et les combinaisons de touches.</p>
          <p>Choisir une zone allume ses contrôles sur le panneau. Disposition approchée d'après le guide TD-3 : envoie une photo de ta TD-3 pour que chaque contrôle soit exactement à sa place.</p>
        </Infos>
        <div className="toolbar">
          <input type="search" placeholder="Chercher : slide, accent, synchro, effacer…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Chercher un contrôle" />
        </div>
        <Rangement
          racine="Machine" labelCategorie="Zone du panneau" labelElement="Contrôle"
          categories={ZONES.map((z) => ({ id: z.id, nom: z.nom, icone: z.icone, couleur: z.couleur, n: z.ids.length, elements: z.ids.map((id) => ({ id, nom: PLACE[id]?.nom ?? ctrl.get(id)!.nom })) }))}
          cat={zone} onCat={setZone} boutonTout={false}
          element={sel && dansZone?.has(sel) ? sel : null}
          onElement={(id) => choisir(id)}
        />
        {trouves && <p className="muted small">{trouves.size} contrôle{trouves.size > 1 ? "s" : ""} trouvé{trouves.size > 1 ? "s" : ""}.</p>}

        <p className="td3p-glisse muted small">Glisse le panneau ← → pour tout voir.</p>
        <div className="td3p-defile">
          <div className="td3p" role="group" aria-label="Panneau de la TD-3">
            <div className="td3p-brand"><b>CrAoW ACADEMY</b><small>bass line · carte d'apprentissage</small></div>
            <div className="td3p-cadre td3p-cadre-dist" aria-hidden><span>DISTORTION</span></div>
            <div className="td3p-ligne" aria-hidden />
            {Object.entries(PLACE).map(([id, p]) => (
              <button key={id} type="button" className={`td3p-ctl f-${p.f} ${classe(id)}`} style={{ left: `${p.x}%`, top: `${p.y}%` } as CSSProperties}
                onClick={() => choisir(id)} aria-label={ctrl.get(id)!.nom} title={ctrl.get(id)!.nom}>
                <span className="td3p-corps" aria-hidden>{p.led && <i className={`td3p-led ${sel === id ? "on" : ""}`} />}</span>
                <span className="td3p-nom">{p.nom}</span>
              </button>
            ))}
            {/* Clavier : 8 touches blanches (C à C', patterns 1 à 8) et 5 noires */}
            {BLANCHES.map((n, i) => (
              <button key={n} type="button" className={`td3p-touche blanche ${classe("clavier")} ${sel === "clavier" && touche === n ? "on" : ""}`}
                style={{ left: `${K0 + i * KW}%` }} onClick={() => choisir("clavier", n)} aria-label={`Touche ${n}`}>
                <b>{n}</b><small>{i + 1}</small>
              </button>
            ))}
            {NOIRES.map(([n, apres]) => (
              <button key={n} type="button" className={`td3p-touche noire ${classe("clavier")} ${sel === "clavier" && touche === n ? "on" : ""}`}
                style={{ left: `${K0 + (apres + 1) * KW - KW * 0.36}%` }} onClick={() => choisir("clavier", n)} aria-label={`Touche ${n}`}>
                <b>{n}</b>
              </button>
            ))}
          </div>
        </div>
        <p className="muted small td3-approx">Disposition approchée. Les noms sont ceux du guide TD-3.</p>
      </div>

      <aside className="detail td3-detail" ref={detail} aria-live="polite">
        {sel ? <FicheDetail id={sel} touche={touche} onClose={() => choisir(null)} onAller={(id) => choisir(id)} /> : <Vide />}
      </aside>
    </div>
  );
}

function Vide() {
  return (
    <div className="empty">
      <h2>La TD-3</h2>
      <p>Touche un élément du panneau pour voir :</p>
      <ul className="ticks">
        <li>ce qu'il fait, en une phrase</li>
        <li>un dessin qui bouge quand tu tournes le potard, et l'écoute</li>
        <li>les combinaisons de touches <Badge kind="manuel" /></li>
        <li>tes notes <Badge kind="obs" /></li>
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- Fiche
function FicheDetail({ id, touche, onClose, onAller }: { id: string; touche: string | null; onClose: () => void; onAller: (id: string) => void }) {
  const c = ctrl.get(id)!;
  const f = FICHES_TD3[id];
  const z = zoneDe(id);
  return (
    <div className="td3-fiche-d" style={{ "--zc": z?.couleur ?? "#f2c230" } as CSSProperties}>
      <div className="detail-top">
        <div>
          <p className="muted small">{z?.nom} › n° {c.n}</p>
          <h2>{c.nom}</h2>
        </div>
        <button type="button" className="close" onClick={onClose} aria-label="Fermer">✕</button>
      </div>
      <p className="td3-bref">{f?.bref ?? c.role}</p>

      <Essai key={id} id={id} touche={touche} />

      {f?.combos && f.combos.length > 0 && (
        <div className="block">
          <h3>Comment s'en servir</h3>
          <ul className="td3-combos">{f.combos.map((x, i) => <ComboLigne key={i} x={x} />)}</ul>
        </div>
      )}

      <div className="block">
        <h3>Bon à savoir</h3>
        <ul className="td3-savoir">
          <li>{c.role}</li>
          {c.plage && <li><b>Plage :</b> {c.plage}</li>}
          {f?.savoir?.map((s) => <li key={s}>{avecTouches(s)}</li>)}
        </ul>
        <p><SourceTd3 section={c.section} n={c.n} /></p>
      </div>

      {z && (
        <div className="block">
          <h3>Dans la même zone</h3>
          <div className="td3-chips">{z.ids.filter((x) => x !== id).map((x) => <button key={x} type="button" className="td3-chip" onClick={() => onAller(x)}>{PLACE[x]?.nom ?? ctrl.get(x)!.nom}</button>)}</div>
        </div>
      )}

      <div className="block">
        <ObservationBox id={`td3:control:${id}`} titre={`TD-3 · ${c.nom}`} placeholder="Ce que j'entends, ma position préférée (0 à 10)…" />
      </div>
    </div>
  );
}

function ComboLigne({ x }: { x: Combo }) {
  const p = x.proc ? proc.get(x.proc) : undefined;
  return (
    <li>
      <span className="td3-combo-touches">
        {x.touches.map((t, i) => ["+", "→"].includes(t) || t.startsWith("(") || t.startsWith("×")
          ? <span key={i} className="td3-combo-sep">{t}</span>
          : <Touche key={i}>{t}</Touche>)}
      </span>
      <span className="td3-combo-effet">{x.effet}</span>
      <span className="td3-combo-pied">
        {x.mode && <Touche mode>{x.mode}</Touche>}
        {p && <a href="#td3-sequenceur" className="td3-combo-lien">Pas à pas : {p.titre} →</a>}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------- Essai (dessin + potard + écoute)
function Essai({ id, touche }: { id: string; touche: string | null }) {
  const f = FICHES_TD3[id];
  const cle = f?.essai?.cle as CleEssai | undefined;
  const depart = cle === "tempo" ? 5 : cle ? (BASE[cle as keyof ReglagesApercu] as number) ?? 5 : 5;
  const [v, setV] = useState<number>(depart);
  const [onde, setOnde] = useState<"saw" | "square">("saw");
  const [dist, setDist] = useState(true);
  const [joue, setJoue] = useState(false);
  const enDist = ["drive", "tone", "level", "distortion"].includes(id);
  useEffect(() => () => arreterTd3(), []);

  const reglages = (): ReglagesApercu => ({
    ...BASE, waveform: onde, distortion: id === "distortion" ? dist : enDist,
    ...(cle && cle !== "tempo" ? { [cle]: v } : {}),
  });
  const ecouter = () => {
    if (joue) { arreterTd3(); return; }
    setJoue(true);
    jouerTd3({ pas: lirePattern(TEST.patterns[0]), bpm: cle === "tempo" ? bpmDe(v) : TEST.bpm, reglages: reglages(), boucle: true, surFin: () => setJoue(false) });
  };
  const changer = (nv: number) => { setV(nv); if (joue && cle) reglerTd3(cle === "tempo" ? {} : { [cle]: nv }, cle === "tempo" ? bpmDe(nv) : undefined); };
  useEffect(() => { if (joue) reglerTd3({ waveform: onde, distortion: id === "distortion" ? dist : enDist }); }, [onde, dist]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!f) return null;
  const sonore = Boolean(cle) || id === "waveform" || id === "distortion";
  return (
    <div className="td3-essai">
      {f.dessin === "mode" ? <DessinMode /> : f.dessin === "track" ? <DessinTrack /> : f.dessin === "clavier" ? <DessinClavier touche={touche} /> : f.dessin === "bouton" ? <DessinBouton id={id} /> : (
        <DessinTd3 dessin={f.dessin} id={id} v={v} reglages={{ cutoff: BASE.cutoff, resonance: BASE.resonance, envelope: BASE.envelope, decay: BASE.decay }} extra={{ onde, dist, sens: f.sens }} />
      )}
      {f.essai && (
        <div className="td3-curseur">
          <span className="td3-curseur-g">{f.essai.gauche}</span>
          <input type="range" min={0} max={10} step={1} value={v} onChange={(e) => changer(Number(e.target.value))} aria-label={`Position de ${ctrl.get(id)!.nom}`} />
          <span className="td3-curseur-d">{f.essai.droite}</span>
          <b className="td3-curseur-v">{v}</b>
        </div>
      )}
      {id === "waveform" && (
        <div className="seg td3-seg">{(["saw", "square"] as const).map((o) => <button key={o} type="button" className={onde === o ? "on" : ""} onClick={() => setOnde(o)}>{o === "saw" ? "Dent de scie" : "Pulse"}</button>)}</div>
      )}
      {id === "distortion" && (
        <div className="seg td3-seg">{[true, false].map((o) => <button key={String(o)} type="button" className={dist === o ? "on" : ""} onClick={() => setDist(o)}>{o ? "ON" : "OFF"}</button>)}</div>
      )}
      {sonore && (
        <div className="td3-ecoute">
          <button type="button" className={`px-btn ${joue ? "on" : ""}`} onClick={ecouter}>{joue ? "■ Stop" : "▶ Écouter en tournant"}</button>
          <span className="muted small">Approximation pédagogique, pas le son réel de la TD-3.{f.essai ? " Position de 0 (tout à gauche) à 10 (tout à droite)." : ""}</span>
        </div>
      )}
    </div>
  );
}

const MODES_POS = [
  { nom: "TRACK WRITE", t: "Écrire une track (suite de patterns).", proc: "trackwrite" },
  { nom: "TRACK PLAY", t: "Jouer une track.", proc: "trackplay" },
  { nom: "PATTERN PLAY", t: "Jouer les patterns. Mode sûr : rien ne s'efface.", proc: "jouer" },
  { nom: "PATTERN WRITE", t: "Écrire un pattern (notes, rythme, accent, slide).", proc: "nouveau" },
];
function DessinMode() {
  const [i, setI] = useState(2);
  const a = -60 + i * 40;
  return (
    <div className="td3-rot">
      <svg viewBox="0 0 200 130" className="td3-rot-svg" aria-hidden>
        {MODES_POS.map((m, k) => { const ang = ((-60 + k * 40 - 90) * Math.PI) / 180; return <circle key={m.nom} cx={100 + Math.cos(ang) * 62} cy={88 + Math.sin(ang) * 62} r="5" fill={k === i ? "#ff3b3b" : "#98a2b3"} />; })}
        <circle cx="100" cy="88" r="34" fill="#15171c" stroke="#f2c230" strokeWidth="3" />
        <line x1="100" y1="88" x2="100" y2="60" stroke="#f2c230" strokeWidth="5" strokeLinecap="round" transform={`rotate(${a} 100 88)`} />
      </svg>
      <div className="td3-rot-liste">
        {MODES_POS.map((m, k) => (
          <button key={m.nom} type="button" className={k === i ? "on" : ""} onClick={() => setI(k)}><Touche mode>{m.nom}</Touche><span>{m.t}</span></button>
        ))}
      </div>
    </div>
  );
}

function DessinTrack() {
  const groupes: [string, string][] = [["I", "tracks 1 et 2"], ["II", "tracks 3 et 4"], ["III", "tracks 5 et 6"], ["IV", "track 7"]];
  return (
    <div className="td3-groupes">
      {groupes.map(([g, t]) => (
        <div key={g} className="td3-groupe"><b>{g}</b><span>{t}</span><small>16 patterns : 1A à 8A, 1B à 8B</small></div>
      ))}
      <p className="muted small">Pour les patterns, le sélecteur choisit le groupe I à IV. Pour les tracks, il choisit la track 1 à 7 (et donc son groupe).</p>
    </div>
  );
}

const ROLE_TOUCHE: Record<string, string> = { "C#": "Avec FUNCTION en TRACK WRITE : DEL (retirer un pattern)", "D#": "Avec FUNCTION en TRACK WRITE : INS (insérer un pattern)", A: "Avec PITCH MODE en PATTERN PLAY : la note d'accordage (220 Hz)" };
function DessinClavier({ touche }: { touche: string | null }) {
  const [t, setT] = useState<string | null>(touche);
  useEffect(() => setT(touche), [touche]);
  const i = t ? BLANCHES.indexOf(t) : -1;
  return (
    <div className="td3-clav">
      <div className="td3-clav-dessin">
        {BLANCHES.map((n, k) => <button key={n} type="button" className={`b ${t === n ? "on" : ""}`} onClick={() => setT(n)}><b>{n}</b><small>PATTERN {k + 1}</small></button>)}
        {NOIRES.map(([n, apres]) => <button key={n} type="button" className={`n ${t === n ? "on" : ""}`} style={{ left: `${((apres + 1) / 8) * 100 - 4.5}%` }} onClick={() => setT(n)}>{n}{n === "C#" ? <small>DEL</small> : n === "D#" ? <small>INS</small> : null}</button>)}
      </div>
      <p className="td3-clav-info">
        {t ? <><Touche>{t}</Touche> En PITCH MODE : la note {t === "C'" ? "C aiguë" : t}.{i >= 0 && <> En lecture : PATTERN {i + 1}.</>} {ROLE_TOUCHE[t] && <><br />{avecTouches(ROLE_TOUCHE[t])}</>}</> : "Touche une note pour voir ses rôles."}
      </p>
    </div>
  );
}

function DessinBouton({ id }: { id: string }) {
  const f = FICHES_TD3[id];
  const p = PLACE[id];
  return (
    <div className="td3-gros-btn">
      <div className="td3-gros-btn-face">{p?.led && <i className="td3p-led on" />}</div>
      <div className="td3-imprime">
        {(f.imprime ?? [ctrl.get(id)!.nom]).map((t, i) => <span key={t} className={i === 0 ? "principal" : ""}>{t}</span>)}
      </div>
      {f.imprime && f.imprime.length > 1 && <p className="muted small">Une touche, {f.imprime.length} noms : son rôle change selon le mode.</p>}
    </div>
  );
}
