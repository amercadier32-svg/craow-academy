// Tous les paramètres de la partie, bloc par bloc, dans l'ordre de la machine : ce que la recette règle (en couleur)
// et ce qui reste au réglage de départ du motif vide (en gris, « défaut »). Le manuel ne donne aucune valeur de départ :
// les valeurs « défaut » sont des propositions, toujours « à vérifier sur l'écran ».
// Aussi : le bloc Modulation expliqué, le pad tactile et les réglages de pas de chaque recette.
import type { Source } from "../lib/data";
import type { Pas } from "../lib/seq";
import { FICHES_MFX } from "./effets";
import type { Recette, Reglage } from "./recettes";
import effects from "@data/electribe2/effects.json";

export interface Ligne {
  param: string;           // id du paramètre (data/electribe2/parameters.json), ou « type-filtre » / « synchro-mod »
  valeur: string;
  defaut: boolean;         // pas réglé par la recette : réglage de départ du motif vide
  aVerifier: boolean;      // valeur proposée : la plage n'est pas dans le manuel
  note?: string;
}
export interface Bloc { id: string; titre: string; lignes: Ligne[]; src: Source }

const OM = (page: number): Source => ({ doc: "OM", page });
const PG = (page: number): Source => ({ doc: "PG", page });

/** Réglage de départ proposé pour un paramètre que la recette ne touche pas. */
const DEFAUTS: Record<string, { valeur: string; note?: string }> = {
  "osc.edit": { valeur: "0" },
  "osc.pitch": { valeur: "0", note: "hauteur d'origine" },
  "osc.glide": { valeur: "0", note: "pas de glissement" },
  "type-filtre": { valeur: "electribe LPF" },
  "filter.cutoff": { valeur: "127", note: "filtre ouvert" },
  "filter.resonance": { valeur: "0" },
  "filter.egint": { valeur: "0", note: "l'enveloppe ne bouge pas le filtre" },
  "amp.level": { valeur: "100" },
  "amp.pan": { valeur: "0", note: "au centre" },
  "amp.attack": { valeur: "0" },
  "amp.decay": { valeur: "64" },
  "amp.eg": { valeur: "ON" },
  "ifx.on": { valeur: "OFF" },
  "mfx.send": { valeur: "OFF" },
  "part.voiceassign": { valeur: "Mono1" },
  "part.priority": { valeur: "Normal" },
  "part.motionseq": { valeur: "Off" },
  "part.trgvelocity": { valeur: "Off" },
  "part.groovetype": { valeur: "—", note: "pas de groove" },
  "part.groovedepth": { valeur: "0" },
  "part.scalemode": { valeur: "Off" },
  "part.laststep": { valeur: "16" },
};

const BLOCS: { id: string; titre: string; champs: string[]; src: Source }[] = [
  { id: "oscillateur", titre: "Oscillator", champs: ["osc.type", "osc.edit", "osc.pitch", "osc.glide"], src: OM(23) },
  { id: "filtre", titre: "Filter", champs: ["type-filtre", "filter.cutoff", "filter.resonance", "filter.egint"], src: OM(23) },
  { id: "modulation", titre: "Modulation", champs: ["mod.type", "mod.depth", "mod.speed", "synchro-mod"], src: PG(14) },
  { id: "ampli", titre: "Amp/EG", champs: ["amp.level", "amp.pan", "amp.attack", "amp.decay", "amp.eg"], src: OM(23) },
  { id: "ifx", titre: "Insert FX", champs: ["ifx.type", "ifx.edit", "ifx.on"], src: OM(23) },
  { id: "mfx", titre: "MFX Send", champs: ["mfx.send", "pat.mfxtype", "mfx.hold"], src: OM(23) },
  { id: "partie", titre: "Paramètres de partie", champs: ["part.voiceassign", "part.priority", "part.motionseq", "part.trgvelocity", "part.groovetype", "part.groovedepth", "part.scalemode", "part.laststep"], src: PG(4) },
];

