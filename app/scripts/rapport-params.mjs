// Rapport final : chaque nom de paramètre affiché par l'app (en MAJUSCULES comme sur l'écran de l'E2,
// ou cité par son id) existe-t-il dans data/electribe2/parameters.json, avec une page ?
// Lancer : npm run rapport  → écrit VERIFICATION-PARAMETRES.md à la racine du projet.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../..", import.meta.url).pathname;
const params = JSON.parse(readFileSync(join(root, "data/electribe2/parameters.json"), "utf8")).parametres;
const procs = JSON.parse(readFileSync(join(root, "data/electribe2/procedures.json"), "utf8")).procedures;
const byId = new Map(params.map((p) => [p.id, p]));
const norm = (s) => s.toUpperCase().replace(/\s+/g, " ").trim();
const byNom = new Map(params.map((p) => [norm(p.nom), p]));
const procTxt = procs.map((p) => ({ p, t: norm([p.titre, ...p.etapes, ...(p.astuces ?? [])].join(" ")) }));
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(join(root, "app/src")).filter((f) => /\.(ts|tsx)$/.test(f));
// Noms de types tirés des listes du manuel (oscillateurs, filtres, effets, gammes) : ce sont des valeurs, pas des paramètres.
const valeursListes = new Set();
{
  const osc = JSON.parse(readFileSync(join(root, "data/electribe2/oscillators.json"), "utf8")).oscillateurs;
  const fx = JSON.parse(readFileSync(join(root, "data/electribe2/effects.json"), "utf8"));
  const seq = JSON.parse(readFileSync(join(root, "data/electribe2/sequencer.json"), "utf8"));
  for (const x of [...osc, ...fx.modulation.types, ...fx.ifx.types, ...fx.mfx.types, ...seq.gammes.liste]) valeursListes.add(norm(x.nom));
  for (const p of params) for (const v of p.valeurs ?? []) valeursListes.add(norm(v));
}
/** Texte affiché : contenu des chaînes ("…", '…', `…`) et texte JSX entre > et <. Les noms de variables sont ignorés. */
function texteAffiche(src) {
  const out = [];
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) out.push(m[1] ?? m[2] ?? m[3]);
  for (const m of src.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) out.push(m[1]);
  return out.join("\n");
}

// Mots en majuscules qui ne sont pas des paramètres : abréviations, valeurs, formats, notes.
const PAS_PARAM = new Set(["ON", "OFF", "OK", "LFO", "EG", "IFX", "MFX", "BPM", "JSON", "USB", "MIDI", "WAV", "SD", "PDF", "HPF", "LPF", "BPF", "DC", "IN", "OUT", "TIE", "XY", "MIDI IN/OUT", "MIDI IN", "MIDI OUT", "KORG USB-MIDI", "LED", "CHORD", "ADSR", "AD", "SAW", "PWM", "FM", "VCO", "VCF", "KORG", "OM", "PG", "DIY", "AM", "NAME", "WORKING"]);

