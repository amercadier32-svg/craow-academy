import { useEffect, useMemo, useRef, useState } from "react";
import { Panel, PAD_MODES, stepLabel, type PadMode } from "../components/Panel";
import { exercisesForControl, exercisesForParam, type Exercise } from "../content/exercises";
import {
  controlById, oscillators, paramById,
  type Parameter, type PlacedControl,
} from "../lib/data";
import { useStore } from "../lib/store";
import { Badge, ObservationBox, SourceRef } from "../components/common";
import { RelevesBar } from "../components/RelevesBar";
import { ExerciseCard } from "../components/ExerciseCard";
import { ParamRow } from "../components/ParamRow";
import { Infos, Rangement } from "../components/Rangement";
import { CarteZoom } from "../components/CarteZoom";

// Zones du panneau pour le rangement commun (sections de data/electribe2/panel.json regroupées).
const ZONES: { id: string; nom: string; icone: string; couleur: string; sections: string[] }[] = [
  { id: "oscillator", nom: "Oscillator", icone: "chaine", couleur: "#ffd84d", sections: ["oscillator"] },
  { id: "filter", nom: "Filter", icone: "potard", couleur: "#3fd6d0", sections: ["filter"] },
  { id: "modulation", nom: "Modulation", icone: "lfo", couleur: "#9b6bff", sections: ["modulation"] },
  { id: "ampeg", nom: "Amp/EG", icone: "enveloppe", couleur: "#ff6a3d", sections: ["ampeg"] },
  { id: "insertfx", nom: "Insert Fx", icone: "effets", couleur: "#e255c8", sections: ["insertfx"] },
  { id: "sequenceur", nom: "Séquenceur et pads", icone: "grille", couleur: "#ff3b3b", sections: ["steps", "partedit", "padmode", "pads"] },
  { id: "jeu", nom: "Lecture et réglages", icone: "lecture", couleur: "#4fd18b", sections: ["transport", "common", "display", "power", "volume", "inputlevel"] },
  { id: "tactile", nom: "Pad tactile", icone: "tactile", couleur: "#6aa2ee", sections: ["touchpad"] },
  { id: "arriere", nom: "Face arrière", icone: "prise", couleur: "#9aa3b2", sections: ["rear", "led"] },
];
const ZONE_CTL = new Map(ZONES.map((z) => [z.id, [...controlById.values()].filter((c) => z.sections.includes(c.sectionId))]));

interface Selection { id: string; index?: number }

const REAR = ["led", "audioout", "audioin", "phones", "syncin", "syncout", "midi", "usb", "dc", "sd"];
const REAR_SHORT: Record<string, string> = {
  audioout: "Out L/R", audioin: "Audio In", syncin: "Sync In", syncout: "Sync Out", midi: "MIDI",
  phones: "Casque", dc: "DC 9V", usb: "USB", sd: "SD", led: "Diode",
};

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function searchText(c: PlacedControl) {
  const params = (c.parametres ?? []).map((id) => paramById.get(id)).filter(Boolean) as Parameter[];
  return norm([
    c.nom, c.fonction, c.sectionNom, ...(c.shift ?? []).map((s) => `${s.combo} ${s.effet}`),
    ...params.map((p) => `${p.nom} ${p.effet}`),
  ].join(" "));
}

