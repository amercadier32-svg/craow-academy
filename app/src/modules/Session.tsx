// Module « Session » : des défis chronométrés pour finir des sons au lieu de chercher la perfection.
// #session            choisir un défi (par durée, ☰ filtres, 🎲 au hasard, mes défis)
// #session/en-cours   le minuteur, le défi et les liens utiles ; puis la fin de session
// #session/historique toutes mes sessions, sessions finies et série de jours
// #session/defi-<id>  ouvre la liste sur un défi (lien d'un favori)
import { ChoixMode } from "../components/Lecteur";
import { lireTexte, ecrireTexte } from "../lib/stockage";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { DIFFICULTES, DUREES, TYPES_CONTRAINTE, type Contrainte, type Defi, type Difficulte, type Duree } from "../content/defis";
import { CATEGORIES, ELEMENTS, RECETTES } from "../content/recettes";
import { FICHE, STYLE_NOM, estStyle, useStyles, type Style } from "../content/styles";
import { Badge } from "../components/common";
import { Deroulant, ToutOuvrirFermer } from "../components/Deroulant";
import { Etoile } from "../components/Etoile";
import { Confirmer, FiltreMenu, fmVide, type FmGroupe, type FmValeur } from "../components/FiltreMenu";
import { PixelArt } from "../components/PixelArt";
import { effects } from "../lib/data";
import { gammeByN, GAMMES } from "../lib/music";
import { EnregistrerVersion } from "../components/Enregistreur";
import { MiniSpectre } from "../components/Visus";
import { effacerEnregistrement, garderEnregistrement, lireEnregistrement } from "../lib/recordings";
import { arreter, basculerPause, finirMaintenant, lancer, mmss, temps, useEnCours, useTic, type EnCours } from "../lib/sessionEnCours";
import { enregistrerSession, estFavori, garderDefiPerso, idFavori, listeDefisPerso, listeSessions, supprimerDefiPerso, supprimerSession, useStore, type SessionFaite } from "../lib/store";
import { MachineSession, defisDeMachine, machineDe, routeSession, useMachineSession } from "../lib/sessionMachines";
import "./session.css";

const FX = effects as unknown as { ifx: { types: { n: number; nom: string }[] }; mfx: { types: { n: number; nom: string }[] } };
export const nomIfx = (n: number) => FX.ifx.types.find((t) => t.n === n)?.nom ?? String(n);
export const nomMfx = (n: number) => FX.mfx.types.find((t) => t.n === n)?.nom ?? String(n);
const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const COUL_DUREE: Record<Duree, string> = { 10: "#4fd18b", 15: "#3fd6d0", 30: "#6aa2ee", 60: "#9b6bff" };
const coulDiff = (d: Difficulte) => DIFFICULTES.find((x) => x.id === d)!.couleur;
const nomDiff = (d: Difficulte) => DIFFICULTES.find((x) => x.id === d)!.nom;

// Style choisi pour lancer (et pour 🎲), retenu sur cet appareil.
const CLE_STYLE = "e2academy.session.style";
export function lireStyle(): Style | "" { const s = lireTexte(CLE_STYLE) ?? ""; return estStyle(s) ? s : ""; }
function ecrireStyle(s: string) { ecrireTexte(CLE_STYLE, s); }

/** Tous les défis d'une machine : ceux de l'app puis les miens. */
export function useDefis(machine?: string): Defi[] {
  const st = useStore();
  const ctx = useMachineSession();
  const m = machine ?? ctx;
  return useMemo(() => [...defisDeMachine(m), ...listeDefisPerso(st).filter((d) => machineDe(d) === m)], [st, m]);
}
/** Les sessions faites sur une machine. */
const sessionsDe = (st: Parameters<typeof listeSessions>[0], m: string) => listeSessions(st).filter((x) => machineDe(x) === m);
export const defiCompatible = (d: Defi, style: string) => !style || !d.styles?.length || d.styles.includes(style as Style);
/** Le style avec lequel un défi se lance : celui choisi s'il convient, sinon le premier du défi. */
export const styleDeLancement = (d: Defi, style: string) => (d.styles?.length ? (d.styles.includes(style as Style) ? style : d.styles[0]) : style || undefined);

/** Lance un défi et ouvre la page de la session. */
export function lancerDefi(d: Defi, style?: string) { lancer(d, style); location.hash = `${routeSession(machineDe(d))}/en-cours`; }
/** 🎲 : un défi au hasard parmi ceux qui conviennent au style (et à la durée si elle est donnée). */
export function defiAuHasard(defis: Defi[], style: string, duree?: Duree): Defi | undefined {
  const ok = defis.filter((d) => defiCompatible(d, style) && (!duree || d.duree === duree));
  return ok[Math.floor(Math.random() * ok.length)];
}

