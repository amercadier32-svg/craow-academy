// Entrée audio de la carte son (Scarlett 4i4), commune à « Réglages audio », « Enregistrement » et « Visualiseur ».
// Le navigateur passe par l'audio Windows classique (pas l'ASIO) : rien ne change dans FL Studio ni dans la Scarlett.
// Les traitements automatiques du navigateur (réduction de bruit, anti-écho, gain automatique) sont coupés : son brut.
// On n'écoute jamais l'entrée par l'app : l'écoute se fait par le direct monitor de la Scarlett (pas de retard).
import { lireObjet, ecrireJson } from "./stockage";
import { contexte, entreeOuverte, quandNouveauContexte } from "./moteurAudio";
import { useEffect, useSyncExternalStore } from "react";

// ---------------------------------------------------------------- Réglages gardés sur l'appareil
export type ModeCanaux = "stereo" | "mono";
export type CanalMono = "g" | "d" | "somme";
export interface ReglagesAudio {
  deviceId: string;          // "" = appareil par défaut de Windows
  label: string;             // nom de l'appareil (pour le retrouver si son id change)
  paire: number;             // 0 = entrées 1-2, 1 = entrées 3-4
  mode: ModeCanaux;
  canalMono: CanalMono;
  permissionExpliquee: boolean;
}
const CLE = "e2academy.audio";
const DEFAUT: ReglagesAudio = { deviceId: "", label: "", paire: 0, mode: "stereo", canalMono: "somme", permissionExpliquee: false };

function lireReglages(): ReglagesAudio {
  return lireObjet(CLE, DEFAUT);
}

// ---------------------------------------------------------------- État partagé
export type Statut = "arret" | "demande" | "ouvert" | "erreur";
export interface ErreurEntree { code: string; titre: string; aides: string[] }
export interface Appareil { id: string; label: string }
export interface EtatEntree {
  reglages: ReglagesAudio;
  statut: Statut;
  erreur: ErreurEntree | null;
  appareils: Appareil[];
  nomAppareil: string;
  srEntree: number | null;     // fréquence annoncée par l'appareil (Windows)
  srApp: number | null;        // fréquence de traitement de l'app (la même si possible)
  canauxRecus: number;         // canaux que le navigateur reçoit de l'appareil
  paireDispo: boolean;         // la paire choisie existe vraiment sur cet appareil
  latenceMs: number | null;    // retard estimé de l'entrée jusqu'aux mesures de l'app
  traitementsCoupes: boolean | null; // le navigateur a bien coupé anti-écho, réduction de bruit et gain auto
}

let etat: EtatEntree = {
  reglages: lireReglages(), statut: "arret", erreur: null, appareils: [], nomAppareil: "",
  srEntree: null, srApp: null, canauxRecus: 0, paireDispo: true, latenceMs: null, traitementsCoupes: null,
};
const ecoute = new Set<() => void>();
function maj(x: Partial<EtatEntree>) { etat = { ...etat, ...x }; ecoute.forEach((f) => f()); }
const abonner = (f: () => void) => { ecoute.add(f); return () => { ecoute.delete(f); }; };
export const getEntree = () => etat;
export function useEntreeEtat(): EtatEntree { return useSyncExternalStore(abonner, () => etat, () => etat); }

export function setReglages(x: Partial<ReglagesAudio>) {
  const reglages = { ...etat.reglages, ...x };
  ecrireJson(CLE, reglages);
  const rebrancher = etat.statut === "ouvert" || etat.statut === "erreur";
  const changeAppareil = x.deviceId !== undefined && x.deviceId !== etat.reglages.deviceId;
  maj({ reglages });
  if (!rebrancher) return;
  if (changeAppareil || (x.paire !== undefined && !graphe)) void rouvrir();
  else if (graphe) { cabler(); maj({ paireDispo: paireOk() }); }
}

