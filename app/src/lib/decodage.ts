// Ouvrir un fichier audio dans le navigateur : WAV lu directement, MP3 / FLAC / M4A / AAC décodés par le navigateur.
import { lireWav, type Son } from "./masterAnalyse";
import { contexte } from "./moteurAudio";

export async function decoderNavigateur(buf: ArrayBuffer, nom: string): Promise<Son> {
  const c = contexte();   // le moteur audio partagé décode aussi les fichiers
  try {
    const b = await c.decodeAudioData(buf.slice(0));
    const L = b.getChannelData(0).slice(), R = (b.numberOfChannels > 1 ? b.getChannelData(1) : b.getChannelData(0)).slice();
    return { nom, sr: b.sampleRate, bits: 0, canaux: b.numberOfChannels, L, R, decodeNavigateur: true };
  } catch { throw new Error("Impossible de lire ce fichier. Formats acceptés : WAV, MP3, FLAC, M4A, AAC (le décodage dépend de ton navigateur ; le WAV marche partout)."); }
}

export async function ouvrirAudio(f: File): Promise<Son> {
  const buf = await f.arrayBuffer();
  try { return lireWav(buf, f.name); }
  catch (e) {
    if (/\.wave?$/i.test(f.name)) throw e;
    return decoderNavigateur(buf, f.name);
  }
}
