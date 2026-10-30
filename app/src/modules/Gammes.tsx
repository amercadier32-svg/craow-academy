import { useEffect, useMemo, useState } from "react";
import { BoutonLecture } from "../components/Lecteur";
import { Etoile } from "../components/Etoile";
import { Fenetre } from "../components/Fenetre";
import { fermerFenetre, ouvrirFenetre, useEtatPage } from "../lib/retour";
import { BPM, INFO, MOTIFS, NOTES12, OM, PG } from "../content/gammes";
import { FICHE, STYLE_NOM, rangerVisibles, stylesGamme, useStyles } from "../content/styles";
import { GAMMES, KEYS, degreeSemi, ecarts, enDiese, gammeByN, nomMidi, notesIn, play, stop, type Gamme, type Note } from "../lib/music";
import { engine, useEngine } from "../lib/seq";
import { Badge, ObservationBox, SourceRef } from "../components/common";
import { Infos, Rangement } from "../components/Rangement";
import { FiltreMenu, type FmValeur } from "../components/FiltreMenu";
import { Deroulant } from "../components/Deroulant";
import { estFavori, idFavori, useStore } from "../lib/store";
import { SeqPlayer, useSeqEdit, type SeqData } from "../components/SeqPlayer";

type Key = (typeof KEYS)[number];
const ROOT_MIDI = (k: Key) => 48 + k.semi;            // Ré3 / La3
const label = (g: Gamme) => `${g.n} · ${g.nom}`;

// Lecture partagée : un seul son à la fois, la grille suit le pas joué.
function usePlayer() {
  const [playing, setPlaying] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  useEffect(() => () => stop(), []);
  const run = (id: string, events: { midi: number | null; dur: number }[], kickEvery?: number) => {
    if (playing === id) { stop(); return; }
    engine.stop();
    setPlaying(id);
    play(events, { kickEvery, onStep: setStep, onEnd: () => setPlaying((p) => (p === id ? null : p)) });
  };
  return { playing, step, run };
}

const scaleEvents = (g: Gamme, k: Key) => {
  const r = ROOT_MIDI(k);
  return [...g.notesEnDo.map((_, i) => ({ midi: r + degreeSemi(g, i), dur: 0.26 })), { midi: r + 12, dur: 0.5 }];
};

// Familles de gammes : un classement de l'app (Pratique), pour s'y retrouver dans les 35 gammes du Guide p. 15.
/** Les gammes utiles pour tes styles (Tribe, Tekno, Mentale, Acid…) : en avant en haut de la page.
 *  Toutes les autres sont dans « Plus de gammes » (fermé par défaut). Rien n'est supprimé. */
export const GAMMES_UTILES = [7, 4, 3, 9, 16, 1];

export const FAMILLES_G: { id: string; nom: string; texte: string; icone: string; couleur: string; n: number[] }[] = [
  { id: "modes", nom: "Les 7 modes", texte: "Ionian à Locrian", icone: "gammes", couleur: "#ffd84d", n: [2, 3, 4, 5, 6, 7, 8] },
  { id: "mineures", nom: "Mineures et blues", texte: "Harm, Melo, Blues", icone: "melodie", couleur: "#ffb020", n: [9, 10, 11, 12] },
  { id: "penta", nom: "Pentatoniques", texte: "5 notes", icone: "gammes", couleur: "#f2d14c", n: [15, 16] },
  { id: "monde", nom: "Gammes du monde", texte: "Raga, Arabic, Japanese…", icone: "glossaire", couleur: "#ff9f43", n: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28] },
  { id: "symetriques", nom: "Symétriques", texte: "Chromatic, Dim, Whole Tone", icone: "grille", couleur: "#e8c65a", n: [1, 13, 14, 30] },
  { id: "intervalles", nom: "Basses et intervalles", texte: "Bass Line, 5th, Octave…", icone: "basse", couleur: "#ffcf70", n: [29, 31, 32, 33, 34, 35] },
];

