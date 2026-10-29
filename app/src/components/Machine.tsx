// Outils partagés pour recopier une recette ou une grille sur l'E2 (Recettes, Grilles, futur Labo sonore).
import { useEffect, useState } from "react";
import type { Reglage } from "../content/recettes";
import { allControls, paramById, type Source } from "../lib/data";
import { keyByEn, type Gamme } from "../lib/music";
import type { Pas } from "../lib/seq";
import { EnregistrerVersion } from "./Enregistreur";
import { MiniSpectre } from "./Visus";
import type { ModuleRec } from "../lib/recordings";
import { effacerEnregistrement, garderEnregistrement, lireEnregistrement } from "../lib/recordings";
import { Badge, SourceRef } from "./common";
import { nomPas } from "./SeqPlayer";

// paramètre → contrôle du panneau qui le règle (pour les liens vers la Carte)
export const CTL = new Map<string, string>();
allControls.forEach((c) => c.parametres?.forEach((p) => { if (!CTL.has(p)) CTL.set(p, c.id); }));

/** Page de la liste du Guide où se trouve la valeur choisie. */
export function listPage(param: string, valeur: string): Source {
  const n = parseInt(valeur, 10);
  if (param === "osc.type") return { doc: "PG", page: n <= 195 ? 11 : n <= 392 ? 12 : 13 };
  if (param === "mod.type") return { doc: "PG", page: 14 };
  if (param.startsWith("filter.")) return { doc: "PG", page: 15 };
  if (param === "ifx.type" || param === "pat.mfxtype") return { doc: "PG", page: 16 };
  return paramById.get(param)!.source;
}

/** Réglages de base, avec d'autres réglages par-dessus (variante…). */
export function fusion(base: Reglage[], extra?: Reglage[]) {
  const out = base.map((x) => ({ ...x }));
  for (const e of extra ?? []) {
    const i = out.findIndex((x) => x.param === e.param);
    if (i >= 0) out[i] = { ...e }; else out.push({ ...e });
  }
  return out;
}
export const val = (rs: Reglage[], p: string) => rs.find((x) => x.param === p)?.valeur;

export interface Ligne { texte: string; ref?: Source[]; verifier?: boolean }

export function lignesPrep(bpm: number, key: string, g: Gamme | null): Ligne[] {
  const k = keyByEn(key);
  const out: Ligne[] = [
    { texte: "Choisis un motif vide : Init Pattern (de 201 à 250).", ref: [{ doc: "PG", page: 18 }, { doc: "OM", page: 27 }] },
    { texte: `BPM = ${bpm.toFixed(1)} (Shift + molette pour régler par 0,1).`, ref: [{ doc: "PG", page: 3 }, { doc: "OM", page: 30 }] },
    { texte: "LENGTH = 4 : le motif dure 4 blocs Step, soit 64 pas.", ref: [{ doc: "PG", page: 3 }] },
  ];
  if (g) out.push({ texte: `KEY = ${k.en} (${k.fr}) et SCALE = ${g.n} ${g.nom} : Shift + Touch Scale ouvre SCALE.`, ref: [{ doc: "PG", page: 3 }, { doc: "PG", page: 10 }, { doc: "PG", page: 15 }] });
  return out;
}

export function lignesSon(partie: number, reglages: Reglage[], knobs: Record<string, number>, lue: (id: string) => boolean): Ligne[] {
  return [
    { texte: `Choisis la partie ${partie} avec <Part et Part>.`, ref: [{ doc: "OM", page: 27 }] },
    ...reglages.map((x) => {
      const p = paramById.get(x.param)!;
      const knob = knobs[x.param];
      const valeur = knob !== undefined && x.aVerifier ? String(knob) : x.valeur;
      return { texte: `${p.nom} = ${valeur}`, ref: [x.aVerifier ? p.source : listPage(x.param, x.valeur)], verifier: x.aVerifier && !lue(x.param) };
    }),
  ];
}

/** La séquence bloc par bloc : « Step 1 → pads … ». */
export function lignesSequence(mesures: Pas[][], percu: boolean, g: Gamme, key: string, octave = 0): Ligne[] {
  const seq: Ligne[] = [];
  mesures.forEach((m, b) => {
    const prev = b > 0 && JSON.stringify(m) === JSON.stringify(mesures[b - 1]);
    if (prev) { seq.push({ texte: `Step ${b + 1} → pareil que Step ${b} (mêmes pads${percu ? "" : ", mêmes notes"}).` }); return; }
    const on = m.map((p, i) => (p !== null ? i + 1 : 0)).filter(Boolean);
    if (!on.length) { seq.push({ texte: `Step ${b + 1} → aucun pad (mesure vide).` }); return; }
    if (percu) { seq.push({ texte: `Step ${b + 1} → pads ${on.join(", ")}.` }); return; }
    const parts: string[] = [];
    const ties: string[] = [];
    let last: Pas = null;
    m.forEach((p, i) => {
      if (p === null) { last = null; return; }
      const real = p === "~" ? last : p;
      if (real === null) return;
      parts.push(`pad ${i + 1} = ${nomPas(g, key, real, octave)!.en}`);
      if (m[i + 1] === "~") ties.push(String(i + 1));
      last = real;
    });
    seq.push({ texte: `Step ${b + 1} → ${parts.join(", ")}.${ties.length ? ` GATE TIME = TIE sur les pads ${ties.join(", ")} (la note continue sur le pad suivant).` : ""}` });
  });
  return seq;
}

