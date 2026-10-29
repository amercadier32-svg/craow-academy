// Petite étoile ☆ / ★ : ajoute ou enlève un élément de « Mes favoris » (enregistré avec les relevés).
import type { MouseEvent } from "react";
import { basculerFavori, estFavori, idFavori, useStore, type TypeFavori } from "../lib/store";

export function Etoile({ type, cle: r, titre, data, className = "" }: { type: TypeFavori; cle: string; titre: string; data?: () => unknown; className?: string }) {
  const st = useStore();
  const on = estFavori(st, idFavori(type, r));
  const clic = (e: MouseEvent) => { e.stopPropagation(); e.preventDefault(); basculerFavori(type, r, titre, on ? undefined : data?.()); };
  return (
    <button type="button" className={`etoile ${on ? "on" : ""} ${className}`} aria-pressed={on} onClick={clic}
      title={on ? "Retirer de Mes favoris" : "Ajouter à Mes favoris"} aria-label={on ? `Retirer « ${titre} » de Mes favoris` : `Ajouter « ${titre} » à Mes favoris`}>
      {on ? "★" : "☆"}
    </button>
  );
}