export default function MachineMap({ focus }: { focus?: string }) {
  const [sel, setSel] = useState<Selection | null>(focus && controlById.has(focus) ? { id: focus } : null);
  const [query, setQuery] = useState("");
  const [shiftMode, setShiftMode] = useState(false);
  const [padMode, setPadMode] = useState<PadMode | null>(null);
  const [block, setBlock] = useState(0);
  const [showNumbers, setShowNumbers] = useState(false);
  const [zone, setZone] = useState<string | null>(() => (focus ? ZONES.find((z) => ZONE_CTL.get(z.id)!.some((c) => c.id === focus))?.id ?? null : null));
  const dansZone = zone ? new Set(ZONE_CTL.get(zone)!.map((c) => c.id)) : null;
  const detailRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return null;
    const words = q.split(/\s+/);
    const ids = new Set<string>();
    controlById.forEach((c) => {
      const t = searchText(c);
      if (words.every((w) => t.includes(w))) ids.add(c.id);
    });
    return ids;
  }, [query]);

  useEffect(() => {
    if (sel) detailRef.current?.scrollTo({ top: 0 });
  }, [sel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const classFor = (id: string) => {
    const c = controlById.get(id);
    return [
      matches && !matches.has(id) ? "is-dim" : "",
      !matches && dansZone && !dansZone.has(id) ? "is-dim" : "",
      !matches && dansZone && dansZone.has(id) ? "is-hit" : "",
      matches && matches.has(id) ? "is-hit" : "",
      shiftMode && c?.shift?.length ? "has-shift" : "",
      shiftMode && !c?.shift?.length ? "is-dim" : "",
    ].join(" ");
  };

  const onPick = (id: string, index?: number) => {
    if ((PAD_MODES as string[]).includes(id)) setPadMode(id as PadMode);
    if (id === "step" && index !== undefined) setBlock(index);
    setSel({ id, index });
  };

  const selected = sel ? controlById.get(sel.id) : undefined;
  const lcd = selected
    ? {
        l1: selected.sectionNum ? `Section ${selected.sectionNum}` : selected.sectionNom,
        l2: sel?.id === "pads" && sel.index !== undefined
          ? (padMode === "sequencer" ? `Pas ${stepLabel(block, sel.index)}` : `Pad ${sel.index + 1}`)
          : sel?.id === "step" && sel.index !== undefined ? `Step ${sel.index + 1}` : selected.nom,
        l3: padMode === "sequencer" ? `Sequencer · bloc ${block + 1}` : selected.sectionNom,
      }
    : { l1: "CrAoW ACADEMY", l2: "Touche un contrôle", l3: padMode === "sequencer" ? `Sequencer · bloc ${block + 1}` : "Carte de la machine" };

  return (
    <div className={`map ${selected ? "has-sel" : ""}`}>
      <div className="map-main">
        <h2 className="page-title">Carte de la machine</h2>
        <Infos>
          <p>Touche un potard, un bouton ou un pad pour ouvrir sa fiche. Choisir une zone allume ses contrôles sur le panneau.</p>
          <p>Appuie sur <b>Sequencer</b> puis sur un bouton <b>Step 1-4</b> : les pads affichent les 16 pas du bloc choisi. <b>Shift</b> allume les contrôles qui ont une fonction avec Shift, <b>N°</b> montre les numéros de section du mode d'emploi (p. 22-24).</p>
        </Infos>
        <div className="toolbar">
          <input type="search" placeholder="Chercher : glide, sync, motion, sauvegarder…" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="Chercher un contrôle" />
          <button type="button" className={`toggle ${shiftMode ? "on" : ""}`} aria-pressed={shiftMode} onClick={() => setShiftMode(!shiftMode)}>
            Shift
          </button>
          <button type="button" className={`toggle ${showNumbers ? "on-blue" : ""}`} aria-pressed={showNumbers} onClick={() => setShowNumbers(!showNumbers)}
            title="Afficher les numéros de section du mode d'emploi (p. 22-24)">
            N°
          </button>
        </div>
        <Rangement
          racine="Machine"
          labelCategorie="Zone du panneau" labelElement="Contrôle"
          categories={ZONES.map((z) => ({ id: z.id, nom: z.nom, icone: z.icone, couleur: z.couleur, n: ZONE_CTL.get(z.id)!.length,
            elements: ZONE_CTL.get(z.id)!.map((c) => ({ id: c.id, nom: c.nom })) }))}
          cat={zone} onCat={setZone} boutonTout={false}
          element={sel && dansZone?.has(sel.id) ? sel.id : null}
          onElement={(id) => (id ? onPick(id) : setSel(null))}
        />
        {(matches || shiftMode) && (
          <p className="muted small legend">
            {matches ? `${matches.size} contrôle${matches.size > 1 ? "s" : ""} trouvé${matches.size > 1 ? "s" : ""}. ` : ""}
            {shiftMode ? "En surbrillance : les contrôles qui ont une fonction avec Shift. " : ""}
          </p>
        )}
        <CarteZoom focusSel={sel ? `${sel.id}-${sel.index ?? ""}` : undefined}
          mini={<Panel sel={sel} onPick={() => {}} classFor={classFor} padMode={padMode} block={block} showNumbers={false} lcd={lcd} />}>
          <Panel sel={sel} onPick={onPick} classFor={classFor} padMode={padMode} block={block} showNumbers={showNumbers} lcd={lcd} />
        </CarteZoom>

        <section className="rear">
          <h3 className="rear-title">
            Face arrière <Badge kind="interp">Schéma simplifié</Badge>
            <span className="muted small">pas visible sur ta photo · Mode d'emploi p. 25</span>
          </h3>
          <div className="rear-row">
            {REAR.map((id) => {
              const c = controlById.get(id);
              if (!c) return null;
              return (
                <button key={id} type="button" title={c.nom} aria-label={c.nom}
                  className={`ctl jack ${classFor(id)} ${sel?.id === id ? "is-sel" : ""}`} onClick={() => onPick(id)}>
                  <span className="hole" aria-hidden />{REAR_SHORT[id] ?? c.nom}
                </button>
              );
            })}
          </div>
        </section>

        <RelevesBar />
      </div>

      <aside className="detail" ref={detailRef} aria-live="polite">
        {selected ? (
          <ControlDetail c={selected} index={sel?.index} padMode={padMode} block={block} onClose={() => setSel(null)} />
        ) : (
          <EmptyDetail />
        )}
      </aside>
    </div>
  );
}

function EmptyDetail() {
  const { observations, faits } = useStore();
  return (
    <div className="empty">
      <h2>Carte de la machine</h2>
      <p>Touche un élément du schéma pour voir :</p>
      <ul className="ticks">
        <li>sa fonction et la page du manuel <Badge kind="manuel" /></li>
        <li>ses combinaisons avec Shift</li>
        <li>les paramètres qu'il règle, avec leur plage</li>
        <li>un exercice d'écoute quand le manuel ne dit pas tout <Badge kind="pratique" /></li>
        <li>tes notes <Badge kind="obs" /></li>
      </ul>
      <p className="muted small">
        {Object.keys(observations).length} observation(s) notée(s), {Object.keys(faits).length} exercice(s) fait(s). Tout est
        sauvegardé dans ce navigateur.
      </p>
    </div>
  );
}

function ControlDetail({ c, index, padMode, block, onClose }: { c: PlacedControl; index?: number; padMode: PadMode | null; block: number; onClose: () => void }) {
  const params = (c.parametres ?? []).map((id) => paramById.get(id)).filter(Boolean) as Parameter[];
  const exs: Exercise[] = [];
  const seen = new Set<string>();
  [...exercisesForControl(c.id), ...params.flatMap((p) => exercisesForParam(p.id))].forEach((e) => {
    if (!seen.has(e.id)) { seen.add(e.id); exs.push(e); }
  });

  let shifts = c.shift ?? [];
  const focus = c.id === "pads" && index !== undefined ? `Shift + Pad ${index + 1}` : undefined;
  if (focus) shifts = [...shifts.filter((s) => s.combo === focus), ...shifts.filter((s) => s.combo !== focus)];

  const title = c.id === "pads" && index !== undefined ? `Pad ${index + 1}` : c.id === "step" && index !== undefined ? `Step ${index + 1}` : c.nom;
  const showSteps = c.id === "step" || c.id === "sequencer" || (c.id === "pads" && padMode === "sequencer");

  return (
    <div className="detail-inner">
      <div className="detail-top">
        <div>
          <p className="muted small">{c.sectionNum ? `Section ${c.sectionNum} · ` : ""}{c.sectionNom} · {c.type}</p>
          <h2>{title}</h2>
        </div>
        <button type="button" className="close" onClick={onClose} aria-label="Fermer">✕</button>
      </div>

      <div className="block">
        <p className="fn">{c.fonction}</p>
        <SourceRef src={c.source} />
        {c.notes?.map((n) => <p key={n} className="note small">⚠ {n}</p>)}
      </div>

      {showSteps && <StepBlocks block={block} pad={c.id === "pads" && padMode === "sequencer" ? index : undefined} />}

      {shifts.length > 0 && (
        <div className="block">
          <h3>Avec Shift</h3>
          <ul className="shifts">
            {shifts.map((s) => (
              <li key={s.combo} className={s.combo === focus ? "focus" : ""}>
                <kbd>{s.combo}</kbd>
                <span>{s.effet}</span>
                <SourceRef src={s.source} compact />
              </li>
            ))}
          </ul>
        </div>
      )}

      {params.length > 0 && (
        <div className="block">
          <h3>Paramètres réglés</h3>
          {params.map((p) => <ParamRow key={p.id} p={p} />)}
        </div>
      )}

      {c.id === "osc" && <OscCategories />}

      {["keyboard", "touchscale", "chord"].includes(c.id) && (
        <div className="block">
          <h3>Gammes et tonalités</h3>
          <p>Les notes jouées dépendent de KEY (note de départ) et SCALE (gamme). <SourceRef src={{ doc: "PG", page: 3 }} compact /></p>
          <a className="e2-ui-btn" href="#gammes">Voir les 35 gammes, les notes en Ré et en La, et les écouter</a>
        </div>
      )}

      {exs.length > 0 && (
        <div className="block">
          <h3>Ce que le manuel ne dit pas</h3>
          {exs.map((e) => <ExerciseCard key={e.id} ex={e} defaultOpen={exs.length === 1} />)}
        </div>
      )}

      <div className="block">
        <h3>Mes notes sur ce contrôle</h3>
        <ObservationBox id={`control:${c.id}`} titre={`Carte · ${title === c.nom ? c.nom : `${c.nom} (${title})`}`} />
      </div>
    </div>
  );
}

function OscCategories() {
  return (
    <div className="block">
      <h3>Les {oscillators.total} oscillateurs par catégorie</h3>
      <div className="cats">
        {oscillators.categories.map((k) => (
          <div key={k.categorie} className={`cat ${k.categorie === "Synth" ? "hl" : ""}`}>
            <span className="cat-n">{k.de === k.a ? k.de : `${k.de}–${k.a}`}</span>
            <span>{k.nomFr}</span>
            <span className="muted small">{k.nombre}</span>
          </div>
        ))}
      </div>
      <SourceRef src={{ doc: "PG", page: 11 }} />
    </div>
  );
}

/** Les 64 pas : 4 boutons Step = 4 blocs de 16 pas, programmés sur les 16 pads. */
function StepBlocks({ block, pad }: { block: number; pad?: number }) {
  return (
    <div className="block">
      <h3>4 boutons Step × 16 pads = 64 pas</h3>
      {pad !== undefined && (
        <p className="fn">En mode Sequencer, ce pad est le <strong>pas {stepLabel(block, pad)}</strong> (bloc {block + 1}, pas {pad + 1}).</p>
      )}
      <div className="blocks" role="img" aria-label={`Bloc ${block + 1} sélectionné sur 4`}>
        {[0, 1, 2, 3].map((b) => (
          <div key={b} className={`blk ${b === block ? "on" : ""}`}>
            <span className="blk-name">Step {b + 1}</span>
            <span className="blk-cells">
              {Array.from({ length: 16 }, (_, i) => (
                <span key={i} className={`cell ${b === block && i === pad ? "hit" : ""}`} />
              ))}
            </span>
            <span className="blk-range">{b + 1}.01 – {b + 1}.16</span>
          </div>
        ))}
      </div>
      <ul className="facts">
        <li>Chaque bouton Step choisit le bloc de 16 pas que tu édites. <SourceRef src={{ doc: "OM", page: 24 }} compact /></li>
        <li>Avec <kbd>Sequencer</kbd> allumé, les 16 pads sont les 16 pas du bloc : un appui allume ou éteint le pas. <SourceRef src={{ doc: "OM", page: 30 }} compact /></li>
        <li>Les boutons Step règlent aussi la longueur d'enregistrement ; le nombre de diodes rouges allumées la montre. <SourceRef src={{ doc: "OM", page: 30 }} compact /></li>
        <li>LENGTH va de 1 à 4 blocs (64 pas au maximum). <SourceRef src={{ doc: "PG", page: 3 }} compact /></li>
        <li>Le numéro de pas s'écrit bloc.pas, de 1.01 à 4.16 (STEP NUMBER). <SourceRef src={{ doc: "PG", page: 5 }} compact /></li>
      </ul>
    </div>
  );
}