// ---------------------------------------------------------------- Le graphe audio
// source → séparateur → (2 canaux choisis) → fusion → `sortie` (stéréo) → mesures, enregistreur, visualiseur
interface Graphe {
  ctx: AudioContext;
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  split: ChannelSplitterNode;
  merge: ChannelMergerNode;
  gL: GainNode; gR: GainNode; gL2: GainNode; gR2: GainNode;   // gL2/gR2 : l'autre canal (pour le mono « somme »)
  sortie: GainNode;
  aL: AnalyserNode; aR: AnalyserNode;                        // pour le vumètre
  nul: GainNode;                                             // sortie muette (fait tourner l'enregistreur)
}
let graphe: Graphe | null = null;
let ouverture: Promise<void> | null = null;
const utilisateurs = new Set<string>();
let minuterieFermeture = 0;

export const contexteEntree = () => graphe?.ctx ?? null;
export const sortieEntree = () => graphe?.sortie ?? null;
export const nulEntree = () => graphe?.nul ?? null;


/** La paire réellement reçue : dans le flux (appareil à 4 canaux) ou d'après le nom de l'appareil (« Analogue 3 + 4 »). */
export function paireEffective(e: EtatEntree = etat): number {
  if (e.canauxRecus >= 4) return e.reglages.paire * 2 + 1 < e.canauxRecus ? e.reglages.paire : 0;
  if (/\b3\s*(\+|-|&|\/|et)\s*4\b/i.test(e.nomAppareil || e.reglages.label)) return 1;
  return 0;
}
function paireOk() {
  if (!graphe) return true;
  return paireEffective() === etat.reglages.paire;
}

/** Relie les 2 canaux de la paire choisie (ou un seul en mono) à la sortie stéréo. */
function cabler() {
  if (!graphe) return;
  const g = graphe, r = etat.reglages, n = etat.canauxRecus;
  for (const x of [g.gL, g.gR, g.gL2, g.gR2]) { try { x.disconnect(); } catch { /* */ } }
  try { g.split.disconnect(); } catch { /* */ }
  // paire 3-4 indisponible sur cet appareil : on retombe sur 1-2 (l'aide l'explique)
  const base = n >= 4 && r.paire * 2 + 1 < n ? r.paire * 2 : 0;
  const cg = Math.min(base, n - 1), cd = Math.min(base + 1, n - 1);
  if (r.mode === "stereo") {
    g.split.connect(g.gL, cg); g.split.connect(g.gR, cd);
    g.gL.gain.value = 1; g.gR.gain.value = 1;
    g.gL.connect(g.merge, 0, 0); g.gR.connect(g.merge, 0, 1);
  } else {
    const c = r.canalMono === "d" ? cd : cg;
    if (r.canalMono === "somme" && cd !== cg) {
      // (G + D) / 2 sur les deux côtés
      g.split.connect(g.gL, cg); g.split.connect(g.gL2, cd);
      g.split.connect(g.gR, cg); g.split.connect(g.gR2, cd);
      for (const x of [g.gL, g.gL2, g.gR, g.gR2]) x.gain.value = 0.5;
      g.gL.connect(g.merge, 0, 0); g.gL2.connect(g.merge, 0, 0);
      g.gR.connect(g.merge, 0, 1); g.gR2.connect(g.merge, 0, 1);
    } else {
      g.split.connect(g.gL, c); g.split.connect(g.gR, c);
      g.gL.gain.value = 1; g.gR.gain.value = 1;
      g.gL.connect(g.merge, 0, 0); g.gR.connect(g.merge, 0, 1);
    }
  }
}

