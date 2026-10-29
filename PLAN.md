# E2 Academy — plan

## 1. Ce que contiennent les PDF de `docs/`

| Fichier | Ce que c'est | Pages utiles | Couvre la Synth ? |
|---|---|---|---|
| `281ffa.pdf` | **Mode d'emploi** commun electribe (Synth) + electribe sampler, en EN/FR/DE/ES (scan manualslib, 94 p.) | Section FR = p. 20–38 (pages imprimées) | Oui pour tout le tronc commun (panneau, jeu, séquenceur, Motion Seq, sauvegarde, Pattern Set, sync). Les p. 34–36 sont réservées au Sampler. |
| `electribe_sampler_PG_F3.pdf` | **Guide des paramètres de l'electribe SAMPLER** (la rouge), 21 p. | p. 3–20 | Partiellement. Les listes d'oscillateurs et de filtres sont celles du Sampler, pas de la Synth. |

**Ajouté le 28/10 : `electribe_PG_F4.pdf`, le guide des paramètres de la Synth.** C'est désormais la source des paramètres. Le guide Sampler n'est plus utilisé.

Convention de référence : `Mode d'emploi p. 27` = page imprimée de la section française ; `Guide Sampler p. 16` = page du guide des paramètres.

## 2. Données (`data/electribe2/`, un dossier par machine)

Chaque entrée JSON porte :

```json
{ "source": { "doc": "OM" | "PG-sampler" | "PG-synth", "page": 27 },
  "synth": "confirmé" | "à vérifier (vient du guide Sampler)" | "absent du manuel" }
```

| Fichier | Contenu | Source principale |
|---|---|---|
| `panel.json` | 13 sections du panneau, chaque bouton/potard, fonction, combinaisons Shift | OM p. 22–24 + raccourcis PG p. 12 |
| `parameters.json` | Paramètres de motif, de partie, d'édition de pas, Global, potards d'édition | OM p. 22–23, 32 + PG p. 3–5, 8–9 |
| `oscillators.json` | Familles d'oscillateurs | **bloqué sans le guide Synth** (OM p. 23 ne cite que dent de scie, carré, bruit, PCM) |
| `effects.json` | 38 IFX, 32 MFX, 72 types de modulation, filtres | PG p. 16–18 (à vérifier pour la Synth) |
| `sequencer.json` | Pas, LENGTH 1–4 (×16 = 64 pas), Last Step, Beat, Motion Seq, Step Jump, Touch Scale, Groove, gammes, Pattern Set, Chain | OM p. 24, 28–32 + PG p. 3–5, 17–18 |
| `procedures.json` | Sauvegarder, copier une partie, mute, effacer, Motion Seq, Pattern Set, BPM, sync/clock, carte SD, export audio, Event Recorder | OM p. 27–34 + PG p. 8–11 |

## 3. Application (après ta validation de l'extraction)

- Vite + React + TypeScript, build statique qui s'ouvre hors ligne, progression en localStorage, thème sombre, mise en page mobile d'abord.
- Les données JSON sont la seule source : chaque écran lit `data/<machine>/` et affiche le badge **Manuel** (avec la page) ou **Pratique / interprétation**.
- Ordre de construction : 1) Carte de la machine (premier module montré), puis Chaîne du son, Parcours, Recettes, Grilles, Structure, Quiz, Glossaire, Carnet.
- À la fin : README + script de vérification qui liste tout paramètre affiché absent de `parameters.json` ou sans page.
