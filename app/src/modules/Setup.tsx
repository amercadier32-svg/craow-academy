// Module « Mon setup » : deux E2 en maître / esclave, la TD-3 sur la synchro analogique,
// et l'enregistrement dans FL Studio par la Scarlett 4i4.
// Ce qui concerne l'E2 vient du manuel (avec la page). TD-3, Scarlett et FL Studio ne sont pas dans le manuel :
// ces étapes sont marquées « Pratique, hors manuel » et sont à vérifier dans leurs propres modes d'emploi.
import { lireObjet, ecrireJson } from "../lib/stockage";
import { Infos } from "../components/Rangement";
import { Deroulant, ToutOuvrirFermer } from "../components/Deroulant";
import { useState } from "react";
import { Badge, DoneToggle, ObservationBox, SourceRef } from "../components/common";
import type { Source } from "../lib/data";

const PG = (page: number): Source => ({ doc: "PG", page });
const OM = (page: number): Source => ({ doc: "OM", page });

type Lien = "midi" | "sync";
type Horloge = "maitre" | "esclave";
type AudioTd3 = "scarlett" | "esclave";
type Sortie = "stereo" | "mono";
interface Choix { lien: Lien; horloge: Horloge; td3: AudioTd3; outM: Sortie; outS: Sortie }

const CHOIX0: Choix = { lien: "midi", horloge: "maitre", td3: "scarlett", outM: "stereo", outS: "mono" };
const CLE = "e2academy.setup";
function charger(): Choix {
  return lireObjet(CLE, CHOIX0);
}

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; t: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="su-q">
      <span className="su-ql">{label}</span>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={value === o.v ? "on" : ""} onClick={() => onChange(o.v)}>{o.t}</button>
        ))}
      </div>
    </div>
  );
}

/** Schéma de câblage, redessiné selon les choix. */
function Schema({ c }: { c: Choix }) {
  const box = (x: number, y: number, w: number, t: string, s: string, cls = "") => (
    <g className={`su-box ${cls}`}>
      <rect x={x} y={y} width={w} height={46} rx={8} />
      <text x={x + w / 2} y={y + 20} textAnchor="middle" className="su-bt">{t}</text>
      <text x={x + w / 2} y={y + 36} textAnchor="middle" className="su-bs">{s}</text>
    </g>
  );
  const lbl = (x: number, y: number, t: string) => <text x={x} y={y} textAnchor="middle" className="su-lt">{t}</text>;
  return (
    <figure className="su-fig">
      <svg viewBox="0 0 400 256" role="img" aria-label="Schéma de câblage de ton setup">
        {/* Liaison maître → esclave */}
        {c.lien === "midi" ? (
          <><path d="M140 38 H260" className="su-w midi" />{lbl(200, 31, "MIDI OUT → MIDI IN")}</>
        ) : (
          <><path d="M140 38 H260" className="su-w sync" />{lbl(200, 31, "Sync Out → Sync In")}</>
        )}
        {/* Horloge TD-3 */}
        {c.horloge === "maitre"
          ? <><path d="M40 66 V200" className="su-w sync" /><text x="46" y="135" className="su-lt" textAnchor="start">Sync Out</text></>
          : <><path d="M360 66 V120 H40 V200" className="su-w sync" /><text x="300" y="114" className="su-lt" textAnchor="middle">Sync Out (esclave)</text></>}
        {/* Audio E2 → Scarlett */}
        <path d="M110 66 L175 200" className="su-w audio" />
        <path d="M300 66 L225 200" className="su-w audio" />
        <text x="122" y="175" className="su-lt" textAnchor="end">{c.outM === "stereo" ? "L + R" : "L (mono)"}</text>
        <text x="278" y="175" className="su-lt" textAnchor="start">{c.outS === "stereo" ? "L + R" : "L (mono)"}</text>
        {/* Audio TD-3 */}
        {c.td3 === "scarlett"
          ? <path d="M100 236 H140" className="su-w audio" />
          : <><path d="M90 200 L330 66" className="su-w audio dash" /><text x="215" y="150" className="su-lt" textAnchor="middle">→ Audio In</text></>}
        {/* Scarlett → PC */}
        <path d="M260 236 H290" className="su-w usb" />
        {box(20, 20, 120, "E2 maître", "CLOCK MODE Internal")}
        {box(260, 20, 120, "E2 esclave", c.lien === "midi" ? "Auto ou Ext. MIDI" : "Auto ou Ext. Sync")}
        {box(10, 200, 90, "TD-3", "suit la synchro", "hors")}
        {box(140, 200, 120, "Scarlett 4i4", "entrées ligne", "hors")}
        {box(290, 200, 100, "PC", "FL Studio", "hors")}
      </svg>
      <figcaption className="su-leg">
        <span><i className="su-k midi" /> MIDI</span>
        <span><i className="su-k sync" /> Synchro analogique (impulsions)</span>
        <span><i className="su-k audio" /> Audio</span>
        <span><i className="su-k usb" /> USB</span>
        <span className="muted">Cadres pointillés : appareils hors manuel de l'E2</span>
      </figcaption>
    </figure>
  );
}

