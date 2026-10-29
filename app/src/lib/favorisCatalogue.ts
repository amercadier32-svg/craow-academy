// Ce que l'app sait de chaque favori : son nom, sa machine, son type, sa catégorie, sa fiche et comment l'écouter.
import { lireJson, ecrireJson } from "./stockage";
import { CATEGORIES, ELEMENTS, RECETTES } from "../content/recettes";
import { GRILLES, STYLE_GRILLE } from "../content/grilles";
import { FICHES } from "../content/effets";
import { CATS_LEX, lexById } from "../content/lexique";
import { EXEMPLES, styleM } from "../content/morceau";
import { POINTS_DEPART } from "../content/mastering";
import { DEFIS } from "../content/defis";
import { COULEURS } from "../components/Rangement";
import type { useKnobRange } from "../components/SeqPlayer";
import { FAMILLES_G } from "../modules/Gammes";
import { morceauDe, type Morceau } from "../modules/Morceau";
import { gammeByN } from "./music";
import type { Mode } from "./seq";
import { getState, type Favori, type TypeFavori } from "./store";
import { etatGamme, etatGrille, etatMorceau, etatRecette, jouerFx, jouerLex, jouerSeq } from "./apercus";

type Range = ReturnType<typeof useKnobRange>;
export type MachineFav = "electribe2" | "commun";

export const MACHINES_FAV: { id: MachineFav; nom: string }[] = [
  { id: "electribe2", nom: "Electribe 2" },
  { id: "commun", nom: "Communs" },
];

export const TYPES_FAV: { id: TypeFavori; nom: string; icone: string; couleur: string; machine: MachineFav }[] = [
  { id: "recette", nom: "Recettes", icone: "recettes", couleur: "#ff6a3d", machine: "electribe2" },
  { id: "grille", nom: "Grilles du Labo", icone: "grille", couleur: "#3fd6d0", machine: "electribe2" },
  { id: "fx", nom: "Effets", icone: "effets", couleur: "#e255c8", machine: "electribe2" },
  { id: "gamme", nom: "Gammes", icone: "gammes", couleur: "#ffd84d", machine: "electribe2" },
  { id: "morceau", nom: "Morceaux", icone: "morceau", couleur: "#4fd18b", machine: "electribe2" },
  { id: "lex", nom: "Glossaire", icone: "glossaire", couleur: "#6aa2ee", machine: "commun" },
  { id: "master", nom: "Mastering", icone: "mastering", couleur: "#ffb020", machine: "commun" },
  { id: "defi", nom: "Défis de Session", icone: "session", couleur: "#3fd6d0", machine: "electribe2" },
  { id: "reference", nom: "Analyses de référence", icone: "reference", couleur: "#9b6bff", machine: "commun" },
  { id: "enregistrement", nom: "Mes enregistrements", icone: "enregistrer", couleur: "#ff3b3b", machine: "commun" },
];
export const typeFav = (t: TypeFavori) => TYPES_FAV.find((x) => x.id === t)!;

export interface InfoFav {
  f: Favori;
  titre: string;
  sous: string;
  machine: MachineFav;
  cat: { id: string; nom: string; couleur: string };
  href: string;
  /** Avant d'ouvrir la fiche (ex. charger le morceau). Renvoie false pour annuler. */
  avant?: () => boolean;
  jouer?: (owner: string, mode: Mode, range: Range) => void;
  sansEcoute?: string;
  existe: boolean;
}

const rcById = new Map(RECETTES.map((r) => [r.id, r]));
const ficheById = new Map(FICHES.map((f) => [f.id, f]));
const COUL_STYLE: Record<string, string> = { tribe: "#ff6a3d", mentale: "#9b6bff", tekno: "#6aa2ee" };
const KIND_FX = { ifx: { nom: "Insert FX", couleur: "#e255c8" }, mfx: { nom: "Master FX", couleur: "#9b6bff" }, mod: { nom: "Modulations", couleur: "#3fd6d0" } };
const CLE_MORCEAU = "e2academy.morceau.encours";

