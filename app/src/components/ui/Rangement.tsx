// Un seul système de sous-menus pour toute l'app :
// 1. filtre principal (gros onglets centrés), 2. catégories (grandes cartes),
// 3. éléments de la catégorie choisie (boutons), puis un fil d'Ariane avec « Tout effacer » (seulement quand un filtre est actif).
import type { CSSProperties, ReactNode } from "react";
import { PixelArt } from "./PixelArt";

export interface RgOption { id: string; nom: string; n?: number }
export interface RgCategorie { id: string; nom: string; icone?: string; pal?: Record<string, string>; couleur: string; n: number | string; texte?: string; elements?: RgOption[] }

export interface RangementProps {
  racine: string;                                   // nom du module (premier maillon du fil d'Ariane)
  filtre?: { label: string; options: RgOption[]; value: string; onChange: (id: string) => void; toujours?: boolean };  // toujours = le filtre apparaît toujours dans le fil d'Ariane
  categories: RgCategorie[];
  cat: string | null;
  onCat: (id: string | null) => void;
  element?: string | null;
  onElement?: (id: string | null) => void;
  labelCategorie?: string;
  labelElement?: string;
  /** false : pas de bouton « Tout » dans les éléments (quand un élément ouvre une fiche). */
  boutonTout?: boolean;
  /** Dernier maillon du fil d'Ariane quand il ne vient pas des éléments (ex. la fiche ouverte). */
  feuille?: string;
  /** Sans fil d'Ariane (le module a sa barre de filtres ☰ avec ses étiquettes). */
  sansAriane?: boolean;
  /** Plusieurs catégories choisies (filtre ☰) : toutes s'allument. */
  cats?: string[];
}

const couleur = (c: string) => ({ "--cc": c }) as CSSProperties;

export function Rangement(p: RangementProps) {
  const { filtre, categories, cat, element = null } = p;
  const c = categories.find((x) => x.id === cat);
  const el = c?.elements?.find((x) => x.id === element);
  const filtreDefaut = filtre ? filtre.options[0].id : null;
  const toutEffacer = () => { filtre?.onChange(filtreDefaut!); p.onCat(null); p.onElement?.(null); };
  const vide = (!filtre || filtre.value === filtreDefaut) && !cat && !element;
  const montrerFiltre = filtre && (filtre.toujours || filtre.value !== filtreDefaut);

  return (
    <div className="rg">
      {filtre && (
        <div className="rg-tabs" role="radiogroup" aria-label={filtre.label}>
          {filtre.options.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={filtre.value === o.id}
              className={`rg-tab ${filtre.value === o.id ? "on" : ""}`} onClick={() => filtre.onChange(o.id)}>
              {o.nom}{o.n !== undefined && <small>{o.n}</small>}
            </button>
          ))}
        </div>
      )}

      <div className={`rg-cats ${cat || p.cats?.length ? "has-cat" : ""}`} role="radiogroup" aria-label={p.labelCategorie ?? "Catégorie"}>
        {categories.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={cat === x.id || Boolean(p.cats?.includes(x.id))} style={couleur(x.couleur)}
            className={`rg-cat ${cat === x.id || p.cats?.includes(x.id) ? "on" : ""} ${x.n === 0 ? "vide" : ""}`} onClick={() => { p.onCat(cat === x.id ? null : x.id); p.onElement?.(null); }}>
            {x.icone && <PixelArt name={x.icone} size={40} pal={x.pal} />}
            <span className="rg-cat-nom">{x.nom}</span>
            {x.texte && <span className="rg-cat-txt">{x.texte}</span>}
            {x.n !== "" && <span className="rg-badge">{x.n}</span>}
          </button>
        ))}
      </div>

      {c?.elements && p.onElement && (
        <div className="rg-els" style={couleur(c.couleur)} role="radiogroup" aria-label={p.labelElement ?? "Élément"}>
          <span className="rg-els-titre">{c.nom}</span>
          <div className="rg-els-liste">
            {p.boutonTout !== false && (
              <button type="button" role="radio" aria-checked={!element} className={`rg-el ${!element ? "on" : ""}`} onClick={() => p.onElement!(null)}>
                Tout <small>{c.n}</small>
              </button>
            )}
            {c.elements.map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={element === x.id}
                className={`rg-el ${element === x.id ? "on" : ""} ${x.n === 0 ? "vide" : ""}`} onClick={() => p.onElement!(element === x.id ? null : x.id)}>
                {x.nom}{x.n !== undefined && <small>{x.n}</small>}
              </button>
            ))}
          </div>
        </div>
      )}

      {!p.sansAriane && <nav className="rg-ariane" aria-label="Fil d'Ariane">
        <button type="button" className="rg-crumb" onClick={toutEffacer}>{p.racine}</button>
        {montrerFiltre && (
          <><span className="rg-sep">›</span><button type="button" className="rg-crumb" onClick={() => { p.onCat(null); p.onElement?.(null); }}>{filtre.options.find((o) => o.id === filtre.value)?.nom}</button></>
        )}
        {c && (
          <><span className="rg-sep">›</span><button type="button" className="rg-crumb" style={couleur(c.couleur)} onClick={() => p.onElement?.(null)}>{c.nom}</button></>
        )}
        {(el || p.feuille) && (<><span className="rg-sep">›</span><span className="rg-crumb cur" style={couleur(c?.couleur ?? "#fff")}>{el?.nom ?? p.feuille}</span></>)}
        {!vide && <button type="button" className="rg-clear" onClick={toutEffacer}>✕ Tout effacer</button>}
      </nav>}
    </div>
  );
}

/** Bloc repliable « ℹ️ Infos », fermé par défaut, pour les paragraphes techniques d'introduction. */
export function Infos({ children, titre = "Infos" }: { children: ReactNode; titre?: string }) {
  return (
    <details className="infos">
      <summary><span aria-hidden>ℹ️</span> {titre}</summary>
      <div className="infos-body">{children}</div>
    </details>
  );
}

/** Couleur de chaque catégorie, la même partout dans l'app. */
export const COULEURS = {
  rythmique: "#ff6a3d",
  basse: "#9b6bff",
  melodie: "#ffd84d",
  ambiance: "#3fd6d0",
  effets: "#e255c8",
} as const;
