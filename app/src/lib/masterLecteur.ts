// Lecteur du module Mastering : lit le son, le fait passer dans la chaîne en direct et permet de comparer
// Avant (A), Après (B) et le morceau de référence, avec un fondu court pour éviter les clics.
// La chaîne tourne à la fréquence du fichier ; si la carte son tourne à une autre fréquence, on convertit seulement pour l'écoute.
import { declarerLecteur, liberer, prendreLaMain, quandNouveauContexte, sortieDirecte } from "./moteurAudio";
import { ChaineMastering, type Reglages } from "./masterDsp";
import { filtresK, type Biq, type Son } from "./masterAnalyse";

export type Source = "A" | "B" | "R";

export interface Compteurs {
  momA: number; momB: number;       // volume perçu momentané (400 ms), LUFS
  pkA: number; pkB: number;         // crête du dernier bloc, dBFS
  grComp: number; grLim: number;    // réduction de gain, dB
  liveA: number; liveB: number;     // volume perçu estimé sur ce qui a été joué depuis le dernier réglage
}

const RING = 8192;

class FiltreK {
  private c: [Biq, Biq]; private z = new Float64Array(8);
  constructor(sr: number) { this.c = filtresK(sr); }
  run(x: number, ch: number): number {
    for (let s = 0; s < 2; s++) {
      const c = this.c[s], o = ch * 4 + s * 2;
      const y = c.b0 * x + this.z[o];
      this.z[o] = c.b1 * x - c.a1 * y + this.z[o + 1];
      this.z[o + 1] = c.b2 * x - c.a2 * y;
      x = y;
    }
    return x;
  }
}

export class Lecteur {
  ctx: AudioContext | null = null;
  private proc: ScriptProcessorNode | null = null;
  son: Son | null = null;
  ref: Son | null = null;
  private chaine: ChaineMastering | null = null;
  pos = 0;                // position de lecture dans le fichier (échantillons)
  refPos = 0;
  lecture = false;
  boucle = false;
  zone: [number, number] | null = null;   // passage en boucle (échantillons)
  source: Source = "B";
  mono = false;
  gains = { A: 1, B: 1, R: 1 };
  private poids = { A: 0, B: 1, R: 0 };
  private fin = -1;       // nombre d'échantillons à vider après la fin (mode « une fois »)
  // tampons entre la chaîne (fréquence du fichier) et la carte son
  private fA: Float32Array[] = [new Float32Array(65536), new Float32Array(65536)];
  private fB: Float32Array[] = [new Float32Array(65536), new Float32Array(65536)];
  private fLen = 0; private frac = 0;
  private dly: Float32Array[] = [new Float32Array(1), new Float32Array(1)]; private dlyPos = 0;
  // pour les dessins
  ringA = new Float32Array(RING); ringB = new Float32Array(RING); ringL = new Float32Array(RING); ringR = new Float32Array(RING); ringPos = 0;
  cpt: Compteurs = { momA: -Infinity, momB: -Infinity, pkA: -Infinity, pkB: -Infinity, grComp: 0, grLim: 0, liveA: NaN, liveB: NaN };
  private kA: FiltreK | null = null; private kB: FiltreK | null = null;
  private momBufA = new Float64Array(4); private momBufB = new Float64Array(4); private momI = 0;
  private accA = 0; private accB = 0; private accN = 0; private blocA = 0; private blocB = 0; private blocN = 0;
  surFin: (() => void) | null = null;

  /** Charge un son : crée (ou recrée) la carte son à la fréquence du fichier quand c'est possible. */
  charger(son: Son, r: Reglages) {
    this.arreter();
    this.son = son;
    this.chaine = new ChaineMastering(son.sr);
    this.chaine.regler(r);
    const lat = this.chaine.latence;
    this.dly = [new Float32Array(lat + 1), new Float32Array(lat + 1)]; this.dlyPos = 0;
    this.kA = new FiltreK(son.sr); this.kB = new FiltreK(son.sr);
    this.pos = 0; this.zone = null; this.fLen = 0; this.frac = 0;
    if (this.ctx && this.ctx.sampleRate !== son.sr) { this.proc?.disconnect(); this.ctx = null; this.proc = null; }
    this.razLive();
  }

  regler(r: Reglages) { this.chaine?.regler(r); this.razLive(); }