export default function Gammes({ focus }: { focus?: string }) {
  const [sel, setSel] = useState<number>(() => (focus && gammeByN.has(Number(focus)) ? Number(focus) : 7));
  const [ouverte, setOuverte] = useState(() => Boolean(focus && gammeByN.has(Number(focus))));
  const [fl, setFl] = useEtatPage<FmValeur>("gammes.filtres", { style: [], favoris: [] });
  const st = useStore();
  const [cat, setCat] = useEtatPage<string | null>("gammes.cat", () => (focus && gammeByN.has(Number(focus)) ? FAMILLES_G.find((f) => f.n.includes(Number(focus)))!.id : null));
  const [el, setEl] = useEtatPage<string | null>("gammes.el", () => (focus && gammeByN.has(Number(focus)) ? focus : null));
  const player = usePlayer();
  // Styles d'une gamme : repères de la page (INFO) plus les gammes conseillées par les fiches de style.
  const aStyle = (n: number, s: string) => (stylesGamme(n, INFO[n]?.styles ?? []) as string[]).includes(s);
  const { visibles } = useStyles();
  const fav = (n: number) => estFavori(st, idFavori("gamme", String(n)));
  const duStyle = (n: number) => (!fl.style.length || fl.style.some((s) => aStyle(n, s))) && (!fl.favoris.length || fav(n));
  const nb = GAMMES.filter((g) => duStyle(g.n)).length;
  const choose = (n: number) => { setSel(n); setOuverte(true); ouvrirFenetre(`#gammes/${n}`); };
  const fermer = () => fermerFenetre("#gammes", () => setOuverte(false));
  // Retour du navigateur : la fenêtre suit l'adresse (#gammes = fermée, #gammes/<n> = ouverte).
  useEffect(() => {
    const suivre = () => {
      const [m, id] = location.hash.replace("#", "").split("/");
      if (m !== "gammes") return;
      if (id && gammeByN.has(Number(id))) { setSel(Number(id)); setOuverte(true); } else setOuverte(false);
    };
    window.addEventListener("popstate", suivre);
    return () => window.removeEventListener("popstate", suivre);
  }, []);

  return (
    <div className="gammes">
      <h2 className="page-title">Gammes et tonalités</h2>
      <Infos>
        <p>
          Une <b>gamme</b>, c'est le choix des notes que les pads et le pad tactile ont le droit de jouer. La <b>tonalité</b> (KEY), c'est la note de départ.
          Les deux se règlent par motif <SourceRef src={PG(3)} compact />. Voir aussi les fiches <a href="#carte/keyboard">Keyboard ↗</a> et <a href="#carte/touchscale">Touch Scale ↗</a> sur la Carte.
        </p>
        <p>Les 35 gammes viennent du Guide <SourceRef src={PG(15)} compact />. Le rangement par familles et les styles conseillés sont des repères de l'app <Badge kind="pratique" />.</p>
      </Infos>
      <Infos titre="Noms des notes">
        <NotesNames />
      </Infos>
      <Infos titre="KEY et SCALE sur ta machine">
        <SurLaMachine />
      </Infos>

      <FiltreMenu valeur={fl} onChange={setFl} resultat={`${nb} gamme${nb > 1 ? "s" : ""}`}
        groupes={[
          { id: "style", titre: "Style", options: visibles.map((s) => ({ id: s.id, nom: s.nom, n: GAMMES.filter((g) => aStyle(g.n, s.id)).length })) },
          { id: "favoris", titre: "Favoris", options: [{ id: "oui", nom: "★ Favoris seulement", n: GAMMES.filter((g) => fav(g.n)).length }] },
        ]}
        autres={cat ? [{ id: cat, nom: FAMILLES_G.find((f) => f.id === cat)?.nom ?? cat, couleur: FAMILLES_G.find((f) => f.id === cat)?.couleur, retirer: () => { setCat(null); setEl(null); } }] : []}
        onToutEffacer={() => { setCat(null); setEl(null); }} />
      <section className="gm-utiles" aria-label="Les gammes utiles pour tes styles">
        <h3>Les gammes utiles pour tes styles</h3>
        <div className="gm-utiles-grille">
          {GAMMES_UTILES.filter(duStyle).map((n) => {
            const g = gammeByN.get(n)!;
            return (
              <button key={n} type="button" className={`gm-utile ${ouverte && sel === n ? "on" : ""}`} onClick={() => choose(n)}>
                <b>{n} · {g.nom}</b>
                <small>{INFO[n]?.caractere ?? ""}</small>
                {fav(n) && <span className="gm-utile-fav" aria-label="favori">★</span>}
              </button>
            );
          })}
          {GAMMES_UTILES.filter(duStyle).length === 0 && <p className="small muted">Aucune gamme utile avec ces filtres : regarde dans « Plus de gammes ».</p>}
        </div>
      </section>
      <Deroulant id="gammes.plus" icone="gammes" couleur="#ffd84d" titre="Plus de gammes" texte="Les 29 autres gammes de l'E2, rangées par familles." badge={GAMMES.filter((g) => !GAMMES_UTILES.includes(g.n) && duStyle(g.n)).length}>
        <Rangement
          racine="Gammes" sansAriane
          categories={FAMILLES_G.map((f) => ({ ...f, n: f.n.filter((n) => !GAMMES_UTILES.includes(n) && duStyle(n)) })).filter((f) => f.n.length).map((f) => ({
            id: f.id, nom: f.nom, texte: f.texte, icone: f.icone, couleur: f.couleur, n: f.n.length,
            elements: f.n.map((n) => ({ id: String(n), nom: label(gammeByN.get(n)!) })),
          }))}
          cat={cat} onCat={setCat} element={el} boutonTout={false}
          onElement={(id) => { setEl(id ?? el); if (id ?? el) choose(Number(id ?? el)); }}
          labelCategorie="Famille de gammes" labelElement="Gamme"
        />
      </Deroulant>

      {ouverte && (
        <Fenetre sorte="fiche" titre={`${sel} · ${gammeByN.get(sel)!.nom}`} label={gammeByN.get(sel)!.nom} onFermer={fermer}
          etoile={<Etoile type="gamme" cle={String(sel)} titre={`${sel} · ${gammeByN.get(sel)!.nom}`} />}>
          <Fiche g={gammeByN.get(sel)!} player={player} />
        </Fenetre>
      )}

      <Comparateur />
    </div>
  );
}

