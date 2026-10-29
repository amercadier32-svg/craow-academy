// Session par machine : chaque machine a ses défis, ses sessions et sa page.
// L'Electribe 2 garde l'adresse #session (les anciens liens et favoris marchent).
// Pour la TD-3 : ajouter ici { td3: { route: "td3-session", defis: DEFIS_TD3 } },
// un module { id: "td3-session", nom: "Session", icone: "session" } dans src/machines/index.ts,
// et la ligne <Session machine="td3" /> dans App.tsx.
import { createContext, useContext } from "react";
import { DEFIS, type Defi } from "../content/defis";

export const MACHINE_DEFAUT = "electribe2";
export const SESSION_MACHINES: Record<string, { route: string; defis: Defi[] }> = {
  electribe2: { route: "session", defis: DEFIS },
};

/** La machine d'un défi ou d'une session (les anciennes données sans machine sont à l'Electribe 2). */
export const machineDe = (x?: { machine?: string } | null) => x?.machine ?? MACHINE_DEFAUT;
/** « #session » pour l'E2, « #td3-session » plus tard. */
export const routeSession = (machine = MACHINE_DEFAUT) => `#${SESSION_MACHINES[machine]?.route ?? `${machine}-session`}`;
export const defisDeMachine = (machine = MACHINE_DEFAUT) => SESSION_MACHINES[machine]?.defis ?? [];

export const MachineSession = createContext(MACHINE_DEFAUT);
export const useMachineSession = () => useContext(MachineSession);