const vus = new Map(); // nom -> Set(fichiers)
const add = (k, f) => { if (!vus.has(k)) vus.set(k, new Set()); vus.get(k).add(f.replace(root, "")); };
const idsVus = new Map();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const txt = texteAffiche(src);
  // Texte affiché : chaînes et texte JSX. On repère les suites de mots en majuscules (au moins 3 lettres en tout).
  for (const m of txt.matchAll(/(?<![\w.#-])([A-Z][A-Z0-9.]*(?:[ -](?:[A-Z][A-Z0-9.]*|\d+))*)(?![\w(])/g)) {
    // Un nom suivi d'une valeur (« CHORD SET 1 », « SYNC UNIT 1 ») : on garde le nom seul.
    const k = norm(m[1]).replace(/[.]$/, "").replace(/(?: \d+)+$/, "");
    if (k.replace(/[^A-Z]/g, "").length < 3 || PAS_PARAM.has(k) || valeursListes.has(k) || [...valeursListes].some((v) => ` ${v} `.includes(` ${k} `)) || /^[A-G]\d?$/.test(k) || /^[A-G](?: [A-G])+$/.test(k) || /^[.xO0-9~]+$/.test(k) || /^MIDI \d+$/.test(k)) continue;
    // Noms de code (constantes, balises HTML, tracés SVG) attrapés par erreur.
    if (/^M\d/.test(k) || ["BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(k) || (!k.includes(" ") && new RegExp(`(?:const|let|function|type|interface)\\s+${k}\\b|\\b${k}(?:\\.|\\[|\\()|import\\s*\\{[^}]*\\b${k}\\b`).test(src))) continue;
    add(k, f);
  }
  // Paramètres cités par leur id.
  for (const m of src.matchAll(/"((?:osc|filter|mod|amp|mfx|ifx|pat|part|step|glob)\.[a-z0-9]+)"/g)) {
    if (!idsVus.has(m[1])) idsVus.set(m[1], new Set());
    idsVus.get(m[1]).add(f.replace(root, ""));
  }
}

const okParam = [], okFonction = [], absents = [], autres = [];
for (const [k, fs] of [...vus].sort()) {
  const p = byNom.get(k) ?? byNom.get(k + ".");
  if (p) { okParam.push({ k, p, fs }); continue; }
  const pr = procTxt.find((x) => new RegExp(`(^|[^A-Z])${k.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}([^A-Z]|$)`).test(x.t));
  if (pr) { okFonction.push({ k, pr: pr.p, fs }); continue; }
  // Un mot isolé qui fait partie d'un nom de paramètre (ex. CHAIN dans CHAIN TO) n'est pas compté.
  if ([...byNom.keys()].some((n) => n.split(" ").includes(k))) continue;
  (/[A-Z]{3,} [A-Z]{2,}/.test(k) || k.length >= 5 ? absents : autres).push({ k, fs });
}
const idsAbsents = [...idsVus].filter(([id]) => !byId.has(id));
const sansPage = params.filter((p) => !p.source?.page);
const sansPlage = params.filter((p) => !p.plage && !(p.valeurs?.length));
const page = (s) => `${s.doc === "OM" ? "Mode d'emploi" : "Guide des paramètres"} p. ${s.page}`;

const L = [];
L.push("# Vérification des paramètres", "", `Généré par \`npm run rapport\` le ${new Date().toISOString().slice(0, 10)}.`, "",
  "Question : chaque paramètre affiché dans l'app existe-t-il dans `data/electribe2/parameters.json`, avec une page du manuel ?", "");
L.push("## Résumé", "",
  `- ${params.length} paramètres dans \`data/electribe2/parameters.json\`, ${sansPage.length} sans page.`,
  `- ${idsVus.size} paramètres cités par leur identifiant dans le code : ${idsAbsents.length} absent(s).`,
  `- ${okParam.length} noms en majuscules reconnus comme paramètres, ${okFonction.length} comme fonctions ou menus décrits dans \`data/electribe2/procedures.json\`.`,
  `- **${absents.length} nom(s) affiché(s) absent(s) de \`parameters.json\`** (liste ci-dessous).`, "");
L.push("## Paramètres cités par leur identifiant", "");
L.push(idsAbsents.length ? idsAbsents.map(([id, fs]) => `- ❌ \`${id}\` dans ${[...fs].join(", ")}`).join("\n") : "Tous existent et ont une page. ✅", "");
L.push("## Noms affichés absents de parameters.json", "",
  "Ce sont des noms de fonctions, de menus ou de pages de l'écran que l'app montre sans fiche paramètre. Pour chacun, l'app cite quand même la page du manuel là où il apparaît ; à ajouter à `data/electribe2/parameters.json` si on veut une fiche.", "");
L.push(absents.length ? "| Nom | Fichiers |\n|---|---|\n" + absents.map((x) => `| ${x.k} | ${[...x.fs].map((f) => f.replace("app/src/", "")).join(", ")} |`).join("\n") : "Aucun. ✅", "");
L.push("## Fonctions et menus (dans procedures.json, pas des paramètres)", "");
L.push(okFonction.map((x) => `- ${x.k} : « ${x.pr.titre} », ${page(x.pr.sources[0])}`).join("\n"), "");
L.push("## Paramètres affichés, avec leur page", "", "| Paramètre | id | Page |", "|---|---|---|");
for (const x of okParam) L.push(`| ${x.p.nom} | \`${x.p.id}\` | ${page(x.p.source)} |`);
L.push("", "## Paramètres sans plage dans le manuel", "", "Affichés avec « à vérifier sur l'écran » et un exercice d'écoute, ou ta plage relevée quand elle existe :", "",
  sansPlage.map((p) => `- ${p.nom} (\`${p.id}\`, ${page(p.source)})`).join("\n"), "");
L.push("## Mots en majuscules ignorés", "", "Mots courts ou isolés qui ne sont pas des noms de paramètres (vérifiés à la main) : " + autres.map((x) => x.k).join(", ") + ".", "");
writeFileSync(join(root, "VERIFICATION-PARAMETRES.md"), L.join("\n"));
console.log(`Absents : ${absents.length}`); for (const x of absents) console.log(" -", x.k, [...x.fs].join(", "));
console.log("Ids absents :", idsAbsents.map(([i]) => i).join(", ") || "aucun");
console.log("Ignorés :", autres.map((x) => x.k).join(", "));
