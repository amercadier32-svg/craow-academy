// Petits schémas du glossaire, dessinés en SVG (formes d'onde, enveloppe, filtre, grille de pas…).
import type { Schema } from "../content/lexique";

const W = 260, H = 96;
const C = { line: "#9fffb0", dim: "#ffffff40", txt: "#c9cdd6", acc: "#ffd84d", red: "#ff6a3d", blue: "#6aa2ee" };

function path(f: (x: number) => number, n = 120, x0 = 10, x1 = W - 10) {
  let d = "";
  for (let i = 0; i <= n; i++) { const t = i / n; d += `${i ? "L" : "M"}${(x0 + t * (x1 - x0)).toFixed(1)},${f(t).toFixed(1)} `; }
  return d;
}
const Txt = ({ x, y, children, a = "middle", c = C.txt }: { x: number; y: number; children: string; a?: "start" | "middle" | "end"; c?: string }) =>
  <text x={x} y={y} fill={c} fontSize="10" textAnchor={a} fontFamily="system-ui, sans-serif">{children}</text>;

function rnd(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

function Onde({ f }: { f: "sinus" | "scie" | "carre" | "triangle" | "bruit" }) {
  const cyc = 3, mid = H / 2, a = 30;
  const fn = (t: number) => {
    const p = (t * cyc) % 1;
    if (f === "sinus") return mid - a * Math.sin(2 * Math.PI * p);
    if (f === "scie") return mid - a * (1 - 2 * p);
    if (f === "carre") return mid - a * (p < 0.5 ? 1 : -1);
    return mid - a * (p < 0.25 ? 4 * p : p < 0.75 ? 2 - 4 * p : 4 * p - 4);
  };
  const r = rnd(7);
  const d = f === "bruit" ? path(() => mid - a * (r() * 2 - 1), 160) : path(fn, f === "carre" ? 600 : 160);
  return <><line x1="10" x2={W - 10} y1={mid} y2={mid} stroke={C.dim} /><path d={d} fill="none" stroke={C.line} strokeWidth="2" /></>;
}

function Adsr({ focus }: { focus?: "a" | "d" | "s" | "r" }) {
  const pts = { o: [14, 82], a: [64, 14], d: [110, 44], s: [190, 44], r: [246, 82] };
  const seg = (k: "a" | "d" | "s" | "r", p: number[], q: number[]) => <line key={k} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={focus === k ? C.acc : C.line} strokeWidth={focus === k ? 4 : 2} />;
  return (
    <>
      <line x1="10" x2={W - 10} y1="82" y2="82" stroke={C.dim} />
      {seg("a", pts.o, pts.a)}{seg("d", pts.a, pts.d)}{seg("s", pts.d, pts.s)}{seg("r", pts.s, pts.r)}
      <Txt x={36} y={94}>Attack</Txt><Txt x={88} y={94}>Decay</Txt><Txt x={150} y={38}>Sustain</Txt><Txt x={220} y={94}>Release</Txt>
    </>
  );
}

function Grille({ lignes }: { lignes: [string, string][] }) {
  const lw = 52, cw = (W - lw - 6) / 16, rh = Math.min(22, (H - 8) / lignes.length);
  return (
    <>
      {lignes.map(([nom, p], r) => (
        <g key={r}>
          <Txt x={lw - 6} y={6 + r * rh + rh / 2 + 3} a="end">{nom}</Txt>
          {[...p].map((ch, i) => (
            <rect key={i} x={lw + i * cw + 1} y={6 + r * rh + 2} width={cw - 2} height={rh - 4}
              fill={ch === "." ? (i % 4 === 0 ? "#ffffff22" : "#ffffff10") : r === 0 ? C.red : [C.acc, C.blue, C.line][(r - 1) % 3]} />
          ))}
        </g>
      ))}
    </>
  );
}

function Filtre({ f, reso }: { f: "lpf" | "hpf" | "bpf"; reso?: boolean }) {
  const top = 30, bot = 84, fc = 0.5;
  const g = (t: number) => {
    let v: number;
    if (f === "lpf") v = t < fc ? 1 : Math.max(0, 1 - (t - fc) * 3.2);
    else if (f === "hpf") v = t > fc ? 1 : Math.max(0, 1 - (fc - t) * 3.2);
    else v = Math.max(0, 1 - Math.abs(t - fc) * 4);
    if (reso) v += 0.5 * Math.exp(-((t - fc) ** 2) / 0.002);
    return bot - v * (bot - top);
  };
  return (
    <>
      <line x1="10" x2={W - 10} y1={bot} y2={bot} stroke={C.dim} />
      <path d={path(g, 200)} fill="none" stroke={C.line} strokeWidth="2" />
      <line x1={10 + fc * (W - 20)} x2={10 + fc * (W - 20)} y1="10" y2={bot} stroke={C.acc} strokeDasharray="3 3" />
      <Txt x={10 + fc * (W - 20)} y={10}>Cutoff</Txt>
      <Txt x={14} y={95} a="start">graves</Txt><Txt x={W - 14} y={95} a="end">aigus</Txt>
    </>
  );
}

function Clip() {
  const mid = H / 2, lim = 20;
  return (
    <>
      <path d={path((t) => mid - 36 * Math.sin(2 * Math.PI * 2 * t))} fill="none" stroke={C.dim} strokeWidth="1.5" />
      <path d={path((t) => mid - Math.max(-lim, Math.min(lim, 36 * Math.sin(2 * Math.PI * 2 * t))))} fill="none" stroke={C.red} strokeWidth="2.5" />
      <line x1="10" x2={W - 10} y1={mid - lim} y2={mid - lim} stroke={C.acc} strokeDasharray="3 3" />
      <Txt x={W - 12} y={mid - lim - 4} a="end">limite</Txt>
    </>
  );
}

function Comp() {
  const x0 = 70, y0 = 86, s = 76, th = 0.55;
  const f = (t: number) => y0 - s * (t < th ? t : th + (t - th) / 4);
  return (
    <>
      <line x1={x0} y1={y0} x2={x0 + s} y2={y0} stroke={C.dim} /><line x1={x0} y1={y0} x2={x0} y2={y0 - s} stroke={C.dim} />
      <line x1={x0} y1={y0} x2={x0 + s} y2={y0 - s} stroke={C.dim} strokeDasharray="3 3" />
      <path d={path(f, 60, x0, x0 + s)} fill="none" stroke={C.line} strokeWidth="2.5" />
      <circle cx={x0 + th * s} cy={y0 - th * s} r="3.5" fill={C.acc} />
      <Txt x={x0 + th * s + 50} y={y0 - th * s + 4} a="start">seuil (threshold)</Txt>
      <Txt x={x0 + s / 2} y={96}>niveau qui entre</Txt>
      <Txt x={x0 - 6} y={y0 - s / 2} a="end">qui sort</Txt>
    </>
  );
}

function Echo() {
  return (
    <>
      <line x1="10" x2={W - 10} y1="82" y2="82" stroke={C.dim} />
      {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={20 + i * 40} y={82 - 64 * 0.62 ** i} width="14" height={64 * 0.62 ** i} fill={i ? C.blue : C.line} />)}
      <Txt x={27} y={94}>son</Txt><Txt x={150} y={94}>répétitions de plus en plus faibles</Txt>
    </>
  );
}

