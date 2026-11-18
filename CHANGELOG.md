# Changelog

## 1.3.1 — 18 novembre 2026 (TD-3 en jaune, carte comme l'Electribe)
Demandé par Alex : même style que la carte de l'Electribe, en jaune (sa TD-3 est jaune), tous les boutons, des fiches visuelles plutôt que des pavés de texte.
### Changé
- **TD-3 · La machine** refaite sur le modèle de la carte de l'E2 : zones en cartes (Le son, Distorsion, Lecture et tempo, Écrire un pattern, Notes/accent/slide, Prises), panneau jaune avec les 32 contrôles du guide à leur place (potards, interrupteurs, sélecteurs, 11 touches, clavier 13 notes, 5 prises, LED), fiche à droite (en bas sur téléphone).
- Chaque fiche : une phrase en gros, un dessin qui bouge avec le potard (filtre, enveloppe, accent, onde, distorsion…), un potard 0-10 à tourner pendant l'écoute, les combinaisons de touches dessinées en touches, le sélecteur MODE et le clavier à toucher.
- Partout dans les pages TD-3 : les noms de touches dans les textes sont dessinés en touches, les étapes sont numérotées. Couleur des pages TD-3 : jaune.
- Aperçu sonore TD-3 : les réglages changent en direct pendant la lecture.

## 1.3.0 — 18 novembre 2026 (guide de la Behringer TD-3, premier noyau)
Demandé par Alex : « fais comme pour la Korg, mais pour la TD-3 ». Nouvelle fonction (hors gel). Sauvegarde avant : `sauvegardes/2026-11-18-avant-tuto-td3/`.
### Ajouté
- **Machines › Behringer TD-3** n'est plus « bientôt » : 2 groupes, 4 modules.
- **Machine** (`#td3-machine`) : panneau argent dessiné (disposition approchée, sans logo), fiche de chaque contrôle avec « Mes observations », trajet du son, prises avant et arrière.
- **Séquenceur** (`#td3-sequenceur`) : les 13 gestes du guide (jouer, transposer, enchaîner, pattern vide, PITCH MODE, TIME MODE, accent et slide, tap, tracks, synchro SYNC/CLOCK, accordage) et la liste de ce que le guide ne dit pas.
- **Parcours** (`#td3-parcours`) : 5 niveaux, 18 leçons, un mini-projet par niveau (cochés dans le Carnet, rubrique « Behringer TD-3 »).
- **Recettes acid** (`#td3-recettes`) : 6 lignes (Acid, Tekno en D, Squelch, Tribe, Hardtek, Dub) sur 4 patterns de 16 pas, avec aperçu sonore, pas allumés pendant la lecture, et les gestes PITCH MODE / TIME MODE pattern par pattern.
- Données : `data/td3/manuel.json` (extrait du guide de démarrage Behringer TD-3, version 5.0). Contrôle : partie « 4 bis. TD-3 ».

