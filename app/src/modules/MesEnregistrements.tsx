// « Mes enregistrements », dans l'onglet Enregistrer du Studio (#studio/enregistrer, …/corbeille, …/<clé>).
// Tous les enregistrements gardés sur cet appareil : ceux faits dans l'app (recettes, exercices, relevés, Mastering…),
// l'audio des sessions et les fichiers ajoutés à la main dans une recette. Menu ☰, favoris ★, corbeille, place prise.
import { BoutonJeter, Corbeille, EntreeCorbeille } from "../components/Corbeille";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { BarrePixel } from "../components/Deroulant";
import { LireRec, MiniOnde, NOM_MODULE, fmtDuree, useLignes } from "../components/Enregistreur";
import { Etoile } from "../components/Etoile";
import { Confirmer } from "../components/Confirmer";
import { FiltreMenu, fmVide, type FmGroupe, type FmValeur } from "../components/FiltreMenu";
import { PixelArt } from "../components/PixelArt";
import { RECETTES } from "../content/recettes";
import { GRILLES } from "../content/grilles";
import { effacerEnregistrement, fmtTaille, lireEnregistrement, majMeta, placeStockage, type Ligne, type MetaRec, type ModuleRec } from "../lib/recordings";
import { estFavori, getState, idFavori, useStore } from "../lib/store";
import { telecharger } from "../lib/telecharger";
import { ouvrirEnregistrementDansStudio } from "../lib/studioSon";

const ICI = "#studio/enregistrer";
import "../components/enregistreur.css";

const COUL: Record<ModuleRec, string> = {
  recette: "#ff6a3d", exercice: "#ffd84d", releve: "#3fd6d0", session: "#3fd6d0", reference: "#9b6bff", mastering: "#ffb020", visualiseur: "#4fd18b", libre: "#ff3b3b", fichier: "#8a8f9c", studio: "#ff3b3b",
};
const JOUR = 86400000;
const SEUIL_ALERTE = 2e9; // au-delà de 2 Go, on prévient (une prise de 40 min fait ≈ 690 Mo)

/** Les infos d'une ligne, y compris pour les anciens fichiers (sessions, fichiers ajoutés à une recette) qui n'en avaient pas. */
export function metaDe(l: Ligne): MetaRec {
  if (l.meta) return l.meta;
  const base = { id: l.cle, duree: 0, sr: 0, canaux: 0, bits: 0, creteDb: 0, apercu: [], etat: "active" as const, majLe: l.ajouteLe };
  if (l.cle.startsWith("session:")) {
    const id = l.cle.slice(8), s = getState().sessions[id];
    return { ...base, titre: s ? `Session · ${s.titre}` : "Session", module: "session", source: id, sourceTitre: s?.titre, href: "#session/historique" };
  }
  const rc = RECETTES.find((r) => r.id === l.cle) ?? getState().recettesGenerees[l.cle]?.recette ?? undefined;
  if (rc) return { ...base, titre: rc.nom, module: "fichier", source: rc.id, sourceTitre: rc.nom, href: `#recettes/${rc.id}` };
  const g = GRILLES.find((x) => x.id === l.cle);
  return { ...base, titre: g ? g.nom : l.nom, module: "fichier", source: l.cle, sourceTitre: g?.nom };
}

const GROUPES = (lignes: (Ligne & { m: MetaRec })[]): FmGroupe[] => [
  { id: "module", titre: "Module", options: (Object.keys(NOM_MODULE) as ModuleRec[]).map((id) => ({ id, nom: NOM_MODULE[id], couleur: COUL[id], n: lignes.filter((x) => x.m.module === id).length })).filter((o) => o.n) },
  { id: "fav", titre: "Favoris", seul: true, options: [{ id: "oui", nom: "★ Seulement mes favoris" }] },
  { id: "age", titre: "Date", seul: true, options: [{ id: "7", nom: "Cette semaine" }, { id: "30", nom: "Ce mois-ci" }, { id: "vieux", nom: "Plus d'un mois" }] },
];