export function infoFav(f: Favori): InfoFav {
  const t = typeFav(f.type);
  const base = { f, titre: f.titre, sous: t.nom, machine: t.machine, cat: { id: "autre", nom: t.nom, couleur: t.couleur }, href: "#accueil", existe: false };
  switch (f.type) {
    case "recette": {
      const rc = rcById.get(f.ref) ?? getState().recettesGenerees[f.ref]?.recette ?? undefined;
      if (!rc) return base;
      const cid = (rc.element && ELEMENTS.get(rc.element)?.categorie) || "rythmique";
      const c = CATEGORIES.find((x) => x.id === cid)!;
      const el = rc.element ? ELEMENTS.get(rc.element)?.nom : undefined;
      return { ...base, existe: true, titre: rc.nom, sous: [c.nom, el].filter(Boolean).join(" · "), cat: { id: cid, nom: c.nom, couleur: COULEURS[cid as keyof typeof COULEURS] ?? "#e255c8" },
        href: `#recettes/${rc.id}`, jouer: (o, mode, range) => jouerSeq(o, etatRecette(rc, range, mode)) };
    }
    case "grille": {
      const g = GRILLES.find((x) => x.id === f.ref);
      if (!g) return base;
      return { ...base, existe: true, titre: g.nom, sous: `${STYLE_GRILLE[g.style]} · ${g.bpm} BPM · ${g.pistes.length} parties`, cat: { id: g.style, nom: STYLE_GRILLE[g.style], couleur: COUL_STYLE[g.style] },
        href: "#favoris", jouer: (o, mode, range) => jouerSeq(o, etatGrille(g.id, range, mode)) };
    }
    case "fx": {
      const x = ficheById.get(f.ref);
      if (!x) return base;
      const k = KIND_FX[x.kind];
      return { ...base, existe: true, titre: `${x.kind === "mfx" ? String(x.n).padStart(2, "0") : x.n} ${x.nom}`, sous: `${k.nom} · 4 mesures sans, puis 4 avec`, cat: { id: x.kind, nom: k.nom, couleur: k.couleur },
        href: `#effets/${x.id}`, jouer: (o, mode) => jouerFx(o, x.kind, x.nom, mode === "loop") };
    }
    case "gamme": {
      const n = Number(f.ref);
      const g = gammeByN.get(n);
      if (!g) return base;
      const fam = FAMILLES_G.find((x) => x.n.includes(n));
      return { ...base, existe: true, titre: `${g.n} · ${g.nom}`, sous: `${fam?.nom ?? "Gamme"} · motif Basse roulante en KEY = D`, cat: { id: fam?.id ?? "autre", nom: fam?.nom ?? "Autres", couleur: fam?.couleur ?? "#ffd84d" },
        href: `#gammes/${n}`, jouer: (o, mode) => jouerSeq(o, etatGamme(n, mode)) };
    }
    case "lex": {
      const m = lexById.get(f.ref);
      if (!m) return base;
      const c = CATS_LEX.find((x) => x.id === m.cat)!;
      return { ...base, existe: true, titre: m.fr, sous: `${c.nom}${m.en ? ` · ${m.en}` : ""}`, cat: { id: c.id, nom: c.nom, couleur: c.couleur },
        href: `#glossaire/${m.id}`, jouer: m.ec ? (o, mode, range) => jouerLex(o, m, range, mode) : undefined };
    }
    case "master": {
      const sansEcoute = "Pour l'entendre, charge un morceau dans le Mastering : la fiche s'ouvre sur ce preset.";
      if (f.ref.startsWith("perso-")) return { ...base, existe: true, sous: "Mes presets", cat: { id: "perso", nom: "Mes presets", couleur: "#9b6bff" }, href: "#mastering/depart", sansEcoute };
      const p = POINTS_DEPART.find((x) => x.id === f.ref);
      if (!p) return base;
      return { ...base, existe: true, titre: p.nom, sous: `Point de départ · ${p.resume}`, cat: { id: "depart", nom: "Points de départ", couleur: p.couleur }, href: `#mastering/depart-${p.id}`, sansEcoute };
    }
    case "defi": {
      const d = DEFIS.find((x) => x.id === f.ref) ?? getState().defisPerso[f.ref]?.defi ?? undefined;
      if (!d) return base;
      return { ...base, existe: true, titre: d.titre, sous: `${d.duree} min · ${d.difficulte}${d.perso ? " · mon défi" : ""}`, cat: { id: `d${d.duree}`, nom: `${d.duree} minutes`, couleur: "#3fd6d0" },
        href: `#session/defi-${d.id}`, sansEcoute: "Un défi ne s'écoute pas : ouvre-le pour le lancer." };
    }
    case "reference": {
      const a = getState().analysesRef?.[f.ref];
      if (!a || a.supprimee) return base;
      const tona = a.key ? ` · ${a.key} ${a.mineur ? "mineur" : "majeur"}` : "";
      return { ...base, existe: true, titre: a.nom, sous: `${a.bpm ? `${a.bpm} BPM` : "BPM ?"}${tona} · ${a.zones.length} zone(s)`, cat: { id: "reference", nom: "Analyses", couleur: "#9b6bff" },
        href: `#reference/${a.id}`, sansEcoute: "L'audio de la référence reste sur ton appareil : ouvre l'analyse et recharge le fichier pour l'écouter." };
    }
    case "enregistrement":
      return { ...base, existe: true, sous: "Mon enregistrement", cat: { id: "enregistrement", nom: "Enregistrements", couleur: "#ff3b3b" },
        href: `#enregistrements/${encodeURIComponent(f.ref)}`, sansEcoute: "Ouvre-le dans Mes enregistrements pour l'écouter." };
    case "morceau": {
      const ex = f.ref.startsWith("ex-") ? EXEMPLES.find((x) => `ex-${x.id}` === f.ref) : undefined;
      const m: Morceau | undefined = ex ? morceauDe(ex) : (f.data as Morceau | undefined);
      if (!m || !Array.isArray(m.couches)) return base;
      const s = styleM(m.style);
      const avant = ex ? undefined : () => {
        const cur = lireJson<Morceau | null>(CLE_MORCEAU, null);
        if (cur && cur.couches?.length && JSON.stringify(cur.couches) !== JSON.stringify(m.couches)
          && !confirm(`Remplacer ton morceau en cours (« ${cur.nom} ») par « ${m.nom} » ?`)) return false;
        ecrireJson(CLE_MORCEAU, { ...m, majLe: new Date().toISOString() });
        return true;
      };
      return { ...base, existe: true, titre: m.nom, sous: `${ex ? "Exemple" : "Mon morceau"} · ${s.nom} · ${m.bpm} BPM · ${m.couches.length} couches`, cat: { id: m.style, nom: s.nom, couleur: s.couleur },
        href: ex ? "#morceau/exemples" : "#morceau/grille", avant,
        jouer: m.couches.length ? (o, mode, range) => jouerSeq(o, etatMorceau(m, range, mode)) : undefined,
        sansEcoute: "Ce morceau n'a pas encore de couche : ouvre-le pour en ajouter." };
    }
  }
  return base;
}
