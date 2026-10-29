# Résumé de l'extraction (`data/electribe2/`)

Sources utilisées :
- **Mode d'emploi** `docs/281ffa.pdf`, section française, p. 20-38 (pages imprimées). Les pages 34-36, propres au Sampler, sont ignorées.
- **Guide des paramètres Synth** `docs/electribe_PG_F4.pdf`, p. 3-18.
- Le guide du Sampler (`electribe_sampler_PG_F3.pdf`) n'est **plus utilisé**.

Toutes les entrées portent `source: {doc, page}`. Les 232 entrées marquées ont toutes le statut `synth: "confirmé"`. Aucune ne vient du Sampler.

## Vue d'ensemble

| Fichier | Contenu | Chiffres |
|---|---|---|
| `panel.json` | 13 sections du panneau + 9 connecteurs, fonction de chaque contrôle, combinaisons Shift | 61 contrôles (dont 9 connecteurs), 30 combinaisons Shift |
| `parameters.json` | Paramètres du son (oscillateur, filtre, modulation, ampli, IFX, MFX), du motif, de la partie, des pas et Global | 73 paramètres, tous avec une page |
| `oscillators.json` | Les 409 oscillateurs, numéro + catégorie | 14 catégories |
| `effects.json` | IFX, MFX, types de modulation, types de filtres | 38 IFX, 32 MFX, 72 modulations, 7/6/6 filtres |
| `sequencer.json` | Pas, longueur, Last Step, Motion Seq, Step Jump, Touch Scale, Groove, Pattern Set, Chain… + gammes + motifs d'usine | 19 fonctions, 35 gammes, 25 grooves, 250 motifs |
| `procedures.json` | Procédures pas à pas, avec le niveau du parcours (1 à 5) | 31 procédures |

## Le trajet du son dans une partie (d'après le panneau, Mode d'emploi p. 23-24)

```
Oscillator ─► Filter ─► Amp/EG ─► Insert FX ─┬─► (MFX Send ON) ─► Master FX ─► Sortie
 (409 types)  (LPF/HPF/BPF) (Level, Pan,      (38 types)  │
                            Attack, Decay)                └─► (MFX Send OFF) ──────────► Sortie
        ▲         ▲         ▲           ▲
        └─────────┴─ Modulation (72 types : source EG/LFO → destination) ─┘
```

L'ordre exact des blocs n'est pas dessiné dans le manuel. Je l'ai déduit de l'ordre des sections et de leurs descriptions, et je le marquerai « interprétation » dans l'app.

## Oscillateurs par catégorie (guide p. 11-13)

| N° | Catégorie | Nb |
|---|---|---|
| 1-56 | Kick | 56 |
| 57-114 | Snare | 58 |
| 115-130 | Clap | 16 |
| 131-172 | HiHat | 42 |
| 173-186 | Cymbal | 14 |
| 187-202 | Tom | 16 |
| 203-257 | Percussion | 55 |
| 258-273 | Voice | 16 |
| 274-291 | Synth FX | 18 |
| 292-309 | Synth Hit | 18 |
| 310-325 | Inst.Hit | 16 |
| **326-380** | **Synth** (SAW, PULSE, DUAL-, OCT-, UNI-, SYNC-, CHIP-, RING-, X-, VPM-, SYN-SINE, NOISE) | 55 |
| 381-408 | Instrument | 28 |
| 409 | Audio In | 1 |

## Filtres (guide p. 15)

| LPF | HPF | BPF |
|---|---|---|
| electribe, MS20, MG, P5, OB, Acid | electribe, MS20, P5, OB, Acid | electribe, MS20, P5, OB, Acid |

## Séquenceur : 64 pas = 4 blocs de 16

```
LENGTH = 1 │ 1.01 ………………… 1.16 │
LENGTH = 4 │ 1.01 … 1.16 │ 2.01 … 2.16 │ 3.01 … 3.16 │ 4.01 … 4.16 │
             Step 1        Step 2        Step 3        Step 4   ← boutons Step = bloc affiché
```

Motifs d'usine proches de 165-170 BPM : NightRace (16), Footwerker 1-5 (21-25), Jumpup 3-4 (28-29), Techstep 2-4 (141-143), Neuro 1-3 (144-146), Neurofunk 1-3 (147-149), Jungle 2-4 (151-153), Sirius 1-2 (165-166, 162 BPM).

## Ce que les manuels ne disent pas (affiché tel quel dans l'app)

| Manque | Conséquence dans l'app |
|---|---|
| **Plages des potards du son** : Pitch, Glide, Cutoff, Resonance, EG Int, Depth, Speed, Level, Pan, Attack, Decay/Release, OSC Edit, IFX Edit, pad X/Y (16 paramètres) | « Plage non indiquée dans le manuel ». Les recettes parleront en position de potard (ex. « vers 2 h »), avec le badge Pratique. |
| **Rôle du potard Edit** pour chaque oscillateur | Indiqué comme absent. |
| **Sens des préfixes** DUAL / OCT / UNI / SYNC / RING / X / VPM… | Seuls les noms sont donnés. Toute explication sera badgée « Pratique / interprétation ». |
| **Caractère sonore de chaque filtre** (MS20, Acid…) | Seuls les noms sont donnés. Même traitement. |
| **Raccourci Shift + pad 9** : le guide écrit GROOVE TYPE pour les pads 8 et 9 | Signalé comme coquille probable, à vérifier sur la machine. |

## Petites différences entre les deux documents

- GROOVE TYPE et DEPTH sont rangés dans les « réglages de motif » par le mode d'emploi (p. 32), mais dans les « paramètres de partie » par le guide (p. 4). J'ai suivi le guide.
- Sur la Synth, l'édition de pas a 4 données (trigger, note, gate, vélocité), sans valeur de motion par pas (guide p. 5).