function erreurDe(e: unknown): ErreurEntree {
  const nom = (e as { name?: string })?.name ?? "";
  const fl = "Ferme FL Studio s'il utilise la Scarlett en ASIO, puis clique sur « Réessayer ».";
  switch (nom) {
    case "NotAllowedError":
    case "SecurityError":
      return { code: "refus", titre: "Le navigateur n'a pas l'autorisation d'utiliser l'entrée audio.", aides: [
        "Clique sur l'icône à gauche de l'adresse (cadenas ou réglages), puis « Micro » → « Autoriser ». Recharge ensuite la page.",
        "Le « micro » pour le navigateur, c'est ta Scarlett : l'app n'envoie rien sur internet.",
        "Dans Windows : Paramètres → Confidentialité et sécurité → Microphone → laisse l'accès activé pour les applications de bureau (et pour ton navigateur).",
      ] };
    case "NotFoundError":
    case "OverconstrainedError":
      return { code: "absent", titre: "Aucune entrée audio trouvée (ou l'appareil choisi n'est plus là).", aides: [
        "Vérifie le câble USB de la Scarlett et qu'elle est allumée (voyant vert).",
        "Choisis à nouveau l'appareil dans la liste, puis « Tester ».",
        "Dans Windows, ouvre Paramètres → Son → Entrée : la Scarlett doit y apparaître.",
      ] };
    case "NotReadableError":
    case "AbortError":
    case "TrackStartError":
      return { code: "occupe", titre: "L'entrée est occupée par un autre logiciel.", aides: [
        fl,
        "Ferme aussi les autres logiciels qui enregistrent (Discord, OBS avec la Scarlett en entrée exclusive…).",
        "Dans Windows : Panneau de configuration Son → Enregistrement → Scarlett → Propriétés → Avancé : décoche « Autoriser les applications à prendre le contrôle exclusif » (à vérifier sur ton PC).",
      ] };
    case "NonDisponible":
      return { code: "navigateur", titre: "Ce navigateur ne donne pas accès à l'entrée audio sur cette page.", aides: [
        "Ouvre E2-Academy.html sur ton PC avec Chrome ou Edge (double-clic sur le fichier).",
        "Dans la version téléphone, l'entrée audio peut être bloquée par la page de la version téléphone.",
      ] };
    default:
      return { code: "autre", titre: `L'entrée audio n'a pas pu s'ouvrir${nom ? ` (${nom})` : ""}.`, aides: [fl, "Vérifie le câble et la paire d'entrées choisie, puis « Réessayer »."] };
  }
}

/** Met à jour la liste des entrées audio (les noms n'apparaissent qu'après l'autorisation). */
export async function listerAppareils(): Promise<Appareil[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const l = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput" && d.deviceId !== "communications");
    const appareils = l.map((d, i) => ({ id: d.deviceId, label: d.label || `Entrée audio ${i + 1}` }));
    maj({ appareils });
    return appareils;
  } catch { return []; }
}

/** Cherche, parmi les appareils, celui qui correspond à la paire (Windows montre souvent « Analogue 1 + 2 » et « Analogue 3 + 4 » à part). */
export function appareilDePaire(appareils: Appareil[], paire: number, labelActuel: string): Appareil | undefined {
  const motif = paire === 0 ? /\b1\s*(\+|-|&|\/|et)\s*2\b/i : /\b3\s*(\+|-|&|\/|et)\s*4\b/i;
  const marque = /focusrite|scarlett/i.test(labelActuel) ? /focusrite|scarlett/i : /./;
  return appareils.find((a) => motif.test(a.label) && marque.test(a.label));
}

