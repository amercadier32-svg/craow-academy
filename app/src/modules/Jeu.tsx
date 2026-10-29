// Module « Swing, Groove, Chord et Gate Arp » : les fonctions de jeu du manuel qui n'étaient pas encore couvertes.
// Chaque fait vient du manuel avec sa page ; ce que le manuel ne dit pas devient un exercice d'écoute.
import { Infos, Rangement } from "../components/Rangement";
import { useState } from "react";
import { Badge, DoneToggle, ObservationBox, SourceRef } from "../components/common";
import { SeqPlayer, useSeqEdit, type SeqData } from "../components/SeqPlayer";
import { useStore } from "../lib/store";
import type { Pas } from "../lib/seq";
import type { Source } from "../lib/data";
import sequencerJson from "@data/electribe2/sequencer.json";

const PG = (page: number): Source => ({ doc: "PG", page });
const OM = (page: number): Source => ({ doc: "OM", page });

const GROOVES = ((sequencerJson as unknown as { fonctions: { id: string; types?: { n: number; nom: string }[] }[] })
  .fonctions.find((f) => f.id === "groove")?.types ?? []);

const pad2 = (n: number) => String(n).padStart(2, "0");

// Charleston fermé sur les 16 pas : on entend tout de suite les pas pairs bouger avec SWING.
const HATS: SeqData = { mesures: [0, 1, 2, 3].map(() => Array.from({ length: 16 }, () => 0 as Pas)), key: "D", scale: 7, bpm: 168, knobs: {} };

function Swing() {
  const edit = useSeqEdit(HATS, "e2academy.jeu.swing");
  const [swing, setSwing] = useState(0);
  return (
    <section className="block" id="jeu-swing">
      <h3>1. SWING : décaler les pas pairs</h3>
      <ul className="facts">
        <li><kbd>SWING</kbd> va de <b>-50 %</b> à <b>+50 %</b>. Il décale le départ des notes des <b>pas pairs</b> (2, 4, 6…) par rapport au temps exact. <SourceRef src={PG(3)} /></li>
        <li><b>+33 %</b> donne en général un shuffle presque parfait. <SourceRef src={PG(3)} compact /></li>
        <li>Si Last Step est un nombre impair, ou avec un MFX qui pilote le séquenceur (Seq Reverse, Seq Doubler, Odd Stepper, Even Stepper), ce sont parfois les pas <b>impairs</b> qui bougent. <SourceRef src={PG(3)} compact /></li>
        <li>SWING est un réglage de <b>motif</b> : il est gardé avec chaque motif et touche toutes les parties. <SourceRef src={PG(3)} compact /> <SourceRef src={OM(32)} compact /></li>
        <li>Raccourci : <kbd>Shift</kbd> + pad <b>1</b> ouvre la page SWING. <SourceRef src={PG(10)} compact /></li>
      </ul>
      <div className="jx-swing">
        <label className="jx-slider">
          <span>SWING de l'aperçu : <b>{swing > 0 ? "+" : ""}{swing} %</b></span>
          <input type="range" min={-50} max={50} step={1} value={swing} onChange={(e) => setSwing(Number(e.target.value))} aria-label="SWING en pourcentage" />
        </label>
        <div className="jx-presets">
          {[-25, 0, 25, 33, 50].map((v) => (
            <button key={v} type="button" className={`chip-t ${swing === v ? "on" : ""}`} onClick={() => setSwing(v)}>{v > 0 ? "+" : ""}{v} %</button>
          ))}
        </div>
      </div>
      <SeqPlayer id="jeu:swing" edit={edit} son="hat" octave={0} choixGamme={false} kickRepere swing={swing} resetLabel="Remettre les 16 pas">
        <p className="small muted">L'aperçu décale chaque pas pair de SWING % d'un pas. <Badge kind="interp" /> Le manuel ne donne pas la formule exacte : compare avec ta machine.</p>
      </SeqPlayer>
      <div className="jx-ex">
        <h4>Exercice d'écoute <Badge kind="pratique" /></h4>
        <ol className="facts">
          <li>Sur l'E2 : un motif avec un charley fermé sur les 16 pas, <kbd>BPM</kbd> = 168.</li>
          <li><kbd>Shift</kbd> + pad 1, puis tourne la molette : 0, +25, +33, +50, puis -25.</li>
          <li>Note la valeur où ça commence à « rouler » pour la tribe, et celle où ça devient trop bancal.</li>
        </ol>
        <ObservationBox id="jeu:swing" titre="Mes valeurs de SWING" placeholder="Ex. : à 168 BPM, +20 % roule bien, au-delà de +40 % c'est bancal…" />
        <DoneToggle id="jeu:swing" />
      </div>
    </section>
  );
}