## 1.2.1 — 18 novembre 2026 (recettes : seulement les pads)
Demandé par Alex : « je m'en fous de comment construire le son, je veux le pad et la mélodie ». Sauvegarde avant : `sauvegardes/2026-11-18-avant-recettes-pads/`.
### Changé
- **Recette** : la fenêtre ne montre plus la construction du son (« À régler sur l'E2 », « Tous les réglages de la partie », potards de l'aperçu, astuces de son, « Pour régler à l'oreille »). Elle commence par **Les pads** : chaque pad allumé porte la note à y mettre (D3, F3…), « — » = la note continue.
- « Copier vers ma machine » : seulement préparer le motif + les pads, bloc par bloc.
- Variantes : seules celles qui changent la mélodie restent (« Autres mélodies »).

## 1.2.0 — 17 novembre 2026 (app plus pratique devant la machine)
Demandé par Alex après le tour complet de l'app (15 propositions validées : « je te laisse tout faire »). Sauvegarde avant : `sauvegardes/2026-11-17-avant-ergonomie/`.
### Changé
- **Recette** : nouveau bloc « À régler sur l'E2 » tout en haut de la fenêtre (oscillateur, filtre, modulation, effet, potards de la recette), avec « Copier vers ma machine » juste dessous. Le lecteur et le détail complet viennent après.
- **Rappel d'export** : seulement sur l'Accueil et dans Mes données (plus en haut de chaque page).
- **Studio** : « Aucune entrée audio trouvée » devient une ligne discrète, l'aide s'ouvre avec « Pourquoi ? » ; sur téléphone, plus de conseils Windows. Phrase « Si l'app devient un .exe » retirée.
- **Page Electribe 2** : 3 groupes au lieu de 4 (« Sons, effets et gammes » réunit Effets et Gammes).
- **Recettes** : la dernière catégorie et le dernier style choisis se rouvrent ; l'avertissement « approximation » tient en une petite ligne ; plus de 🗑 ni d'étiquette répétée sur les cartes (la 🗑 reste dans la fenêtre de la recette).
- **Carte de la machine** (téléphone) : le dessin de la machine d'abord, les zones ensuite ; bloc « Mes données » retiré de cette page.
- **Accueil** : la TD-3 devient une petite ligne « bientôt » ; badges inutiles retirés.
- **Morceau** : les styles ont leur couleur au lieu d'icônes de catégorie.
- **Cachés** : « Raccourcis clavier » et « (Espace) » sur écran tactile ; numéro de version déplacé dans Mes données.
### Ajouté (demandé par Alex)
- Téléphone : l'écran reste allumé pendant une recette ouverte, une Session ou le Studio.
- Accueil : « Reprendre » (les 3 dernières recettes, défis ou niveaux du Parcours ouverts).
- Téléphone : barre fixe en bas avec Recettes, Session, Studio, Recherche.

## 1.1.0 — 17 novembre 2026 (grand nettoyage)
### Changé
- Nouveau design propre partout (ordi et téléphone) : police lisible unique, coins arrondis, bordures fines, bleu de l'E2 pour ce qui est choisi. Jetons de couleurs et de formes en haut de `styles/theme.css`.
- Code rangé par thème (`modules/creer`, `modules/studio`, `lib/audio`, `lib/mastering`…), 264 règles CSS mortes retirées, `lisibilite.css` fondu dans `theme.css`.
### Ajouté (demandé par Alex)
- Noms aléatoires pour les enregistrements (🎲), modifiables avant et après ; ✏ Renommer dans Mes enregistrements.
### Corrigé
- Téléphone : barre de lecture du Mastering qui couvrait l'écran dans Enregistrer / Visualiser / Analyser ; numéro de version sur le titre ; mots coupés dans les cartes ; cartes de Groove superposées ; onglet « Assistant » qui débordait.
- Double bordure dans la recherche de l'accueil.

## Non publié
### Corrigé
- **Mastering** : « Même volume » (compensation) était activé par défaut et annulait l'effet de Volume, des boosts d'EQ et de la saturation. Éteint par défaut (préférence réinitialisée). Le passe-haut automatique est retiré ; seul le limiteur anti-écrêtage reste.
- **Kick « Subsonic »** : classé « doux » à cause de « sub » dans son nom. Le profil est maintenant choisi par nom exact (`lib/audio/profilsKick.ts`), avec test de non-régression.

### Changé
- Morceau : une seule proposition par défaut, ajout au hasard ou à la main, « Générer tout le morceau » ; onglet Exemples retiré.
- Chaîne du son, détail de recette : icônes et infobulles à la place des textes.
- `seq.ts` : enveloppe, effets et profils de kick séparés dans `lib/audio/`.
- `effects.json` / `oscillators.json` : champ `verified`.

### Encore approximatif (`verified: false`)
- **Punch** (IFX) : transient enhancer supposé, non documenté par Korg ; à comparer en A/B sur la machine.
- Tous les IFX/MFX : l'aperçu est une approximation pédagogique.
- Tous les kicks sauf Subsonic : profil « standard » par défaut, non écouté un par un.
- Génération du morceau : une recette par étape, « compatible » = même élément.
