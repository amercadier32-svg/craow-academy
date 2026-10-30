// Carnet : toutes tes notes (« Mes observations ») au même endroit, tes plages relevées, ce que tu as fait,
// des notes libres, et l'export en JSON ou en Markdown.
import { confirmer } from "../components/Confirmer";
import { Infos, Rangement } from "../components/Rangement";
import { Deroulant, ToutOuvrirFermer } from "../components/Deroulant";
import { useState } from "react";
import { paramById } from "../lib/data";
import { getState, plageComplete, setObservation, useStore, type Observation } from "../lib/store";
import { RECETTES } from "../content/recettes";
import { GRILLES } from "../content/grilles";
import { Badge, ObservationBox } from "../components/common";
import { RelevesBar } from "../components/RelevesBar";
import { telecharger } from "../lib/telecharger";

const CATS: { pre: string; nom: string; lien?: (rest: string) => string }[] = [
  { pre: "note:", nom: "Notes libres" },
  { pre: "lesson:", nom: "Parcours", lien: () => "#parcours" },
  { pre: "recette:", nom: "Recettes", lien: (r) => `#recettes/${r}` },
  { pre: "grille:", nom: "Grilles", lien: () => "#morceau/grille" },
  { pre: "structure:", nom: "Structure", lien: () => "#morceau/structure" },
  { pre: "fx:", nom: "Guide des effets", lien: (r) => `#effets/${r}` },
  { pre: "gamme:", nom: "Gammes", lien: (r) => `#gammes/${r.replace(/^pads:/, "")}` },
  { pre: "param:", nom: "Potards et paramètres", lien: (r) => (paramById.get(r)?.controle ? `#carte/${paramById.get(r)!.controle}` : "#carte") },
  { pre: "control:", nom: "Carte de la machine", lien: (r) => `#carte/${r}` },
  { pre: "chain:", nom: "Chaîne du son", lien: () => "#chaine" },
  { pre: "jeu:", nom: "Swing, Groove, Chord et Gate Arp", lien: () => "#jeu" },
  { pre: "setup:", nom: "Mon setup", lien: () => "#setup" },
  { pre: "midi:", nom: "MIDI", lien: () => "#midi" },
  { pre: "morceau:", nom: "Morceaux", lien: () => "#morceau/emporter" },
  { pre: "master:", nom: "Studio · Masteriser", lien: (r) => (r.startsWith("lecon:") ? `#studio/masteriser/lecon-${r.slice(6)}` : "#studio/masteriser") },
  { pre: "", nom: "Exercices d'écoute (oscillateurs, filtres, effets)" },
];
const catOf = (id: string) => CATS.find((c) => c.pre && id.startsWith(c.pre)) ?? CATS[CATS.length - 1];

const nomFait = (id: string) => {
  const [pre, rest] = [id.split(":")[0], id.slice(id.indexOf(":") + 1)];
  if (pre === "recette") return `Recette · ${RECETTES.find((r) => r.id === rest)?.nom ?? getState().recettesGenerees[rest]?.recette?.nom ?? rest}`;
  if (pre === "grille") return `Grille · ${GRILLES.find((g) => g.id === rest)?.nom ?? rest}`;
  if (pre === "structure") return `Structure · ${GRILLES.find((g) => g.id === rest)?.nom ?? rest}`;
  if (pre === "lesson") return `Leçon · ${rest}`;
  if (pre === "fx") return `Effet · ${rest}`;
  if (pre === "master") return `Mastering · ${rest.replace(/^lecon:/, "leçon ")}`;
  if (pre === "jeu") return `Groove et jeu · ${rest}`;
  if (pre === "setup") return `Mon setup · ${rest.replace(/^test:/, "test ")}`;
  return `Exercice · ${id}`;
};
const date = (iso: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "");


