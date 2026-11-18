// Enregistre un fichier créé par l'app (export des relevés, du carnet).
// Dans la version téléphone, on passe par la fonction de téléchargement de la page qui l'héberge ;
// ailleurs (fichier ouvert sur le PC), par un lien de téléchargement classique.
type Downloads = { save: (r: { filename: string; data: string | Blob }) => Promise<unknown> };
type HoteTelephone = { use?: (name: string) => Promise<unknown> };

/** Renvoie true si le fichier est proposé, false si la personne refuse ou si c'est impossible. */
export async function telecharger(nom: string, contenu: string | Blob, type: string): Promise<boolean> {
  const hote = (window as unknown as { claude?: HoteTelephone }).claude;
  if (hote?.use) {
    const dl = (await hote.use("downloads").catch(() => null)) as Downloads | null;
    if (dl) {
      try { await dl.save({ filename: nom, data: contenu }); return true; } catch { return false; }
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([contenu], { type }));
  a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
