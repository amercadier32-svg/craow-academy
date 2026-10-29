// Styles musicaux : couleurs (CSS généré depuis « Gérer les styles ») et sélecteur en boutons.
import type { CSSProperties } from "react";
import { useStyles, type Style } from "../content/styles";
import "./styles-musique.css";

/** Une règle CSS par style : `.st-<id>` prend la couleur choisie (étiquettes, boutons, cartes). */
export function StylesCss() {
  const { tous } = useStyles();
  const css = tous.map((s) => `.st-${s.id}{--sc:${s.couleur};color:${s.couleur}}`).join("\n");
  return <style>{css}</style>;
}

/** Étiquette de style (petite pastille colorée). */
export function Pastille({ id, nom }: { id: string; nom: string }) {
  return <span className={`st st-${id}`}>{nom}</span>;
}

interface SelProps {
  /** Styles choisis ; [] = « Tous ». */
  valeur: string[];
  onChange: (v: Style[]) => void;
  /** Plusieurs styles à la fois (sinon un clic choisit seulement ce style). */
  multiple?: boolean;
  label?: string;
  /** Texte du bouton « Tous ». */
  tous?: string;
}

/** Les styles visibles en boutons, chacun avec sa couleur, sur une ou deux lignes selon la largeur, plus « Tous ». */
export function SelecteurStyles({ valeur, onChange, multiple, label = "Style", tous = "Tous" }: SelProps) {
  const { visibles } = useStyles();
  const choisir = (id: Style) => {
    if (!multiple) return onChange(valeur.length === 1 && valeur[0] === id ? [] : [id]);
    onChange(valeur.includes(id) ? (valeur.filter((x) => x !== id) as Style[]) : ([...valeur, id] as Style[]));
  };
  return (
    <div className="sel-styles" role="group" aria-label={label} style={{ "--n": visibles.length + 1, "--n2": Math.ceil((visibles.length + 1) / 2) } as CSSProperties}>
      <button type="button" className={`sel-st sel-tous ${valeur.length === 0 ? "on" : ""}`} aria-pressed={valeur.length === 0} onClick={() => onChange([])}>{tous}</button>
      {visibles.map((s) => (
        <button key={s.id} type="button" className={`sel-st st-${s.id} ${valeur.includes(s.id) ? "on" : ""}`} aria-pressed={valeur.includes(s.id)} onClick={() => choisir(s.id)}>
          {s.nom}
        </button>
      ))}
    </div>
  );
}
