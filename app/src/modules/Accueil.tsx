import { Suspense, lazy, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { PixelArt } from "../components/PixelArt";
import { NIVEAUX } from "../content/parcours";
import type { Type } from "../lib/recherche";
import { listeAnalyses, listeFavoris, useStore } from "../lib/store";
const BandeauFavoris = lazy(() => import("./AccueilFavoris"));
import { BarrePixel, Deroulant, ToutOuvrirFermer } from "../components/Deroulant";
import { derniersExports } from "../lib/exportsMaster";
import { MACHINES } from "../machines";

// Accueil, de haut en bas : titre + accroche, recherche globale, puis des sections déroulantes :
// Machines (ouverte par défaut), Mes favoris, Analyser une référence, Visualiseur en direct, Mastering, Apprendre.
// Les modules de chaque machine sont sur la page de la machine (#electribe2), pas ici.

export interface Carte { href: string; nom: string; texte: string; icone: string; couleur: string; badge: string | number; pal?: Record<string, string> }

export default function Accueil() {
  const st = useStore();
  const { faits } = st;
  const nbFavs = listeFavoris(st).length;
  const lecons = NIVEAUX.flatMap((n) => n.lecons);
  const lues = lecons.filter((l) => faits[`lesson:${l.id}`]).length;
  const exports = derniersExports();
  return (
    <div className="home">
      <section className="hero">
        <h1 className="mega craow" aria-label="CrAoW ACADEMY"><span>CrAoW</span> <span>ACADEMY</span></h1>
        <p className="hero-sub">Du premier kick au master final.</p>
      </section>

      <RechercheAccueil />

      <ToutOuvrirFermer ids={SECTIONS_ACCUEIL} />

      <BarrePixel couleurs={["#5b8bd0", "#3fd6d0", "#4fd18b"]} />
      <Deroulant id="accueil.machines" defaut icone="machine" couleur="#4e7ec2" titre="Machines" texte="L'Electribe 2 et bientôt la TD-3 : fiches, recettes, gammes, effets." badge={MACHINES.length}>
        <div className="home-machines">
          <CarteModule grande c={{ href: "#electribe2", nom: "Korg Electribe 2", texte: "Synth · la machine, les recettes, les sessions, les gammes, les effets et le Labo, rangés en 4 groupes.", icone: "machine", couleur: "#4e7ec2", badge: "4 groupes" }} />
          <CarteModule grande c={{ href: "#td3", nom: "Behringer TD-3", texte: "Guide en préparation, avec les mêmes menus que l'Electribe 2.", icone: "td3", couleur: "#8a8f9c", badge: "Bientôt" }} />
        </div>
      </Deroulant>

      <BarrePixel couleurs={["#ffd84d", "#ffb020", "#ff6a3d"]} />
      <Deroulant id="accueil.favoris" emoji="★" couleur="#ffd84d" titre="Mes favoris" texte="Tes recettes, effets, gammes et presets marqués d'une étoile." badge={nbFavs}>
        <Suspense fallback={<p className="muted small">Chargement…</p>}><BandeauFavoris /></Suspense>
      </Deroulant>

      <BarrePixel couleurs={["#ff6a3d", "#e255c8", "#9b6bff"]} />
      <Deroulant id="accueil.reference" icone="reference" couleur="#9b6bff" titre="Analyser une référence" texte="BPM, tonalité et son d'un morceau que tu aimes, puis des recettes E2 pour t'en approcher." badge={listeAnalyses(st).length ? `${listeAnalyses(st).length} analyse${listeAnalyses(st).length > 1 ? "s" : ""}` : "WAV · MP3"}>
        <SectionReference />
      </Deroulant>

      <BarrePixel couleurs={["#4fd18b", "#3fd6d0", "#7fe0ff"]} />
      <Deroulant id="accueil.visualiseur" icone="visualiseur" couleur="#4fd18b" titre="Visualiseur en direct" texte="Spectre, oscilloscope et stéréo de ton E2 par la Scarlett, et un mode vidéo pour OBS." badge="Live">
        <div className="drl-session">
          <div className="drl-session-btns">
            <a className="px-btn green" href="#visualiseur"><PixelArt name="visualiseur" size={20} /> Ouvrir le visualiseur</a>
            <a className="px-btn" href="#visualiseur/video">🎬 Mode vidéo</a>
            <a className="e2-ui-btn" href="#enregistrements"><PixelArt name="enregistrer" size={18} /> Mes enregistrements</a>
            <a className="e2-ui-btn" href="#audio"><PixelArt name="audio" size={18} /> Réglages audio</a>
          </div>
          <p className="drl-vide">Spectre en barres, spectrogramme, oscilloscope, vumètre et stéréo, seuls ou plusieurs à la fois. Le mode vidéo passe en plein écran (16:9 ou 9:16) avec ton nom, le BPM et une pulsation au kick.</p>
        </div>
      </Deroulant>

      <BarrePixel couleurs={["#ffb020", "#e255c8", "#9b6bff"]} />
      <Deroulant id="accueil.mastering" icone="mastering" couleur="#ffb020" titre="Mastering" texte="Analyser, masteriser et exporter tes morceaux, en comparant au même volume." badge={exports.length ? `${exports.length} export${exports.length > 1 ? "s" : ""}` : "WAV"}>
        <div className="drl-mastering">
          <a className="px-btn" href="#mastering"><PixelArt name="mastering" size={20} /> Ouvrir le Mastering</a>
          {exports.length === 0 ? (
            <p className="drl-vide">Pas encore d'export. Tes derniers masters exportés apparaîtront ici.</p>
          ) : (
            <ul className="drl-liste">
              {exports.slice(0, 4).map((e) => (
                <li key={e.le}><b>{e.nom}</b><span>{e.format} · {Number.isFinite(e.lufs) ? `${e.lufs.toFixed(1)} LUFS` : "—"} · {dateCourte(e.le)}</span></li>
              ))}
            </ul>
          )}
        </div>
      </Deroulant>

      <BarrePixel couleurs={["#e8484e", "#ffd84d", "#4fd18b"]} />
      <Deroulant id="accueil.apprendre" icone="parcours" couleur="#e8484e" titre="Apprendre" texte={`Le Parcours (${NIVEAUX.length} niveaux, ${lecons.length} leçons) et le Quiz.`} badge={lues ? `${lues}/${lecons.length}` : lecons.length}>
        <div className="home-machines">
          <CarteModule grande c={{ href: "#parcours", nom: "Parcours", texte: `${NIVEAUX.length} niveaux, ${lecons.length} leçons, du premier motif au morceau.`, icone: "parcours", couleur: "#e8484e", badge: lues ? `${lues}/${lecons.length}` : lecons.length }} />
          <CarteModule grande c={{ href: "#quiz", nom: "Quiz", texte: "Flashcards et répétition espacée.", icone: "quiz", couleur: "#ffd84d", badge: "?" }} />
        </div>
      </Deroulant>
    </div>
  );
}

const SECTIONS_ACCUEIL = ["accueil.machines", "accueil.favoris", "accueil.reference", "accueil.visualiseur", "accueil.mastering", "accueil.apprendre"];

/** « 29 oct. » */
export const dateCourte = (iso: string) => { try { return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); } catch { return iso.slice(0, 10); } };

