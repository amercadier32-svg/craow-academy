// Menu ☰ de filtres, le même dans toute l'app :
// une barre avec l'icône ☰ (trois traits) → un panneau où l'on coche ce qu'on veut afficher ;
// les filtres actifs en petites étiquettes sous la barre (✕ pour en retirer un) et « Tout effacer ».
import { useFermeture } from "./useFermeture";
import "./filtres.css";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export interface FmOption { id: string; nom: string; n?: number; couleur?: string; section?: string }
export interface FmGroupe {
  id: string;
  titre: string;
  options: FmOption[];
  /** Un seul choix possible (boutons ronds) au lieu de cases à cocher. */
  seul?: boolean;
  /** Choix obligatoire (ex. Type d'effet) : toujours une valeur, étiquette sans croix, « Tout effacer » revient à `defaut`. */
  fixe?: boolean;
  defaut?: string;
}
export type FmValeur = Record<string, string[]>;

export const fmActifs = (v: FmValeur, groupes: FmGroupe[] = []) => Object.entries(v).reduce((n, [id, a]) => n + (groupes.find((g) => g.id === id)?.fixe ? 0 : a.length), 0);
export const fmVide = (groupes: FmGroupe[]): FmValeur => Object.fromEntries(groupes.map((g) => [g.id, g.fixe && g.defaut ? [g.defaut] : []]));

interface Props {
  groupes: FmGroupe[];
  valeur: FmValeur;
  onChange: (v: FmValeur) => void;
  /** Résumé à droite de la barre, ex. « 48 recettes ». */
  resultat?: string;
  /** Contenu en plus en bas du panneau (ex. le lien vers la Corbeille). */
  bas?: (fermer: () => void) => ReactNode;
  /** Étiquettes en plus (ex. une catégorie choisie ailleurs), avec leur croix. */
  autres?: { id: string; nom: string; couleur?: string; retirer: () => void }[];
  onToutEffacer?: () => void;
}

export function FiltreMenu({ groupes, valeur, onChange, resultat, bas, autres = [], onToutEffacer }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  const n = fmActifs(valeur, groupes) + autres.length;

  useFermeture(ouvert, () => setOuvert(false), boite);

  const basculer = (g: FmGroupe, id: string) => {
    const cur = valeur[g.id] ?? [];
    const next = g.fixe ? [id] : g.seul ? (cur.includes(id) ? [] : [id]) : cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    onChange({ ...valeur, [g.id]: next });
  };
  const retirer = (gid: string, id: string) => onChange({ ...valeur, [gid]: (valeur[gid] ?? []).filter((x) => x !== id) });
  const toutEffacer = () => { onChange(fmVide(groupes)); onToutEffacer?.(); };

  const etiquettes = groupes.flatMap((g) => (valeur[g.id] ?? []).map((id) => {
    const o = g.options.find((x) => x.id === id);
    return { key: `${g.id}:${id}`, groupe: g.titre, nom: o?.nom ?? id, couleur: o?.couleur, retirer: g.fixe ? undefined : () => retirer(g.id, id) };
  }));

  return (
    <div className="fm" ref={boite}>
      <div className="fm-barre">
        <button type="button" className={`fm-burger ${ouvert ? "on" : ""}`} aria-expanded={ouvert} aria-haspopup="dialog" onClick={() => setOuvert((o) => !o)}
          title="Filtres" aria-label={`Filtres${n ? ` (${n} actif${n > 1 ? "s" : ""})` : ""}`}>
          <span className="fm-traits" aria-hidden><i /><i /><i /></span>
          <span className="fm-label">Filtres</span>
          {n > 0 && <span className="fm-n">{n}</span>}
        </button>
        {resultat && <span className="fm-res">{resultat}</span>}
      </div>

      {ouvert && (
        <div className="fm-panneau" role="dialog" aria-label="Filtres">
          <div className="fm-panneau-top">
            <b>Ce que je veux afficher</b>
            <button type="button" className="fm-fermer" onClick={() => setOuvert(false)} aria-label="Fermer les filtres">✕</button>
          </div>
          <div className="fm-groupes">
            {groupes.map((g) => {
              let section: string | undefined;
              return (
                <fieldset key={g.id} className="fm-groupe">
                  <legend>{g.titre}</legend>
                  <div className="fm-options">
                    {g.options.map((o) => {
                      const titreSection = o.section && o.section !== section ? (section = o.section) : undefined;
                      const on = (valeur[g.id] ?? []).includes(o.id);
                      return (
                        <span key={o.id} className="fm-opt-wrap">
                          {titreSection && <span className="fm-section" style={{ "--cc": o.couleur } as CSSProperties}>{titreSection}</span>}
                          <label className={`fm-opt ${on ? "on" : ""} ${o.n === 0 ? "vide" : ""}`} style={{ "--cc": o.couleur } as CSSProperties}>
                            <input type={g.seul || g.fixe ? "radio" : "checkbox"} name={g.id} checked={on} onChange={() => basculer(g, o.id)} onClick={() => { if (g.seul && !g.fixe && on) basculer(g, o.id); }} />
                            <span className="fm-box" aria-hidden />
                            <span className="fm-nom">{o.nom}</span>
                            {o.n !== undefined && <small>{o.n}</small>}
                          </label>
                        </span>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
          {bas && <div className="fm-bas">{bas(() => setOuvert(false))}</div>}
          <div className="fm-actions">
            <button type="button" className="e2-ui-btn" onClick={toutEffacer} disabled={n === 0}>✕ Tout effacer</button>
            <button type="button" className="e2-ui-btn fm-voir" onClick={() => setOuvert(false)}>{resultat ? `Voir ${resultat}` : "Voir"}</button>
          </div>
        </div>
      )}

      {etiquettes.length + autres.length > 0 && (
        <div className="fm-etiquettes" aria-label="Filtres actifs">
          {autres.map((a) => (
            <span key={`autre:${a.id}`} className="fm-tag" style={{ "--cc": a.couleur } as CSSProperties}>
              {a.nom}<button type="button" onClick={a.retirer} aria-label={`Retirer le filtre ${a.nom}`}>✕</button>
            </span>
          ))}
          {etiquettes.map((t) => (
            <span key={t.key} className="fm-tag" style={{ "--cc": t.couleur } as CSSProperties}>
              <small>{t.groupe} :</small> {t.nom}{t.retirer ? <button type="button" onClick={t.retirer} aria-label={`Retirer le filtre ${t.groupe} ${t.nom}`}>✕</button> : <span className="fm-tag-fixe" />}
            </span>
          ))}
          {n > 0 && <button type="button" className="fm-clear" onClick={toutEffacer}>✕ Tout effacer</button>}
        </div>
      )}
    </div>
  );
}

/** Fenêtre de confirmation de l'app (les confirm() du navigateur sont bloqués dans la version téléphone). */
export function Confirmer({ texte, detail, oui = "Supprimer définitivement", onOui, onNon }: { texte: string; detail?: string; oui?: string; onOui: () => void; onNon: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onNon(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onNon]);
  return (
    <div className="cf-fond" role="presentation" onClick={onNon}>
      <div className="cf-boite" role="alertdialog" aria-modal="true" aria-label={texte} onClick={(e) => e.stopPropagation()}>
        <p className="cf-texte">{texte}</p>
        {detail && <p className="small muted">{detail}</p>}
        <div className="cf-btns">
          <button type="button" className="e2-ui-btn" ref={btn} onClick={onNon}>Annuler</button>
          <button type="button" className="e2-ui-btn cf-oui" onClick={onOui}>{oui}</button>
        </div>
      </div>
    </div>
  );
}
