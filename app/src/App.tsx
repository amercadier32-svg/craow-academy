import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { toutArreter } from "./lib/moteurAudio";
import Accueil from "./modules/Accueil";
import { MenuPlus } from "./components/MenuPlus";
import { SessionVeille } from "./components/SessionVeille";
import { RappelExport } from "./components/RappelExport";
import { HoteConfirmer } from "./components/Confirmer";
import { StylesCss } from "./components/Styles";
import { PixelArt } from "./components/PixelArt";
import { MenuMachines, Repere } from "./components/MenuMachines";
import { positionDe } from "./machines";
import { etatHisto, peutAvancer, peutRevenir, retrouverPosition, suivrePosition } from "./lib/retour";

// Chaque module se charge seulement quand tu l'ouvres (l'accueil est prêt tout de suite).
const MachineMap = lazy(() => import("./modules/MachineMap"));
const SoundChain = lazy(() => import("./modules/SoundChain"));
const Parcours = lazy(() => import("./modules/Parcours"));
const Gammes = lazy(() => import("./modules/Gammes"));
const Recettes = lazy(() => import("./modules/Recettes"));
const Quiz = lazy(() => import("./modules/Quiz"));
const Glossaire = lazy(() => import("./modules/Glossaire"));
const Carnet = lazy(() => import("./modules/Carnet"));
const Effets = lazy(() => import("./modules/Effets"));
const Midi = lazy(() => import("./modules/Midi"));
const Jeu = lazy(() => import("./modules/Jeu"));
const Setup = lazy(() => import("./modules/Setup"));
const Studio = lazy(() => import("./modules/Studio"));
const Morceau = lazy(() => import("./modules/Morceau"));
const PageApprendre = lazy(() => import("./modules/Pages").then((m) => ({ default: m.PageApprendre })));
const PageMachine = lazy(() => import("./modules/Pages").then((m) => ({ default: m.PageMachine })));
const Favoris = lazy(() => import("./modules/Favoris"));
const Styles = lazy(() => import("./modules/Styles"));
const Session = lazy(() => import("./modules/Session"));
const ReglagesAudio = lazy(() => import("./modules/ReglagesAudio"));
const MesDonnees = lazy(() => import("./modules/MesDonnees"));
const Raccourcis = lazy(() => import("./modules/Raccourcis"));
// Le bandeau « prise à récupérer » (après un plantage pendant un enregistrement) se charge juste après l'accueil.
const RecupPrises = lazy(() => import("./components/RecupPrises"));

// Tous les écrans de l'app (#id dans l'adresse). `menu` = l'entrée du menu principal qui s'allume
// (« machines » = le menu déroulant ; la machine et le groupe sont dans src/machines/index.ts).
const MODULES = [
  { id: "accueil", nom: "Accueil", menu: "accueil" },
  { id: "carte", nom: "Carte de la machine", menu: "machines" },
  { id: "chaine", nom: "Chaîne du son", menu: "machines" },
  { id: "recettes", nom: "Recettes par style", menu: "machines" },
  { id: "styles", nom: "Les styles", menu: "machines" },
  { id: "morceau", nom: "Construire un morceau", menu: "machines" },
  { id: "gammes", nom: "Gammes et tonalités", menu: "machines" },
  { id: "effets", nom: "Guide des effets et modulations", menu: "machines" },
  { id: "jeu", nom: "Swing, Groove, Chord et Gate Arp", menu: "machines" },
  { id: "midi", nom: "MIDI : l'app parle à ton E2", menu: "machines" },
  { id: "setup", nom: "Mon setup : 2 E2, TD-3 et FL Studio", menu: "machines" },
  { id: "electribe2", nom: "Korg Electribe 2", menu: "machines" },
  { id: "td3", nom: "Behringer TD-3", menu: "machines" },
  { id: "carnet", nom: "Carnet", menu: "carnet" },
  { id: "studio", nom: "Studio", menu: "studio" },
  { id: "apprendre", nom: "Apprendre", menu: "accueil" },
  { id: "favoris", nom: "Mes favoris", menu: "favoris" },
  { id: "session", nom: "Session", menu: "machines" },
  { id: "parcours", nom: "Parcours d'apprentissage", menu: "accueil" },
  { id: "quiz", nom: "Quiz et flashcards", menu: "accueil" },
  { id: "glossaire", nom: "Glossaire et recherche", menu: "recherche" },
  { id: "audio", nom: "Réglages audio", menu: "plus" },
  { id: "donnees", nom: "Mes données", menu: "plus" },
  { id: "raccourcis", nom: "Raccourcis clavier", menu: "plus" },
] as const;

// Le menu principal, en haut de toutes les pages : Accueil | Machines ▼ | Studio | Carnet | Favoris | 🔍 | ☰ Plus.
// Accueil, Studio, Carnet et Favoris sont communs à toutes les machines.
const MENU_AVANT = [{ id: "accueil", nom: "Accueil", icone: "accueil" }] as const;
const MENU_APRES = [
  { id: "studio", nom: "Studio", icone: "mastering" },
  { id: "carnet", nom: "Carnet", icone: "carnet" },
  { id: "favoris", nom: "Favoris", icone: "favoris" },
] as const;

