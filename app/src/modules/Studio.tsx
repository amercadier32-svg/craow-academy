// Module « Studio » (#studio) : Enregistrer, Visualiser, Analyser et Masteriser au même endroit.
// - un seul son « en cours » (lib/studioSon.ts) : ce que tu enregistres s'analyse puis se masterise sans réimporter ;
// - une seule barre de lecture fixe en bas, la même dans les 4 onglets (celle du Mastering : une fois / boucle,
//   forme d'onde, A/B au même volume, Bypass, Mono, mesures) ;
// - un seul enregistreur, partagé par Enregistrer et Visualiser (il continue quand tu changes d'onglet) ;
// - un seul moteur audio (lib/moteurAudio.ts) et un seul spectre en courbe (lib/spectreCourbe.ts, mêmes réglages partout).
// Adresses : #studio/enregistrer, #studio/visualiser[/video | /ref=<id>], #studio/analyser[/<id>], #studio/masteriser[/lecon-…].
// Les anciennes adresses (#mastering, #reference, #visualiseur, #enregistrements) y mènent (voir App.tsx).
import { Suspense, lazy, useRef, useState } from "react";
import { PixelArt } from "../components/PixelArt";
import { BarreEntree, VueEnregistreur, useEnregistreur } from "../components/Enregistreur";
import { lireWav, fmtTemps, sonDemo } from "../lib/masterAnalyse";
import { NOM_ORIGINE, ouvrirDansStudio, poserSonStudio, useSonStudio } from "../lib/studioSon";
import Mastering from "./Mastering";
import "./studio.css";

const Visualiseur = lazy(() => import("./Visualiseur"));
const Reference = lazy(() => import("./Reference"));
const MesEnregistrements = lazy(() => import("./MesEnregistrements"));

export type Onglet = "enregistrer" | "visualiser" | "analyser" | "masteriser";
export const ONGLETS: { id: Onglet; nom: string; icone: string; texte: string }[] = [
  { id: "enregistrer", nom: "Enregistrer", icone: "enregistrer", texte: "Ton E2 par la Scarlett, et tes prises" },
  { id: "visualiser", nom: "Visualiser", icone: "visualiseur", texte: "Spectre, onde, stéréo en direct, mode vidéo" },
  { id: "analyser", nom: "Analyser", icone: "reference", texte: "Tempo, tonalité, son d'un passage, recettes" },
  { id: "masteriser", nom: "Masteriser", icone: "mastering", texte: "6 curseurs, presets, A/B, export" },
];

/** « masteriser/lecon-eq » → onglet + suite. */
export function lireArg(arg?: string): { onglet: Onglet; reste?: string } {
  const [o, ...r] = (arg ?? "").split("/");
  const onglet = ONGLETS.find((x) => x.id === o)?.id ?? "enregistrer";
  return { onglet, reste: ONGLETS.some((x) => x.id === o) ? r.join("/") || undefined : undefined };
}

export default function Studio({ arg }: { arg?: string }) {
  const { onglet, reste } = lireArg(arg);
  // L'entrée audio s'ouvre dès que tu vas dans Enregistrer ou Visualiser, puis reste ouverte dans le Studio
  // (une prise en cours continue si tu changes d'onglet).
  const [entree, setEntree] = useState(onglet === "enregistrer" || onglet === "visualiser");
  if (!entree && (onglet === "enregistrer" || onglet === "visualiser")) setEntree(true);
  const r = useEnregistreur({ source: { module: "studio", titre: "Studio", href: "#studio/enregistrer" }, qui: "studio-rec", actif: entree });
  const enRec = r.phase === "rec" || r.phase === "decompte";

  return (
    <div className={`studio studio-${onglet}`}>
      <h2 className="page-title"><PixelArt name="mastering" size={34} /> Studio</h2>
      <nav className="studio-onglets" aria-label="Onglets du Studio">
        {ONGLETS.map((o) => (
          <a key={o.id} href={`#studio/${o.id}`} className={`studio-onglet ${o.id === onglet ? "on" : ""}`} aria-current={o.id === onglet ? "page" : undefined} title={o.texte}>
            <PixelArt name={o.icone} size={22} /> <span>{o.nom}</span>
            {o.id === "enregistrer" && enRec && <i className="studio-rec-led" aria-label="enregistrement en cours" />}
          </a>
        ))}
      </nav>
      <SonEnCours />

      <Suspense fallback={<div className="chargement-module" role="status">Chargement…</div>}>
        {onglet === "enregistrer" ? (
          <OngletEnregistrer r={r} focus={reste} />
        ) : onglet === "visualiser" ? (
          <Visualiseur key={reste ?? ""} focus={reste} r={r} />
        ) : onglet === "analyser" ? (
          <Reference key={reste ?? ""} focus={reste} />
        ) : null}
      </Suspense>
      {/* Toujours là : le lecteur et la barre du bas, partagés par les 4 onglets. */}
      <Mastering focus={onglet === "masteriser" ? reste : undefined} visible={onglet === "masteriser"} />
    </div>
  );
}

/** Le son en cours : son nom, d'où il vient, et de quoi en charger un autre. */
function SonEnCours() {
  const s = useSonStudio();
  const input = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  const ouvrir = (f: File) => { setErr(""); void ouvrirDansStudio(f).catch((e) => setErr(e instanceof Error ? e.message : String(e))); };
  return (
    <section className={`studio-son ${s ? "charge" : ""}`} aria-label="Son en cours"
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) ouvrir(f); }}>
      <span className="studio-son-tag">Son en cours</span>
      {s ? (
        <span className="studio-son-nom"><b title={s.son.nom}>{s.son.nom}</b><small>{fmtTemps(s.son.L.length / s.son.sr)} · {NOM_ORIGINE[s.origine]}</small></span>
      ) : <span className="studio-son-nom muted">Aucun : enregistre ton E2, ou charge un fichier (WAV, MP3, FLAC…).</span>}
      <span className="studio-son-btns">
        <button type="button" className="chipbtn" onClick={() => input.current?.click()}>📂 Charger un fichier</button>
        {!s && <button type="button" className="chipbtn" onClick={() => poserSonStudio(sonDemo(), "demo")} title="Une boucle de 8 mesures générée par l'app">Son de démo</button>}
        {s && <a className="chipbtn" href="#studio/analyser">→ Analyser</a>}
        {s && <a className="chipbtn" href="#studio/masteriser">→ Masteriser</a>}
      </span>
      <input ref={input} type="file" accept=".wav,.mp3,.flac,.m4a,.aac,audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) ouvrir(f); e.target.value = ""; }} />
      {err && <p className="small err" role="alert">{err}</p>}
    </section>
  );
}

/** Onglet Enregistrer : l'enregistreur du Studio, puis tes enregistrements. */
function OngletEnregistrer({ r, focus }: { r: ReturnType<typeof useEnregistreur>; focus?: string }) {
  return (
    <div className="studio-enr">
      <p className="audio-intro muted">Enregistre ton E2 par la Scarlett (jusqu'à 40 min). Après la prise, « Utiliser comme son en cours » l'envoie aux onglets Analyser et Masteriser, sans réimporter. <a href="#audio">Réglages audio</a></p>
      <BarreEntree qui={r.qui} />
      <VueEnregistreur r={r} sansBarre utiliser={{
        libelle: "🎚 Utiliser comme son en cours",
        action: async (f) => { poserSonStudio(lireWav(await f.arrayBuffer(), f.name), "prise"); },
      }} />
      <MesEnregistrements key={focus ?? ""} focus={focus} />
    </div>
  );
}
