import { useFermeture } from "./useFermeture";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { PixelArt } from "./PixelArt";
import { MACHINES, positionDe } from "../machines";

/**
 * Menu déroulant « Machines ▼ ».
 * Ordinateur : s'ouvre au survol ou au clic, sous la barre.
 * Téléphone (dans le menu ☰) : accordéon, mêmes groupes.
 */
export function MenuMachines({ ecran }: { ecran: string }) {
  const pos = positionDe(ecran);
  const [ouvert, setOuvert] = useState(false);
  const [deplie, setDeplie] = useState<string | null>(pos?.machine.bientot ? null : pos?.machine.id ?? null);
  const zone = useRef<HTMLDivElement>(null);
  const minuterie = useRef<number>();

  // Changement d'écran : on referme, et la machine de l'écran ouvert reste dépliée.
  useEffect(() => {
    setOuvert(false);
    if (pos && !pos.machine.bientot) setDeplie(pos.machine.id);
  }, [ecran]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clic ailleurs ou Échap : on referme.
  useFermeture(ouvert, () => setOuvert(false), zone);

  const survol = window.matchMedia?.("(hover: hover) and (min-width: 1021px)").matches;
  const ouvertA = useRef(0);
  const entrer = () => {
    if (!survol) return;
    window.clearTimeout(minuterie.current);
    if (!ouvert) { ouvertA.current = Date.now(); setOuvert(true); }
  };
  // Le survol vient d'ouvrir le menu : le clic qui suit ne doit pas le refermer.
  const cliquer = () => setOuvert((o) => (o && Date.now() - ouvertA.current < 600 ? true : !o));
  const sortir = () => { if (!survol) return; minuterie.current = window.setTimeout(() => setOuvert(false), 220); };

  return (
    <div ref={zone} className={`mm ${ouvert ? "open" : ""}`} onMouseEnter={entrer} onMouseLeave={sortir}>
      <button type="button" className={`mm-btn ${pos ? "active" : ""}`} aria-expanded={ouvert} aria-haspopup="true"
              aria-controls="mm-panneau" onClick={cliquer}>
        <PixelArt name="machine" size={22} /> <span>Machines</span> <span className="mm-fleche" aria-hidden>▼</span>
      </button>
      <div id="mm-panneau" className="mm-panneau" role="region" aria-label="Machines">
        {MACHINES.map((m) => {
          const estDeplie = deplie === m.id;
          const tete = (
            <>
              <PixelArt name={m.icone} size={30} pal={m.pal} />
              <span className="mm-mach-nom">
                <b>{m.nom}</b>
                {m.detail && <small>{m.detail}</small>}
              </span>
              {m.bientot ? <span className="mm-bientot">Bientôt</span> : <span className="mm-chevron" aria-hidden>{estDeplie ? "▲" : "▼"}</span>}
            </>
          );
          return (
            <div key={m.id} className={`mm-mach ${m.bientot ? "soon" : ""} ${pos?.machine.id === m.id ? "ici" : ""}`}>
              {m.bientot ? (
                <a className="mm-mach-tete" href={`#${m.id}`} aria-current={ecran === m.id ? "page" : undefined}>{tete}</a>
              ) : (
                <button type="button" className="mm-mach-tete" aria-expanded={estDeplie}
                        onClick={() => setDeplie(estDeplie ? null : m.id)}>{tete}</button>
              )}
              {estDeplie && m.groupes.length > 0 && (
                <div className="mm-groupes">
                  {m.groupes.map((g) => (
                    <section key={g.num} className="mm-groupe" style={{ "--gc": g.couleur } as CSSProperties}>
                      <h4 className="mm-groupe-titre"><span className="mm-num">{g.num}</span> {g.titre}</h4>
                      <div className="mm-liens">
                        {g.modules.map((mod) => {
                          const ici = pos?.machine.id === m.id && pos.module?.id === mod.id;
                          return (
                            <a key={mod.id} href={`#${mod.id}`} className={ici ? "on" : ""} aria-current={ici ? "page" : undefined}>
                              <PixelArt name={mod.icone} size={22} /> <span>{mod.nom}</span>
                            </a>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                  <a className={`mm-glossaire ${ecran === "glossaire" ? "on" : ""}`} href="#glossaire">
                    <PixelArt name="glossaire" size={20} />
                    <span><b>Glossaire et recherche</b> <small>commun à toutes les machines</small></span>
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Repère « Machines › Electribe 2 › Recettes » (seulement dans un module de machine). */
export function Repere({ ecran, nomSousPage }: { ecran: string; nomSousPage?: (id: string) => string | undefined }) {
  const pos = positionDe(ecran);
  if (!pos) return null;
  const etapes: { nom: string; href?: string; couleur?: string }[] = [
    { nom: "Machines" },
    { nom: pos.machine.court, href: pos.module ? undefined : `#${pos.machine.id}` },
  ];
  if (pos.module) etapes.push({ nom: pos.module.nom, href: pos.sousPage ? `#${pos.module.id}` : undefined, couleur: pos.groupe?.couleur });
  if (pos.sousPage) etapes.push({ nom: nomSousPage?.(pos.sousPage) ?? pos.sousPage });
  return (
    <nav className="repere" aria-label="Vous êtes ici">
      {etapes.map((e, i) => (
        <span key={i} className="repere-etape">
          {i > 0 && <span className="repere-sep" aria-hidden>›</span>}
          {e.href && i < etapes.length - 1
            ? <a href={e.href} style={e.couleur ? ({ "--gc": e.couleur } as CSSProperties) : undefined}>{e.nom}</a>
            : <span className={i === etapes.length - 1 ? "repere-ici" : ""} style={e.couleur ? ({ "--gc": e.couleur } as CSSProperties) : undefined}>{e.nom}</span>}
        </span>
      ))}
    </nav>
  );
}