  razLive() { this.accA = this.accB = this.accN = 0; this.blocA = this.blocB = this.blocN = 0; this.cpt.liveA = NaN; this.cpt.liveB = NaN; }

  get frequenceCarte(): number { return this.ctx?.sampleRate ?? 0; }

  // Le moteur audio partagé, à la fréquence du fichier quand c'est possible, par la sortie sans traitement.
  private assurerCtx() {
    if (this.ctx && this.ctx.state !== "closed") return;
    const sr = this.son?.sr ?? 44100;
    let out: GainNode;
    try { out = sortieDirecte({ sampleRate: sr }); } catch { out = sortieDirecte(); }
    this.ctx = out.context as AudioContext;
    this.proc = this.ctx.createScriptProcessor(4096, 0, 2);
    this.proc.onaudioprocess = (e) => this.remplir(e.outputBuffer);
    this.proc.connect(out);
  }
  constructor() {
    declarerLecteur("mastering", () => this.arreter());
    quandNouveauContexte((c) => { if (this.ctx && this.ctx !== c) { this.arreter(); this.proc?.disconnect(); this.ctx = null; this.proc = null; } });
  }

  async jouer() {
    if (!this.son) return;
    this.assurerCtx();
    await this.ctx!.resume();
    if (!this.lecture) {
      const [a, b] = this.zone && this.boucle ? this.zone : [0, this.son.L.length];
      if (this.pos >= b || this.pos < a) this.pos = a;
    }
    this.fin = -1;
    this.lecture = true;
    prendreLaMain("mastering");
  }

  arreter() { this.lecture = false; this.fLen = 0; this.frac = 0; liberer("mastering"); }

  aller(pos: number) { if (this.son) { this.pos = Math.max(0, Math.min(this.son.L.length - 1, Math.round(pos))); this.fLen = 0; this.frac = 0; } }

  /** Remplit le tampon de la carte son. */
  private remplir(out: AudioBuffer) {
    const oL = out.getChannelData(0), oR = out.getChannelData(1), N = oL.length;
    if (!this.lecture || !this.son || !this.chaine) { oL.fill(0); oR.fill(0); return; }
    const ratio = this.son.sr / out.sampleRate;
    while (this.fLen < this.frac + N * ratio + 2) this.produire(1024);
    const tgt = { A: this.source === "A" ? 1 : 0, B: this.source === "B" ? 1 : 0, R: this.source === "R" ? 1 : 0 };
    const pasFondu = 1 / (0.03 * out.sampleRate); // fondu de 30 ms
    const ref = this.ref, refStep = ref ? ref.sr / out.sampleRate : 0;
    for (let i = 0; i < N; i++) {
      const x = this.frac + i * ratio, i0 = Math.floor(x), t = x - i0;
      for (const k of ["A", "B", "R"] as const) {
        const d = tgt[k] - this.poids[k];
        this.poids[k] += Math.abs(d) < pasFondu ? d : Math.sign(d) * pasFondu;
      }
      const wA = this.poids.A * this.gains.A, wB = this.poids.B * this.gains.B;
      let l = (this.fA[0][i0] * (1 - t) + this.fA[0][i0 + 1] * t) * wA + (this.fB[0][i0] * (1 - t) + this.fB[0][i0 + 1] * t) * wB;
      let r = (this.fA[1][i0] * (1 - t) + this.fA[1][i0 + 1] * t) * wA + (this.fB[1][i0] * (1 - t) + this.fB[1][i0 + 1] * t) * wB;
      if (ref && this.poids.R > 0) {
        const j = Math.floor(this.refPos), u = this.refPos - j, j1 = (j + 1) % ref.L.length, wR = this.poids.R * this.gains.R;
        l += (ref.L[j] * (1 - u) + ref.L[j1] * u) * wR; r += (ref.R[j] * (1 - u) + ref.R[j1] * u) * wR;
        this.refPos += refStep; if (this.refPos >= ref.L.length) this.refPos -= ref.L.length;
      }
      if (this.mono) { const m = (l + r) * 0.5; l = m; r = m; }
      oL[i] = l; oR[i] = r;
    }
    const used = Math.floor(this.frac + N * ratio);
    this.frac = this.frac + N * ratio - used;
    for (const f of [...this.fA, ...this.fB]) f.copyWithin(0, used, this.fLen);
    this.fLen -= used;
    if (this.fin === 0) { this.lecture = false; this.fin = -1; setTimeout(() => this.surFin?.(), 0); }
  }

