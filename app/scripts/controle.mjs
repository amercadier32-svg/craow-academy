// Script de contrôle de CrAoW ACADEMY. À relancer après chaque modification :   npm run controle
// Il vérifie :
//  1. chaque paramètre affiché existe dans les données et a une page de manuel (avec scripts/check-params.mjs),
//     et chaque page citée existe dans le PDF ;
//  2. aucune recette (de l'app ou générée 🎲) n'utilise un oscillateur, un effet ou une modulation absents des données ;
//  3. la notation des notes est partout celle de l'E2 (dièses, numéro d'octave, C4 = MIDI 60, jamais de bémol) ;
//  4. aucun lien n'est cassé (liens internes #…, fichiers PDF, fiches visées, raccourcis clavier) ;
//  5. le fichier E2-Academy.html est complet (chaque morceau de l'app se lit sans erreur) ;
//  6. tes anciennes données passent bien par les migrations (rien n'est perdu ni abîmé) ;
//  7. rien de privé n'est publié sur GitHub (manuels Korg, données personnelles, sauvegardes, README).
// « npm run controle -- --internet » teste en plus les liens vers internet (manuels sur le site de Korg, version en ligne).
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
// Réglages complets affichés dans la fenêtre de chaque recette (tous les paramètres de la partie, bloc par bloc).
const PARAM_VIRTUELS = new Set(["type-filtre", "synchro-mod"]);   // expliqués par la page du bloc
const paramIds = new Map(D.parameters.map((p) => [p.id, p]));
let nChamps = 0;
const champsVus = new Set();
for (const b of D.BLOCS_FENETRE) for (const c of b.champs) if (!PARAM_VIRTUELS.has(c) && !paramIds.has(c)) pb("paramètres", `fenêtre des recettes, bloc ${b.titre} : « ${c} » absent des données`);
for (const rc of D.RECETTES) for (const reg of [rc.reglages ?? [], ...(rc.variantes ?? []).map((v) => [...(rc.reglages ?? []), ...(v.reglages ?? [])])]) {
  let blocs;
  try { blocs = D.blocsComplets(reg); } catch (e) { pb("paramètres", `fenêtre de la recette « ${rc.nom} » : ${e.message}`); continue; }
  for (const b of blocs) {
    sources.push({ ...b.src, ou: `bloc ${b.titre}` });
    for (const l of b.lignes) {
      nChamps++;
      if (champsVus.has(l.param)) continue;
      champsVus.add(l.param);
      if (PARAM_VIRTUELS.has(l.param)) continue;
      const p = paramIds.get(l.param);
      if (!p) pb("paramètres", `fenêtre des recettes, bloc ${b.titre} : « ${l.param} » absent des données`);
      else if (!p.source?.page) pb("paramètres", `fenêtre des recettes : « ${l.param} » n'a pas de page de manuel`);
    }
  }
}
console.log(`   ${champsVus.size} réglages différents des fenêtres de recette vérifiés (${nChamps} lignes affichées).`);
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
  // Studio : #studio/<onglet>[/…] (les anciennes adresses #mastering, #reference, #visualiseur, #enregistrements, #labo sont redirigées dans App.tsx)
  studio: (a) => ["enregistrer", "visualiser", "analyser", "masteriser"].includes(a),
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
// Chaque fichier qui écoute le clavier a ses raccourcis sur la page « Raccourcis clavier ».
const fichiersRacc = new Set(D.RACCOURCIS.flatMap((g) => g.liste.map((r) => r.fichier)));
for (const f of src) {
  const t = readFileSync(f, "utf8"), rel = f.replace(join(app, "src") + "/", "").replaceAll("\\", "/");
  if (/\b(?:e|ev)\.(?:key|code) === "/.test(t) && !fichiersRacc.has(rel) && !t.includes("controle: pas-de-raccourci")) pb("raccourcis", `${rel} réagit au clavier mais n'apparaît pas sur la page Raccourcis clavier (content/raccourcis.ts)`);
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

// ---------- 6. Migrations de tes données ----------
titre("6. Tes anciennes données après une mise à jour");
{
  const memoire = new Map();
  globalThis.localStorage = {
    get length() { return memoire.size; }, key: (i) => [...memoire.keys()][i] ?? null,
    getItem: (k) => (memoire.has(k) ? memoire.get(k) : null), setItem: (k, v) => { memoire.set(k, String(v)); },
    removeItem: (k) => { memoire.delete(k); }, clear: () => memoire.clear(),
  };
  const remettre = () => { D.etatFormat.plusRecent = false; D.etatFormat.migrees.length = 0; D.etatFormat.erreur = ""; };
  const vers = D.MIGRATIONS.map((m) => m.vers);
  if (Math.max(...vers) !== D.FORMAT) pb("données", `FORMAT = ${D.FORMAT} mais la dernière migration va vers ${Math.max(...vers)}`);
  if (vers.some((v, i) => i > 0 && v <= vers[i - 1])) pb("données", "les migrations doivent être rangées par numéro croissant");
  // a) données d'avant le numéro de format (octobre 2026) : favoris du Guide des effets à part
  const anciennes = {
    "e2academy.v1": JSON.stringify({ version: 1, plages: { "filter.cutoff": { min: 0, max: 127 } }, observations: { "osc.edit": { titre: "Edit", texte: "Ma note" } }, faits: { "lesson:l1": true, "recette:kick-tekno": "2026-10-20T10:00:00.000Z" }, favoris: {} }),
    "e2academy.fx.favoris": JSON.stringify(["mfx-4", "ifx-2"]),
    "e2academy.morceau.encours": JSON.stringify({ nom: "Mon morceau", couches: [{ id: "a" }], bpm: 140 }),
    "e2academy.mastering.presets": JSON.stringify([{ id: "p1", nom: "Tribe" }]),
    "e2academy.sections": JSON.stringify({ "accueil.machines": true }),
  };
  memoire.clear(); for (const [k, v] of Object.entries(anciennes)) memoire.set(k, v);
  remettre(); D.preparerDonnees();
  const v1 = JSON.parse(memoire.get("e2academy.v1") ?? "{}");
  if (memoire.get(D.CLE_FORMAT) !== String(D.FORMAT)) pb("données", `anciennes données : format ${memoire.get(D.CLE_FORMAT)} au lieu de ${D.FORMAT}`);
  if (D.etatFormat.erreur) pb("données", `migration en erreur : ${D.etatFormat.erreur}`);
  if (!v1.favoris?.["fx:mfx-4"] || !v1.favoris?.["fx:ifx-2"]) pb("données", "anciens favoris des effets perdus pendant la migration");
  if (v1.observations?.["osc.edit"]?.texte !== "Ma note" || v1.plages?.["filter.cutoff"]?.max !== 127 || !v1.faits?.["lesson:l1"]) pb("données", "notes, relevés ou leçons faites abîmés par la migration");
  for (const k of ["e2academy.morceau.encours", "e2academy.mastering.presets", "e2academy.sections"]) if (memoire.get(k) !== anciennes[k]) pb("données", `${k} modifié par la migration`);
  if (!v1.testees?.["kick-tekno"]?.on || !v1.faits?.["recette:kick-tekno"]) pb("données", "recette faite pas reprise comme « Testée sur ma machine » (ou fait effacé)");
  // b) migration relancée : rien ne bouge
  const avant = JSON.stringify([...memoire]); remettre(); D.preparerDonnees();
  if (JSON.stringify([...memoire]) !== avant) pb("données", "relancer l'app modifie les données une seconde fois");
  // c) données d'une version plus récente : on n'y touche pas
  memoire.clear(); memoire.set(D.CLE_FORMAT, String(D.FORMAT + 1)); memoire.set("e2academy.v1", "{\"futur\":1}");
  remettre(); D.preparerDonnees();
  if (!D.etatFormat.plusRecent || memoire.get("e2academy.v1") !== "{\"futur\":1}") pb("données", "des données d'une version plus récente ont été modifiées");
  // d) premier lancement
  memoire.clear(); remettre(); D.preparerDonnees();
  if (memoire.get(D.CLE_FORMAT) !== String(D.FORMAT)) pb("données", "premier lancement : numéro de format absent");
  remettre(); delete globalThis.localStorage;
  console.log(`   format ${D.FORMAT}, ${D.MIGRATIONS.length} migration(s) testée(s) sur des données d'avant, une relance, une version plus récente et un premier lancement.`);
}

// ---------- 7. Ce qui part sur GitHub ----------
titre("7. Rien de privé dans la version publiée");
{
  const gi = existsSync(join(root, ".gitignore")) ? readFileSync(join(root, ".gitignore"), "utf8").split(/\r?\n/).map((l) => l.trim()) : null;
  if (!gi) notes.push(".gitignore absent de ce dossier : vérification de la publication sautée");
  else {
    for (const [regle, quoi] of [["docs/", "les manuels Korg et la photo"], ["*.pdf", "les PDF"], ["sauvegardes/", "le dossier sauvegardes"], ["README.md", "le README"],
      ["*releves*.json", "tes relevés"], ["mes-donnees*.json", "tes exports de données"], ["E2-Academy.html", "l'app assemblée avec tes relevés"], ["captures/", "tes captures"]])
      if (!gi.includes(regle)) pb("publication", `.gitignore ne protège plus ${quoi} (ligne « ${regle} » manquante)`);
  }
  // La version en ligne ouvre les manuels sur le site officiel de Korg, jamais une copie des PDF.
  for (const [id, d] of Object.entries(D.DOCS)) if (!/^https:\/\/(?:cdn\.)?korg\.com\//.test(d.korg)) pb("publication", `manuel ${id} : le lien en ligne doit aller sur le site de Korg (${d.korg})`);
  const site = join(app, "site");
  if (existsSync(site)) {
    const pub = fichiers(site);
    for (const f of pub) if (/\.pdf$|releves|mes-donnees|sauvegardes|README/i.test(f)) pb("publication", `${f.replace(app, "")} ne doit pas être publié`);
    for (const f of ["manifest.webmanifest", "sw.js", "icone-192.png", "icone-512.png", "icone-maskable-512.png", "icone-apple.png"]) if (!existsSync(join(site, f))) pb("publication", `version en ligne : ${f} manquant (installation impossible)`);
    console.log(`   ${pub.length} fichiers de la version en ligne (app/site) vérifiés.`);
  }
  console.log("   .gitignore et liens des manuels vérifiés.");
}

// ---------- Liens vers internet (seulement avec --internet) ----------
if (process.argv.includes("--internet")) {
  titre("Liens vers internet");
  const urls = [...Object.values(D.DOCS).map((d) => d.korg), "https://amercadier32-svg.github.io/craow-academy/", "https://amercadier32-svg.github.io/craow-academy/manifest.webmanifest", "https://amercadier32-svg.github.io/craow-academy/sw.js"];
  for (const u of urls) {
    try { const r = await fetch(u, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(20000) }); if (!r.ok) pb("liens", `${u} répond ${r.status}`); else console.log(`   OK ${r.status} ${u.slice(0, 90)}`); }
    catch (e) { pb("liens", `${u.slice(0, 90)} injoignable (${e.cause?.code ?? e.message})`); }
  }
}

console.log("");
for (const n of notes) console.log("note : " + n);
if (problemes.length) { console.log(`\nPROBLÈMES (${problemes.length}) :\n- ` + problemes.join("\n- ")); process.exit(1); }
console.log("OK : paramètres, pages du manuel, recettes, notation des notes, liens, fichier final, migrations des données et publication sont bons.");
