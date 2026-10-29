// Moteur de la chaîne de mastering : EQ → compresseur → saturation → largeur stéréo → limiteur.
// Le même code sert à l'écoute (en direct) et à l'export WAV : ce que tu entends est ce que tu exportes.
// Tout est calculé en JavaScript, échantillon par échantillon, à la fréquence d'origine du fichier.

export type TypeBande = "hp" | "ls" | "pk" | "hs" | "lp";
export interface Bande { type: TypeBande; on: boolean; f: number; g: number; q: number }

export interface Reglages {
  eq: { on: boolean; bandes: Bande[] };
  comp: { on: boolean; seuil: number; ratio: number; attaque: number; relachement: number; genou: number; gain: number };
  sat: { on: boolean; drive: number; mix: number };
  larg: { on: boolean; largeur: number; monoGrave: boolean; freqMono: number };
  lim: { on: boolean; gain: number; plafond: number; relachement: number };
}

export const NOMS_BANDES = ["Coupe-bas", "Grave", "Bas-médium", "Médium", "Haut-médium", "Aigu"];

/** Réglages neutres : tout est éteint, le son passe sans changement. */
export function reglagesNeutres(): Reglages {
  return {
    eq: { on: false, bandes: [
      { type: "hp", on: false, f: 30, g: 0, q: 0.71 },
      { type: "ls", on: true, f: 90, g: 0, q: 0.71 },
      { type: "pk", on: true, f: 300, g: 0, q: 1 },
      { type: "pk", on: true, f: 1000, g: 0, q: 1 },
      { type: "pk", on: true, f: 3500, g: 0, q: 1 },
      { type: "hs", on: true, f: 10000, g: 0, q: 0.71 },
    ] },
    comp: { on: false, seuil: -12, ratio: 2, attaque: 30, relachement: 150, genou: 6, gain: 0 },
    sat: { on: false, drive: 3, mix: 50 },
    larg: { on: false, largeur: 100, monoGrave: true, freqMono: 120 },
    lim: { on: false, gain: 0, plafond: -1, relachement: 80 },
  };
}

export const copie = (r: Reglages): Reglages => JSON.parse(JSON.stringify(r));

/** Complète des réglages partiels (preset ancien, import) avec les valeurs neutres. */
export function completer(r: Partial<Reglages> | undefined): Reglages {
  const n = reglagesNeutres();
  if (!r) return n;
  const bandes = n.eq.bandes.map((b, i) => ({ ...b, ...(r.eq?.bandes?.[i] ?? {}) }));
  return {
    eq: { ...n.eq, ...(r.eq ?? {}), bandes },
    comp: { ...n.comp, ...(r.comp ?? {}) },
    sat: { ...n.sat, ...(r.sat ?? {}) },
    larg: { ...n.larg, ...(r.larg ?? {}) },
    lim: { ...n.lim, ...(r.lim ?? {}) },
  };
}

// ---------------------------------------------------------------- biquads (formules RBJ)
export interface Coef { b0: number; b1: number; b2: number; a1: number; a2: number }
const PASSE: Coef = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 };

export function coefBande(b: Bande, sr: number): Coef {
  const f = Math.min(Math.max(b.f, 10), sr * 0.49);
  const w = (2 * Math.PI * f) / sr;
  const cw = Math.cos(w), sw = Math.sin(w);
  const q = Math.max(b.q, 0.1);
  const alpha = sw / (2 * q);
  const A = Math.pow(10, b.g / 40);
  let b0 = 1, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;
  switch (b.type) {
    case "hp": b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case "lp": b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case "pk": b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A; break;
    case "ls": {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) - (A - 1) * cw + s); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - s);
      a0 = (A + 1) + (A - 1) * cw + s; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - s; break;
    }
    case "hs": {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) + (A - 1) * cw + s); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - s);
      a0 = (A + 1) - (A - 1) * cw + s; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - s; break;
    }
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Gain (dB) d'un biquad à la fréquence f : sert à dessiner la courbe de l'EQ sur le spectre. */
export function gainCoef(c: Coef, f: number, sr: number): number {
  const w = (2 * Math.PI * f) / sr;
  const c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
  const nr = c.b0 + c.b1 * c1 + c.b2 * c2, ni = -(c.b1 * s1 + c.b2 * s2);
  const dr = 1 + c.a1 * c1 + c.a2 * c2, di = -(c.a1 * s1 + c.a2 * s2);
  return 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di) + 1e-30);
}

/** Courbe totale de l'EQ (dB) aux fréquences demandées. */
export function courbeEq(r: Reglages, freqs: number[], sr: number): number[] {
  const cs = r.eq.bandes.filter((b) => b.on).map((b) => coefBande(b, sr));
  return freqs.map((f) => (r.eq.on ? cs.reduce((s, c) => s + gainCoef(c, f, sr), 0) : 0));
}

/** Un biquad stéréo (deux états). */
class Biquad {
  c: Coef = PASSE;
  z1 = [0, 0]; z2 = [0, 0];
  run(x: number, ch: number): number {
    const c = this.c;
    const y = c.b0 * x + this.z1[ch];
    this.z1[ch] = c.b1 * x - c.a1 * y + this.z2[ch];
    this.z2[ch] = c.b2 * x - c.a2 * y;
    return y;
  }
  reset() { this.z1 = [0, 0]; this.z2 = [0, 0]; }
}

