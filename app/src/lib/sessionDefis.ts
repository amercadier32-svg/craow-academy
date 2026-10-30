// Les défis de Session de chaque machine (chargés seulement avec la page Session ou la page de la machine).
import { DEFIS, type Defi } from "../content/defis";
import { MACHINE_DEFAUT } from "./sessionMachines";

const DEFIS_MACHINES: Record<string, Defi[]> = { electribe2: DEFIS };
export const defisDeMachine = (machine = MACHINE_DEFAUT) => DEFIS_MACHINES[machine] ?? [];