// ---------- KEY et SCALE sur la machine : ce que dit le manuel ----------
function SurLaMachine() {
  return (
    <section className="g-section ks">
      <h3>KEY et SCALE sur ta machine <Badge kind="manuel" /></h3>
      <div className="ks-flow" role="list" aria-label="Ordre conseillé">
        <div className="ks-box" role="listitem">
          <b>1. Choisir KEY et SCALE</b>
          <span>Shift + pad 4 (KEY), Shift + pad 5 ou Shift + Touch Scale (SCALE) <SourceRef src={PG(10)} compact /></span>
        </div>
        <i className="ks-arrow" aria-hidden>→</i>
        <div className="ks-box opt" role="listitem">
          <b>2. Si tu veux pouvoir transposer plus tard</b>
          <span>SCALE MODE = On sur la partie, <em>avant</em> d'enregistrer <SourceRef src={PG(4)} compact /></span>
        </div>
        <i className="ks-arrow" aria-hidden>→</i>
        <div className="ks-box" role="listitem">
          <b>3. Jouer et enregistrer</b>
          <span>Keyboard, puis Rec et joue sur les pads, ou Step Edit <SourceRef src={OM(28)} compact /> <SourceRef src={OM(30)} compact /></span>
        </div>
        <i className="ks-arrow" aria-hidden>→</i>
        <div className="ks-box" role="listitem">
          <b>4. Write</b>
          <span>KEY et SCALE sont gardées avec le motif <SourceRef src={OM(31)} compact /></span>
        </div>
        <i className="ks-arrow" aria-hidden>→</i>
        <div className="ks-box end" role="listitem">
          <b>5. Les notes restent fixes</b>
          <span>Avec SCALE MODE = Off, changer KEY ou SCALE ne bouge plus les notes enregistrées <SourceRef src={PG(4)} compact /></span>
        </div>
      </div>

      <div className="ks-qa">
        <div className="ks-q">
          <h4>1. Réglage du motif ou de toute la machine ?</h4>
          <p><b>Du motif.</b> KEY et SCALE sont des paramètres de motif, « sauvegardés indépendamment pour chaque motif » <SourceRef src={PG(3)} compact />. Le mode d'emploi le redit pour le mode Keyboard : « vous pouvez définir la tonique ou la gamme par motif » <SourceRef src={OM(24)} compact />. Elles ne sont donc pas dans le menu Global ; pense à <kbd>Write</kbd> pour les garder.</p>
          <p className="small muted">SCALE MODE, lui, est un paramètre de partie : chaque partie a le sien <SourceRef src={PG(4)} compact />.</p>
        </div>
        <div className="ks-q">
          <h4>2. Qu'est-ce qui change quand je change KEY ou SCALE ?</h4>
          <ul className="facts">
            <li><b>Les pads en mode Keyboard</b> : oui, ils jouent les notes de la nouvelle gamme à partir de la KEY <SourceRef src={PG(3)} compact /> <SourceRef src={OM(28)} compact /> <SourceRef src={OM(32)} compact />.</li>
            <li><b>Le pad tactile (Touch Scale)</b> : oui, SCALE « définit la gamme assignée au pad tactile » ; son étendue se règle avec TOUCH SCALE RANGE dans Global <SourceRef src={PG(3)} compact /> <SourceRef src={PG(7)} compact />.</li>
            <li><b>Le mode Chord</b> : la tonique et la gamme des accords se règlent aussi par motif <SourceRef src={OM(24)} compact />.</li>
            <li><b>Les notes déjà enregistrées</b> : ça dépend de SCALE MODE, réglé partie par partie. « Définit si les changements de gamme et de tonique influencent ou non la hauteur. » Pour que ça marche, il faut le mettre sur On <em>avant</em> d'enregistrer la partie <SourceRef src={PG(4)} compact />.</li>
          </ul>
          <p className="ks-unknown"><b>Le manuel ne dit pas :</b> la valeur de SCALE MODE dans un motif vide (Init Pattern), ni vers quelle note exacte chaque note est déplacée quand SCALE MODE = On (même rang dans la gamme ou note la plus proche). À tester sur ta machine : <a href="#gammes" onClick={(e) => { e.preventDefault(); document.getElementById("ks-test")?.scrollIntoView({ behavior: "smooth" }); }}>exercice ci-dessous</a>.</p>
        </div>
        <div className="ks-q">
          <h4>3. Peut-on transposer tout un motif ou une partie déjà enregistrée ?</h4>
          <p><b>Le manuel ne décrit aucune fonction « Transpose ».</b> Ce qu'il permet :</p>
          <ol className="steps">
            <li><b>Avec SCALE MODE = On (prévu avant l'enregistrement)</b> : choisis la partie avec <kbd>&lt;Part</kbd> <kbd>Part&gt;</kbd>, ouvre le menu d'édition (<kbd>Menu/Enter</kbd>), va à SCALE MODE avec <kbd>&lt;</kbd> <kbd>&gt;</kbd> et mets On ; enregistre ta partie ; ensuite <kbd>Shift</kbd> + pad 4 ouvre KEY : la molette change la tonique et la partie suit ; <kbd>Write</kbd> pour garder. <SourceRef src={PG(4)} compact /> <SourceRef src={OM(27)} compact /> <SourceRef src={PG(10)} compact /> <SourceRef src={OM(31)} compact /></li>
            <li><b>Partie déjà enregistrée avec SCALE MODE = Off</b> : pas de transposition d'un coup dans le manuel. Il reste le Step Edit, pas par pas : STEP NUMBER choisit le pas, NOTE change la note ; <kbd>Shift</kbd> + molette la change d'une octave <SourceRef src={PG(5)} compact />.</li>
            <li><b>Le potard Pitch</b> « règle la hauteur » de la partie <SourceRef src={OM(23)} compact />, mais le manuel ne donne ni sa plage ni s'il avance par demi-ton : <span className="kn-r verify">à vérifier sur l'écran</span>.</li>
          </ol>
          <p className="small muted">Le manuel ne dit pas non plus si passer SCALE MODE sur On <em>après</em> l'enregistrement suffit : il dit seulement de l'activer avant.</p>
        </div>
      </div>

      <div className="ks-test" id="ks-test">
        <h4>Exercice sur ta machine <Badge kind="pratique" /></h4>
        <ol className="steps">
          <li>Motif vide (Init Pattern, 201 à 250), KEY = D, SCALE = Aeolian. Partie 1 : regarde la valeur de SCALE MODE et note-la.</li>
          <li>Enregistre 4 notes différentes en mode Keyboard (par exemple les pads 1, 3, 5, 6).</li>
          <li>Change SCALE pour Phrygian, puis KEY pour A. Les notes jouées changent-elles ?</li>
          <li>Recommence avec SCALE MODE de l'autre valeur. Si les notes bougent, chaque note garde-t-elle son rang dans la gamme ?</li>
        </ol>
        <ObservationBox id="gamme:scalemode" titre="Gammes · SCALE MODE sur ma machine" placeholder="Valeur de SCALE MODE dans un motif vide, ce qui change avec Off / On…" />
      </div>
    </section>
  );
}

// ---------- 1. Les noms des notes ----------
function NotesNames() {
  const [hit, setHit] = useState<number | null>(null);
  return (
    <section className="g-section">
      <h3>Les noms des notes <Badge kind="pratique" /></h3>
      <ul className="facts">
        <li>En France on dit <b>Do Ré Mi Fa Sol La Si</b>. L'Electribe affiche les noms anglais : <b>C D E F G A B</b> (Do = C, Ré = D… Si = B).</li>
        <li>Entre deux touches voisines (blanche ou noire) il y a un <b>demi-ton</b>. Deux demi-tons font un <b>ton</b>.</li>
        <li><b># (dièse)</b> = un demi-ton plus haut. Les touches noires s'écrivent avec un dièse, comme sur l'écran de ta machine <Badge kind="obs" /> : <b>C# D# F# G# A#</b> (Do# Ré# Fa# Sol# La#). La liste des gammes du Guide écrit certaines touches noires autrement <SourceRef src={PG(15)} compact /> : l'app les écrit toujours en dièse, comme l'écran.</li>
        <li>Après B, on retrouve C, une <b>octave</b> plus haut : même note, plus aiguë. Le chiffre après la note est l'octave : <b>C4</b> est la note que pose un pad en mode Sequencer (note MIDI 60) <SourceRef src={OM(30)} compact />, NOTE va de C-1 à G9 <SourceRef src={PG(5)} compact />. Donc D2 = le Ré une octave sous D3, et D#2 juste au-dessus de D2.</li>
        <li>KEY s'écrit sans octave (C à B) : c'est la note de départ de la gamme, dans toutes les octaves <SourceRef src={PG(3)} compact />.</li>
      </ul>
      <Clavier octaves={1} oct0={4} on={new Set(NOTES12.map((_, i) => i))} labels={NOTES12.map((n, i) => ({ en: n.en, fr: n.fr, pc: i }))} root={-1}
        onKey={(pc) => { setHit(pc); play([{ midi: 60 + pc, dur: 0.5 }]); }} big />
      {hit !== null && <p className="small muted">Touche jouée : <b>{nomMidi(60 + hit).en}</b> ({nomMidi(60 + hit).fr})</p>}
    </section>
  );
}

// ---------- Clavier visuel ----------
const WHITE = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 }; // touche noire → index de la blanche à sa gauche

