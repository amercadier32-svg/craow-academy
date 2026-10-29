// Rappel hebdomadaire « Exporter mes données » (en haut de toutes les pages), et alerte si le fichier
// de sauvegarde du PC attend ton autorisation après une réouverture.
import { useState } from "react";
import "./donnees.css";
import { etatFormat, rappelExportDu, reconnecterFichierPC, reporterRappel } from "../lib/donnees";
import { exporterDonnees } from "../lib/exportDonnees";
import { useEtatSauvegarde } from "./Jauge";

export function RappelExport() {
  const e = useEtatSauvegarde();
  const [, maj] = useState(0);
  if (etatFormat.plusRecent) {
    return <div className="rappel-donnees" role="alert">Tes données viennent d'une version plus récente de l'app. Ouvre plutôt la version la plus récente de E2-Academy.html. <a href="#donnees">Mes données</a></div>;
  }
  if (e.fichier?.statut === "a-reconnecter") {
    return (
      <div className="rappel-donnees" role="status">
        <span>Sauvegarde sur le PC en pause : le navigateur demande ton accord pour écrire dans <b>{e.fichier.nom}</b>.</span>
        <button type="button" className="px-btn green" onClick={() => void reconnecterFichierPC()}>Autoriser</button>
      </div>
    );
  }
  if (!rappelExportDu()) return null;
  return (
    <div className="rappel-donnees" role="status">
      <span>Pense à exporter tes données (une fois par semaine) : c'est ta sécurité si le navigateur est vidé.</span>
      <span className="rappel-btns">
        <button type="button" className="px-btn green" onClick={async () => { await exporterDonnees(); maj((x) => x + 1); }}>Exporter mes données</button>
        <button type="button" className="e2-ui-btn" onClick={() => { reporterRappel(); maj((x) => x + 1); }}>Dans une semaine</button>
      </span>
    </div>
  );
}