async function ouvrir(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) { maj({ statut: "erreur", erreur: erreurDe({ name: "NonDisponible" }) }); return; }
  maj({ statut: "demande", erreur: null });
  const r = etat.reglages;
  const contraintes: MediaTrackConstraints = {
    echoCancellation: false, noiseSuppression: false, autoGainControl: false,
    channelCount: { ideal: r.paire > 0 ? 4 : 2 },
    ...(r.deviceId ? { deviceId: { exact: r.deviceId } } : {}),
  };
  // Chrome : anciens noms de ces réglages, coupés aussi.
  Object.assign(contraintes, { googEchoCancellation: false, googAutoGainControl: false, googNoiseSuppression: false, googHighpassFilter: false });
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: contraintes, video: false });
  } catch (e) {
    // l'appareil gardé a changé d'id (rebranché) : on le retrouve par son nom, sinon on essaie l'appareil par défaut
    if ((e as { name?: string })?.name === "OverconstrainedError" && r.deviceId) {
      const l = await listerAppareils();
      const m = l.find((a) => a.label === r.label);
      if (m && m.id !== r.deviceId) { etat = { ...etat, reglages: { ...r, deviceId: m.id } }; return ouvrir(); }
    }
    maj({ statut: "erreur", erreur: erreurDe(e) });
    return;
  }
  const piste = stream.getAudioTracks()[0];
  const s = (piste?.getSettings?.() ?? {}) as MediaTrackSettings & { latency?: number };
  const srEntree = typeof s.sampleRate === "number" && s.sampleRate > 0 ? s.sampleRate : null;
  let ctx: AudioContext;
  // Le moteur audio partagé, à la fréquence de la carte son (pas de rééchantillonnage pour l'enregistrement).
  try { ctx = contexte(srEntree ? { sampleRate: srEntree } : {}); }
  catch { ctx = contexte(); }
  const source = ctx.createMediaStreamSource(stream);
  const canauxRecus = Math.max(1, s.channelCount ?? source.channelCount ?? 2);
  source.channelCountMode = "explicit"; source.channelCount = Math.max(1, Math.min(canauxRecus, 32)); source.channelInterpretation = "discrete";
  const split = ctx.createChannelSplitter(Math.max(2, canauxRecus));
  source.connect(split);
  const merge = ctx.createChannelMerger(2);
  const mk = () => ctx.createGain();
  const sortie = ctx.createGain(); sortie.channelCount = 2; sortie.channelCountMode = "explicit"; sortie.channelInterpretation = "discrete";
  merge.connect(sortie);
  const split2 = ctx.createChannelSplitter(2); sortie.connect(split2);
  const aL = ctx.createAnalyser(), aR = ctx.createAnalyser();
  aL.fftSize = 2048; aR.fftSize = 2048;
  split2.connect(aL, 0); split2.connect(aR, 1);
  const nul = ctx.createGain(); nul.gain.value = 0; nul.connect(ctx.destination);
  entreeOuverte("entree", true);
  graphe = { ctx, stream, source, split, merge, gL: mk(), gR: mk(), gL2: mk(), gR2: mk(), sortie, aL, aR, nul };
  const appareils = await listerAppareils();
  const id = s.deviceId ?? r.deviceId;
  const nomAppareil = piste?.label || appareils.find((a) => a.id === id)?.label || "Entrée par défaut";
  const reglages = { ...etat.reglages, deviceId: r.deviceId || "", label: nomAppareil };
  ecrireJson(CLE, reglages);
  const latEntree = typeof s.latency === "number" ? s.latency : 0;
  const latenceMs = Math.round((latEntree + (ctx.baseLatency ?? 0)) * 1000 + (2048 / ctx.sampleRate) * 500);
  const traitementsCoupes = s.echoCancellation === undefined ? null : !s.echoCancellation && !s.noiseSuppression && !s.autoGainControl;
  etat = { ...etat, reglages, canauxRecus, nomAppareil };
  cabler();
  piste?.addEventListener("ended", () => { fermer(); maj({ statut: "erreur", erreur: { code: "debranche", titre: "L'entrée audio s'est coupée (Scarlett débranchée ou prise par un autre logiciel).", aides: ["Vérifie le câble USB.", "Ferme FL Studio s'il utilise la Scarlett en ASIO, puis « Réessayer »."] } }); });
  if (ctx.state === "suspended") { try { await ctx.resume(); } catch { /* */ } }
  maj({ statut: "ouvert", erreur: null, appareils, nomAppareil, srEntree, srApp: ctx.sampleRate, canauxRecus, paireDispo: paireOk(), latenceMs, traitementsCoupes });
}

