// Point d'entrée du worker du module Mastering.
import { traiter, type Demande } from "./masterTravail";
self.onmessage = (e: MessageEvent<Demande>) => { void traiter(e.data, (r) => (self as unknown as Worker).postMessage(r)); };
