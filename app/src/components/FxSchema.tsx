// Petits schémas du Guide des effets : avant / après, forme d'onde du LFO ou de l'enveloppe, trajet du signal.
import type { Schema } from "../content/effets";
import type { ModInfo } from "../lib/fxaudio";

const W = 300, H = 90;
const N = 128;
const SINE = Array.from({ length: N }, (_, i) => Math.sin((i / N) * 4 * Math.PI));

function path(ys: number[], h = H, pad = 8) {
  return ys.map((y, i) => `${i ? "L" : "M"}${((i / (ys.length - 1)) * W).toFixed(1)},${(h / 2 - y * (h / 2 - pad)).toFixed(1)}`).join(" ");
}

export function AvantApres({ schema }: { schema: Schema }) {
  let body: JSX.Element;
  let legende: string;
  if (schema.type === "onde") {
    const apres = schema.f(SINE).map((v) => Math.max(-1.1, Math.min(1.1, v)));
    body = <><path d={path(SINE)} className="fx-avant" /><path d={path(apres)} className="fx-apres" /></>;
    legende = "Forme d'onde : en pointillés le son d'origine, en couleur le son après l'effet.";
  } else if (schema.type === "spectre") {
    const xs = Array.from({ length: 80 }, (_, i) => i / 79);
    const ys = xs.map((x) => Math.max(-1, Math.min(1, schema.f(x) / 24)));
    body = <><line x1={0} x2={W} y1={H / 2} y2={H / 2} className="fx-avant" /><path d={path(ys)} className="fx-apres" />
      <text x={4} y={H - 4} className="fx-lab">grave</text><text x={W - 4} y={H - 4} className="fx-lab" textAnchor="end">aigu</text></>;
    legende = "Fréquences : la ligne en pointillés = le son d'origine ; au-dessus, l'effet renforce ; en dessous, il atténue.";
  } else if (schema.type === "echo") {
    const bar = (x: number, a: number, cls: string, k: number) => <rect key={k} x={x * (W - 14) + 2} y={H - 10 - a * (H - 20)} width={10} height={a * (H - 20)} rx={2} className={cls} />;
    body = <>{bar(0, 1, "fx-bar-avant", -1)}{schema.echos.map(([t, a], k) => bar(t, a, "fx-bar-apres", k))}
      <text x={W - 4} y={H - 1} className="fx-lab" textAnchor="end">temps →</text></>;
    legende = "Le son d'origine (gris) puis ses répétitions (en couleur), de plus en plus faibles.";
  } else if (schema.type === "volume") {
    const ys = Array.from({ length: 160 }, (_, i) => Math.sin(i * 1.7) * schema.f(i / 159));
    const env = Array.from({ length: 160 }, (_, i) => schema.f(i / 159));
    body = <><path d={path(ys)} className="fx-apres thin" /><path d={path(env)} className="fx-env" />
      {[1, 2, 3].map((k) => <line key={k} x1={(k * W) / 4} x2={(k * W) / 4} y1={4} y2={H - 4} className="fx-grid" />)}</>;
    legende = "Volume sur une mesure (4 temps) : la courbe montre quand le son passe et quand il est coupé.";
  } else {
    const cell = (W - 4) / 16;
    body = <>
      {Array.from({ length: 16 }, (_, i) => {
        const src = schema.f(i);
        return <g key={i}>
          <rect x={2 + i * cell} y={6} width={cell - 3} height={28} rx={3} className="fx-pas-avant" />
          <text x={2 + i * cell + cell / 2 - 1.5} y={25} className="fx-pasn" textAnchor="middle">{i + 1}</text>
          <rect x={2 + i * cell} y={52} width={cell - 3} height={28} rx={3} className={src === null ? "fx-pas-vide" : "fx-pas-apres"} />
          {src !== null && <text x={2 + i * cell + cell / 2 - 1.5} y={71} className="fx-pasn" textAnchor="middle">{src + 1}</text>}
        </g>;
      })}
      <text x={W} y={47} className="fx-lab" textAnchor="end">↓ pas joués avec l'effet</text>
    </>;
    legende = "En haut, les 16 pas dans l'ordre. En bas, le pas que l'on entend à la place quand l'effet est actif.";
  }
  return (
    <figure className="fx-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={legende}>{body}</svg>
      <figcaption className="small muted">{legende}</figcaption>
    </figure>
  );
}

