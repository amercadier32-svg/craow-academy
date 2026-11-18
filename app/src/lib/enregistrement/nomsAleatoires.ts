// Noms aléatoires pour les enregistrements, en anglais (demande d'Alex, 17/11/2026) : « Acid Fog », « Ghost Kick 7 »…
// Deux mots (un adjectif + un nom, dans l'ordre anglais) et parfois un numéro. Le nom se modifie ensuite à la main.

const NOMS: string[] = [
  "Fog", "Night", "Wave", "Pulse", "Loop", "Machine", "Trance", "Comet", "Frequency", "Rave", "Glow", "Spiral", "Storm",
  "Factory", "Bass", "Pad", "Cave", "Dawn", "Rocket", "Planet", "Kick", "Signal", "Neon", "Thunder", "Ritual", "Groove",
  "Voltage", "Warehouse", "Crystal", "Echo", "Drone", "Tunnel", "Metal", "Orbit", "Pulsar", "Mirage", "Circuit", "Beat",
  "Ray", "Vertigo", "Engine", "Shadow", "Tribe", "Riot", "Sound System", "Teknival", "Bunker", "Static",
];

const ADJECTIFS: string[] = [
  "Acid", "Ghost", "Blue", "Hypnotic", "Wild", "Nocturnal", "Electric", "Lunar", "Deep", "Burning", "Dark", "Magnetic",
  "Infinite", "Frozen", "Red", "Distant", "Secret", "Cosmic", "Tribal", "Slow", "Fast", "Golden", "Lost", "Raw",
  "Analog", "Mental", "Liquid", "Saturated", "Sunken", "Celestial", "Heavy", "Broken", "Midnight", "Toxic", "Twisted", "Underground",
];

const au = <T,>(t: T[], r: () => number) => t[Math.floor(r() * t.length)];

/** Un nom au hasard, différent de ceux déjà pris (`pris`, sans tenir compte des majuscules). */
export function nomAleatoire(pris: Iterable<string> = [], r: () => number = Math.random): string {
  const deja = new Set([...pris].map((x) => x.trim().toLowerCase()));
  for (let i = 0; i < 40; i++) {
    const base = `${au(ADJECTIFS, r)} ${au(NOMS, r)}`;
    const choix = r() < 0.3 ? `${base} ${1 + Math.floor(r() * 99)}` : base;
    if (!deja.has(choix.toLowerCase())) return choix;
  }
  return `${au(NOMS, r)} ${Date.now() % 1000}`;
}

/** Nom de fichier tiré du nom choisi : « acid-fog_2026-11-17_00h45.wav ». */
export function fichierDeNom(nom: string, d = new Date()): string {
  const p = (x: number) => String(x).padStart(2, "0");
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}h${p(d.getMinutes())}`;
  const s = nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${s || "enregistrement"}_${date}.wav`;
}
