// Menu ☰ général (à droite de la barre du haut) : les pages communes à tout le studio,
// comme les Réglages audio et Mes enregistrements. Sur téléphone, il est dans le menu ☰ « Menu ».
import { useFermeture } from "./useFermeture";
import { useEffect, useRef, useState } from "react";
import { PixelArt } from "./PixelArt";
import { Jauge, usePlace } from "./Jauge";

export const PAGES_PLUS = [
  { id: "audio", nom: "Réglages audio", texte: "Entrée de la Scarlett, test, mono / stéréo", icone: "audio" },
  { id: "enregistrements", nom: "Mes enregistrements", texte: "Tes prises, favoris ★ et corbeille", icone: "enregistrer" },
  { id: "donnees", nom: "Mes données", texte: "Sauvegarde, export, place utilisée", icone: "carnet" },
  { id: "raccourcis", nom: "Raccourcis clavier", texte: "Toutes les touches de l'app", icone: "glossaire" },
] as const;

export function MenuPlus({ ecran }: { ecran: string }) {
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  useEffect(() => { setOuvert(false); }, [ecran]);
  useFermeture(ouvert, () => setOuvert(false), zone);
  const ici = PAGES_PLUS.some((p) => p.id === ecran);
  return (
    <div ref={zone} className={`mm mp ${ouvert ? "open" : ""}`}>
      <button type="button" className={`mm-btn mp-btn ${ici ? "active" : ""}`} aria-expanded={ouvert} aria-haspopup="true" aria-controls="mp-panneau"
        onClick={() => setOuvert((o) => !o)} title="Plus : réglages audio, enregistrements…">
        <span className="mp-traits" aria-hidden>☰</span> <span className="mp-txt">Plus</span>
      </button>
      <div id="mp-panneau" className="mm-panneau mp-panneau" role="region" aria-label="Plus">
        {PAGES_PLUS.map((p) => (
          <a key={p.id} href={`#${p.id}`} className={`mp-lien ${ecran === p.id ? "on" : ""}`} aria-current={ecran === p.id ? "page" : undefined}>
            <PixelArt name={p.icone} size={28} />
            <span><b>{p.nom}</b><small>{p.texte}</small>{p.id === "donnees" && <PlaceMini />}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/** Petit indicateur de la place utilisée, dans le menu. */
function PlaceMini() {
  const p = usePlace();
  if (!p) return null;
  const part = p.donnees / p.limiteDonnees;
  return <span className="mp-place"><Jauge part={part} titre="Place utilisée par tes données" /><small>{Math.max(1, Math.round(part * 100))} % utilisé</small></span>;
}
