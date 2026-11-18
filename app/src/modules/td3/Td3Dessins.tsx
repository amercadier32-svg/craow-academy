// Petits dessins des fiches TD-3 : ils bougent avec le potard de la fiche (valeur de 0 à 10).
import type { Dessin } from "../../content/td3/fiches";

const W = 300, H = 130;
const J = "#f2c230";      // jaune TD-3
const R = "#ff3b3b";

function Cadre({ children, legende }: { children: React.ReactNode; legende?: string }) {
  return (
    <figure className="td3-dessin">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={legende}>{children}</svg>
      {legende && <figcaption>{legende}</figcaption>}
    </figure>
  );
}
const Axe = ({ g, d }: { g: string; d: string }) => (
  <>
    <line x1="14" y1={H - 18} x2={W - 8} y2={H - 18} stroke="#ffffff33" />
    <text x="14" y={H - 4} fill="#98a2b3" fontSize="10">{g}</text>
    <text x={W - 8} y={H - 4} fill="#98a2b3" fontSize="10" textAnchor="end">{d}</text>
  </>
);

/** Courbe du filtre passe-bas : la coupure avance avec CUTOFF, la bosse monte avec RESONANCE. */
function Filtre({ cutoff, reso, focus }: { cutoff: number; reso: number; focus: string }) {
  const fc = 30 + (cutoff / 10) * (W - 60);
  const pic = (reso / 10) * 55;
  const base = 40, bas = H - 18;
  const pts: string[] = [];
  for (let x = 14; x <= W - 8; x += 3) {
    const d = (x - fc) / 22;
    let y = x < fc ? base : base + (x - fc) * 1.6;
    y -= pic * Math.exp(-d * d);
    pts.push(`${x},${Math.min(bas, Math.max(6, y)).toFixed(1)}`);
  }
  return (
    <Cadre legende={focus === "cutoff" ? "Le filtre laisse passer ce qui est à gauche de la coupure (graves) et coupe le reste." : "La bosse = les fréquences que la résonance fait siffler."}>
      <Axe g="graves" d="aigus" />
      <polygon points={`14,${bas} ${pts.join(" ")} ${W - 8},${bas}`} fill={`${J}33`} />
      <polyline points={pts.join(" ")} fill="none" stroke={J} strokeWidth="3" strokeLinejoin="round" />
      <line x1={fc} y1="6" x2={fc} y2={bas} stroke={R} strokeDasharray="4 3" />
      <text x={fc + 4} y="16" fill={R} fontSize="11">CUTOFF</text>
    </Cadre>
  );
}

/** L'ouverture du filtre dans le temps, sur 4 notes : hauteur = ENVELOPE, longueur = DECAY. */
function Enveloppe({ env, decay }: { env: number; decay: number }) {
  const bas = H - 18, haut = 14;
  const amp = (env / 10) * (bas - haut - 10);
  const tau = 6 + (decay / 10) * 60;
  const pts: string[] = [];
  for (let x = 14; x <= W - 8; x += 2) {
    const t = (x - 14) % 70;
    pts.push(`${x},${(bas - 8 - amp * Math.exp(-t / tau)).toFixed(1)}`);
  }
  return (
    <Cadre legende="À chaque note, le filtre s'ouvre (hauteur = ENVELOPE) puis se referme (vitesse = DECAY).">
      <Axe g="temps" d="" />
      {[0, 1, 2, 3].map((k) => <rect key={k} x={14 + k * 70} y={bas + 2} width="10" height="5" fill={R} />)}
      <polyline points={pts.join(" ")} fill="none" stroke={J} strokeWidth="3" />
    </Cadre>
  );
}

/** 8 notes, accentuées en rouge : leur hauteur monte avec ACCENT. */
function Accent({ v }: { v: number }) {
  const acc = [true, false, false, true, false, true, false, false];
  return (
    <Cadre legende="Rouge = pas avec ACCENT. Seuls eux grandissent quand tu tournes ACCENT.">
      <Axe g="" d="" />
      {acc.map((a, i) => {
        const h = a ? 40 + v * 6 : 40;
        return <rect key={i} x={24 + i * 34} y={H - 18 - h} width="22" height={h} rx="3" fill={a ? R : J} />;
      })}
    </Cadre>
  );
}

