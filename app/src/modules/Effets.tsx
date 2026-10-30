// Guide des effets et modulations : une fiche par Insert FX, par Master FX et par modulation.
// Lien direct : #effets/ifx-3, #effets/mfx-12, #effets/mod-25.
import { norm } from "../lib/texte";
import { BoutonLecture, ChoixMode } from "../components/Lecteur";
import { Etoile } from "../components/Etoile";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Fenetre } from "../components/Fenetre";
import { fermerFenetre, ouvrirFenetre, useEtatPage } from "../lib/retour";
import "./recettes-fenetre.css";
import { COULEURS, Infos, Rangement } from "../components/Rangement";
import { FiltreMenu, type FmGroupe, type FmValeur } from "../components/FiltreMenu";
import {
  DEST_MOD, FAMILLES, FICHES, FICHES_IFX, FICHES_MFX, FICHES_MOD, SONS, SOURCES_MOD, etapes, ficheById, pageListe,
  type Fiche, type FicheFx, type FicheMod, type Kind,
} from "../content/effets";
import { RECETTES, STYLE_NOM, type Recette } from "../content/recettes";
import { FICHE, rangerVisibles, stylesEffet, useStyles } from "../content/styles";

/** Styles d'un effet : ceux de sa fiche, plus ceux dont la fiche de style le cite. */
const stylesDe = (f: Fiche) => stylesEffet(f.kind, f.n, f.usage.styles);
import { AvantApres, FormeMod, Trajet } from "../components/FxSchema";
import { Badge, DoneToggle, ObservationBox, PlageLue, RangeBox, SourceRef, StartValueChip } from "../components/common";
import { useKnobRange, usePlayerPrefs } from "../components/SeqPlayer";
import { BPM_APERCU, MOTIF_TEXTE, fxEngine, registerFx, touchFx, useFx, vitesseApercu, type AB, type FxParams } from "../lib/fxaudio";
import { listeFavoris, useStore } from "../lib/store";

const KINDS: { id: Kind; nom: string; court: string }[] = [
  { id: "ifx", nom: "Insert FX", court: "IFX" },
  { id: "mfx", nom: "Master FX", court: "MFX" },
  { id: "mod", nom: "Modulations", court: "MOD" },
];

// ---------- Favoris : ceux de « Mes favoris » (type fx) ----------
function useFavoris() {
  const st = useStore();
  return listeFavoris(st).filter((x) => x.type === "fx").map((x) => x.ref);
}

const texteFiche = (f: Fiche) => norm([f.n, f.nom, f.usage.texte, f.usage.assoc.join(" "), f.usage.sons.join(" "),
  f.kind === "mod" ? `${f.sourceManuel} ${f.destManuel}` : `${f.quoi} ${FAMILLES.find((x) => x.id === f.famille)?.nom}`].join(" "));

/** Recettes qui utilisent ce type (réglage principal ou variante). */
export function recettesPour(f: Fiche): { rc: Recette; variante?: string }[] {
  const param = f.kind === "ifx" ? "ifx.type" : f.kind === "mfx" ? "pat.mfxtype" : "mod.type";
  const val = `${f.n} ${f.nom}`;
  const out: { rc: Recette; variante?: string }[] = [];
  for (const rc of RECETTES) {
    if (rc.reglages.some((r) => r.param === param && r.valeur === val)) { out.push({ rc }); continue; }
    const v = rc.variantes.find((x) => x.reglages.some((r) => r.param === param && r.valeur === val));
    if (v) out.push({ rc, variante: v.nom });
  }
  return out;
}

// Couleurs des familles (toutes dans la famille « effets » : roses, violets, rouges)
const COUL_FAM: Record<string, string> = {
  filtre: "#e255c8", distorsion: "#ff4f6d", dynamique: "#ff7ab8", eq: "#c86bff", delai: "#9b6bff",
  reverbe: "#7a8bff", modulation: "#d36bff", rythme: "#ff5fa2", boucle: "#b44fd1", sequence: "#ff86d9",
};
const COUL_GROUPE: Record<string, string> = { Enveloppe: "#ffd84d", LFO: "#3fd6d0", Hasard: "#ff6a3d" };
const ICONE_GROUPE: Record<string, string> = { Enveloppe: "enveloppe", LFO: "lfo", Hasard: "hasard" };
const palPedale = (c: string) => ({ m: c, M: `color-mix(in srgb, ${c} 60%, #000)` });

