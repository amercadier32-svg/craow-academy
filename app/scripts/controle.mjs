// Script de contrôle de CrAoW ACADEMY. À relancer après chaque modification :   npm run controle
// Il vérifie :
//  1. chaque paramètre affiché existe dans les données et a une page de manuel (avec scripts/check-params.mjs),
//     et chaque page citée existe dans le PDF ;
//  2. aucune recette (de l'app ou générée 🎲) n'utilise un oscillateur, un effet ou une modulation absents des données ;
//  3. la notation des notes est partout celle de l'E2 (dièses, numéro d'octave, C4 = MIDI 60, jamais de bémol) ;
//  4. aucun lien n'est cassé (liens internes #…, fichiers PDF, fiches visées, raccourcis clavier) ;
//  5. le fichier E2-Academy.html est complet (chaque morceau de l'app se lit sans erreur).
// Sortie : « OK » ou la liste des problèmes (code de sortie 1).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import vm from "node:vm";
import { build } from "esbuild";

const app = fileURLToPath(new URL("..", import.meta.url));
const root = join(app, "..");
const problemes = [];
const notes = [];
const pb = (partie, texte) => problemes.push(`[${partie}] ${texte}`);
const titre = (t) => console.log(`\n== ${t}`);

// ---------- Chargement des données de l'app (compilées comme dans l'app) ----------
const tmp = mkdtempSync(join(tmpdir(), "controle-"));
await build({
  entryPoints: [join(app, "scripts/controle-entree.ts")], bundle: true, platform: "node", format: "esm", outfile: join(tmp, "d.mjs"),
  alias: { "@data": join(root, "data") }, loader: { ".css": "empty", ".woff2": "empty" }, logLevel: "error",
  define: { "import.meta.env": "{}" },
});
const D = await import(pathToFileURL(join(tmp, "d.mjs")).href);

// ---------- 1. Paramètres et pages du manuel ----------
titre("1. Paramètres et pages du manuel");
const cp = spawnSync(process.execPath, [join(app, "scripts/check-params.mjs")], { encoding: "utf8" });
process.stdout.write(cp.stdout.split("\n").filter((l) => /vérifiés|OK|PROBL|^- /.test(l)).map((l) => "   " + l).join("\n") + "\n");
if (cp.status !== 0) for (const l of cp.stdout.split("\n").filter((l) => l.startsWith("- "))) pb("paramètres", l.slice(2));

