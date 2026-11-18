// Envoie les gros calculs au worker ; si le navigateur refuse le worker (page très protégée), on calcule dans la page.
import MasterWorker from "./masterWorker?worker&inline";
import { traiter, type Demande, type Reponse } from "./masterTravail";

type Attente = { d: Demande; ok: (r: Extract<Reponse, { ok: true }>) => void; ko: (e: Error & { annule?: boolean }) => void; progres?: (x: number) => void };
const attentes = new Map<number, Attente>();
let suivant = 1;
let worker: Worker | null = null;
let essaye = false;
export let enArrierePlan = false;

function recevoir(r: Reponse) {
  const a = attentes.get(r.id);
  if (!a) return;
  if ("progres" in r) { a.progres?.(r.progres); return; }
  attentes.delete(r.id);
  if (r.ok) a.ok(r);
  else { const e = new Error(r.erreur) as Error & { annule?: boolean }; e.annule = r.annule; a.ko(e); }
}

function obtenir(): Worker | null {
  if (essaye) return worker;
  essaye = true;
  try {
    worker = new MasterWorker();
    worker.onmessage = (e) => recevoir(e.data as Reponse);
    worker.onerror = () => basculerDansLaPage();
    enArrierePlan = true;
  } catch { worker = null; }
  return worker;
}

const charges = new Map<string, Demande>();

/** Le worker a planté (ou a été bloqué) : on refait tout dans la page. */
function basculerDansLaPage() {
  worker?.terminate(); worker = null; enArrierePlan = false;
  for (const c of charges.values()) void traiter(c, () => {});
  for (const a of attentes.values()) if (a.d.type !== "charger") void traiter(a.d, recevoir); else recevoir({ id: a.d.id, ok: true });
}

type SansId<T> = T extends unknown ? Omit<T, "id"> : never;

export function demander(d: SansId<Demande>, progres?: (x: number) => void): Promise<Extract<Reponse, { ok: true }>> {
  const id = suivant++;
  const full = { ...d, id } as Demande;
  return new Promise((ok, ko) => {
    attentes.set(id, { d: full, ok, ko, progres });
    if (full.type === "charger") charges.set(full.cle, full);
    const w = obtenir();
    if (w) {
      try { w.postMessage(full); return; } catch { /* on retombe sur le calcul dans la page */ }
    }
    void traiter(full, recevoir);
  });
}
