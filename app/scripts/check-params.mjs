// Vérifie que chaque paramètre affiché par l'app existe dans data/electribe2/parameters.json
// et qu'il a une page de référence. Lancer : npm run check
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../..", import.meta.url).pathname;
const params = JSON.parse(readFileSync(join(root, "data/electribe2/parameters.json"), "utf8")).parametres;
const byId = new Map(params.map((p) => [p.id, p]));
const problems = [];

// 1. Paramètres sans page
for (const p of params) if (!p.source?.page) problems.push(`${p.id} : pas de page de référence`);

// 2. Références depuis panel.json
const panel = readFileSync(join(root, "data/electribe2/panel.json"), "utf8");
for (const m of panel.matchAll(/"parametres": \[([^\]]*)\]/g))
  for (const id of m[1].match(/"([^"]+)"/g) ?? []) {
    const k = id.slice(1, -1);
    if (!byId.has(k)) problems.push(`panel.json → ${k} : absent de parameters.json`);
  }

// 3. Références depuis le code de l'app (params: [...] et paramById.get("..."))
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
for (const f of walk(join(root, "app/src")).filter((f) => /\.(ts|tsx)$/.test(f))) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/params: \[([^\]]*)\]/g))
    for (const id of m[1].match(/"([^"]+)"/g) ?? []) {
      const k = id.slice(1, -1);
      if (!byId.has(k)) problems.push(`${f.replace(root, "")} → ${k} : absent de parameters.json`);
    }
  for (const m of src.matchAll(/(?:\bv\(|paramId=)"([^"]+)"/g))
    if (!byId.has(m[1])) problems.push(`${f.replace(root, "")} → ${m[1]} : absent de parameters.json`);
  for (const m of src.matchAll(/id: "param:([^"]+)"/g))
    if (!byId.has(m[1])) problems.push(`${f.replace(root, "")} → ${m[1]} : absent de parameters.json`);
}

// Relevés intégrés (data/electribe2/releves.json) : chaque plage doit viser un paramètre connu.
const releves = JSON.parse(readFileSync(join(root, "data/electribe2/releves.json"), "utf8"));
for (const k of Object.keys(releves.plages ?? {}))
  if (!byId.has(k)) problems.push(`releves.json → ${k} : absent de parameters.json`);
const relevees = Object.keys(releves.plages ?? {});

// Parcours, Chaîne du son : procédures, contrôles et exercices cités doivent exister.
const procIds = new Set(JSON.parse(readFileSync(join(root, "data/electribe2/procedures.json"), "utf8")).procedures.map((p) => p.id));
const ctlIds = new Set([...panel.matchAll(/"id": "([^"]+)",\s*"nom": "[^"]*",\s*"type"/g)].map((m) => m[1]));
const exIds = new Set([...readFileSync(join(root, "app/src/content/exercises.ts"), "utf8").matchAll(/"(ex\.[\w.]+)"/g)].map((m) => m[1]));
for (const f of ["parcours.ts", "chain.ts"]) {
  const src = readFileSync(join(root, "app/src/content", f), "utf8");
  for (const [key, pool] of [["procedures", procIds], ["controles", ctlIds], ["exercices", exIds]])
    for (const m of src.matchAll(new RegExp(key + ": \\[([^\\]]*)\\]", "g")))
      for (const id of m[1].match(/"([^"]+)"/g) ?? [])
        if (!pool.has(id.slice(1, -1))) problems.push(`${f} → ${key} ${id} : introuvable`);
}

