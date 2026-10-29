// Capture de l'entrée audio (Scarlett), puis outils de la prise : forme d'onde, découpe, normalisation et fichier WAV.
// Jusqu'à 40 minutes : le son n'est pas gardé en mémoire, il est écrit sur le disque (IndexedDB) toutes les 5 secondes,
// en PCM 24 bits. Seules les crêtes (une toutes les 50 ms) restent en mémoire pour la forme d'onde.
// Si l'onglet se ferme ou plante, les morceaux déjà écrits sont récupérés au prochain lancement (RecupPrises).
// Tout reste dans le navigateur.
import { contexte, declarerLecteur, liberer, prendreLaMain, sortieDirecte } from "./moteurAudio";
import { contexteEntree, getEntree, nulEntree, sortieEntree } from "./audioEntree";
import { ajouterEnregistrement, ecrireMetaPrise, ecrireMorceau, effacerPrise, lireMorceaux, type MetaPrise, type Morceau } from "./recordings";

const CODE_WORKLET = `
class E2Rec extends AudioWorkletProcessor {
  constructor() {
    super();
    this.on = true; this.n = 0; this.taille = 4096;
    this.l = new Float32Array(this.taille); this.r = new Float32Array(this.taille);
    this.port.onmessage = (e) => { if (e.data === "stop") { this.envoyer(); this.port.postMessage({ fin: true }); this.on = false; } };
  }
  envoyer() {
    if (!this.n) return;
    const l = this.l.slice(0, this.n), r = this.r.slice(0, this.n);
    this.port.postMessage({ l, r }, [l.buffer, r.buffer]);
    this.n = 0;
  }
  process(inputs) {
    if (!this.on) return false;
    const i = inputs[0];
    if (i && i.length) {
      const l = i[0], r = i[1] || i[0];
      for (let k = 0; k < l.length; k++) {
        this.l[this.n] = l[k]; this.r[this.n] = r[k]; this.n++;
        if (this.n === this.taille) this.envoyer();
      }
    }
    return true;
  }
}
registerProcessor("e2-rec", E2Rec);
`;
const workletsCharges = new WeakSet<BaseAudioContext>();

/** Une prise : le son est sur le disque (Blob PCM 24 bits entrelacé, sans en-tête), les crêtes en mémoire. */
export interface Prise {
  id: string;
  sr: number;
  canaux: 1 | 2;
  frames: number;           // nombre d'échantillons par canal
  saturations: number;
  pics: number[];           // crête (0 à 1) toutes les `pas` échantillons (50 ms)
  pas: number;
  donnees: Blob;
}

/** Durée maximale d'une prise : 40 minutes (≈ 16,6 Mo par minute en stéréo 48 kHz 24 bits). */
export const DUREE_MAX_S = 40 * 60;
/** Alertes avant la fin : 5 minutes et 1 minute. */
export const ALERTES_S = [300, 60];
const OCTETS = 3;            // 24 bits
const MORCEAU_S = 5;         // un morceau écrit sur le disque toutes les 5 s

/** Taille du fichier WAV 24 bits pour `frames` échantillons. */
export const tailleWav = (frames: number, canaux: number, bits = 24) => 44 + frames * canaux * (bits / 8);

/** Prises tenues par cet onglet (en cours ou pas encore gardées) : on ne les propose pas à la récupération. */
const ici = new Set<string>();
export const priseIci = (id: string) => ici.has(id);

export interface Capture {
  id: string;
  /** Arrête, finit d'écrire et rend la prise. */
  arreter(): Promise<Prise>;
  /** Secondes enregistrées. */
  duree(): number;
  /** Taille du fichier WAV 24 bits, en octets. */
  taille(): number;
  /** Crêtes récentes (0 à 1) pour dessiner la forme d'onde pendant l'enregistrement. */
  apercu: number[];
  saturations(): number;
  /** Le disque a refusé un morceau (stockage plein) : la suite est gardée en mémoire. */
  erreurDisque(): boolean;
}

export interface OptionsCapture {
  source: MetaPrise["source"];
  bpm?: number;
  /** Appelé une fois à la durée maximale. */
  quandPlein: () => void;
  /** Appelé à 5 min et 1 min de la fin (secondes restantes). */
  quandAlerte?: (s: number) => void;
}

const encoder24 = (out: Uint8Array, o: number, x: number) => {
  let v = Math.round((x > 1 ? 1 : x < -1 ? -1 : x) * 8388607);
  if (v < 0) v += 0x1000000;
  out[o] = v & 255; out[o + 1] = (v >> 8) & 255; out[o + 2] = (v >> 16) & 255;
};