export default function Effets({ focus }: { focus?: string }) {
  const f0 = focus ? ficheById.get(focus) : undefined;
  const [kind, setKind] = useEtatPage<Kind>("effets.type", f0?.kind ?? "ifx");
  const [cat, setCat] = useEtatPage<string | null>("effets.cat", f0 ? (f0.kind === "mod" ? f0.info.source : f0.famille) : null);
  const [fl, setFl] = useEtatPage<FmValeur>("effets.filtres", { style: [], dest: [], favoris: [] });
  const [sel, setSel] = useState<string | null>(f0?.id ?? null);
  const [q, setQ] = useEtatPage("effets.recherche", "");
  const favOnly = fl.favoris.length > 0;
  const { tous, visibles } = useStyles();
  const fav = useFavoris();
  const { faits } = useStore();
  // Retour du navigateur : la fenêtre suit l'adresse (#effets = fermée, #effets/<id> = ouverte).
  useEffect(() => {
    const suivre = () => { const [m, id] = location.hash.replace("#", "").split("/"); if (m === "effets") setSel(id && ficheById.has(id) ? id : null); };
    window.addEventListener("popstate", suivre);
    return () => window.removeEventListener("popstate", suivre);
  }, []);

  const mots = norm(q).split(/\s+/).filter(Boolean);
  const affine = (f: Fiche) => (!fl.style.length || stylesDe(f).some((s) => fl.style.includes(s))) && (!favOnly || fav.includes(f.id))
    && (!fl.dest.length || (f.kind === "mod" && fl.dest.includes(f.info.dest)));
  const duType = FICHES.filter((f) => f.kind === kind && affine(f));
  const catDe = (f: Fiche) => (f.kind === "mod" ? f.info.source : f.famille);
  const list = mots.length
    ? FICHES.filter((f) => affine(f) && mots.every((m) => texteFiche(f).includes(m)))
    : duType.filter((f) => cat && catDe(f) === cat);
  const fiche = sel ? ficheById.get(sel) : undefined;
  const choose = (id: string) => { setSel(id); ouvrirFenetre(`#effets/${id}`); };
  const fermer = () => fermerFenetre("#effets", () => setSel(null));
  const changerType = (k: string) => { setKind(k as Kind); setCat(null); setFl((v) => ({ ...v, dest: [] })); setQ(""); };
  const avantFiltre = FICHES.filter((f) => f.kind === kind);
  const groupesF: FmGroupe[] = [
    { id: "type", titre: "Type", fixe: true, defaut: "ifx", options: KINDS.map((k) => ({ id: k.id, nom: k.nom, n: FICHES.filter((f) => f.kind === k.id).length })) },
    { id: "style", titre: "Style", options: visibles.map((s) => ({ id: s.id, nom: s.nom, n: avantFiltre.filter((f) => stylesDe(f).includes(s.id)).length })) },
    ...(kind === "mod" ? [{ id: "dest", titre: "Destination", options: DEST_MOD.map((d) => ({ id: d.id, nom: d.id, n: avantFiltre.filter((f) => f.kind === "mod" && f.info.dest === d.id).length })) }] : []),
    { id: "favoris", titre: "Favoris", options: [{ id: "oui", nom: "★ Favoris seulement", n: fav.length }] },
  ];

  const categories = kind === "mod"
    ? SOURCES_MOD.map((s) => ({
        id: s.id, nom: s.id, texte: s.groupe, icone: ICONE_GROUPE[s.groupe], couleur: COUL_GROUPE[s.groupe],
        n: duType.filter((f) => catDe(f) === s.id).length,
      }))
    : FAMILLES.map((fa) => ({ id: fa.id, nom: fa.nom, icone: "effets", pal: palPedale(COUL_FAM[fa.id]), couleur: COUL_FAM[fa.id], n: duType.filter((f) => catDe(f) === fa.id).length }))
        .filter((c) => FICHES.some((f) => f.kind === kind && catDe(f) === c.id));

  const carte = (f: Fiche) => (
    <button key={f.id} type="button" className={`rc-card fx-card ${sel === f.id ? "on" : ""} ${faits[`fx:${f.id}`] ? "done" : ""}`} onClick={() => choose(f.id)}>
      <span className="rc-role">{KINDS.find((k) => k.id === f.kind)!.court} {f.n}{fav.includes(f.id) ? " · ★" : ""}{faits[`fx:${f.id}`] ? " · écouté ✓" : ""}</span>
      <b className="fx-lcd">{f.nom}</b>
      <span className="small muted fx-card-txt">{f.kind === "mod" ? `${f.sourceManuel} → ${f.destManuel}` : f.quoi.split(/[.:]/)[0]}</span>
      <span className="rc-styles">{rangerVisibles(stylesDe(f), tous).map((s) => <span key={s} className={`st st-${s}`}>{STYLE_NOM[s]}</span>)}</span>
    </button>
  );
  const couleurDe = (f: Fiche) => (f.kind === "mod" ? COUL_GROUPE[SOURCES_MOD.find((s) => s.id === f.info.source)!.groupe] : COUL_FAM[f.famille]);

  const groupes = (): { titre: string; idee?: string; couleur: string; items: Fiche[] }[] => {
    if (mots.length) return KINDS.map((k) => ({ titre: k.nom, couleur: COULEURS.effets, items: list.filter((f) => f.kind === k.id) })).filter((g) => g.items.length);
    if (!cat) {
      // Filtres ☰ actifs sans famille choisie : toutes les familles qui ont des fiches.
      if (!(fl.style.length || favOnly || fl.dest.length)) return [];
      return categories.map((c) => ({ titre: c.nom, couleur: c.couleur, items: duType.filter((f) => catDe(f) === c.id) })).filter((g) => g.items.length);
    }
    if (kind !== "mod") { const fa = FAMILLES.find((x) => x.id === cat)!; return [{ titre: fa.nom, idee: fa.idee, couleur: COUL_FAM[fa.id], items: list }]; }
    const so = SOURCES_MOD.find((x) => x.id === cat)!;
    return [{ titre: so.nom, idee: so.texte, couleur: COUL_GROUPE[so.groupe], items: list }];
  };

  return (
    <div className="map recettes effets sans-detail">
      <div className="map-main">
        <h2 className="page-title">Effets et modulations</h2>
        <Infos>
          <p>Une fiche par effet et par modulation de ta Synth. Le numéro et le nom viennent du Guide des paramètres <SourceRef src={{ doc: "PG", page: 16 }} compact /> <SourceRef src={{ doc: "PG", page: 14 }} compact />.</p>
          <p>Le Guide ne dit pas ce que fait chaque effet ni le rôle du potard Edit ou du pad tactile : ces explications sont des interprétations <Badge kind="interp" /> à vérifier à l'oreille, avec un exercice et des cases à remplir dans chaque fiche.</p>
          <p>Les familles d'effets sont un classement de l'app <Badge kind="pratique" />. Les modulations sont rangées par source (enveloppe, LFO, hasard) puis par destination, comme leur nom sur l'écran.</p>
        </Infos>
        <Rangement
          racine="Effets" sansAriane
          categories={categories}
          labelCategorie={kind === "mod" ? "Source" : "Famille"}
          cat={mots.length ? null : cat} onCat={(c) => { setCat(c); setQ(""); }}
        />
        <FiltreMenu groupes={groupesF} valeur={{ ...fl, type: [kind] }} resultat={`${mots.length ? list.length : cat ? list.length : duType.length} fiche${(mots.length || cat ? list.length : duType.length) > 1 ? "s" : ""}`}
          autres={cat && !mots.length ? [{ id: cat, nom: categories.find((c) => c.id === cat)?.nom ?? cat, couleur: categories.find((c) => c.id === cat)?.couleur, retirer: () => setCat(null) }] : []}
          onToutEffacer={() => setCat(null)}
          onChange={(v) => { if (v.type[0] && v.type[0] !== kind) changerType(v.type[0]); setFl({ style: v.style, dest: v.dest ?? [], favoris: v.favoris }); }} />
        <div className="fx-affiner">
          <input className="gl-search" type="search" placeholder="Chercher un effet, un son, un usage… (ex. delay, kick, acid, 25)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Recherche dans les effets" />
        </div>
        {!mots.length && !cat && !(fl.style.length || favOnly || fl.dest.length) && (
          <p className="rg-hint">Choisis {kind === "mod" ? "une source" : "une famille"} pour voir ses {duType.length} fiches{favOnly ? " favorites" : ""}, ou cherche un mot.</p>
        )}
        {groupes().map((g) => (
          <section key={g.titre} className="rc-group" style={{ "--cc": g.couleur } as CSSProperties}>
            <h3 className="rc-gtitle">{g.titre} <small>{g.items.length}</small></h3>
            {g.idee && <p className="small muted fx-gidee">{g.idee}</p>}
            <div className="rc-grid">{g.items.map((f) => <span key={f.id} className="rc-cell" style={{ "--cc": couleurDe(f) } as CSSProperties}>{carte(f)}</span>)}</div>
          </section>
        ))}
        {(mots.length > 0 || cat) && list.length === 0 && <p className="muted">Aucune fiche pour ce choix.</p>}
      </div>
      {fiche && (
        <Fenetre sorte="fiche" titre={`${fiche.kind === "mod" ? "Modulation" : fiche.kind.toUpperCase()} ${fiche.kind === "mfx" ? String(fiche.n).padStart(2, "0") : fiche.n} · ${fiche.nom}`}
          label={fiche.nom} onFermer={fermer}
          etoile={<Etoile type="fx" cle={fiche.id} titre={`${fiche.kind === "mod" ? "Modulation" : fiche.kind.toUpperCase()} ${fiche.n} · ${fiche.nom}`} />}>
          <Detail key={fiche.id} f={fiche} onClose={fermer} />
        </Fenetre>
      )}
    </div>
  );
}

