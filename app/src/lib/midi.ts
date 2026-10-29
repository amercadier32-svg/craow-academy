// Connexion MIDI avec l'E2 (Web MIDI, Chrome ou Edge).
// Ce que l'E2 envoie et reçoit vient du tableau d'implémentation MIDI (Mode d'emploi p. 76).
import { lireObjet, ecrireJson } from "./stockage";
import { useSyncExternalStore } from "react";
import type { Source } from "./data";

export const SRC_TABLEAU: Source = { doc: "OM", page: 76 };   // MIDI Implementation Chart
export const SRC_CANAL: Source = { doc: "PG", page: 6 };      // GLOBAL MIDI CH. 01…16
export const SRC_FILTRES: Source = { doc: "PG", page: 7 };    // MIDI RECEIVE / SEND FILTER
export const SRC_PRISES: Source = { doc: "OM", page: 25 };    // USB, MIDI IN/OUT, pilote Windows
export const SRC_PAD_C4: Source = { doc: "OM", page: 30 };    // un pad pose C4 (60) par défaut

/** Control Change de l'E2 (Mode d'emploi p. 76). `param` = id dans data/electribe2/parameters.json quand il existe. */
export const CC_E2: Record<number, { nom: string; param?: string }> = {
  0: { nom: "Bank Select (MSB)" }, 32: { nom: "Bank Select (LSB)" },
  7: { nom: "Level", param: "amp.level" }, 10: { nom: "Pan", param: "amp.pan" },
  71: { nom: "Resonance", param: "filter.resonance" }, 72: { nom: "EG Delay/Release" }, 73: { nom: "EG Attack", param: "amp.attack" },
  74: { nom: "Cutoff", param: "filter.cutoff" },
  80: { nom: "Oscillator Pitch" }, 81: { nom: "Oscillator Glide", param: "osc.glide" }, 82: { nom: "Oscillator Edit", param: "osc.edit" },
  83: { nom: "Filter EG Int", param: "filter.egint" },
  85: { nom: "Modulation Depth", param: "mod.depth" }, 86: { nom: "Modulation Speed", param: "mod.speed" },
  87: { nom: "Insert Fx Edit", param: "ifx.edit" },
  102: { nom: "TouchPad X" }, 103: { nom: "TouchPad Y" }, 104: { nom: "IFX On" }, 105: { nom: "MFX Send" }, 106: { nom: "TouchPad On/Off" },
};

export type Etat = "inactif" | "attente" | "ok" | "non-supporte" | "refuse" | "erreur";

export interface Port { id: string; name: string; manufacturer: string }

export interface Evenement {
  t: number;                  // performance.now()
  type: "note" | "cc" | "pc" | "start" | "stop" | "continue";
  canal?: number;             // 1…16
  note?: number;
  velocite?: number;
  cc?: number;
  valeur?: number;
}

interface Snap {
  etat: Etat;
  erreur: string;
  entrees: Port[];
  sorties: Port[];
  entree: string;             // id du port choisi
  sortie: string;
  canal: number;              // 1…16 = GLOBAL MIDI CH. de l'E2
  journal: Evenement[];       // derniers messages reçus, le plus récent d'abord
  notesTenues: number[];
  bpmRecu: number | null;     // tempo calculé depuis l'horloge MIDI (24 tops par noire)
  ccs: Record<number, number>;
}

const CLE = "e2academy.midi";
function lirePrefs(): { entree?: string; sortie?: string; canal?: number } {
  return lireObjet<{ entree?: string; sortie?: string; canal?: number }>(CLE, {});
}
function ecrirePrefs(p: { entree: string; sortie: string; canal: number }) {
  ecrireJson(CLE, p);
}

const prefs = lirePrefs();
let snap: Snap = {
  etat: "inactif", erreur: "", entrees: [], sorties: [], entree: prefs.entree ?? "", sortie: prefs.sortie ?? "",
  canal: prefs.canal && prefs.canal >= 1 && prefs.canal <= 16 ? prefs.canal : 1,
  journal: [], notesTenues: [], bpmRecu: null, ccs: {},
};
const abonnes = new Set<() => void>();
const ecouteursNotes = new Set<(note: number, velocite: number) => void>();
function maj(p: Partial<Snap>) {
  snap = { ...snap, ...p };
  if ("entree" in p || "sortie" in p || "canal" in p) ecrirePrefs({ entree: snap.entree, sortie: snap.sortie, canal: snap.canal });
  abonnes.forEach((f) => f());
}

export function useMidi() {
  return useSyncExternalStore((f) => { abonnes.add(f); return () => abonnes.delete(f); }, () => snap);
}

