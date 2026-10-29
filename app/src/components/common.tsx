import { useEffect, useState } from "react";
import { DOCS, EN_LIGNE, type Source } from "../lib/data";
import { plageComplete, setObservation, setPlage, toggleFait, useStore } from "../lib/store";
import { paramById } from "../lib/data";
import { EnregistrerVersion } from "./Enregistreur";

// Tous les badges de l'app passent par ici (Manuel, Pratique, Interprétation, Mes observations, Générée, D'après une référence).
export type BadgeKind = "manuel" | "pratique" | "obs" | "interp" | "genere" | "ref";

const LABELS: Record<BadgeKind, string> = {
  manuel: "Manuel",
  pratique: "Pratique",
  interp: "Interprétation",
  obs: "Mes observations",
  genere: "🎲 Générée",
  ref: "🔍 D'après une référence",
};
const CLASSES: Partial<Record<BadgeKind, string>> = { genere: "badge-gen", ref: "badge-gen badge-ref" };

export function Badge({ kind, children, title }: { kind: BadgeKind; children?: React.ReactNode; title?: string }) {
  return <span className={CLASSES[kind] ?? `badge badge-${kind}`} title={title}>{children ?? LABELS[kind]}</span>;
}

/** « Manuel · Guide p. 10 » avec lien vers la bonne page du PDF dans docs/. */
export function SourceRef({ src, compact }: { src: Source; compact?: boolean }) {
  const d = DOCS[src.doc];
  const href = EN_LIGNE
    ? (d.korgPage ? `${d.korg}#page=${src.page + d.pdfOffset}` : d.korg)
    : `${d.fichier}#page=${src.page + d.pdfOffset}`;
  const aide = EN_LIGNE
    ? (d.korgPage ? `Ouvrir ${d.court}, page ${src.page} (site officiel de Korg)` : `Ouvrir ${d.court} sur le site officiel de Korg, puis aller à la page ${src.page} de la partie française`)
    : `Ouvrir ${d.court}, page ${src.page} (le PDF doit être dans docs/ à côté de l'app)`;
  return (
    <a className="badge badge-manuel src" href={href} target="_blank" rel="noreferrer" title={aide}>
      {compact ? "" : "Manuel · "}{d.court} p. {src.page}
    </a>
  );
}

/** Zone de notes « Mes observations » : sauvegarde automatique, relue par le Carnet. */
export function ObservationBox({ id, titre, placeholder }: { id: string; titre: string; placeholder?: string }) {
  const { observations } = useStore();
  const saved = observations[id]?.texte ?? "";
  const [texte, setTexte] = useState(saved);
  useEffect(() => setTexte(saved), [saved]);

  useEffect(() => {
    if (texte === saved) return;
    const t = setTimeout(() => setObservation(id, titre, texte), 400);
    return () => clearTimeout(t);
  }, [texte, saved, id, titre]);

  return (
    <label className="obs">
      <span className="obs-head">
        <Badge kind="obs" /> <span className="obs-title">{titre}</span>
        {observations[id] && <span className="muted small">enregistré</span>}
      </span>
      <textarea
        value={texte}
        rows={2}
        placeholder={placeholder ?? "Ce que j'entends, mes réglages qui marchent…"}
        onChange={(e) => setTexte(e.target.value)}
        onBlur={() => texte !== saved && setObservation(id, titre, texte)}
      />
    </label>
  );
}

export function DoneToggle({ id }: { id: string }) {
  const { faits } = useStore();
  const done = Boolean(faits[id]);
  return (
    <button type="button" className={`done ${done ? "is-done" : ""}`} aria-pressed={done} onClick={() => toggleFait(id)}>
      <span className="done-box" aria-hidden>{done ? "✓" : ""}</span> {done ? "Fait" : "Marquer comme fait"}
    </button>
  );
}

/** Cases « plage lue sur l'écran » : minimum et maximum relevés sur ta machine. */
export function RangeBox({ paramId }: { paramId: string }) {
  const { plages } = useStore();
  const p = paramById.get(paramId);
  const cur = plages[paramId];
  const field = (champ: "min" | "max", label: string) => (
    <label className="range-field">
      <span>{label}</span>
      <input type="text" inputMode="numeric" defaultValue={cur?.[champ] ?? ""} key={`${paramId}-${champ}-${cur?.[champ] ?? ""}`}
        placeholder="?" onBlur={(e) => e.target.value.trim() !== (cur?.[champ] ?? "") && setPlage(paramId, champ, e.target.value)} />
    </label>
  );
  return (
    <div className="rangebox">
      <span className="obs-head"><Badge kind="obs" /> <span className="obs-title">Plage de {p?.nom ?? paramId} lue sur l'écran</span></span>
      <div className="range-fields">{field("min", "Minimum")}{field("max", "Maximum")}</div>
      <EnregistrerVersion source={{ module: "releve", ref: paramId, titre: `Balayage de ${p?.nom ?? paramId}` }} libelle="● Enregistrer le balayage"
        texte="Tourne le potard du minimum au maximum pendant l'enregistrement." />
    </div>
  );
}

/** Valeur de départ proposée. Tant que ta plage n'est pas notée : « à vérifier sur l'écran ».
 *  Dès que tu as noté minimum et maximum, c'est ta plage qui s'affiche, avec le badge « Mes observations ». */
export function StartValueChip({ nom, valeur, aVerifier, param }: { nom: string; valeur: string; aVerifier: boolean; param: string }) {
  const lue = usePlageLue(param);
  return (
    <span className="startval">
      <kbd>{nom} = {valeur}</kbd>
      {aVerifier && (lue.complete
        ? <span className="plage-lue"><Badge kind="obs" /> ta plage : {lue.min} à {lue.max}</span>
        : <span className="verify">à vérifier sur l'écran{lue.min || lue.max ? ` (noté : ${lue.min || "?"} à ${lue.max || "?"})` : ""}</span>)}
    </span>
  );
}

/** Plage lue sur ta machine pour un paramètre : à utiliser dans tous les modules (fiches, recettes, Labo…). */
export function usePlageLue(paramId: string) {
  const { plages } = useStore();
  const p = plages[paramId];
  return { min: p?.min ?? "", max: p?.max ?? "", complete: plageComplete(p) };
}

/** Affichage compact « Mes observations · 0 à 127 », ou rien si la plage n'est pas encore notée. */
export function PlageLue({ paramId }: { paramId: string }) {
  const lue = usePlageLue(paramId);
  if (!lue.min && !lue.max) return null;
  return <span className="plage-lue"><Badge kind="obs" /> plage lue sur ma machine : <strong>{lue.min || "?"}</strong> à <strong>{lue.max || "?"}</strong></span>;
}
