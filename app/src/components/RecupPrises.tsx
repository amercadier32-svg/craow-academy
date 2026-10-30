// Bandeau « prise à récupérer » : après un plantage pendant un enregistrement, propose de récupérer la prise.
// Chargé juste après l'accueil, il reste léger : il ne lit que la liste des prises sur le disque, et ne charge
// l'enregistreur (lourd) que si une prise attend.
import { useEffect, useState } from "react";
import { NOM_MODULE, listerPrises, mmss, surChangement, type MetaPrise } from "../lib/recordings";
import "./enregistreur.css";

const enregistreur = () => import("../lib/enregistreur");

export default function RecupPrises() {
  const [prises, setPrises] = useState<MetaPrise[]>([]);
  const [occupe, setOccupe] = useState("");
  const [fait, setFait] = useState("");
  useEffect(() => {
    let vivant = true;
    const lire = () => listerPrises().then(async (l) => {
      // Aucune prise en attente (le cas courant) : le gros module de l'enregistreur n'est pas chargé.
      if (!l.length) { if (vivant) setPrises([]); return; }
      const { priseIci, libererPrise } = await enregistreur();
      // une prise d'un autre onglet qui enregistre encore (écrite il y a moins de 20 s) n'est pas proposée
      if (!vivant) return;
      // déjà gardée (dans Mes enregistrements ou une session) : ses morceaux partent sans rien demander
      for (const m of l) if (!priseIci(m.id) && (m.etat === "gardee" || m.frames === 0) && (m.etat !== "rec" || Date.now() - m.majLe > 20000)) void libererPrise(m.id);
      setPrises(l.filter((m) => !priseIci(m.id) && m.frames > 0 && m.etat !== "gardee" && (m.etat === "arretee" || Date.now() - m.majLe > 20000)));
      // écrite il y a peu (plantage juste avant le lancement, ou un autre onglet) : on regarde de nouveau dans 20 s
      if (l.some((m) => !priseIci(m.id) && m.etat === "rec" && Date.now() - m.majLe <= 20000)) { window.clearTimeout(relire); relire = window.setTimeout(lire, 21000); }
    }).catch(() => {});
    let relire = 0;
    lire();
    const u = surChangement(lire);
    window.addEventListener("hashchange", lire);
    return () => { vivant = false; u(); window.clearTimeout(relire); window.removeEventListener("hashchange", lire); };
  }, []);
  if (!prises.length && !fait) return null;
  const recuperer = async (m: MetaPrise) => {
    setOccupe(m.id);
    try { const d = await (await enregistreur()).recupererPrise(m); setFait(`✓ Récupéré : ${mmss(d)} rangées dans Mes enregistrements.`); }
    catch { setFait("Impossible de récupérer cet enregistrement (stockage plein ?)."); }
    setOccupe(""); setPrises((l) => l.filter((x) => x.id !== m.id));
  };
  const jeter = async (m: MetaPrise) => { await (await enregistreur()).libererPrise(m.id); setPrises((l) => l.filter((x) => x.id !== m.id)); };
  return (
    <div className="recup-prises" role="alert">
      {prises.map((m) => (
        <div key={m.id} className="recup-ligne">
          <span>
            <b>{m.etat === "rec" ? "⚠ Un enregistrement s'est arrêté avant la fin" : "Un enregistrement n'a pas été gardé"}</b>
            {" "}· {mmss(m.frames / m.sr)} enregistrées le {new Date(m.debut).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {NOM_MODULE[m.source.module]}{m.source.titre && m.source.titre !== NOM_MODULE[m.source.module] ? ` : ${m.source.titre}` : ""}
          </span>
          <span className="recup-btns">
            <button type="button" className="px-btn green" disabled={occupe !== ""} onClick={() => void recuperer(m)}>{occupe === m.id ? "Récupération…" : "💾 Récupérer dans Mes enregistrements"}</button>
            <button type="button" className="e2-ui-btn" disabled={occupe !== ""} onClick={() => void jeter(m)}>🗑 Jeter</button>
          </span>
        </div>
      ))}
      {fait && <div className="recup-ligne"><span>{fait} <a href="#studio/enregistrer">Voir</a></span><button type="button" className="e2-ui-btn" onClick={() => setFait("")}>✕</button></div>}
    </div>
  );
}
