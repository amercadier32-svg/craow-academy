import { describe, expect, it } from "vitest";
import { fichierDeNom, nomAleatoire } from "./nomsAleatoires";

describe("noms aléatoires des enregistrements", () => {
  it("donne deux ou trois mots, jamais vides", () => {
    for (let i = 0; i < 200; i++) {
      const n = nomAleatoire();
      expect(n.trim().length).toBeGreaterThan(3);
      expect(n.split(" ").length).toBeGreaterThanOrEqual(2);
    }
  });
  it("évite les noms déjà pris", () => {
    const pris = new Set<string>();
    for (let i = 0; i < 100; i++) { const n = nomAleatoire(pris); expect(pris.has(n)).toBe(false); pris.add(n); }
  });
  it("fabrique un nom de fichier propre", () => {
    expect(fichierDeNom("Brume Électrique 7", new Date(2026, 10, 17, 9, 5))).toBe("brume-electrique-7_2026-11-17_09h05.wav");
    expect(fichierDeNom("  ", new Date(2026, 0, 1, 0, 0))).toBe("enregistrement_2026-01-01_00h00.wav");
  });
});
