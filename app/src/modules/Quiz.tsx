// Quiz et flashcards, avec répétition espacée. Les questions sont générées depuis data/ (lib/quiz.ts).
import { lireJson } from "../lib/stockage";
import { Infos, Rangement } from "../components/Rangement";
import { useEffect, useMemo, useState } from "react";
import { THEMES, ecrireSuivi, genererCartes, lireSuivi, melange, noter, tirerChoix, type Theme } from "../lib/quiz";
import { Badge, SourceRef } from "../components/common";
import { CLE_QUIZ_LEX } from "../content/lexique";

const TAILLE = 10;
type Mode = "quiz" | "flash";

function selectionLexique(): string[] | null {
  const ids = lireJson<string[]>(CLE_QUIZ_LEX, []); return Array.isArray(ids) && ids.length ? ids.map((x) => `lex:${x}`) : null;
}

export default function Quiz({ focus }: { focus?: string }) {
  const depuisLexique = focus === "lexique";
  const toutes = useMemo(() => {
    const seen = new Set<string>();
    return genererCartes().filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  }, []);
  const [suivi, setSuivi] = useState(lireSuivi);
  const [themes, setThemes] = useState<Theme[]>(depuisLexique ? ["lexique"] : []);
  const [mode, setMode] = useState<Mode>(depuisLexique ? "flash" : "quiz");
  const [selLex, setSelLex] = useState<string[] | null>(() => (depuisLexique ? selectionLexique() : null));
  const [session, setSession] = useState<string[] | null>(null);
  const [i, setI] = useState(0);
  const [choix, setChoix] = useState<string[]>([]);
  const [rep, setRep] = useState<string | null>(null);   // réponse donnée (quiz) ou "vue" (flash)
  const [score, setScore] = useState(0);
  useEffect(() => ecrireSuivi(suivi), [suivi]);
  useEffect(() => { if (selLex?.length) demarrer(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const now = Date.now();
  const pool = toutes.filter((c) => (!themes.length || themes.includes(c.theme)) && (!selLex || selLex.includes(c.id)));
  const dues = pool.filter((c) => suivi[c.id] && suivi[c.id].due <= now);
  const nouvelles = pool.filter((c) => !suivi[c.id]);
  const boites = [1, 2, 3, 4, 5].map((b) => pool.filter((c) => suivi[c.id]?.boite === b).length);
  const byId = useMemo(() => new Map(toutes.map((c) => [c.id, c])), [toutes]);
  const carte = session ? byId.get(session[i]) : undefined;

  const taille = selLex ? Math.min(30, pool.length) : TAILLE;
  const demarrer = () => {
    const ids = selLex ? melange(pool).map((c) => c.id).slice(0, taille)
      : [...dues.sort((a, b) => suivi[a.id].due - suivi[b.id].due), ...melange(nouvelles)].slice(0, taille).map((c) => c.id);
    const reste = ids.length < taille ? melange(pool.filter((c) => !ids.includes(c.id))).slice(0, taille - ids.length).map((c) => c.id) : [];
    const all = [...ids, ...reste];
    if (!all.length) return;
    setSession(all); setI(0); setScore(0); setRep(null);
    setChoix(tirerChoix(byId.get(all[0])!));
  };
  const repondre = (juste: boolean, donnee: string) => {
    if (!carte || rep) return;
    setRep(donnee);
    if (juste) setScore((s) => s + 1);
    setSuivi((s) => ({ ...s, [carte.id]: noter(s[carte.id], juste) }));
  };
  const suivant = () => {
    if (!session) return;
    if (i + 1 >= session.length) { setI(session.length); return; }
    setI(i + 1); setRep(null); setChoix(tirerChoix(byId.get(session[i + 1])!));
  };

  // Clavier : 1-4 pour répondre, Entrée pour continuer.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!carte || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (mode === "quiz" && !rep && /^[1-4]$/.test(e.key)) { const c = choix[Number(e.key) - 1]; if (c) repondre(c === carte.reponse, c); }
      else if (e.key === "Enter" && rep && rep !== "vue") suivant();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  const fini = session && i >= session.length;
  return (
    <div className="quiz">
      <h2 className="page-title">Quiz et flashcards</h2>
      <Infos>
        <p>Les questions sont fabriquées à partir du manuel <Badge kind="manuel" />, avec la page de chaque réponse. Le thème Glossaire reprend les définitions du glossaire (Manuel ou <Badge kind="pratique" />) ; coche des termes dans le glossaire pour réviser seulement ceux-là. Une carte bien répondue revient plus tard (1, 2, 4, 8 puis 16 jours) ; une carte ratée revient tout de suite.</p>
      </Infos>

      {!session || fini ? (
        <div className="block">
          {fini && <p className="qz-score">Série terminée : <b>{score} / {session!.length}</b> {score === session!.length ? "🎉" : ""}</p>}
          {selLex && (
            <p className="qz-sel">Ta sélection du glossaire : <b>{selLex.length}</b> terme{selLex.length > 1 ? "s" : ""}.{" "}
              <a href="#glossaire">Changer la sélection</a> · <button type="button" className="chipbtn" onClick={() => setSelLex(null)}>Tout le glossaire</button></p>
          )}
          <Rangement racine="Quiz" labelCategorie="Thème"
            filtre={{ label: "Mode", value: mode, onChange: (m) => setMode(m as typeof mode), toujours: true, options: [{ id: "quiz", nom: "Quiz (4 choix)" }, { id: "flash", nom: "Flashcards" }] }}
            categories={THEMES.map((t, k) => ({ id: t.id, nom: t.nom, icone: ["machine", "lecture", "potard", "enveloppe", "parcours", "gammes", "chaine", "glossaire"][k % 8],
              couleur: ["#6aa2ee", "#4fd18b", "#ffd84d", "#ff6a3d", "#e8484e", "#ffb020", "#3fd6d0", "#9b6bff"][k % 8], n: toutes.filter((c) => c.theme === t.id).length }))}
            cat={themes[0] ?? null} onCat={(c) => setThemes(c ? [c as Theme] : [])}
          />
          <div className="qz-stats">
            <span><b>{pool.length}</b> cartes</span>
            <span><b>{dues.length}</b> à revoir maintenant</span>
            <span><b>{nouvelles.length}</b> jamais vues</span>
          </div>
          <div className="qz-boxes" aria-label="Cartes par boîte">
            {boites.map((n, k) => (
              <div key={k} className="qz-box"><i style={{ height: `${Math.min(100, (100 * n) / Math.max(1, pool.length / 3))}%` }} /><span>Boîte {k + 1}</span><b>{n}</b></div>
            ))}
          </div>
          <button type="button" className="e2-ui-btn big" onClick={demarrer} disabled={!pool.length}>▶ {fini ? "Encore une série" : "Commencer une série"} de {taille}</button>
          <button type="button" className="e2-ui-btn qz-reset" onClick={() => { if (confirm("Effacer toute ta progression du quiz ?")) setSuivi({}); }}>Remettre la progression à zéro</button>
        </div>
      ) : carte && (
        <div className="block qz-card">
          <div className="qz-top">
            <span className="muted small">Carte {i + 1} / {session.length} · {THEMES.find((t) => t.id === carte.theme)!.nom}{suivi[carte.id] ? ` · boîte ${suivi[carte.id].boite}` : " · nouvelle"}</span>
            <button type="button" className="close" onClick={() => setSession(null)} aria-label="Arrêter">✕</button>
          </div>
          <div className="qz-progress"><i style={{ width: `${(100 * i) / session.length}%` }} /></div>
          <h3 className="qz-q">{carte.question}</h3>

          {mode === "quiz" ? (
            <div className="qz-choices">
              {choix.map((c, k) => (
                <button key={k} type="button" disabled={!!rep}
                  className={`qz-choice ${rep ? (c === carte.reponse ? "good" : c === rep ? "bad" : "") : ""}`}
                  onClick={() => repondre(c === carte.reponse, c)}>
                  <kbd>{k + 1}</kbd> {c}
                </button>
              ))}
            </div>
          ) : !rep ? (
            <button type="button" className="e2-ui-btn big" onClick={() => setRep("vue")}>Voir la réponse</button>
          ) : null}

          {rep && (
            <div className={`qz-answer ${mode === "quiz" ? (rep === carte.reponse ? "good" : "bad") : ""}`}>
              {mode === "quiz" && <p><b>{rep === carte.reponse ? "Juste !" : "Pas tout à fait."}</b></p>}
              <p>Réponse : <b>{carte.reponse}</b> {carte.source ? <SourceRef src={carte.source} /> : <Badge kind="pratique" />}</p>
              {carte.detail && <ol className="steps">{carte.detail.map((d) => <li key={d}>{d}</li>)}</ol>}
              {carte.lien && <p><a href={carte.lien}>{carte.theme === "lexique" ? "Voir la fiche du glossaire ↗" : "Voir sur la machine ↗"}</a></p>}
              {mode === "flash" && rep === "vue" ? (
                <div className="qz-self">
                  <button type="button" className="e2-ui-btn" onClick={() => { const c = carte; setRep("ok"); setScore((s) => s + 1); setSuivi((s) => ({ ...s, [c.id]: noter(s[c.id], true) })); }}>✓ Je savais</button>
                  <button type="button" className="e2-ui-btn" onClick={() => { const c = carte; setRep("ko"); setSuivi((s) => ({ ...s, [c.id]: noter(s[c.id], false) })); }}>✗ À revoir</button>
                </div>
              ) : (
                <button type="button" className="e2-ui-btn big" onClick={suivant}>{i + 1 < session.length ? "Suivante →" : "Voir mon score"} <small>(Entrée)</small></button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
