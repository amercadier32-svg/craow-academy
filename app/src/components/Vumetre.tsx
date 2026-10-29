// Vumètre en direct de l'entrée audio : deux barres de LED (gauche / droite), crête maintenue, voyant de saturation.
// Valeurs en dBFS (0 = le maximum avant saturation), comme sur l'écran d'un logiciel d'enregistrement.
import { useEffect, useRef, useState } from "react";
import { fmtDb, lireNiveaux, versDb } from "../lib/audioEntree";

const MIN_DB = -60;
const SEGMENTS = 40;
const GRADUATIONS = [-48, -36, -24, -18, -12, -6, -3, 0];

export interface StatsVu { picMaxDb: number; dernierSignal: number; sature: boolean }

/** Couleur d'un segment selon son niveau. */
const couleur = (db: number) => (db > -3 ? "#ff3b3b" : db > -12 ? "#ffd84d" : "#4fd18b");

export function Vumetre({ actif, mono, compact, onStats }: { actif: boolean; mono?: boolean; compact?: boolean; onStats?: (s: StatsVu) => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [txt, setTxt] = useState<{ l: number; r: number; max: number }>({ l: -120, r: -120, max: -120 });
  const [sat, setSat] = useState(false);
  const statsRef = useRef<StatsVu>({ picMaxDb: -120, dernierSignal: 0, sature: false });
  const onStatsRef = useRef(onStats); onStatsRef.current = onStats;

  useEffect(() => {
    if (!actif) return;
    let raf = 0, dernierTxt = 0;
    const tenue: [number, number] = [-120, -120], tenueT = [0, 0];
    const affiche: [number, number] = [-120, -120];
    const boucle = (t: number) => {
      raf = requestAnimationFrame(boucle);
      const n = lireNiveaux();
      const c = cv.current;
      if (!n || !c) return;
      const db: [number, number] = [versDb(n.pic[0]), versDb(n.pic[1])];
      for (let i = 0; i < 2; i++) {
        // montée instantanée, descente douce (~20 dB/s)
        affiche[i] = db[i] > affiche[i] ? db[i] : Math.max(db[i], affiche[i] - 0.33);
        if (db[i] >= tenue[i] || t - tenueT[i] > 1500) { tenue[i] = db[i]; tenueT[i] = t; }
      }
      const s = statsRef.current;
      const m = Math.max(db[0], db[1]);
      if (m > s.picMaxDb) s.picMaxDb = m;
      if (m > -60) s.dernierSignal = t;
      if (n.sature) { s.sature = true; setSat(true); }
      dessiner(c, mono ? [affiche[0]] : affiche, mono ? [tenue[0]] : tenue);
      if (t - dernierTxt > 200) { dernierTxt = t; setTxt({ l: tenue[0], r: tenue[1], max: s.picMaxDb }); onStatsRef.current?.({ ...s }); }
    };
    raf = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(raf);
  }, [actif, mono]);

  const remettre = () => { statsRef.current = { picMaxDb: -120, dernierSignal: performance.now(), sature: false }; setSat(false); };
  return (
    <div className={`vu ${compact ? "vu-compact" : ""} ${actif ? "" : "vu-off"}`}>
      <div className="vu-barres">
        <div className="vu-noms" aria-hidden>{mono ? <span>M</span> : <><span>G</span><span>D</span></>}</div>
        <canvas ref={cv} className="vu-cv" width={400} height={mono ? 16 : 34} role="img"
          aria-label={`Niveau d'entrée : gauche ${fmtDb(txt.l)} dBFS, droite ${fmtDb(txt.r)} dBFS`} />
        <button type="button" className={`vu-sat ${sat ? "on" : ""}`} onClick={remettre} title="Saturation : le signal a touché 0 dBFS. Clique pour remettre à zéro.">SAT</button>
      </div>
      {!compact && (
        <div className="vu-echelle" aria-hidden>
          {GRADUATIONS.map((g) => <span key={g} style={{ left: `${((g - MIN_DB) / -MIN_DB) * 100}%` }}>{g}</span>)}
        </div>
      )}
      <div className="vu-valeurs small">
        {mono ? <span>Niveau <b>{fmtDb(txt.l)}</b> dBFS</span> : <><span>G <b>{fmtDb(txt.l)}</b></span><span>D <b>{fmtDb(txt.r)}</b> dBFS</span></>}
        <span>crête max <b>{fmtDb(txt.max)}</b> dBFS</span>
        <button type="button" className="vu-raz" onClick={remettre}>remettre à zéro</button>
      </div>
    </div>
  );
}

function dessiner(c: HTMLCanvasElement, niv: number[], tenue: number[]) {
  const g = c.getContext("2d");
  if (!g) return;
  const W = c.width, H = c.height, n = niv.length, h = (H - (n - 1) * 2) / n;
  g.clearRect(0, 0, W, H);
  const sw = W / SEGMENTS;
  for (let k = 0; k < n; k++) {
    const y = k * (h + 2);
    for (let i = 0; i < SEGMENTS; i++) {
      const dbSeg = MIN_DB + ((i + 1) / SEGMENTS) * -MIN_DB;
      const allume = niv[k] >= dbSeg - (-MIN_DB / SEGMENTS);
      g.fillStyle = allume ? couleur(dbSeg) : "#2a2d36";
      g.fillRect(Math.round(i * sw) + 1, y, Math.max(1, Math.round(sw) - 2), h);
    }
    // crête maintenue
    if (tenue[k] > MIN_DB) {
      const x = Math.min(W - 3, ((tenue[k] - MIN_DB) / -MIN_DB) * W);
      g.fillStyle = "#ffffff"; g.fillRect(Math.round(x) - 1, y, 3, h);
    }
  }
}
