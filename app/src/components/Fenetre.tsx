// Fenêtre par-dessus la page (recettes, fiches d'effets, de gammes et du glossaire), comme une fenêtre Windows :
// barre de titre (nom, ★, Agrandir / Réduire, Fermer ✕), fond assombri, un clic dehors ou Échap ferme.
// Sur PC : on la déplace en tirant la barre de titre et on la redimensionne par les bords ; taille et place sont gardées.
// Sur téléphone : plein écran, Fermer en haut.
import { useEffect, useRef, useState, type PointerEvent as PE, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { lireObjet, ecrireJson } from "../lib/stockage";
import "./fenetre.css";

interface Cadre { x: number; y: number; w: number; h: number }
const CLE = "e2academy.fenetre";
const MIN_W = 420, MIN_H = 300;
const petitEcran = () => window.matchMedia("(max-width: 760px)").matches;

function cadreDepart(sorte: string): Cadre {
  const W = window.innerWidth, H = window.innerHeight;
  const g = lireObjet<Partial<Record<string, Cadre>>>(CLE, {})[sorte];
  const w = Math.min(g?.w ?? Math.min(1100, W * 0.86), W - 16), h = Math.min(g?.h ?? H * 0.86, H - 16);
  const x = g ? Math.max(8 - w + 120, Math.min(g.x, W - 120)) : (W - w) / 2;
  const y = g ? Math.max(0, Math.min(g.y, H - 48)) : Math.max(8, (H - h) / 2);
  return { x, y, w, h };
}

type Bord = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const BORDS: Bord[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

export function Fenetre({ titre, sorte, etoile, onFermer, children, label }: {
  titre: ReactNode; sorte: string; etoile?: ReactNode; onFermer: () => void; children: ReactNode; label?: string;
}) {
  const [cadre, setCadre] = useState<Cadre>(() => cadreDepart(sorte));
  const [grand, setGrand] = useState(() => lireObjet<{ grand?: boolean }>(`${CLE}.mode`, {}).grand ?? false);
  const [tel, setTel] = useState(petitEcran);
  const boite = useRef<HTMLDivElement>(null);
  const fermerRef = useRef(onFermer); fermerRef.current = onFermer;

  // Échap ferme ; la page derrière ne défile plus ; le focus va dans la fenêtre
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Échap dans un menu ouvert dans la fenêtre : le menu se ferme d'abord
      if ((e.target as HTMLElement | null)?.closest?.("[data-menu-ouvert]")) return;
      e.stopPropagation(); fermerRef.current();
    };
    const r = () => setTel(petitEcran());
    window.addEventListener("keydown", k);
    window.addEventListener("resize", r);
    document.body.classList.add("fen-ouverte");
    const avant = document.activeElement as HTMLElement | null;
    boite.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", k); window.removeEventListener("resize", r);
      document.body.classList.remove("fen-ouverte");
      avant?.focus?.({ preventScroll: true });
    };
  }, []);

  const garder = (c: Cadre) => ecrireJson(CLE, { ...lireObjet<Record<string, Cadre>>(CLE, {}), [sorte]: c });
  const basculerGrand = () => setGrand((g) => { ecrireJson(`${CLE}.mode`, { grand: !g }); return !g; });

  // Déplacer : on tire la barre de titre
  const tirer = (e: PE<HTMLDivElement>) => {
    if (tel || grand || e.button !== 0 || (e.target as HTMLElement).closest("button, a, input")) return;
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY, c0 = cadre;
    let c = c0;
    const bouger = (m: PointerEvent) => {
      c = { ...c0, x: Math.max(120 - c0.w, Math.min(window.innerWidth - 120, c0.x + m.clientX - x0)), y: Math.max(0, Math.min(window.innerHeight - 40, c0.y + m.clientY - y0)) };
      setCadre(c);
    };
    const fin = () => { window.removeEventListener("pointermove", bouger); window.removeEventListener("pointerup", fin); garder(c); };
    window.addEventListener("pointermove", bouger); window.addEventListener("pointerup", fin);
  };
  // Redimensionner : on tire un bord ou un coin
  const etirer = (b: Bord) => (e: PE<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX, y0 = e.clientY, c0 = cadre;
    let c = c0;
    const bouger = (m: PointerEvent) => {
      const dx = m.clientX - x0, dy = m.clientY - y0;
      let { x, y, w, h } = c0;
      if (b.includes("e")) w = Math.max(MIN_W, c0.w + dx);
      if (b.includes("s")) h = Math.max(MIN_H, c0.h + dy);
      if (b.includes("w")) { w = Math.max(MIN_W, c0.w - dx); x = c0.x + c0.w - w; }
      if (b.includes("n")) { h = Math.max(MIN_H, c0.h - dy); y = Math.max(0, c0.y + c0.h - h); h = c0.y + c0.h - y; }
      c = { x, y, w, h };
      setCadre(c);
    };
    const fin = () => { window.removeEventListener("pointermove", bouger); window.removeEventListener("pointerup", fin); garder(c); };
    window.addEventListener("pointermove", bouger); window.addEventListener("pointerup", fin);
  };

  const plein = tel || grand;
  const style = plein ? undefined : { left: cadre.x, top: cadre.y, width: cadre.w, height: cadre.h };
  return createPortal(
    <div className="fen-fond" onPointerDown={(e) => { if (e.target === e.currentTarget) fermerRef.current(); }}>
      <div ref={boite} className={`fen fen-${sorte} ${plein ? "pleine" : ""} ${tel ? "tel" : ""}`} style={style} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <div className="fen-barre" onPointerDown={tirer} onDoubleClick={() => !tel && basculerGrand()}>
          <span className="fen-titre">{titre}</span>
          {etoile && <span className="fen-etoile">{etoile}</span>}
          {!tel && (
            <button type="button" className="fen-btn" onClick={basculerGrand} aria-label={grand ? "Réduire la fenêtre" : "Agrandir la fenêtre"} title={grand ? "Réduire" : "Agrandir"}>
              {grand ? "❐" : "□"}
            </button>
          )}
          <button type="button" className="fen-btn fen-fermer" onClick={() => fermerRef.current()} aria-label="Fermer" title="Fermer (Échap)">✕{tel && <span> Fermer</span>}</button>
        </div>
        <div className="fen-corps">{children}</div>
        {!plein && BORDS.map((b) => <div key={b} className={`fen-bord b-${b}`} onPointerDown={etirer(b)} aria-hidden />)}
      </div>
    </div>,
    document.body,
  );
}
