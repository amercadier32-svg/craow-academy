// Fabrique E2-Academy.html : un seul fichier, sans serveur ni internet, à partir du build (dist/).
// Le CSS et le premier morceau (l'accueil) sont lus tout de suite ; les autres modules attendent dans la page
// sous forme de texte et ne sont lus qu'à leur ouverture (scripts/chargeur.js).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const dist = new URL("../dist/", import.meta.url);
const html = readFileSync(new URL("index.html", dist), "utf8");
const entree = html.match(/<script[^>]+src="\.\/assets\/([^"]+\.js)"/)[1];
const css = readdirSync(new URL("assets/", dist)).filter((f) => f.endsWith(".css")).map((f) => readFileSync(new URL("assets/" + f, dist), "utf8")).join("\n");
const js = readdirSync(new URL("assets/", dist)).filter((f) => f.endsWith(".js"));
const chargeur = readFileSync(new URL("./chargeur.js", import.meta.url), "utf8");

// Dans une balise <script>, « </script » et « <!-- » couperaient le texte : on les écrit autrement (même sens en JavaScript).
const proteger = (t) => t.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
const protegerCss = (t) => t.replace(/<\/(style)/gi, "<\\/$1");

const morceaux = js.map((f) => `<script type="text/plain" data-c="${f}">${proteger(readFileSync(new URL("assets/" + f, dist), "utf8"))}</script>`).join("\n");
const tete = html
  .replace(/\s*<script[^>]+src="[^"]+"[^>]*><\/script>/, "")
  .replace(/\s*<link rel="stylesheet"[^>]*>/, "")
  .replace("</head>", () => `<style>${protegerCss(css)}</style>\n</head>`);
const sortie = tete.replace("</body>", () => `<script>${chargeur}</script>\n${morceaux}\n<script>System.import(${JSON.stringify(entree)}).catch(function (e) { document.getElementById("root").textContent = "L'app n'a pas pu démarrer : " + e.message; });</script>\n</body>`);
writeFileSync(new URL("../../E2-Academy.html", import.meta.url), sortie);
console.log(`→ E2-Academy.html mis à jour (${(sortie.length / 1024).toFixed(0)} Ko, ${js.length} morceaux)`);