type ModType = { n: number; nom: string; source: string; destination: string; bpmSync: boolean; keySync: boolean };
export const MODS = (effects as { modulation: { types: ModType[] } }).modulation.types;
export const modParNom = (v: string | undefined) => (v ? MODS.find((m) => `${m.n} ${m.nom}` === v || m.nom === v.replace(/^\d+ /, "")) : undefined);

/** Tous les paramètres de la partie, bloc par bloc. */
export function blocsComplets(reglages: Reglage[]): Bloc[] {
  const get = (p: string) => reglages.find((x) => x.param === p);
  const filtre = get("filter.lpf") ?? get("filter.hpf") ?? get("filter.bpf");
  const ifxOn = get("ifx.on")?.valeur === "ON";
  const mfxOn = get("mfx.send")?.valeur === "ON";
  const mod = get("mod.type");
  const depth = get("mod.depth");
  const sansMod = !mod || depth?.valeur === "0";
  return BLOCS.map((b) => ({
    id: b.id, titre: b.titre, src: b.src,
    lignes: b.champs.flatMap((p): Ligne[] => {
      if (p === "type-filtre") {
        if (filtre) return [{ param: filtre.param, valeur: filtre.valeur, defaut: false, aVerifier: false }];
        return [{ param: "filter.lpf", valeur: DEFAUTS["type-filtre"].valeur, defaut: true, aVerifier: true }];
      }
      if (b.id === "modulation") {
        if (sansMod) {
          if (p === "mod.type") return [{ param: p, valeur: "aucune", defaut: false, aVerifier: false, note: "Depth : 0, la modulation ne fait rien" }];
          if (p === "mod.depth") return [{ param: p, valeur: "0", defaut: false, aVerifier: false }];
          return [];
        }
        const m = modParNom(mod!.valeur);
        if (p === "synchro-mod") return m ? [{ param: p, valeur: m.bpmSync ? "Oui" : "Non", defaut: false, aVerifier: false, note: m.bpmSync ? `type « BPM » : la vitesse suit le tempo${m.keySync ? ", le LFO repart à chaque note" : ""}` : "vitesse libre, réglée par Speed" }] : [];
        const x = get(p);
        if (x) return [{ param: p, valeur: x.valeur, defaut: false, aVerifier: Boolean(x.aVerifier), note: p === "mod.speed" && m?.source.startsWith("Enveloppe") ? "durée de l'enveloppe" : undefined }];
        return [{ param: p, valeur: "64", defaut: true, aVerifier: true }];
      }
      if (b.id === "ifx" && p !== "ifx.on" && !ifxOn && !get(p)) return [{ param: p, valeur: "—", defaut: true, aVerifier: false, note: "sans effet : IFX éteint" }];
      if (p === "pat.mfxtype" || p === "mfx.hold") {
        const x = get(p);
        if (!x) return [];
        return [{ param: p, valeur: x.valeur, defaut: false, aVerifier: Boolean(x.aVerifier), note: p === "pat.mfxtype" ? "réglage du motif, commun à toutes les parties" : undefined }];
      }
      const x = get(p);
      if (x) return [{ param: p, valeur: x.valeur, defaut: false, aVerifier: Boolean(x.aVerifier) }];
      const d = DEFAUTS[p];
      if (!d) return [];
      return [{ param: p, valeur: d.valeur, defaut: true, aVerifier: true, note: d.note }];
    }),
  })).map((b) => (b.id === "mfx" && !mfxOn ? { ...b, lignes: b.lignes.filter((l) => l.param === "mfx.send") } : b));
}

