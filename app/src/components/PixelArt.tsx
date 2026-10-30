import { ICONS } from "../content/pixelIcons";

// Une forme <path> par couleur (au lieu d'un <rect> par bande de pixels) : beaucoup moins d'éléments
// dans la page, donc un affichage plus rapide, surtout sur téléphone. Calculé une fois par dessin et palette.
const cache = new Map<string, [string, string][]>();

function chemins(name: string, pal?: Record<string, string>): [string, string][] | null {
  const base = ICONS[name];
  if (!base) return null;
  const cle = pal ? `${name}|${JSON.stringify(pal)}` : name;
  const deja = cache.get(cle);
  if (deja) return deja;
  const couleurs = pal ? { ...base.pal, ...pal } : base.pal;
  const parCouleur = new Map<string, string>();
  base.rows.forEach((r, y) => {
    let x = 0;
    while (x < r.length) {
      const c = r[x];
      let w = 1;
      while (x + w < r.length && r[x + w] === c) w++;
      const fill = couleurs[c];
      if (fill) parCouleur.set(fill, (parCouleur.get(fill) ?? "") + `M${x} ${y}h${w}v1h-${w}z`);
      x += w;
    }
  });
  const out = [...parCouleur];
  cache.set(cle, out);
  return out;
}

/** Dessin pixel art (16 x 16) rendu net à toutes les tailles. */
export function PixelArt({ name, size = 24, className, pal }: { name: string; size?: number; className?: string; pal?: Record<string, string> }) {
  const p = chemins(name, pal);
  if (!p) return null;
  return (
    <svg className={`pixelart ${className ?? ""}`} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden focusable="false">
      {p.map(([fill, d]) => <path key={fill} d={d} fill={fill} />)}
    </svg>
  );
}