function Detail({ f, onClose }: { f: Fiche; onClose: () => void }) {
  const rcs = recettesPour(f);
  const { tous } = useStyles();
  const sts = rangerVisibles(stylesDe(f), tous);
  const parFiche = sts.filter((s) => !f.usage.styles.includes(s));
  const isMod = f.kind === "mod";
  const fx = isMod ? null : (f as FicheFx);
  const md = isMod ? (f as FicheMod) : null;
  const fam = fx ? FAMILLES.find((x) => x.id === fx.famille) : undefined;

  return (
    <div className="detail-inner fx-detail">
      <div className="detail-top">
        <div>
          <p className="muted small">{KINDS.find((k) => k.id === f.kind)!.nom} · {fam ? fam.nom : `${SOURCES_MOD.find((s) => s.id === md!.info.source)?.groupe} → ${md!.destManuel}`}</p>
          <h2><span className="fx-screen">{f.kind === "mfx" ? String(f.n).padStart(2, "0") : f.n} {f.nom}</span></h2>
          <p className="small"><Badge kind="manuel" /> Nom et numéro comme sur l'écran <SourceRef src={pageListe(f.kind)} compact />{md && md.n > 64 ? <> <SourceRef src={{ doc: "PG", page: 15 }} compact /></> : null}</p>
        </div>
        <div className="fx-top-btns">
          <Etoile type="fx" cle={f.id} titre={`${f.kind === "mod" ? "Modulation" : f.kind.toUpperCase()} ${f.n} · ${f.nom}`} />
          <button type="button" className="close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
      </div>

      <div className="block">
        <h3>Ce que ça fait</h3>
        {fx && <>
          <p><Badge kind="interp" /> {fx.quoi}</p>
          <p className="small muted">Le Guide ne donne que le nom de l'effet <SourceRef src={{ doc: "PG", page: 16 }} compact /> : ce texte décrit ce que fait d'habitude ce type d'effet. Vérifie-le à l'oreille avec l'exercice plus bas.</p>
        </>}
        {md && <>
          <p><Badge kind="manuel" /> Source : <b>{md.sourceManuel}</b> → destination : <b>{md.destManuel}</b>. <SourceRef src={{ doc: "PG", page: md.n > 64 ? 15 : 14 }} compact /></p>
          <p><Badge kind="pratique" /> {SOURCES_MOD.find((s) => s.id === md.info.source)?.texte} {DEST_MOD.find((d) => d.id === md.info.dest)?.texte}</p>
        </>}
        {fx?.kind === "mfx" && fx.motionSeq === false && (
          <p className="small"><Badge kind="manuel" /> Cet effet joue sur le séquenceur : « La séquence de données de jeu n'est pas disponible », donc pas de Motion Seq pour lui. <SourceRef src={{ doc: "PG", page: 16 }} compact /></p>
        )}
      </div>

      <div className="block">
        <h3>Schéma</h3>
        {fx && <AvantApres schema={fx.schema} />}
        {md && <FormeMod info={md.info} />}
        <Trajet kind={f.kind} dest={md?.info.dest} />
      </div>

      <div className="block">
        <h3>Réglages</h3>
        <Reglages f={f} />
      </div>

      <div className="block">
        <h3>Écouter : sans puis avec {isMod ? "la modulation" : "l'effet"}</h3>
        <FxPlayer f={f} />
      </div>

      <div className="block">
        <h3>Dans les styles</h3>
        <p><Badge kind="pratique" /> {f.usage.texte}</p>
        <p className="small">
          Sur : {f.usage.sons.map((s) => <span key={s} className="fx-son">{SONS.find((x) => x.id === s)?.nom}</span>)}
          {" "}· Styles : {sts.map((s) => <span key={s} className={`st st-${s}`}> {STYLE_NOM[s]}</span>)}
        </p>
        <ul className="facts">{f.usage.assoc.map((a) => <li key={a}>{a}</li>)}</ul>
        {parFiche.length > 0 && <p className="small">Cité aussi dans les effets typiques de la fiche {parFiche.map((s, i) => <span key={s}>{i > 0 && ", "}<a href={`#styles/${s}`}>{FICHE[s].nom}</a></span>)}.</p>}
      </div>

      <div className="block">
        <h3>Recettes qui l'utilisent</h3>
        {rcs.length ? (
          <ul className="facts">{rcs.map(({ rc, variante }) => (
            <li key={rc.id}><a href={`#recettes/${rc.id}`}>{rc.nom} ↗</a>{variante ? <span className="small muted"> (variante « {variante} »)</span> : null} <span className="rc-styles">{rc.styles.map((s) => <span key={s} className={`st st-${s}`}>{STYLE_NOM[s]}</span>)}</span></li>
          ))}</ul>
        ) : <p className="small muted">Aucune recette ne l'utilise pour l'instant.</p>}
      </div>

      <div className="block">
        <h3>Sur ta machine</h3>
        <ol className="steps">{etapes(f).map((s) => <li key={s.texte}>{s.texte} {s.ref && <SourceRef src={s.ref} compact />}</li>)}</ol>
      </div>

      <Exercice f={f} />
    </div>
  );
}