export const LIGNE_SEQUENCER: Ligne = { texte: "Allume Sequencer : les 16 pads sont les 16 pas du bloc Step choisi.", ref: [{ doc: "OM", page: 30 }, { doc: "OM", page: 24 }] };
export const LIGNE_NOTES: Ligne = { texte: "Pour chaque note : Step Edit, STEP NUMBER = bloc.pas (1.01 à 4.16), NOTE = la note indiquée, écrite comme l'écran (C4 = la note que le pad pose par défaut). L'octave est celle de l'aperçu : ajuste-la à l'oreille (Shift + molette = une octave). Ou, en mode Keyboard, Rec puis joue les notes sur les pads.", ref: [{ doc: "PG", page: 5 }, { doc: "OM", page: 30 }] };
export const LIGNE_WRITE: Ligne = { texte: "Sauvegarde avec Write, choisis l'emplacement, puis Write encore.", ref: [{ doc: "OM", page: 31 }] };

/** Bouton « Copier vers ma machine » et ses étapes, avec copie du texte. */
export function CopierPanel({ titre, note, sections }: { titre: string; note: string; sections: { titre: string; lignes: Ligne[] }[] }) {
  const [open, setOpen] = useState(false);
  const [copie, setCopie] = useState(false);
  const texte = () => `CrAoW ACADEMY · ${titre}\n\n${sections.map((s) => `${s.titre}\n${s.lignes.map((l, i) => `${i + 1}. ${l.texte}${l.verifier ? " (à vérifier sur l'écran)" : ""}`).join("\n")}`).join("\n\n")}\n`;
  const copier = async () => {
    try { await navigator.clipboard.writeText(texte()); }
    catch {
      const t = document.createElement("textarea"); t.value = texte(); document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } finally { t.remove(); }
    }
    setCopie(true); setTimeout(() => setCopie(false), 2000);
  };
  return (
    <div className="block copy-machine">
      <button type="button" className="e2-ui-btn big" aria-expanded={open} onClick={() => setOpen((o) => !o)}>⇩ Copier vers ma machine</button>
      {open && (
        <div className="cm-body">
          <p className="small muted">{note}</p>
          {sections.map((s) => (
            <div key={s.titre}>
              <h4>{s.titre}</h4>
              <ol className="steps">{s.lignes.map((l, i) => <li key={i}>{l.texte}{l.verifier && <span className="verify"> à vérifier sur l'écran</span>} {l.ref?.map((x, j) => <SourceRef key={j} src={x} compact />)}</li>)}</ol>
            </div>
          ))}
          <button type="button" className="e2-ui-btn" onClick={copier}>{copie ? "✓ Copié" : "Copier le texte"}</button>
        </div>
      )}
    </div>
  );
}

// ---------- Mon enregistrement de la vraie machine ----------
export function MonEnregistrement({ id, titre, bpm, module = "recette", href }: { id: string; titre?: string; bpm?: number; module?: ModuleRec; href?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    let u: string | null = null;
    lireEnregistrement(id).then((e) => { if (e) { u = URL.createObjectURL(e.blob); setUrl(u); setNom(e.nom); } }).catch(() => setErr("Le navigateur ne peut pas garder de fichier audio ici."));
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [id]);
  const add = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("audio/") && !/\.(wav|mp3|m4a|ogg|flac|aif+)$/i.test(f.name)) { setErr("Ce fichier n'est pas un fichier audio."); return; }
    try {
      await garderEnregistrement(id, { nom: f.name, blob: f, ajouteLe: new Date().toISOString() });
      if (url) URL.revokeObjectURL(url);
      setUrl(URL.createObjectURL(f)); setNom(f.name); setErr("");
    } catch { setErr("Impossible de garder ce fichier dans le navigateur."); }
  };
  const del = async () => { await effacerEnregistrement(id).catch(() => {}); if (url) URL.revokeObjectURL(url); setUrl(null); setNom(""); };
  return (
    <div className="block rec-mine">
      <h3>Ma version sur la machine <Badge kind="obs" /></h3>
      <p className="small">Joue la recette sur ton E2 et enregistre-la par la Scarlett : tes versions se rangent ici, à côté de l'aperçu, pour comparer. Elles restent dans ce navigateur, sur cet appareil.</p>
      <MiniSpectre />
      <EnregistrerVersion source={{ module, ref: id, titre: titre ?? id, href: href ?? `#recettes/${id}` }} bpm={bpm} />
      <p className="small muted">Ou ajoute un fichier enregistré ailleurs (FL Studio, WAV ou MP3) :</p>
      {url ? (
        <div className="rec-row">
          <audio controls src={url} preload="metadata" />
          <span className="small muted">{nom}</span>
          <button type="button" className="e2-ui-btn" onClick={del}>Retirer</button>
        </div>
      ) : (
        <label className="e2-ui-btn rec-add">Ajouter mon enregistrement…<input type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac,.aif,.aiff" onChange={(e) => add(e.target.files?.[0])} hidden /></label>
      )}
      {err && <p className="small err">{err}</p>}
    </div>
  );
}