/** Commence à enregistrer la sortie de l'entrée audio (déjà ouverte). */
export async function demarrerCapture(opt: OptionsCapture): Promise<Capture> {
  const ctx = contexteEntree(), sortie = sortieEntree(), nul = nulEntree();
  if (!ctx || !sortie || !nul) throw new Error("L'entrée audio n'est pas ouverte.");
  const sr = ctx.sampleRate;
  const canaux: 1 | 2 = getEntree().reglages.mode === "mono" ? 1 : 2;
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const parMorceau = sr * MORCEAU_S, oct = canaux * OCTETS;
  const pas = Math.round(sr / 20); // une crête toutes les 50 ms
  const max = DUREE_MAX_S * sr;
  let tampon = new Uint8Array(parMorceau * oct), nT = 0;
  let picsMorceau: number[] = [];
  const pics: number[] = [];
  const apercu = pics;
  let n = 0, sat = 0, plein = false, nMorceaux = 0, disqueKo = false;
  const memoire: Morceau[] = [];       // morceaux que le disque a refusés
  let picBloc = 0, nBloc = 0;
  const alertes = new Set<number>();
  const meta: MetaPrise = { id, sr, canaux, debut: new Date().toISOString(), majLe: Date.now(), frames: 0, morceaux: 0, saturations: 0, etat: "rec", source: opt.source, bpm: opt.bpm };
  ici.add(id);
  let ecritures: Promise<unknown> = ecrireMetaPrise(meta).catch(() => { disqueKo = true; });

  const vider = () => {
    if (!nT) return;
    const m: Morceau = { donnees: new Blob([tampon.slice(0, nT * oct)]), pics: picsMorceau, frames: nT };
    tampon = new Uint8Array(parMorceau * oct); nT = 0; picsMorceau = [];
    const k = ++nMorceaux;
    if (disqueKo) { memoire.push(m); return; }
    ecritures = ecritures.then(async () => {
      if (disqueKo) { memoire.push(m); return; }
      try {
        await ecrireMorceau(id, k, m);
        Object.assign(meta, { frames: n, morceaux: k, saturations: sat, majLe: Date.now() });
        await ecrireMetaPrise(meta);
      } catch { disqueKo = true; memoire.push(m); }
    });
  };

  const recevoir = (l: Float32Array, r: Float32Array) => {
    if (plein) return;
    const len = Math.min(l.length, max - n);
    for (let i = 0; i < len; i++) {
      const a = l[i], b = r[i];
      const v = Math.max(Math.abs(a), Math.abs(b));
      if (v >= 0.999) sat++;
      if (v > picBloc) picBloc = v;
      if (++nBloc >= pas) { const x = Math.round(picBloc * 1000) / 1000; pics.push(x); picsMorceau.push(x); picBloc = 0; nBloc = 0; }
      const o = nT * oct;
      if (canaux === 1) encoder24(tampon, o, a);
      else { encoder24(tampon, o, a); encoder24(tampon, o + 3, b); }
      if (++nT === parMorceau) vider();
    }
    n += len;
    const reste = (max - n) / sr;
    for (const s of ALERTES_S) if (reste <= s && !alertes.has(s) && DUREE_MAX_S > s) { alertes.add(s); opt.quandAlerte?.(s); }
    if (n >= max) { plein = true; opt.quandPlein(); }
  };

  const finir = async (): Promise<Prise> => {
    if (nBloc) { const x = Math.round(picBloc * 1000) / 1000; pics.push(x); picsMorceau.push(x); picBloc = 0; nBloc = 0; }
    vider();
    await ecritures;
    let morceaux: Morceau[] = [];
    try { morceaux = await lireMorceaux(id); } catch { morceaux = []; }
    const tous = [...morceaux, ...memoire];
    Object.assign(meta, { frames: n, morceaux: nMorceaux, saturations: sat, majLe: Date.now(), etat: "arretee" as const });
    if (!disqueKo) await ecrireMetaPrise(meta).catch(() => {});
    return { id, sr, canaux, frames: tous.reduce((x, m) => x + m.frames, 0), saturations: sat, pics, pas, donnees: new Blob(tous.map((m) => m.donnees)) };
  };

  const base = {
    id, apercu, duree: () => n / sr, saturations: () => sat, taille: () => tailleWav(n, canaux), erreurDisque: () => disqueKo,
  };

  // AudioWorklet (sans trous), sinon ScriptProcessor (ancien mais partout)
  let node: AudioWorkletNode | null = null;
  try {
    if (!workletsCharges.has(ctx)) {
      // Fichier ouvert en double-clic (file://) : seule une adresse « data: » est acceptée ; sur un site, « blob: » marche aussi.
      try { await ctx.audioWorklet.addModule(`data:application/javascript;base64,${btoa(CODE_WORKLET)}`); }
      catch {
        const url = URL.createObjectURL(new Blob([CODE_WORKLET], { type: "application/javascript" }));
        try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
      }
      workletsCharges.add(ctx);
    }
    node = new AudioWorkletNode(ctx, "e2-rec", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 2, channelCountMode: "explicit", channelInterpretation: "discrete" });
  } catch { node = null; }

  if (node) {
    const w = node;
    let fin: (() => void) | null = null;
    w.port.onmessage = (e: MessageEvent) => {
      const d = e.data as { l?: Float32Array; r?: Float32Array; fin?: boolean };
      if (d.l && d.r) recevoir(d.l, d.r);
      if (d.fin) fin?.();
    };
    sortie.connect(w); w.connect(nul);
    return {
      ...base,
      arreter: () => new Promise<Prise>((ok) => {
        const t = window.setTimeout(() => f(), 800);
        const f = () => { window.clearTimeout(t); fin = null; try { sortie.disconnect(w); w.disconnect(); } catch { /* */ } w.port.onmessage = null; void finir().then(ok); };
        fin = f;
        w.port.postMessage("stop");
      }),
    };
  }
  const sp = ctx.createScriptProcessor(4096, 2, 1);
  sp.onaudioprocess = (e) => { const b = e.inputBuffer; recevoir(b.getChannelData(0).slice(), (b.numberOfChannels > 1 ? b.getChannelData(1) : b.getChannelData(0)).slice()); };
  sortie.connect(sp); sp.connect(nul);
  return {
    ...base,
    arreter: async () => { try { sortie.disconnect(sp); sp.disconnect(); } catch { /* */ } sp.onaudioprocess = null; return finir(); },
  };
}

