// Enveloppe d'amplitude et petits outils de temps/hauteur partagés par les synthèses.
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
export const stepSec = (bpm: number) => 60 / bpm / 4;

/** Attaque linéaire, maintien, puis chute exponentielle. Renvoie l'instant où la voix peut être coupée. */
export function enveloppeAmp(g: GainNode, t: number, peak: number, attack: number, hold: number, decay: number): number {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.setTargetAtTime(0.0001, t + attack + hold, decay / 3);
  return t + attack + hold + decay * 1.2 + 0.05;
}
