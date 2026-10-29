// Accès typé aux données extraites des manuels (dossier data/electribe2/ à la racine du projet).
import panelJson from "@data/electribe2/panel.json";
import parametersJson from "@data/electribe2/parameters.json";
import oscillatorsJson from "@data/electribe2/oscillators.json";
import effectsJson from "@data/electribe2/effects.json";
import proceduresJson from "@data/electribe2/procedures.json";

export type DocId = "OM" | "PG";
export interface Source { doc: DocId; page: number }

export interface ShiftCombo { combo: string; effet: string; source: Source; synth: string }

export interface Control {
  id: string;
  nom: string;
  type: string;
  fonction: string;
  source: Source;
  synth: string;
  parametres?: string[];
  shift?: ShiftCombo[];
  notes?: string[];
}

export interface PanelSection {
  num: number;
  id: string;
  nom: string;
  source: Source;
  controles?: Control[];
  sousSections?: { id: string; nom: string; controles: Control[] }[];
}

export interface Parameter {
  id: string;
  nom: string;
  groupe: string;
  effet: string;
  plage?: string;
  valeurs?: string[];
  plageNote?: string;
  controle?: string;
  enregistrableMotionSeq: boolean;
  source: Source;
  synth: string;
  shift?: ShiftCombo;
  notes?: string[];
}

export interface Oscillator { n: number; nom: string; categorie: string; nomCategorieFr: string }

export const panel = panelJson as unknown as { sections: PanelSection[]; connecteurs: Control[] };
export const parameters = (parametersJson as unknown as { parametres: Parameter[] }).parametres;
export const parameterGroups = (parametersJson as unknown as { groupes: Record<string, string> }).groupes;
export const oscillators = oscillatorsJson as unknown as {
  total: number;
  categories: { categorie: string; nomFr: string; de: number; a: number; nombre: number }[];
  oscillateurs: Oscillator[];
};
export const effects = effectsJson as unknown as {
  filtres: { types: Record<"LPF" | "HPF" | "BPF", string[]>; source: Source };
};

export const paramById = new Map(parameters.map((p) => [p.id, p]));

/** Tous les contrôles du panneau (sections, sous-sections, connecteurs) avec leur section. */
export interface PlacedControl extends Control { sectionId: string; sectionNom: string; sectionNum?: number }
export const allControls: PlacedControl[] = [
  ...panel.sections.flatMap((s) => [
    ...(s.controles ?? []).map((c) => ({ ...c, sectionId: s.id, sectionNom: s.nom, sectionNum: s.num })),
    ...(s.sousSections ?? []).flatMap((ss) =>
      ss.controles.map((c) => ({ ...c, sectionId: ss.id, sectionNom: `${s.nom} › ${ss.nom}`, sectionNum: s.num })),
    ),
  ]),
  ...panel.connecteurs.map((c) => ({ ...c, sectionId: "rear", sectionNom: "Face arrière" })),
];
export const controlById = new Map(allControls.map((c) => [c.id, c]));

export const DOCS: Record<DocId, { court: string; fichier: string; pdfOffset: number }> = {
  // Le mode d'emploi est un scan multilingue : page PDF = page imprimée + 16 (section française).
  OM: { court: "Mode d'emploi", fichier: "docs/281ffa.pdf", pdfOffset: 16 },
  PG: { court: "Guide des paramètres", fichier: "docs/electribe_PG_F4.pdf", pdfOffset: 0 },
};

export interface Procedure {
  id: string; titre: string; but: string; etapes: string[]; sources: Source[];
  astuces?: string[]; attention?: string[]; niveau: number;
}
export const procedures = (proceduresJson as unknown as { procedures: Procedure[] }).procedures;
export const procedureById = new Map(procedures.map((p) => [p.id, p]));