const dbToLin = (db: number) => Math.pow(10, db / 20);
const linToDb = (x: number) => 20 * Math.log10(Math.max(x, 1e-12));

/** Retard du limiteur (anticipation), en millisecondes. Constant, même limiteur éteint : l'avant et l'après restent alignés. */
export const ANTICIPATION_MS = 5;

export interface Mesures { grComp: number; grLim: number }

export class ChaineMastering {
  readonly sr: number;
  readonly latence: number;           // en échantillons
  private r: Reglages = reglagesNeutres();
  private eq: Biquad[] = Array.from({ length: 6 }, () => new Biquad());
  private eqActifs: Biquad[] = [];
  // compresseur
  private envDb = 0; private aAtt = 0; private aRel = 0;
  // largeur : filtres passe-haut sur le côté (S) pour mettre le grave en mono
  private sHp1 = new Biquad(); private sHp2 = new Biquad();
  // limiteur à anticipation
  private L: number;
  private dl: Float64Array; private dr: Float64Array;   // retard du signal
  private tg: Float64Array;                              // gain voulu, tampon circulaire
  private dqI: Int32Array; private dqV: Float64Array; private dqH = 0; private dqT = 0; // file pour le minimum glissant
  private moy: Float64Array; private moySom = 0;         // moyenne glissante du gain
  private env = 1; private aLimRel = 0;
  private pos = 0;
  private satK = 1;
  mes: Mesures = { grComp: 0, grLim: 0 };

  constructor(sr: number) {
    this.sr = sr;
    this.L = Math.max(1, Math.round((ANTICIPATION_MS / 1000) * sr));
    this.latence = this.L;
    this.dl = new Float64Array(this.L + 1); this.dr = new Float64Array(this.L + 1);
    this.tg = new Float64Array(this.L + 1);
    this.dqI = new Int32Array(this.L * 2 + 8); this.dqV = new Float64Array(this.L * 2 + 8);
    this.moy = new Float64Array(this.L).fill(1); this.moySom = this.L;
    this.regler(this.r);
  }

  regler(r: Reglages) {
    this.r = copie(r);
    const sr = this.sr;
    r.eq.bandes.forEach((b, i) => { this.eq[i].c = coefBande(b, sr); });
    this.eqActifs = r.eq.bandes.map((b, i) => (b.on ? this.eq[i] : null)).filter(Boolean) as Biquad[];
    this.aAtt = Math.exp(-1 / (Math.max(r.comp.attaque, 0.05) / 1000 * sr));
    this.aRel = Math.exp(-1 / (Math.max(r.comp.relachement, 1) / 1000 * sr));
    const hp: Bande = { type: "hp", on: true, f: r.larg.freqMono, g: 0, q: 0.71 };
    this.sHp1.c = coefBande(hp, sr); this.sHp2.c = coefBande(hp, sr);
    this.aLimRel = Math.exp(-1 / (Math.max(r.lim.relachement, 1) / 1000 * sr));
    this.satK = dbToLin(r.sat.drive);
  }

  reset() {
    this.eq.forEach((b) => b.reset()); this.sHp1.reset(); this.sHp2.reset();
    this.envDb = 0; this.env = 1;
    this.dl.fill(0); this.dr.fill(0); this.tg.fill(1);
    this.dqH = this.dqT = 0; this.moy.fill(1); this.moySom = this.L; this.pos = 0;
  }