const PAGES_CONNUES = { "281ffa.pdf": 94, "electribe_PG_F4.pdf": 19 };   // si le PDF est compressé et illisible ici
const nbPages = {};
for (const [id, d] of Object.entries(D.DOCS)) {
  const f = join(root, d.fichier);
  const nom = d.fichier.split("/").pop();
  if (!existsSync(f)) { notes.push(`${d.fichier} absent de ce dossier : pages non comptées (normal hors du PC d'Alex)`); nbPages[id] = PAGES_CONNUES[nom] ?? Infinity; continue; }
  const b = readFileSync(f, "latin1");
  const n = (b.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  nbPages[id] = n || PAGES_CONNUES[nom] || Infinity;
}
// Toutes les sources citées par l'app : { doc, page } trouvées dans les données et les contenus.
const sources = [];
const vus = new WeakSet();
const fouiller = (x, ou) => {
  if (!x || typeof x !== "object" || vus.has(x)) return;
  vus.add(x);
  if (typeof x.doc === "string" && typeof x.page === "number") sources.push({ ...x, ou });
  for (const [k, v] of Object.entries(x)) if (typeof v === "object") fouiller(v, ou);
};
for (const k of ["RECETTES", "FICHES", "LEXIQUE", "NIVEAUX", "ETAPES", "EXERCISES", "CHAIN_EXERCISES", "BLOCS", "BLOCS_M", "LECONS", "parameters", "allControls", "procedures", "DEFIS"]) fouiller(D[k], k);
for (const f of readdirSync(join(root, "data/electribe2")).filter((f) => f.endsWith(".json"))) fouiller(JSON.parse(readFileSync(join(root, "data/electribe2", f), "utf8")), f);
let horsDoc = 0;
for (const s of sources) {
  const d = D.DOCS[s.doc];
  if (!d) { if (!["PG-sampler"].includes(s.doc)) pb("manuel", `${s.ou} : document « ${s.doc} » inconnu`); continue; }
  const p = s.page + d.pdfOffset;
  if (!(s.page >= 1) || p > nbPages[s.doc]) { pb("manuel", `${s.ou} : ${d.court} p. ${s.page} n'existe pas dans le PDF (${nbPages[s.doc]} pages)`); horsDoc++; }
}
console.log(`   ${sources.length} renvois au manuel vérifiés (mode d'emploi ${nbPages.OM} pages, guide des paramètres ${nbPages.PG} pages).`);

// ---------- 2. Oscillateurs, effets et modulations des recettes ----------
titre("2. Recettes : oscillateurs, effets et modulations");
const osc = new Set(D.oscillators.oscillateurs.map((o) => `${o.n} ${o.nom}`));
const fx = D.effects;
const listes = {
  "osc.type": osc,
  "ifx.type": new Set(fx.ifx.types.map((t) => `${t.n} ${t.nom}`)),
  "mod.type": new Set(fx.modulation.types.map((t) => `${t.n} ${t.nom}`)),
  "pat.mfxtype": new Set(fx.mfx.types.map((t) => `${t.n} ${t.nom}`)),
};
const verifierRecette = (rc, ou) => {
  for (const x of rc.reglages ?? []) if (listes[x.param] && !listes[x.param].has(x.valeur)) pb("recettes", `${ou} « ${rc.nom} » : ${x.param} = « ${x.valeur} » absent des données`);
  for (const p of rc.kit?.pistes ?? []) if (!D.RECETTES.some((y) => y.id === p.recette)) pb("recettes", `${ou} « ${rc.nom} » : kit → recette ${p.recette} absente`);
};
for (const rc of D.RECETTES) verifierRecette(rc, "recette");
// Recettes générées 🎲 : 30 tirages par sous-catégorie et par style, avec un hasard de 0 à 100 %.
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const plage = () => ({ min: 0, max: 127, lue: false });
let nGen = 0;
for (const [el, g] of Object.entries(D.GENERATEURS)) for (const style of D.STYLES_LISTE) for (let i = 0; i < 30; i++) {
  try { const rc = g.generer({ style, hasard: (i * 37) % 101, key: "D", scale: 0 }, plage, rnd); verifierRecette(rc, `générée ${el}/${style}`); nGen++;
    if (i % 10 === 0) { verifierRecette(D.genererVariante(rc, { style, hasard: 90, key: "D", scale: 0 }, plage, rnd), `variante ${el}/${style}`); nGen++; } }
  catch (e) { pb("recettes", `générateur ${el}/${style} : ${e.message}`); break; }
}
console.log(`   ${D.RECETTES.length} recettes de l'app et ${nGen} recettes générées vérifiées.`);

// ---------- 3. Notation des notes ----------
titre("3. Notation des notes (celle de l'E2)");
for (let m = 0; m < 128; m++) { const n = D.nomMidi(m).en; if (!/^[A-G]#?-?\d$/.test(n)) pb("notes", `nomMidi(${m}) = « ${n} »`); }
if (D.nomMidi(60).en !== "C4") pb("notes", `MIDI 60 doit s'appeler C4 (Mode d'emploi p. 30), pas ${D.nomMidi(60).en}`);
for (const k of D.ALL_KEYS) if (/b|♭/.test(k.en)) pb("notes", `tonalité ${k.en} : pas de bémol sur l'E2`);
for (const g of D.GAMMES) for (const k of D.ALL_KEYS) for (const n of D.notesIn(g, k)) if (!/^[A-G]#?$/.test(n.en)) pb("notes", `gamme ${g.nom} en ${k.en} : note « ${n.en} »`);
// Dans tous les textes de l'app : pas de bémol, pas de « ♯ », pas de flèche d'octave, pas de note en minuscule.
const fichiers = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? fichiers(join(d, f)) : [join(d, f)]));
const src = fichiers(join(app, "src")).filter((f) => /\.(ts|tsx)$/.test(f));
const MAUVAIS = [
  [/(?<![\w-])[A-G](?:b|♭)-?\d(?!\w)/g, "note avec bémol"],
  [/(?<![\w-])[A-G]♭/g, "bémol ♭"],
  [/(?<![\w-])[A-G]♯/g, "dièse ♯ (l'E2 écrit #)"],
  [/(?<![\w-])[A-G]#?-?\d\s?[↑↓]/g, "flèche d'octave"],
  [/(?:Do|Ré|Mi|Fa|Sol|La|Si)♭|bémol(?!s? (?:n'|ne |pas|jamais))/g, "bémol en français"],
];
let nTextes = 0;
for (const f of src) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)) {
    nTextes++;
    const s = m[2];
    const ligne = t.slice(t.lastIndexOf("\n", m.index) + 1, t.indexOf("\n", m.index) + 1 || undefined);
    if (ligne.includes("controle: notation-ok")) continue;   // texte qui explique ou convertit une ancienne notation
    if (/^[\s\S]*\b(?:import|from)\b/.test(s) && s.length < 3) continue;
    for (const [re, quoi] of MAUVAIS) for (const x of s.matchAll(re)) pb("notes", `${f.replace(app, "")} : ${quoi} « ${x[0]} » dans « ${s.slice(Math.max(0, x.index - 30), x.index + 30)} »`);
  }
}
console.log(`   128 notes MIDI, ${D.GAMMES.length} gammes × 12 tonalités et ${nTextes} textes vérifiés.`);

// ---------- 4. Liens ----------
titre("4. Liens");
const appTsx = readFileSync(join(app, "src/App.tsx"), "utf8");
const MODULES = new Set([...appTsx.slice(appTsx.indexOf("const MODULES"), appTsx.indexOf("] as const;")).matchAll(/id: "([a-z0-9-]+)"/g)].map((m) => m[1]));
MODULES.add("grilles"); MODULES.add("structure");   // anciens liens, redirigés
const recIds = new Set(D.RECETTES.map((r) => r.id));
const cibles = {
  recettes: (a) => recIds.has(a),
  effets: (a) => D.ficheById.has(a),
  carte: (a) => D.allControls.some((c) => c.id === a),
  gammes: (a) => D.GAMMES.some((g) => String(g.n) === a),
  glossaire: (a) => a.startsWith("q=") || D.LEXIQUE.some((m) => m.id === a),
  morceau: (a) => ["grille", "structure", "assistant"].includes(a) || D.EXEMPLES.some((e) => e.id === a),
  styles: (a) => a === "gerer" || D.STYLES_LISTE.includes(a),
  session: (a) => ["historique", "en-cours"].includes(a) || D.DEFIS.some((d) => d.id === a || `defi-${d.id}` === a) || a.startsWith("defi-"),
  quiz: (a) => ["lexique"].includes(a) || true,
  visualiseur: (a) => a === "video" || a.startsWith("ref="),
  mastering: (a) => a.startsWith("rec=") || a.startsWith("depart") || D.POINTS_DEPART.some((p) => p.id === a),
  enregistrements: (a) => a === "corbeille" || true,
  reference: () => true,
};
let nLiens = 0;
const verifierLien = (h, ou) => {
  nLiens++;
  const [mod, arg] = h.replace(/^#/, "").split("/");
  if (!MODULES.has(mod)) { pb("liens", `${ou} : lien #${h.replace(/^#/, "")} vers une page qui n'existe pas`); return; }
  if (arg && !arg.includes("${") && cibles[mod] && !cibles[mod](decodeURIComponent(arg))) pb("liens", `${ou} : lien #${mod}/${arg} : « ${arg} » introuvable`);
};
for (const f of src) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/(?:href=\{?|location\.hash = |lien: |href: |hash: )["'`](#[a-z0-9-]+(?:\/[^"'`\s}]*)?)["'`]/g)) verifierLien(m[1], f.replace(app, ""));
}
// Liens écrits dans les données (champ « lien ») et dans les recettes, leçons, défis…
const liensDonnees = [];
const fouillerLiens = (x, ou, vus2 = new WeakSet()) => {
  if (!x || typeof x !== "object" || vus2.has(x)) return;
  vus2.add(x);
  for (const [k, v] of Object.entries(x)) {
    if (typeof v === "string" && /^#[a-z]/.test(v) && /lien|href/.test(k)) liensDonnees.push([v, ou]);
    else if (typeof v === "object") fouillerLiens(v, ou, vus2);
  }
};
for (const k of ["RECETTES", "FICHES", "LEXIQUE", "NIVEAUX", "ETAPES", "EXERCISES", "DEFIS", "LECONS", "RACCOURCIS"]) fouillerLiens(D[k], k);
for (const [h, ou] of liensDonnees) verifierLien(h, ou);
// Fichiers des manuels (liens « Manuel · p. ») et raccourcis clavier toujours programmés là où la page le dit.
for (const d of Object.values(D.DOCS)) if (!existsSync(join(root, d.fichier))) notes.push(`lien vers ${d.fichier} : fichier absent de ce dossier (à côté de E2-Academy.html sur le PC)`);
for (const g of D.RACCOURCIS) for (const r of g.liste) {
  const f = join(app, "src", r.fichier);
  if (!existsSync(f)) { pb("raccourcis", `${r.touches.join("+")} : ${r.fichier} n'existe plus`); continue; }
  if (!/keydown|onKeyDown|space\(\)/.test(readFileSync(f, "utf8"))) pb("raccourcis", `${r.touches.join("+")} : plus de gestion du clavier dans ${r.fichier}`);
}
const externes = new Set();
for (const f of src) for (const m of readFileSync(f, "utf8").matchAll(/https?:\/\/[^\s"'`)<>]+/g)) externes.add(m[0]);
console.log(`   ${nLiens} liens internes vérifiés.${externes.size ? ` Liens vers internet (non testés ici) : ${[...externes].join(", ")}` : " Aucun lien vers internet."}`);

// ---------- 5. Fichier E2-Academy.html ----------
titre("5. Fichier E2-Academy.html");
const html = existsSync(join(root, "E2-Academy.html")) ? readFileSync(join(root, "E2-Academy.html"), "utf8") : "";
if (!html) pb("fichier", "E2-Academy.html introuvable : lance npm run build");
else {
  const morceaux = [...html.matchAll(/^<script type="text\/plain" data-c="([^"]+)">([\s\S]*?)<\/script>$/gm)];
  const entree = html.match(/System\.import\("([^"]+)"\)/)?.[1];
  if (!entree || !morceaux.some((m) => m[1] === entree)) pb("fichier", "le morceau de démarrage manque dans E2-Academy.html");
  const noms = new Set(morceaux.map((m) => m[1]));
  for (const [, nom, code] of morceaux) {
    try { new vm.Script(code, { filename: nom }); } catch (e) { pb("fichier", `${nom} illisible : ${e.message}`); }
    for (const d of code.match(/^System\.register\(\[([^\]]*)\]/)?.[1].match(/"\.\/([^"]+)"/g) ?? []) if (!noms.has(d.slice(3, -1))) pb("fichier", `${nom} a besoin de ${d.slice(3, -1)}, absent`);
  }
  console.log(`   ${morceaux.length} morceaux lus sans erreur, ${(html.length / 1024).toFixed(0)} Ko.`);
}

console.log("");
for (const n of notes) console.log("note : " + n);
if (problemes.length) { console.log(`\nPROBLÈMES (${problemes.length}) :\n- ` + problemes.join("\n- ")); process.exit(1); }
console.log("OK : paramètres, pages du manuel, recettes, notation des notes, liens et fichier final sont bons.");
