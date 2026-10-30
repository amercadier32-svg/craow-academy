// Webcam du mode vidéo : choix de la caméra (page « Réglages audio et vidéo ») et ouverture du flux.
// L'image reste sur l'appareil : elle s'affiche dans la page, rien n'est envoyé sur internet.
// Chaque flux ouvert doit être rendu avec fermerCamera() : la caméra (et son voyant) s'éteint.
import { lireObjet, ecrireJson } from "./stockage";

export interface ReglagesWebcam { deviceId: string; label: string }
const CLE = "e2academy.webcam";
export const lireWebcam = (): ReglagesWebcam => lireObjet(CLE, { deviceId: "", label: "" });
export const ecrireWebcam = (x: ReglagesWebcam) => ecrireJson(CLE, x);

export interface Camera { id: string; label: string }
/** Les caméras de l'appareil (les noms n'apparaissent qu'après une première autorisation). */
export async function listerCameras(): Promise<Camera[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const l = await navigator.mediaDevices.enumerateDevices();
    return l.filter((d) => d.kind === "videoinput").map((d, i) => ({ id: d.deviceId, label: d.label || `Caméra ${i + 1}` }));
  } catch { return []; }
}

/** Ouvre la caméra choisie (sinon celle par défaut), en 1280 × 720 si possible, sans le son. */
export async function ouvrirCamera(r: ReglagesWebcam = lireWebcam()): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("absent");
  const video: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };
  if (r.deviceId) {
    try { return await navigator.mediaDevices.getUserMedia({ audio: false, video: { ...video, deviceId: { exact: r.deviceId } } }); }
    catch (e) {
      // l'identifiant a pu changer : on cherche la caméra par son nom, sinon on prend celle par défaut
      if ((e as DOMException)?.name === "NotAllowedError") throw e;
      const meme = (await listerCameras()).find((c) => c.label === r.label && c.id !== r.deviceId);
      if (meme) return navigator.mediaDevices.getUserMedia({ audio: false, video: { ...video, deviceId: { exact: meme.id } } });
    }
  }
  return navigator.mediaDevices.getUserMedia({ audio: false, video });
}

export function fermerCamera(s: MediaStream | null | undefined) { s?.getTracks().forEach((t) => t.stop()); }

/** Message clair quand la caméra ne s'ouvre pas. */
export function erreurCamera(e: unknown): string {
  const n = (e as DOMException)?.name ?? (e as Error)?.message;
  if (n === "absent") return "Ce navigateur ne donne pas accès à la caméra ici.";
  if (n === "NotAllowedError" || n === "SecurityError") return "Caméra refusée : clique sur l'icône à gauche de l'adresse → Caméra → Autoriser, puis réessaie.";
  if (n === "NotFoundError" || n === "OverconstrainedError") return "Aucune caméra trouvée : vérifie qu'elle est branchée, puis réessaie.";
  if (n === "NotReadableError" || n === "AbortError") return "La caméra est déjà utilisée par un autre logiciel (OBS, Zoom, Teams…) : ferme-le ou arrête sa capture, puis réessaie.";
  return "La caméra ne s'ouvre pas. Vérifie qu'elle est branchée et autorisée, puis réessaie.";
}
