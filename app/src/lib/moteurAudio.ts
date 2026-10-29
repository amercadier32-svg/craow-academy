// Le moteur audio unique de l'app : un seul AudioContext pour les aperçus (recettes, grilles, effets, gammes,
// glossaire), l'entrée de la Scarlett (vumètre, enregistreur, visualiseur), la lecture des prises, le Mastering,
// l'analyse de référence et les bips de Session.
// - Une seule sortie générale, avec un limiteur : plusieurs aperçus ensemble ne saturent pas.
// - Lancer un aperçu arrête les autres ; changer de page arrête tout, avec un fondu d'environ 25 ms (pas de clic).
// - Sur téléphone : moins de voix en même temps et une mémoire tampon plus grande (pas de grésillement).

type AC = typeof AudioContext;
const Classe = (): AC => window.AudioContext ?? (window as unknown as { webkitAudioContext: AC }).webkitAudioContext;

/** Téléphone ou petite machine : écran tactile étroit, ou 4 cœurs au plus. */
export const telephone: boolean = typeof window !== "undefined" && (
  (window.matchMedia?.("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 820)
  || (navigator.hardwareConcurrency ?? 8) <= 4
);
/** Voix en même temps (l'E2 en a 24), images par seconde du visualiseur. */
export const LIMITES = telephone ? { voix: 12, ips: 30 } : { voix: 24, ips: 60 };
/** Pour les boucles de dessin : true si l'image doit être sautée (30 images/s sur téléphone). */
export const imageASauter = (t: number, dernier: { t: number }) => { if (t - dernier.t < 1000 / LIMITES.ips - 4) return true; dernier.t = t; return false; };

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;      // aperçus : avec limiteur
let direct: GainNode | null = null;   // Mastering, prises, référence : son intact (aucun traitement)
const surChangement = new Set<(c: AudioContext) => void>();

/** Le contexte audio partagé. `sampleRate` : le Mastering et l'entrée audio travaillent à la fréquence du fichier
 *  ou de la carte son ; si elle diffère, le contexte est recréé (les sons en cours s'arrêtent). */
export function contexte(o: { sampleRate?: number } = {}): AudioContext {
  let remplace = false;
  if (ctx && o.sampleRate && ctx.sampleRate !== o.sampleRate) {
    remplace = true;
    toutArreter();
    const vieux = ctx; ctx = null; bus = null;
    void vieux.close().catch(() => {});
  }
  if (!ctx || ctx.state === "closed") {
    const C = Classe();
    direct = null;
    const opts: AudioContextOptions = { latencyHint: telephone ? "playback" : "interactive" };
    if (o.sampleRate) opts.sampleRate = o.sampleRate;
    try { ctx = new C(opts); } catch { ctx = new C(); }
    bus = ctx.createGain();
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1;
    bus.connect(lim).connect(ctx.destination);
    direct = ctx.createGain();
    direct.connect(ctx.destination);
    const c = ctx;
    if (remplace) surChangement.forEach((f) => f(c));
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  repos();
  return ctx;
}
/** La sortie des aperçus (à utiliser à la place de `destination`), avec un limiteur contre la saturation. */
export function sortie(): GainNode { contexte(); return bus!; }
/** La sortie sans aucun traitement : Mastering, réécoute des prises, morceau de référence. */
export function sortieDirecte(o: { sampleRate?: number } = {}): GainNode { contexte(o); return direct!; }
/** Le contexte s'il existe déjà, sans en créer. */
export const contexteActuel = () => ctx;
/** Prévient quand le contexte est recréé (les moteurs refont leurs nœuds). */
export function quandNouveauContexte(f: (c: AudioContext) => void) { surChangement.add(f); return () => { surChangement.delete(f); }; }

// ---------- Lecteurs : un seul à la fois ----------
const lecteurs = new Map<string, () => void>();
const actifs = new Set<string>();

/** Déclare un lecteur et sa fonction d'arrêt. */
export function declarerLecteur(nom: string, arreter: () => void): void { lecteurs.set(nom, arreter); }

/** Un lecteur démarre : les autres s'arrêtent. */
export function prendreLaMain(nom: string): void {
  for (const [n, arreter] of lecteurs) if (n !== nom && actifs.has(n)) { actifs.delete(n); try { arreter(); } catch { /* */ } }
  actifs.add(nom);
  repos();
}
/** Un lecteur s'est arrêté de lui-même. */
export function liberer(nom: string): void { actifs.delete(nom); repos(); }

/** Arrête tous les sons (chaque lecteur fait un court fondu : pas de clic). `garder` : lecteurs à laisser jouer. */
export function toutArreter(garder: string[] = []): void {
  for (const n of [...actifs]) if (!garder.includes(n)) { actifs.delete(n); try { lecteurs.get(n)?.(); } catch { /* */ } }
  if (!garder.length) {
    const now = ctx?.currentTime ?? 0;
    voix.forEach((v) => { v.g.gain.cancelScheduledValues(now); v.g.gain.setTargetAtTime(0, now, 0.008); const g = v.g; setTimeout(() => g.disconnect(), 120); });
    voix.length = 0;
  }
  repos();
}

// ---------- Limite de voix ----------
const voix: { g: GainNode; fin: number }[] = [];
/** Une voix commence (son gain de sortie et l'heure où elle finit). Au-delà de la limite, la plus ancienne s'efface vite. */
export function nouvelleVoix(g: GainNode, fin: number): void {
  const c = ctx;
  if (!c) return;
  const now = c.currentTime;
  for (let i = voix.length - 1; i >= 0; i--) if (voix[i].fin < now) voix.splice(i, 1);
  voix.push({ g, fin });
  while (voix.length > LIMITES.voix) {
    const v = voix.shift()!;
    v.g.gain.cancelScheduledValues(now);
    v.g.gain.setTargetAtTime(0, now, 0.008);   // ~25 ms de fondu : pas de clic
    const gg = v.g; setTimeout(() => gg.disconnect(), 120);
  }
}

// ---------- Mise en veille ----------
// Rien ne joue et rien n'écoute pendant 30 s : le contexte se met en pause (économise la batterie du téléphone).
let veille = 0;
const utilisateursEntree = new Set<string>();
export function entreeOuverte(qui: string, ouvert: boolean) { if (ouvert) utilisateursEntree.add(qui); else utilisateursEntree.delete(qui); repos(); }
function repos() {
  window.clearTimeout(veille);
  if (!ctx || actifs.size || utilisateursEntree.size) return;
  veille = window.setTimeout(() => { if (ctx && !actifs.size && !utilisateursEntree.size && ctx.state === "running") void ctx.suspend().catch(() => {}); }, 30000);
}

// Pour le script de contrôle (tests automatiques) : ce qui joue en ce moment.
if (typeof window !== "undefined") (window as unknown as { __e2audio: unknown }).__e2audio = { actifs: () => [...actifs], voix: () => voix.length, contexte: () => ctx?.state ?? "aucun" };
