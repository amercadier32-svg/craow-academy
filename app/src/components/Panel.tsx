import type { CSSProperties } from "react";
import { ITEMS, PHOTO, SECTION_MARKERS, SECTION_TITLES, type Item } from "../content/panelGeometry";
import { controlById } from "../lib/data";

export type PadMode = "trigger" | "sequencer" | "keyboard" | "chord" | "stepjump" | "patternset";
export const PAD_MODES: PadMode[] = ["trigger", "sequencer", "keyboard", "chord", "stepjump", "patternset"];

export interface PanelProps {
  sel: { id: string; index?: number } | null;
  onPick: (id: string, index?: number) => void;
  classFor: (id: string) => string;        // recherche / Shift
  padMode: PadMode | null;
  block: number;                            // bloc de 16 pas choisi par les boutons Step (0-3)
  showNumbers: boolean;
  lcd: { l1: string; l2: string; l3: string };
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function box(it: Item): CSSProperties {
  const w = it.w ?? (it.r ?? 10) * 2;
  const h = it.h ?? (it.r ?? 10) * 2;
  return {
    left: pct(it.cx - w / 2 - PHOTO.x0, PHOTO.w),
    top: pct(it.cy - h / 2 - PHOTO.y0, PHOTO.h),
    width: pct(w, PHOTO.w),
    height: pct(h, PHOTO.h),
  };
}

const at = (cx: number, cy: number): CSSProperties => ({ left: pct(cx - PHOTO.x0, PHOTO.w), top: pct(cy - PHOTO.y0, PHOTO.h) });

/** Pas affiché sur un pad en mode Sequencer : bloc.pas (format de STEP NUMBER, Guide p. 5). */
export const stepLabel = (block: number, pad: number) => `${block + 1}.${String(pad + 1).padStart(2, "0")}`;

export function Panel({ sel, onPick, classFor, padMode, block, showNumbers, lcd }: PanelProps) {
  return (
    <div className="e2" role="group" aria-label="Panneau de la machine, d'après ta photo">
      <span className="e2-brand" aria-hidden>
        <b>CrAoW ACADEMY</b>
        <small>carte d'apprentissage</small>
      </span>
      {SECTION_TITLES.map((t) => (
        <span key={t.text} className="e2-title" style={at(t.cx, t.cy)} aria-hidden>{t.text}</span>
      ))}

      {ITEMS.map((it) => {
        const c = controlById.get(it.id);
        const key = `${it.id}-${it.index ?? 0}`;
        const isSel = sel?.id === it.id && (it.kind === "pad" || it.kind === "step" ? sel.index === it.index : true);
        const name = it.kind === "pad" ? `Pad ${(it.index ?? 0) + 1}` : it.kind === "step" ? `Step ${(it.index ?? 0) + 1}` : c?.nom ?? it.id;
        const lit =
          (PAD_MODES as string[]).includes(it.id) ? padMode === it.id :
          it.kind === "step" ? padMode === "sequencer" && block === it.index : false;
        const classes = ["ctl", `e2-${it.kind}`, classFor(it.id), isSel ? "is-sel" : "", lit ? "is-lit" : ""].join(" ");
        const pick = () => onPick(it.id, it.kind === "pad" || it.kind === "step" ? it.index : undefined);

        let inner: React.ReactNode = null;
        if (it.kind === "pad") {
          const i = it.index ?? 0;
          inner =
            padMode === "sequencer" ? (<><span className="pad-led" /><span className="pad-num">{i + 1}</span><span className="pad-step">{stepLabel(block, i)}</span></>) :
            padMode === "stepjump" ? (<><span className="pad-led" /><span className="pad-num">{i + 1}</span><span className="pad-step">→ pas {i + 1}</span></>) :
            (<><span className="pad-led" /><span className="pad-num">{i + 1}</span></>);
        } else if (it.kind === "display") {
          inner = (<span className="lcd"><span className="lcd-1">{lcd.l1}</span><span className="lcd-2">{lcd.l2}</span><span className="lcd-3">{lcd.l3}</span></span>);
        } else if (it.kind === "touchpad") {
          inner = <span className="tp-hint">X ↔ · Y ↕</span>;
        } else if (it.kind.startsWith("knob")) {
          inner = (<><span className="cap" aria-hidden />{it.label && <span className={`lbl lbl-${it.labelAt}`}>{it.label}</span>}</>);
        } else if (it.kind === "power") {
          inner = <span className="lbl lbl-above">{it.label}</span>;
        } else if (it.kind === "step") {
          inner = (<><span className="led" aria-hidden /><span className="step-n">{it.label}</span></>);
        } else {
          inner = <span className="txt">{it.label}</span>;
        }
        return (
          <button key={key} type="button" className={classes} style={box(it)} onClick={pick} title={name} aria-label={name} aria-pressed={isSel}>
            {inner}
          </button>
        );
      })}

      {showNumbers && SECTION_MARKERS.map((m) => (
        <span key={m.n} className="e2-marker" style={at(m.cx, m.cy)} aria-hidden>{m.n}</span>
      ))}
    </div>
  );
}