  /** Traite n échantillons. Les sorties ont un retard de `latence` échantillons. */
  process(inL: Float32Array, inR: Float32Array, outL: Float32Array, outR: Float32Array, n: number, off = 0, outOff = 0) {
    const r = this.r;
    const eqOn = r.eq.on && this.eqActifs.length > 0;
    const c = r.comp;
    const compOn = c.on;
    const knee = Math.max(c.genou, 0), slope = 1 - 1 / Math.max(c.ratio, 1);
    const makeup = dbToLin(c.gain);
    const satOn = r.sat.on, sk = this.satK, wet = r.sat.mix / 100;
    const largOn = r.larg.on, w = r.larg.largeur / 100, mono = r.larg.monoGrave;
    const lim = r.lim, limOn = lim.on, limIn = dbToLin(lim.gain), plafond = dbToLin(lim.plafond);
    const L = this.L, N = L + 1;
    let grC = 0, grL = 0;

    for (let i = 0; i < n; i++) {
      let l = inL[off + i], rr = inR[off + i];
      if (eqOn) for (const b of this.eqActifs) { l = b.run(l, 0); rr = b.run(rr, 1); }

      if (compOn) {
        const pk = Math.max(Math.abs(l), Math.abs(rr));
        const xdb = linToDb(pk);
        // courbe à genou doux
        const d = xdb - c.seuil;
        let gr = 0;
        if (2 * d < -knee) gr = 0;
        else if (knee > 0 && 2 * Math.abs(d) <= knee) gr = slope * ((d + knee / 2) ** 2) / (2 * knee);
        else gr = slope * d;
        // lissage dans le domaine dB : attaque quand la réduction grandit, relâchement sinon
        const a = gr > this.envDb ? this.aAtt : this.aRel;
        this.envDb = gr + a * (this.envDb - gr);
        const g = dbToLin(-this.envDb) * makeup;
        l *= g; rr *= g;
        if (this.envDb > grC) grC = this.envDb;
      }

      if (satOn) {
        // tanh(k·x)/k : les petits signaux gardent leur niveau, les crêtes sont arrondies
        l = l + wet * (Math.tanh(sk * l) / sk - l);
        rr = rr + wet * (Math.tanh(sk * rr) / sk - rr);
      }

      if (largOn) {
        const m = (l + rr) * 0.5;
        let s = (l - rr) * 0.5;
        if (mono) { s = this.sHp1.run(s, 0); s = this.sHp2.run(s, 0); }
        s *= w;
        l = m + s; rr = m - s;
      }

      // limiteur : toujours le retard, limitation seulement si allumé
      const p = this.pos;
      let x1 = l, x2 = rr;
      if (limOn) { x1 *= limIn; x2 *= limIn; }
      this.dl[p] = x1; this.dr[p] = x2;
      let t = 1;
      if (limOn) {
        const pk = Math.max(Math.abs(x1), Math.abs(x2));
        t = pk > plafond ? plafond / pk : 1;
      }
      // minimum glissant sur les L + 1 derniers gains voulus (file monotone)
      const idx = this.compteur++;
      while (this.dqT > this.dqH && this.dqV[(this.dqT - 1) % this.dqV.length] >= t) this.dqT--;
      this.dqV[this.dqT % this.dqV.length] = t; this.dqI[this.dqT % this.dqI.length] = idx; this.dqT++;
      while (this.dqI[this.dqH % this.dqI.length] <= idx - L - 1) this.dqH++;
      const mn = this.dqV[this.dqH % this.dqV.length];
      // relâchement : remonte doucement, descend tout de suite
      this.env = mn < this.env ? mn : mn + this.aLimRel * (this.env - mn);
      // moyenne glissante sur L : la descente se fait en douceur, avant le pic (anticipation)
      const k = idx % L;
      this.moySom += this.env - this.moy[k]; this.moy[k] = this.env;
      const g = this.moySom / L;
      const rp = (p + 1) % N; // le plus ancien = retard de L
      let o1 = this.dl[rp], o2 = this.dr[rp];
      if (limOn) {
        o1 *= g; o2 *= g;
        // sécurité contre les arrondis
        if (o1 > plafond) o1 = plafond; else if (o1 < -plafond) o1 = -plafond;
        if (o2 > plafond) o2 = plafond; else if (o2 < -plafond) o2 = -plafond;
        const red = -linToDb(g);
        if (red > grL) grL = red;
      }
      this.pos = rp;
      outL[outOff + i] = o1; outR[outOff + i] = o2;
      if ((idx & 0xffff) === 0) this.moySom = this.moy.reduce((a, b) => a + b, 0); // évite la dérive des arrondis
    }
    this.mes = { grComp: grC, grLim: grL };
  }
  private compteur = 0;
}

/** Traite tout un fichier (export, mesure de l'après). Rend la main au navigateur régulièrement. */
export async function rendre(
  L: Float32Array, R: Float32Array, sr: number, r: Reglages,
  opts: { progres?: (x: number) => void; annule?: () => boolean } = {},
): Promise<{ L: Float32Array; R: Float32Array } | null> {
  const ch = new ChaineMastering(sr);
  ch.regler(r);
  const n = L.length, lat = ch.latence;
  const oL = new Float32Array(n), oR = new Float32Array(n);
  const tmpL = new Float32Array(8192), tmpR = new Float32Array(8192);
  const zero = new Float32Array(8192);
  let lu = 0, ecrit = 0, t0 = performance.now();
  const total = n + lat;
  while (lu < total) {
    const k = Math.min(8192, total - lu);
    const reste = Math.max(0, Math.min(k, n - lu));
    if (reste > 0) {
      tmpL.set(L.subarray(lu, lu + reste)); tmpR.set(R.subarray(lu, lu + reste));
      if (reste < k) { tmpL.fill(0, reste, k); tmpR.fill(0, reste, k); }
      ch.process(tmpL, tmpR, tmpL, tmpR, k);
    } else ch.process(zero, zero, tmpL, tmpR, k);
    // on jette les `lat` premiers échantillons (retard du limiteur)
    for (let i = 0; i < k; i++) {
      const pos = lu + i - lat;
      if (pos >= 0 && pos < n) { oL[pos] = tmpL[i]; oR[pos] = tmpR[i]; ecrit++; }
    }
    lu += k;
    if (performance.now() - t0 > 25) {
      opts.progres?.(lu / total);
      await new Promise((res) => setTimeout(res, 0));
      if (opts.annule?.()) return null;
      t0 = performance.now();
    }
  }
  opts.progres?.(1);
  void ecrit;
  return { L: oL, R: oR };
}
