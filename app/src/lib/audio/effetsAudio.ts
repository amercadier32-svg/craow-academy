// Effets d'insertion imités par l'aperçu (IFX) : reverb sombre, saturation, et reconnaissance des types d'effet.
// Voir data/electribe2/effects.json : seuls certains IFX sont imités, Punch reste une approximation (verified: false).

/** Delay et Roller : l'aperçu les imite par un écho calé sur le tempo. */
export const estDelay = (ifx = "") => /Delay|Roller/.test(ifx);
/** IFX qui saturent. Le kick a déjà son propre Punch, il ne compte donc pas ici. */
export const estDrive = (ifx = "", kick = false) => (kick ? /Overdrive|Distortion|Decimator|Bit Crusher/ : /Punch|Overdrive|Distortion|Decimator|Bit Crusher/).test(ifx);
export const estPunch = (ifx = "") => /Punch/.test(ifx);

// Réponse impulsionnelle d'une reverb sombre (bruit décroissant, assombri), gardée par contexte audio.
const impulsions = new WeakMap<BaseAudioContext, AudioBuffer>();
export function reverbSombre(c: BaseAudioContext): AudioBuffer {
  let b = impulsions.get(c);
  if (b) return b;
  const len = Math.floor(c.sampleRate * 2.5);
  b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) { lp += (Math.random() * 2 - 1 - lp) * 0.25; d[i] = lp * Math.pow(1 - i / len, 3); }
  }
  impulsions.set(c, b);
  return b;
}

const courbes = new Map<number, Float32Array<ArrayBuffer>>();
export function courbeSat(drive: number): Float32Array<ArrayBuffer> {
  const q = Math.round(drive * 20) / 20;
  let c = courbes.get(q);
  if (!c) {
    const a = 1 + q * 12, n = 1024; c = new Float32Array(n);
    for (let x = 0; x < n; x++) c[x] = Math.tanh(a * ((x / (n - 1)) * 2 - 1)) / Math.tanh(a);
    courbes.set(q, c);
  }
  return c;
}