/** Forme de la source de modulation (Guide p. 14-15 : enveloppe AD, LFO triangle, dent de scie, carré, S&H, aléatoire). */
export function FormeMod({ info }: { info: ModInfo }) {
  const n = 160;
  const rnd = [0.3, -0.7, 0.8, -0.2, 0.5, -0.9, 0.1, 0.7];
  const f = (t: number): number => {
    const ph = (t * 2) % 1;
    switch (info.source) {
      case "EG+": return t < 0.04 ? t / 0.04 : Math.exp(-(t - 0.04) * 5);
      case "EG-": return -(t < 0.04 ? t / 0.04 : Math.exp(-(t - 0.04) * 5));
      case "LFOTri": case "LFOTriB": return 1 - 4 * Math.abs(ph - 0.5);
      case "SawUpB": return ph * 2 - 1;
      case "SawDwnB": return 1 - ph * 2;
      case "SquUpB": return ph < 0.5 ? 1 : -1;
      case "SquDwnB": return ph < 0.5 ? -1 : 1;
      case "S&HBPM": return rnd[Math.floor(t * 8) % 8];
      case "Random": { const k = t * 8, i = Math.floor(k), fr = k - i; const a = rnd[i % 8], b = rnd[(i + 1) % 8]; return a + (b - a) * (fr * fr * (3 - 2 * fr)); }
    }
  };
  const ys = Array.from({ length: n }, (_, i) => f(i / (n - 1)) * 0.9);
  const eg = info.source.startsWith("EG");
  return (
    <figure className="fx-fig">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Forme de la modulation">
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="fx-grid" />
        {eg && <line x1={4} x2={4} y1={4} y2={H - 4} className="fx-note" />}
        <path d={path(ys)} className="fx-apres" />
        {eg && <text x={8} y={12} className="fx-lab">note jouée</text>}
      </svg>
      <figcaption className="small muted">
        {eg ? `Enveloppe AD ${info.source === "EG+" ? "positive : monte d'un coup à chaque note puis redescend" : "négative : descend d'un coup à chaque note puis revient"}.`
          : info.source === "S&HBPM" ? "Échantillonneur-bloqueur : une valeur au hasard, gardée jusqu'au palier suivant."
          : info.source === "Random" ? "Aléatoire : la valeur change au hasard en glissant."
          : `LFO ${info.source.startsWith("LFOTri") ? "triangle" : info.source.startsWith("Saw") ? (info.source === "SawUpB" ? "dent de scie montante" : "dent de scie descendante") : info.source === "SquUpB" ? "carré (commence en haut)" : "carré (commence en bas)"} : deux cycles.`}
      </figcaption>
    </figure>
  );
}

/** Trajet du signal : où se place l'effet dans la partie et dans le motif. */
export function Trajet({ kind, dest }: { kind: "ifx" | "mfx" | "mod"; dest?: ModInfo["dest"] }) {
  const blocs = [
    { id: "osc", nom: "Oscillator" }, { id: "filter", nom: "Filter" }, { id: "amp", nom: "Amp/EG" },
    { id: "ifx", nom: "Insert Fx" }, { id: "send", nom: "MFX Send" }, { id: "mfx", nom: "Master Fx" }, { id: "out", nom: "Sortie" },
  ];
  const hiMod: Record<string, string> = { Filter: "filter", Pitch: "osc", OSC: "osc", Level: "amp", Pan: "amp", IFX: "ifx" };
  const hi = kind === "mod" ? (dest ? hiMod[dest] : "") : kind;
  return (
    <div className="fx-trajet" aria-label="Trajet du signal">
      {blocs.map((b, i) => (
        <span key={b.id} className="fx-trajet-item">
          {i > 0 && <span className={`fx-arrow ${i === 3 ? "dash" : ""}`} aria-hidden>→</span>}
          <span className={`fx-blk ${b.id === hi ? "on" : ""} ${b.id === "mfx" ? "motif" : ""}`}>{b.nom}</span>
        </span>
      ))}
      {kind === "mod" && <span className="fx-mod-arrow small">↑ la modulation agit ici</span>}
      <p className="small muted fx-trajet-note">
        Insert Fx : un par partie. Master Fx : un seul pour tout le motif, partagé par les parties dont MFX Send est allumé (Mode d'emploi p. 23 et 29). La place exacte de l'Insert Fx par rapport au filtre et à l'ampli n'est pas écrite dans le manuel : voir <a href="#chaine">Chaîne du son</a>.
      </p>
    </div>
  );
}