function Entrees({ c }: { c: Choix }) {
  const lignes = [
    { nom: "E2 maître", n: c.outM === "stereo" ? 2 : 1 },
    { nom: "E2 esclave" + (c.td3 === "esclave" ? " (avec la TD-3 dedans)" : ""), n: c.outS === "stereo" ? 2 : 1 },
    ...(c.td3 === "scarlett" ? [{ nom: "TD-3", n: 1 }] : []),
  ];
  const total = lignes.reduce((s, l) => s + l.n, 0);
  return (
    <div className={`su-in ${total > 4 ? "trop" : ""}`}>
      <b>Entrées de la Scarlett utilisées : {total}</b> {lignes.map((l) => `${l.nom} ${l.n}`).join(" · ")}
      <p className="small">
        {total > 4
          ? "C'est plus que les 4 entrées de la Scarlett 4i4. Passe un E2 en mono (un seul câble sur Audio Out L) ou fais entrer la TD-3 dans l'E2 esclave."
          : "Ça tient sur les 4 entrées de la Scarlett 4i4."}{" "}
        <Badge kind="pratique" /> Le nombre d'entrées de la 4i4 est à vérifier sur ta carte.
      </p>
    </div>
  );
}

function Reglages({ c }: { c: Choix }) {
  const midi = c.lien === "midi";
  return (
    <div className="su-cards">
      <article className="su-card">
        <h4>E2 maître <Badge kind="manuel" /></h4>
        <ul className="facts">
          <li><kbd>Global</kbd> &gt; <kbd>CLOCK MODE</kbd> = <b>Internal</b> : l'E2 donne le tempo aux autres. <SourceRef src={PG(6)} compact /> <SourceRef src={OM(33)} compact /></li>
          <li>Le tempo se règle ici seulement (<kbd>BPM</kbd>, 165 à 170 pour toi). <SourceRef src={PG(3)} compact /></li>
          {midi
            ? <li>En Internal, l'E2 envoie l'horloge MIDI et les commandes Start / Stop par MIDI OUT. <SourceRef src={OM(76)} compact /></li>
            : <li>La prise <b>Sync Out</b> envoie une impulsion de 5 V pendant 15 ms à chaque pas. <SourceRef src={OM(25)} compact /></li>}
          {(c.horloge === "maitre" || !midi) && <li><kbd>SYNC UNIT</kbd> : 1 Step = une impulsion par pas, 2 Steps = une tous les deux pas. <kbd>SYNC POLARITY</kbd> : Hi ou Lo. <SourceRef src={PG(7)} compact /></li>}
          <li>Pense à <kbd>Write</kbd> pour garder les réglages Global (ils sont aussi gardés à l'extinction). <SourceRef src={PG(6)} compact /></li>
        </ul>
      </article>
      <article className="su-card">
        <h4>E2 esclave <Badge kind="manuel" /></h4>
        <ul className="facts">
          <li><kbd>CLOCK MODE</kbd> = <b>Auto</b> ou <b>{midi ? "External MIDI" : "External Sync"}</b>. <SourceRef src={PG(6)} compact /></li>
          <li>Avec Auto, l'E2 choisit l'horloge dans cet ordre : USB, puis MIDI, puis Sync. S'il est aussi branché en USB au PC et que le PC envoie une horloge, c'est le PC qui gagne. <SourceRef src={PG(6)} compact /></li>
          {midi
            ? <li>En External MIDI, l'E2 reçoit l'horloge mais ne l'envoie plus. <SourceRef src={OM(76)} compact /></li>
            : <li>En External Sync, l'horloge interne est coupée et les pas avancent à chaque impulsion reçue sur Sync In. Mets le même <kbd>SYNC UNIT</kbd> et la même <kbd>SYNC POLARITY</kbd> que le maître. <SourceRef src={OM(25)} compact /> <SourceRef src={PG(7)} compact /></li>}
          <li>Les effets réglés sur le tempo (comme Delay Time) suivent aussi l'horloge du maître. <SourceRef src={PG(6)} compact /></li>
          {c.td3 === "esclave" && <li><kbd>AUDIO IN THRU</kbd> = On : le son reçu sur Audio In ressort par Audio Out L/R. Règle le niveau avec <kbd>Input Level</kbd>. <SourceRef src={PG(7)} compact /> <SourceRef src={OM(22)} compact /></li>}
          {c.horloge === "esclave" && <li className="su-warn">Le manuel ne dit pas si Sync Out de l'esclave envoie des impulsions quand l'esclave suit une horloge MIDI. Le Guide dit seulement que SYNC UNIT règle Sync Out « par rapport au signal reçu à Sync In ». <Badge kind="interp" /> Teste-le, ou prends Sync Out du maître.</li>}
        </ul>
      </article>
      <article className="su-card hors">
        <h4>TD-3 <Badge kind="pratique" /> hors manuel</h4>
        <ul className="facts">
          <li>Câble jack 3,5 mm depuis <b>Sync Out</b> de l'E2 {c.horloge === "maitre" ? "maître" : "esclave"} vers l'entrée de synchro de la TD-3.</li>
          <li>Sur la TD-3, choisis la synchro externe par cette prise. La manip exacte est dans le mode d'emploi de la TD-3 : à vérifier.</li>
          <li>Si la TD-3 joue deux fois trop vite ou trop lentement, essaie l'autre valeur de <kbd>SYNC UNIT</kbd> sur l'E2 <SourceRef src={PG(7)} compact />. Si elle ne bouge pas du tout, essaie l'autre <kbd>SYNC POLARITY</kbd>.</li>
          <li>Audio : {c.td3 === "scarlett" ? "sortie de la TD-3 vers une entrée ligne de la Scarlett." : "sortie de la TD-3 vers Audio In de l'E2 esclave."}</li>
        </ul>
      </article>
      <article className="su-card hors">
        <h4>Scarlett 4i4 et FL Studio <Badge kind="pratique" /> hors manuel</h4>
        <ul className="facts">
          <li>Audio Out L/R de chaque E2 vers les entrées ligne de la Scarlett. Avec un seul câble sur <b>Audio Out L</b>, l'E2 sort en mono. <SourceRef src={OM(25)} compact /></li>
          <li>Dans FL Studio : Options &gt; Audio settings, choisis le pilote ASIO de la Focusrite. Dans le Mixer, mets une entrée de la Scarlett sur chaque piste (Insert) et arme l'enregistrement. À vérifier dans l'aide de FL Studio.</li>
          <li>Règle le gain sur la Scarlett pour que le voyant ne passe pas au rouge sur les passages forts.</li>
        </ul>
      </article>
    </div>
  );
}

function Enregistrer() {
  return (
    <section className="block" id="setup-rec">
      <h3>3. Enregistrer dans FL Studio</h3>
      <div className="su-routes">
        <div className="su-route">
          <h4>A. En direct par la Scarlett <Badge kind="pratique" /></h4>
          <ol className="facts">
            <li>Lance le motif sur l'E2 maître : l'esclave et la TD-3 suivent.</li>
            <li>FL Studio enregistre chaque entrée de la Scarlett sur sa piste.</li>
            <li>Tu peux tourner les potards pendant la prise : tout est gravé.</li>
          </ol>
          <p className="small muted">Le son ne passe pas par l'USB de l'E2 : le manuel ne décrit la prise USB que pour le MIDI (pilote USB-MIDI). <SourceRef src={OM(25)} compact /></p>
        </div>
        <div className="su-route">
          <h4>B. Export WAV par la carte SD <Badge kind="manuel" /></h4>
          <ol className="facts">
            <li><kbd>DATA UTILITY</kbd> &gt; <kbd>EXPORT AUDIO</kbd> (un motif) ou <kbd>EXPORT P.SET AUDIO</kbd> (une série de motifs). <SourceRef src={OM(33)} compact /></li>
            <li>Choisis le format : <b>WAV File Only</b>, ou <b>Ableton Live Set</b> (WAV + un projet .als). <SourceRef src={PG(8)} compact /></li>
            <li>Les fichiers vont dans KORG/electribe/[numéro]_[nom] Project/Audio sur la carte. <SourceRef src={PG(8)} compact /></li>
            <li>Glisse les WAV dans FL Studio. <Badge kind="pratique" /></li>
          </ol>
          <p className="small muted">Le manuel ne dit pas si l'export fait un WAV par partie ou un seul mélange : regarde le dossier Audio après un export. Il ne prend que l'E2, pas la TD-3.</p>
        </div>
        <div className="su-route">
          <h4>C. Option : FL Studio comme maître <Badge kind="manuel" /></h4>
          <ul className="facts">
            <li>E2 branché en USB au PC, <kbd>CLOCK MODE</kbd> = <b>External USB</b> (ou Auto) : l'E2 suit l'horloge MIDI du PC. <SourceRef src={PG(6)} compact /></li>
            <li>Avec le pilote USB-MIDI de Windows, une seule application à la fois peut parler à l'E2. Pour plusieurs, installe le pilote KORG USB-MIDI. <SourceRef src={OM(25)} compact /></li>
            <li>Réglage de l'envoi d'horloge dans FL Studio : hors manuel, à vérifier. <Badge kind="pratique" /></li>
          </ul>
        </div>
      </div>
    </section>
  );
}

const TESTS = [
  { id: "setup:test:tempo", t: "Le maître est à 168 BPM et l'esclave affiche le même tempo (ou suit sans dériver)." },
  { id: "setup:test:start", t: "Play sur le maître : l'esclave démarre au même moment." },
  { id: "setup:test:td3", t: "La TD-3 joue à la bonne vitesse (ni double ni moitié)." },
  { id: "setup:test:long", t: "Après 5 minutes de boucle, les trois machines tombent encore ensemble." },
  { id: "setup:test:laststep", t: "Tous les motifs ont Last Step = 16 (sinon la partie irrégulière n'est pas synchronisée)." },
  { id: "setup:test:niveaux", t: "Dans FL Studio, chaque entrée arrive sur sa piste sans saturer." },
];

export default function Setup() {
  const [c, setC] = useState<Choix>(charger);
  const upd = (p: Partial<Choix>) => setC((x) => { const n = { ...x, ...p }; ecrireJson(CLE, n); return n; });
  return (
    <div className="setup">
      <h2 className="page-title">Mon setup : 2 E2, TD-3 et FL Studio</h2>
      <Infos>
        <p>Synchroniser tes deux E2 et ta TD-3, puis enregistrer dans FL Studio par la Scarlett 4i4. <Badge kind="manuel" /> = écrit dans le manuel de l'E2. <Badge kind="pratique" /> = TD-3, Scarlett et FL Studio, hors manuel : à vérifier dans leurs modes d'emploi. Si tu ajoutes ces modes d'emploi dans le dossier docs/, l'app pourra les citer.</p>
      </Infos>

      <ToutOuvrirFermer ids={["setup.1", "setup.2", "setup.3", "setup.4"]} />
      <Deroulant id="setup.1" defaut petit icone="prise" couleur="#3fd6d0" titre="1. Ton câblage" texte="Qui est maître, quels câbles, où va le son.">
      <section className="block" id="setup-cablage">
        <h3>1. Ton câblage</h3>
        <div className="su-choix">
          <Seg label="E2 maître → E2 esclave par" value={c.lien} onChange={(v) => upd({ lien: v })}
            options={[{ v: "midi", t: "câble MIDI" }, { v: "sync", t: "câble Sync" }]} />
          <Seg label="Horloge de la TD-3 depuis" value={c.horloge} onChange={(v) => upd({ horloge: v })}
            options={[{ v: "maitre", t: "Sync Out du maître" }, { v: "esclave", t: "Sync Out de l'esclave" }]} />
          <Seg label="Son de la TD-3 vers" value={c.td3} onChange={(v) => upd({ td3: v })}
            options={[{ v: "scarlett", t: "la Scarlett" }, { v: "esclave", t: "Audio In de l'E2 esclave" }]} />
          <Seg label="Sortie E2 maître" value={c.outM} onChange={(v) => upd({ outM: v })}
            options={[{ v: "stereo", t: "stéréo (L + R)" }, { v: "mono", t: "mono (L seul)" }]} />
          <Seg label="Sortie E2 esclave" value={c.outS} onChange={(v) => upd({ outS: v })}
            options={[{ v: "stereo", t: "stéréo (L + R)" }, { v: "mono", t: "mono (L seul)" }]} />
        </div>
        {c.lien === "sync" && c.horloge === "esclave" && (
          <p className="su-warn">Avec la synchro analogique partout, la TD-3 est au bout d'une chaîne : maître → esclave → TD-3. Ça peut marcher, mais Sync Out du maître est plus simple : un câble en Y ou un répartiteur n'est pas décrit par le manuel. <Badge kind="interp" /></p>
        )}
        {c.lien === "sync" && c.horloge === "maitre" && (
          <p className="su-warn">L'E2 n'a qu'une prise Sync Out <SourceRef src={OM(25)} compact /> : avec le maître relié en Sync à l'esclave ET à la TD-3, il te faut un répartiteur, ou bien relie la TD-3 au Sync Out de l'esclave. Le plus simple : maître → esclave en MIDI, maître → TD-3 en Sync. <Badge kind="pratique" /></p>
        )}
        <Schema c={c} />
        <Entrees c={c} />
        <p className="small muted">Éteins tous les appareils avant de brancher les câbles. <SourceRef src={OM(25)} compact /> Les prises MIDI de l'E2 se branchent avec les câbles de conversion MIDI fournis. <SourceRef src={OM(25)} compact /></p>
      </section>
      </Deroulant>

      <Deroulant id="setup.2" petit icone="potard" couleur="#ffd84d" titre="2. Les réglages appareil par appareil" texte="Global de chaque E2, TD-3, Scarlett et FL Studio.">
      <section className="block" id="setup-reglages">
        <h3>2. Les réglages appareil par appareil</h3>
        <Reglages c={c} />
        <p className="ks-unknown"><b>Le manuel ne dit pas :</b> si l'E2 esclave démarre tout seul quand il reçoit des impulsions sur Sync In (sans Start), ni si SWING et GROOVE de l'esclave restent actifs quand il suit une horloge externe. À vérifier pendant le test ci-dessous.</p>
        <p className="small muted">Attention : <kbd>LAST STEP</kbd> est propre à l'electribe. Si un motif a un nombre de pas irrégulier, cette partie n'est pas synchronisée avec un séquenceur externe ou une autre electribe. <SourceRef src={PG(4)} compact /></p>
      </section>
      </Deroulant>

      <Deroulant id="setup.3" petit icone="lecture" couleur="#e8484e" titre="3. Enregistrer dans FL Studio" texte="En direct par la Scarlett, ou piste par piste.">
        <Enregistrer />
      </Deroulant>

      <Deroulant id="setup.4" petit icone="setup" couleur="#4fd18b" titre="4. Test de synchro" texte="La liste à cocher et tes notes." badge={TESTS.length}>
      <section className="block" id="setup-test">
        <h3>4. Test de synchro <Badge kind="pratique" /></h3>
        <ul className="su-tests">
          {TESTS.map((t) => <li key={t.id}><DoneToggle id={t.id} /> <span>{t.t}</span></li>)}
        </ul>
        <ObservationBox id="setup:cablage" titre="Mon câblage qui marche" placeholder="Ex. : maître → esclave en MIDI, Sync Out maître → TD-3, SYNC UNIT 1 Step, POLARITY Hi…" />
        <ObservationBox id="setup:start" titre="Démarrage et dérive" placeholder="L'esclave démarre-t-il seul ? Ça dérive au bout de combien de temps ?" />
        <ObservationBox id="setup:td3" titre="Réglages de la TD-3" placeholder="La manip pour la mettre en synchro externe, le bon SYNC UNIT…" />
      </section>
      </Deroulant>
    </div>
  );
}
