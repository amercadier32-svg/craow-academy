// Spectre en courbe (composant) : courbes fixes (référence, mastering, analyse) ou mises à jour à chaque image,
// et les réglages partagés « Lissage », « Maintien des crêtes » et « Échelle ».
import { useEffect, useRef, useState } from "react";
import { bornesAuto, dessinerCourbes, preparerCanvas, setPrefsSpectre, usePrefsSpectre, type Courbe, type Echelle } from "../lib/spectreCourbe";
import "./spectre-courbe.css";

export interface CourbeNommee { nom: string; couleur: string; v: number[]; f?: ArrayLike<number>; pointille?: boolean; remplir?: boolean }

/** Spectre fixe : une ou plusieurs courbes superposées (couleurs différentes), redessiné quand la taille change. */
export function SpectreCourbes({ courbes, f, hauteur = 220, plage = 66, legende = true, label = "Spectre : grave à gauche, aigu à droite", reglages = true }: {
  courbes: CourbeNommee[]; f: ArrayLike<number>; hauteur?: number; plage?: number; legende?: boolean; label?: string; reglages?: boolean;
}) {
  const cv = useRef<HTMLCanvasElement>(null);
  const p = usePrefsSpectre();
  const [taille, setTaille] = useState(0);
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const ro = new ResizeObserver(() => setTaille((x) => x + 1));
    ro.observe(c);
    const dpr = () => setTaille((x) => x + 1);
    const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mq.addEventListener?.("change", dpr);
    return () => { ro.disconnect(); mq.removeEventListener?.("change", dpr); };
  }, []);
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const pr = preparerCanvas(c); if (!pr) return;
    const b = bornesAuto(courbes, plage);
    const cs: Courbe[] = courbes.map((x, i) => ({ v: x.v, f: x.f ?? f, couleur: x.couleur, epais: 2.2, pointille: x.pointille, remplir: x.remplir ?? (i === 0 && !x.pointille) }));
    dessinerCourbes(pr.g, pr.w, pr.h, cs, { echelle: p.echelle, haut: b.haut, bas: b.bas, zones: true, reperes: true, fond: "#0d0e12" });
  }, [courbes, f, p.echelle, taille, plage]);
  return (
    <figure className="sc-figure">
      <canvas ref={cv} className="sc-cv" style={{ height: hauteur }} role="img" aria-label={label} />
      {(legende && courbes.length > 1) || reglages ? (
        <figcaption className="sc-pied">
          {legende && courbes.length > 1 && <span className="sc-legende">{courbes.map((c) => <span key={c.nom}><i style={{ borderColor: c.couleur, borderTopStyle: c.pointille ? "dashed" : "solid" }} />{c.nom}</span>)}</span>}
          {reglages && <ReglagesSpectre compact fixe />}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Réglages du spectre, partagés dans toute l'app. `fixe` : courbes moyennes (seule l'échelle compte). */
export function ReglagesSpectre({ compact, fixe }: { compact?: boolean; fixe?: boolean }) {
  const p = usePrefsSpectre();
  const [ouvert, setOuvert] = useState(!compact);
  const corps = (
    <span className="sc-reglages-corps">
      {!fixe && (
        <label className="sc-lissage" title="Réactif : la courbe suit chaque coup. Lisse : elle bouge plus calmement.">
          <span>Réactif</span>
          <input type="range" min={0} max={1} step={0.05} value={p.lissage} onChange={(e) => setPrefsSpectre({ lissage: Number(e.target.value) })} aria-label="Lissage du spectre, de réactif à lisse" />
          <span>Lisse</span>
        </label>
      )}
      {!fixe && (
        <label className="sc-check" title="Garde une fine ligne au niveau le plus haut atteint pendant quelques secondes.">
          <input type="checkbox" checked={p.cretes} onChange={(e) => setPrefsSpectre({ cretes: e.target.checked })} /> Maintien des crêtes
        </label>
      )}
      <label className="sc-echelle">Échelle
        <select value={p.echelle} onChange={(e) => setPrefsSpectre({ echelle: e.target.value as Echelle })}>
          <option value="log">logarithmique (conseillé)</option>
          <option value="lin">linéaire</option>
        </select>
      </label>
    </span>
  );
  if (!compact) return <div className="sc-reglages">{corps}</div>;
  return (
    <span className={`sc-reglages compact ${ouvert ? "ouvert" : ""}`}>
      <button type="button" className="chipbtn sc-btn" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)} title="Réglages du spectre">⚙ Spectre</button>
      {ouvert && corps}
    </span>
  );
}
