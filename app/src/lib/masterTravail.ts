// Les gros calculs du module Mastering (analyse d'un morceau entier, rendu de la chaîne, fichier WAV).
// Ils tournent dans un « worker » (en arrière-plan) quand le navigateur le permet, sinon directement dans la page.
import { analyser, ecrireWav, lufsIntegre, type Analyse } from "./masterAnalyse";
import { rendre, type Reglages } from "./masterDsp";

export type Demande =
  | { id: number; type: "charger"; cle: string; L: Float32Array; R: Float32Array; sr: number }
  | { id: number; type: "analyser"; cle: string }
  | { id: number; type: "apres"; cle: string; reglages: Reglages }
  | { id: number; type: "exporter"; cle: string; reglages: Reglages; format: "wav" | "mp3"; bits: 16 | 24; dither: boolean };

export type Reponse =
  | { id: number; ok: true; analyse?: Analyse; lufs?: number; wav?: Blob; L?: Float32Array; R?: Float32Array }
  | { id: number; ok: false; erreur: string; annule?: boolean }
  | { id: number; progres: number };

const sons = new Map<string, { L: Float32Array; R: Float32Array; sr: number }>();
let dernierApres = 0;

export async function traiter(d: Demande, envoyer: (r: Reponse) => void) {
  try {
    if (d.type === "charger") { sons.set(d.cle, { L: d.L, R: d.R, sr: d.sr }); envoyer({ id: d.id, ok: true }); return; }
    const s = sons.get(d.cle);
    if (!s) throw new Error("Son introuvable");
    if (d.type === "analyser") { envoyer({ id: d.id, ok: true, analyse: analyser(s.L, s.R, s.sr) }); return; }
    if (d.type === "apres") {
      dernierApres = d.id;
      const o = await rendre(s.L, s.R, s.sr, d.reglages, { annule: () => dernierApres !== d.id });
      if (!o || dernierApres !== d.id) { envoyer({ id: d.id, ok: false, erreur: "remplacé", annule: true }); return; }
      envoyer({ id: d.id, ok: true, analyse: analyser(o.L, o.R, s.sr), lufs: lufsIntegre(o.L, o.R, s.sr) });
      return;
    }
    if (d.type === "exporter") {
      const mp3 = d.format === "mp3";
      const o = await rendre(s.L, s.R, s.sr, d.reglages, { progres: (x) => envoyer({ id: d.id, progres: x * (mp3 ? 0.5 : 0.9) }) });
      // MP3 : le son traité repart vers la page, qui l'encode (l'encodeur n'est chargé qu'une fois)
      if (mp3) { envoyer({ id: d.id, ok: true, L: o!.L, R: o!.R, analyse: analyser(o!.L, o!.R, s.sr) }); return; }
      const wav = ecrireWav(o!.L, o!.R, s.sr, d.bits, d.dither);
      envoyer({ id: d.id, progres: 0.95 });
      envoyer({ id: d.id, ok: true, wav, analyse: analyser(o!.L, o!.R, s.sr) });
    }
  } catch (e) {
    envoyer({ id: d.id, ok: false, erreur: e instanceof Error ? e.message : String(e) });
  }
}