const DEST: Record<string, string> = {
  "Coupure du filtre": "le Cutoff", "Hauteur de l'oscillateur": "la hauteur", "OSC Edit": "le timbre (OSC Edit)",
  "Volume (Amp Level)": "le volume", "Pan": "la place gauche-droite", "IFX Edit": "la dose d'effet (IFX Edit)",
};
/** Pourquoi cette modulation, en une phrase (Pratique). */
export function pourquoiMod(v: string | undefined): string | null {
  const m = modParNom(v);
  if (!m) return null;
  const d = DEST[m.destination] ?? m.destination.toLowerCase();
  const tempo = m.bpmSync ? ", calé sur le tempo" : "";
  const src = m.source;
  const pan = m.destination === "Pan";
  const comment = pan && src.startsWith("Enveloppe AD positive") ? `envoie le son d'un côté au début de chaque note, puis le ramène au centre${tempo}`
    : pan && src.startsWith("Enveloppe AD négative") ? `envoie le son de l'autre côté au début de chaque note, puis le ramène au centre${tempo}`
    : src.startsWith("Enveloppe AD positive") ? `pousse ${d} vers le haut au début de chaque note, puis revient${tempo}`
    : src.startsWith("Enveloppe AD négative") ? `tire ${d} vers le bas au début de chaque note, puis revient${tempo}`
    : src.includes("triangle") ? `fait aller et venir ${d} en douceur${tempo}${m.keySync ? ", en repartant à chaque note" : ""}`
    : src.includes("montante") ? `fait monter ${d} en rampe puis retomber d'un coup${tempo}`
    : src.includes("descendante") ? `fait tomber ${d} en rampe puis remonter d'un coup${tempo}`
    : src.includes("carré") ? `fait sauter ${d} entre deux valeurs${tempo}`
    : src.includes("sample") ? `fait sauter ${d} au hasard, par paliers${tempo}`
    : `fait dériver ${d} au hasard`;
  return `${m.nom} ${comment}.`;
}

// ---------------------------------------------------------------- Pad tactile
export interface PadTactile { utilise: boolean; mode?: string; lignes: { texte: string; ref?: Source; aVerifier?: boolean }[] }
export function padTactile(reglages: Reglage[]): PadTactile {
  const get = (p: string) => reglages.find((x) => x.param === p)?.valeur;
  const type = get("pat.mfxtype");
  if (get("mfx.send") !== "ON" || !type) return { utilise: false, lignes: [] };
  const n = parseInt(type, 10);
  const f = FICHES_MFX.find((x) => x.n === n);
  const x = get("mfx.x"), y = get("mfx.y");
  const lignes: PadTactile["lignes"] = [
    { texte: `Appuie sur Master FX : le pad tactile pilote l'effet master ${type}.`, ref: OM(31) },
    { texte: `Axe X : ${f?.x?.role ?? "rôle à découvrir"} Départ : X = ${x ?? f?.x?.depart ?? 64}.`, ref: OM(31), aVerifier: true },
    { texte: `Axe Y : ${f?.y?.role ?? "rôle à découvrir"} Départ : Y = ${y ?? f?.y?.depart ?? 64}.`, ref: OM(31), aVerifier: true },
    get("mfx.hold") === "ON"
      ? { texte: "MFX Hold : ON, l'effet reste quand tu lèves le doigt.", ref: OM(22) }
      : { texte: "MFX Hold : OFF, l'effet s'arrête quand tu lèves le doigt.", ref: OM(22) },
  ];
  return { utilise: true, mode: "Master FX", lignes };
}

// ---------------------------------------------------------------- Réglages de pas
/** Gate Time, TIE et vélocité : seulement ce dont la recette a besoin. */
export function reglagesPas(rc: Recette, reglages: Reglage[], mesures: Pas[][]): { texte: string; ref?: Source }[] {
  const out: { texte: string; ref?: Source }[] = [];
  const gate = reglages.find((x) => x.param === "step.gate");
  if (gate) out.push({ texte: `Gate Time : ${gate.valeur} sur toutes les notes (Step Edit).`, ref: PG(5) });
  const ties: string[] = [];
  mesures.forEach((m, b) => m.forEach((p, i) => { if (p === "~" && i > 0 && m[i - 1] !== "~") ties.push(`${b + 1}.${String(i).padStart(2, "0")}`); }));
  if (ties.length) out.push({ texte: `Gate Time : TIE sur les pas ${ties.slice(0, 12).join(", ")}${ties.length > 12 ? "…" : ""} (la note continue sur le pas suivant).`, ref: PG(5) });
  if (rc.reglages.some((x) => x.param === "part.trgvelocity")) out.push({ texte: "TRG.PAD VELOCITY : la force de frappe sur les pads compte.", ref: PG(4) });
  return out;
}
