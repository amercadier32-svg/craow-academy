import { describe, expect, it } from "vitest";
import oscillators from "../../../../data/electribe2/oscillators.json";
import { PROFIL_PAR_OSC, PROFILS_KICK, profilIdKick } from "./profilsKick";

const kicks = (oscillators.oscillateurs as { nom: string; categorie: string }[]).filter((o) => o.categorie === "Kick").map((o) => o.nom);

describe("profils de kick", () => {
  it("Subsonic n'est pas classé « doux » (régression)", () => {
    expect(profilIdKick("Subsonic")).toBe("subsonic");
  });
  it("les noms durs et doux connus", () => {
    expect(profilIdKick("Hardcore")).toBe("dur");
    expect(profilIdKick("SubBeef")).toBe("doux");
  });
  it("un kick inconnu ou absent est standard", () => {
    expect(profilIdKick("Lazy")).toBe("standard");
    expect(profilIdKick(undefined)).toBe("standard");
  });
  it("chaque nom du mapping existe vraiment dans la liste des 56 kicks", () => {
    for (const nom of Object.keys(PROFIL_PAR_OSC)) expect(kicks).toContain(nom);
  });
  it("chaque profil du mapping existe", () => {
    for (const id of Object.values(PROFIL_PAR_OSC)) expect(PROFILS_KICK[id]).toBeDefined();
  });
});