function Groove() {
  const [n, setN] = useState(1);
  const { observations } = useStore();
  const g = GROOVES.find((x) => x.n === n);
  return (
    <section className="block" id="jeu-groove">
      <h3>2. GROOVE : humaniser une partie</h3>
      <ul className="facts">
        <li><kbd>GROOVE TYPE</kbd> va de <b>01 Conga1</b> à <b>25 Decrescendo</b>. Il modifie les données de séquence trop précises pour reproduire le jeu d'un instrument ou l'humeur d'un morceau. <SourceRef src={PG(4)} /></li>
        <li><kbd>GROOVE DEPTH</kbd> va de <b>0</b> à <b>127</b> : c'est l'intensité du groove. <SourceRef src={PG(4)} compact /></li>
        <li>GROOVE est un réglage de <b>partie</b> : chaque partie a le sien. Tu peux donc groover les congas et laisser le kick droit. <SourceRef src={PG(4)} compact /> <SourceRef src={OM(32)} compact /></li>
        <li>La liste des 25 types est à la page 16 du Guide. <SourceRef src={PG(16)} compact /></li>
        <li>Raccourci : <kbd>Shift</kbd> + pad <b>8</b> ouvre GROOVE TYPE. Le tableau du Guide indique aussi GROOVE TYPE pour le pad <b>9</b> : regarde sur ton écran si le pad 9 ouvre plutôt GROOVE DEPTH. <SourceRef src={PG(10)} compact /></li>
      </ul>
      <p className="ks-unknown"><b>Le manuel ne dit pas</b> ce que fait chaque type : il donne seulement leurs noms. Les noms font penser à un instrument (Conga, Bongo, Claves…) ou à une façon de placer les notes (Laidback, Rushbeat, Crescendo…), mais c'est une supposition <Badge kind="interp" />. L'app ne fait donc pas d'aperçu sonore du groove : écoute-le sur ta machine et note ce que tu entends.</p>

      <div className="jx-grooves" role="radiogroup" aria-label="Types de groove">
        {GROOVES.map((x) => (
          <button key={x.n} type="button" role="radio" aria-checked={x.n === n}
            className={`jx-gr ${x.n === n ? "on" : ""} ${observations[`jeu:groove:${x.n}`]?.texte ? "noted" : ""}`} onClick={() => setN(x.n)}>
            <b>{pad2(x.n)}</b> {x.nom}
          </button>
        ))}
      </div>
      {g && (
        <div className="jx-ex">
          <h4>Écouter {pad2(g.n)} {g.nom} <Badge kind="pratique" /></h4>
          <ol className="facts">
            <li>Choisis une partie de percussion avec des notes sur beaucoup de pas (congas, charley). Exemple : la recette <a href="#recettes/congas-dialogue">Congas qui se répondent</a>.</li>
            <li><kbd>GROOVE TYPE</kbd> = {pad2(g.n)} {g.nom}, puis <kbd>GROOVE DEPTH</kbd> = 0, 64, puis 127.</li>
            <li>Note ce qui bouge : le placement, le volume, un seul pas ou tous ?</li>
          </ol>
          <ObservationBox id={`jeu:groove:${g.n}`} titre={`Groove ${pad2(g.n)} ${g.nom}`} placeholder="Ce que j'entends à DEPTH 64 et 127, sur quelle partie…" />
          <p className="small muted">Les types déjà notés ont un liseré : tu fais ta propre carte des 25 grooves.</p>
        </div>
      )}
      <div className="jx-tips">
        <h4>Idées pour la tribe et la tekno <Badge kind="pratique" /></h4>
        <ul className="facts">
          <li>Garde le kick sans groove (GROOVE DEPTH = 0) : c'est lui qui tient la salle. Groove plutôt les congas, bongos et charleys.</li>
          <li>Essaie deux types différents sur deux parties de percussion pour qu'elles ne tombent pas exactement ensemble.</li>
          <li>Recettes à tester : <a href="#recettes/congas-dialogue">Congas qui se répondent</a>, <a href="#recettes/bongos-tribe">Bongos qui roulent</a>, <a href="#recettes/hat-humain">Charleston vivant</a>.</li>
        </ul>
      </div>
    </section>
  );
}

