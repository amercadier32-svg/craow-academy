// Petits outils de texte partagés par toute l'app.

/** Sans accents et en minuscules (pour chercher). */
export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** « Kick Tekno n°2 » → « kick-tekno-n-2 » (noms de fichiers, identifiants). */
export const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
