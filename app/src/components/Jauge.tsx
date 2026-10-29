// Petits éléments de « Mes données » utilisés aussi hors de la page : état de la sauvegarde, place utilisée, jauge.
import { useEffect, useState, useSyncExternalStore } from "react";
import { etat, placeUtilisee, surEtat, type Place } from "../lib/donnees";

let version = 0;
const abonner = (f: () => void) => surEtat(() => { version++; f(); });
export const useEtatSauvegarde = () => { useSyncExternalStore(abonner, () => version); return etat; };

/** Barre de remplissage. */
export function Jauge({ part, titre }: { part: number; titre: string }) {
  const p = Math.min(100, Math.max(0, part * 100));
  return (
    <div className={`jauge ${p > 80 ? "pleine" : ""}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)} aria-label={titre}>
      <span style={{ width: `${Math.max(p, 1)}%` }} />
    </div>
  );
}

export function usePlace(): Place | null {
  const [p, setP] = useState<Place | null>(null);
  const e = useEtatSauvegarde();
  useEffect(() => { void placeUtilisee().then(setP); }, [e.derniereCopie]);
  return p;
}