/** La prise n'est plus utile (gardée, jetée…) : efface ses morceaux du disque. */
export async function libererPrise(p: Prise | string) {
  const id = typeof p === "string" ? p : p.id;
  ici.delete(id);
  if (typeof p !== "string") { const u = urls.get(p); if (u) URL.revokeObjectURL(u); urls.delete(p); tampons.delete(p); }
  await effacerPrise(id).catch(() => {});
}
/** La prise reste sur le disque (pour la récupérer au prochain lancement), mais cet onglet la lâche. */
export const lacherPrise = (p: Prise) => { ici.delete(p.id); const u = urls.get(p); if (u) URL.revokeObjectURL(u); urls.delete(p); tampons.delete(p); };

// ---------------------------------------------------------------- Outils de la prise
const versPic = (p: Prise, frame: number) => Math.floor(frame / p.pas);

/** Crêtes (0 à 1) d'une partie du son, en `n` colonnes. */
export function cretes(p: Prise, n: number, debut = 0, fin = p.frames): number[] {
  const a0 = versPic(p, debut), b0 = Math.max(a0 + 1, Math.ceil(fin / p.pas));
  const len = b0 - a0, out: number[] = [];
  for (let c = 0; c < n; c++) {
    const a = a0 + Math.floor((c * len) / n), b = Math.max(a + 1, a0 + Math.floor(((c + 1) * len) / n));
    let m = 0;
    for (let i = a; i < b && i < p.pics.length; i++) if (p.pics[i] > m) m = p.pics[i];
    out.push(m);
  }
  return out;
}

/** Crête d'une partie (au pas de 50 ms : jamais plus basse que la vraie crête, donc la normalisation ne sature pas). */
export function crete(p: Prise, debut = 0, fin = p.frames) {
  let m = 0;
  const b = Math.min(p.pics.length, Math.ceil(fin / p.pas));
  for (let i = versPic(p, debut); i < b; i++) if (p.pics[i] > m) m = p.pics[i];
  return m;
}

/** Début et fin utiles : coupe le silence (sous −50 dBFS) au début et à la fin, en gardant 50 ms de marge. */
export function bornesUtiles(p: Prise): [number, number] {
  const seuil = Math.pow(10, -50 / 20), k = p.pics.length;
  let a = 0, b = k;
  while (a < k && p.pics[a] < seuil) a++;
  while (b > a && p.pics[b - 1] < seuil) b--;
  if (a >= b) return [0, p.frames];
  return [Math.max(0, (a - 1) * p.pas), Math.min(p.frames, (b + 1) * p.pas)];
}

