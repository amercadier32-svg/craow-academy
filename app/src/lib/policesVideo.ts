// Polices gratuites du mode vidéo (licence SIL Open Font License, sauf Permanent Marker : licence Apache 2.0 ;
// textes des licences dans src/fonts/video/). Elles sont rangées dans l'app (aucune connexion nécessaire)
// et ne se chargent qu'à l'ouverture du mode vidéo.
import pressStart from "../fonts/video/press-start-2p.woff2?url";
import vt323 from "../fonts/video/vt323.woff2?url";
import unifraktur from "../fonts/video/unifrakturmaguntia.woff2?url";
import sedgwick from "../fonts/video/sedgwick-ave-display.woff2?url";
import marker from "../fonts/video/permanent-marker.woff2?url";
import orbitron from "../fonts/video/orbitron.woff2?url";
import audiowide from "../fonts/video/audiowide.woff2?url";
import monoton from "../fonts/video/monoton.woff2?url";
import glitch from "../fonts/video/rubik-glitch.woff2?url";
import caveat from "../fonts/video/caveat.woff2?url";
import bebas from "../fonts/video/bebas-neue.woff2?url";

export interface Police { id: string; nom: string; genre: string; famille: string; url?: string }
export const POLICES: Police[] = [
  { id: "jersey", nom: "Jersey 10", genre: "pixel", famille: "Jersey 10" },
  { id: "press-start", nom: "Press Start 2P", genre: "pixel arcade", famille: "CrAoW Press Start", url: pressStart },
  { id: "vt323", nom: "VT323", genre: "terminal rétro", famille: "CrAoW VT323", url: vt323 },
  { id: "unifraktur", nom: "UnifrakturMaguntia", genre: "gothique", famille: "CrAoW Unifraktur", url: unifraktur },
  { id: "sedgwick", nom: "Sedgwick Ave Display", genre: "graffiti", famille: "CrAoW Sedgwick", url: sedgwick },
  { id: "marker", nom: "Permanent Marker", genre: "marqueur", famille: "CrAoW Marker", url: marker },
  { id: "orbitron", nom: "Orbitron", genre: "futuriste", famille: "CrAoW Orbitron", url: orbitron },
  { id: "audiowide", nom: "Audiowide", genre: "techno", famille: "CrAoW Audiowide", url: audiowide },
  { id: "monoton", nom: "Monoton", genre: "néon", famille: "CrAoW Monoton", url: monoton },
  { id: "glitch", nom: "Rubik Glitch", genre: "glitch", famille: "CrAoW Glitch", url: glitch },
  { id: "caveat", nom: "Caveat", genre: "manuscrite", famille: "CrAoW Caveat", url: caveat },
  { id: "bebas", nom: "Bebas Neue", genre: "affiche", famille: "CrAoW Bebas", url: bebas },
];
export const policeDe = (id: string) => POLICES.find((p) => p.id === id) ?? POLICES[0];
export const famille = (id: string) => `"${policeDe(id).famille}", "Jersey 10", sans-serif`;

let chargement: Promise<void> | null = null;
/** Ajoute les polices au document (une seule fois). */
export function chargerPolices(): Promise<void> {
  if (chargement) return chargement;
  chargement = Promise.all(POLICES.filter((p) => p.url).map(async (p) => {
    try {
      const f = new FontFace(p.famille, `url(${p.url}) format("woff2")`, { display: "swap" });
      document.fonts.add(f);
      await f.load();
    } catch { /* police illisible : le texte garde la police pixel */ }
  })).then(() => undefined);
  return chargement;
}