export default function Carnet() {
  const { observations, plages, faits } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState("");
  const obs = Object.values(observations).sort((a, b) => b.majLe.localeCompare(a.majLe));
  const filtre = obs.filter((o) => (!cat || catOf(o.id).nom === cat) && (!q || `${o.titre} ${o.texte}`.toLowerCase().includes(q.toLowerCase())));
  const groupes = CATS.map((c) => ({ c, items: filtre.filter((o) => catOf(o.id) === c) })).filter((g) => g.items.length);
  const pl = Object.entries(plages).filter(([, p]) => p.min || p.max);
  const fa = Object.entries(faits).sort((a, b) => b[1].localeCompare(a[1]));

  const ajouter = () => {
    const t = nouveau.trim();
    if (!t) return;
    setObservation(`note:${Date.now()}`, t, "(à compléter)");
    setNouveau("");
  };
  const exportJson = () => {
    const today = new Date().toISOString().slice(0, 10);
    void telecharger(`e2-academy-carnet-${today}.json`, JSON.stringify({ app: "CrAoW ACADEMY", type: "carnet", version: 1, exporteLe: new Date().toISOString(), observations, plages, faits }, null, 2), "application/json");
  };
  const exportMd = () => {
    const today = new Date().toISOString().slice(0, 10);
    const lignes = [`# Mon carnet CrAoW ACADEMY`, ``, `Exporté le ${date(new Date().toISOString())}.`, ``];
    for (const { c, items } of CATS.map((c) => ({ c, items: obs.filter((o) => catOf(o.id) === c) })).filter((g) => g.items.length)) {
      lignes.push(`## ${c.nom}`, ``);
      for (const o of items) lignes.push(`### ${o.titre}`, ``, `*${date(o.majLe)}*`, ``, o.texte, ``);
    }
    if (pl.length) {
      lignes.push(`## Plages relevées sur ma machine`, ``, `| Paramètre | Min | Max | Noté le |`, `|---|---|---|---|`);
      for (const [id, p] of pl) lignes.push(`| ${paramById.get(id)?.nom ?? id} | ${p.min} | ${p.max} | ${date(p.majLe)} |`);
      lignes.push(``);
    }
    if (fa.length) {
      lignes.push(`## Fait / testé`, ``);
      for (const [id, d] of fa) lignes.push(`- ${nomFait(id)} (${date(d)})`);
    }
    void telecharger(`e2-academy-carnet-${today}.md`, lignes.join("\n"), "text/markdown");
  };

  return (
    <div className="carnet">
      <h2 className="page-title">Carnet</h2>
      <Infos>
        <p>Toutes tes notes <Badge kind="obs" /> écrites dans l'app, au même endroit. Elles restent dans ce navigateur : exporte-les pour les garder ou les envoyer.</p>
      </Infos>

      <div className="cn-stats">
        <span><b>{obs.length}</b> notes</span>
        <span><b>{pl.filter(([, p]) => plageComplete(p)).length}</b> plages relevées</span>
        <span><b>{fa.length}</b> choses faites ou testées</span>
      </div>
      <div className="cn-actions">
        <button type="button" className="e2-ui-btn" onClick={exportMd}>⇩ Exporter en Markdown</button>
        <button type="button" className="e2-ui-btn" onClick={exportJson}>⇩ Exporter en JSON</button>
      </div>

      <ToutOuvrirFermer ids={["carnet.nouvelle", "carnet.notes", "carnet.plages", "carnet.faits"]} />
      <Deroulant id="carnet.nouvelle" petit icone="carnet" couleur="#4fd18b" titre="Nouvelle note libre" texte="Un titre, puis écris ta note.">
      <div className="block">
        <h3>Nouvelle note libre</h3>
        <div className="cn-new">
          <input type="text" value={nouveau} placeholder="Titre : ex. « Réglage de basse pour le live du 12 »" onChange={(e) => setNouveau(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ajouter()} />
          <button type="button" className="e2-ui-btn" onClick={ajouter} disabled={!nouveau.trim()}>Ajouter</button>
        </div>
      </div>
      </Deroulant>

      <Deroulant id="carnet.notes" defaut petit icone="carnet" couleur="#9b6bff" titre="Mes notes" texte="Toutes tes observations, rangées par module." badge={obs.length}>
      <div className="block">
        <h3>Mes notes</h3>
        <input className="gl-search" type="search" placeholder="Chercher dans mes notes…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Rangement racine="Mes notes" labelCategorie="Module"
          categories={CATS.filter((c) => obs.some((o) => catOf(o.id) === c)).map((c, k) => ({ id: c.nom, nom: c.nom, icone: "carnet",
            couleur: ["#9b6bff", "#e8484e", "#ff6a3d", "#3fd6d0", "#4fd18b", "#e255c8", "#ffd84d", "#6aa2ee", "#9aa3b2"][k % 9], n: obs.filter((o) => catOf(o.id) === c).length }))}
          cat={cat} onCat={setCat}
        />
        {obs.length === 0 && <p className="muted">Pas encore de note. Écris dans une case « Mes observations » (Carte, exercices, recettes, grilles…) ou ajoute une note libre : elle apparaîtra ici.</p>}
        {groupes.map(({ c, items }) => (
          <section key={c.nom} className="cn-group">
            <h4>{c.nom}</h4>
            {items.map((o: Observation) => {
              const rest = o.id.slice(c.pre.length);
              return (
                <div key={o.id} className="cn-note">
                  <div className="cn-meta">
                    <span className="small muted">{date(o.majLe)}</span>
                    {c.lien && <a className="small" href={c.lien(rest)}>ouvrir ↗</a>}
                    <button type="button" className="chipbtn" onClick={() => { void confirmer(`Effacer la note « ${o.titre} » ?`, { oui: "Effacer" }).then((ok) => { if (ok) setObservation(o.id, o.titre, ""); }); }}>Effacer</button>
                  </div>
                  <ObservationBox id={o.id} titre={o.titre} />
                </div>
              );
            })}
          </section>
        ))}
      </div>
      </Deroulant>

      <Deroulant id="carnet.plages" petit icone="potard" couleur="#6aa2ee" titre="Mes plages relevées" texte="Les min / max lus sur l'écran, et l'export / import de tes relevés." badge={pl.filter(([, p]) => plageComplete(p)).length}>
      <div className="block">
        <h3>Mes plages relevées</h3>
        {pl.length ? (
          <table className="st-table">
            <thead><tr><th>Paramètre</th><th>Min</th><th>Max</th><th>Noté le</th></tr></thead>
            <tbody>{pl.map(([id, p]) => (
              <tr key={id}><td><a href={paramById.get(id)?.controle ? `#carte/${paramById.get(id)!.controle}` : "#carte"}>{paramById.get(id)?.nom ?? id}</a></td><td><kbd>{p.min || "?"}</kbd></td><td><kbd>{p.max || "?"}</kbd></td><td className="small muted">{date(p.majLe)}</td></tr>
            ))}</tbody>
          </table>
        ) : <p className="muted">Aucune plage notée pour l'instant.</p>}
        <RelevesBar />
      </div>
      </Deroulant>

      <Deroulant id="carnet.faits" petit icone="parcours" couleur="#e8484e" titre="Fait ou testé" texte="Les leçons, exercices et tests cochés." badge={fa.length}>
      <div className="block">
        <h3>Fait ou testé</h3>
        {fa.length ? <ul className="facts">{fa.map(([id, d]) => <li key={id}>{nomFait(id)} <span className="small muted">· {date(d)}</span></li>)}</ul> : <p className="muted">Rien de coché pour l'instant.</p>}
      </div>
      </Deroulant>
    </div>
  );
}
