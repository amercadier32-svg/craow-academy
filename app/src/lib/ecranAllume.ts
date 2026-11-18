// Écran allumé : sur téléphone, l'écran ne se met pas en veille pendant une recette ouverte, une Session ou le Studio
// (tu as les mains sur la machine). Navigateur sans « Wake Lock » : rien ne se passe.
import { useEffect } from "react";

type Verrou = { release: () => Promise<void> };
type NavWake = Navigator & { wakeLock?: { request: (t: "screen") => Promise<Verrou> } };

export function useEcranAllume(actif: boolean) {
  useEffect(() => {
    const nav = navigator as NavWake;
    if (!actif || !nav.wakeLock) return;
    let verrou: Verrou | null = null;
    let fini = false;
    const prendre = async () => {
      if (fini || document.visibilityState !== "visible") return;
      try { verrou = await nav.wakeLock!.request("screen"); if (fini) void verrou.release(); } catch { /* refusé : tant pis */ }
    };
    // Le navigateur lâche le verrou quand on change d'onglet : on le reprend au retour.
    const vis = () => { if (document.visibilityState === "visible") void prendre(); };
    void prendre();
    document.addEventListener("visibilitychange", vis);
    return () => { fini = true; document.removeEventListener("visibilitychange", vis); if (verrou) void verrou.release().catch(() => {}); };
  }, [actif]);
}
