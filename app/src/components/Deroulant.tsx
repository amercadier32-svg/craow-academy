// Sections déroulantes (accueil, page de la machine, Apprendre, Session…).
// Chaque section est un gros bouton toute la largeur : un clic l'ouvre, un second la referme.
// L'app retient sur cet appareil quelles sections sont ouvertes (localStorage « e2academy.sections »).
import { lireObjet, ecrireJson } from "../lib/stockage";
import { useEffect, useId, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { PixelArt } from "./PixelArt";

const CLE = "e2academy.sections";

function lire(): Record<string, boolean> {
  return lireObjet<Record<string, boolean>>(CLE, {});
}
let etat = lire();
const ecoute = new Set<() => void>();
function ecrire(next: Record<string, boolean>) {
  etat = next;
  ecrireJson(CLE, next); // stockage indisponible : on garde en mémoire
  ecoute.forEach((l) => l());
}
const abonner = (l: () => void) => { ecoute.add(l); return () => { ecoute.delete(l); }; };

/** Ouvert ou fermé, avec la valeur par défaut tant que l'utilisateur n'a rien touché. */
export function useOuvert(id: string, defaut = false): [boolean, (v: boolean) => void] {
  const s = useSyncExternalStore(abonner, () => etat, () => etat);
  return [s[id] ?? defaut, (v) => ecrire({ ...etat, [id]: v })];
}

/** Ouvre ou ferme d'un coup toutes les sections données. */
export function toutBasculer(ids: string[], v: boolean) {
  const n = { ...etat };
  for (const id of ids) n[id] = v;
  ecrire(n);
}

export interface DeroulantProps {
  id: string;                 // clé retenue (ex. « accueil.machines »)
  titre: ReactNode;
  texte?: ReactNode;          // petite description d'une ligne
  badge?: string | number;
  icone?: string;             // nom d'une icône pixel
  emoji?: ReactNode;          // ou un symbole (★…) à la place de l'icône
  couleur: string;
  defaut?: boolean;           // ouvert par défaut
  petit?: boolean;            // version plus basse (sections d'une page)
  ouvrir?: boolean;           // ouvre la section à l'arrivée (lien direct vers elle)
  children: ReactNode;
}

export function Deroulant({ id, titre, texte, badge, icone, emoji, couleur, defaut, petit, ouvrir, children }: DeroulantProps) {
  const [ouvert, setOuvert] = useOuvert(id, defaut);
  // Le contenu n'est construit qu'à la première ouverture (pages plus légères), puis il reste pour l'animation.
  const [vu, setVu] = useState(ouvert);
  const corps = useId();
  useEffect(() => { if (ouvrir && !ouvert) { setVu(true); setOuvert(true); } }, [ouvrir]); // eslint-disable-line react-hooks/exhaustive-deps
  const basculer = () => { if (!ouvert) setVu(true); setOuvert(!ouvert); };
  return (
    <section className={`drl ${ouvert ? "ouvert" : ""} ${petit ? "petit" : ""}`} style={{ "--cc": couleur } as CSSProperties}>
      <button type="button" className="gros-btn drl-btn" style={{ "--cc": couleur } as CSSProperties} aria-expanded={ouvert} aria-controls={corps} onClick={basculer}>
        <span className="gros-btn-img">{icone ? <PixelArt name={icone} size={petit ? 48 : 72} /> : <span className="drl-emoji" aria-hidden>{emoji}</span>}</span>
        <span className="gros-btn-txt"><b>{titre}</b>{texte && <span>{texte}</span>}</span>
        {badge !== undefined && badge !== "" && <span className="mcard-badge gros-btn-badge">{badge}</span>}
        <span className="gros-btn-fleche drl-fleche" aria-hidden>▶</span>
      </button>
      <div className="drl-corps" id={corps} {...(!ouvert ? { inert: "" } : {})}>
        <div className="drl-int">{(vu || ouvert) && <div className="drl-contenu">{children}</div>}</div>
      </div>
    </section>
  );
}

/** Les petits boutons « Tout ouvrir · Tout fermer », en haut d'une liste de sections. */
export function ToutOuvrirFermer({ ids }: { ids: string[] }) {
  return (
    <div className="drl-tout" role="group" aria-label="Ouvrir ou fermer toutes les sections">
      <button type="button" onClick={() => toutBasculer(ids, true)}>▼ Tout ouvrir</button>
      <span aria-hidden>·</span>
      <button type="button" onClick={() => toutBasculer(ids, false)}>▶ Tout fermer</button>
    </div>
  );
}

/** Barre pixel colorée entre deux sections (sans titre : le titre est sur le bouton). */
export function BarrePixel({ couleurs }: { couleurs: string[] }) {
  const [a, b, c] = couleurs;
  return (
    <div className="px-sep px-sep-seule" role="presentation" style={{ "--s1": a, "--s2": b ?? a, "--s3": c ?? b ?? a } as CSSProperties}>
      <span className="px-sep-barre" />
    </div>
  );
}