/** `oct0` : numéro d'octave de la première touche C (le clavier affiche alors « D3 », « D#3 »…). */
function Clavier({ octaves = 2, oct0, on, labels, root, onKey, big }: {
  octaves?: number; oct0?: number; on: Set<number>; labels: Note[] | { en: string; fr: string; pc: number }[]; root: number;
  onKey?: (pc: number, oct: number) => void; big?: boolean;
}) {
  const byPc = new Map<number, { en: string; fr: string }>();
  labels.forEach((l) => byPc.set(l.pc, l));
  const nW = 7 * octaves;
  return (
    <div className={`kbd ${big ? "kbd-big" : ""}`} role="group" aria-label="Clavier">
      {Array.from({ length: octaves }).flatMap((_, o) => WHITE.map((pc, wi) => {
        const lab = byPc.get(pc);
        return (
          <button key={`w${o}-${pc}`} type="button" className={`wk ${on.has(pc) ? "on" : ""} ${pc === root ? "root" : ""}`}
            style={{ left: `${((o * 7 + wi) / nW) * 100}%`, width: `${100 / nW}%` }}
            onClick={() => onKey?.(pc, o)} aria-label={(lab?.en ?? String(pc)) + (oct0 !== undefined ? oct0 + o : "")}>
            {on.has(pc) && lab && <span className="kl"><b>{lab.en}{oct0 !== undefined ? oct0 + o : ""}</b><small>{lab.fr}</small></span>}
          </button>
        );
      }))}
      {Array.from({ length: octaves }).flatMap((_, o) => Object.entries(BLACK_AFTER).map(([pcS, wi]) => {
        const pc = Number(pcS);
        const lab = byPc.get(pc);
        return (
          <button key={`b${o}-${pc}`} type="button" className={`bk ${on.has(pc) ? "on" : ""} ${pc === root ? "root" : ""}`}
            style={{ left: `${((o * 7 + wi + 1) / nW) * 100}%`, width: `${62 / nW}%` }}
            onClick={() => onKey?.(pc, o)} aria-label={(lab?.en ?? String(pc)) + (oct0 !== undefined ? oct0 + o : "")}>
            {on.has(pc) && lab && <span className="kl"><b>{lab.en}{oct0 !== undefined ? oct0 + o : ""}</b><small>{lab.fr}</small></span>}
          </button>
        );
      }))}
    </div>
  );
}

