// « Mes favoris » : tout ce que tu as marqué d'une étoile, rangé par machine › type › catégorie.
// On écoute sans ouvrir la fiche (une fois ou en boucle), et on ouvre la fiche en un clic.
import { BoutonsEcoute } from "../components/Lecteur";
import { useMemo, useState, type CSSProperties } from "react";
import { Rangement } from "../components/Rangement";
import { FiltreMenu, type FmValeur } from "../components/FiltreMenu";
import { Etoile } from "../components/Etoile";
import { useKnobRange } from "../components/SeqPlayer";
import { infoFav, MACHINES_FAV, TYPES_FAV, typeFav, type InfoFav } from "../lib/favorisCatalogue";
import { toutArreter } from "../lib/apercus";
import { engine, useEngine, type Mode } from "../lib/seq";
import { fxEngine, useFx } from "../lib/fxaudio";
import { listeFavoris, useStore, type TypeFavori } from "../lib/store";

export function useFavorisInfos() {
  const st = useStore();
  return useMemo(() => listeFavoris(st).map(infoFav).filter((x) => x.existe), [st]);
}

/** Une carte de favori : écouter (une fois / boucle), ouvrir la fiche, retirer. */
export function CarteFavori({ x, compact }: { x: InfoFav; compact?: boolean }) {
  const owner = `fav:${x.f.id}`;
  const snap = useEngine(), fsnap = useFx();
  const range = useKnobRange();
  const joue = snap.owner === owner || fsnap.owner === owner;
  const [modeJoue, setModeJoue] = useState<Mode | null>(null);
  const t = typeFav(x.f.type);
  const lancer = (mode: Mode) => { if (joue && modeJoue === mode) { toutArreter(); return; } x.jouer?.(owner, mode, range); setModeJoue(mode); };
  const ouvrir = async () => { if (engine.snap.owner === owner || fxEngine.snap.owner === owner) toutArreter(); if (x.avant && !(await x.avant())) return; location.hash = x.href; };
  return (
    <li className={`fav-carte ${compact ? "compact" : ""} ${joue ? "joue" : ""}`} style={{ "--cc": x.cat.couleur } as CSSProperties}>
      <div className="fav-tete">
        <span className="fav-type">{t.nom}</span>
        <Etoile type={x.f.type} cle={x.f.ref} titre={x.titre} />
      </div>
      <button type="button" className="fav-titre" onClick={ouvrir} title="Ouvrir la fiche"><b>{x.titre}</b>{!compact && <span>{x.sous}</span>}</button>
      <div className="fav-btns">
        {x.jouer ? (
          <>
            <BoutonsEcoute joue={joue ? modeJoue : null} onJouer={lancer} />
          </>
        ) : <span className="small muted fav-sans">{x.sansEcoute ?? "Pas d'aperçu sonore."}</span>}
        <button type="button" className="chipbtn fav-ouvrir" onClick={ouvrir}>Ouvrir la fiche ›</button>
      </div>
    </li>
  );
}

export default function Favoris() {
  const tous = useFavorisInfos();
  const [fl, setFl] = useState<FmValeur>({ machine: [], cat: [] });
  const machine = fl.machine[0] ?? "tous";
  const [type, setType] = useState<string | null>(null);
  const parMachine = tous.filter((x) => machine === "tous" || x.machine === machine);
  const types = TYPES_FAV.filter((t) => machine === "tous" || t.machine === machine);
  const liste = parMachine.filter((x) => (!type || x.f.type === type) && (!fl.cat.length || fl.cat.includes(x.cat.id)));
  const cats = (t: string) => {
    const m = new Map<string, { id: string; nom: string; n: number }>();
    for (const x of parMachine.filter((y) => y.f.type === t)) { const c = m.get(x.cat.id) ?? { id: x.cat.id, nom: x.cat.nom, n: 0 }; c.n++; m.set(x.cat.id, c); }
    return [...m.values()];
  };
  return (
    <div className="favoris-page">
      <h2 className="page-title"><span className="fav-titre-etoile">★</span> Mes favoris</h2>
      <p className="muted fav-intro">Touche l'étoile ☆ d'une recette, d'un effet, d'une gamme, d'un terme du glossaire, d'un preset de Mastering ou d'un morceau : il arrive ici. Les favoris partent avec « Exporter mes relevés » (Carnet). Les aperçus sont une <span className="badge badge-interp">Approximation pédagogique</span>, pas le son réel de l'Electribe.</p>
      <Rangement racine="Mes favoris" labelCategorie="Type" sansAriane
        categories={types.map((t) => ({ id: t.id, nom: t.nom, icone: t.icone, couleur: t.couleur, n: parMachine.filter((x) => x.f.type === t.id).length }))}
        cat={type} onCat={(t) => { setType(t); setFl((v) => ({ ...v, cat: [] })); }} />
      <FiltreMenu valeur={fl} onChange={(v) => { if ((v.machine[0] ?? "tous") !== machine) setType(null); setFl(v); }} resultat={`${liste.length} favori${liste.length > 1 ? "s" : ""}`}
        groupes={[
          { id: "machine", titre: "Machine", seul: true, options: MACHINES_FAV.map((m) => ({ id: m.id, nom: m.nom, n: tous.filter((x) => x.machine === m.id).length })) },
          { id: "cat", titre: "Catégorie", options: (type ? [type] : types.map((t) => t.id)).flatMap((t) => cats(t).map((c) => ({ ...c, section: typeFav(t as TypeFavori).nom }))) },
        ]}
        autres={type ? [{ id: type, nom: typeFav(type as TypeFavori).nom, couleur: typeFav(type as TypeFavori).couleur, retirer: () => setType(null) }] : []}
        onToutEffacer={() => setType(null)} />
      {tous.length === 0 ? (
        <p className="fav-vide"><span className="home-etoile">☆</span> Pas encore de favoris.</p>
      ) : liste.length === 0 ? (
        <p className="muted">Aucun favori ici. Choisis une autre machine ou un autre type.</p>
      ) : (
        <ul className="fav-liste">{liste.map((x) => <CarteFavori key={x.f.id} x={x} />)}</ul>
      )}
    </div>
  );
}