function Chord() {
  return (
    <section className="block" id="jeu-chord">
      <h3>3. Mode Chord : des accords sur les pads</h3>
      <div className="ks-flow">
        <div className="ks-box"><b>1. VOICE ASSIGN</b><span>Sur la partie : <kbd>Poly1</kbd> ou <kbd>Poly2</kbd>.</span> <SourceRef src={OM(28)} compact /></div>
        <i className="ks-arrow" aria-hidden>→</i>
        <div className="ks-box"><b>2. Bouton Chord</b>Il s'allume : les pads jouent des accords. <SourceRef src={OM(28)} compact /></div>
        <i className="ks-arrow" aria-hidden>→</i>
        <div className="ks-box"><b>3. CHORD SET</b>De 1 à 5 : la richesse de l'accord. <SourceRef src={PG(3)} compact /></div>
        <i className="ks-arrow" aria-hidden>→</i>
        <div className="ks-box end"><b>4. Jouer</b>Les accords suivent KEY et SCALE du motif. <SourceRef src={OM(24)} compact /></div>
      </div>
      <ul className="facts">
        <li><kbd>Poly1</kbd> et <kbd>Poly2</kbd> jouent jusqu'à <b>4 voix</b> qui partagent la même enveloppe, le même filtre, le même ampli et le même effet d'insertion. <SourceRef src={PG(4)} /></li>
        <li>Différence : avec Poly1, l'enveloppe ne repart pas tant que tu n'as pas lâché tous les pads ; avec Poly2, elle repart à chaque pad. <SourceRef src={PG(4)} compact /></li>
        <li><kbd>CHORD SET</kbd> [1…5] : « la plage dépend de la gamme sélectionnée ». C'est un réglage de motif. <SourceRef src={PG(3)} compact /></li>
        <li>Raccourci : <kbd>Shift</kbd> + <kbd>Chord</kbd> ouvre la page Chord Set. <SourceRef src={PG(10)} compact /></li>
        <li>En mode Mono1 ou Mono2, la partie ne joue qu'une note à la fois. <SourceRef src={PG(4)} compact /></li>
      </ul>
      <p className="ks-unknown"><b>Le manuel ne dit pas</b> quelles notes forment l'accord de chaque pad, ni ce qui change exactement entre CHORD SET 1 et 5 (nombre de notes ? type d'accord ?). À découvrir à l'oreille ci-dessous.</p>
      <div className="jx-ex">
        <h4>Exercice : compter les notes <Badge kind="pratique" /></h4>
        <ol className="facts">
          <li>Une partie avec un son long (pad ou stab), <kbd>VOICE ASSIGN</kbd> = Poly2, <kbd>KEY</kbd> = D, <kbd>SCALE</kbd> = Aeolian.</li>
          <li>Bouton <kbd>Chord</kbd>, puis joue le pad 1 avec <kbd>CHORD SET</kbd> = 1, 2, 3, 4, 5.</li>
          <li>Note pour chaque valeur : combien de notes tu entends, et si ça sonne sombre ou ouvert.</li>
          <li>Refais-le avec <kbd>SCALE</kbd> = Phrygian (plus sombre) : est-ce que l'accord change ?</li>
        </ol>
        <ObservationBox id="jeu:chord" titre="Mes CHORD SET" placeholder="CHORD SET 1 : … notes ; 3 : … ; 5 : … En Phrygian : …" />
        <DoneToggle id="jeu:chord" />
      </div>
      <div className="jx-tips">
        <h4>Pour la tribe et la tekno <Badge kind="pratique" /></h4>
        <ul className="facts">
          <li>Un stab d'accord court à contretemps, avec Poly2 pour que chaque coup reparte : <a href="#recettes/stab-orchestre-tribe">Stab d'orchestre tribal</a>, <a href="#recettes/stab-rave-tekno">Stab rave qui pompe</a>, <a href="#recettes/stab-dub-tekno">Stab dub en écho</a>.</li>
          <li>Les 4 voix partagent le filtre : un coup de Cutoff ouvre tout l'accord d'un coup.</li>
        </ul>
      </div>
    </section>
  );
}

