// Session par machine : chaque machine a ses défis, ses sessions et sa page.
// L'Electribe 2 garde l'adresse #session (les anciens liens et favoris marchent).
// Pour la TD-3 : ajouter ici { td3: "td3-session" }, ses défis dans lib/sessionDefis.ts,
// un module { id: "td3-session", nom: "Session", icone: "session" } dans src/machines/index.ts,
// et la ligne <Session machine="td3" /> dans App.tsx.
// Ce fichier reste léger (il sert à la barre du minuteur, présente partout) : les défis sont dans sessionDefis.ts.
import { createContext, useContext } from "react";

export const MACHINE_DEFAUT = "electribe2";
const ROUTES: Record<string, string> = { electribe2: "session" };

/** La machine d'un défi ou d'une session (les anciennes données sans machine sont à l'Electribe 2). */
export const machineDe = (x?: { machine?: string } | null) => x?.machine ?? MACHINE_DEFAUT;
/** « #session » pour l'E2, « #td3-session » plus tard. */
export const routeSession = (machine = MACHINE_DEFAUT) => `#${ROUTES[machine] ?? `${machine}-session`}`;

export const MachineSession = createContext(MACHINE_DEFAUT);
export const useMachineSession = () => useContext(MachineSession);
