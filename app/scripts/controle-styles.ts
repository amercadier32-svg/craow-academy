// Les identifiants de styles pour le contrôle (sans dépendre de React).
import stylesJson from "@data/electribe2/styles.json";
export const STYLES_LISTE = (stylesJson as unknown as { styles: { id: string }[] }).styles.map((s) => s.id);
