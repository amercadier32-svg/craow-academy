// Toujours présent dans l'app pendant une session : alertes douces (5 min, 1 min, fin) et petite barre
// du minuteur en bas des autres pages, pour consulter une recette ou une gamme sans perdre le fil.
import { useEffect, useState } from "react";
import { machineDe, routeSession } from "../lib/sessionMachines";
import { carillon, mmss, noterAlerte, basculerPause, temps, useEnCours, useTic } from "../lib/sessionEnCours";

export function SessionVeille({ surSession }: { surSession: boolean }) {
  const x = useEnCours();
  useTic(Boolean(x));
  const [toast, setToast] = useState("");
  const t = x ? temps(x) : null;
  useEffect(() => {
    if (!x || !t || x.pauseDepuis) return;
    const s = t.restant / 1000;
    const dire = (cle: number, texte: string, fin = false) => {
      if (x.alertes.includes(cle)) return;
      noterAlerte(cle); carillon(fin); if (!(fin && surSession)) setToast(texte);
      window.setTimeout(() => setToast(""), 7000);
    };
    if (s <= 0) dire(0, "Temps écoulé : enregistre ce que tu as, même si ce n'est pas parfait.", true);
    else if (s <= 60 && x.defi.duree * 60 > 60) dire(60, "Plus qu'1 minute : sauvegarde ton motif sur l'E2.");
    else if (s <= 300 && x.defi.duree * 60 > 300) dire(300, "Plus que 5 minutes : commence à fixer ce que tu as.");
  });
  if (!x || !t) return null;
  const fini = t.restant <= 0;
  return (
    <>
      {toast && <div className="sv-toast" role="status">⏰ {toast}</div>}
      {!surSession && <div className="sv-espace" aria-hidden />}
      {!surSession && (
        <div className={`sv-barre ${fini ? "fini" : ""} ${x.pauseDepuis ? "pause" : ""}`}>
          <span className="sv-temps">⏱ {fini ? "00:00" : mmss(t.restant)}</span>
          <span className="sv-titre">{x.defi.titre}</span>
          {!fini && <button type="button" className="e2-ui-btn" onClick={basculerPause}>{x.pauseDepuis ? "▶" : "⏸"}</button>}
          <a className="px-btn green" href={`${routeSession(machineDe(x.defi))}/en-cours`}>{fini ? "Enregistrer ma session" : "Revenir à la session"}</a>
        </div>
      )}
    </>
  );
}