function Reglages({ f }: { f: Fiche }) {
  if (f.kind === "mod") {
    const i = f.info;
    return (
      <div className="fx-reglages">
        <div className="rc-set"><span className="rc-name">Destination</span><span><kbd>{f.destManuel}</kbd> <Badge kind="manuel" /></span></div>
        <div className="rc-set"><span className="rc-name">Synchro au tempo (BPM Sync)</span><span><kbd>{i.bpm ? "Oui" : "Non"}</kbd> <Badge kind="manuel" /></span></div>
        <div className="rc-set"><span className="rc-name">Key Sync</span><span><kbd>{i.key ? "Oui" : "Non"}</kbd> <Badge kind="manuel" /></span></div>
        <p className="small muted">BPM Sync : la vitesse suit le tempo. Key Sync : le LFO repart de zéro à chaque note <SourceRef src={{ doc: "PG", page: 14 }} compact />.</p>
        <div className="rc-set"><span className="rc-name">Depth</span><span><StartValueChip nom="Depth" valeur="40" aVerifier param="mod.depth" /></span></div>
        <p className="small"><Badge kind="manuel" /> Intensité de la modulation <SourceRef src={{ doc: "OM", page: 23 }} compact />.</p>
        <div className="rc-set"><span className="rc-name">Speed</span><span><StartValueChip nom="Speed" valeur={i.bpm ? "64" : "50"} aVerifier param="mod.speed" /></span></div>
        <p className="small"><Badge kind="manuel" /> Vitesse de la modulation <SourceRef src={{ doc: "OM", page: 23 }} compact />.{" "}
          <Badge kind="interp" /> {i.source.startsWith("EG")
            ? "Pour une enveloppe, Speed règle probablement la durée de la descente."
            : i.bpm ? "Synchro au tempo : chaque cran de Speed choisit sans doute une durée en mesures ou en fractions de temps ; l'écran l'affiche peut-être."
            : "Libre : Speed règle la vitesse sans suivre le tempo."} À vérifier sur l'écran.</p>
        <PlageLue paramId="mod.depth" /> <PlageLue paramId="mod.speed" />
      </div>
    );
  }
  const axes: [string, string, NonNullable<FicheFx["edit"]>][] = f.kind === "ifx"
    ? (f.edit ? [["Edit", "ifx.edit", f.edit]] : [])
    : [...(f.x ? [["Pad tactile, axe X (horizontal)", "mfx.x", f.x] as [string, string, NonNullable<FicheFx["x"]>]] : []), ...(f.y ? [["Pad tactile, axe Y (vertical)", "mfx.y", f.y] as [string, string, NonNullable<FicheFx["y"]>]] : [])];
  return (
    <div className="fx-reglages">
      {f.kind === "ifx" && <p className="small"><Badge kind="manuel" /> Edit règle l'intensité de l'effet d'insertion, et son rôle varie selon l'effet choisi <SourceRef src={{ doc: "OM", page: 23 }} compact />.</p>}
      {f.kind === "mfx" && <p className="small"><Badge kind="manuel" /> L'effet master se règle en posant le doigt sur le pad tactile, axes X et Y <SourceRef src={{ doc: "OM", page: 29 }} compact /> <SourceRef src={{ doc: "OM", page: 31 }} compact />.</p>}
      {axes.map(([nom, param, ax]) => (
        <div key={param} className="fx-axe">
          <div className="rc-set"><span className="rc-name">{nom}</span><StartValueChip nom={param === "ifx.edit" ? "Edit" : param === "mfx.x" ? "X" : "Y"} valeur={String(ax.depart)} aVerifier param={param} /></div>
          <p className="small"><Badge kind="interp" /> {ax.role}</p>
        </div>
      ))}
    </div>
  );
}

function FxPlayer({ f }: { f: Fiche }) {
  const owner = `fx:${f.id}`;
  const snap = useFx();
  const playing = snap.owner === owner;
  const [prefs, updPrefs] = usePlayerPrefs();
  const [ab, setAb] = useState<AB>("ab");
  const range = useKnobRange();
  const fx = f.kind !== "mod" ? f : null;
  const v0 = (param: string, d: number) => { const r = range(param); return Math.round(r.min + (d / 127) * (r.max - r.min)); };
  const [edit, setEdit] = useState(() => v0("ifx.edit", fx?.edit?.depart ?? 64));
  const [x, setX] = useState(() => v0("mfx.x", fx?.x?.depart ?? 64));
  const [y, setY] = useState(() => v0("mfx.y", fx?.y?.depart ?? 64));
  const [depth, setDepth] = useState(() => v0("mod.depth", 70));
  const [speed, setSpeed] = useState(() => v0("mod.speed", f.kind === "mod" && f.info.bpm ? 64 : 50));
  const norm01 = (param: string, v: number) => { const r = range(param); return (v - r.min) / Math.max(1, r.max - r.min); };

  const params = (): FxParams => ({
    kind: f.kind, nom: f.nom, ab, loop: prefs.mode === "loop",
    edit: norm01("ifx.edit", edit), x: norm01("mfx.x", x), y: norm01("mfx.y", y),
    depth: norm01("mod.depth", depth), speed: norm01("mod.speed", speed), bpm: BPM_APERCU,
  });
  const pRef = useRef(params);
  pRef.current = params;
  useEffect(() => { if (playing) fxEngine.set(owner, params()); });
  useEffect(() => registerFx(owner, () => fxEngine.play(owner, pRef.current())), [owner]);
  useEffect(() => () => { if (fxEngine.snap.owner === owner) fxEngine.stop(); }, [owner]);
  const toggle = () => { touchFx(owner); if (playing) fxEngine.stop(); else fxEngine.play(owner, params()); };
  const relancer = (nab: AB) => { setAb(nab); if (playing) fxEngine.play(owner, { ...params(), ab: nab }); };

  const slider = (label: string, param: string, v: number, set: (n: number) => void) => {
    const r = range(param);
    return (
      <label className="fx-slider">
        <span>{label} <b>{v}</b>{!r.lue && <span className="verify small"> à vérifier sur l'écran</span>}</span>
        <input type="range" min={r.min} max={r.max} value={v} onChange={(e) => set(Number(e.target.value))} />
      </label>
    );
  };
  const vit = f.kind === "mod" ? vitesseApercu(f.info, norm01("mod.speed", speed)) : null;

  return (
    <div className="seqp fx-player">
      <p className="small"><Badge kind="interp">Approximation pédagogique</Badge> Pas le son réel de l'Electribe. {MOTIF_TEXTE}</p>
      <div className="fx-ab" role="radiogroup" aria-label="Que faire entendre">
        {([["sans", "Sans effet"], ["avec", "Avec effet"], ["ab", "4 mesures sans, puis 4 avec"]] as [AB, string][]).map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={ab === k} className={`chipbtn ${ab === k ? "on" : ""}`} onClick={() => relancer(k)}>{f.kind === "mod" ? l.replace("effet", "modulation") : l}</button>
        ))}
      </div>
      <div className="fx-transport">
        <BoutonLecture joue={playing} onClick={toggle} libelle="Play" grand />
        <ChoixMode mode={prefs.mode} onChange={(mode) => updPrefs({ mode })} />
        <span className="small muted">Espace = lecture / arrêt</span>
      </div>
      <div className="fx-bars" aria-label="Mesure jouée">
        {[0, 1, 2, 3].map((b) => <span key={b} className={`fx-barled ${playing && snap.bar === b ? "on" : ""}`}>Step {b + 1}</span>)}
        <span className={`fx-wet ${playing ? (snap.wet ? "on" : "off") : ""}`}>{playing ? (snap.wet ? "avec" : "sans") : "—"}</span>
      </div>
      <div className="fx-sliders">
        {f.kind === "ifx" && slider("Edit", "ifx.edit", edit, setEdit)}
        {f.kind === "mfx" && <XYPad x={x} y={y} setX={setX} setY={setY} rx={range("mfx.x")} ry={range("mfx.y")} />}
        {f.kind === "mod" && <>
          {slider("Depth", "mod.depth", depth, setDepth)}
          {slider("Speed", "mod.speed", speed, setSpeed)}
          <p className="small muted">Dans l'aperçu, Speed = {vit!.label}{f.info.bpm ? " (synchro au tempo)" : ""}. Interprétation : la correspondance réelle est à lire sur l'écran.</p>
        </>}
      </div>
      <p className="small muted">{f.kind === "ifx" ? "Seule la basse passe dans l'Insert Fx ; le kick et le charleston restent secs pour comparer."
        : f.kind === "mfx" ? "La basse et le charleston ont MFX Send allumé ; le kick reste sec, comme dans les recettes."
        : "La modulation agit sur la basse ; le kick et le charleston ne bougent pas."}</p>
    </div>
  );
}

