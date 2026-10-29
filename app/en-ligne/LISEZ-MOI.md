# Version en ligne

Fichiers ajoutés seulement à la version en ligne (GitHub Pages) : icônes, manifeste (pour installer l'app) et `sw.js` (pour l'ouvrir sans internet).

`npm run build:en-ligne` fabrique le site dans `app/site/` : l'app est la même que E2-Academy.html, mais les liens « Manuel » ouvrent les PDF sur le site officiel de Korg.
La version en ligne ne change que quand on le décide : onglet Actions du dépôt → « Mettre l'app en ligne » → Run workflow (.github/workflows/en-ligne.yml).