const ICONES_PLUS: Record<string, string> = { audio: "audio", donnees: "carnet", raccourcis: "glossaire" };

// Anciennes adresses (avant la simplification d'octobre 2026) : elles mènent au même endroit dans le Studio,
// et l'ancien Labo (#labo) mène à la page de la machine, où Groove, MIDI et Setup sont maintenant rangés.
const ANCIENNES: Record<string, string> = { enregistrements: "enregistrer", visualiseur: "visualiser", reference: "analyser", mastering: "masteriser" };

type ModuleId = (typeof MODULES)[number]["id"];

// #carte, #chaine… ; #carte/cutoff ouvre directement la fiche d'un contrôle. Sans #, l'accueil.
function readHash(): { mod: ModuleId; arg?: string } {
  const [h, ...r] = window.location.hash.replace("#", "").split("/");
  const arg = r.length ? r.join("/") : undefined;   // #studio/analyser/<id> : arg = « analyser/<id> »
  if (ANCIENNES[h]) return { mod: "studio", arg: [ANCIENNES[h], ...r].join("/") };
  if (h === "labo") return { mod: "electribe2" };
  // Grilles et Structure ont quitté le Labo (octobre 2026) : les anciens liens ouvrent la grille et la structure de « Construire un morceau ».
  if (h === "grilles" || h === "structure") return { mod: "morceau", arg: h === "grilles" ? "grille" : "structure" };
  return { mod: (MODULES.find((m) => m.id === h)?.id ?? "accueil") as ModuleId, arg };
}

