# Données de la Behringer TD-3 (à venir)

Ce dossier recevra les données extraites du manuel de la TD-3, avec la même forme que `data/electribe2/` :
un fichier JSON par sujet (panneau, paramètres, séquenceur, procédures…), chaque valeur avec sa page du manuel.

Pour brancher le guide TD-3 dans l'app : compléter l'entrée `td3` dans `app/src/machines/index.ts`
(retirer `bientot`, ajouter ses groupes de modules), puis importer ces fichiers avec `@data/td3/…`.