// Recettes : chaque type cité (oscillateur, modulation, effet, valeur de liste, gamme) doit exister dans data/.
{
  const fx = JSON.parse(readFileSync(join(root, "data/electribe2/effects.json"), "utf8"));
  const osc = JSON.parse(readFileSync(join(root, "data/electribe2/oscillators.json"), "utf8")).oscillateurs;
  const seq = JSON.parse(readFileSync(join(root, "data/electribe2/sequencer.json"), "utf8"));
  const lists = {
    "osc.type": osc.map((o) => `${o.n} ${o.nom}`),
    "mod.type": fx.modulation.types.map((t) => `${t.n} ${t.nom}`),
    "ifx.type": fx.ifx.types.map((t) => `${t.n} ${t.nom}`),
    "pat.mfxtype": fx.mfx.types.map((t) => `${t.n} ${t.nom}`),
  };
  // Toutes les recettes : recettes.ts et les fichiers par catégorie (recettesRythme.ts…).
  const src = readdirSync(join(root, "app/src/content")).filter((f) => /^recettes.*\.ts$/.test(f))
    .map((f) => readFileSync(join(root, "app/src/content", f), "utf8")).join("\n");
  for (const m of src.matchAll(/\br\("([^"]+)", "([^"]+)"\)/g)) {
    const [, id, val] = m;
    const p = byId.get(id);
    if (!p) { problems.push(`recettes.ts → ${id} : absent de parameters.json`); continue; }
    const ok = lists[id] ? lists[id].includes(val) : p.valeurs ? p.valeurs.includes(val) : (p.plage ?? "").includes(val);
    if (!ok) problems.push(`recettes.ts → ${id} = « ${val} » : valeur introuvable dans le manuel`);
  }
  const scales = new Set(seq.gammes.liste.map((g) => g.n));
  for (const m of src.matchAll(/scale: (\d+)/g)) if (!scales.has(Number(m[1]))) problems.push(`recettes.ts → gamme ${m[1]} introuvable`);
  // 4 mesures de 16 pas par recette, et au moins 8 recettes par style.
  for (const m of src.matchAll(/mesures: M\(([^)]*)\)/g)) {
    const bars = [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
    if (bars.length !== 4 || bars.some((b) => !/^[.x0-9O~]{16}$/.test(b))) problems.push(`recettes.ts → mesures invalides : ${m[1]}`);
  }

  // Au moins 5 recettes par élément pour les catégories terminées, ids uniques, élément connu.
  const ids = [...src.matchAll(/\bid: "([^"]+)", nom: "[^"]*", styles:/g)].map((m) => m[1]);
  for (const id of new Set(ids)) if (ids.filter((x) => x === id).length > 1) problems.push(`recettes → id en double : ${id}`);
  const rec = readFileSync(join(root, "app/src/content/recettes.ts"), "utf8");
  const elements = [...rec.matchAll(/\{ id: "([a-z-]+)", nom: "[^"]+" \}/g)].map((m) => m[1]);
  const premieres = Object.fromEntries([...rec.matchAll(/"([a-z-]+)": "([a-z-]+)"/g)].map((m) => [m[1], m[2]]));
  const elDe = (body) => body.match(/element: "([a-z-]+)"/)?.[1];
  const parEl = {};
  for (const m of src.matchAll(/\{\s*id: "([^"]+)", nom:([^\n]*styles:[^\n]*)/g)) {
    const el = elDe(m[2]) ?? premieres[m[1]];
    if (!el) { problems.push(`recettes → ${m[1]} : pas d'élément`); continue; }
    if (!elements.includes(el)) problems.push(`recettes → ${m[1]} : élément ${el} inconnu`);
    parEl[el] = (parEl[el] ?? 0) + 1;
  }
  const TERMINEES = ["kick", "hat-ferme", "hat-ouvert", "clap", "snare", "toms", "congas", "shaker", "ride", "roll", "sub", "basse-roulante", "acid", "reese", "lead", "arpege", "stab", "riff", "nappe", "drone", "noise", "voix", "montee", "break", "fill", "coupure", "impact"];
  for (const el of TERMINEES) if ((parEl[el] ?? 0) < 5) problems.push(`recettes → seulement ${parEl[el] ?? 0} recette(s) pour l'élément ${el} (5 minimum)`);
  // Toms : 25 recettes demandées (5 de départ + 20), dont des kits.
  if ((parEl.toms ?? 0) < 28) problems.push(`recettes → seulement ${parEl.toms ?? 0} recettes de toms (28 minimum : 25 toms + 3 kits)`);
  // Kits : chaque partie K("id", 4 mesures) reprend une recette qui existe.
  for (const m of src.matchAll(/\bK\("([^"]+)",([^)]*)\)/g)) {
    if (!ids.includes(m[1])) problems.push(`recettes → kit : recette ${m[1]} introuvable`);
    const bars = [...m[2].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
    if (bars.length !== 4 || bars.some((b) => !/^[.x0-9O~]{16}$/.test(b))) problems.push(`recettes → kit : mesures invalides pour ${m[1]}`);
  }
  for (const st of ["tekno", "tribe", "mentale"]) {
    const n = [...src.matchAll(/styles: \[([^\]]*)\]/g)].filter((m) => m[1].includes(`"${st}"`)).length;
    if (n < 8) problems.push(`recettes.ts → seulement ${n} recettes ${st} (8 minimum)`);
  }
  // Nouveaux styles (octobre 2026) : au moins 2 recettes par style et par sous-catégorie, sauf les vides voulues
  // (élément peu typique du style, listées dans VIDES_STYLES de recettesStylesSuite.ts), pour toutes les catégories.
  {
    const parStyleEl = {};
    for (const m of src.matchAll(/\{\s*id: "([^"]+)", nom:[^\n]*styles: \[([^\]]*)\][^\n]*/g)) {
      const el = elDe(m[0]) ?? premieres[m[1]];
      for (const st of (m[2].match(/"([^"]+)"/g) ?? []).map((x) => x.slice(1, -1))) parStyleEl[`${st}/${el}`] = (parStyleEl[`${st}/${el}`] ?? 0) + 1;
    }
    // Tous les éléments de toutes les catégories ; les vides voulues viennent de VIDES_STYLES (recettesStylesSuite.ts).
    const cats = readFileSync(join(root, "app/src/content/recettes.ts"), "utf8").match(/export const CATEGORIES[\s\S]*?\n\];/)[0];
    const TOUS = [...cats.matchAll(/\{ id: "([^"]+)", nom: "[^"]+" \}/g)].map((m) => m[1]);
    const suite = readFileSync(join(root, "app/src/content/recettesStylesSuite.ts"), "utf8");
    const bloc = suite.slice(suite.indexOf("export const VIDES_STYLES"));
    const VIDES = {};
    for (const m of bloc.matchAll(/"?([a-z-]+)"?: \[([\s\S]*?)\n  \]/g)) VIDES[m[1]] = [...m[2].matchAll(/el: "([^"]+)"/g)].map((x) => x[1]);
    for (const st of ["acid-tribe", "hardtek", "raggatek", "dub-tekno"]) {
      if (!VIDES[st]) { problems.push(`VIDES_STYLES : style ${st} absent`); continue; }
      for (const el of VIDES[st]) {
        if (!TOUS.includes(el)) problems.push(`VIDES_STYLES → ${st} / ${el} : élément inconnu`);
        if (parStyleEl[`${st}/${el}`]) problems.push(`VIDES_STYLES → ${st} / ${el} : marqué vide mais ${parStyleEl[`${st}/${el}`]} recette(s)`);
      }
      for (const el of TOUS)
        if (!VIDES[st].includes(el) && (parStyleEl[`${st}/${el}`] ?? 0) < 2) problems.push(`recettes → ${st} / ${el} : ${parStyleEl[`${st}/${el}`] ?? 0} recette(s), 2 minimum`);
    }
  }
  for (const m of src.matchAll(/exercices: \[([^\]]*)\]/g))
    for (const id of m[1].match(/"([^"]+)"/g) ?? []) if (!exIds.has(id.slice(1, -1))) problems.push(`recettes.ts → exercice ${id} introuvable`);
}

