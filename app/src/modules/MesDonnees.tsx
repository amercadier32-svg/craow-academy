// Page « Mes données » (#donnees, menu ☰ Plus) : place utilisée, copies automatiques, fichier de sauvegarde
// sur le PC, export / import. Tout est expliqué dans lib/donnees.ts.
import { confirmer } from "../components/Confirmer";
import { useEffect, useState } from "react";
import { Jauge, useEtatSauvegarde, usePlace } from "../components/Jauge";
import "../components/donnees.css";
import { PixelArt } from "../components/PixelArt";
import { RelevesBar } from "../components/RelevesBar";
import {
  FORMAT, choisirFichierPC, demanderStockagePersistant, enKo, etatFormat, fichierPCPossible, listeCopies, oublierFichierPC,
  reconnecterFichierPC, revenirA, type Copie,
} from "../lib/donnees";

const dateFr = (iso: string) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "");

export default function MesDonnees() {
  const e = useEtatSauvegarde();
  const place = usePlace();
  const [copies, setCopies] = useState<Copie[]>([]);
  const [msg] = useState("");
  const [persist, setPersist] = useState<boolean | undefined>(undefined);
  const [refus, setRefus] = useState(false);
  useEffect(() => { void listeCopies().then(setCopies); }, [e.derniereCopie, msg]);
  useEffect(() => { setPersist(place?.persistant); }, [place?.persistant]);

  const revenir = async (c: Copie) => {
    if (!(await confirmer(`Remettre toutes tes données comme le ${dateFr(c.le)} ?`, { detail: "L'état actuel est gardé avant, dans une copie « avant le retour » : tu pourras y revenir.", oui: "Revenir à cette copie" }))) return;
    await revenirA(c);
    location.reload();
  };

  return (
    <div className="donnees-page">
      <h2 className="page-title"><PixelArt name="carnet" size={34} /> Mes données</h2>
      <p className="muted">Tes relevés, notes, favoris, sessions, recettes gardées, presets et morceaux restent dans ce navigateur, sur cet appareil. Rien n'est envoyé sur internet.</p>

      {etatFormat.plusRecent && <p className="err" role="alert">Tes données viennent d'une version plus récente de l'app (format {etatFormat.lu}, cette version lit le format {FORMAT}). Ouvre plutôt la version la plus récente de E2-Academy.html.</p>}
      {etatFormat.erreur && <p className="err" role="alert">La mise à jour de tes données n'a pas pu se faire ({etatFormat.erreur}). Rien n'est perdu : la copie « avant migration » est ci-dessous.</p>}

      <section className="donnees-carte">
        <h3>Place utilisée</h3>
        {place ? (
          <>
            <p>Tes données : <b>{enKo(place.donnees)}</b> sur environ 5 Mo autorisés par le navigateur ({Math.round((place.donnees / place.limiteDonnees) * 100)} %).</p>
            <Jauge part={place.donnees / place.limiteDonnees} titre="Place utilisée par tes données" />
            {place.total != null && place.quota ? (
              <p className="small muted">Tout le site, enregistrements audio et copies compris : {enKo(place.total)} (le navigateur peut aller jusqu'à {enKo(place.quota)} sur ce disque).</p>
            ) : null}
            {place.donnees / place.limiteDonnees > 0.8 && <p className="err">Presque plein : vide la corbeille des recettes, ou supprime d'anciennes analyses de référence.</p>}
          </>
        ) : <p className="muted">Calcul…</p>}
        <p className="small">
          {persist ? "✓ Le navigateur garde ces données même quand le disque se remplit." : (
            <>Le navigateur peut effacer les données d'un site quand le disque est presque plein.{" "}
              <button type="button" className="e2-ui-btn" onClick={async () => { const ok = await demanderStockagePersistant(); setPersist(ok); setRefus(!ok); }}>Demander de les garder</button>
              {refus && <span className="muted"> (refusé par le navigateur : l'export reste la sécurité)</span>}</>
          )}
        </p>
      </section>

      <section className="donnees-carte">
        <h3>Exporter et importer</h3>
        <RelevesBar />
      </section>

      <section className="donnees-carte">
        <h3>Fichier de sauvegarde sur le PC</h3>
        {!fichierPCPossible() ? (
          <p className="muted">Ce navigateur ne permet pas d'écrire dans un fichier du PC (seuls Chrome et Edge sur ordinateur le font). Les copies automatiques ci-dessous et « Exporter mes données » restent disponibles.</p>
        ) : e.fichier ? (
          <>
            <p>À chaque modification, l'app écrit tes données dans <b>{e.fichier.nom}</b>{e.fichier.le ? ` (dernière écriture : ${dateFr(e.fichier.le)})` : ""}. Ce fichier s'importe tel quel.</p>
            {e.fichier.statut === "a-reconnecter" && <p><button type="button" className="px-btn green" onClick={() => void reconnecterFichierPC()}>Autoriser l'écriture dans {e.fichier.nom}</button> <span className="small muted">Le navigateur redemande l'autorisation après chaque réouverture, sauf si tu choisis « Autoriser à chaque visite ».</span></p>}
            {e.fichier.statut === "erreur" && <p className="err">La dernière écriture a échoué (fichier déplacé ou ouvert ailleurs ?). Choisis de nouveau le fichier.</p>}
            <p><button type="button" className="e2-ui-btn" onClick={() => void choisirFichierPC()}>Changer de fichier</button> <button type="button" className="e2-ui-btn" onClick={() => void oublierFichierPC()}>Arrêter</button></p>
          </>
        ) : (
          <>
            <p>Choisis un fichier une fois (par exemple dans le dossier e2-academy) : l'app y écrira tes données à chaque modification. Si le navigateur est vidé, tu n'auras qu'à importer ce fichier.</p>
            <p><button type="button" className="px-btn green" onClick={() => void choisirFichierPC()}>Choisir le fichier de sauvegarde</button></p>
          </>
        )}
      </section>

      <section className="donnees-carte">
        <h3>Copies automatiques dans ce navigateur</h3>
        <p className="small muted">Une copie complète est faite 2 secondes après chaque modification (une par heure est gardée, les 20 dernières), et avant chaque mise à jour du format, import ou retour en arrière. Elles protègent d'une erreur ou d'une mauvaise manipulation, pas d'un navigateur vidé : pour ça, exporte ou utilise le fichier du PC.</p>
        {copies.length === 0 ? <p className="muted">Aucune copie pour l'instant.</p> : (
          <ul className="donnees-copies">
            {copies.map((c) => (
              <li key={c.id}>
                <span><b>{dateFr(c.le)}</b> · {c.raison} · {enKo(c.taille)}</span>
                <button type="button" className="e2-ui-btn" onClick={() => void revenir(c)}>Revenir à cette copie</button>
              </li>
            ))}
          </ul>
        )}
        <p className="small muted">Format des données : {FORMAT}.{etatFormat.migrees.length ? ` Mise à jour faite à l'ouverture : ${etatFormat.migrees.join(", ")}.` : ""}</p>
      </section>
    </div>
  );
}