// ---------- Écarts ton / demi-ton ----------
const TON = (s: number) => (s === 1 ? "½" : s === 2 ? "1" : s === 3 ? "1½" : String(s / 2));

function Ecarts({ g, k }: { g: Gamme; k: Key }) {
  const ns = notesIn(g, k);
  const gaps = ecarts(g);
  return (
    <div className="ecarts" aria-label="Écarts entre les notes">
      <div className="ec-row">
        {ns.map((n, i) => (
          <div key={i} className="ec-seg" style={{ flexGrow: gaps[i] }}>
            <span className={`ec-note ${i === 0 ? "root" : ""}`}>{n.en}</span>
            <span className={`ec-gap g${Math.min(gaps[i], 4)}`}>{TON(gaps[i])}</span>
          </div>
        ))}
        <div className="ec-end"><span className="ec-note root">{ns[0].en}</span></div>
      </div>
      <div className="ec-ruler" aria-hidden>{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div>
      <p className="small muted">Chaque case grise = un demi-ton (une touche du clavier). Écart en tons : ½ = demi-ton, 1 = un ton, 1½ = un ton et demi.</p>
    </div>
  );
}

// ---------- Grille des 16 pads ----------
function Pads({ g, k }: { g: Gamme; k: Key }) {
  // Les 8 pads d'une rangée : la gamme dans l'ordre à partir de la KEY (octave 3, celle de l'écoute de l'app).
  const row = Array.from({ length: 8 }, (_, i) => { const midi = ROOT_MIDI(k) + degreeSemi(g, i); return { ...nomMidi(midi), pc: midi % 12 }; });
  return (
    <div className="gpads-wrap">
      <div className="gpads">
        {[0, 1].flatMap((r) => row.map((n, i) => (
          <div key={`${r}-${i}`} className={`gpad ${n.pc === row[0].pc ? "root" : ""}`}>
            <span className="gpad-num">{r * 8 + i + 1}</span>
            <b>{n.en}</b><small>{n.fr}</small>
          </div>
        )))}
      </div>
      <p className="small">
        <Badge kind="interp" /> Le mode d'emploi montre seulement l'exemple Do / Ionian : les deux rangées de pads jouent C D E F G A B C <SourceRef src={OM(28)} compact />.
        Pour les autres gammes, on suppose que les pads suivent la gamme dans l'ordre. Le manuel ne dit pas laquelle des deux rangées est la plus aiguë, ni à quelle octave le mode Keyboard démarre : les numéros d'octave (D3…) sont ceux de l'écoute de l'app, à vérifier sur l'écran.
      </p>
      <ObservationBox id={`gamme:pads:${g.n}`} titre={`Gammes · pads en ${g.nom}`} placeholder="Ce que jouent vraiment les pads sur ma machine (quelle rangée est plus aiguë ?)" />
    </div>
  );
}

// ---------- Motif d'exemple sur la grille du séquenceur (4 mesures) ----------
function Motif({ g, k }: { g: Gamme; k: Key }) {
  const [m, setM] = useState(MOTIFS[0].id);
  return (
    <div className="motif">
      <div className="motif-head">
        <select value={m} onChange={(e) => setM(e.target.value)} aria-label="Motif d'exemple">
          {MOTIFS.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
        </select>
      </div>
      <MotifPlayer key={m} m={m} g={g} k={k} />
      <p className="small">
        Pour l'écrire sur la machine : LENGTH = 4 <SourceRef src={PG(3)} compact />, puis pour chaque bouton Step, en mode Keyboard appuie sur Rec et joue les notes sur les pads <SourceRef src={OM(30)} compact />,
        ou règle NOTE pas par pas dans Step Edit <SourceRef src={PG(5)} compact />.
      </p>
    </div>
  );
}

function MotifPlayer({ m, g, k }: { m: string; g: Gamme; k: Key }) {
  const motif = MOTIFS.find((x) => x.id === m)!;
  const origine = useMemo<SeqData>(() => ({ mesures: motif.mesures, key: k.en, scale: g.n, bpm: BPM, knobs: {} }), [motif, k.en, g.n]);
  const edit = useSeqEdit(origine);
  useEffect(() => { edit.set({ key: k.en, scale: g.n }); }, [k.en, g.n]); // eslint-disable-line react-hooks/exhaustive-deps
  return <SeqPlayer id={`gamme:motif`} edit={edit} son={motif.son} octave={motif.octave} choixGamme={false} resetLabel="Remettre le motif d'origine" />;
}

function CmpPlayer({ m, a, b }: { m: string; a: number; b: number }) {
  const motif = MOTIFS.find((x) => x.id === m)!;
  // Mesure de base puis relance, d'abord dans A, puis dans B.
  const origine = useMemo<SeqData>(() => ({ mesures: [motif.mesures[0], motif.mesures[3], motif.mesures[0], motif.mesures[3]], key: "D", scale: a, bpm: BPM, knobs: {} }), [motif, a]);
  const edit = useSeqEdit(origine);
  useEffect(() => { edit.set({ scale: a }); }, [a]); // eslint-disable-line react-hooks/exhaustive-deps
  const gpm = useMemo(() => [a, a, b, b], [a, b]);
  return <SeqPlayer id="gamme:cmp" edit={edit} son={motif.son} octave={motif.octave} choixGamme={false} gammesParMesure={gpm} nomsMesures={["A", "A", "B", "B"]} resetLabel="Remettre le motif d'origine" />;
}

// ---------- Fiche d'une gamme ----------
function Fiche({ g, player }: { g: Gamme; player: ReturnType<typeof usePlayer> }) {
  const [ki, setKi] = useState(0);
  const k = KEYS[ki];
  const info = INFO[g.n];
  const { tous } = useStyles();
  const pour = rangerVisibles(stylesGamme(g.n, info?.styles ?? []), tous);
  const nsD = notesIn(g, KEYS[0]);
  const nsA = notesIn(g, KEYS[1]);
  const sid = `${g.n}:scale:${k.en}`;
  return (
    <section className="g-section fiche" id="fiche">
      <div className="fiche-top">
        <div>
          <p className="muted small">Gamme n° {g.n} · SCALE <SourceRef src={PG(15)} compact /></p>
          <h3 className="fiche-title">{g.nom} <Etoile type="gamme" cle={String(g.n)} titre={`${g.n} · ${g.nom}`} /></h3>
        </div>
        <div className="keysw" role="radiogroup" aria-label="Note de départ">
          {KEYS.map((kk, i) => (
            <button key={kk.en} type="button" role="radio" aria-checked={ki === i} className={ki === i ? "on" : ""} onClick={() => setKi(i)}>
              {kk.en} ({kk.fr})
            </button>
          ))}
        </div>
      </div>

      <div className="fiche-grid">
        <div>
          <p><Badge kind="pratique" /> <b>Ce que ça veut dire :</b> {info.sens}</p>
          <p><Badge kind="pratique" /> <b>Caractère :</b> {info.caractere}</p>
          {pour.length > 0 && <p className="small">Pour : {pour.map((s) => <a key={s} href={`#styles/${s}`} className={`chip st st-${s}`} title={FICHE[s].gammes.find((x) => x.n === g.n)?.pourquoi}>{STYLE_NOM[s]}</a>)}</p>}

          <h4>Les notes ({g.notesEnDo.length})</h4>
          <table className="gnotes">
            <tbody>
              <tr><th>KEY = C (Guide)</th>{g.notesEnDo.map((n, i) => <td key={i}>{enDiese(n)}</td>)}</tr>
              <tr><th>KEY = D (Ré)</th>{nsD.map((n, i) => <td key={i}><b>{n.en}</b> <small>{n.fr}</small></td>)}</tr>
              <tr><th>KEY = A (La)</th>{nsA.map((n, i) => <td key={i}><b>{n.en}</b> <small>{n.fr}</small></td>)}</tr>
            </tbody>
          </table>

          <BoutonLecture joue={player.playing === sid} onClick={() => player.run(sid, scaleEvents(g, k))} libelle={`Écouter la gamme en ${k.en}`} />
        </div>
        <div>
          <h4>Sur un clavier, KEY = {k.en}</h4>
          <Clavier oct0={3} on={new Set(notesIn(g, k).map((n) => n.pc))} labels={notesIn(g, k)} root={k.semi}
            onKey={(pc, o) => play([{ midi: 48 + pc + 12 * o, dur: 0.4 }])} />
          <h4>Les écarts entre les notes</h4>
          <Ecarts g={g} k={k} />
        </div>
      </div>

      <h4>Sur les 16 pads de l'E2, en mode Keyboard, KEY = {k.en}</h4>
      <Pads g={g} k={k} />

      <h4>Un motif d'exemple sur la grille</h4>
      <Motif g={g} k={k} />

      <h4>La régler sur la machine</h4>
      <ol className="steps">
        <li>Tiens <kbd>Shift</kbd> et appuie sur <kbd>Touch Scale</kbd> : la page SCALE s'ouvre. <SourceRef src={PG(10)} compact /></li>
        <li>Tourne la molette jusqu'à <b>{g.nom}</b> (n° {g.n} dans la liste). <SourceRef src={PG(15)} compact /></li>
        <li>Avec les boutons curseur <kbd>&lt;</kbd> <kbd>&gt;</kbd> du menu d'édition, va sur <b>KEY</b> et choisis <b>{k.en}</b> ({k.fr}). <SourceRef src={OM(27)} compact /> <SourceRef src={PG(3)} compact /></li>
        <li>Appuie sur <kbd>Keyboard</kbd> : les pads jouent la gamme. <kbd>Step 1</kbd> / <kbd>Step 4</kbd> descendent ou montent d'une octave. <SourceRef src={OM(28)} compact /></li>
        <li>Ou allume <kbd>Touch Scale</kbd> et frotte le pad tactile ; TOUCH SCALE RANGE règle sa tessiture (1 à 4 octaves). <SourceRef src={OM(29)} compact /> <SourceRef src={PG(7)} compact /></li>
        <li>KEY et SCALE sont gardés dans le motif : sauvegarde avec <kbd>Write</kbd>. <SourceRef src={PG(3)} compact /> <SourceRef src={OM(31)} compact /></li>
      </ol>
      <p className="small note">Astuce du Guide : pour qu'une partie déjà enregistrée suive un changement de KEY ou SCALE, mets SCALE MODE sur On avant d'enregistrer. <SourceRef src={PG(4)} compact /></p>

      <ObservationBox id={`gamme:${g.n}`} titre={`Gammes · ${g.nom}`} placeholder="Ce que j'en pense, dans quel morceau je l'utilise…" />
    </section>
  );
}

// ---------- Comparateur ----------
function Comparateur() {
  const [a, setA] = useState(7);
  const [b, setB] = useState(4);
  const [m, setM] = useState(MOTIFS[1].id);
  const k = KEYS[0];
  const ga = gammeByN.get(a)!;
  const gb = gammeByN.get(b)!;
  const sa = new Set(notesIn(ga, k).map((n) => n.pc));
  const sb = new Set(notesIn(gb, k).map((n) => n.pc));
  const name = (pc: number) => [...notesIn(ga, k), ...notesIn(gb, k)].find((n) => n.pc === pc)!;
  const order = Array.from({ length: 12 }, (_, i) => (k.semi + i) % 12);
  const snap = useEngine();
  const step = snap.owner === "gamme:cmp" ? snap.step : -1;
  const which = step < 0 ? null : step < 32 ? "a" : "b";

  return (
    <section className="g-section cmp">
      <h3>Comparer deux gammes, KEY = D</h3>
      <div className="cmp-pick">
        <label><span className="cmp-a">A</span><select value={a} onChange={(e) => setA(Number(e.target.value))}>{GAMMES.map((g) => <option key={g.n} value={g.n}>{label(g)}</option>)}</select></label>
        <label><span className="cmp-b">B</span><select value={b} onChange={(e) => setB(Number(e.target.value))}>{GAMMES.map((g) => <option key={g.n} value={g.n}>{label(g)}</option>)}</select></label>
      </div>
      <div className="cmp-ruler" role="img" aria-label="Notes des deux gammes">
        {order.map((pc) => {
          const inA = sa.has(pc), inB = sb.has(pc);
          const n = inA || inB ? name(pc) : null;
          return (
            <div key={pc} className={`cr ${inA && inB ? "both" : inA ? "onlya" : inB ? "onlyb" : ""}`}>
              <span className="cr-a">{inA ? "●" : ""}</span>
              <span className="cr-b">{inB ? "●" : ""}</span>
              <span className="cr-n">{n ? n.en : NOTES12[pc].en}</span>
            </div>
          );
        })}
      </div>
      <p className="small">
        <span className="lgd both" /> dans les deux · <span className="lgd onlya" /> seulement dans A · <span className="lgd onlyb" /> seulement dans B.
        {" "}{[...sa].filter((x) => !sb.has(x)).length + [...sb].filter((x) => !sa.has(x)).length === 0 ? "Les deux gammes ont les mêmes notes." :
          <>Notes qui changent : {[...sa].filter((x) => !sb.has(x)).map((pc) => name(pc).en).join(", ") || "aucune"} (A) → {[...sb].filter((x) => !sa.has(x)).map((pc) => name(pc).en).join(", ") || "aucune"} (B).</>}
      </p>
      <div className="motif-head">
        <select value={m} onChange={(e) => setM(e.target.value)} aria-label="Motif">{MOTIFS.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</select>
        <span className="small">Step 1-2 : gamme A · Step 3-4 : gamme B</span>
        {which && <span className={`now-${which}`}>En cours : {which === "a" ? ga.nom : gb.nom}</span>}
      </div>
      <CmpPlayer key={m} m={m} a={a} b={b} />
    </section>
  );
}
