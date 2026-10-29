// Le panneau de la machine sur un petit écran (téléphone, tablette) : il garde sa taille lisible,
// on le fait glisser avec un doigt et on zoome avec deux doigts (ou Ctrl + molette).
// « Voir toute la machine » l'ajuste à l'écran, « Zoom normal » revient à la taille lisible.
// Une mini-carte montre la partie regardée (la toucher y emmène). Toucher un contrôle ouvre sa fiche ;
// un glissement ne déclenche jamais de contrôle.
// Sur un grand écran (le panneau tient en entier), rien ne change : le panneau prend toute la largeur.
import { lireTexte, ecrireTexte } from "../lib/stockage";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const BASE = 820;              // largeur lisible du panneau (px), celle d'avant
const RATIO = 542 / 978;       // hauteur / largeur du panneau
const ZOOM_MAX = 2.5;          // jusqu'à 2,5 × la taille lisible
const SEUIL = 8;               // px : au-delà, c'est un glissement, pas un appui
const CLE_TOURNER = "e2academy.carte.tourner";

interface Vue { z: number; x: number; y: number }

export function CarteZoom({ children, mini, focusSel }: { children: ReactNode; mini: ReactNode; focusSel?: string }) {
  const boite = useRef<HTMLDivElement>(null);
  const fenetre = useRef<HTMLDivElement>(null);
  const plan = useRef<HTMLDivElement>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);          // largeur de la fenêtre du panneau
  const [place, setPlace] = useState(0);  // largeur de la colonne (sans les bords pris sur la marge)
  const [hEcran, setHEcran] = useState(() => window.innerHeight);
  const [portrait, setPortrait] = useState(() => window.matchMedia?.("(orientation: portrait)").matches ?? false);
  const [tourner, setTourner] = useState(() => lireTexte(CLE_TOURNER) !== "vu");
  const [, rafraichir] = useState(0);
  const vue = useRef<Vue>({ z: BASE, x: 0, y: 0 });
  const ajuste = useRef(false);     // « Voir toute la machine » : on garde l'ajustement si l'écran tourne

  const petit = place > 0 && place < BASE;
  const hMax = Math.max(200, Math.round(hEcran * 0.62));
  const zFit = Math.min(W, hMax / RATIO);
  const hFen = (z: number) => Math.min(hMax, Math.max(160, Math.round(z * RATIO)));

  // mesure de la place disponible
  useLayoutEffect(() => {
    const el = boite.current; if (!el) return;
    const col = el.parentElement ?? el;
    const mesurer = () => { setW(el.clientWidth); setPlace(col.clientWidth); };
    const ro = new ResizeObserver(mesurer);
    ro.observe(el); ro.observe(col); mesurer();
    const r = () => { setHEcran(window.innerHeight); setPortrait(window.matchMedia?.("(orientation: portrait)").matches ?? false); };
    window.addEventListener("resize", r); window.addEventListener("orientationchange", r);
    return () => { ro.disconnect(); window.removeEventListener("resize", r); window.removeEventListener("orientationchange", r); };
  }, []);

  /** Garde le panneau dans la fenêtre (centré s'il est plus petit qu'elle). Rend ce qui n'a pas pu bouger en vertical. */
  const borner = useCallback((v: Vue): { v: Vue; resteY: number } => {
    const z = Math.min(BASE * ZOOM_MAX, Math.max(zFit, v.z));
    const h = z * RATIO, H = hFen(z);
    const x = z <= W ? (W - z) / 2 : Math.min(0, Math.max(W - z, v.x));
    let y: number, resteY = 0;
    if (h <= H) y = (H - h) / 2;
    else { const yb = Math.min(0, Math.max(H - h, v.y)); resteY = v.y - yb; y = yb; }
    return { v: { z, x, y }, resteY };
  }, [W, zFit, hMax]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Applique la vue au panneau et à la mini-carte, sans repasser par React (fluide sous le doigt). */
  const appliquer = useCallback(() => {
    const v = vue.current, p = plan.current, f = fenetre.current, c = cadre.current;
    if (!p || !f) return;
    const h = v.z * RATIO, H = hFen(v.z);
    p.style.width = `${v.z}px`;
    p.style.transform = `translate3d(${v.x}px, ${v.y}px, 0)`;
    f.style.height = `${H}px`;
    if (c) {
      const l = Math.max(0, -v.x / v.z), t = Math.max(0, -v.y / h);
      c.style.left = `${l * 100}%`; c.style.top = `${t * 100}%`;
      c.style.width = `${Math.min(1 - l, W / v.z) * 100}%`; c.style.height = `${Math.min(1 - t, H / h) * 100}%`;
    }
  }, [W, hMax]); // eslint-disable-line react-hooks/exhaustive-deps

  const poser = useCallback((v: Vue, ui = false) => {
    const { v: b, resteY } = borner(v);
    vue.current = b; appliquer();
    if (ui) rafraichir((n) => n + 1);
    return resteY;
  }, [borner, appliquer]);

  // la place change (écran tourné…) : on reborne, ou on réajuste
  useEffect(() => {
    if (!petit) return;
    poser(ajuste.current ? { z: zFit, x: 0, y: 0 } : vue.current, true);
  }, [petit, W, hMax]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Zoom autour d'un point de la fenêtre (px). */
  const zoomer = (z: number, px = W / 2, py = hFen(vue.current.z) / 2, ui = true) => {
    const v = vue.current, h = v.z * RATIO;
    const cx = (px - v.x) / v.z, cy = (py - v.y) / h;
    ajuste.current = false;
    poser({ z, x: px - cx * z, y: py - cy * z * RATIO }, ui);
  };
  const toutVoir = () => { ajuste.current = true; poser({ z: zFit, x: 0, y: 0 }, true); };
  const normal = () => zoomer(BASE);

  // un contrôle choisi ailleurs (recherche, zone, liste) et caché hors de la fenêtre : on l'amène au milieu
  useEffect(() => {
    if (!petit || !focusSel) return;
    const t = window.setTimeout(() => {
      const f = fenetre.current, el = plan.current?.querySelector<HTMLElement>(".is-sel");
      if (!f || !el) return;
      const rf = f.getBoundingClientRect(), re = el.getBoundingClientRect();
      if (re.left >= rf.left && re.right <= rf.right && re.top >= rf.top && re.bottom <= rf.bottom) return;
      const v = vue.current;
      poser({ ...v, x: v.x + (rf.left + rf.width / 2) - (re.left + re.width / 2), y: v.y + (rf.top + rf.height / 2) - (re.top + re.height / 2) }, true);
    }, 30);
    return () => window.clearTimeout(t);
  }, [focusSel, petit]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- gestes : un doigt glisse, deux doigts zooment ; un glissement annule l'appui sur le contrôle
  const doigts = useRef(new Map<number, { x: number; y: number }>());
  // positions des doigts à l'écran (clientX/Y) : le défilement de la page ne fausse pas le glissement
  const geste = useRef<{ x0: number; y0: number; v0: Vue; bouge: boolean; page: number; pince?: { d0: number; mx: number; my: number; v0: Vue } } | null>(null);
  const annulerClic = useRef(false);
  const local = (e: { clientX: number; clientY: number }) => { const r = fenetre.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const demarrerPince = () => {
    const [a, b] = [...doigts.current.values()];
    const d0 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const m = local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
    geste.current = { x0: 0, y0: 0, v0: { ...vue.current }, bouge: true, page: 0, pince: { d0, mx: m.x, my: m.y, v0: { ...vue.current } } };
  };
  const ecran = (e: { clientX: number; clientY: number }) => ({ x: e.clientX, y: e.clientY });

  const bas = (e: React.PointerEvent) => {
    if (!petit || (e.pointerType === "mouse" && e.button !== 0)) return;
    annulerClic.current = false;
    if (e.isPrimary) doigts.current.clear(); // nouveau geste : on oublie un doigt dont la levée s'est perdue
    doigts.current.set(e.pointerId, ecran(e));
    if (doigts.current.size === 2) { demarrerPince(); try { fenetre.current?.setPointerCapture(e.pointerId); } catch { /* */ } }
    else if (doigts.current.size === 1) { const p = ecran(e); geste.current = { x0: p.x, y0: p.y, v0: { ...vue.current }, bouge: false, page: 0 }; }
  };
  const bouge = (e: React.PointerEvent) => {
    if (!petit || !doigts.current.has(e.pointerId) || !geste.current) return;
    const p = ecran(e);
    doigts.current.set(e.pointerId, p);
    const g = geste.current;
    if (g.pince && doigts.current.size >= 2) {
      const [a, b] = [...doigts.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), { x: mx, y: my } = local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      const v0 = g.pince.v0, z = v0.z * (d / g.pince.d0);
      const cx = (g.pince.mx - v0.x) / v0.z, cy = (g.pince.my - v0.y) / (v0.z * RATIO);
      ajuste.current = false;
      poser({ z, x: mx - cx * z, y: my - cy * z * RATIO });
      return;
    }
    const dx = p.x - g.x0, dy = p.y - g.y0;
    if (!g.bouge && Math.hypot(dx, dy) < SEUIL) return;
    if (!g.bouge) { g.bouge = true; try { fenetre.current?.setPointerCapture(e.pointerId); } catch { /* */ } }
    const reste = poser({ ...g.v0, x: g.v0.x + dx, y: g.v0.y + dy });
    // le panneau est en butée en haut ou en bas : le reste du geste fait défiler la page, comme ailleurs
    if (e.pointerType !== "mouse" && reste !== g.page) { window.scrollBy(0, -(reste - g.page)); g.page = reste; }
  };
  const haut = (e: React.PointerEvent) => {
    if (!doigts.current.has(e.pointerId)) return;
    doigts.current.delete(e.pointerId);
    const g = geste.current;
    if (g?.bouge) annulerClic.current = true;
    if (doigts.current.size === 1 && g?.pince) {
      // il reste un doigt : il reprend le glissement
      const [p] = [...doigts.current.values()];
      geste.current = { x0: p.x, y0: p.y, v0: { ...vue.current }, bouge: true, page: 0 };
      return;
    }
    if (doigts.current.size === 0) { geste.current = null; rafraichir((n) => n + 1); }
  };
  const clicCapture = (e: React.MouseEvent) => {
    if (annulerClic.current) { e.preventDefault(); e.stopPropagation(); annulerClic.current = false; }
  };
  // Ctrl + molette (ou pincement du pavé tactile) : zoom
  useEffect(() => {
    const f = fenetre.current; if (!f || !petit) return;
    const w = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const r = f.getBoundingClientRect();
      zoomer(vue.current.z * Math.exp(-e.deltaY / 300), e.clientX - r.left, e.clientY - r.top, false);
    };
    f.addEventListener("wheel", w, { passive: false });
    return () => f.removeEventListener("wheel", w);
  });

  // mini-carte : toucher ou glisser y emmène
  const surMini = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.type === "pointermove" && e.buttons === 0 && e.pointerType === "mouse") return;
    if (e.type === "pointerdown") e.currentTarget.setPointerCapture(e.pointerId);
    else if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    const v = vue.current, H = hFen(v.z);
    poser({ ...v, x: W / 2 - fx * v.z, y: H / 2 - fy * v.z * RATIO }, e.type === "pointerup");
  };

  if (!petit) {
    return <div ref={boite} className="cz cz-large">{children}</div>;
  }

  const v = vue.current;
  const pct = Math.round((v.z / BASE) * 100);
  const toutVisible = v.z <= zFit + 1;
  const fermerTourner = () => { setTourner(false); ecrireTexte(CLE_TOURNER, "vu"); };
  return (
    <div ref={boite} className="cz cz-petit">
      <div className="cz-barre" role="toolbar" aria-label="Zoom du panneau">
        <button type="button" className="e2-ui-btn" onClick={toutVoir} disabled={toutVisible}>⤢ Voir toute la machine</button>
        <button type="button" className="e2-ui-btn" onClick={normal} disabled={Math.abs(v.z - BASE) < 2}>🔍 Zoom normal</button>
        <span className="cz-zoom">
          <button type="button" className="chipbtn" onClick={() => zoomer(v.z / 1.25)} disabled={toutVisible} aria-label="Dézoomer">−</button>
          <span className="cz-pct" aria-live="polite">{pct} %</span>
          <button type="button" className="chipbtn" onClick={() => zoomer(v.z * 1.25)} disabled={v.z >= BASE * ZOOM_MAX - 1} aria-label="Zoomer">+</button>
        </span>
      </div>
      <div ref={fenetre} className="cz-fenetre" onPointerDown={bas} onPointerMove={bouge} onPointerUp={haut} onPointerCancel={haut} onClickCapture={clicCapture}>
        <div ref={plan} className="cz-plan">{children}</div>
        <div className={`cz-mini ${toutVisible ? "cache" : ""}`} aria-label="Mini-carte : la partie de la machine que tu regardes" role="img"
          onPointerDown={(e) => { e.stopPropagation(); surMini(e); }} onPointerMove={(e) => { e.stopPropagation(); surMini(e); }} onPointerUp={(e) => { e.stopPropagation(); surMini(e); }}>
          <div className="cz-mini-panneau" aria-hidden ref={(el) => el?.setAttribute("inert", "")}>{mini}</div>
          <div ref={cadre} className="cz-mini-cadre" />
        </div>
      </div>
      <p className="muted small cz-aide">☝ Glisse avec un doigt · 🤏 zoome avec deux doigts · touche un contrôle pour ouvrir sa fiche</p>
      {portrait && tourner && (
        <p className="cz-tourner small"><span aria-hidden>📱↻</span> Tourne ton téléphone à l'horizontale pour voir la machine en plus grand.
          <button type="button" onClick={fermerTourner} aria-label="Ne plus afficher ce conseil">✕</button></p>
      )}
    </div>
  );
}
