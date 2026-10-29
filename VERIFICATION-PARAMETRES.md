# Vérification des paramètres

Généré par `npm run rapport` le 2026-10-28.

Question : chaque paramètre affiché dans l'app existe-t-il dans `data/parameters.json`, avec une page du manuel ?

## Résumé

- 73 paramètres dans `data/parameters.json`, 0 sans page.
- 32 paramètres cités par leur identifiant dans le code : 0 absent(s).
- 32 noms en majuscules reconnus comme paramètres, 7 comme fonctions ou menus décrits dans `data/procedures.json`.
- **9 nom(s) affiché(s) absent(s) de `parameters.json`** (liste ci-dessous).

## Paramètres cités par leur identifiant

Tous existent et ont une page. ✅

## Noms affichés absents de parameters.json

Ce sont des noms de fonctions, de menus ou de pages de l'écran que l'app montre sans fiche paramètre. Pour chacun, l'app cite quand même la page du manuel là où il apparaît ; à ajouter à `data/parameters.json` si on veut une fiche.

| Nom | Fichiers |
|---|---|
| ACADEMY | modules/Accueil.tsx |
| BASS BOOSTED | content/mastering.ts, modules/Mastering.tsx |
| BRILLANT | content/mastering.ts, modules/Mastering.tsx |
| CHAUD | content/mastering.ts, modules/Mastering.tsx |
| D2 F2 A2 C3 | content/recettesToms.ts |
| E2 ACADEMY | App.tsx |
| EBU R128 | modules/Mastering.tsx |
| LARGE | content/mastering.ts |
| UIT-R BS.1770 | modules/Mastering.tsx |

## Fonctions et menus (dans procedures.json, pas des paramètres)

- CLEAR SEQUENCE : « Effacer les notes d'une partie », Mode d'emploi p. 32
- DATA UTILITY : « Ouvrir Global, Data Utility, Part Utility », Mode d'emploi p. 32
- EXPORT AUDIO : « Exporter un motif en WAV », Mode d'emploi p. 33
- EXPORT P.SET AUDIO : « Exporter un Pattern Set en WAV », Mode d'emploi p. 33
- MIDI GLOBAL CH : « Régler le canal MIDI », Mode d'emploi p. 33
- PART UTILITY : « Ouvrir Global, Data Utility, Part Utility », Mode d'emploi p. 32
- POLARITY : « Synchroniser avec un autre appareil », Mode d'emploi p. 25

## Paramètres affichés, avec leur page

| Paramètre | id | Page |
|---|---|---|
| ALTERNATE 13-14 | `pat.alt1314` | Guide des paramètres p. 3 |
| ALTERNATE 15-16 | `pat.alt1516` | Guide des paramètres p. 3 |
| AUDIO IN THRU | `glob.audiointhru` | Guide des paramètres p. 7 |
| BEAT | `pat.beat` | Guide des paramètres p. 3 |
| CHAIN MODE | `glob.chainmode` | Guide des paramètres p. 8 |
| CHAIN REPEAT | `pat.chainrepeat` | Guide des paramètres p. 3 |
| CHAIN TO | `pat.chainto` | Guide des paramètres p. 3 |
| CHORD SET | `pat.chordset` | Guide des paramètres p. 3 |
| CLEAR MFX MOTION | `pat.clearmfxmotion` | Guide des paramètres p. 3 |
| CLOCK MODE | `glob.clockmode` | Guide des paramètres p. 6 |
| GATE ARP | `pat.gatearp` | Guide des paramètres p. 3 |
| GATE TIME | `step.gate` | Guide des paramètres p. 5 |
| GLOBAL MIDI CH. | `glob.midich` | Guide des paramètres p. 6 |
| GROOVE DEPTH | `part.groovedepth` | Guide des paramètres p. 4 |
| GROOVE TYPE | `part.groovetype` | Guide des paramètres p. 4 |
| KEY | `pat.key` | Guide des paramètres p. 3 |
| LAST STEP | `part.laststep` | Guide des paramètres p. 4 |
| LENGTH | `pat.length` | Guide des paramètres p. 3 |
| MFX TYPE | `pat.mfxtype` | Guide des paramètres p. 3 |
| MIDI RECEIVE FILTER | `glob.midirx` | Guide des paramètres p. 7 |
| MIDI SEND FILTER | `glob.miditx` | Guide des paramètres p. 7 |
| MOTION SEQ | `part.motionseq` | Guide des paramètres p. 4 |
| NOTE | `step.note` | Guide des paramètres p. 5 |
| PATTERN LEVEL | `pat.level` | Guide des paramètres p. 3 |
| SCALE MODE | `part.scalemode` | Guide des paramètres p. 4 |
| STEP NUMBER | `step.number` | Guide des paramètres p. 5 |
| SWING | `pat.swing` | Guide des paramètres p. 3 |
| SYNC POLARITY | `glob.syncpolarity` | Guide des paramètres p. 7 |
| SYNC UNIT | `glob.syncunit` | Guide des paramètres p. 7 |
| TOUCH SCALE RANGE | `glob.touchrange` | Guide des paramètres p. 7 |
| VELOCITY | `step.velocity` | Guide des paramètres p. 5 |
| VOICE ASSIGN | `part.voiceassign` | Guide des paramètres p. 4 |

## Paramètres sans plage dans le manuel

Affichés avec « à vérifier sur l'écran » et un exercice d'écoute, ou ta plage relevée quand elle existe :

- OSC Edit (`osc.edit`, Mode d'emploi p. 23)
- Pitch (`osc.pitch`, Mode d'emploi p. 23)
- Glide (`osc.glide`, Mode d'emploi p. 23)
- Cutoff (`filter.cutoff`, Mode d'emploi p. 23)
- Resonance (`filter.resonance`, Mode d'emploi p. 23)
- EG Int (`filter.egint`, Mode d'emploi p. 23)
- Depth (`mod.depth`, Mode d'emploi p. 23)
- Speed (`mod.speed`, Mode d'emploi p. 23)
- Level (`amp.level`, Mode d'emploi p. 23)
- Pan (`amp.pan`, Mode d'emploi p. 23)
- Attack (`amp.attack`, Mode d'emploi p. 23)
- Decay/Release (`amp.decay`, Mode d'emploi p. 23)
- IFX Edit (`ifx.edit`, Mode d'emploi p. 23)
- Master Fx X (`mfx.x`, Mode d'emploi p. 31)
- Master Fx Y (`mfx.y`, Mode d'emploi p. 31)

## Mots en majuscules ignorés

Mots courts ou isolés qui ne sont pas des noms de paramètres (vérifiés à la main) : ASIO, FORT, HAUT, HBPM, ISO, LRA, LSB, LUFS, MSB, NFD, PCM, RIFF, UNI, VPM, WAVE.
