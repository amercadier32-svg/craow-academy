// Page « Styles » : la fiche de chaque style (#styles, #styles/<id>) et « Gérer les styles » (#styles/gerer).
// Les fiches viennent de data/electribe2/styles.json (badge « Pratique »). Ordre, couleurs et styles masqués : lib/store.ts.
import { Infos } from "../components/Rangement";
import { useEffect, useState, type CSSProperties } from "react";
import { Deroulant, ToutOuvrirFermer } from "../components/Deroulant";
import { Badge } from "../components/common";
import { SelecteurStyles } from "../components/Styles";
import { Confirmer } from "../components/Confirmer";
import { FICHE, SOURCE_STYLES, STYLE_NOM, estStyle, useStyles, type Style, type StyleVu } from "../content/styles";
import { ELEMENTS, RECETTES } from "../content/recettes";
import { VIDES_STYLES } from "../content/recettesStylesSuite";
import { effects } from "../lib/data";
import { gammeByN } from "../lib/music";
import { setStylesPrefs, useStore } from "../lib/store";

const FX = effects as unknown as { ifx: { types: { n: number; nom: string }[] }; mfx: { types: { n: number; nom: string }[] } };
const nomIfx = (n: number) => FX.ifx.types.find((t) => t.n === n)?.nom ?? String(n);
const nomMfx = (n: number) => FX.mfx.types.find((t) => t.n === n)?.nom ?? String(n);

export default function Styles({ focus }: { focus?: string }) {
  if (focus === "gerer") return <Gerer />;
  return <Fiches focus={focus && estStyle(focus) ? focus : undefined} />;
}

function Retour() {
  return <a className="e2-ui-btn" href="#recettes">← Recettes</a>;
}

function Fiches({ focus }: { focus?: Style }) {
  const { tous, visibles } = useStyles();
  const [choix, setChoix] = useState<Style[]>(focus ? [focus] : []);
  useEffect(() => { if (focus) document.getElementById(`fiche-${focus}`)?.scrollIntoView({ block: "start" }); }, [focus]);
  const vus = choix.length ? tous.filter((s) => choix.includes(s.id)) : visibles;
  return (
    <div className="styles-page">
      <div className="styles-top">
        <h2 className="page-title">Les styles</h2>
        <span className="gerer-btns"><Retour /><a className="e2-ui-btn" href="#styles/gerer">🎨 Gérer les styles</a></span>
      </div>
      <p className="small muted"><Badge kind="pratique" /> {SOURCE_STYLES}</p>
      <SelecteurStyles valeur={choix} onChange={setChoix} label="Voir la fiche du style" tous="Toutes les fiches" />
      <ToutOuvrirFermer ids={vus.map((s) => `styles.${s.id}`)} />
      {vus.map((s) => (
        <Deroulant key={s.id} id={`styles.${s.id}`} petit icone="recettes" couleur={s.couleur} ouvrir={focus === s.id || choix.length === 1}
          titre={s.nom} texte={s.caractere[0]} badge={`${s.bpm.min}-${s.bpm.max} BPM`}>
          <Fiche s={s} />
        </Deroulant>
      ))}
      {!choix.length && tous.length > visibles.length && (
        <p className="small muted">{tous.length - visibles.length} style{tous.length - visibles.length > 1 ? "s" : ""} masqué{tous.length - visibles.length > 1 ? "s" : ""} : {tous.filter((s) => s.masque).map((s) => s.nom).join(", ")}. Réaffiche-les dans « Gérer les styles ».</p>
      )}
    </div>
  );
}

function Fiche({ s }: { s: StyleVu }) {
  const n = RECETTES.filter((x) => x.styles.includes(s.id)).length;
  return (
    <article id={`fiche-${s.id}`} className={`fiche-st ${s.masque ? "masque" : ""}`} style={{ "--sc": s.couleur } as CSSProperties}>
      <h3>{s.nom} <span className="bpm">{s.bpm.min} à {s.bpm.max} BPM</span> <Badge kind="pratique" />{s.masque && <small className="muted">(masqué)</small>}</h3>
      <p className="caractere"><span>{s.caractere[0]}</span><span>{s.caractere[1]}</span></p>
      <div className="fiche-grille">
        <div><h4>Kick</h4><p>{s.kick}</p></div>
        <div><h4>Basse</h4><p>{s.basse}</p></div>
        <div><h4>Mélodie</h4><p>{s.melodie}</p></div>
        <div><h4>Gammes conseillées</h4>
          <ul>{s.gammes.map((g) => <li key={g.n}><a href={`#gammes/${g.n}`}>SCALE = {gammeByN.get(g.n)?.nom}</a> : {g.pourquoi}</li>)}</ul>
        </div>
        <div><h4>Effets typiques</h4>
          <p>{s.effets.texte}</p>
          <p className="small">IFX : {s.effets.ifx.map((x, i) => <span key={x}>{i > 0 && ", "}<a href={`#effets/ifx-${x}`}>{x} {nomIfx(x)}</a></span>)}<br />
            MFX : {s.effets.mfx.map((x, i) => <span key={x}>{i > 0 && ", "}<a href={`#effets/mfx-${x}`}>{x} {nomMfx(x)}</a></span>)}</p>
        </div>
        <div><h4>Structure courante</h4><p>{s.structure}</p></div>
        <div><h4>BPM habituel</h4><p>Souvent entre {s.bpm.min} et {s.bpm.max} BPM ; le générateur 🎲 part de {s.bpm.defaut} BPM en mode Sage. Ce n'est qu'un ordre de grandeur : ça varie selon les morceaux.</p></div>
      </div>
      {s.differences.length > 0 && (
        <div className="fiche-diff">
          {s.differences.map((d) => <p key={d.avec}><b>{s.nom} ou {STYLE_NOM[d.avec]} ?</b> {d.texte}</p>)}
        </div>
      )}
      {(VIDES_STYLES[s.id]?.length ?? 0) > 0 && (
        <Infos titre={`Pas de recette ${s.nom} pour ${VIDES_STYLES[s.id].length} sous-catégories (voulu)`}>
          <p className="small muted">Ces éléments sont peu typiques du style : plutôt que d'inventer une recette, l'app n'en propose pas. Le générateur 🎲 reprend alors les recettes des styles proches.</p>
          <ul className="small">{VIDES_STYLES[s.id].map((v) => <li key={v.el}><b>{ELEMENTS.get(v.el as never)?.nom ?? v.el}</b> : {v.pourquoi}.</li>)}</ul>
        </Infos>
      )}
      <p className="small"><a href="#recettes" onClick={() => { try { sessionStorage.setItem("e2academy.recettes.style", s.id); } catch { /* */ } }}>Voir les {n} recette{n > 1 ? "s" : ""} {s.nom} →</a></p>
    </article>
  );
}