export default function Session({ focus, machine = "electribe2" }: { focus?: string; machine?: string }) {
  return (
    <MachineSession.Provider value={machine}>
      {focus === "en-cours" ? <EnCoursVue /> : focus === "historique" ? <Historique /> : <Choisir focus={focus?.startsWith("defi-") ? focus.slice(5) : undefined} />}
    </MachineSession.Provider>
  );
}

// ============================================================ Choisir un défi
function Choisir({ focus }: { focus?: string }) {
  const M = useMachineSession(); const R = routeSession(M);
  const st = useStore();
  const defis = useDefis();
  const enCours = useEnCours();
  const { visibles } = useStyles();
  const [style, setStyle] = useState<string>(lireStyle);
  const choisirStyle = (s: string) => { setStyle(s); ecrireStyle(s); };
  const groupes: FmGroupe[] = [
    { id: "duree", titre: "Durée", options: DUREES.map((d) => ({ id: String(d), nom: `${d} min`, couleur: COUL_DUREE[d], n: defis.filter((x) => x.duree === d && defiCompatible(x, style)).length })) },
    { id: "diff", titre: "Difficulté", options: DIFFICULTES.map((d) => ({ id: d.id, nom: d.nom, couleur: d.couleur })) },
    { id: "contrainte", titre: "Contrainte", options: TYPES_CONTRAINTE.map((t) => ({ id: t.id, nom: t.nom })) },
    { id: "autres", titre: "Afficher", options: [{ id: "favoris", nom: "★ Mes favoris" }, { id: "perso", nom: "Mes défis" }] },
  ];
  const [f, setF] = useState<FmValeur>(() => fmVide(groupes));
  const [hasard, setHasard] = useState<Defi | null>(null);
  const [creer, setCreer] = useState(false);
  const visiblesDefis = defis.filter((d) => defiCompatible(d, style)
    && (!f.duree?.length || f.duree.includes(String(d.duree)))
    && (!f.diff?.length || f.diff.includes(d.difficulte))
    && (!f.contrainte?.length || d.contraintes.some((c) => f.contrainte.includes(c.type)))
    && (!f.autres?.includes("favoris") || estFavori(st, idFavori("defi", d.id)))
    && (!f.autres?.includes("perso") || d.perso));
  const focusDefi = focus ? defis.find((d) => d.id === focus) : undefined;
  useEffect(() => { if (focus) setTimeout(() => document.getElementById(`defi-${focus}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 300); }, [focus]);
  const nbFinies = sessionsDe(st, M).filter((x) => x.statut === "finie").length;
  const persos = visiblesDefis.filter((d) => d.perso);

  const tirer = () => { const d = defiAuHasard(visiblesDefis.length ? visiblesDefis : defis, style); if (d) setHasard(d); };

  return (
    <div className="session-page">
      <h2 className="page-title"><PixelArt name="session" size={36} /> Session</h2>
      <p className="ss-intro">Choisis un défi, lance le minuteur, et quand le temps est écoulé, enregistre ce que tu as, même si ce n'est pas parfait. <Badge kind="pratique" /></p>

      {enCours && (
        <a className="ss-reprendre" href={`${R}/en-cours`}>
          <span>⏱ Session en cours : <b>{enCours.defi.titre}</b></span><span className="px-btn green">Revenir à la session</span>
        </a>
      )}

      <div className="ss-top">
        <div className="ss-styles" role="radiogroup" aria-label="Style du défi">
          <span className="ss-lbl">Style :</span>
          <button type="button" role="radio" aria-checked={!style} className={`ss-style ${!style ? "on" : ""}`} onClick={() => choisirStyle("")}>Tous</button>
          {visibles.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={style === s.id} className={`ss-style ${style === s.id ? "on" : ""}`} style={{ "--sc": s.couleur } as CSSProperties} onClick={() => choisirStyle(s.id)}>{s.nom}</button>
          ))}
        </div>
        <div className="ss-actions">
          <button type="button" className="px-btn ss-de" onClick={tirer}>🎲 Défi au hasard</button>
          <a className="e2-ui-btn" href={`${R}/historique`}>📜 Historique ({nbFinies} finie{nbFinies > 1 ? "s" : ""})</a>
        </div>
      </div>

      {hasard && (
        <div className="ss-tirage">
          <p className="ss-tirage-titre">🎲 Ton défi{style ? ` en ${STYLE_NOM[style as Style]}` : ""} :</p>
          <CarteDefi d={hasard} style={style} grande />
          <div className="ss-tirage-btns">
            <button type="button" className="e2-ui-btn" onClick={tirer}>🎲 Un autre</button>
            <button type="button" className="e2-ui-btn" onClick={() => setHasard(null)}>✕ Fermer</button>
          </div>
        </div>
      )}

      <FiltreMenu groupes={groupes} valeur={f} onChange={setF} resultat={`${visiblesDefis.length} défi${visiblesDefis.length > 1 ? "s" : ""}`} />

      <ToutOuvrirFermer ids={[...DUREES.map((d) => `session.duree.${d}`), "session.miens"]} />
      {DUREES.map((d) => {
        const liste = visiblesDefis.filter((x) => x.duree === d && !x.perso);
        if (!liste.length) return null;
        return (
          <Deroulant key={d} id={`session.duree.${d}`} petit defaut={d === 15} ouvrir={focusDefi?.duree === d && !focusDefi.perso} icone="session" couleur={COUL_DUREE[d]}
            titre={`${d} minutes`} texte={d === 10 ? "Un son, vite fait." : d === 15 ? "Un son fini, ou deux parties." : d === 30 ? "Une boucle de 4 mesures." : "Un morceau, de l'intro au drop."} badge={liste.length}>
            <ul className="ss-liste">{liste.map((x) => <li key={x.id}><CarteDefi d={x} style={style} vise={x.id === focus} /></li>)}</ul>
          </Deroulant>
        );
      })}
      <Deroulant id="session.miens" petit ouvrir={Boolean(focusDefi?.perso) || creer} icone="carnet" couleur="#ffd84d" titre="Mes défis" texte="Les défis que tu crées, avec tes propres contraintes." badge={persos.length}>
        {persos.length > 0 && <ul className="ss-liste">{persos.map((x) => <li key={x.id}><CarteDefi d={x} style={style} vise={x.id === focus} /></li>)}</ul>}
        {creer ? <CreerDefi style={style} onFin={() => setCreer(false)} /> : <button type="button" className="px-btn" onClick={() => setCreer(true)}>＋ Créer un défi</button>}
      </Deroulant>
    </div>
  );
}

export function CarteDefi({ d, style, grande, vise }: { d: Defi; style: string; grande?: boolean; vise?: boolean }) {
  const [suppr, setSuppr] = useState(false);
  const sl = styleDeLancement(d, style);
  return (
    <article id={`defi-${d.id}`} className={`ss-carte ${grande ? "grande" : ""} ${vise ? "vise" : ""}`} style={{ "--cc": COUL_DUREE[d.duree] } as CSSProperties}>
      <div className="ss-carte-tete">
        <span className="ss-duree">{d.duree} min</span>
        <span className="ss-diff" style={{ "--dc": coulDiff(d.difficulte) } as CSSProperties}>{nomDiff(d.difficulte)}</span>
        {d.perso ? <Badge kind="obs" /> : null}
        <Etoile type="defi" cle={d.id} titre={d.titre} className="ss-etoile" />
      </div>
      <h3 className="ss-carte-titre">{d.titre}</h3>
      <p className="ss-objectif">{d.objectif}</p>
      <ul className="ss-contraintes">{d.contraintes.map((c, i) => <li key={i}><b>{TYPES_CONTRAINTE.find((t) => t.id === c.type)?.nom}</b> {c.texte}</li>)}</ul>
      <p className="ss-styles-d small muted">{d.styles?.length ? d.styles.map((s) => STYLE_NOM[s]).join(", ") : "Tous les styles"}</p>
      <div className="ss-carte-btns">
        <button type="button" className="px-btn green" onClick={() => lancerDefi(d, sl)}>▶ Lancer{sl ? ` en ${STYLE_NOM[sl as Style]}` : ""}</button>
        {d.perso && <button type="button" className="chipbtn" onClick={() => setSuppr(true)}>🗑 Supprimer</button>}
      </div>
      {suppr && <Confirmer texte={`Supprimer le défi « ${d.titre} » ?`} detail="Tes sessions déjà faites avec ce défi restent dans l'historique." oui="Supprimer" onNon={() => setSuppr(false)} onOui={() => { supprimerDefiPerso(d.id); setSuppr(false); }} />}
    </article>
  );
}

// ------------------------------------------------------------ Créer un défi
function CreerDefi({ style, onFin }: { style: string; onFin: () => void }) {
  const M = useMachineSession();
  const [titre, setTitre] = useState("");
  const [duree, setDuree] = useState<Duree>(15);
  const [diff, setDiff] = useState<Difficulte>("moyen");
  const [st, setSt] = useState<string>(style);
  const [objectif, setObjectif] = useState("");
  const [element, setElement] = useState("");
  const [osc, setOsc] = useState(false);
  const [parties, setParties] = useState("");
  const [gamme, setGamme] = useState("");
  const [key, setKey] = useState("");
  const [ifx, setIfx] = useState("");
  const [mfx, setMfx] = useState("");
  const [bpm, setBpm] = useState("");
  const [autres, setAutres] = useState("");
  const ok = titre.trim().length > 0;
  const garder = () => {
    const contraintes: Contrainte[] = [];
    if (osc) contraintes.push({ type: "osc", texte: "Un seul oscillateur pour toutes les parties." });
    if (parties) contraintes.push({ type: "parties", texte: `${parties} partie${Number(parties) > 1 ? "s" : ""} maximum.` });
    if (gamme) contraintes.push({ type: "gamme", texte: `${key ? `KEY = ${key}, ` : ""}SCALE = ${gamme} ${gammeByN.get(Number(gamme))?.nom ?? ""}.` });
    if (ifx) contraintes.push({ type: "effet", texte: `Insert FX = ${ifx} ${nomIfx(Number(ifx))}.` });
    if (mfx) contraintes.push({ type: "effet", texte: `Master FX = ${mfx} ${nomMfx(Number(mfx))}.` });
    if (bpm) contraintes.push({ type: "bpm", texte: `BPM = ${bpm}.` });
    for (const l of autres.split("\n").map((x) => x.trim()).filter(Boolean)) contraintes.push({ type: "autre", texte: l });
    const d: Defi = {
      id: `perso-${Date.now().toString(36)}`, titre: titre.trim(), duree, difficulte: diff, styles: st ? [st as Style] : undefined,
      objectif: objectif.trim() || "Finir dans le temps, même si ce n'est pas parfait.", contraintes, elements: element ? [element] : [],
      gamme: gamme ? Number(gamme) : undefined, key: key || undefined, ifx: ifx ? Number(ifx) : undefined, mfx: mfx ? Number(mfx) : undefined, bpm: bpm ? Number(bpm) : undefined, perso: true, machine: M,
    };
    garderDefiPerso(d);
    onFin();
  };
  return (
    <div className="ss-creer">
      <label className="ss-champ large">Titre du défi<input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. « Une basse acide en 10 min »" /></label>
      <label className="ss-champ">Durée<select value={duree} onChange={(e) => setDuree(Number(e.target.value) as Duree)}>{DUREES.map((d) => <option key={d} value={d}>{d} min</option>)}</select></label>
      <label className="ss-champ">Difficulté<select value={diff} onChange={(e) => setDiff(e.target.value as Difficulte)}>{DIFFICULTES.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}</select></label>
      <label className="ss-champ">Style<select value={st} onChange={(e) => setSt(e.target.value)}><option value="">Tous les styles</option>{Object.entries(STYLE_NOM).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
      <label className="ss-champ">Recettes utiles<select value={element} onChange={(e) => setElement(e.target.value)}><option value="">Aucune</option>{CATEGORIES.map((c) => <optgroup key={c.id} label={c.nom}>{c.elements.map((el) => <option key={el.id} value={el.id}>{el.nom}</option>)}</optgroup>)}</select></label>
      <label className="ss-champ large">Ce que je dois avoir à la fin<input type="text" value={objectif} onChange={(e) => setObjectif(e.target.value)} placeholder="Ex. « 1 mesure de basse qui tourne avec le kick »" /></label>
      <fieldset className="ss-contr">
        <legend>Contraintes (facultatives)</legend>
        <label className="ss-check"><input type="checkbox" checked={osc} onChange={(e) => setOsc(e.target.checked)} /> Un seul oscillateur</label>
        <label className="ss-champ">Parties max<input type="number" min={1} max={16} value={parties} onChange={(e) => setParties(e.target.value)} placeholder="—" /></label>
        <label className="ss-champ">KEY<select value={key} onChange={(e) => setKey(e.target.value)}><option value="">—</option>{KEYS.map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className="ss-champ">SCALE<select value={gamme} onChange={(e) => setGamme(e.target.value)}><option value="">—</option>{GAMMES.map((g) => <option key={g.n} value={g.n}>{g.n} {g.nom}</option>)}</select></label>
        <label className="ss-champ">Insert FX<select value={ifx} onChange={(e) => setIfx(e.target.value)}><option value="">—</option>{FX.ifx.types.map((t) => <option key={t.n} value={t.n}>{t.n} {t.nom}</option>)}</select></label>
        <label className="ss-champ">Master FX<select value={mfx} onChange={(e) => setMfx(e.target.value)}><option value="">—</option>{FX.mfx.types.map((t) => <option key={t.n} value={t.n}>{t.n} {t.nom}</option>)}</select></label>
        <label className="ss-champ">BPM<input type="number" min={20} max={300} value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="—" /></label>
        <label className="ss-champ large">Autres contraintes (une par ligne)<textarea rows={2} value={autres} onChange={(e) => setAutres(e.target.value)} placeholder="Ex. « Pas de Master FX »" /></label>
      </fieldset>
      <div className="ss-creer-btns">
        <button type="button" className="px-btn green" disabled={!ok} onClick={garder}>Garder ce défi</button>
        <button type="button" className="e2-ui-btn" onClick={onFin}>Annuler</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Liens utiles d'un défi
export interface Lien { href: string; nom: string; type: string }
export function liensDefi(d: Defi, style?: string): Lien[] {
  const l: Lien[] = [];
  for (const el of d.elements) {
    const toutes = RECETTES.filter((r) => r.element === el && !r.kit);
    const du = style ? toutes.filter((r) => r.styles.includes(style as Style)) : [];
    for (const r of (du.length ? du : toutes).slice(0, 2)) l.push({ href: `#recettes/${r.id}`, nom: r.nom, type: `Recette · ${ELEMENTS.get(el as never)?.nom ?? el}` });
  }
  const g = d.gamme ?? (style && estStyle(style) ? FICHE[style].gammes[0]?.n : undefined);
  if (g) l.push({ href: `#gammes/${g}`, nom: `SCALE ${g} ${gammeByN.get(g)?.nom ?? ""}`, type: d.gamme ? "Gamme imposée" : "Gamme du style" });
  if (d.ifx) l.push({ href: `#effets/ifx-${d.ifx}`, nom: `${d.ifx} ${nomIfx(d.ifx)}`, type: "Insert FX imposé" });
  if (d.mfx) l.push({ href: `#effets/mfx-${d.mfx}`, nom: `${d.mfx} ${nomMfx(d.mfx)}`, type: "Master FX imposé" });
  if (style && estStyle(style)) l.push({ href: `#styles/${style}`, nom: `Fiche ${STYLE_NOM[style]}`, type: "Style" });
  if (d.morceau || d.duree === 60) l.push({ href: "#morceau", nom: "Construire un morceau", type: "Structure" });
  return l;
}

// ============================================================ Pendant la session, puis la fin
function EnCoursVue() {
  const M = useMachineSession(); const R = routeSession(M);
  const x = useEnCours();
  useTic(Boolean(x));
  if (!x) return (
    <div className="session-page">
      <h2 className="page-title"><PixelArt name="session" size={36} /> Session</h2>
      <p className="ss-intro">Pas de session en cours.</p>
      <p style={{ textAlign: "center" }}><a className="px-btn" href={R}>Choisir un défi</a></p>
    </div>
  );
  const t = temps(x);
  if (t.restant <= 0) return <Fin x={x} />;
  return <Minuteur x={x} t={t} />;
}

function Minuteur({ x, t }: { x: EnCours; t: ReturnType<typeof temps> }) {
  const M = useMachineSession(); const R = routeSession(M);
  const d = x.defi;
  const [stop, setStop] = useState(false);
  const pause = Boolean(x.pauseDepuis);
  const bpm = d.bpm ?? (x.style && estStyle(x.style) ? FICHE[x.style].bpm.defaut : undefined);
  const part = t.ecoule / t.total;
  const alerte = t.restant <= 60000 ? "une" : t.restant <= 300000 ? "cinq" : "";
  return (
    <div className="session-page ss-encours">
      <div className={`ss-chrono ${pause ? "pause" : ""} ${alerte}`} role="timer" aria-live="off">
        <div className="ss-chrono-temps">{mmss(t.restant)}</div>
        <div className="ss-chrono-barre" aria-hidden><span style={{ width: `${part * 100}%` }} /></div>
        <div className="ss-chrono-btns">
          <button type="button" className="px-btn" onClick={basculerPause}>{pause ? "▶ Reprendre" : "⏸ Pause"}</button>
          <button type="button" className="px-btn green" onClick={finirMaintenant}>✓ J'ai fini</button>
          <button type="button" className="e2-ui-btn" onClick={() => setStop(true)}>✕ Abandonner</button>
        </div>
        {pause && <p className="ss-chrono-info">En pause. Le temps ne compte plus.</p>}
        {alerte === "cinq" && !pause && <p className="ss-chrono-info">Plus que 5 minutes : commence à fixer ce que tu as.</p>}
        {alerte === "une" && !pause && <p className="ss-chrono-info">Dernière minute : sauvegarde ton motif sur l'E2.</p>}
      </div>

      <section className="ss-defi-grand" style={{ "--cc": COUL_DUREE[d.duree] } as CSSProperties}>
        <p className="ss-defi-meta">{d.duree} min · {nomDiff(d.difficulte)}{x.style && estStyle(x.style) ? ` · ${STYLE_NOM[x.style]}` : ""}{bpm ? ` · ${bpm} BPM` : ""}</p>
        <h2>{d.titre}</h2>
        <p className="ss-defi-objectif">🎯 {d.objectif}</p>
        {d.contraintes.length > 0 && <ul className="ss-defi-contraintes">{d.contraintes.map((c, i) => <li key={i}>{c.texte}</li>)}</ul>}
      </section>

      <section className="ss-spectre"><MiniSpectre texte="Le son de l'E2 en direct : le minuteur continue." /></section>

      <section className="ss-liens">
        <h3>Liens utiles <small className="muted">· le minuteur continue pendant que tu les consultes</small></h3>
        <ul>{liensDefi(d, x.style).map((l) => <li key={l.href + l.nom}><a href={l.href}><span>{l.type}</span><b>{l.nom}</b></a></li>)}</ul>
      </section>
      {stop && <Confirmer texte="Abandonner cette session ?" detail="Rien n'est enregistré. Tu peux plutôt cliquer « J'ai fini » pour garder une trace, même imparfaite." oui="Abandonner" onNon={() => setStop(false)} onOui={() => { arreter(); location.hash = R; }} />}
    </div>
  );
}

function Fin({ x }: { x: EnCours }) {
  const M = useMachineSession(); const R = routeSession(M);
  const [note, setNote] = useState(0);
  const [statut, setStatut] = useState<"finie" | "a-reprendre">("finie");
  const [pattern, setPattern] = useState("");
  const [marche, setMarche] = useState("");
  const [difficile, setDifficile] = useState("");
  const [referais, setReferais] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [enCours, setEnCours] = useState(false);
  const patternOk = !pattern || (/^\d+$/.test(pattern) && Number(pattern) >= 1 && Number(pattern) <= 250);
  const garder = async () => {
    if (!patternOk) return;
    setEnCours(true); setErr("");
    const id = `s-${Date.now().toString(36)}`;
    try {
      if (fichier) await garderEnregistrement(`session:${id}`, { nom: fichier.name, blob: fichier, ajouteLe: new Date().toISOString() });
    } catch { setErr("L'enregistrement audio n'a pas pu être gardé dans ce navigateur (stockage plein ou bloqué). La session est quand même enregistrée."); }
    const t = temps(x);
    const s: SessionFaite = {
      id, defiId: x.defi.id, titre: x.defi.titre, style: x.style, duree: x.defi.duree, dureeReelle: Math.round(t.ecoule / 1000), le: new Date().toISOString(),
      note, statut, pattern, marche: marche.trim(), difficile: difficile.trim(), referais: referais.trim(), audioNom: fichier?.name, machine: machineDe(x.defi), majLe: "",
    };
    enregistrerSession(s);
    arreter();
    location.hash = `${R}/historique`;
  };
  return (
    <div className="session-page ss-fin">
      <div className="ss-fin-msg">
        <PixelArt name="session" size={64} />
        <p><b>Temps écoulé : enregistre ce que tu as, même si ce n'est pas parfait.</b></p>
        <p className="muted">{x.defi.titre}{x.style && estStyle(x.style) ? ` · ${STYLE_NOM[x.style]}` : ""}</p>
      </div>
      <div className="ss-fin-form">
        <div className="ss-champ large">Mon enregistrement
          <EnregistrerVersion source={{ module: "session", titre: x.defi.titre, href: `${R}/historique` }} bpm={x.defi.bpm} sansVersions garderDansListe={false}
            libelle="● Enregistrer maintenant" texte="Joue ton motif sur l'E2 : la prise est gardée avec la session."
            utiliser={{ libelle: "✓ Garder pour cette session", action: (f) => setFichier(f) }} />
          {fichier && <small className="ok">✓ {fichier.name} sera gardé avec la session.</small>}
          <label className="small muted">Ou un fichier WAV enregistré ailleurs : <input type="file" accept=".wav,audio/wav,audio/x-wav,audio/*" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} /></label>
          <small className="muted">Il reste dans ce navigateur, pour le réécouter dans l'historique et dans Mes enregistrements.</small>
        </div>
        <label className="ss-champ">Motif sur l'E2 (1 à 250)
          <input type="text" inputMode="numeric" value={pattern} onChange={(e) => setPattern(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="Ex. 042" />
          {!patternOk && <small className="ss-err">L'E2 a 250 motifs : un numéro entre 1 et 250.</small>}
        </label>
        <label className="ss-champ large">Ce qui a marché<textarea rows={2} value={marche} onChange={(e) => setMarche(e.target.value)} /></label>
        <label className="ss-champ large">Ce qui était difficile<textarea rows={2} value={difficile} onChange={(e) => setDifficile(e.target.value)} /></label>
        <label className="ss-champ large">Ce que je referais<textarea rows={2} value={referais} onChange={(e) => setReferais(e.target.value)} /></label>
        <div className="ss-champ">Ma note
          <Note valeur={note} onChange={setNote} />
        </div>
        <div className="ss-champ">Statut
          <div className="ss-statut" role="radiogroup">
            <button type="button" role="radio" aria-checked={statut === "finie"} className={statut === "finie" ? "on" : ""} onClick={() => setStatut("finie")}>✓ Finie</button>
            <button type="button" role="radio" aria-checked={statut === "a-reprendre"} className={statut === "a-reprendre" ? "on" : ""} onClick={() => setStatut("a-reprendre")}>↻ À reprendre</button>
          </div>
        </div>
        {err && <p className="ss-err">{err}</p>}
        <div className="ss-creer-btns">
          <button type="button" className="px-btn green" disabled={!patternOk || enCours} onClick={() => void garder()}>Enregistrer la session</button>
        </div>
      </div>
    </div>
  );
}

function Note({ valeur, onChange }: { valeur: number; onChange?: (n: number) => void }) {
  return (
    <span className={`ss-note ${onChange ? "edit" : ""}`} role={onChange ? "radiogroup" : undefined} aria-label={`Note : ${valeur} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => onChange
        ? <button key={n} type="button" role="radio" aria-checked={valeur === n} aria-label={`${n} sur 5`} className={n <= valeur ? "on" : ""} onClick={() => onChange(valeur === n ? 0 : n)}>★</button>
        : <span key={n} className={n <= valeur ? "on" : ""} aria-hidden>★</span>)}
    </span>
  );
}

// ============================================================ Historique
const jour = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** Série de jours consécutifs avec au moins une session (jusqu'à aujourd'hui ou hier), et le record. */
export function series(sessions: SessionFaite[]) {
  const jours = new Set(sessions.map((s) => jour(s.le)));
  const recule = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - 1); return x; };
  let d = new Date();
  if (!jours.has(jour(d.toISOString()))) d = recule(d);
  let actuelle = 0;
  while (jours.has(jour(d.toISOString()))) { actuelle++; d = recule(d); }
  const tri = [...jours].sort();
  let record = 0, run = 0, prev = "";
  for (const j of tri) {
    const veille = prev ? jour(new Date(new Date(prev + "T12:00:00").getTime() + 86400000).toISOString()) : "";
    run = prev && veille === j ? run + 1 : 1;
    record = Math.max(record, run); prev = j;
  }
  return { actuelle, record };
}

function Historique() {
  const M = useMachineSession(); const R = routeSession(M);
  const st = useStore();
  const defis = useDefis();
  const sessions = sessionsDe(st, M);
  const finies = sessions.filter((s) => s.statut === "finie").length;
  const { actuelle, record } = series(sessions);
  const totalMin = Math.round(sessions.reduce((a, s) => a + s.dureeReelle, 0) / 60);
  const mois = new Map<string, SessionFaite[]>();
  for (const s of sessions) { const k = s.le.slice(0, 7); mois.set(k, [...(mois.get(k) ?? []), s]); }
  const nomMois = (k: string) => new Date(`${k}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const cles = [...mois.keys()];
  return (
    <div className="session-page">
      <div className="ss-hist-top">
        <h2 className="page-title"><PixelArt name="session" size={36} /> Mes sessions</h2>
        <a className="e2-ui-btn" href={R}>← Choisir un défi</a>
      </div>
      <div className="ss-stats">
        <div><b>{finies}</b><span>session{finies > 1 ? "s" : ""} finie{finies > 1 ? "s" : ""}</span></div>
        <div><b>{actuelle}</b><span>jour{actuelle > 1 ? "s" : ""} d'affilée</span></div>
        <div><b>{record}</b><span>record de jours</span></div>
        <div><b>{totalMin}</b><span>minutes au total</span></div>
      </div>
      {sessions.length === 0 ? (
        <p className="drl-vide">Pas encore de session. Lance un défi : à la fin, il apparaîtra ici avec ta note et ton enregistrement.</p>
      ) : (
        <>
          <ToutOuvrirFermer ids={cles.map((k) => `session.hist.${k}`)} />
          {cles.map((k, i) => (
            <Deroulant key={k} id={`session.hist.${k}`} petit defaut={i === 0} icone="session" couleur="#3fd6d0" titre={nomMois(k).replace(/^./, (c) => c.toUpperCase())}
              texte={`${mois.get(k)!.filter((s) => s.statut === "finie").length} finie(s), ${mois.get(k)!.filter((s) => s.statut === "a-reprendre").length} à reprendre`} badge={mois.get(k)!.length}>
              <ul className="ss-hist">{mois.get(k)!.map((s) => <LigneSession key={s.id} s={s} defi={defis.find((d) => d.id === s.defiId)} />)}</ul>
            </Deroulant>
          ))}
        </>
      )}
      <p className="small muted ss-note-export">Les sessions partent avec « Exporter mes relevés » (Carnet). Les enregistrements audio restent dans ce navigateur : ils ne sont pas copiés dans le fichier.</p>
    </div>
  );
}

function LigneSession({ s, defi }: { s: SessionFaite; defi?: Defi }) {
  const [suppr, setSuppr] = useState(false);
  const date = new Date(s.le).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const reel = Math.round(s.dureeReelle / 60);
  return (
    <li className={`ss-hist-ligne ${s.statut}`}>
      <div className="ss-hist-tete">
        <span className="ss-hist-date">{date}</span>
        <b className="ss-hist-titre">{s.titre}</b>
        <span className={`ss-hist-statut ${s.statut}`}>{s.statut === "finie" ? "✓ Finie" : "↻ À reprendre"}</span>
      </div>
      <div className="ss-hist-infos">
        <span>{s.duree} min prévues · {reel} min passées</span>
        {s.style && estStyle(s.style) && <span>{STYLE_NOM[s.style]}</span>}
        {s.pattern && <span>Motif <kbd>{s.pattern.padStart(3, "0")}</kbd></span>}
        <Note valeur={s.note} />
      </div>
      {(s.marche || s.difficile || s.referais) && (
        <dl className="ss-hist-notes">
          {s.marche && <><dt>Ce qui a marché</dt><dd>{s.marche}</dd></>}
          {s.difficile && <><dt>Difficile</dt><dd>{s.difficile}</dd></>}
          {s.referais && <><dt>Je referais</dt><dd>{s.referais}</dd></>}
        </dl>
      )}
      <div className="ss-hist-btns">
        {s.audioNom && <Ecoute id={`session:${s.id}`} nom={s.audioNom} />}
        {defi && <button type="button" className="chipbtn" onClick={() => lancerDefi(defi, s.style)}>▶ {s.statut === "a-reprendre" ? "Reprendre ce défi" : "Relancer ce défi"}</button>}
        <button type="button" className="chipbtn" onClick={() => setSuppr(true)}>🗑</button>
      </div>
      {suppr && <Confirmer texte={`Supprimer la session « ${s.titre} » du ${date} ?`} detail="Son enregistrement audio est effacé aussi." oui="Supprimer" onNon={() => setSuppr(false)} onOui={() => { supprimerSession(s.id); void effacerEnregistrement(`session:${s.id}`).catch(() => {}); setSuppr(false); }} />}
    </li>
  );
}

/** Réécouter l'enregistrement d'une session : une fois ou en boucle. */
function Ecoute({ id, nom }: { id: string; nom: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [boucle, setBoucle] = useState(false);
  const [absent, setAbsent] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const charger = async () => {
    try {
      const e = await lireEnregistrement(id);
      if (!e) { setAbsent(true); return; }
      setUrl(URL.createObjectURL(e.blob));
      setTimeout(() => void audio.current?.play().catch(() => {}), 50);
    } catch { setAbsent(true); }
  };
  if (absent) return <span className="small muted">🎧 {nom} : pas dans ce navigateur.</span>;
  if (!url) return <button type="button" className="chipbtn" onClick={() => void charger()}>🎧 Écouter {nom}</button>;
  return (
    <span className="ss-ecoute">
      <audio ref={audio} src={url} controls loop={boucle} />
      <ChoixMode mode={boucle ? "loop" : "once"} onChange={(m) => setBoucle(m === "loop")} />
    </span>
  );
}