export default function App() {
  const [{ mod, arg }, setRoute] = useState(readHash);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const modPrec = useRef(readHash().mod);
  const [nav, setNav] = useState(() => { etatHisto(); return { arriere: peutRevenir(), avant: peutAvancer() }; });
  useEffect(() => {
    suivrePosition();
    const majNav = () => setNav({ arriere: peutRevenir(), avant: peutAvancer() });
    const on = () => {
      // Changer de page arrête tous les sons (seule l'alerte de Session peut encore sonner).
      if (readHash().mod !== modPrec.current) toutArreter();
      modPrec.current = readHash().mod;
      etatHisto();
      setRoute(readHash()); setMenuOuvert(false); majNav();
      // même endroit qu'avant si on revient en arrière, sinon le haut de la page
      requestAnimationFrame(retrouverPosition);
    };
    // une fenêtre qui s'ouvre (pushState) ne déclenche aucun événement : on relit l'état après chaque clic
    const clic = () => window.setTimeout(majNav, 0);
    // Alt + ← et Alt + → : page précédente / suivante (comme dans le navigateur)
    const touche = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); if (peutRevenir()) history.back(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); if (peutAvancer()) history.forward(); }
    };
    window.addEventListener("hashchange", on);
    window.addEventListener("popstate", majNav);
    window.addEventListener("click", clic, true);
    window.addEventListener("keydown", touche);
    return () => { window.removeEventListener("hashchange", on); window.removeEventListener("popstate", majNav); window.removeEventListener("click", clic, true); window.removeEventListener("keydown", touche); };
  }, []);
  const current = MODULES.find((m) => m.id === mod)!;
  const pos = positionDe(mod);
  const actif = pos?.module ?? (pos ? { nom: pos.machine.court, icone: pos.machine.icone } : null)
    ?? [...MENU_AVANT, ...MENU_APRES].find((m) => m.id === current.menu)
    ?? (current.menu === "plus" ? { nom: current.nom, icone: ICONES_PLUS[current.id] ?? "audio" } : null)
    ?? { nom: "Recherche", icone: "glossaire" };
  const lien = (m: { id: string; nom: string; icone: string }) => (
    <a key={m.id} href={`#${m.id}`} className={m.id === current.menu ? "active" : ""}
       aria-current={m.id === current.menu ? "page" : undefined}>
      <PixelArt name={m.icone} size={22} /> <span>{m.nom}</span>
    </a>
  );

  return (
    <div className={`app mod-${mod} ${pos ? "avec-repere" : ""}`}>
      <StylesCss />
      <header className="top">
        <div className="top-ligne">
        <div className="top-fleches" role="group" aria-label="Navigation">
          <button type="button" className="fleche-nav" disabled={!nav.arriere} onClick={() => history.back()} aria-label="Page précédente" title="Revenir à la page précédente, exactement où tu étais (Alt + ←)">←</button>
          <button type="button" className="fleche-nav" disabled={!nav.avant} onClick={() => history.forward()} aria-label="Page suivante" title="Revenir en avant (Alt + →)">→</button>
        </div>
        <div className="top-ligne-reste">
        <div className="top-mobile">
          <a href="#accueil" className="top-brand">CrAoW ACADEMY</a>
          <span className="top-cur"><PixelArt name={actif.icone} size={18} /> {actif.nom}</span>
          <button type="button" className="burger" aria-expanded={menuOuvert} aria-controls="menu-principal" onClick={() => setMenuOuvert((o) => !o)}>
            <span aria-hidden>{menuOuvert ? "✕" : "☰"}</span> Menu
          </button>
        </div>
        <nav id="menu-principal" className={`nav ${menuOuvert ? "open" : ""}`} aria-label="Modules">
          {MENU_AVANT.map(lien)}
          <MenuMachines ecran={mod} />
          {MENU_APRES.map(lien)}
          <a href="#glossaire" className={`nav-search ${mod === "glossaire" ? "active" : ""}`} title="Recherche et glossaire">
            <PixelArt name="glossaire" size={22} /> <span className="nav-search-txt">Recherche</span>
          </a>
          <MenuPlus ecran={mod} />
        </nav>
        </div>
        </div>
        <Repere ecran={mod} nomSousPage={(id) => (id === "styles" ? (arg === "gerer" ? "Gérer les styles" : "Les styles") : undefined)} />
      </header>
      <PlusTard><Suspense fallback={null}><RecupPrises /></Suspense></PlusTard>
      <RappelExport />
      <HoteConfirmer />
      <main>
        <ErreurModule key={mod}>
        <Suspense fallback={<div className="chargement-module" role="status">Chargement…</div>}>
        {mod === "accueil" ? (
          <Accueil />
        ) : mod === "carte" ? (
          <MachineMap key={arg ?? ""} focus={arg} />
        ) : mod === "chaine" ? (
          <SoundChain />
        ) : mod === "parcours" ? (
          <Parcours />
        ) : mod === "gammes" ? (
          <Gammes key={arg ?? ""} focus={arg} />
        ) : mod === "recettes" ? (
          <Recettes key={arg ?? ""} focus={arg} />
        ) : mod === "effets" ? (
          <Effets key={arg ?? ""} focus={arg} />
        ) : mod === "quiz" ? (
          <Quiz key={arg ?? ""} focus={arg} />
        ) : mod === "glossaire" ? (
          <Glossaire key={arg ?? ""} focus={arg} />
        ) : mod === "carnet" ? (
          <Carnet />
        ) : mod === "midi" ? (
          <Midi />
        ) : mod === "jeu" ? (
          <Jeu />
        ) : mod === "setup" ? (
          <Setup />
        ) : mod === "morceau" ? (
          <Morceau key={arg ?? ""} focus={arg} />
        ) : mod === "studio" ? (
          <Studio arg={arg} />
        ) : mod === "electribe2" ? (
          <PageMachine id="electribe2" />
        ) : mod === "apprendre" ? (
          <PageApprendre />
        ) : mod === "styles" ? (
          <Styles key={arg ?? ""} focus={arg} />
        ) : mod === "session" ? (
          <Session key={arg ?? ""} focus={arg} machine="electribe2" />
        ) : mod === "audio" ? (
          <ReglagesAudio />
        ) : mod === "donnees" ? (
          <MesDonnees />
        ) : mod === "raccourcis" ? (
          <Raccourcis />
        ) : mod === "favoris" ? (
          <Favoris />
        ) : mod === "td3" ? (
          <div className="soon-page td3-page">
            <PixelArt name="td3" size={96} />
            <h2 className="page-title">Behringer TD-3</h2>
            <p className="muted">Guide en préparation. Il aura les mêmes menus que l'Electribe 2.</p>
            <a className="px-btn" href="#carte"><PixelArt name="machine" size={20} /> Aller au guide de l'Electribe 2</a>
          </div>
        ) : (
          <div className="soon-page">
            <h2>{current.nom}</h2>
            <p className="muted">Ce module arrive bientôt.</p>
          </div>
        )}
        </Suspense>
        </ErreurModule>
      </main>
      <SessionVeille surSession={mod === "session" && arg === "en-cours"} />
    </div>
  );
}

/** Si un module ne se charge pas, la page le dit au lieu de rester blanche. */
class ErreurModule extends Component<{ children: ReactNode }, { erreur: boolean }> {
  state = { erreur: false };
  static getDerivedStateFromError() { return { erreur: true }; }
  render() {
    if (!this.state.erreur) return this.props.children;
    return (
      <div className="soon-page" role="alert">
        <h2>Ce module n'a pas pu s'ouvrir</h2>
        <p className="muted">Recharge la page (F5). Tes données ne sont pas touchées.</p>
        <button type="button" className="px-btn" onClick={() => location.reload()}>Recharger</button>
      </div>
    );
  }
}

/** Affiche ses enfants une seconde après le démarrage, pour ne pas ralentir le premier affichage. */
function PlusTard({ children }: { children: ReactNode }) {
  const [pret, setPret] = useState(false);
  useEffect(() => { const t = setTimeout(() => setPret(true), 1000); return () => clearTimeout(t); }, []);
  return pret ? <>{children}</> : null;
}