// ---------- Gérer les styles ----------
const PALETTE = ["#ffb36b", "#d4f25a", "#d9a6ff", "#ff7a8a", "#8cc4ff", "#ffe066", "#6fe3b8", "#ff6a3d", "#3fd6d0", "#e255c8", "#9b6bff", "#eef1f6"];

function Gerer() {
  const st = useStore();
  const { tous } = useStyles();
  const [reset, setReset] = useState(false);
  const p = st.stylesPrefs;
  const ordre = tous.map((s) => s.id);
  const bouger = (i: number, d: -1 | 1) => {
    const o = [...ordre];
    [o[i], o[i + d]] = [o[i + d], o[i]];
    setStylesPrefs({ ordre: o });
  };
  const masquer = (id: Style, oui: boolean) => {
    const m = new Set(p?.masques ?? []);
    if (oui) m.add(id); else m.delete(id);
    setStylesPrefs({ masques: [...m] });
  };
  const couleur = (id: Style, c: string | null) => {
    const cs = { ...(p?.couleurs ?? {}) };
    if (c === null || c.toLowerCase() === FICHE[id].couleur.toLowerCase()) delete cs[id]; else cs[id] = c;
    setStylesPrefs({ couleurs: cs });
  };
  const nbVisibles = tous.filter((s) => !s.masque).length;

  return (
    <div className="styles-page">
      <div className="styles-top">
        <h2 className="page-title">Gérer les styles</h2>
        <span className="gerer-btns"><Retour /><a className="e2-ui-btn" href="#styles">📖 Fiches des styles</a></span>
      </div>
      <p className="small muted">
        L'ordre et les couleurs choisis ici s'appliquent à toute l'app. Un style masqué disparaît des sélecteurs et des filtres ; ses recettes ne sont pas supprimées et reviennent dès que tu le réaffiches. Ces réglages partent avec « Exporter mes relevés ».
      </p>
      <ol className="gerer-liste">
        {tous.map((s, i) => {
          const n = RECETTES.filter((x) => x.styles.includes(s.id)).length;
          return (
            <li key={s.id} className={s.masque ? "masque" : ""} style={{ "--sc": s.couleur } as CSSProperties}>
              <span className="gerer-num">{i + 1}</span>
              <div className="gerer-nom">
                <b>{s.nom}</b>
                <small>{s.masque ? `Masqué · ${n} recette${n > 1 ? "s" : ""} conservée${n > 1 ? "s" : ""}` : `${s.bpm.min}–${s.bpm.max} BPM · ${n} recette${n > 1 ? "s" : ""}`}</small>
                <div className="gerer-pal" role="group" aria-label={`Couleurs pour ${s.nom}`}>
                  {PALETTE.map((c) => <button key={c} type="button" className={c.toLowerCase() === s.couleur.toLowerCase() ? "on" : ""} style={{ background: c }} title={c} aria-label={`Couleur ${c}`} onClick={() => couleur(s.id, c)} />)}
                </div>
              </div>
              <div className="gerer-btns">
                <button type="button" className="e2-ui-btn" onClick={() => bouger(i, -1)} disabled={i === 0} aria-label={`Monter ${s.nom}`} title="Monter">▲</button>
                <button type="button" className="e2-ui-btn" onClick={() => bouger(i, 1)} disabled={i === tous.length - 1} aria-label={`Descendre ${s.nom}`} title="Descendre">▼</button>
                <label className="gerer-couleur" title="Autre couleur">
                  <input type="color" value={s.couleur} onChange={(e) => couleur(s.id, e.target.value)} aria-label={`Couleur de ${s.nom}`} />
                </label>
                {s.couleur !== s.couleurDefaut && <button type="button" className="e2-ui-btn" onClick={() => couleur(s.id, null)} title="Couleur d'origine">↺</button>}
                {s.masque
                  ? <button type="button" className="e2-ui-btn" onClick={() => masquer(s.id, false)}>👁 Réafficher</button>
                  : <button type="button" className="e2-ui-btn" onClick={() => masquer(s.id, true)} disabled={nbVisibles <= 1} title={nbVisibles <= 1 ? "Il faut garder au moins un style" : undefined}>🚫 Masquer</button>}
              </div>
            </li>
          );
        })}
      </ol>
      <button type="button" className="e2-ui-btn" onClick={() => setReset(true)}>Revenir à l'ordre et aux couleurs d'origine</button>
      {reset && <Confirmer texte="Revenir aux styles d'origine ?" detail="L'ordre, les couleurs et les styles masqués reviennent comme au départ. Aucune recette n'est touchée."
        onNon={() => setReset(false)} onOui={() => { setStylesPrefs(null); setReset(false); }} />}
    </div>
  );
}
