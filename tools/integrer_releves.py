"""Intègre un fichier « Exporter mes relevés » (JSON) dans data/electribe2/releves.json.

Usage : python3 tools/integrer_releves.py mes-donnees.json
Accepte les fichiers « Exporter mes données » (type donnees) et les anciens « Exporter mes relevés » (type releves).
Pour chaque plage ou note, la version la plus récente (majLe) est gardée.
Les ids inconnus de data/electribe2/parameters.json sont signalés et ignorés.
"""
import json, sys, datetime, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
dest = root / "data" / "electribe2" / "releves.json"
src = json.load(open(sys.argv[1], encoding="utf-8"))
if src.get("type") not in ("releves", "donnees"):
    sys.exit("Ce fichier n'est pas un export « Mes données » de CrAoW ACADEMY.")
base = json.load(open(dest, encoding="utf-8"))
params = {p["id"] for p in json.load(open(root / "data" / "electribe2" / "parameters.json", encoding="utf-8"))["parametres"]}

def newer(a, b):
    return b is None or (a.get("majLe") or "") > (b.get("majLe") or "")

n_pl = n_obs = 0
for pid, p in (src.get("plages") or {}).items():
    if pid not in params:
        print("ignoré (paramètre inconnu) :", pid); continue
    entry = {"min": str(p.get("min", "")).strip(), "max": str(p.get("max", "")).strip(), "majLe": p.get("majLe", "")}
    if newer(entry, base["plages"].get(pid)):
        base["plages"][pid] = entry; n_pl += 1
for oid, o in (src.get("observations") or {}).items():
    entry = {"id": oid, "titre": o.get("titre", oid), "texte": o.get("texte", ""), "majLe": o.get("majLe", "")}
    if entry["texte"].strip() and newer(entry, base["observations"].get(oid)):
        base["observations"][oid] = entry; n_obs += 1
base["meta"]["misAJour"] = datetime.date.today().isoformat()
json.dump(base, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"{n_pl} plage(s) et {n_obs} note(s) intégrées dans data/electribe2/releves.json. Lance ensuite : cd app && npm run build")