  /** Lit k échantillons du fichier, les passe dans la chaîne et les range dans les tampons. */
  private produire(k: number) {
    const s = this.son!, ch = this.chaine!, n = s.L.length;
    const inL = new Float32Array(k), inR = new Float32Array(k);
    const [za, zb] = this.zone && this.boucle ? this.zone : [0, n];
    for (let i = 0; i < k; i++) {
      if (this.pos >= zb) {
        if (this.boucle) this.pos = za;
        else { if (this.fin < 0) this.fin = ch.latence + 4096; }
      }
      if (this.fin >= 0) { inL[i] = 0; inR[i] = 0; if (this.fin > 0) this.fin--; continue; }
      inL[i] = s.L[this.pos]; inR[i] = s.R[this.pos]; this.pos++;
    }
    const wL = new Float32Array(k), wR = new Float32Array(k);
    ch.process(inL, inR, wL, wR, k);
    // l'avant est retardé comme l'après, pour que A et B restent calés
    const D = this.dly[0].length, o = this.fLen;
    let pA = 0, pB = 0, eA = 0, eB = 0;
    for (let i = 0; i < k; i++) {
      this.dly[0][this.dlyPos] = inL[i]; this.dly[1][this.dlyPos] = inR[i];
      this.dlyPos = (this.dlyPos + 1) % D;
      const aL = this.dly[0][this.dlyPos], aR = this.dly[1][this.dlyPos];
      this.fA[0][o + i] = aL; this.fA[1][o + i] = aR; this.fB[0][o + i] = wL[i]; this.fB[1][o + i] = wR[i];
      const rp = this.ringPos; this.ringA[rp] = (aL + aR) * 0.5; this.ringB[rp] = (wL[i] + wR[i]) * 0.5;
      const sl = this.source === "A" ? aL : wL[i], sr = this.source === "A" ? aR : wR[i];
      this.ringL[rp] = sl; this.ringR[rp] = sr; this.ringPos = (rp + 1) % RING;
      pA = Math.max(pA, Math.abs(aL), Math.abs(aR)); pB = Math.max(pB, Math.abs(wL[i]), Math.abs(wR[i]));
      const ka = this.kA!.run(aL, 0), kb = this.kA!.run(aR, 1), kc = this.kB!.run(wL[i], 0), kd = this.kB!.run(wR[i], 1);
      eA += ka * ka + kb * kb; eB += kc * kc + kd * kd;
    }
    this.fLen += k;
    // momentané : 4 blocs ≈ 400 ms à 44,1/48 kHz (blocs de 1024 → on regroupe jusqu'à ~100 ms)
    this.blocA += eA; this.blocB += eB; this.blocN += k;
    if (this.blocN >= s.sr / 10) {
      const mA = this.blocA / this.blocN, mB = this.blocB / this.blocN;
      this.momBufA[this.momI] = mA; this.momBufB[this.momI] = mB; this.momI = (this.momI + 1) % 4;
      const lu = (x: number) => -0.691 + 10 * Math.log10(x + 1e-20);
      this.cpt.momA = lu(this.momBufA.reduce((a, b) => a + b, 0) / 4);
      this.cpt.momB = lu(this.momBufB.reduce((a, b) => a + b, 0) / 4);
      // estimation du volume sur ce qui a été joué (blocs pas silencieux seulement)
      if (lu(mA) > -50 && this.fin < 0) { this.accA += mA; this.accB += mB; this.accN++; }
      if (this.accN >= 10) { this.cpt.liveA = lu(this.accA / this.accN); this.cpt.liveB = lu(this.accB / this.accN); }
      this.blocA = this.blocB = this.blocN = 0;
    }
    const db = (x: number) => 20 * Math.log10(Math.max(x, 1e-9));
    this.cpt.pkA = db(pA); this.cpt.pkB = db(pB);
    this.cpt.grComp = ch.mes.grComp; this.cpt.grLim = ch.mes.grLim;
  }

  /** Position entendue (en secondes), en tenant compte des tampons. */
  get temps(): number {
    if (!this.son) return 0;
    const lat = (this.chaine?.latence ?? 0) + this.fLen;
    const n = this.son.L.length;
    return (((this.pos - lat) % n) + n) % n / this.son.sr;
  }

  fermer() { this.arreter(); this.proc?.disconnect(); this.ctx = null; this.proc = null; }
}