/** En-tête d'un fichier WAV PCM. */
export function enteteWav(frames: number, canaux: number, sr: number, bits: 16 | 24): ArrayBuffer {
  const oct = bits / 8, data = frames * canaux * oct;
  const buf = new ArrayBuffer(44), v = new DataView(buf);
  const txt = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  txt(0, "RIFF"); v.setUint32(4, 36 + data, true); txt(8, "WAVE");
  txt(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, canaux, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * canaux * oct, true); v.setUint16(32, canaux * oct, true); v.setUint16(34, bits, true);
  txt(36, "data"); v.setUint32(40, data, true);
  return buf;
}

/** Fichier WAV (16 ou 24 bits) d'une partie de la prise, avec un gain (normalisation).
 *  En 24 bits sans gain, c'est un simple découpage du son déjà sur le disque (rien n'est recopié en mémoire) ;
 *  sinon le son est relu et réécrit par paquets de quelques secondes. */
export async function wavDe(p: Prise, debut: number, fin: number, gain = 1, bits: 16 | 24 = 24, progres?: (x: number) => void): Promise<Blob> {
  const n = Math.max(0, fin - debut), bpf = p.canaux * OCTETS;
  const entete = enteteWav(n, p.canaux, p.sr, bits);
  if (bits === 24 && Math.abs(gain - 1) < 1e-6) return new Blob([entete, p.donnees.slice(debut * bpf, fin * bpf)], { type: "audio/wav" });
  const parts: BlobPart[] = [entete];
  const PAQUET = 1 << 18;
  const max = bits === 16 ? 32767 : 8388607;
  for (let f = debut; f < fin; f += PAQUET) {
    const g = Math.min(fin, f + PAQUET);
    const src = new Uint8Array(await p.donnees.slice(f * bpf, g * bpf).arrayBuffer());
    const k = (g - f) * p.canaux;
    const out = new Uint8Array(k * (bits / 8));
    for (let i = 0, o = 0; i < k; i++) {
      let s = src[i * 3] | (src[i * 3 + 1] << 8) | (src[i * 3 + 2] << 16);
      if (s & 0x800000) s -= 0x1000000;
      let x = (s / 8388607) * gain;
      x = x > 1 ? 1 : x < -1 ? -1 : x;
      let v = Math.round(x * max);
      if (bits === 16) { if (v < 0) v += 0x10000; out[o++] = v & 255; out[o++] = (v >> 8) & 255; }
      else { if (v < 0) v += 0x1000000; out[o++] = v & 255; out[o++] = (v >> 8) & 255; out[o++] = (v >> 16) & 255; }
    }
    parts.push(out);
    progres?.((g - debut) / Math.max(1, n));
  }
  return new Blob(parts, { type: "audio/wav" });
}

