// Page « Réglages audio et vidéo » (#audio), commune à « Enregistrement » et « Visualiseur en direct ».
// Choix de l'entrée (Scarlett 4i4), de la paire d'entrées, mono / stéréo, test avec vumètre, fréquence d'échantillonnage.
// Choix de la webcam du mode vidéo, avec un aperçu.
import { useEffect, useRef, useState } from "react";
import { Badge } from "../components/common";
import { Deroulant } from "../components/Deroulant";
import { PixelArt } from "../components/PixelArt";
import { Vumetre, type StatsVu } from "../components/Vumetre";
import {
  appareilDePaire, fmtHz, listerAppareils, paireEffective, prendreEntree, reessayer, rendreEntree, setReglages, useEntreeEtat, type EtatEntree,
} from "../lib/audioEntree";
import { ecrireWebcam, erreurCamera, fermerCamera, lireWebcam, listerCameras, ouvrirCamera, type Camera } from "../lib/webcam";
import "./audio.css";

const QUI = "reglages-audio";

export default function ReglagesAudio() {
  const e = useEntreeEtat();
  const [test, setTest] = useState(false);
  const [stats, setStats] = useState<StatsVu | null>(null);
  const [debutTest, setDebutTest] = useState(0);
  const r = e.reglages;

  useEffect(() => { void listerAppareils(); }, []);
  useEffect(() => () => rendreEntree(QUI), []);

  const lancer = async () => {
    if (!r.permissionExpliquee) setReglages({ permissionExpliquee: true });
    setTest(true); setStats(null); setDebutTest(performance.now());
    await prendreEntree(QUI);
  };
  const arreter = () => { setTest(false); rendreEntree(QUI); };
  const ouvert = e.statut === "ouvert" && test;

  // Appareil à 4 canaux : on prend l'autre paire dans le flux. Sinon, Windows montre souvent chaque paire comme un appareil à part.
  const choisirPaire = (paire: number) => {
    const autre = e.canauxRecus >= 4 ? undefined : appareilDePaire(e.appareils, paire, r.label);
    setReglages(autre ? { paire, deviceId: autre.id, label: autre.label } : { paire });
  };

  const silence = ouvert && stats && performance.now() - debutTest > 4000 && performance.now() - stats.dernierSignal > 4000;

  return (
    <div className="audio-page">
      <h2 className="page-title"><PixelArt name="audio" size={34} /> Réglages audio et vidéo</h2>
      <p className="audio-intro muted">L'entrée de ta carte son, pour les onglets <a href="#studio/enregistrer">Enregistrer</a> et <a href="#studio/visualiser">Visualiser</a> du Studio. Réglée une fois ici, elle sert partout.</p>

      {!r.permissionExpliquee && (
        <section className="audio-permission">
          <PixelArt name="audio" size={48} />
          <div>
            <h3>Première fois : le navigateur va demander le « micro »</h3>
            <p>Quand tu cliques sur « Tester », le navigateur affiche une petite fenêtre en haut : <b>« Utiliser votre micro ? »</b>. Pour lui, le « micro », c'est l'entrée de ta Scarlett. Clique sur <b>Autoriser</b>.</p>
            <p className="small muted">Le son reste sur ton PC : l'app n'envoie rien sur internet. Tu peux retirer l'autorisation plus tard avec l'icône à gauche de l'adresse.</p>
          </div>
        </section>
      )}

      <div className="audio-grille">
        <section className="audio-carte">
          <h3>1. Appareil d'entrée</h3>
          <label className="audio-champ">Appareil
            <select value={r.deviceId} onChange={(ev) => { const a = e.appareils.find((x) => x.id === ev.target.value); setReglages({ deviceId: ev.target.value, label: a?.label ?? "" }); }}>
              <option value="">Appareil par défaut de Windows</option>
              {e.appareils.filter((a) => a.id && a.id !== "default").map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>
          {e.appareils.every((a) => /^Entrée audio \d+$/.test(a.label)) && <p className="small muted">Les noms des appareils (ta Scarlett 4i4) apparaissent après la première autorisation : clique sur « Tester ».</p>}

          <div className="audio-champ">Paire d'entrées de la Scarlett
            <div className="audio-choix" role="radiogroup" aria-label="Paire d'entrées">
              {[0, 1].map((p) => (
                <button key={p} type="button" role="radio" aria-checked={r.paire === p} className={`chipbtn ${r.paire === p ? "on" : ""}`} onClick={() => choisirPaire(p)}>
                  Entrées {p === 0 ? "1-2" : "3-4"}
                </button>
              ))}
            </div>
            <small className="muted">L'E2 branché sur les entrées ligne 3 et 4 → « Entrées 3-4 ». Sous Windows, chaque paire de la Scarlett apparaît souvent comme un appareil à part (« Analogue 1 + 2 », « Analogue 3 + 4 ») : l'app le choisit pour toi si elle le trouve.</small>
            {e.statut === "ouvert" && !e.paireDispo && <PaireAbsente e={e} />}
          </div>

          <div className="audio-champ">Canaux
            <div className="audio-choix" role="radiogroup" aria-label="Mono ou stéréo">
              <button type="button" role="radio" aria-checked={r.mode === "stereo"} className={`chipbtn ${r.mode === "stereo" ? "on" : ""}`} onClick={() => setReglages({ mode: "stereo" })}>Stéréo (gauche + droite)</button>
              <button type="button" role="radio" aria-checked={r.mode === "mono"} className={`chipbtn ${r.mode === "mono" ? "on" : ""}`} onClick={() => setReglages({ mode: "mono" })}>Mono</button>
            </div>
            {r.mode === "mono" && (
              <div className="audio-choix sous" role="radiogroup" aria-label="Quelle entrée en mono">
                {([["g", `Entrée ${r.paire === 0 ? 1 : 3} seule`], ["d", `Entrée ${r.paire === 0 ? 2 : 4} seule`], ["somme", "Les deux mélangées"]] as const).map(([v, t]) => (
                  <button key={v} type="button" role="radio" aria-checked={r.canalMono === v} className={`chipbtn ${r.canalMono === v ? "on" : ""}`} onClick={() => setReglages({ canalMono: v })}>{t}</button>
                ))}
              </div>
            )}
            <small className="muted">Un seul câble sur Audio Out L de l'E2 = l'E2 sort en mono : choisis « Mono » et l'entrée où il est branché.</small>
          </div>
        </section>

        <section className="audio-carte">
          <h3>2. Tester l'entrée</h3>
          <div className="audio-test-btns">
            {!test ? (
              <button type="button" className="px-btn green" onClick={() => void lancer()}>▶ Tester</button>
            ) : (
              <button type="button" className="px-btn" onClick={arreter}>⏹ Arrêter le test</button>
            )}
            {e.statut === "erreur" && test && <button type="button" className="px-btn" onClick={() => void reessayer(QUI)}>↻ Réessayer</button>}
            <span className={`audio-etat ${e.statut}`}>{test ? (e.statut === "demande" ? "Autorisation demandée… clique sur « Autoriser » en haut de la fenêtre" : e.statut === "ouvert" ? `● ${e.nomAppareil}` : e.statut === "erreur" ? "Entrée indisponible" : "…") : "Test arrêté"}</span>
          </div>
          <Vumetre actif={ouvert} mono={r.mode === "mono"} onStats={setStats} />
          {ouvert && stats && (
            <p className={`audio-signal ${stats.sature ? "rouge" : silence ? "orange" : stats.picMaxDb > -40 ? "vert" : ""}`} role="status">
              {stats.sature ? "⚠ Saturation : le signal a touché 0 dBFS. Baisse le gain de l'entrée sur la Scarlett (ou le Master Volume de l'E2), puis « remettre à zéro »."
                : silence ? "Aucun signal pour l'instant. Fais jouer l'E2, puis vérifie le câble, le gain de la Scarlett et la paire d'entrées choisie."
                  : stats.picMaxDb > -40 ? (stats.picMaxDb > -6 ? "✓ Le son arrive. Bon niveau, avec un peu de marge avant 0 dBFS." : "✓ Le son arrive. Un peu faible : monte le gain de la Scarlett pour viser des crêtes vers −12 à −6 dBFS.")
                    : "Joue quelques notes sur l'E2…"}
            </p>
          )}
          {test && e.erreur && <ErreurBox e={e} />}
        </section>
      </div>

      <section className="audio-carte audio-infos">
        <h3>3. Ce que l'app reçoit</h3>
        <dl className="audio-dl">
          <div className="gros"><dt>Fréquence de l'entrée (carte son)</dt><dd>{e.statut === "ouvert" || e.statut === "erreur" ? (e.srEntree ? fmtHz(e.srEntree) : "non annoncée") : "— (clique sur Tester)"}</dd>
            <small>{e.srEntree ? "Celle que Windows utilise pour ta carte son (Scarlett)." : e.statut === "ouvert" ? "Le navigateur ne la donne pas : l'app s'aligne sur son moteur audio." : "Elle s'affiche dès que l'entrée est ouverte."}</small></div>
          <div className="gros"><dt>Fréquence du moteur audio de l'app</dt><dd>{e.srApp ? fmtHz(e.srApp) : "—"}</dd>
            <small className={e.srApp && e.srEntree && e.srEntree !== e.srApp ? "audio-freq-ecart" : ""}>{e.srApp ? (e.srEntree && e.srEntree !== e.srApp ? `⚠ Différente de l'entrée (${fmtHz(e.srEntree)}) : le navigateur convertit. Si le visualiseur reste vide ou figé, mets la même fréquence dans Windows (voir l'aide plus bas).` : "✓ Le moteur audio est créé à la fréquence de l'entrée : l'app enregistre et analyse sans conversion.") : "Le moteur audio se règle tout seul sur la fréquence de l'entrée."}</small></div>
          <div><dt>Canaux reçus de l'appareil</dt><dd>{e.canauxRecus || "—"}</dd><small>{e.canauxRecus >= 4 ? "Les 4 entrées arrivent : l'app prend la paire choisie." : e.canauxRecus ? "Le navigateur reçoit au plus 2 entrées par appareil : une paire à la fois." : ""}</small></div>
          <div><dt>Paire utilisée</dt><dd>{e.statut === "ouvert" ? `Entrées ${paireEffective(e) === 0 ? "1-2" : "3-4"}` : "—"}</dd><small>{r.mode === "mono" ? "Mono" : "Stéréo"}</small></div>
          <div><dt>Retard estimé de l'entrée</dt><dd>{e.latenceMs !== null && e.statut === "ouvert" ? `≈ ${e.latenceMs} ms` : "—"}</dd><small>Pour le vumètre et le visualiseur. L'écoute, elle, passe par le direct monitor : sans retard.</small></div>
          <div><dt>Traitements du navigateur</dt><dd>{e.traitementsCoupes === null ? "—" : e.traitementsCoupes ? "✓ coupés" : "⚠ actifs"}</dd><small>Réduction de bruit, anti-écho et gain automatique coupés : le son brut de la machine.</small></div>
          <div><dt>Pilote</dt><dd>Audio Windows</dd><small>Le navigateur ne gère pas l'ASIO : c'est normal. Rien à changer dans FL Studio ni dans la Scarlett.</small></div>
        </dl>
      </section>

      <ReglageWebcam />

      <section className="audio-rappel">
        <span className="audio-rappel-ic" aria-hidden>🎧</span>
        <p><b>Écoute ta machine par le direct monitor de la Scarlett</b>, pas par l'app. L'app n'envoie jamais l'entrée vers les haut-parleurs : pas de retard, pas de larsen. <Badge kind="pratique" /></p>
      </section>

      <Deroulant id="audio.aide" petit icone="prise" couleur="#ff6a3d" titre="L'entrée ne marche pas ?" texte="FL Studio en ASIO, câble, paire d'entrées, autorisation.">
        <ul className="audio-aides">
          <li><b>Ferme FL Studio s'il utilise la Scarlett en ASIO.</b> L'ASIO peut prendre la carte pour lui seul ; l'app passe par l'audio Windows. Rouvre FL Studio après.</li>
          <li><b>Vérifie le câble</b> : USB de la Scarlett vers le PC, et Audio Out L/R de l'E2 vers les entrées ligne de la Scarlett.</li>
          <li><b>Vérifie la paire d'entrées choisie</b> : 1-2 ou 3-4, celle où l'E2 est branché. Le voyant de gain de la Scarlett doit s'allumer quand l'E2 joue.</li>
          <li><b>Autorisation</b> : icône à gauche de l'adresse → Micro → Autoriser, puis recharge la page.</li>
          <li><b>Windows</b> : Paramètres → Confidentialité et sécurité → Microphone → accès activé pour les applications de bureau.</li>
          <li><b>Fréquence</b> : si FL Studio est réglé à une autre fréquence que Windows, la Scarlett peut refuser l'un des deux. Mets la même dans les deux (par exemple 48 000 Hz). À vérifier dans Focusrite Control.</li>
        </ul>
      </Deroulant>

      <Deroulant id="audio.frequence" petit icone="visualiseur" couleur="#ffd84d" titre="Visualiseur vide ou figé : la fréquence" texte="Carte son et moteur audio à des fréquences différentes.">
        <div className="audio-aides">
          <p><b>Le problème.</b> La carte son (ta Scarlett) travaille à une fréquence d'échantillonnage (par exemple 44 100 ou 48 000 Hz), réglée dans Windows. Le moteur audio de l'app en a une aussi. Si les deux ne correspondent pas, certains navigateurs n'arrivent pas à faire passer le son de l'un à l'autre : le visualiseur reste vide ou se fige, et l'enregistrement aussi.</p>
          <p><b>Ce que fait l'app.</b> Elle crée son moteur audio à la même fréquence que l'entrée choisie (affichées toutes les deux plus haut, dans « Ce que l'app reçoit »). Si le navigateur refuse, elle essaie les autres fréquences courantes. Si rien ne marche, elle affiche « La fréquence de ta carte son ne correspond pas : vérifie le réglage dans Windows » au lieu d'un écran vide.</p>
          <p><b>La solution dans Windows.</b></p>
          <ol>
            <li>Clic droit sur le haut-parleur (en bas à droite) → Paramètres du son → Plus de paramètres de son.</li>
            <li>Onglet « Enregistrement » → ta Scarlett → Propriétés → Avancé → Format par défaut : choisis <b>48000 Hz</b> (24 bits).</li>
            <li>Onglet « Lecture » → ta Scarlett → même chose, <b>la même fréquence</b>.</li>
            <li>Mets aussi cette fréquence dans FL Studio (Options → Audio settings) et dans Focusrite Control si tu l'utilises.</li>
            <li>Ferme puis rouvre le navigateur, et clique sur « Tester » ou « Réessayer ».</li>
          </ol>
        </div>
      </Deroulant>
    </div>
  );
}

function PaireAbsente({ e }: { e: EtatEntree }) {
  return (
    <p className="audio-alerte orange small">
      La paire {e.reglages.paire === 0 ? "1-2" : "3-4"} n'arrive pas par « {e.nomAppareil} » : le navigateur ne reçoit que {e.canauxRecus} entrée{e.canauxRecus > 1 ? "s" : ""} de cet appareil, et aucun autre appareil ne porte ce nom.
      Choisis dans la liste « Appareil » celui qui correspond aux entrées {e.reglages.paire === 0 ? "1 + 2" : "3 + 4"}, ou branche l'E2 sur les entrées 1-2. En attendant, l'app écoute les entrées 1-2.
    </p>
  );
}

function ErreurBox({ e }: { e: EtatEntree }) {
  if (!e.erreur) return null;
  return (
    <div className="audio-alerte rouge" role="alert">
      <b>{e.erreur.titre}</b>
      <ul>{e.erreur.aides.map((a) => <li key={a}>{a}</li>)}</ul>
    </div>
  );
}

// ---------------------------------------------------------------- Webcam (mode vidéo)
function ReglageWebcam() {
  const [r, setR] = useState(lireWebcam);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [apercu, setApercu] = useState(false);
  const [statut, setStatut] = useState<"arret" | "demande" | "ouvert" | "erreur">("arret");
  const [erreur, setErreur] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => { void listerCameras().then(setCameras); }, []);
  // aperçu : la caméra s'ouvre seulement pendant l'aperçu, et s'éteint en quittant la page
  useEffect(() => {
    if (!apercu) { setStatut("arret"); return; }
    let s: MediaStream | null = null, fini = false;
    setStatut("demande"); setErreur(null);
    ouvrirCamera(r).then((x) => {
      if (fini) { fermerCamera(x); return; }
      s = x; setStatut("ouvert");
      if (video.current) video.current.srcObject = x;
      void listerCameras().then(setCameras);
    }).catch((e) => { if (!fini) { setStatut("erreur"); setErreur(erreurCamera(e)); } });
    return () => { fini = true; fermerCamera(s); if (video.current) video.current.srcObject = null; };
  }, [apercu, r.deviceId]); // eslint-disable-line react-hooks/exhaustive-deps
  const choisir = (id: string) => { const n = { deviceId: id, label: cameras.find((c) => c.id === id)?.label ?? "" }; setR(n); ecrireWebcam(n); };
  const sansNoms = cameras.length > 0 && cameras.every((c) => /^Caméra \d+$/.test(c.label));
  return (
    <section className="audio-carte audio-webcam">
      <h3>4. Webcam (mode vidéo)</h3>
      <p className="small muted">La caméra qui s'affiche dans le mode vidéo du Studio (onglet Visualiser). L'image reste sur ton PC : rien n'est envoyé sur internet. La caméra s'allume seulement pendant l'aperçu et dans le mode vidéo.</p>
      <label className="audio-champ">Caméra
        <select value={r.deviceId} onChange={(ev) => choisir(ev.target.value)}>
          <option value="">Caméra par défaut</option>
          {cameras.filter((c) => c.id && c.id !== "default").map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      {(sansNoms || !cameras.length) && <p className="small muted">{cameras.length ? "Les noms des caméras apparaissent après la première autorisation : clique sur « Aperçu »." : "Aucune caméra trouvée pour l'instant : branche-la, puis clique sur « Aperçu »."}</p>}
      <div className="audio-test-btns">
        {!apercu ? <button type="button" className="px-btn green" onClick={() => setApercu(true)}>▶ Aperçu</button>
          : <button type="button" className="px-btn" onClick={() => setApercu(false)}>⏹ Arrêter l'aperçu</button>}
        {statut === "erreur" && <button type="button" className="px-btn" onClick={() => { setApercu(false); window.setTimeout(() => setApercu(true), 50); }}>↻ Réessayer</button>}
        <span className={`audio-etat ${statut}`}>{statut === "demande" ? "Autorisation demandée… clique sur « Autoriser » en haut de la fenêtre" : statut === "ouvert" ? "● Caméra allumée" : statut === "erreur" ? "Caméra indisponible" : "Caméra éteinte"}</span>
      </div>
      <div className="audio-webcam-apercu">
        <video ref={video} autoPlay muted playsInline className={statut === "ouvert" ? "" : "cachee"} />
        {statut !== "ouvert" && <span className="muted small">{statut === "demande" ? "Ouverture…" : "Aperçu éteint"}</span>}
      </div>
      {erreur && <p className="audio-alerte rouge small" role="alert">{erreur}</p>}
    </section>
  );
}
