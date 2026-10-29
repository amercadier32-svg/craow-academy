// Pages de rangement : la page d'une machine (ses groupes de modules) et « Apprendre » (Parcours + Quiz).
import { ecrireTexte } from "../lib/stockage";
import { MACHINES } from "../machines";
import { RECETTES } from "../content/recettes";
import { FICHES } from "../content/effets";
import { NIVEAUX } from "../content/parcours";
import { BLOCS } from "../content/chain";
import { GAMMES } from "../lib/music";
import { allControls } from "../lib/data";
import { useStore } from "../lib/store";
import { defisDeMachine } from "../lib/sessionMachines";
import { CarteModule, type Carte } from "./Accueil";
import { Deroulant, ToutOuvrirFermer } from "../components/Deroulant";

/** Texte et badge de chaque module sur la page de la machine. */
const INFOS: Record<string, { texte: string; badge: () => string | number }> = {
  carte: { texte: "Chaque potard, bouton et pad, à sa place.", badge: () => allControls.length },
  chaine: { texte: "Le trajet du son, de l'oscillateur à la sortie.", badge: () => Object.keys(BLOCS).length },
  recettes: { texte: "Des sons prêts à copier dans 7 styles, du Tribe au Dub tekno.", badge: () => RECETTES.length },
  morceau: { texte: "Un morceau complet, couche par couche, avec les recettes.", badge: () => "NEW" },
  session: { texte: "Des défis chronométrés pour finir des sons au lieu de chercher la perfection.", badge: () => defisDeMachine("electribe2").length },
  gammes: { texte: "Les gammes de l'E2, à voir et à écouter.", badge: () => GAMMES.length },
  effets: { texte: "Insert FX, Master FX et modulations.", badge: () => FICHES.length },
  labo: { texte: "Groove, MIDI et setup.", badge: () => 3 },
};

export function PageMachine({ id }: { id: string }) {
  const m = MACHINES.find((x) => x.id === id)!;
  const ids = m.groupes.map((g) => `machine.${m.id}.${g.num}`);
  return (
    <div className="home machine-page">
      <h2 className="page-title">{m.nom} {m.detail && <small className="muted">{m.detail}</small>}</h2>
      <ToutOuvrirFermer ids={ids} />
      {m.groupes.map((g, k) => (
        <Deroulant key={g.num} id={ids[k]} petit defaut={k === 0} couleur={g.couleur} icone={g.modules[0]?.icone}
          titre={`${g.num} · ${g.titre}`} texte={g.modules.map((x) => x.nom).join(", ")} badge={g.modules.length}>
          <div className="home-grid mp-grid">
            {g.modules.map((mod) => {
              const i = INFOS[mod.id];
              const c: Carte = { href: `#${mod.id}`, nom: mod.nom, texte: i?.texte ?? "", icone: mod.icone, couleur: g.couleur, badge: i?.badge() ?? "" };
              return <CarteModule key={mod.id} c={c} />;
            })}
          </div>
        </Deroulant>
      ))}
    </div>
  );
}

const COUL_NIV = ["#e8484e", "#ff6a3d", "#ffb020", "#ffd84d", "#4fd18b", "#3fd6d0", "#6aa2ee", "#9b6bff", "#e255c8", "#ff86d9", "#c9ccd3"];

export function PageApprendre() {
  const { faits } = useStore();
  const lecons = NIVEAUX.flatMap((n) => n.lecons);
  const lues = lecons.filter((l) => faits[`lesson:${l.id}`]).length;
  const ouvrirNiveau = (n: number) => { ecrireTexte("e2academy.parcours.niveau", String(n)); };
  return (
    <div className="home apprendre-page">
      <h2 className="page-title">Apprendre</h2>
      <p className="muted" style={{ textAlign: "center" }}>Le parcours pas à pas, puis le quiz pour retenir.</p>
      <ToutOuvrirFermer ids={["apprendre.parcours", "apprendre.quiz"]} />
      <Deroulant id="apprendre.parcours" defaut icone="parcours" couleur="#e8484e" titre="Parcours" texte={`${NIVEAUX.length} niveaux, ${lecons.length} leçons, du premier motif au morceau.`} badge={lues ? `${lues}/${lecons.length}` : lecons.length}>
        <ul className="drl-niveaux">
          {NIVEAUX.map((nv) => {
            const f = nv.lecons.filter((l) => faits[`lesson:${l.id}`]).length;
            return (
              <li key={nv.n}>
                <a href="#parcours" onClick={() => ouvrirNiveau(nv.n)} style={{ "--cc": COUL_NIV[(nv.n - 1) % COUL_NIV.length] } as React.CSSProperties}>
                  <span className="drl-niv-n">{nv.n}</span>
                  <span className="drl-niv-txt"><b>{nv.titre}</b><span>{nv.resume}</span></span>
                  <span className={`drl-niv-prog ${f === nv.lecons.length ? "fini" : ""}`}>{f}/{nv.lecons.length}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </Deroulant>
      <Deroulant id="apprendre.quiz" icone="quiz" couleur="#ffd84d" titre="Quiz" texte="Flashcards et répétition espacée." badge="?">
        <div className="home-machines">
          <CarteModule grande c={{ href: "#quiz", nom: "Quiz", texte: "Flashcards et répétition espacée, par thème.", icone: "quiz", couleur: "#ffd84d", badge: "?" }} />
          <CarteModule grande c={{ href: "#glossaire", nom: "Glossaire", texte: "Les mots de la machine et de la musique, avec le bouton Quiz.", icone: "glossaire", couleur: "#6aa2ee", badge: "A-Z" }} />
        </div>
      </Deroulant>
    </div>
  );
}
