// Les confirmations de l'app, les mêmes partout : la fenêtre « Annuler / Supprimer », le bouton 🗑 qui la
// demande avant d'effacer, et confirmer() qui remplace le confirm() du navigateur (bloqué dans la version
// téléphone : le bouton ne faisait alors rien).
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./confirmer.css";

/** Fenêtre de confirmation de l'app. */
export function Confirmer({ texte, detail, oui = "Supprimer définitivement", onOui, onNon }: { texte: string; detail?: ReactNode; oui?: string; onOui: () => void; onNon: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onNon(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onNon]);
  return (
    <div className="cf-fond" role="presentation" onClick={onNon}>
      <div className="cf-boite" role="alertdialog" aria-modal="true" aria-label={texte} onClick={(e) => e.stopPropagation()}>
        <p className="cf-texte">{texte}</p>
        {detail && <p className="small muted">{detail}</p>}
        <div className="cf-btns">
          <button type="button" className="e2-ui-btn" ref={btn} onClick={onNon}>Annuler</button>
          <button type="button" className="e2-ui-btn cf-oui" onClick={onOui}>{oui}</button>
        </div>
      </div>
    </div>
  );
}

interface Demande { texte: string; detail?: string; oui?: string; reponse: (v: boolean) => void }
let poser: ((d: Demande | null) => void) | null = null;

/** Pose une question « Annuler / Oui » dans la fenêtre de l'app. Répond true si tu confirmes. */
export function confirmer(texte: string, o: { detail?: string; oui?: string } = {}): Promise<boolean> {
  return new Promise((reponse) => {
    if (!poser) { reponse(false); return; }
    poser({ texte, ...o, reponse });
  });
}

/** À placer une fois dans l'app (App.tsx) : affiche les questions de confirmer(). */
export function HoteConfirmer() {
  const [d, setD] = useState<Demande | null>(null);
  useEffect(() => { poser = setD; return () => { poser = null; }; }, []);
  if (!d) return null;
  const fin = (v: boolean) => { setD(null); d.reponse(v); };
  // au-dessus de tout, même d'une fenêtre de recette ou du mode vidéo en plein écran
  return createPortal(<Confirmer texte={d.texte} detail={d.detail} oui={d.oui ?? "Supprimer"} onOui={() => fin(true)} onNon={() => fin(false)} />, document.fullscreenElement ?? document.body);
}

/** Bouton 🗑 « supprimer pour de bon » (sans corbeille) : demande toujours confirmation avant. */
export function BoutonSupprimer({ quoi, detail, onSupprimer, className = "chipbtn", children }: {
  quoi: string;              // « le défi « Kick en 10 min » »
  detail?: string;
  onSupprimer: () => void;
  className?: string;
  children?: ReactNode;      // texte du bouton (🗑 par défaut)
}) {
  const clic = () => { void confirmer(`Supprimer ${quoi} ?`, { detail, oui: "Supprimer" }).then((ok) => { if (ok) onSupprimer(); }); };
  return <button type="button" className={className} onClick={clic} aria-label={`Supprimer ${quoi}`} title="Supprimer">{children ?? "🗑"}</button>;
}