/** Gain qui amène la crête à −1 dBFS. */
export const gainNormalise = (pic: number) => (pic > 1e-5 ? Math.pow(10, -1 / 20) / pic : 1);

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
/** « 2026-10-29_17h05_recette_kick-tribe-sature.wav » */
export function nomAuto(module: string, titre: string, d = new Date()) {
  const p = (x: number) => String(x).padStart(2, "0");
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}h${p(d.getMinutes())}`;
  return `${date}_${module}${titre ? `_${slug(titre)}` : ""}.wav`;
}


/** Range une prise retrouvée sur le disque (après un plantage, ou arrêtée mais pas gardée) dans « Mes enregistrements ». */
export async function recupererPrise(m: MetaPrise): Promise<number> {
  const morceaux = await lireMorceaux(m.id);
  if (!morceaux.length) { await effacerPrise(m.id); return 0; }
  const frames = morceaux.reduce((x, y) => x + y.frames, 0);
  const pics = morceaux.flatMap((x) => x.pics);
  const p: Prise = { id: m.id, sr: m.sr, canaux: m.canaux, frames, saturations: m.saturations, pics, pas: Math.round(m.sr / 20), donnees: new Blob(morceaux.map((x) => x.donnees)) };
  const blob = await wavDe(p, 0, frames);
  const nom = nomAuto(m.source.module, `${m.source.titre} recupere`, new Date(m.debut));
  await ajouterEnregistrement(new File([blob], nom, { type: "audio/wav" }), nom, {
    id: m.id, titre: `${m.source.titre} (récupéré)`, module: m.source.module, source: m.source.ref, sourceTitre: m.source.titre, href: m.source.href,
    duree: frames / m.sr, sr: m.sr, canaux: m.canaux, bits: 24, creteDb: 20 * Math.log10(Math.max(1e-6, crete(p))), bpm: m.bpm,
    apercu: cretes(p, 120).map((x) => Math.round(Math.min(1, x) * 100) / 100),
  });
  await effacerPrise(m.id);
  return frames / m.sr;
}

// ---------------------------------------------------------------- Réécoute (par le moteur audio partagé)
let lecture: { owner: string; stop: () => void; pos: () => number } | null = null;
const ecoute = new Set<() => void>();
export const surLecture = (f: () => void) => { ecoute.add(f); return () => { ecoute.delete(f); }; };
const prevenir = () => ecoute.forEach((f) => f());

export const lecteur = () => contexte();
declarerLecteur("prises", () => arreterLecture());
export function arreterLecture() {
  if (!lecture) return;
  const l = lecture; lecture = null;
  try { l.stop(); } catch { /* */ }
  liberer("prises");
  prevenir();
}
/** Joue un AudioBuffer de `debut` à `fin` (secondes). */
export function jouerTampon(owner: string, b: AudioBuffer, debut: number, fin: number, gain = 1, boucle = false) {
  arreterLecture();
  prendreLaMain("prises");
  const c = lecteur();
  const src = c.createBufferSource(); src.buffer = b;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(g).connect(sortieDirecte());
  if (boucle) { src.loop = true; src.loopStart = debut; src.loopEnd = fin; src.start(0, debut); }
  else src.start(0, debut, Math.max(0.01, fin - debut));
  const t0 = c.currentTime;
  const moi = {
    owner, stop: () => src.stop(),
    pos: () => { const d = c.currentTime - t0; return Math.min(b.duration, boucle ? debut + (d % Math.max(0.01, fin - debut)) : debut + d); },
  };
  src.onended = () => { if (lecture === moi) { lecture = null; liberer("prises"); prevenir(); } };
  lecture = moi; prevenir();
}

/** Joue un long fichier sans le décoder en entier : le navigateur le lit au fur et à mesure depuis le disque. */
export function jouerFichier(owner: string, url: string, debut: number, fin: number, gain = 1, boucle = false) {
  arreterLecture();
  prendreLaMain("prises");
  const a = new Audio(); a.preload = "auto"; a.src = url;
  if (gain > 1.0001) {
    try { const c = lecteur(); const s = c.createMediaElementSource(a); const g = c.createGain(); g.gain.value = gain; s.connect(g).connect(sortieDirecte()); }
    catch { /* lecture sans gain */ }
  } else a.volume = Math.max(0, Math.min(1, gain));
  let iv = 0;
  const moi = {
    owner,
    stop: () => { window.clearInterval(iv); a.pause(); a.removeAttribute("src"); a.load(); },
    pos: () => a.currentTime,
  };
  const fini = () => { if (lecture === moi) { window.clearInterval(iv); a.pause(); lecture = null; liberer("prises"); prevenir(); } };
  a.addEventListener("loadedmetadata", () => { a.currentTime = debut; void a.play().catch(fini); }, { once: true });
  a.addEventListener("ended", () => { if (boucle) { a.currentTime = debut; void a.play(); } else fini(); });
  a.addEventListener("error", fini);
  iv = window.setInterval(() => { if (a.currentTime >= fin) { if (boucle) a.currentTime = debut; else fini(); } }, 25);
  lecture = moi; prevenir();
}

/** Au-delà de 2 minutes, une prise se réécoute depuis le disque au lieu d'être décodée en mémoire. */
const LIMITE_DECODAGE_S = 120;
const urls = new WeakMap<Prise, string>();
const tampons = new WeakMap<Prise, AudioBuffer>();
/** Réécoute une partie de la prise (secondes). */
export async function jouerPrise(owner: string, p: Prise, debut: number, fin: number, gain = 1, boucle = false) {
  if (p.frames / p.sr <= LIMITE_DECODAGE_S) {
    let b = tampons.get(p);
    if (!b) { b = await decoderBlob(new Blob([enteteWav(p.frames, p.canaux, p.sr, 24), p.donnees], { type: "audio/wav" })); tampons.set(p, b); }
    jouerTampon(owner, b, debut, fin, gain, boucle);
    return;
  }
  let u = urls.get(p);
  if (!u) { u = URL.createObjectURL(new Blob([enteteWav(p.frames, p.canaux, p.sr, 24), p.donnees], { type: "audio/wav" })); urls.set(p, u); }
  jouerFichier(owner, u, debut, fin, gain, boucle);
}

/** Qui joue, et où en est la lecture (secondes dans le son). */
export function etatLecture(): { owner: string; pos: number } | null {
  if (!lecture) return null;
  return { owner: lecture.owner, pos: lecture.pos() };
}

/** Décode un enregistrement gardé (WAV ou autre) pour le réécouter. */
export async function decoderBlob(b: Blob): Promise<AudioBuffer> {
  const c = lecteur();
  return c.decodeAudioData(await b.arrayBuffer());
}