/** Barre de séparation pixel épaisse, avec le titre de la section au milieu. */
export function Separateur({ titre, couleurs, icone }: { titre: string; couleurs: string[]; icone?: ReactNode }) {
  const [a, b, c] = couleurs;
  return (
    <div className="px-sep" role="presentation" style={{ "--s1": a, "--s2": b ?? a, "--s3": c ?? b ?? a } as CSSProperties}>
      <span className="px-sep-barre" />
      <h2 className="px-sep-titre">{icone && <span className="px-sep-ic" aria-hidden>{icone}</span>}{titre}</h2>
      <span className="px-sep-barre" />
    </div>
  );
}

export function GrosBouton({ href, icone, couleur, nom, texte, badge }: { href: string; icone: string; couleur: string; nom: string; texte: string; badge?: string | number }) {
  return (
    <a className="gros-btn" href={href} style={{ "--cc": couleur } as CSSProperties}>
      <span className="gros-btn-img"><PixelArt name={icone} size={72} /></span>
      <span className="gros-btn-txt"><b>{nom}</b><span>{texte}</span></span>
      {badge !== undefined && <span className="mcard-badge gros-btn-badge">{badge}</span>}
      <span className="gros-btn-fleche" aria-hidden>▶</span>
    </a>
  );
}

export function CarteModule({ c, grande }: { c: Carte; grande?: boolean }) {
  return (
    <a className={`mcard ${grande ? "mcard-grande" : ""}`} href={c.href} style={{ "--cc": c.couleur } as CSSProperties}>
      <span className="mcard-img">
        <PixelArt name={c.icone} size={grande ? 128 : 96} pal={c.pal} />
        <span className="mcard-badge">{c.badge}</span>
      </span>
      <span className="mcard-txt">
        <b>{c.nom}</b>
        <span>{c.texte}</span>
      </span>
    </a>
  );
}

