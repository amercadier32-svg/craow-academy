import { ICONS } from "../content/pixelIcons";

/** Dessin pixel art (16 x 16) rendu net à toutes les tailles. */
export function PixelArt({ name, size = 24, className, pal }: { name: string; size?: number; className?: string; pal?: Record<string, string> }) {
  const base = ICONS[name];
  if (!base) return null;
  const ic = pal ? { ...base, pal: { ...base.pal, ...pal } } : base;
  const rects: JSX.Element[] = [];
  ic.rows.forEach((r, y) => {
    let x = 0;
    while (x < r.length) {
      const c = r[x];
      let w = 1;
      while (x + w < r.length && r[x + w] === c) w++;
      if (ic.pal[c]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={ic.pal[c]} />);
      x += w;
    }
  });
  return (
    <svg className={`pixelart ${className ?? ""}`} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden focusable="false">
      {rects}
    </svg>
  );
}
