// Fermeture commune des menus et panneaux (menu ☰ des filtres, menu Machines, menu ☰ Plus) :
// un clic ou un toucher en dehors, ou la touche Échap, referme.
import { useEffect, type RefObject } from "react";

export function useFermeture(ouvert: boolean, fermer: () => void, zone: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: PointerEvent) => { if (zone.current && !zone.current.contains(e.target as Node)) fermer(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") fermer(); };
    window.addEventListener("pointerdown", dehors);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", dehors); window.removeEventListener("keydown", esc); };
  }, [ouvert]); // eslint-disable-line react-hooks/exhaustive-deps
}
