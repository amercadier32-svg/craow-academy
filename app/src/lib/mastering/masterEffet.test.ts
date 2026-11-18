// Vérifie que chaque curseur du mastering change réellement le signal (pas seulement le dessin du curseur).
import { describe, expect, it } from "vitest";
import { ChaineMastering } from "./masterDsp";
import { ecrireSimple, reglagesSimples, type CleSimple } from "./masterSimple";

const SR = 44100, N = SR;
// bruit rose approximé + sinus 60 Hz + sinus 8 kHz, à environ -18 dBFS, stéréo légèrement décorrélée
function signal() {
  const L = new Float32Array(N), R = new Float32Array(N);
  let s = 1, lp = 0;
  for (let i = 0; i < N; i++) {
    s = (s * 16807) % 2147483647; const b = s / 2147483647 - 0.5;
    lp += (b - lp) * 0.1;
    const g = 0.1 * Math.sin((2 * Math.PI * 60 * i) / SR), a = 0.05 * Math.sin((2 * Math.PI * 8000 * i) / SR);
    L[i] = lp * 0.3 + g + a; R[i] = lp * 0.3 + g - a * 0.5;
  }
  return { L, R };
}
const rms = (x: Float32Array) => Math.sqrt(x.reduce((a, v) => a + v * v, 0) / x.length);
const db = (x: number) => 20 * Math.log10(x);
function passer(cle: CleSimple | null, v: number) {
  const { L, R } = signal();
  const ch = new ChaineMastering(SR);
  ch.regler(cle ? ecrireSimple(reglagesSimples(), cle, v) : reglagesSimples());
  const oL = new Float32Array(N), oR = new Float32Array(N);
  ch.process(L, R, oL, oR, N);
  return { L: oL, R: oR };
}
const diff = (a: Float32Array, b: Float32Array) => db(rms(a.map((v, i) => v - b[i])) / rms(a));

describe("chaque curseur change le son", () => {
  const ref = passer(null, 0);
  const cas: [CleSimple, number][] = [["graves", 12], ["graves", -12], ["mediums", 12], ["mediums", -12], ["sat", 100], ["sat", 50], ["aigus", 12], ["aigus", -12], ["comp", 100], ["larg", 0], ["larg", 200], ["volume", 12], ["volume", -12]];
  for (const [cle, v] of cas) {
    it(`${cle} = ${v}`, () => {
      const o = passer(cle, v);
      const d = diff(ref.L, o.L);
      console.log(`${cle} ${v}: écart ${d.toFixed(1)} dB, niveau ${(db(rms(o.L)) - db(rms(ref.L))).toFixed(1)} dB`);
      expect(d).toBeGreaterThan(-15); // écart d'au moins ~18 % du signal : clairement audible
    });
  }
});
