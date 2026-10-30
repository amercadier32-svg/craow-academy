// Les commandes de lecture, les mêmes partout : « ▶ Lecture / ■ Stop », le choix « Lire une fois / Boucle »,
// et la paire de boutons « ▶ Une fois / 🔁 Boucle » des petites cartes (favoris, recettes générées…).
import type { ReactNode } from "react";

type Mode = "once" | "loop";

/** Gros bouton lecture / arrêt. `espace` : rappelle que la touche Espace fait pareil. */
export function BoutonLecture({ joue, onClick, libelle = "Lecture", espace, disabled, grand, pixel }: {
  joue: boolean; onClick: () => void; libelle?: ReactNode; espace?: boolean; disabled?: boolean; grand?: boolean;
  pixel?: boolean;   // gros bouton pixel (vert pendant la lecture) au lieu du bouton de console
}) {
  const classe = pixel ? `px-btn ${joue ? "green" : ""}` : `e2-ui-btn play ${grand ? "big" : ""} ${joue ? "on" : ""}`;
  return (
    <button type="button" className={classe} onClick={onClick} aria-pressed={joue} disabled={disabled}>
      {joue ? "■ Stop" : <>▶ {libelle}</>}{espace && <> <small>(Espace)</small></>}
    </button>
  );
}

/** Choix du mode : « Lire une fois » ou « Boucle ». */
export function ChoixMode({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="seg" role="radiogroup" aria-label="Mode de lecture">
      <button type="button" role="radio" aria-checked={mode === "once"} className={mode === "once" ? "on" : ""} onClick={() => onChange("once")}>Lire une fois</button>
      <button type="button" role="radio" aria-checked={mode === "loop"} className={mode === "loop" ? "on" : ""} onClick={() => onChange("loop")}>Boucle</button>
    </div>
  );
}

/** Deux boutons d'écoute directe. `joue` : le mode en cours de lecture (ou null). Un second clic arrête. */
export function BoutonsEcoute({ joue, onJouer }: { joue: Mode | null; onJouer: (m: Mode) => void }) {
  return (
    <>
      <button type="button" className={`e2-ui-btn ${joue === "once" ? "on" : ""}`} aria-pressed={joue === "once"} onClick={() => onJouer("once")}>{joue === "once" ? "■ Stop" : "▶ Une fois"}</button>
      <button type="button" className={`e2-ui-btn ${joue === "loop" ? "on" : ""}`} aria-pressed={joue === "loop"} onClick={() => onJouer("loop")}>{joue === "loop" ? "■ Stop" : "🔁 Boucle"}</button>
    </>
  );
}