// Fiches des styles (data/electribe2/styles.json) : gammes, effets et kicks du générateur pris dans les listes du manuel.
{
  const st = JSON.parse(readFileSync(join(root, "data/electribe2/styles.json"), "utf8")).styles;
  const fx = JSON.parse(readFileSync(join(root, "data/electribe2/effects.json"), "utf8"));
  const osc = JSON.parse(readFileSync(join(root, "data/electribe2/oscillators.json"), "utf8")).oscillateurs;
  const seq = JSON.parse(readFileSync(join(root, "data/electribe2/sequencer.json"), "utf8"));
  const scales = new Set(seq.gammes.liste.map((g) => g.n));
  const ifx = new Set(fx.ifx.types.map((t) => t.n)), mfx = new Set(fx.mfx.types.map((t) => t.n));
  const kicks = new Set(osc.filter((o) => o.categorie === "Kick").map((o) => o.n));
  const ids = st.map((x) => x.id);
  const attendus = ["tribe", "acid-tribe", "mentale", "hardtek", "tekno", "raggatek", "dub-tekno"];
  if (ids.join() !== attendus.join()) problems.push(`styles.json → ordre ou liste des styles : ${ids.join(", ")}`);
  for (const x of st) {
    const k = `styles.json → ${x.id}`;
    if (!(x.bpm.min <= x.bpm.defaut && x.bpm.defaut <= x.bpm.max)) problems.push(`${k} : BPM habituel hors plage`);
    if (x.caractere?.length !== 2) problems.push(`${k} : le caractère doit tenir en 2 lignes`);
    for (const g of x.gammes) if (!scales.has(g.n)) problems.push(`${k} : gamme ${g.n} introuvable`);
    for (const n of x.effets.ifx) if (!ifx.has(n)) problems.push(`${k} : IFX ${n} introuvable`);
    for (const n of [...x.effets.mfx, ...x.generateur.kick.mfx.types]) if (!mfx.has(n)) problems.push(`${k} : MFX ${n} introuvable`);
    for (const n of x.generateur.kick.osc) if (!kicks.has(n)) problems.push(`${k} : oscillateur ${n} n'est pas un kick`);
    for (const f of x.generateur.kick.ifx) if (!ifx.has(f.n)) problems.push(`${k} : IFX ${f.n} introuvable`);
    for (const lpf of x.generateur.kick.filtre.lpf) if (!fx.filtres.types.LPF.includes(lpf)) problems.push(`${k} : filtre ${lpf} introuvable`);
    for (const b of [...x.generateur.kick.relances, ...x.generateur.kick.variations]) if (!/^[.x]{16}$/.test(b)) problems.push(`${k} : mesure de kick invalide ${b}`);
    for (const p of [...x.generateur.parents, ...x.differences.map((d) => d.avec)]) if (!ids.includes(p)) problems.push(`${k} : style ${p} inconnu`);
  }
}