// ---------- Recherche dans toute l'app ----------
const ORDRE: Type[] = ["recette", "fx", "gamme", "defi", "lecon", "ctl", "param", "geste", "grille", "osc"];

type ModRecherche = typeof import("../lib/recherche");
function RechercheAccueil() {
  // La recherche lit toute l'app (recettes, effets, glossaire…) : elle se charge quand tu commences à taper.
  const [m, setM] = useState<ModRecherche | null>(null);
  const charger = () => { if (!m) void import("../lib/recherche").then(setM); };
  const all = useMemo(() => (m ? m.indexRecherche() : []), [m]);
  const [q, setQ] = useState("");
  useEffect(() => { if (q) charger(); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const { lex, res } = useMemo(() => (m ? m.chercher(q, all) : { lex: [], res: [] }), [q, all, m]);
  const TYPES = m?.TYPES ?? ({} as ModRecherche["TYPES"]);
  const groupes = ORDRE.map((t) => ({ t, items: res.filter((x) => x.type === t) })).filter((g) => g.items.length);
  const total = lex.length + res.length;
  const toutVoir = `#glossaire/q=${encodeURIComponent(q.trim())}`;
  return (
    <div className="home-search">
      <label className="home-search-barre">
        <PixelArt name="glossaire" size={28} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} onFocus={charger} aria-label="Chercher dans toute l'app"
          placeholder="Chercher partout : recettes, effets, glossaire, leçons, fiches de la machine…"
          onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) location.hash = toutVoir; }} />
        {q && <button type="button" className="home-search-x" onClick={() => setQ("")} aria-label="Effacer">✕</button>}
      </label>
      {q.trim() && (
        <div className="home-search-res">
          {!m ? <p className="muted small">Chargement…</p> : total === 0 ? <p className="muted small">Rien trouvé pour « {q} ».</p> : (
            <>
              {lex.length > 0 && <Groupe titre="Glossaire" n={lex.length} items={lex.slice(0, 4).map((m) => ({ href: `#glossaire/${m.id}`, titre: m.fr, texte: m.def }))} />}
              {groupes.map((g) => <Groupe key={g.t} titre={TYPES[g.t]} n={g.items.length} items={g.items.slice(0, 4).map((x) => ({ href: x.lien ?? toutVoir, titre: x.titre, texte: x.texte }))} />)}
              <a className="px-btn home-search-tout" href={toutVoir}>Voir les {total} résultats</a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Groupe({ titre, n, items }: { titre: string; n: number; items: { href: string; titre: string; texte: string }[] }) {
  return (
    <section className="hs-groupe">
      <h3>{titre} <small className="muted">({n})</small></h3>
      <ul>{items.map((x) => <li key={x.href + x.titre}><a href={x.href}><b>{x.titre}</b><span>{x.texte}</span></a></li>)}</ul>
    </section>
  );
}

/** Section « Analyser une référence » de l'accueil : les dernières analyses. */
function SectionReference() {
  const st = useStore();
  const dernieres = listeAnalyses(st).slice(0, 3);
  return (
    <div className="drl-session">
      <div className="drl-session-btns">
        <a className="px-btn" href="#reference"><PixelArt name="reference" size={20} /> Analyser un morceau</a>
      </div>
      {dernieres.length === 0 ? (
        <p className="drl-vide">Charge un morceau (WAV, MP3, FLAC) : tempo, tonalité, analyse d'un kick, recettes de départ et comparaison avec ton son. Tout reste dans ton navigateur.</p>
      ) : (
        <ul className="drl-liste">
          {dernieres.map((a) => (
            <li key={a.id}>
              <b>{a.nom}</b>
              <span>{dateCourte(a.le)} · {a.bpm ? `${a.bpm.toLocaleString("fr-FR")} BPM` : "BPM ?"}{a.key ? ` · ${a.key} ${a.mineur ? "mineur" : "majeur"}` : ""} · {a.recettes.length} recette(s)</span>
              <a className="chipbtn drl-lancer" href={`#reference/${a.id}`}>📂 Ouvrir</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