function GateArpSchema() {
  return (
    <svg className="jx-xy" viewBox="0 0 220 170" role="img" aria-label="Pad tactile : axe X = vitesse du Gate, axe Y = longueur du son">
      <rect x="40" y="10" width="170" height="120" rx="10" className="jx-xy-pad" />
      <line x1="40" y1="140" x2="210" y2="140" className="jx-xy-ax" markerEnd="url(#jxa)" />
      <line x1="30" y1="130" x2="30" y2="12" className="jx-xy-ax" markerEnd="url(#jxa)" />
      <defs><marker id="jxa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" className="jx-xy-head" /></marker></defs>
      <text x="125" y="160" textAnchor="middle" className="jx-xy-t">X : vitesse du Gate</text>
      <text x="16" y="70" textAnchor="middle" transform="rotate(-90 16 70)" className="jx-xy-t">Y : longueur</text>
      <circle cx="150" cy="50" r="9" className="jx-xy-dot" />
      <text x="125" y="75" textAnchor="middle" className="jx-xy-s">pad tactile</text>
    </svg>
  );
}

function GateArp() {
  return (
    <section className="block" id="jeu-gatearp">
      <h3>4. Gate Arp : des roulements au tempo</h3>
      <div className="jx-two">
        <div>
          <ol className="facts">
            <li>Appuie sur <kbd>Gate Arp</kbd> : il s'allume. <SourceRef src={OM(29)} compact /></li>
            <li>Appuie sur <kbd>Trigger</kbd> et <b>garde le doigt</b> sur le pad de la partie à jouer. <SourceRef src={OM(29)} compact /></li>
            <li>Joue sur le <b>pad tactile</b> : X change la vitesse du Gate, Y la longueur du son. <SourceRef src={OM(29)} compact /></li>
            <li>Pour choisir la <b>hauteur</b> : mets plutôt <kbd>Keyboard</kbd> ou <kbd>Chord</kbd>, la note ou l'accord vient du pad que tu tiens. <SourceRef src={OM(29)} compact /></li>
          </ol>
          <ul className="facts">
            <li>Le son de la partie est rejoué automatiquement <b>au tempo</b> du motif. <SourceRef src={OM(29)} /></li>
            <li><kbd>GATE ARP</kbd> [1…50] choisit le motif du Gate Arpeggiator. C'est un réglage de motif. <SourceRef src={PG(3)} compact /></li>
            <li>Raccourcis : <kbd>Shift</kbd> + <kbd>Gate Arp</kbd>, ou <kbd>Shift</kbd> + pad <b>6</b>, ouvrent la page GATE ARP. <SourceRef src={PG(10)} compact /></li>
          </ul>
        </div>
        <GateArpSchema />
      </div>
      <p className="ks-unknown"><b>Le manuel ne dit pas</b> à quoi ressemblent les 50 motifs GATE ARP, ni si le Gate Arp peut être enregistré dans la séquence avec le bouton Rec. Teste-le et note-le ci-dessous.</p>
      <div className="jx-ex">
        <h4>Exercice : ta carte des motifs <Badge kind="pratique" /></h4>
        <ol className="facts">
          <li>Partie de charley ou de conga, <kbd>BPM</kbd> = 168, séquence en lecture.</li>
          <li>Gate Arp allumé, tiens le pad, doigt au milieu du pad tactile. Change <kbd>GATE ARP</kbd> : 1, 10, 20, 30, 40, 50.</li>
          <li>Note les motifs qui marchent pour un roulement de fin de phrase (sur la mesure 4).</li>
          <li>Test d'enregistrement : appuie sur Rec pendant un roulement, puis relis la séquence. Est-ce qu'il est resté ?</li>
        </ol>
        <ObservationBox id="jeu:gatearp" titre="Mes motifs GATE ARP" placeholder="1 : … ; 10 : … ; mes préférés pour les roulements : … Rec : enregistré ou non ?" />
        <DoneToggle id="jeu:gatearp" />
      </div>
      <div className="jx-tips">
        <h4>Pour la tribe <Badge kind="pratique" /></h4>
        <ul className="facts">
          <li>Un roulement de conga ou de charley avec Gate Arp juste avant une relance, en montant le doigt sur Y pour allonger les notes.</li>
          <li>Avec <kbd>Chord</kbd> sur un stab : l'accord est rejoué en rythme, comme un stab haché.</li>
        </ul>
      </div>
    </section>
  );
}