function Pan() {
  return (
    <>
      <line x1="30" x2={W - 30} y1="50" y2="50" stroke={C.dim} strokeWidth="3" />
      {[30, W / 2, W - 30].map((x) => <line key={x} x1={x} x2={x} y1="42" y2="58" stroke={C.txt} />)}
      <Txt x={30} y={76}>L (gauche)</Txt><Txt x={W / 2} y={76}>centre</Txt><Txt x={W - 30} y={76}>R (droite)</Txt>
      <circle cx={W / 2 + 50} cy="50" r="8" fill={C.acc} />
    </>
  );
}

function Lfo() {
  const mid = 48;
  return (
    <>
      <line x1="10" x2={W - 10} y1={mid} y2={mid} stroke={C.dim} strokeDasharray="3 3" />
      <path d={path((t) => mid - 26 * Math.sin(2 * Math.PI * 2.5 * t))} fill="none" stroke={C.line} strokeWidth="2" />
      <line x1="40" x2="40" y1={mid} y2={mid - 26} stroke={C.acc} strokeWidth="2" /><Txt x={44} y={mid - 30} a="start">Depth = quantité</Txt>
      <Txt x={W / 2} y={94}>Speed = vitesse (combien de vagues)</Txt>
    </>
  );
}

function Side() {
  const k = [0, 0.25, 0.5, 0.75];
  const vol = (t: number) => { const p = (t * 4) % 1; return 30 + 46 * Math.exp(-p * 7); };
  return (
    <>
      {k.map((t) => <rect key={t} x={12 + t * (W - 24)} y="8" width="8" height="18" fill={C.red} />)}
      <Txt x={W - 12} y={20} a="end">kick</Txt>
      <path d={path((t) => vol(t), 200)} fill="none" stroke={C.line} strokeWidth="2" />
      <Txt x={W - 12} y={94} a="end">volume de la basse : baisse à chaque kick</Txt>
    </>
  );
}

