// Fabrique E2-Academy.html : un seul fichier, sans serveur ni internet, à partir du build (dist/).
// Le CSS et le premier morceau (l'accueil) sont lus tout de suite ; les autres modules attendent dans la page
// sous forme de texte et ne sont lus qu'à leur ouverture (scripts/chargeur.js).
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

// « node scripts/assembler.mjs en-ligne » : version en ligne (GitHub Pages) dans app/site/,
// avec l'icône installable et la copie hors ligne (dossier en-ligne/).
const enLigne = process.argv[2] === "en-ligne";

const dist = new URL("../dist/", import.meta.url);
const html = readFileSync(new URL("index.html", dist), "utf8");
const entree = html.match(/<script[^>]+src="\.\/assets\/([^"]+\.js)"/)[1];
const css = readdirSync(new URL("assets/", dist)).filter((f) => f.endsWith(".css")).map((f) => readFileSync(new URL("assets/" + f, dist), "utf8")).join("\n");
const js = readdirSync(new URL("assets/", dist)).filter((f) => f.endsWith(".js"));
const chargeur = readFileSync(new URL("./chargeur.js", import.meta.url), "utf8");

// Dans une balise <script>, « </script » et « <!-- » couperaient le texte : on les écrit autrement (même sens en JavaScript).
// Dans un morceau, « </script », « </body », « </head » et « </html » (ex. la fiche imprimable du Morceau)
// deviennent « <\/… » : même texte pour JavaScript, mais ni le navigateur ni l'assemblage ne les prennent pour la fin de la page.
const proteger = (t) => t.replace(/<\/(script|body|head|html)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
// Ajoute du texte juste avant la DERNIÈRE balise (la vraie fin de la page, jamais une balise écrite dans un morceau).
const avantDerniere = (t, balise, ajout) => { const i = t.lastIndexOf(balise); return i < 0 ? t + ajout : t.slice(0, i) + ajout + t.slice(i); };
const protegerCss = (t) => t.replace(/<\/(style)/gi, "<\\/$1");

const morceaux = js.map((f) => `<script type="text/plain" data-c="${f}">${proteger(readFileSync(new URL("assets/" + f, dist), "utf8"))}</script>`).join("\n");
const tete = html
  .replace(/\s*<script[^>]+src="[^"]+"[^>]*><\/script>/, "")
  .replace(/\s*<link rel="stylesheet"[^>]*>/, "")
  .replace("</head>", () => `<style>${protegerCss(css)}</style>\n</head>`);
const sortie = tete.replace("</body>", () => `<script>${chargeur}</script>\n${morceaux}\n<script>System.import(${JSON.stringify(entree)}).catch(function (e) { document.getElementById("root").textContent = "L'app n'a pas pu démarrer : " + e.message; });</script>\n</body>`);
if (enLigne) {
  const site = new URL("../site/", import.meta.url), extra = new URL("../en-ligne/", import.meta.url);
  rmSync(site, { recursive: true, force: true });
  mkdirSync(site, { recursive: true });
  for (const f of readdirSync(extra)) if (!f.endsWith(".md") && f !== "maj.js" && f !== "sw.js") copyFileSync(new URL(f, extra), new URL(f, site));
  const avecTete = avantDerniere(sortie, "</head>", `<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" type="image/png" href="icone-192.png">\n<link rel="apple-touch-icon" href="icone-apple.png">\n<meta name="apple-mobile-web-app-title" content="CrAoW">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="theme-color" content="#0e1116">\n`);
  const maj = readFileSync(new URL("maj.js", extra), "utf8");
  const page = avantDerniere(avecTete, "</body>", `<script>${maj}</script>\n`);
  // numéro de version = empreinte de la page : chaque mise en ligne différente déclenche « Nouvelle version disponible »
  const version = createHash("sha256").update(page).digest("hex").slice(0, 12);
  writeFileSync(new URL("sw.js", site), readFileSync(new URL("sw.js", extra), "utf8").replace("__VERSION__", version));
  writeFileSync(new URL("index.html", site), page);
  writeFileSync(new URL(".nojekyll", site), "");
  console.log(`→ version en ligne prête dans app/site/ (${(page.length / 1024).toFixed(0)} Ko, ${js.length} morceaux, version ${version})`);
} else {
  writeFileSync(new URL("../../E2-Academy.html", import.meta.url), sortie);
  console.log(`→ E2-Academy.html mis à jour (${(sortie.length / 1024).toFixed(0)} Ko, ${js.length} morceaux)`);
}