/** Le clavier qui glisse vers la gauche ou la droite avec TUNE. */
function Tune({ v }: { v: number }) {
  const dec = ((v - 5) / 5) * 70;
  return (
    <Cadre legende="TUNE décale toutes les notes : environ une octave de chaque côté du centre.">
      <g transform={`translate(${dec} 0)`}>
        {Array.from({ length: 15 }, (_, i) => <rect key={i} x={20 + i * 18} y="30" width="16" height="60" rx="2" fill={i % 7 === 0 ? J : "#e8ecf2"} />)}
      </g>
      <line x1={W / 2} y1="20" x2={W / 2} y2="100" stroke={R} strokeWidth="2" />
      <text x={W / 2} y="14" fill={R} fontSize="11" textAnchor="middle">centre</text>
    </Cadre>
  );
}

/** Les deux ondes de la TD-3. */
function Onde({ choix }: { choix: "saw" | "square" }) {
  const scie = "M14,90 L14,30 L74,90 L74,30 L134,90", carre = "M166,90 L166,30 L196,30 L196,90 L226,90 L226,30 L256,30 L256,90 L286,90";
  return (
    <Cadre legende="À gauche la dent de scie (son plein), à droite la pulse (son creux).">
      <path d={scie} fill="none" stroke={choix === "saw" ? J : "#ffffff44"} strokeWidth="3" />
      <path d={carre} fill="none" stroke={choix === "square" ? J : "#ffffff44"} strokeWidth="3" />
      <text x="74" y="115" fill={choix === "saw" ? J : "#98a2b3"} fontSize="12" textAnchor="middle">dent de scie</text>
      <text x="226" y="115" fill={choix === "square" ? J : "#98a2b3"} fontSize="12" textAnchor="middle">pulse</text>
    </Cadre>
  );
}

/** Une onde qui s'écrase avec DRIVE. */
function Drive({ v }: { v: number }) {
  const k = 1 + v * 0.9;
  const pts: string[] = [];
  for (let x = 14; x <= W - 8; x += 2) {
    const s = Math.sin(((x - 14) / 70) * Math.PI * 2);
    pts.push(`${x},${(60 - (Math.tanh(k * s) / Math.tanh(k)) * 38).toFixed(1)}`);
  }
  return (
    <Cadre legende="Plus de DRIVE : l'onde s'écrase, le son devient plus sale et plus fort.">
      <line x1="14" y1="60" x2={W - 8} y2="60" stroke="#ffffff22" />
      <polyline points={pts.join(" ")} fill="none" stroke={J} strokeWidth="3" />
    </Cadre>
  );
}

function Tone({ v }: { v: number }) {
  const y1 = 30 + (v / 10) * 50, y2 = 80 - (v / 10) * 50;
  return (
    <Cadre legende="TONE penche le son : vers les graves (sombre) ou vers les aigus (mordant).">
      <Axe g="graves" d="aigus" />
      <line x1="14" y1={y1} x2={W - 8} y2={y2} stroke={J} strokeWidth="4" strokeLinecap="round" />
    </Cadre>
  );
}

function Niveau({ v }: { v: number }) {
  return (
    <Cadre legende="Le volume de sortie.">
      {Array.from({ length: 10 }, (_, i) => <rect key={i} x={20 + i * 27} y={100 - i * 8} width="20" height={10 + i * 8} rx="2" fill={i < v ? (i > 7 ? R : J) : "#ffffff1a"} />)}
    </Cadre>
  );
}

function Tempo({ v }: { v: number }) {
  const n = 4 + Math.round(v * 1.2);
  return (
    <Cadre legende="Plus à droite : les pas défilent plus vite.">
      {Array.from({ length: n }, (_, i) => <circle key={i} cx={20 + (i * (W - 40)) / Math.max(1, n - 1)} cy="60" r="7" fill={i % 4 === 0 ? R : J} />)}
    </Cadre>
  );
}

