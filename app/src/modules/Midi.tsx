// Module MIDI : brancher l'E2 au navigateur (Web MIDI), voir ce qu'elle envoie, s'entraîner aux gammes
// en jouant sur les pads, et lui faire jouer une recette avec son vrai son.
import { ChoixMode } from "../components/Lecteur";
import { Infos } from "../components/Rangement";
import { Deroulant, ToutOuvrirFermer } from "../components/Deroulant";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, DoneToggle, ObservationBox, SourceRef } from "../components/common";
import { procedureById } from "../lib/data";
import { ALL_KEYS, GAMMES, gammeByN, keyByEn, nomMidi, notesIn, nomPc } from "../lib/music";
import { midiOf, SONS_PERCU } from "../lib/seq";
import { RECETTES } from "../content/recettes";
import { useStyles } from "../content/styles";
import {
  arreterSequence, CC_E2, choisirCanal, choisirEntree, choisirSortie, connecter, envoyer, envoyerSequence,
  SRC_CANAL, SRC_FILTRES, SRC_PAD_C4, SRC_PRISES, SRC_TABLEAU, surNote, toutCouper, useMidi, usePasEnvoye,
  viderJournal, webMidiDisponible, type Evenement, type PasMidi,
} from "../lib/midi";

const heure = (t: number) => {
  const d = new Date(performance.timeOrigin + t);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

function Connexion() {
  const m = useMidi();
  const dispo = webMidiDisponible();
  const enLocal = location.protocol === "file:";
  return (
    <div className="block">
      <h3>1. Brancher l'E2</h3>
      <ol className="facts">
        <li>Relie le port <b>USB</b> de l'E2 à ton PC <SourceRef src={SRC_PRISES} compact />. Windows installe tout seul son pilote USB-MIDI.</li>
        <li>Sur l'E2 : <kbd>Global</kbd> &gt; <kbd>MIDI GLOBAL CH.</kbd>, note le canal (01 à 16) <SourceRef src={SRC_CANAL} compact />. Choisis le même ci-dessous.</li>
        <li>Mets <kbd>MIDI RECEIVE FILTER = Off</kbd> et <kbd>MIDI SEND FILTER = Off</kbd> : avec Short, les notes et les potards ne passent pas <SourceRef src={SRC_FILTRES} compact />.</li>
        <li>Ouvre l'app dans <b>Chrome</b> ou <b>Edge</b>, puis clique sur « Connecter ». Le navigateur te demande l'autorisation.</li>
      </ol>
      <p className="small muted">Attention : avec le pilote standard de Windows, une seule application à la fois peut utiliser l'E2 <SourceRef src={SRC_PRISES} compact />. Ferme ton logiciel de musique avant, ou installe le pilote KORG USB-MIDI.</p>

      {!dispo ? (
        <p className="midi-alerte">Ce navigateur ne sait pas parler MIDI. Ouvre <code>E2-Academy.html</code> avec Chrome ou Edge sur ton PC (Safari et l'iPhone ne le permettent pas).</p>
      ) : (
        <div className="midi-connexion">
          <button type="button" className="e2-ui-btn big" onClick={() => void connecter()} disabled={m.etat === "attente"}>
            {m.etat === "ok" ? "↻ Rechercher les ports" : m.etat === "attente" ? "Autorisation…" : "Connecter l'E2"}
          </button>
          <span className={`midi-etat midi-etat-${m.etat}`}>
            {m.etat === "inactif" && "Pas encore connecté"}
            {m.etat === "attente" && "Réponds à la demande du navigateur"}
            {m.etat === "ok" && (m.entrees.length || m.sorties.length ? "MIDI prêt" : "MIDI prêt, mais aucun appareil trouvé : branche l'E2 et allume-la")}
            {m.etat === "refuse" && "Accès MIDI refusé"}
            {m.etat === "erreur" && `Erreur : ${m.erreur}`}
            {m.etat === "non-supporte" && "MIDI non disponible"}
          </span>
        </div>
      )}
      {m.etat === "refuse" && (
        <p className="midi-alerte">
          Le navigateur a refusé l'accès. Clique sur l'icône à gauche de l'adresse, autorise « Appareils MIDI », puis recharge la page.
          {enLocal && " Si Chrome bloque le MIDI pour un fichier ouvert par double-clic, dis-le-moi : je prépare une petite version à lancer en local."}
        </p>
      )}
      {m.etat === "ok" && (
        <div className="midi-ports">
          <label>Entrée (ce que l'E2 joue)
            <select value={m.entree} onChange={(e) => choisirEntree(e.target.value)}>
              {m.entrees.length === 0 && <option value="">Aucune</option>}
              {m.entrees.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>Sortie (vers l'E2)
            <select value={m.sortie} onChange={(e) => choisirSortie(e.target.value)}>
              {m.sorties.length === 0 && <option value="">Aucune</option>}
              {m.sorties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>Canal (GLOBAL MIDI CH.)
            <select value={m.canal} onChange={(e) => choisirCanal(Number(e.target.value))}>
              {Array.from({ length: 16 }, (_, i) => i + 1).map((c) => <option key={c} value={c}>{String(c).padStart(2, "0")}</option>)}
            </select>
          </label>
          <button type="button" className="chipbtn" disabled={!m.sortie}
            onClick={() => { envoyer([0x90 | (m.canal - 1), 60, 100]); window.setTimeout(() => envoyer([0x80 | (m.canal - 1), 60, 64]), 400); }}>
            ♪ Test : envoyer un C4
          </button>
        </div>
      )}
    </div>
  );
}

function ligneJournal(e: Evenement) {
  if (e.type === "note") { const n = nomMidi(e.note!); return <>Note <b>{n.en}</b> <span className="muted">({n.fr}, n° {e.note})</span>, vélocité {e.velocite}</>; }
  if (e.type === "cc") return <>CC {e.cc} <b>{CC_E2[e.cc!]?.nom ?? "inconnu"}</b> = {e.valeur}</>;
  if (e.type === "pc") return <>Program Change {e.valeur}</>;
  return <>{e.type === "start" ? "Start (lecture)" : e.type === "stop" ? "Stop" : "Continue"}</>;
}

function Moniteur() {
  const m = useMidi();
  const derniere = m.journal.find((e) => e.type === "note");
  const ccs = Object.entries(m.ccs).map(([k, v]) => [Number(k), v] as const).sort((a, b) => a[0] - b[0]);
  return (
    <div className="block">
      <h3>2. Ce que joue l'E2</h3>
      <p className="small muted">Mets l'E2 en mode Keyboard et joue sur les pads, ou tourne un potard. Les notes s'affichent comme sur l'écran (dièses, C4 = 60 <SourceRef src={SRC_PAD_C4} compact />). Les noms des potards viennent du tableau MIDI <SourceRef src={SRC_TABLEAU} compact />.</p>
      <div className="midi-moniteur">
        <div className="midi-note" aria-live="polite">
          {derniere ? <><span className="midi-note-en">{nomMidi(derniere.note!).en}</span><span className="midi-note-fr">{nomMidi(derniere.note!).fr}</span></> : <span className="muted">—</span>}
        </div>
        <div className="midi-infos">
          <div>Notes tenues : {m.notesTenues.length ? m.notesTenues.map((n) => nomMidi(n).en).join(" ") : <span className="muted">aucune</span>}</div>
          <div>Tempo reçu : {m.bpmRecu ? <b>{m.bpmRecu} BPM</b> : <span className="muted">pas d'horloge (l'E2 en envoie quand elle joue en CLOCK MODE Internal)</span>}</div>
          {ccs.length > 0 && (
            <div className="midi-ccs">
              {ccs.map(([cc, v]) => (
                <span key={cc} className="midi-cc"><span className="small muted">CC {cc}</span> {CC_E2[cc]?.nom ?? "?"} <b>{v}</b>
                  <span className="midi-cc-bar"><span style={{ width: `${(v / 127) * 100}%` }} /></span></span>
              ))}
            </div>
          )}
        </div>
      </div>
      {ccs.length > 0 && <p className="small"><span className="verify">Valeur MIDI 0 à 127, pas forcément le chiffre de l'écran</span> Compare avec l'écran de l'E2 et note tes plages sur la Carte.</p>}
      <div className="midi-journal">
        {m.journal.length === 0 ? <p className="muted small">Rien reçu pour l'instant.</p> : m.journal.slice(0, 14).map((e, i) => (
          <div key={`${e.t}-${i}`} className="small"><span className="muted">{heure(e.t)}</span> {e.canal ? <span className="muted">canal {e.canal} · </span> : null}{ligneJournal(e)}</div>
        ))}
      </div>
      {m.journal.length > 0 && <button type="button" className="chipbtn" onClick={viderJournal}>Effacer la liste</button>}
      {m.journal.some((e) => e.canal && e.canal !== m.canal) && (
        <p className="midi-alerte small">L'E2 envoie sur le canal {m.journal.find((e) => e.canal && e.canal !== m.canal)!.canal}, pas sur le {m.canal}. Change le canal ci-dessus pour que l'envoi de recettes marche.</p>
      )}
    </div>
  );
}

function ExerciceGamme() {
  const [keyEn, setKeyEn] = useState("D");
  const [scaleN, setScaleN] = useState(GAMMES.find((g) => g.nom === "Ionian")?.n ?? GAMMES[0].n);
  const [ordre, setOrdre] = useState(true);
  const [rang, setRang] = useState(0);
  const [jouees, setJouees] = useState<{ note: number; ok: boolean }[]>([]);
  const [erreurs, setErreurs] = useState(0);
  const key = keyByEn(keyEn);
  const gamme = gammeByN.get(scaleN) ?? GAMMES[0];
  const notes = useMemo(() => notesIn(gamme, key), [gamme, key]);
  // La montée : toutes les notes de la gamme, puis la KEY à l'octave.
  const cibles = useMemo(() => [...notes.map((n) => n.pc), key.semi], [notes, key]);
  const fini = ordre && rang >= cibles.length;
  const etat = useRef({ rang, cibles, ordre, notes });
  etat.current = { rang, cibles, ordre, notes };
  const premiere = useRef<number | null>(null);

  const recommencer = () => { setRang(0); setJouees([]); setErreurs(0); premiere.current = null; };
  useEffect(recommencer, [keyEn, scaleN, ordre]);

  useEffect(() => surNote((note) => {
    const { rang: r, cibles: c, ordre: o, notes: ns } = etat.current;
    const pc = note % 12;
    const dansGamme = ns.some((n) => n.pc === pc);
    if (!o) { setJouees((j) => [{ note, ok: dansGamme }, ...j].slice(0, 24)); return; }
    if (r >= c.length) return;
    // La dernière note doit être la KEY une octave au-dessus de la première.
    const ok = pc === c[r] && (r !== c.length - 1 || premiere.current === null || note === premiere.current + 12);
    if (r === 0 && ok) premiere.current = note;
    setJouees((j) => [{ note, ok }, ...j].slice(0, 24));
    if (ok) setRang(r + 1); else setErreurs((e) => e + 1);
  }), []);

  return (
    <div className="block">
      <h3>3. Exercice : joue la gamme sur les pads</h3>
      <p className="small muted">Choisis une KEY et une SCALE. Mets la même chose sur l'E2 (ou SCALE MODE = Off pour chercher toi-même les notes), puis joue. <Badge kind="pratique" /></p>
      <div className="midi-ports">
        <label>KEY
          <select value={keyEn} onChange={(e) => setKeyEn(e.target.value)}>{ALL_KEYS.map((k) => <option key={k.en} value={k.en}>{k.en} ({k.fr})</option>)}</select>
        </label>
        <label>SCALE
          <select value={scaleN} onChange={(e) => setScaleN(Number(e.target.value))}>{GAMMES.map((g) => <option key={g.n} value={g.n}>{g.n} {g.nom}</option>)}</select>
        </label>
        <div className="rc-filters">
          <button type="button" className={`chipbtn ${ordre ? "on" : ""}`} onClick={() => setOrdre(true)}>Monter dans l'ordre</button>
          <button type="button" className={`chipbtn ${!ordre ? "on" : ""}`} onClick={() => setOrdre(false)}>Jeu libre</button>
        </div>
      </div>
      <div className="midi-cibles">
        {cibles.map((pc, i) => (
          <span key={i} className={`midi-cible ${ordre && i < rang ? "ok" : ""} ${ordre && i === rang ? "next" : ""}`}>
            {nomPc(pc).en}<small>{i === cibles.length - 1 ? "octave" : nomPc(pc).fr}</small>
          </span>
        ))}
      </div>
      {ordre ? (
        fini ? <p className="midi-bravo">Bravo, gamme jouée en entier{erreurs ? ` (${erreurs} fausse${erreurs > 1 ? "s" : ""} note${erreurs > 1 ? "s" : ""} en route)` : " sans fausse note"} ! <button type="button" className="chipbtn" onClick={recommencer}>Rejouer</button></p>
          : <p className="small">À jouer : <b>{nomPc(cibles[rang]).en}</b>{rang === cibles.length - 1 ? " une octave au-dessus de ta première note" : ""}. Fausses notes : {erreurs}. <button type="button" className="chipbtn" onClick={recommencer}>Recommencer</button></p>
      ) : (
        <p className="small muted">Vert = dans la gamme, violet = hors gamme.</p>
      )}
      <div className="midi-jouees">
        {jouees.map((j, i) => <span key={i} className={j.ok ? "ok" : "ko"}>{nomMidi(j.note).en}</span>)}
      </div>
      <DoneToggle id="midi:gamme" />
    </div>
  );
}

function EnvoiRecette() {
  const m = useMidi();
  const pasEnvoye = usePasEnvoye();
  const [id, setId] = useState(() => RECETTES.find((r) => r.melodique)?.id ?? RECETTES[0].id);
  const rec = RECETTES.find((r) => r.id === id) ?? RECETTES[0];
  const [bpm, setBpm] = useState(rec.bpm ?? 165);
  const [decalage, setDecalage] = useState(0);
  const [boucle, setBoucle] = useState(true);
  const [horloge, setHorloge] = useState(false);
  useEffect(() => { setBpm(rec.bpm ?? 165); setDecalage(0); arreterSequence(); }, [rec]);
  useEffect(() => () => arreterSequence(), []);

  const percu = !rec.melodique || SONS_PERCU.includes(rec.apercu.son);
  const gamme = gammeByN.get(rec.melodique?.scale ?? 1) ?? GAMMES[0];
  const key = keyByEn(rec.melodique?.key ?? "C");
  const sequence: PasMidi[] = useMemo(() => rec.mesures.flat().map((p) => {
    if (p === null) return null;
    if (p === "~") return "tenue";
    if (percu) return 60 + 12 * decalage;        // un coup = le C4 d'un pad
    return midiOf({ keySemi: key.semi, octave: rec.apercu.octave + decalage }, gamme, p);
  }), [rec, percu, gamme, key, decalage]);
  const enCours = pasEnvoye >= 0;
  const { tous } = useStyles();
  const proc = procedureById.get("realtimerec");

  return (
    <div className="block">
      <h3>4. Faire jouer une recette par l'E2</h3>
      <p className="small muted">L'app envoie les notes de la recette, pas à pas, au tempo choisi. Le son vient de ta machine : règle d'abord le son de la recette sur la partie conseillée. Les potards ne sont pas envoyés.</p>
      <div className="midi-ports">
        <label>Recette
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {tous.filter((s) => !s.masque || RECETTES.find((r) => r.id === id)?.styles[0] === s.id).map((s) => (
              <optgroup key={s.id} label={s.nom}>
                {RECETTES.filter((r) => r.styles[0] === s.id && !r.kit).map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label>BPM
          <input type="number" min={20} max={300} value={bpm} onChange={(e) => setBpm(Math.max(20, Math.min(300, Number(e.target.value) || 120)))} />
        </label>
        <label>Octave
          <select value={decalage} onChange={(e) => setDecalage(Number(e.target.value))}>
            {[-2, -1, 0, 1, 2].map((d) => <option key={d} value={d}>{d > 0 ? `+${d}` : d}</option>)}
          </select>
        </label>
      </div>
      <p className="small">
        Partie conseillée : <kbd>Part {rec.partie}</kbd>
        {rec.melodique ? <> · <kbd>KEY = {rec.melodique.key}</kbd> <kbd>SCALE = {gamme.n} {gamme.nom}</kbd></> : <> · percussion : chaque coup envoie C4</>}
        {" "}<a href={`#recettes/${rec.id}`}>voir la recette ↗</a>
      </p>
      <div className="midi-grille" aria-label="64 pas de la recette">
        {sequence.map((p, i) => (
          <span key={i} className={`${p === null ? "vide" : p === "tenue" ? "tenue" : "note"} ${i === pasEnvoye ? "joue" : ""} ${i % 16 === 0 ? "debut" : ""}`}
            title={`Pas ${Math.floor(i / 16) + 1}.${String((i % 16) + 1).padStart(2, "0")}${typeof p === "number" ? ` · ${nomMidi(p).en}` : ""}`}>
            {typeof p === "number" && !percu ? nomMidi(p).en.replace(/-?\d+$/, "") : ""}
          </span>
        ))}
      </div>
      <div className="rc-filters">
        <ChoixMode mode={boucle ? "loop" : "once"} onChange={(m) => setBoucle(m === "loop")} />
        <label className="small midi-check"><input type="checkbox" checked={horloge} onChange={(e) => setHorloge(e.target.checked)} /> Envoyer aussi Start et l'horloge</label>
      </div>
      {horloge && <p className="small muted">L'E2 lance alors son motif en même temps et suit le tempo de l'app, si son CLOCK MODE est Auto ou External USB <SourceRef src={{ doc: "PG", page: 6 }} compact />. En Internal, elle ignore l'horloge reçue <SourceRef src={SRC_TABLEAU} compact />.</p>}
      <div className="cn-actions">
        <button type="button" className={`e2-ui-btn big play ${enCours ? "on" : ""}`} disabled={!m.sortie}
          onClick={() => (enCours ? arreterSequence() : envoyerSequence(sequence, bpm, { boucle, horloge }))}>
          {enCours ? "■ Arrêter" : "▶ Envoyer à l'E2"}
        </button>
        <button type="button" className="e2-ui-btn" disabled={!m.sortie} onClick={() => { arreterSequence(); toutCouper(); }}>Couper toutes les notes</button>
        {!m.sortie && <span className="small muted">Connecte l'E2 (étape 1) pour envoyer.</span>}
      </div>

      <div className="midi-hypo">
        <p className="small"><Badge kind="interp" /> <b>À vérifier sur ta machine.</b> Le manuel dit que l'E2 reçoit les notes sur son canal global <SourceRef src={SRC_TABLEAU} compact />, mais pas quelle partie les joue. On suppose que c'est la partie sélectionnée. Autre test : lance l'envoi avec l'horloge, puis appuie sur <kbd>Rec</kbd> sur l'E2 ({proc ? proc.titre.toLowerCase() : "enregistrement en temps réel"} <SourceRef src={{ doc: "OM", page: 30 }} compact />). Si l'E2 enregistre les notes reçues, la recette est copiée dans ta machine sans programmer les pas à la main.</p>
        <ObservationBox id="midi:reception" titre="Quelle partie joue les notes reçues, et Rec les enregistre-t-il ?" placeholder="Ex. : la partie sélectionnée joue ; avec Rec, les notes sont enregistrées (quantifiées ?)…" />
      </div>
    </div>
  );
}

export default function Midi() {
  return (
    <div className="midi">
      <h2 className="page-title">MIDI : l'app parle à ton E2</h2>
      <Infos>
        <p>Branche l'E2 en USB : l'app voit ce que tu joues sur les pads et peut faire jouer une recette par ta machine, avec son vrai son. Chrome ou Edge sur PC. <Badge kind="manuel" /> = tableau MIDI du mode d'emploi, <Badge kind="pratique" /> = exercice de l'app.</p>
      </Infos>
      <ToutOuvrirFermer ids={["midi.1", "midi.2", "midi.3", "midi.4"]} />
      <Deroulant id="midi.1" defaut petit icone="prise" couleur="#6aa2ee" titre="1. Brancher l'E2" texte="Câble USB, Chrome ou Edge, et le choix du port."><Connexion /></Deroulant>
      <Deroulant id="midi.2" petit icone="midi" couleur="#3fd6d0" titre="2. Ce que joue l'E2" texte="Les notes et les potards que l'app reçoit, en direct."><Moniteur /></Deroulant>
      <Deroulant id="midi.3" petit icone="gammes" couleur="#ffd84d" titre="3. Exercice : joue la gamme sur les pads" texte="L'app vérifie chaque note que tu joues."><ExerciceGamme /></Deroulant>
      <Deroulant id="midi.4" petit icone="recettes" couleur="#ff6a3d" titre="4. Faire jouer une recette par l'E2" texte="L'app envoie les notes, ta machine fait le son."><EnvoiRecette /></Deroulant>
    </div>
  );
}