/** Appelée à chaque note jouée sur l'E2 (Note On, vélocité > 0). Renvoie la fonction pour se désabonner. */
export function surNote(f: (note: number, velocite: number) => void) {
  ecouteursNotes.add(f);
  return () => { ecouteursNotes.delete(f); };
}

export const webMidiDisponible = () => typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;

let acces: MIDIAccess | null = null;
let entreeBranchee: MIDIInput | null = null;
const tops: number[] = [];

const ressembleE2 = (p: Port) => /electribe/i.test(`${p.name} ${p.manufacturer}`);

function listerPorts() {
  if (!acces) return;
  const entrees: Port[] = [];
  const sorties: Port[] = [];
  acces.inputs.forEach((p) => entrees.push({ id: p.id, name: p.name ?? "Entrée", manufacturer: p.manufacturer ?? "" }));
  acces.outputs.forEach((p) => sorties.push({ id: p.id, name: p.name ?? "Sortie", manufacturer: p.manufacturer ?? "" }));
  const choisir = (liste: Port[], actuel: string) =>
    liste.some((p) => p.id === actuel) ? actuel : (liste.find(ressembleE2) ?? liste[0])?.id ?? "";
  const entree = choisir(entrees, snap.entree);
  const sortie = choisir(sorties, snap.sortie);
  maj({ entrees, sorties, entree, sortie });
  brancherEntree(entree);
}

function brancherEntree(id: string) {
  if (entreeBranchee) entreeBranchee.onmidimessage = null;
  entreeBranchee = (id && acces?.inputs.get(id)) || null;
  if (entreeBranchee) entreeBranchee.onmidimessage = (e) => recevoir((e as MIDIMessageEvent).data);
}

function noter(ev: Evenement) {
  maj({ journal: [ev, ...snap.journal].slice(0, 40) });
}

export function recevoir(data: Uint8Array | null) {
  if (!data || !data.length) return;
  const [st, d1 = 0, d2 = 0] = data;
  const t = performance.now();
  if (st === 0xf8) {
    // Horloge : 24 tops par noire. On garde les 48 derniers pour un tempo stable.
    tops.push(t);
    if (tops.length > 49) tops.shift();
    if (tops.length >= 25) {
      const bpm = 60000 / (((tops[tops.length - 1] - tops[0]) / (tops.length - 1)) * 24);
      const arrondi = Math.round(bpm * 10) / 10;
      if (arrondi !== snap.bpmRecu) maj({ bpmRecu: arrondi });
    }
    return;
  }
  if (st === 0xfa) { tops.length = 0; noter({ t, type: "start" }); return; }
  if (st === 0xfb) { noter({ t, type: "continue" }); return; }
  if (st === 0xfc) { tops.length = 0; maj({ bpmRecu: null }); noter({ t, type: "stop" }); return; }
  if (st >= 0xf0) return;   // SysEx, Active Sense… ignorés
  const type = st & 0xf0;
  const canal = (st & 0x0f) + 1;
  if (type === 0x90 && d2 > 0) {
    maj({ notesTenues: [...snap.notesTenues.filter((n) => n !== d1), d1] });
    noter({ t, type: "note", canal, note: d1, velocite: d2 });
    ecouteursNotes.forEach((f) => f(d1, d2));
  } else if (type === 0x80 || (type === 0x90 && d2 === 0)) {
    maj({ notesTenues: snap.notesTenues.filter((n) => n !== d1) });
  } else if (type === 0xb0) {
    maj({ ccs: { ...snap.ccs, [d1]: d2 } });
    noter({ t, type: "cc", canal, cc: d1, valeur: d2 });
  } else if (type === 0xc0) {
    noter({ t, type: "pc", canal, valeur: d1 });
  }
}

/** Demande l'accès MIDI au navigateur (une fenêtre d'autorisation peut s'ouvrir). */
export async function connecter() {
  if (!webMidiDisponible()) { maj({ etat: "non-supporte" }); return; }
  maj({ etat: "attente", erreur: "" });
  try {
    acces = await navigator.requestMIDIAccess({ sysex: false });
    acces.onstatechange = () => listerPorts();
    maj({ etat: "ok" });
    listerPorts();
  } catch (e) {
    const err = e as DOMException;
    maj({ etat: err?.name === "NotAllowedError" || err?.name === "SecurityError" ? "refuse" : "erreur", erreur: `${err?.name ?? ""} ${err?.message ?? String(e)}`.trim() });
  }
}

export function choisirEntree(id: string) { maj({ entree: id, notesTenues: [] }); brancherEntree(id); }
export function choisirSortie(id: string) { maj({ sortie: id }); }
export function choisirCanal(c: number) { maj({ canal: Math.max(1, Math.min(16, c)) }); }
export function viderJournal() { maj({ journal: [], ccs: {} }); }

