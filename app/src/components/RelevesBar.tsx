import { useRef, useState } from "react";
import { exporterDonnees, importerDonnees } from "../lib/exportDonnees";
import { listeFavoris, listeGenerees, listeSessions, plageComplete, useStore , listeAnalyses } from "../lib/store";
import { Badge } from "./common";

/** « Mes données » : exporter / importer tout ce que tu as fait dans l'app (fichier JSON). */
export function RelevesBar() {
  const st = useStore();
  const { plages, observations } = st;
  const nbFav = listeFavoris(st).length;
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const nbPlages = Object.values(plages).filter(plageComplete).length;
  const nbNotes = Object.keys(observations).length;
  const nbGen = listeGenerees(st).length;
  const nbSess = listeSessions(st).length;
  const nbAna = listeAnalyses(st).length;
  const nbCorb = Object.values(st.etatsRecettes).filter((e) => e.etat === "corbeille").length;

  const exporter = async () => {
    const ok = await exporterDonnees();
    if (ok) setMsg({ ok: true, text: "Fichier créé : garde-le, copie-le sur ton téléphone ou envoie-le moi pour intégrer tes relevés à l'app." });
  };

  const importer = async (f: File | undefined) => {
    if (!f) return;
    try {
      const r = await importerDonnees(JSON.parse(await f.text()));
      setMsg({ ok: true, text: `Importé : ${r.plages} plage(s), ${r.observations} note(s), ${r.favoris} favori(s), ${r.recettes} recette(s) (générées, corbeille), ${r.sessions} session(s) ou défi(s), ${r.analyses} analyse(s) de référence et ${r.autres} autre(s) donnée(s) (morceaux, presets, grilles, réglages) mis à jour. Les valeurs déjà plus récentes ici sont gardées. Une copie d'avant l'import est dans « Mes données ».` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error && e.message.includes("CrAoW ACADEMY") ? e.message : "Fichier illisible : choisis un fichier exporté avec « Exporter mes données » (ou un ancien « Exporter mes relevés »)." });
    }
    if (input.current) input.current.value = "";
  };

  return (
    <section className="releves">
      <h3 className="rear-title">Mes données <Badge kind="obs" /></h3>
      <p className="muted small">{nbPlages} plage(s) complète(s), {nbNotes} note(s), {nbFav} favori(s), {nbGen} recette(s) générée(s) gardée(s), {nbCorb} dans la corbeille {nbSess} session(s) et {nbAna} analyse(s) de référence, plus tes morceaux, presets et grilles modifiées, enregistrés dans ce navigateur (<a href="#donnees">copies automatiques et place utilisée</a>). Les enregistrements audio (sessions, morceaux de référence) restent dans ce navigateur : ils ne sont pas dans le fichier.</p>
      <div className="releves-btns">
        <button type="button" className="e2-ui-btn" onClick={exporter}>Exporter mes données</button>
        <button type="button" className="e2-ui-btn" onClick={() => input.current?.click()}>Importer</button>
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => importer(e.target.files?.[0])} />
      </div>
      {msg && <p className={`small ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</p>}
    </section>
  );
}