// Grilles : chaque partie reprend une recette qui existe, 4 mesures de 16 pas, gamme existante.
{
  const rec = readdirSync(join(root, "app/src/content")).filter((f) => /^recettes.*\.ts$/.test(f))
    .map((f) => readFileSync(join(root, "app/src/content", f), "utf8")).join("\n");
  const recIds = new Set([...rec.matchAll(/id: "([^"]+)", nom:/g)].map((m) => m[1]));
  const seq = JSON.parse(readFileSync(join(root, "data/electribe2/sequencer.json"), "utf8"));
  const scales = new Set(seq.gammes.liste.map((g) => g.n));
  const src = readFileSync(join(root, "app/src/content/grilles.ts"), "utf8");
  for (const m of src.matchAll(/P\("([^"]+)",([^)]*)\)/g)) {
    if (!recIds.has(m[1])) problems.push(`grilles.ts → recette ${m[1]} introuvable`);
    const bars = [...m[2].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
    if (bars.length !== 4 || bars.some((b) => !/^[.x0-9O~]{16}$/.test(b))) problems.push(`grilles.ts → mesures invalides pour ${m[1]}`);
  }
  for (const m of src.matchAll(/scale: (\d+)/g)) if (!scales.has(Number(m[1]))) problems.push(`grilles.ts → gamme ${m[1]} introuvable`);
}


// Guide des effets : une fiche par IFX (38) et MFX (32), même numéro et même nom que data/electribe2/effects.json ;
// la synchro au tempo et le Key Sync déduits du nom des modulations doivent correspondre au Guide (p. 14-15).
{
  const fx = JSON.parse(readFileSync(join(root, "data/electribe2/effects.json"), "utf8"));
  const src = readFileSync(join(root, "app/src/content/effets.ts"), "utf8");
  const part = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
  const fiches = (txt) => [
    ...[...txt.matchAll(/n: (\d+), nom: "([^"]+)", famille: "([^"]+)"/g)].map((m) => [Number(m[1]), m[2], m[3]]),
    ...[...txt.matchAll(/\["([^"]+)", (\d+), /g)].map((m) => [Number(m[2]), m[1], "delai"]),
  ];
  const familles = new Set([...src.matchAll(/\{ id: "([a-z]+)", nom: "[^"]+", idee:/g)].map((m) => m[1]));
  for (const [kind, a, b] of [["ifx", "const IFX:", "const MFX:"], ["mfx", "const MFX:", "// Assemblage"]]) {
    const list = fiches(part(a, b));
    const ref = fx[kind].types;
    for (const t of ref) {
      const f = list.filter((x) => x[0] === t.n);
      if (f.length !== 1) problems.push(`effets.ts → ${kind.toUpperCase()} ${t.n} ${t.nom} : ${f.length} fiche(s)`);
      else if (f[0][1] !== t.nom) problems.push(`effets.ts → ${kind.toUpperCase()} ${t.n} : nom « ${f[0][1]} » au lieu de « ${t.nom} »`);
    }
    for (const x of list) if (!familles.has(x[2])) problems.push(`effets.ts → ${kind.toUpperCase()} ${x[0]} : famille ${x[2]} inconnue`);
  }
  for (const t of fx.modulation.types) {
    const first = t.nom.split(" ")[0];
    const bpm = / BPM /.test(t.nom) || /B$/.test(first) || first === "S&HBPM";
    const key = /B$/.test(first);
    if (bpm !== t.bpmSync || key !== t.keySync) problems.push(`effets → modulation ${t.n} ${t.nom} : BPM Sync / Key Sync mal déduits du nom`);
  }
}

const noRange = params.filter((p) => !p.plage && !p.valeurs).map((p) => p.nom);
console.log(`${params.length} paramètres vérifiés.`);
console.log(`Sans plage dans le manuel (couverts par des exercices d'écoute) : ${noRange.join(", ")}`);
console.log(`Plages relevées par Alex et intégrées dans data/electribe2/releves.json : ${relevees.length ? relevees.join(", ") : "aucune pour l'instant"}`);
if (problems.length) { console.log("PROBLÈMES :\n- " + problems.join("\n- ")); process.exit(1); }
console.log("OK : tout paramètre affiché existe et a une page.");