function Bypass({ on }: { on: boolean }) {
  return (
    <Cadre legende={on ? "ON : le son passe par la distorsion (DRIVE, TONE, LEVEL)." : "OFF : le son passe à côté, la distorsion est ignorée."}>
      <rect x="10" y="45" width="56" height="30" rx="5" fill="#232833" /><text x="38" y="64" fill="#e8ecf2" fontSize="11" textAnchor="middle">VCA</text>
      <rect x="120" y="20" width="70" height="30" rx="5" fill={on ? J : "#232833"} /><text x="155" y="39" fill={on ? "#111" : "#98a2b3"} fontSize="10" textAnchor="middle">DISTORTION</text>
      <rect x="234" y="45" width="56" height="30" rx="5" fill="#232833" /><text x="262" y="64" fill="#e8ecf2" fontSize="11" textAnchor="middle">VOLUME</text>
      <path d="M66,60 C95,60 95,35 120,35 M190,35 C215,35 215,60 234,60" fill="none" stroke={on ? R : "#ffffff33"} strokeWidth="3" />
      <path d="M66,60 C120,95 180,95 234,60" fill="none" stroke={on ? "#ffffff33" : R} strokeWidth="3" />
    </Cadre>
  );
}

function Prise({ sens }: { sens?: "entree" | "sortie" }) {
  return (
    <Cadre legende={sens === "entree" ? "Entrée : un câble arrive dans la TD-3." : "Sortie : la TD-3 envoie vers l'extérieur."}>
      <circle cx="150" cy="60" r="26" fill="#111" stroke="#c9ccd3" strokeWidth="5" />
      <circle cx="150" cy="60" r="9" fill="#000" />
      {sens === "entree"
        ? <path d="M30,60 L105,60 M90,48 L108,60 L90,72" stroke={J} strokeWidth="5" fill="none" />
        : <path d="M195,60 L270,60 M255,48 L273,60 L255,72" stroke={J} strokeWidth="5" fill="none" />}
    </Cadre>
  );
}

function Led() {
  return (
    <Cadre legende="POWER LED">
      {[["#ffa53b", "normal"], ["#ff3b3b", "Poly Chain, arrêt"], ["#3fbf7f", "Poly Chain, lecture"]].map(([c, t], i) => (
        <g key={t}><circle cx={50 + i * 100} cy="50" r="14" fill={c} style={{ filter: `drop-shadow(0 0 6px ${c})` }} /><text x={50 + i * 100} y="95" fill="#e8ecf2" fontSize="11" textAnchor="middle">{t}</text></g>
      ))}
    </Cadre>
  );
}

export function DessinTd3({ dessin, id, v, reglages, extra }: { dessin: Dessin; id: string; v: number; reglages: { cutoff: number; resonance: number; envelope: number; decay: number }; extra?: { onde?: "saw" | "square"; dist?: boolean; sens?: "entree" | "sortie" } }) {
  switch (dessin) {
    case "filtre": return <Filtre focus={id} cutoff={id === "cutoff" ? v : reglages.cutoff} reso={id === "resonance" ? v : reglages.resonance} />;
    case "enveloppe": return <Enveloppe env={id === "envelope" ? v : reglages.envelope} decay={id === "decay" ? v : reglages.decay} />;
    case "accent": return <Accent v={v} />;
    case "tune": return <Tune v={v} />;
    case "onde": return <Onde choix={extra?.onde ?? "saw"} />;
    case "drive": return <Drive v={v} />;
    case "tone": return <Tone v={v} />;
    case "niveau": return <Niveau v={v} />;
    case "tempo": return <Tempo v={v} />;
    case "bypass": return <Bypass on={Boolean(extra?.dist)} />;
    case "prise": return <Prise sens={extra?.sens} />;
    case "led": return <Led />;
    default: return null;
  }
}