function Alternate() {
  return (
    <section className="block" id="jeu-alternate">
      <h3>5. ALTERNATE : charley ouvert ou fermé, jamais les deux</h3>
      <ul className="facts">
        <li><kbd>ALTERNATE 13-14</kbd> [Off, On] : quand c'est sur On, les parties 13 et 14 ne sonnent jamais en même temps. Exemple du manuel : charley fermé en partie 13, charley ouvert en partie 14. <SourceRef src={PG(3)} /></li>
        <li><kbd>ALTERNATE 15-16</kbd> fait la même chose pour les parties 15 et 16. C'est un réglage de motif. <SourceRef src={PG(3)} compact /></li>
      </ul>
      <div className="jx-ex">
        <h4>Exercice <Badge kind="pratique" /></h4>
        <ol className="facts">
          <li>Copie un charley fermé en partie 13 et un charley ouvert en partie 14 (recettes <a href="#recettes/hat-16-tekno">Charleston en doubles-croches</a> et <a href="#recettes/openhat-tribe">Charleston ouvert qui respire</a>).</li>
          <li>Écoute avec <kbd>ALTERNATE 13-14</kbd> = Off, puis On : le charley ouvert doit être coupé par le fermé.</li>
        </ol>
        <DoneToggle id="jeu:alternate" />
      </div>
    </section>
  );
}

const SECTIONS_JEU = [
  { id: "swing", nom: "Swing", texte: "Décaler les pas pairs", icone: "groove", couleur: "#ff6a3d" },
  { id: "groove", nom: "Groove", texte: "25 GROOVE TYPE", icone: "grille", couleur: "#ffd84d" },
  { id: "chord", nom: "Chord", texte: "Jouer des accords", icone: "gammes", couleur: "#9b6bff" },
  { id: "gatearp", nom: "Gate Arp", texte: "Pad tactile en rythme", icone: "tactile", couleur: "#3fd6d0" },
  { id: "alternate", nom: "Alternate", texte: "13-14 / 15-16", icone: "lecture", couleur: "#4fd18b" },
];

export default function Jeu() {
  const [sec, setSec] = useState<string | null>("swing");
  return (
    <div className="jeu">
      <h2 className="page-title">Swing, Groove, Chord et Gate Arp</h2>
      <Infos>
        <p>Les fonctions qui donnent du mouvement à ton jeu. <Badge kind="manuel" /> = écrit dans le manuel, avec la page. <Badge kind="interp" /> = supposition à vérifier. <Badge kind="pratique" /> = exercice ou idée de l'app.</p>
      </Infos>
      <Rangement racine="Groove" labelCategorie="Fonction"
        categories={SECTIONS_JEU.map((x) => ({ ...x, n: "" }))} cat={sec} onCat={setSec} />
      {!sec && <p className="rg-hint">Choisis une fonction.</p>}
      {sec === "swing" && <Swing />}
      {sec === "groove" && <Groove />}
      {sec === "chord" && <Chord />}
      {sec === "gatearp" && <GateArp />}
      {sec === "alternate" && <Alternate />}
    </div>
  );
}
