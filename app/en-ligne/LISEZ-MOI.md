# Version en ligne

Fichiers ajoutés seulement à la version en ligne (GitHub Pages) : icônes (dont une « maskable » pour Android), manifeste (pour installer l'app), `sw.js` (pour l'ouvrir sans internet) et `maj.js` (message « Nouvelle version disponible, recharger ? »).

`npm run build:en-ligne` fabrique le site dans `app/site/` : l'app est la même que E2-Academy.html, mais les liens « Manuel » ouvrent les PDF sur le site officiel de Korg. Chaque build reçoit un numéro de version (empreinte de la page), écrit dans `sw.js` : c'est ce qui déclenche le message de mise à jour chez toi.
La version en ligne ne change que quand on le décide : onglet Actions du dépôt → « Mettre l'app en ligne » → Run workflow (.github/workflows/en-ligne.yml).