function Detune() {
  const saw = (o: number) => (t: number) => 50 - 28 * (1 - 2 * (((t * 3) + o) % 1));
  return (
    <>
      <path d={path(saw(0), 400)} fill="none" stroke={C.line} strokeWidth="2" />
      <path d={path((t) => saw(0.08)(t * 1.04), 400)} fill="none" stroke={C.acc} strokeWidth="2" opacity="0.8" />
      <Txt x={W / 2} y={94}>deux ondes presque pareilles : elles frottent</Txt>
    </>
  );
}

function Glide() {
  return (
    <>
      <Txt x={65} y={12}>sans glide</Txt><Txt x={195} y={12}>avec glide</Txt>
      <path d="M15,70 L65,70 L65,30 L115,30" fill="none" stroke={C.dim} strokeWidth="2.5" />
      <path d="M145,70 L190,70 C205,70 205,30 220,30 L245,30" fill="none" stroke={C.line} strokeWidth="2.5" />
      <Txt x={130} y={92}>la note glisse au lieu de sauter</Txt>
    </>
  );
}

const BL = [0, 2, 4, 5, 7, 9, 11];
const NOIRES: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
function Clavier({ notes, texte }: { notes: number[]; texte?: string }) {
  const ww = (W - 20) / 14, on = new Set(notes);
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => { const semi = Math.floor(i / 7) * 12 + BL[i % 7];
        return <rect key={i} x={10 + i * ww} y="6" width={ww - 1} height="64" fill={on.has(semi) ? C.acc : "#e8e8e8"} stroke="#222" />; })}
      {Array.from({ length: 24 }, (_, s) => s).filter((s) => (s % 12) in NOIRES).map((s) => {
        const i = Math.floor(s / 12) * 7 + NOIRES[s % 12];
        return <rect key={s} x={10 + (i + 1) * ww - ww * 0.3} y="6" width={ww * 0.6} height="40" fill={on.has(s) ? C.red : "#111"} />;
      })}
      {texte && <Txt x={W / 2} y={88}>{texte}</Txt>}
    </>
  );
}

function Blocs({ blocs }: { blocs: [string, number, string][] }) {
  const tot = blocs.reduce((s, b) => s + b[1], 0);
  let x = 10;
  return (
    <>
      {blocs.map(([nom, l, c], i) => { const w = (l / tot) * (W - 20); const r = <g key={i}><rect x={x} y="24" width={w - 2} height="40" fill={c} /><Txt x={x + w / 2} y={48} c="#0b0c10">{nom}</Txt></g>; x += w; return r; })}
      <Txt x={W / 2} y={84}>le temps passe →</Txt>
    </>
  );
}

export function LexSchema({ s }: { s: Schema }) {
  const titre = { onde: "Forme d'onde", adsr: "Enveloppe", grille: "Grille de 16 pas (1 mesure)", filtre: "Filtre", clip: "Saturation", comp: "Compresseur", echo: "Écho", pan: "Panoramique", lfo: "LFO", sidechain: "Sidechain", detune: "Désaccord", glide: "Glide", clavier: "Clavier", blocs: "Structure" }[s.t];
  return (
    <figure className="lx-sch">
      <svg viewBox={`0 0 ${W} ${H + 4}`} role="img" aria-label={titre}>
        {s.t === "onde" ? <Onde f={s.f} /> : s.t === "adsr" ? <Adsr focus={s.focus} /> : s.t === "grille" ? <Grille lignes={s.lignes} />
          : s.t === "filtre" ? <Filtre f={s.f} reso={s.reso} /> : s.t === "clip" ? <Clip /> : s.t === "comp" ? <Comp /> : s.t === "echo" ? <Echo />
          : s.t === "pan" ? <Pan /> : s.t === "lfo" ? <Lfo /> : s.t === "sidechain" ? <Side /> : s.t === "detune" ? <Detune /> : s.t === "glide" ? <Glide />
          : s.t === "clavier" ? <Clavier notes={s.notes} texte={s.texte} /> : <Blocs blocs={s.blocs} />}
      </svg>
      <figcaption>{titre}</figcaption>
    </figure>
  );
}