function sortie(): MIDIOutput | null {
  return (snap.sortie && acces?.outputs.get(snap.sortie)) || null;
}

export function envoyer(data: number[], quand?: number) {
  const s = sortie();
  if (!s) return false;
  s.send(data, quand);
  return true;
}

/** Arrête toutes les notes sur le canal choisi (All Notes Off, CC 123, reçu par l'E2). */
export function toutCouper() {
  const s = sortie();
  if (!s) return;
  const ch = snap.canal - 1;
  if ("clear" in s && typeof s.clear === "function") { try { s.clear(); } catch { /* pas pris en charge */ } }
  s.send([0xb0 | ch, 123, 0]);
}

// ---------- Envoi d'une séquence de 64 pas ----------

/** Un pas à envoyer : note MIDI, ou null (silence), ou "tenue" (la note d'avant continue). */
export type PasMidi = number | null | "tenue";

let lecture: { timer: number; horloge: boolean; attentes: number[] } | null = null;
const abonnesLecture = new Set<() => void>();
let pasCourant = -1;
function majPas(i: number) { pasCourant = i; abonnesLecture.forEach((f) => f()); }
export function usePasEnvoye() {
  return useSyncExternalStore((f) => { abonnesLecture.add(f); return () => abonnesLecture.delete(f); }, () => pasCourant);
}

/**
 * Envoie la séquence à l'E2 en temps réel, au tempo donné (un pas = une double-croche).
 * `horloge` : envoie aussi Start, l'horloge MIDI et Stop (l'E2 doit être en CLOCK MODE Auto ou External USB).
 */
export function envoyerSequence(pasListe: PasMidi[], bpm: number, opts: { boucle?: boolean; horloge?: boolean; velocite?: number } = {}) {
  arreterSequence();
  const s = sortie();
  if (!s) return false;
  const ch = snap.canal - 1;
  const vel = opts.velocite ?? 100;
  const dureePas = 60000 / bpm / 4;
  const avance = 120;               // on prépare les messages 120 ms à l'avance
  let t0 = performance.now() + 80;
  let i = 0;
  let noteEnCours: number | null = null;
  let finNote = 0;
  if (opts.horloge) s.send([0xfa], t0);
  let prochainTop = t0;

  const tick = () => {
    const horizon = performance.now() + avance;
    while (t0 + i * dureePas < horizon) {
      const n = i % pasListe.length;
      if (i > 0 && n === 0 && !opts.boucle) {
        if (noteEnCours !== null) s.send([0x80 | ch, noteEnCours, 64], finNote);
        if (opts.horloge) s.send([0xfc], t0 + i * dureePas);
        const finT = t0 + i * dureePas;
        window.clearInterval(lecture!.timer);
        const l = lecture!;
        l.attentes.push(window.setTimeout(() => { if (lecture === l) lecture = null; majPas(-1); }, Math.max(0, finT - performance.now())));
        l.timer = 0;
        return;
      }
      const debut = t0 + i * dureePas;
      const p = pasListe[n];
      if (p !== "tenue") {
        if (noteEnCours !== null) { s.send([0x80 | ch, noteEnCours, 64], Math.min(finNote, debut)); noteEnCours = null; }
        if (typeof p === "number") {
          s.send([0x90 | ch, p, vel], debut);
          noteEnCours = p;
        }
      }
      // Gate : la note s'arrête à 80 % du pas, sauf si le pas suivant la tient.
      finNote = debut + dureePas * 0.8;
      if (pasListe[(n + 1) % pasListe.length] === "tenue") finNote = debut + dureePas * 1.02;
      lecture!.attentes.push(window.setTimeout(() => majPas(n), Math.max(0, debut - performance.now())));
      if (lecture!.attentes.length > 200) lecture!.attentes.splice(0, 100);
      i++;
    }
    if (opts.horloge) {
      const dureeTop = 60000 / bpm / 24;
      while (prochainTop < horizon) { s.send([0xf8], prochainTop); prochainTop += dureeTop; }
    }
  };
  lecture = { timer: 0, horloge: Boolean(opts.horloge), attentes: [] };
  lecture.timer = window.setInterval(tick, 25);
  tick();
  return true;
}

export function arreterSequence() {
  if (!lecture) return;
  const l = lecture;
  window.clearInterval(l.timer);
  l.attentes.forEach(clearTimeout);
  lecture = null;
  const s = sortie();
  if (s) {
    if ("clear" in s && typeof s.clear === "function") { try { s.clear(); } catch { /* pas pris en charge */ } }
    if (l.horloge) s.send([0xfc]);
    s.send([0xb0 | (snap.canal - 1), 123, 0]);
  }
  majPas(-1);
}

export const enLecture = () => lecture !== null && lecture.timer !== 0;