function fermer() {
  if (!graphe) return;
  const g = graphe;
  g.stream.getTracks().forEach((t) => t.stop());
  // Le contexte est partagé avec toute l'app : on débranche seulement les nœuds de l'entrée.
  for (const n of [g.source, g.split, g.merge, g.gL, g.gR, g.gL2, g.gR2, g.sortie, g.aL, g.aR, g.nul]) { try { n.disconnect(); } catch { /* */ } }
  graphe = null;
  entreeOuverte("entree", false);
}
// Si le contexte partagé est recréé (Mastering à une autre fréquence), l'entrée se referme proprement.
quandNouveauContexte((c) => { if (graphe && graphe.ctx !== c) { fermer(); maj({ statut: "arret" }); } });

async function rouvrir() { fermer(); ouverture = ouvrir().finally(() => { ouverture = null; }); return ouverture; }

/** Un module commence à utiliser l'entrée (vumètre, enregistreur, visualiseur). Ouvre l'entrée si besoin. */
export async function prendreEntree(qui: string): Promise<boolean> {
  window.clearTimeout(minuterieFermeture);
  utilisateurs.add(qui);
  if (graphe) { if (graphe.ctx.state === "suspended") await graphe.ctx.resume().catch(() => {}); return true; }
  if (!ouverture) ouverture = ouvrir().finally(() => { ouverture = null; });
  await ouverture;
  if (!utilisateurs.has(qui)) { rendreEntree(qui); return false; }
  return Boolean(graphe);
}
/** Le module n'a plus besoin de l'entrée : elle se ferme quand plus personne ne l'utilise. */
export function rendreEntree(qui: string) {
  utilisateurs.delete(qui);
  if (utilisateurs.size) return;
  window.clearTimeout(minuterieFermeture);
  minuterieFermeture = window.setTimeout(() => { if (!utilisateurs.size) { fermer(); maj({ statut: "arret" }); } }, 1500);
}
export async function reessayer(qui: string) { utilisateurs.add(qui); await rouvrir(); }
export const entreeUtilisee = () => utilisateurs.size > 0;

/** Ouvre l'entrée tant que `actif` est vrai (et la rend en quittant la page). */
export function useEntree(qui: string, actif: boolean) {
  const e = useEntreeEtat();
  useEffect(() => {
    if (!actif) return;
    void prendreEntree(qui);
    return () => rendreEntree(qui);
  }, [qui, actif]);
  return e;
}

// ---------------------------------------------------------------- Mesures pour le vumètre
export interface Niveaux { pic: [number, number]; rms: [number, number]; sature: boolean }
const tmpL = new Float32Array(2048), tmpR = new Float32Array(2048);
/** Crête et niveau moyen (0 à 1) des ~40 dernières ms, gauche et droite. */
export function lireNiveaux(): Niveaux | null {
  if (!graphe) return null;
  graphe.aL.getFloatTimeDomainData(tmpL); graphe.aR.getFloatTimeDomainData(tmpR);
  let pl = 0, pr = 0, sl = 0, sr = 0, sat = false;
  for (let i = 0; i < tmpL.length; i++) {
    const l = Math.abs(tmpL[i]), r = Math.abs(tmpR[i]);
    if (l > pl) pl = l; if (r > pr) pr = r;
    sl += l * l; sr += r * r;
  }
  if (pl >= 0.999 || pr >= 0.999) sat = true;
  return { pic: [pl, pr], rms: [Math.sqrt(sl / tmpL.length), Math.sqrt(sr / tmpR.length)], sature: sat };
}

export const versDb = (x: number) => (x > 1e-6 ? 20 * Math.log10(x) : -120);
export const fmtDb = (db: number) => (db <= -90 ? "−∞" : Math.abs(db) < 0.05 ? "0,0" : `${db > 0 ? "+" : "−"}${Math.abs(db).toFixed(1).replace(".", ",")}`);
export const fmtHz = (sr: number | null) => (sr ? `${sr.toLocaleString("fr-FR")} Hz` : "?");
