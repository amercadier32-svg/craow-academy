// Ce que partagent les pages TD-3 : les données du guide, le badge de source, et les touches dessinées.
import type { ReactNode } from "react";
import manuel from "@data/td3/manuel.json";

export interface ControleTd3 { n: number; id: string; nom: string; zone: string; role: string; plage?: string; section: string }
export interface ProcTd3 { id: string; titre: string; but: string; etapes: string[]; attention?: string[]; section: string }
export const MANUEL_TD3 = manuel;
export const CONTROLES = manuel.controles as ControleTd3[];
export const PROCS = manuel.procedures as ProcTd3[];
export const ctrl = new Map(CONTROLES.map((c) => [c.id, c]));
export const proc = new Map(PROCS.map((p) => [p.id, p]));

/** « Manuel · Guide TD-3 · Step 2: Controls » (le guide n'a pas de numéros de page). */
export function SourceTd3({ section, n }: { section: string; n?: number }) {
  return <span className="badge badge-manuel src" title={manuel.source.titre}>Manuel · {manuel.source.court} · {section}{n ? ` n° ${n}` : ""}</span>;
}

const MODES = ["PATTERN WRITE", "PATTERN PLAY", "TRACK WRITE", "TRACK PLAY", "PITCH MODE", "TIME MODE"];
const BOUTONS = ["START / STOP", "START/STOP", "WRITE/NEXT", "FUNCTION", "PATTERN [1-8](?:-8)?", "PATTERN A", "PATTERN B", "BACK", "CLEAR", "ACCENT", "SLIDE", "TAP", "UP", "DOWN", "NOTE", "TIE", "REST", "STEP", "DEL", "INS"];
const RE = new RegExp(`(${[...MODES, ...BOUTONS].join("|")})(?![\\w/])`, "g");

/** Une touche de la TD-3 dessinée (les modes ont leur propre couleur). */
export function Touche({ children, mode }: { children: ReactNode; mode?: boolean }) {
  return <kbd className={mode ? "td3-k td3-k-mode" : "td3-k"}>{children}</kbd>;
}

/** Le texte avec ses noms de touches dessinés en touches. */
export function avecTouches(texte: string): ReactNode[] {
  const out: ReactNode[] = [];
  let dernier = 0;
  for (const m of texte.matchAll(RE)) {
    const i = m.index ?? 0;
    // « START / STOP » reste entier ; on ignore les mots collés à une lettre (ex. « SETUP »)
    if (i > 0 && /[A-Za-zÀ-ÿ]/.test(texte[i - 1])) continue;
    if (i > dernier) out.push(texte.slice(dernier, i));
    out.push(<Touche key={i} mode={MODES.includes(m[1]) && !m[1].endsWith("MODE")}>{m[1]}</Touche>);
    dernier = i + m[1].length;
  }
  out.push(texte.slice(dernier));
  return out;
}
