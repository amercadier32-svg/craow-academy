// Export MP3 du Mastering, encodé dans le navigateur (encodeur LAME en JavaScript, licence LGPL).
import { Mp3Encoder } from "@breezystack/lamejs";

/** Fréquences acceptées par le format MP3. */
export const FREQS_MP3 = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];
export const mp3Possible = (sr: number) => FREQS_MP3.includes(sr);

export async function ecrireMp3(L: Float32Array, R: Float32Array, sr: number, kbps: number, progres?: (x: number) => void): Promise<Blob> {
  const enc = new Mp3Encoder(2, sr, kbps);
  const BLOC = 1152 * 32, n = L.length;
  const l16 = new Int16Array(BLOC), r16 = new Int16Array(BLOC);
  const morceaux: Uint8Array[] = [];
  const conv = (x: number) => Math.max(-32768, Math.min(32767, Math.round(x * 32767)));
  let t0 = performance.now();
  for (let i = 0; i < n; i += BLOC) {
    const k = Math.min(BLOC, n - i);
    for (let j = 0; j < k; j++) { l16[j] = conv(L[i + j]); r16[j] = conv(R[i + j]); }
    const out = enc.encodeBuffer(l16.subarray(0, k), r16.subarray(0, k));
    if (out.length) morceaux.push(out.slice());
    if (performance.now() - t0 > 30) { progres?.(i / n); await new Promise((res) => setTimeout(res, 0)); t0 = performance.now(); }
  }
  const fin = enc.flush();
  if (fin.length) morceaux.push(fin.slice());
  return new Blob(morceaux as BlobPart[], { type: "audio/mpeg" });
}