export default function MesEnregistrements({ focus }: { focus?: string }) {
  const ouvrirStudio = (x: Ligne & { m: MetaRec }, onglet: "analyser" | "masteriser") => {
    setMsg(`Ouverture de « ${x.m.titre} »…`);
    void ouvrirEnregistrementDansStudio(x.cle).then(() => { location.hash = `#studio/${onglet}`; }).catch((e) => setMsg(String(e.message ?? e)));
  };
  const st = useStore();
  const brut = useLignes();
  const [filtres, setFiltres] = useState<FmValeur>({});
  const [q, setQ] = useState("");
  const vue: "liste" | "corbeille" = focus === "corbeille" ? "corbeille" : "liste";
  const cible = focus && focus !== "corbeille" ? decodeURIComponent(focus) : null;
  const [confirm, setConfirm] = useState<{ texte: string; detail?: string; oui?: string; faire: () => void } | null>(null);
  const [place, setPlace] = useState<{ utilise: number | null; quota: number | null; persistant: boolean | null } | null>(null);
  const [msg, setMsg] = useState("");

  const lignes = useMemo(() => (brut ?? []).map((l) => ({ ...l, m: metaDe(l) })).sort((a, b) => b.ajouteLe.localeCompare(a.ajouteLe)), [brut, st.sessions]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void placeStockage().then(setPlace); }, [brut]);
  useEffect(() => { if (cible && brut) document.getElementById(`rec-${cible}`)?.scrollIntoView({ block: "center" }); }, [cible, brut]);

  const actives = lignes.filter((x) => x.m.etat !== "corbeille");
  const corbeille = lignes.filter((x) => x.m.etat === "corbeille");
  const groupes = GROUPES(actives);
  const v = { ...fmVide(groupes), ...filtres };
  const now = Date.now();
  const filtrees = actives.filter((x) => {
    if (v.module?.length && !v.module.includes(x.m.module)) return false;
    if (v.fav?.includes("oui") && !estFavori(st, idFavori("enregistrement", x.cle))) return false;
    const age = now - new Date(x.ajouteLe).getTime();
    if (v.age?.includes("7") && age > 7 * JOUR) return false;
    if (v.age?.includes("30") && age > 30 * JOUR) return false;
    if (v.age?.includes("vieux") && age <= 30 * JOUR) return false;
    if (q.trim() && !`${x.m.titre} ${x.nom} ${x.m.sourceTitre ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });
  const total = lignes.reduce((s, x) => s + x.taille, 0);
  const vieux = actives.filter((x) => now - new Date(x.ajouteLe).getTime() > 30 * JOUR);
  const alerte = total > SEUIL_ALERTE || (place?.quota && place.utilise && place.utilise > place.quota * 0.5);

  const jeter = (x: Ligne & { m: MetaRec }) => void majMeta(x.cle, { etat: "corbeille" }, x.m).then(() => setMsg(`« ${x.m.titre} » est dans la corbeille.`));
  const restaurer = (x: Ligne & { m: MetaRec }) => void majMeta(x.cle, { etat: "active" }, x.m);
  const telechargerUn = async (x: Ligne & { m: MetaRec }) => { const e = await lireEnregistrement(x.cle); if (e) await telecharger(e.nom, e.blob, e.blob.type || "audio/wav"); };
  const telechargerTous = async (l: (Ligne & { m: MetaRec })[]) => { for (const x of l) { await telechargerUn(x); await new Promise((r) => setTimeout(r, 400)); } };

  return (
    <div className="recs-page">
      <h3 className="studio-titre-section"><PixelArt name="enregistrer" size={26} /> Mes enregistrements</h3>
      <p className="audio-intro muted">Tes prises de l'E2, gardées dans ce navigateur, sur cet appareil. Elles ne partent pas avec « Exporter mes données » : télécharge celles que tu veux garder pour de bon. « Analyser » et « Masteriser » en font le son en cours du Studio.</p>

      <section className={`recs-place ${alerte ? "alerte" : ""}`}>
        <div>
          <b>{brut === null ? "…" : `${lignes.length} enregistrement${lignes.length > 1 ? "s" : ""} · ${fmtTaille(total)}`}</b>
          <span className="small muted">
            {place?.quota ? ` dans le navigateur, qui laisse à l'app jusqu'à ${fmtTaille(place.quota)} sur ce disque (${fmtTaille(place.utilise ?? 0)} utilisés en tout).` : " dans le navigateur."}
            {place?.persistant === false && " Le navigateur peut effacer ces fichiers s'il manque de place : télécharge les plus importants."}
          </span>
        </div>
        {alerte && <p className="small">⚠ Les enregistrements prennent beaucoup de place. Télécharge les anciens sur ton PC, puis supprime-les ici.</p>}
        {vieux.length > 0 && (
          <div className="rec-btns">
            <button type="button" className="e2-ui-btn" onClick={() => void telechargerTous(vieux)}>⬇ Télécharger les {vieux.length} de plus d'un mois</button>
            <button type="button" className="e2-ui-btn" onClick={() => setConfirm({ texte: `Mettre à la corbeille les ${vieux.length} enregistrements de plus d'un mois ?`, detail: "Télécharge-les d'abord si tu veux les garder. Tu pourras encore les restaurer depuis la corbeille.", oui: "Mettre à la corbeille", faire: () => { void Promise.all(vieux.map((x) => majMeta(x.cle, { etat: "corbeille" }, x.m))); } })}>🗑 Mettre les anciens à la corbeille</button>
          </div>
        )}
        <p className="small muted">Si l'app devient un .exe plus tard, les enregistrements seront gardés dans un dossier de ton PC (Documents\CrAoW ACADEMY\Enregistrements).</p>
      </section>

      <BarrePixel couleurs={["#ff3b3b", "#ffb020", "#ffd84d"]} />

      <div className="recs-outils">
        <FiltreMenu groupes={groupes} valeur={v} onChange={setFiltres}
          resultat={vue === "corbeille" ? `${corbeille.length} dans la corbeille` : `${filtrees.length} enregistrement${filtrees.length > 1 ? "s" : ""}`}
          autres={vue === "corbeille" ? [{ id: "corbeille", nom: "🗑 Corbeille", retirer: () => { location.hash = ICI; } }] : []}
          bas={(fermer) => (
            <EntreeCorbeille n={corbeille.length} ouverte={vue === "corbeille"} onClick={() => { location.hash = vue === "corbeille" ? ICI : `${ICI}/corbeille`; fermer(); }} />
          )} />
        {vue === "liste" && <input className="recs-cherche" type="search" placeholder="Chercher un nom…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Chercher un enregistrement" />}
      </div>
      {msg && <p className="small ok" role="status">{msg}</p>}

      {vue === "corbeille" ? (
        <Corbeille quoi="un enregistrement" onRetour={() => { location.hash = ICI; }}
          onVider={() => setConfirm({ texte: `Supprimer définitivement ${corbeille.length} enregistrement${corbeille.length > 1 ? "s" : ""} ?`, detail: "Les fichiers audio sont effacés de ce navigateur. Tu ne pourras pas les récupérer.", faire: () => { void Promise.all(corbeille.map((x) => effacerEnregistrement(x.cle))); } })}
          onRestaurer={(id) => { const x = corbeille.find((y) => y.cle === id); if (x) restaurer(x); }}
          onSupprimer={(id) => { const x = corbeille.find((y) => y.cle === id); if (x) setConfirm({ texte: `Supprimer définitivement « ${x.m.titre} » ?`, faire: () => void effacerEnregistrement(x.cle) }); }}
          elements={corbeille.map((x) => ({ id: x.cle, avant: <LireRec cle={x.cle} />, titre: x.m.titre, infos: `${NOM_MODULE[x.m.module]} · ${fmtTaille(x.taille)}`, couleur: COUL[x.m.module] }))} />
      ) : brut === null ? <p className="drl-vide">Lecture…</p> : filtrees.length === 0 ? (
        <p className="drl-vide">{actives.length ? "Aucun enregistrement avec ces filtres." : "Pas encore d'enregistrement. Utilise l'enregistreur ci-dessus, ou « ● Enregistrer ma version » dans une recette."}</p>
      ) : (
        <ul className="recs-liste">
          {filtrees.map((x) => (
            <li key={x.cle} id={`rec-${x.cle}`} className={`recs-item ${cible === x.cle ? "cible" : ""}`} style={{ "--cc": COUL[x.m.module] } as CSSProperties}>
              <span className="recs-lecture"><LireRec cle={x.cle} /><LireRec cle={x.cle} boucle /></span>
              <span className="recs-onde">{x.m.apercu.length ? <MiniOnde pics={x.m.apercu} /> : <span className="small muted">{x.type.includes("wav") ? "WAV" : "audio"}</span>}</span>
              <span className="recs-txt">
                <b>{x.m.titre}</b>
                <small>
                  <span className="recs-chip">{NOM_MODULE[x.m.module]}</span>
                  {new Date(x.ajouteLe).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {x.m.duree ? ` · ${fmtDuree(x.m.duree)}` : ""}{x.m.sr ? ` · ${(x.m.sr / 1000).toLocaleString("fr-FR")} kHz ${x.m.canaux === 1 ? "mono" : "stéréo"}` : ""} · {fmtTaille(x.taille)}
                  {x.m.normalise ? " · normalisé" : ""}
                </small>
                <small className="recs-fichier">{x.nom}</small>
              </span>
              <span className="recs-actions">
                {x.m.href && !/^#(enregistrements|visualiseur|mastering|reference|studio)/.test(x.m.href) && <a className="e2-ui-btn" href={x.m.href}>Ouvrir la fiche</a>}
                <button type="button" className="e2-ui-btn" onClick={() => ouvrirStudio(x, "analyser")}>Analyser</button>
                <button type="button" className="e2-ui-btn" onClick={() => ouvrirStudio(x, "masteriser")}>Masteriser</button>
                <button type="button" className="e2-ui-btn" onClick={() => void telechargerUn(x)}>⬇ WAV</button>
                <Etoile type="enregistrement" cle={x.cle} titre={x.m.titre} />
                <BoutonJeter className="e2-ui-btn recs-jeter" titre={x.m.titre} onClick={() => jeter(x)} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {confirm && <Confirmer texte={confirm.texte} detail={confirm.detail} oui={confirm.oui} onNon={() => setConfirm(null)} onOui={() => { confirm.faire(); setConfirm(null); }} />}
    </div>
  );
}