function XYPad({ x, y, setX, setY, rx, ry }: { x: number; y: number; setX: (n: number) => void; setY: (n: number) => void; rx: { min: number; max: number; lue: boolean }; ry: { min: number; max: number; lue: boolean } }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), ny = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
    setX(Math.round(rx.min + nx * (rx.max - rx.min))); setY(Math.round(ry.min + ny * (ry.max - ry.min)));
  };
  const px = (x - rx.min) / Math.max(1, rx.max - rx.min), py = (y - ry.min) / Math.max(1, ry.max - ry.min);
  return (
    <div className="fx-xy-wrap">
      <div ref={ref} className="fx-xy" role="application" aria-label="Pad tactile : glisse le doigt"
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); move(e); }}
        onPointerMove={(e) => { if (e.buttons) move(e); }}>
        <span className="fx-xy-dot" style={{ left: `${px * 100}%`, top: `${(1 - py) * 100}%` }} />
        <span className="fx-xy-lx">X →</span><span className="fx-xy-ly">Y ↑</span>
      </div>
      <p className="small">X = <b>{x}</b>, Y = <b>{y}</b>{!(rx.lue && ry.lue) && <span className="verify"> à vérifier sur l'écran</span>}</p>
    </div>
  );
}

function Exercice({ f }: { f: Fiche }) {
  const qs = f.kind === "mod"
    ? [
      `Règle Depth à 0 puis monte doucement : à quelle valeur entends-tu ${f.info.dest === "Pan" ? "le son bouger de gauche à droite" : f.info.dest === "Level" ? "le volume bouger" : f.info.dest === "Pitch" ? "la hauteur bouger" : "le son bouger"} ?`,
      f.info.bpm ? "Tourne Speed cran par cran : l'écran affiche-t-il une valeur rythmique (1/4, 1/8…) ou un nombre ?" : "Tourne Speed de bout en bout : quelle est la valeur la plus lente, la plus rapide ?",
      ...(f.info.key ? ["Joue la même note plusieurs fois : la modulation repart-elle du même point à chaque note (Key Sync) ?"] : []),
    ]
    : f.ecoute;
  const plages = f.kind === "ifx" ? ["ifx.edit"] : f.kind === "mfx" ? ["mfx.x", "mfx.y"] : ["mod.depth", "mod.speed"];
  const titre = `${KINDS.find((k) => k.id === f.kind)!.court} ${f.n} ${f.nom}`;
  return (
    <div className="block">
      <h3>🎧 Exercice d'écoute sur ta machine</h3>
      <ol className="steps">{etapes(f).slice(0, f.kind === "mfx" ? 4 : 3).map((s) => <li key={s.texte}>{s.texte}</li>)}<li>Lance un motif avec un son qui tient (basse ou nappe), à 165 BPM.</li></ol>
      <div className="listen"><strong>À écouter</strong><ul>{qs.map((q) => <li key={q}>{q}</li>)}</ul></div>
      <div className="obs-list">{plages.map((id) => <RangeBox key={id} paramId={id} />)}</div>
      <div className="obs-list">
        <ObservationBox id={`fx:${f.id}`} titre={`Effet · ${titre}`} placeholder={f.kind === "ifx" ? "Ce que fait Edit sur cet effet, mes valeurs qui marchent…" : f.kind === "mfx" ? "Ce que font X et Y, mes positions préférées…" : "Ce que j'entends, mes réglages de Depth et Speed…"} />
      </div>
      <DoneToggle id={`fx:${f.id}`} />
    </div>
  );
}

// Utilisé par le Glossaire et le Carnet.
export const FICHES_COMPTE = { ifx: FICHES_IFX.length, mfx: FICHES_MFX.length, mod: FICHES_MOD.length };
