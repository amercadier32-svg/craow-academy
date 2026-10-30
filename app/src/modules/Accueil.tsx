import { Suspense, lazy, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { PixelArt } from "../components/PixelArt";
import type { Niveau } from "../content/parcours";
import type { Type } from "../lib/recherche";
import { listeAnalyses, listeFavoris, useStore } from "../lib/store";
const BandeauFavoris = lazy(() => import("./AccueilFavoris"));
import { BarrePixel, Deroulant, ToutOuvrirFermer } from "../components/Deroulant";
import { derniersExports } from "../lib/exportsMaster";
import { MACHINES } from "../machines";

// Accueil, de haut en bas : titre + accroche, recherche globale, puis des sections déroulantes :
// Machines (ouverte par défaut), Mes favoris, Studio (Enregistrer, Visualiser, Analyser, Masteriser), Apprendre.
// Les modules de chaque machine sont sur la page de la machine (#electribe2), pas ici.

export interface Carte { href: string; nom: string; texte: string; icone: string; couleur: string; badge: string | number; pal?: Record<string, string> }

export default function Accueil() {
  const st = useStore();
  const { faits } = st;
  const nbFavs = listeFavoris(st).length;
  // Le Parcours (contenu lourd) se lit juste après l'affichage de l'accueil, pour compter les leçons.
  const [NIVEAUX, setNiveaux] = useState<Niveau[]>([]);
  useEffect(() => { let ok = true; void import("../content/parcours").then((m) => { if (ok) setNiveaux(m.NIVEAUX); }); return () => { ok = false; }; }, []);
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
          <CarteModule grande c={{ href: "#electribe2", nom: "Korg Electribe 2", texte: "Synth · la machine, le setup, les recettes, les sessions, le groove, les gammes et les effets, rangés en 4 groupes.", icone: "machine", couleur: "#4e7ec2", badge: "4 groupes" }} />
          <CarteModule grande c={{ href: "#td3", nom: "Behringer TD-3", texte: "Guide en préparation, avec les mêmes menus que l'Electribe 2.", icone: "td3", couleur: "#8a8f9c", badge: "Bientôt" }} />
        </div>
      </Deroulant>

      <BarrePixel couleurs={["#ffd84d", "#ffb020", "#ff6a3d"]} />
      <Deroulant id="accueil.favoris" emoji="★" couleur="#ffd84d" titre="Mes favoris" texte="Tes recettes, effets, gammes et presets marqués d'une étoile." badge={nbFavs}>
        <Suspense fallback={<p className="muted small">Chargement…</p>}><BandeauFavoris /></Suspense>
      </Deroulant>

      <BarrePixel couleurs={["#ff3b3b", "#ffb020", "#9b6bff"]} />
      <Deroulant id="accueil.studio" icone="mastering" couleur="#ffb020" titre="Studio" texte="Enregistrer, visualiser, analyser et masteriser ton son, au même endroit." badge={exports.length ? `${exports.length} export${exports.length > 1 ? "s" : ""}` : "4 onglets"}>
        <SectionStudio exports={exports} />
      </Deroulant>

      <BarrePixel couleurs={["#e8484e", "#ffd84d", "#4fd18b"]} />
      <Deroulant id="accueil.apprendre" icone="parcours" couleur="#e8484e" titre="Apprendre" texte={NIVEAUX.length ? `Le Parcours (${NIVEAUX.length} niveaux, ${lecons.length} leçons) et le Quiz.` : "Le Parcours et le Quiz."} badge={lues ? `${lues}/${lecons.length}` : lecons.length}>
        <div className="home-machines">
          <CarteModule grande c={{ href: "#parcours", nom: "Parcours", texte: `${NIVEAUX.length} niveaux, ${lecons.length} leçons, du premier motif au morceau.`, icone: "parcours", couleur: "#e8484e", badge: lues ? `${lues}/${lecons.length}` : lecons.length }} />
          <CarteModule grande c={{ href: "#quiz", nom: "Quiz", texte: "Flashcards et répétition espacée.", icone: "quiz", couleur: "#ffd84d", badge: "?" }} />
        </div>
      </Deroulant>
    </div>
  );
}

const SECTIONS_ACCUEIL = ["accueil.machines", "accueil.favoris", "accueil.studio", "accueil.apprendre"];

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
const ORDRE: Type[] = ["page", "recette", "fx", "gamme", "lecon", "defi", "session", "analyse", "ctl", "param", "geste", "grille", "osc"];

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
          placeholder="Chercher partout : recettes, effets, gammes, glossaire, leçons, sessions, pages…"
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

/** Section « Studio » de l'accueil : les 4 onglets, les dernières analyses et les derniers masters exportés. */
function SectionStudio({ exports }: { exports: ReturnType<typeof derniersExports> }) {
  const st = useStore();
  const dernieres = listeAnalyses(st).slice(0, 3);
  return (
    <div className="drl-session">
      <div className="drl-session-btns">
        <a className="px-btn" href="#studio/enregistrer"><PixelArt name="enregistrer" size={20} /> Enregistrer</a>
        <a className="px-btn green" href="#studio/visualiser"><PixelArt name="visualiseur" size={20} /> Visualiser</a>
        <a className="px-btn" href="#studio/analyser"><PixelArt name="reference" size={20} /> Analyser</a>
        <a className="px-btn" href="#studio/masteriser"><PixelArt name="mastering" size={20} /> Masteriser</a>
        <a className="e2-ui-btn" href="#studio/visualiser/video">🎬 Mode vidéo</a>
      </div>
      <p className="drl-vide">Un seul son en cours pour les 4 onglets : ce que tu enregistres s'analyse puis se masterise sans réimporter le fichier. La barre de lecture en bas est la même partout (A/B au même volume, Bypass, Mono).</p>
      {dernieres.length > 0 && (
        <ul className="drl-liste">
          {dernieres.map((a) => (
            <li key={a.id}>
              <b>{a.nom}</b>
              <span>Analyse · {dateCourte(a.le)} · {a.bpm ? `${a.bpm.toLocaleString("fr-FR")} BPM` : "BPM ?"}{a.key ? ` · ${a.key} ${a.mineur ? "mineur" : "majeur"}` : ""} · {a.recettes.length} recette(s)</span>
              <a className="chipbtn drl-lancer" href={`#studio/analyser/${a.id}`}>📂 Ouvrir</a>
            </li>
          ))}
        </ul>
      )}
      {exports.length > 0 && (
        <ul className="drl-liste">
          {exports.slice(0, 3).map((e) => (
            <li key={e.le}><b>{e.nom}</b><span>Master · {e.format} · {Number.isFinite(e.lufs) ? `${e.lufs.toFixed(1)} LUFS` : "—"} · {dateCourte(e.le)}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
