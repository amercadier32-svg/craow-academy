// Aperçus sonores communs : jouer une recette, une grille, une gamme, un terme du glossaire, un effet ou un morceau
// sans ouvrir sa fiche (page Mes favoris, glossaire). Approximation pédagogique, pas le son réel de l'Electribe.
import { toutArreter as toutArreterMoteur } from "./moteurAudio";
import { recetteParId, type Recette } from "../content/recettes";
import { GRILLES } from "../content/grilles";
import { MOTIFS, BPM as BPM_GAMME } from "../content/gammes";
import type { EP, Mot } from "../content/lexique";
import { gammeByN, keyByEn } from "./music";
import { engine, pas, SONS_PERCU, type Mode, type Piste, type SeqState } from "./seq";
import { BPM_APERCU, fxEngine, touchFx, type FxKind } from "./fxaudio";
import { etatMix, load, pisteDe, type Morceau } from "./pistes";
import type { useKnobRange } from "../components/SeqPlayer";

type Range = ReturnType<typeof useKnobRange>;
const rcById = recetteParId;   // table commune (content/recettes.ts)
const RANG_DEFAUT = 7; // Aeolian

export function etatPistes(ps: EP[], bpm = BPM_APERCU, swing?: number, scale = RANG_DEFAUT, mode: Mode = "once"): SeqState {
  const pistes: Piste[] = ps.map((p) => {
    const m = typeof p.pas === "string" ? [p.pas, p.pas, p.pas, p.pas] : p.pas;
    return { son: p.son, octave: p.octave ?? (SONS_PERCU.includes(p.son) ? 0 : 1), knobs: p.knobs ?? {}, filtre: p.filtre, ifx: p.ifx, mod: p.mod, mesures: m.map(pas) };
  });
  return { ...pistes[0], keySemi: keyByEn("D").semi, gamme: gammeByN.get(scale)!, bpm, swing, kickRepere: false, mode, range: "all", pistes };
}

export function etatRecette(rc: Recette, range: Range, mode: Mode = "once"): SeqState {
  const pistes = rc.kit ? rc.kit.pistes.map((p) => pisteDe(rcById.get(p.recette)!, p.mesures, false, range)) : [pisteDe(rc, rc.mesures, false, range)];
  return { ...pistes[0], keySemi: keyByEn(rc.melodique?.key ?? "D").semi, gamme: gammeByN.get(rc.melodique?.scale ?? RANG_DEFAUT)!, bpm: rc.bpm ?? BPM_APERCU, kickRepere: false, mode, range: "all", pistes };
}

/** La grille telle que tu l'as modifiée dans le Labo. */
export function etatGrille(id: string, range: Range, mode: Mode = "once"): SeqState | null {
  const g = GRILLES.find((x) => x.id === id);
  if (!g) return null;
  const d = load(g.id, g);
  const ps = g.pistes.map((p, t) => pisteDe(rcById.get(p.recette)!, d.pistes[t].mesures, d.pistes[t].muet, range));
  return { ...ps[0], keySemi: keyByEn(d.base?.key ?? d.key).semi, gamme: gammeByN.get(d.base?.scale ?? d.scale)!, bpm: d.bpm, kickRepere: false, mode, range: "all", pistes: ps };
}

/** Le motif « Basse roulante » joué dans la gamme, KEY = D. */
export function etatGamme(n: number, mode: Mode = "once"): SeqState | null {
  const g = gammeByN.get(n);
  if (!g) return null;
  const m = MOTIFS[0];
  return { mesures: m.mesures, keySemi: keyByEn("D").semi, gamme: g, bpm: BPM_GAMME, son: m.son, octave: m.octave, knobs: {}, kickRepere: true, mode, range: "all" };
}

export function etatMorceau(m: Morceau, range: Range, mode: Mode = "once"): SeqState | null {
  return etatMix(m, range, () => true, mode);
}

/** Arrête tous les aperçus et lectures (moteur audio partagé). */
export const toutArreter = () => { toutArreterMoteur(); engine.stop(); fxEngine.stop(); };

/** Joue un effet : le motif commun 4 mesures sans l'effet, puis 4 mesures avec. */
export function jouerFx(owner: string, kind: FxKind, nom: string, loop = false) {
  engine.stop();
  touchFx(owner);
  fxEngine.play(owner, { kind, nom, ab: "ab", loop, edit: 0.6, x: 0.5, y: 0.5, depth: 0.6, speed: 0.5, bpm: BPM_APERCU });
}

/** Joue un état du séquenceur sous le nom `owner`. */
export function jouerSeq(owner: string, st: SeqState | null) {
  if (!st) return;
  fxEngine.stop();
  engine.touch(owner);
  engine.play(owner, st);
}

/** Aperçu d'un terme du glossaire (s'il en a un). */
export function jouerLex(owner: string, m: Mot, range: Range, mode: Mode = "once") {
  const ec = m.ec;
  if (!ec) return;
  if ("fx" in ec) { jouerFx(owner, ec.fx.kind, ec.fx.nom, mode === "loop"); return; }
  const rc = "recette" in ec ? rcById.get(ec.recette) : undefined;
  jouerSeq(owner, "pistes" in ec ? etatPistes(ec.pistes, ec.bpm, ec.swing, ec.scale, mode) : rc ? etatRecette(rc, range, mode) : null);
}
