// La corbeille, la même partout (recettes, enregistrements) : le bouton 🗑 qui y envoie un élément,
// l'entrée « Corbeille » du menu ☰, et la page de la corbeille (restaurer, supprimer pour de bon, vider).
import type { CSSProperties, ReactNode } from "react";

/** Petit bouton 🗑 d'un élément : l'envoie à la corbeille, sans l'effacer. */
export function BoutonJeter({ titre, onClick, className = "e2-ui-btn" }: { titre: string; onClick: () => void; className?: string }) {
  return <button type="button" className={`btn-jeter ${className}`} onClick={onClick} title="Mettre à la corbeille" aria-label={`Mettre « ${titre} » à la corbeille`}>🗑</button>;
}

/** Entrée « 🗑 Corbeille » en bas du menu ☰ des filtres. */
export function EntreeCorbeille({ n, ouverte, onClick }: { n: number; ouverte: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`fm-corbeille ${ouverte ? "on" : ""}`} onClick={onClick}>
      <span aria-hidden>🗑</span> Corbeille <small>{n}</small>
    </button>
  );
}

export interface ElementCorbeille { id: string; titre: ReactNode; infos?: ReactNode; avant?: ReactNode; couleur?: string }

/** La page de la corbeille. */
export function Corbeille({ elements, quoi, onRestaurer, onSupprimer, onVider, onRetour }: {
  elements: ElementCorbeille[];
  quoi: string;                      // « une recette », « un enregistrement »
  onRestaurer: (id: string) => void;
  onSupprimer: (id: string) => void;
  onVider: () => void;
  onRetour?: () => void;
}) {
  return (
    <section className="cb">
      <div className="cb-top">
        <h3>🗑 Corbeille <small>{elements.length}</small></h3>
        <div className="cb-btns">
          {onRetour && <button type="button" className="e2-ui-btn" onClick={onRetour}>← Retour</button>}
          <button type="button" className="e2-ui-btn cb-vider" onClick={onVider} disabled={!elements.length}>Vider la corbeille</button>
        </div>
      </div>
      {elements.length === 0 ? <p className="muted">La corbeille est vide. Le bouton 🗑 d'{quoi} l'envoie ici sans l'effacer.</p> : (
        <ul className="cb-liste">
          {elements.map((x) => (
            <li key={x.id} style={x.couleur ? ({ "--cc": x.couleur } as CSSProperties) : undefined}>
              {x.avant}
              <div className="cb-nom"><b>{x.titre}</b>{x.infos && <span className="small muted">{x.infos}</span>}</div>
              <div className="cb-btns">
                <button type="button" className="e2-ui-btn" onClick={() => onRestaurer(x.id)}>↩ Restaurer</button>
                <button type="button" className="e2-ui-btn cb-vider" onClick={() => onSupprimer(x.id)}>Supprimer pour de bon</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
