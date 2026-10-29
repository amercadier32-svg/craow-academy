"""Construit les fichiers JSON de data/electribe2/ à partir des manuels Korg lus à la main.

Chaque entrée porte une source {doc, page} et un statut "synth":
  - "confirmé"      : vient du mode d'emploi commun ou du guide des paramètres Synth
  - "absent du manuel"   : l'information n'existe dans aucun des PDF fournis
"""
import json, os, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

DOCS = {
    "OM": {
        "fichier": "docs/281ffa.pdf",
        "titre": "Mode d'emploi electribe / electribe sampler (section française)",
        "pages": "Numéros imprimés en bas de page (section FR : p. 20 à 38). Page PDF = page imprimée + 16.",
        "couvreSynth": True,
    },
    "PG": {
        "fichier": "docs/electribe_PG_F4.pdf",
        "titre": "Guide des paramètres de l'electribe (Synth)",
        "pages": "Numéro imprimé = page PDF.",
        "couvreSynth": True,
    },
    "PGS": {
        "fichier": "docs/electribe_sampler_PG_F3.pdf",
        "titre": "Guide des paramètres de l'electribe SAMPLER",
        "couvreSynth": False,
        "remarque": "Non utilisé : guide du modèle Sampler (la rouge), remplacé par le guide Synth.",
    },
}

C, A = "confirmé", "absent du manuel"


def src(doc, page):
    return {"doc": doc, "page": page}


def meta(desc):
    return {
        "description": desc,
        "documents": DOCS,
        "statutsSynth": {
            C: "Vient du mode d'emploi commun ou du guide des paramètres Synth.",
            A: "Aucun des PDF fournis ne donne cette information.",
        },
        "extraitLe": "2026-10-28",
    }


def dump(name, data):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


# ---------------------------------------------------------------- parameters
NO_RANGE = "Plage non indiquée dans les manuels fournis."

params = []


def P(id, name, group, effect, source, synth, range=None, values=None, rangeNote=None,
      control=None, motion=False, shift=None, notes=None, fr=None):
    p = {"id": id, "nom": name, "nomFr": fr, "groupe": group, "effet": effect,
         "plage": range, "valeurs": values, "controle": control,
         "enregistrableMotionSeq": motion, "source": source, "synth": synth}
    if range is None and values is None:
        p["plageNote"] = rangeNote or NO_RANGE
    elif rangeNote:
        p["plageNote"] = rangeNote
    if shift:
        p["shift"] = shift
    if notes:
        p["notes"] = notes
    params.append({k: v for k, v in p.items() if v is not None})


MOTION_SRC = src("OM", 31)
# --- Son de la partie (potards de la section d'édition) : OM p. 23-24
P("osc.type", "Oscillator", "oscillateur", "Choisit la forme d'onde de la partie (dent de scie, carré, bruit, PCM...).",
  src("OM", 23), C, control="potard Oscillator", range="1…409",
  rangeNote="409 oscillateurs listés dans le guide p. 11-13 (voir oscillators.json).",
  shift={"combo": "Shift + Oscillator", "effet": "Fait défiler les oscillateurs par catégorie.", "source": src("PG", 10), "synth": C})
P("osc.edit", "OSC Edit", "oscillateur", "Change le caractère du son. Son rôle exact dépend de l'oscillateur choisi.",
  src("OM", 23), C, control="potard Edit (section Oscillator)", motion=True,
  notes=["Ni le mode d'emploi ni le guide des paramètres ne détaillent le rôle de ce potard pour chaque oscillateur : à découvrir à l'oreille."])
P("osc.pitch", "Pitch", "oscillateur", "Règle la hauteur de la note.", src("OM", 23), C, control="potard Pitch/Glide", motion=True,
  shift={"combo": "Shift + Pitch/Glide", "effet": "Règle le Glide (glissement d'une note à l'autre) ; ouvre la page Glide du menu.", "source": src("OM", 23), "synth": C})
P("osc.glide", "Glide", "oscillateur", "Glissement progressif de hauteur entre deux notes (sons de synthé).",
  src("OM", 23), C, control="Shift + potard Pitch/Glide")
P("filter.lpf", "LPF (passe-bas)", "filtre", "Active le filtre passe-bas. Des appuis successifs changent de type de filtre.",
  src("OM", 23), C, control="bouton LPF", values=["OFF", "electribe LPF", "MS20 LPF", "MG LPF", "P5 LPF", "OB LPF", "Acid LPF"],
  rangeNote="Liste des types de filtres, guide p. 15.")
P("filter.hpf", "HPF (passe-haut)", "filtre", "Active le filtre passe-haut. Des appuis successifs changent de type de filtre.",
  src("OM", 23), C, control="bouton HPF", values=["OFF", "electribe HPF", "MS20 HPF", "P5 HPF", "OB HPF", "Acid HPF"],
  rangeNote="Liste des types de filtres, guide p. 15.")
P("filter.bpf", "BPF (passe-bande)", "filtre", "Active le filtre passe-bande. Des appuis successifs changent de type de filtre.",
  src("OM", 23), C, control="bouton BPF", values=["OFF", "electribe BPF", "MS20 BPF", "P5 BPF", "OB BPF", "Acid BPF"],
  rangeNote="Liste des types de filtres, guide p. 15.")
P("filter.cutoff", "Cutoff", "filtre", "Fréquence de coupure : la limite à partir de laquelle le filtre enlève des fréquences.",
  src("OM", 23), C, control="potard Filter", motion=True)
P("filter.resonance", "Resonance", "filtre", "Accentue les fréquences autour de la coupure (son plus « nasillard » ou sifflant).",
  src("OM", 23), C, control="potard Resonance", motion=True)
P("filter.egint", "EG Int", "filtre", "Quantité de mouvement de la coupure par l'enveloppe réglée dans la section Amp/EG.",
  src("OM", 23), C, control="potard EG Int", motion=True)
P("mod.type", "Modulation", "modulation", "Choisit le type de modulation (source LFO ou enveloppe + destination).",
  src("OM", 23), C, control="potard Modulation", range="1…72",
  rangeNote="72 types listés dans le guide p. 14-15 (voir effects.json > modulation).",
  shift={"combo": "Shift + Modulation", "effet": "Change la forme d'onde en gardant la même destination.", "source": src("PG", 10), "synth": C})
P("mod.depth", "Depth", "modulation", "Intensité de la modulation.", src("OM", 23), C, control="potard Depth", motion=True)
P("mod.speed", "Speed", "modulation", "Vitesse de la modulation.", src("OM", 23), C, control="potard Speed", motion=True)
P("amp.level", "Level", "ampli", "Volume de la partie.", src("OM", 23), C, control="potard Level", motion=True)
P("amp.pan", "Pan", "ampli", "Place la partie à gauche / droite dans l'image stéréo.", src("OM", 23), C, control="potard Pan", motion=True)
P("amp.attack", "Attack", "ampli", "Durée de montée du son au début de la note.", src("OM", 23), C, control="potard Attack", motion=True)
P("amp.decay", "Decay/Release", "ampli", "Durée de chute du son.", src("OM", 23), C, control="potard Decay/Release", motion=True,
)
P("amp.eg", "Amp EG", "ampli", "Allumé : le volume suit l'enveloppe Attack / Decay-Release. Éteint : volume constant tant que la note est tenue (enveloppe « orgue »).",
  src("OM", 23), C, control="bouton Amp EG", values=["OFF", "ON"])
P("mfx.send", "MFX Send", "ampli", "Envoie ou non la partie vers l'effet master.", src("OM", 23), C, control="bouton MFX Send",
  values=["OFF", "ON"], motion=True)
P("ifx.type", "Insert Fx", "ifx", "Choisit le type d'effet d'insertion de la partie (distorsion, etc.).", src("OM", 23), C,
  control="potard Insert Fx", range="1…38", rangeNote="38 types listés dans le guide p. 16 (voir effects.json).")
P("ifx.edit", "IFX Edit", "ifx", "Intensité de l'effet d'insertion ; son rôle dépend de l'effet choisi.", src("OM", 23), C,
  control="potard Edit (section Insert Fx)", motion=True)
P("ifx.on", "IFX On", "ifx", "Active ou coupe l'effet d'insertion de la partie.", src("OM", 24), C, control="bouton IFX On",
  values=["OFF", "ON"], motion=True)

# --- Effet master (pad tactile)
P("mfx.on", "Master Fx On", "mfx", "Active le contrôle de l'effet master par le pad tactile.", src("OM", 22), C,
  control="bouton Master Fx", values=["OFF", "ON"], motion=True,
  shift={"combo": "Shift + Master Fx", "effet": "Ouvre la page MFX TYPE.", "source": src("PG", 10), "synth": C})
P("mfx.x", "Master Fx X", "mfx", "Position horizontale du doigt sur le pad tactile quand Master Fx est actif.", MOTION_SRC, C,
  control="pad tactile (axe X)", motion=True)
P("mfx.y", "Master Fx Y", "mfx", "Position verticale du doigt sur le pad tactile quand Master Fx est actif.", MOTION_SRC, C,
  control="pad tactile (axe Y)", motion=True)
P("mfx.hold", "MFX Hold", "mfx", "Garde l'effet master dans l'état du pad même après avoir levé le doigt. L'état est mémorisé dans le motif.",
  src("OM", 22), C, control="bouton MFX Hold", values=["OFF", "ON"])

# --- Paramètres de motif : PG p. 3 + OM p. 32
for a in [
    ("pat.bpm", "BPM", "Tempo du motif. Shift + molette : pas de 0,1.", "20.0…300.0", None, src("PG", 3), C),
    ("pat.swing", "SWING", "Décale les pas pairs pour donner du swing. +33 % donne un shuffle presque parfait.", "-50 %…+50 %", None, src("PG", 3), C),
    ("pat.beat", "BEAT", "Type de mesure du motif. En 8Tri / 16Tri, un bloc fait 12 pas.", None, ["16", "32", "8Tri", "16Tri"], src("PG", 3), C),
    ("pat.length", "LENGTH", "Longueur du motif en blocs de 16 pas (4 blocs = 64 pas).", "1…4", None, src("PG", 3), C),
    ("pat.level", "PATTERN LEVEL", "Volume du motif entier.", "0…127", None, src("PG", 3), C),
    ("pat.mfxtype", "MFX TYPE", "Type d'effet master du motif.", "01…32", None, src("PG", 3), C),
    ("pat.key", "KEY", "Tonique (note de départ) de la gamme.", "C…B", None, src("PG", 3), C),
    ("pat.scale", "SCALE", "Gamme utilisée par le pad tactile et les pads en mode Keyboard.", "Chromatic…Octave (35 gammes)", None, src("PG", 3), C),
    ("pat.chordset", "CHORD SET", "Richesse des accords joués en mode Chord. La plage dépend de la gamme.", "1…5", None, src("PG", 3), C),
    ("pat.gatearp", "GATE ARP", "Motif rythmique utilisé par le Gate Arpeggiator.", "1…50", None, src("PG", 3), C),
    ("pat.alt1314", "ALTERNATE 13-14", "Empêche les parties 13 et 14 de sonner en même temps (ex. charley fermé / ouvert).", None, ["Off", "On"], src("PG", 3), C),
    ("pat.alt1516", "ALTERNATE 15-16", "Même chose pour les parties 15 et 16.", None, ["Off", "On"], src("PG", 3), C),
    ("pat.chainto", "CHAIN TO", "Motif lancé automatiquement quand celui-ci est fini. Nécessite CHAIN MODE = On.", "Off, 1…250", None, src("PG", 3), C),
    ("pat.chainrepeat", "CHAIN REPEAT", "Nombre de lectures du motif avant de passer au motif CHAIN TO.", "1…64", None, src("PG", 3), C),
]:
    P(a[0], a[1], "motif", a[2], a[5], a[6], range=a[3], values=a[4])
P("pat.clearmfxmotion", "CLEAR MFX MOTION", "motif", "Efface la Motion Sequence de l'effet master du motif.", src("PG", 3), C, values=["exécuter"])

# --- Paramètres de partie : PG p. 4
P("part.priority", "PART PRIORITY", "partie", "Sur High, la partie risque moins de voir ses notes coupées quand beaucoup de notes se chevauchent.",
  src("PG", 4), C, values=["Normal", "High"])
P("part.laststep", "LAST STEP", "partie", "Dernier pas joué par la partie : permet des mesures impaires (ex. 11 pas). Non synchronisé avec un séquenceur externe.",
  src("PG", 4), C, range="1…16")
P("part.motionseq", "MOTION SEQ", "partie", "Mode de lecture de la Motion Sequence : Smooth = fondu continu ; Trigger Hold = valeur tenue à chaque déclenchement.",
  src("PG", 4), C, values=["Off", "Smooth", "Trigger Hold"])
P("part.trgvelocity", "TRG.PAD VELOCITY", "partie", "Active la sensibilité à la force de frappe des pads.", src("PG", 4), C, values=["Off", "On"])
P("part.groovetype", "GROOVE TYPE", "partie", "Applique un « groove » (décalages de timing typiques) à la séquence.", src("PG", 4), C,
  range="01 Conga1…25 Decrescendo", notes=["Le mode d'emploi (p. 32) le range dans les réglages de motif ; le guide des paramètres (p. 4) dans les paramètres de partie."])
P("part.groovedepth", "GROOVE DEPTH", "partie", "Intensité du groove.", src("PG", 4), C, range="0…127")
P("part.scalemode", "SCALE MODE", "partie", "Si On, changer KEY / SCALE change aussi la hauteur des notes de la partie. À activer avant d'enregistrer.",
  src("PG", 4), C, values=["Off", "On"])
P("part.voiceassign", "VOICE ASSIGN", "partie",
  "Polyphonie : Mono1 (legato, pas de redéclenchement), Mono2 (redéclenche à chaque note), Poly1 / Poly2 (jusqu'à 4 voix ; Poly2 redéclenche à chaque note).",
  src("PG", 4), C, values=["Mono1", "Mono2", "Poly1", "Poly2"])

# --- Édition de pas : PG p. 5
P("step.number", "STEP NUMBER", "pas", "Pas à éditer, au format bloc.pas. Shift + molette : saute d'un bloc de 16.", src("PG", 5), C, range="1.01…4.16")
P("step.note", "NOTE", "pas", "Note(s) du pas : jusqu'à 4 notes par pas. Shift + molette : par octave.", src("PG", 5), C, range="---, C-1…G9")
P("step.gate", "GATE TIME", "pas", "Durée de la note. 96 = un pas entier. TIE = liée à la note suivante identique (sans redéclencher).",
  src("PG", 5), C, range="00…96, TIE")
P("step.velocity", "VELOCITY", "pas", "Force (volume) de la note.", src("PG", 5), C, range="001…127")

# --- Global : PG p. 8-9 + OM p. 32-33
G = [
    ("glob.triggermode", "TRIGGER MODE", "Ce que joue un pad en mode Trigger : Normal = C4 ; Seq 1st = première note de la partie ; Seq Play = joue la séquence tant que le pad est tenu.", None, ["Normal", "Seq 1st", "Seq Play"], 6),
    ("glob.velocitycurve", "VELOCITY CURVE", "Réponse des pads à la force de frappe.", None, ["Heavy", "Normal", "Light", "Const96"], 6),
    ("glob.metronome", "METRONOME", "Métronome sur chaque noire. Rec 0/1/2 : seulement en enregistrement (Rec 0 = sans décompte).", None, ["Off", "Rec 0", "Rec 1", "Rec 2", "On"], 7),
    ("glob.tempolock", "TEMPO LOCK", "Garde le tempo actuel même en changeant de motif.", None, ["Off", "On"], 7),
    ("glob.knobmode", "KNOB MODE", "Comportement d'un potard dont la position ne correspond pas à la valeur : Jump (saute), Catch (attend d'atteindre la valeur), Value Scale (relatif).", None, ["Jump", "Catch", "Value Scale"], 7),
    ("glob.midich", "GLOBAL MIDI CH.", "Canal MIDI de la machine.", "01…16", None, 6),
    ("glob.midirx", "MIDI RECEIVE FILTER", "Messages MIDI ignorés en réception.", None, ["Off", "Short", "Short+Program"], 7),
    ("glob.miditx", "MIDI SEND FILTER", "Messages MIDI non envoyés.", None, ["Off", "Short", "Short+Program"], 7),
    ("glob.clockmode", "CLOCK MODE", "Source d'horloge : Internal (maître), Auto, External USB, External MIDI, External Sync. En Auto, priorité USB > MIDI > Sync.", None, ["Internal", "Auto", "External USB", "External MIDI", "External Sync"], 6),
    ("glob.syncpolarity", "SYNC POLARITY", "Polarité de l'impulsion de synchro (Sync In / Sync Out).", None, ["Hi", "Lo"], 7),
    ("glob.syncunit", "SYNC UNIT", "Nombre de pas avancés par impulsion reçue et cadence des impulsions envoyées.", None, ["1 Step", "2 Steps"], 7),
    ("glob.ptnchangelock", "PTN. CHANGE LOCK", "Si On, il faut Shift + molette pour changer de motif.", None, ["Off", "On"], 8),
    ("glob.chainmode", "CHAIN MODE", "Active l'enchaînement de motifs (CHAIN TO / CHAIN REPEAT).", None, ["Off", "On"], 8),
    ("glob.xycal", "XY CALIBRATION", "Calibre la surface du pad tactile.", None, ["exécuter"], 8),
    ("glob.touchrange", "TOUCH SCALE RANGE", "Étendue de notes du pad tactile en mode Touch Scale.", None, ["1 Oct", "2 Oct", "3 Oct", "4 Oct"], 7),
    ("glob.lcd", "LCD CONTRAST", "Contraste de l'écran.", "1…25", None, 7),
    ("glob.audiointhru", "AUDIO IN THRU", "Envoie l'entrée Audio In vers les sorties.", None, ["Off", "On"], 7),
    ("glob.battery", "BATTERY TYPE", "Type de piles, pour afficher la charge restante.", None, ["Ni-MH", "Alkali"], 7),
    ("glob.autopoweroff", "AUTO POWER OFF", "Extinction après 4 h sans manipulation.", None, ["Disable", "4 hours"], 7),
    ("glob.powersave", "POWER SAVE MODE", "Baisse la luminosité de l'écran et des LED.", None, ["Disable", "Auto", "Enable"], 7),
]
for g in G:
    P(g[0], g[1], "global", g[2], src("PG", g[5]), C, range=g[3], values=g[4])


dump("parameters.json", {"meta": meta("Paramètres de l'electribe : son de partie, motif, partie, pas, global. Une entrée = un paramètre."),
                         "groupes": {
                             "oscillateur": "Oscillateur", "filtre": "Filtre", "modulation": "Modulation (LFO / EG)",
                             "ampli": "Amp / EG", "ifx": "Effet d'insertion", "mfx": "Effet master",
                             "motif": "Paramètres de motif", "partie": "Paramètres de partie", "pas": "Édition de pas",
                             "global": "Paramètres Global"},
                         "parametres": params})

# --------------------------------------------------------------------- panel
def ctl(id, name, type, fn, page, params=None, shift=None, synth=C, doc="OM", notes=None):
    d = {"id": id, "nom": name, "type": type, "fonction": fn, "source": src(doc, page), "synth": synth}
    if params: d["parametres"] = params
    if shift: d["shift"] = shift
    if notes: d["notes"] = notes
    return d


def sh(combo, effet, doc, page, synth):
    return {"combo": combo, "effet": effet, "source": src(doc, page), "synth": synth}


PAD_SHIFT = ["SWING", "LENGTH", "CLEAR MFX MOTION", "KEY", "SCALE", "GATE ARP", "LAST STEP", "GROOVE TYPE",
             "GROOVE TYPE", "MOTION SEQ", "TRG. PAD VELOCITY", "STEP EDIT", "COPY PART", "CLEAR SEQUENCE",
             "CLEAR MOTION", "METRONOME"]

panel = {"meta": meta("Panneau supérieur (13 sections numérotées comme dans le mode d'emploi p. 22-24) et connecteurs (p. 25)."),
         "sections": [
    {"num": 1, "id": "power", "nom": "Interrupteur", "source": src("OM", 22), "controles": [
        ctl("power", "Bouton d'alimentation", "bouton", "Allume / éteint (maintenir jusqu'à l'écran de démarrage ou l'extinction).", 22)]},
    {"num": 2, "id": "volume", "nom": "Volume", "source": src("OM", 22), "controles": [
        ctl("volume", "Volume", "potard", "Volume des sorties ligne et casque.", 22)]},
    {"num": 3, "id": "inputlevel", "nom": "Input Level", "source": src("OM", 22), "controles": [
        ctl("inputlevel", "Input Level", "potard", "Niveau de l'entrée Audio In.", 22)]},
    {"num": 4, "id": "display", "nom": "Écran", "source": src("OM", 22), "controles": [
        ctl("display", "Écran", "écran", "Affiche motifs, parties et valeurs de paramètres.", 22)]},
    {"num": 5, "id": "transport", "nom": "Transport", "source": src("OM", 22), "controles": [
        ctl("rec", "Rec (●)", "bouton", "Lance l'enregistrement (notes, phrases ou mouvements de potards). Un nouvel appui arrête l'enregistrement, la lecture continue.", 22,
),
        ctl("stop", "Stop (■)", "bouton", "Arrête la lecture.", 22),
        ctl("play", "Lecture/Pause (▶/❚❚)", "bouton", "Lance ou met en pause la lecture.", 22,
            shift=[sh("Shift + Lecture/Pause", "Relance depuis le début du motif.", "PG", 10, C)]),
        ctl("tap", "Tap", "bouton", "Tape le tempo en rythme pour régler le BPM.", 22, params=["pat.bpm"],
            shift=[sh("Shift + Tap", "Ouvre la page de réglage du tempo.", "PG", 10, C)])]},
    {"num": 6, "id": "touchpad", "nom": "Pad tactile", "source": src("OM", 22), "controles": [
        ctl("touchpad", "Pad tactile", "pad XY", "Joue en Gate Arp ou Touch Scale, ou pilote l'effet master (X/Y).", 22, params=["mfx.x", "mfx.y"]),
        ctl("gatearp", "Gate Arp", "bouton", "Active le Gate Arpeggiator (X = vitesse, Y = longueur des notes, p. 29).", 22, params=["pat.gatearp"],
            shift=[sh("Shift + Gate Arp", "Ouvre la page GATE ARP.", "PG", 10, C)]),
        ctl("touchscale", "Touch Scale", "bouton", "Joue des notes de la gamme en frottant / tapotant le pad tactile.", 22, params=["pat.scale", "pat.key", "glob.touchrange"],
            shift=[sh("Shift + Touch Scale", "Ouvre la page SCALE.", "PG", 10, C)]),
        ctl("masterfx", "Master Fx", "bouton", "Active le contrôle de l'effet master par le pad tactile.", 22, params=["mfx.on", "pat.mfxtype"],
            shift=[sh("Shift + Master Fx", "Ouvre la page MFX TYPE.", "PG", 10, C)]),
        ctl("mfxhold", "MFX Hold", "bouton", "Garde l'effet master actif après avoir levé le doigt ; mémorisé dans le motif.", 22, params=["mfx.hold"])]},
    {"num": 7, "id": "common", "nom": "Section commune", "source": src("OM", 22), "controles": [
        ctl("value", "Molette de valeur (Value)", "potard", "Change la valeur du paramètre affiché.", 22,
            shift=[sh("Shift + Value", "Change la valeur par petits ou gros pas (selon le paramètre).", "OM", 23, C),
                   sh("Shift + Value (écran motif)", "Change de motif par pas de 10.", "PG", 10, C)]),
        ctl("cursor", "Curseurs < >", "bouton", "Choisit le paramètre à éditer.", 23,
            shift=[sh("Shift + <", "Annule la dernière manipulation (Undo, système v2.00 ou plus).", "PG", 10, C)]),
        ctl("menu", "Menu/Enter", "bouton", "Ouvre les menus (motif, partie, Global, Utility) et valide.", 23),
        ctl("exit", "Exit", "bouton", "Deux appuis : retour à l'écran de sélection de motif.", 23),
        ctl("shift", "Shift", "bouton", "Donne une seconde fonction aux autres boutons et potards.", 23),
        ctl("write", "Write", "bouton", "Sauvegarde le motif (et les réglages Global depuis leur page).", 23,
            shift=[sh("Shift + Write", "Renommer et sauvegarder le motif (Pattern Rename).", "OM", 23, C)])]},
    {"num": 8, "id": "edit", "nom": "Section d'édition (son de la partie)", "source": src("OM", 23), "sousSections": [
        {"id": "oscillator", "nom": "Oscillator", "controles": [
            ctl("osc", "Oscillator", "potard", "Choisit la forme d'onde.", 23, params=["osc.type"],
                shift=[sh("Shift + Oscillator", "Défile par catégorie.", "PG", 10, C)]),
            ctl("pitch", "Pitch/Glide", "potard", "Hauteur.", 23, params=["osc.pitch", "osc.glide"],
                shift=[sh("Shift + Pitch/Glide", "Règle le Glide (page Glide).", "OM", 23, C)]),
            ctl("oscedit", "Edit", "potard", "Caractère du son ; dépend de l'oscillateur.", 23, params=["osc.edit"])]},
        {"id": "filter", "nom": "Filter", "controles": [
            ctl("lpf", "LPF", "bouton", "Filtre passe-bas ; appuis répétés = autre type.", 23, params=["filter.lpf"]),
            ctl("hpf", "HPF", "bouton", "Filtre passe-haut ; appuis répétés = autre type.", 23, params=["filter.hpf"]),
            ctl("bpf", "BPF", "bouton", "Filtre passe-bande ; appuis répétés = autre type.", 23, params=["filter.bpf"]),
            ctl("cutoff", "Filter", "potard", "Fréquence de coupure.", 23, params=["filter.cutoff"]),
            ctl("resonance", "Resonance", "potard", "Résonance.", 23, params=["filter.resonance"]),
            ctl("egint", "EG Int", "potard", "Mouvement de la coupure par l'enveloppe.", 23, params=["filter.egint"])]},
        {"id": "modulation", "nom": "Modulation", "controles": [
            ctl("modtype", "Modulation", "potard", "Type de modulation (LFO ou enveloppe vers une destination).", 23, params=["mod.type"],
                shift=[sh("Shift + Modulation", "Change la forme d'onde, garde la destination.", "PG", 10, C)]),
            ctl("depth", "Depth", "potard", "Intensité.", 23, params=["mod.depth"]),
            ctl("speed", "Speed", "potard", "Vitesse.", 23, params=["mod.speed"])]},
        {"id": "ampeg", "nom": "Amp/EG", "controles": [
            ctl("level", "Level", "potard", "Volume de la partie.", 23, params=["amp.level"]),
            ctl("pan", "Pan", "potard", "Position stéréo.", 23, params=["amp.pan"]),
            ctl("attack", "Attack", "potard", "Montée du son.", 23, params=["amp.attack"]),
            ctl("decay", "Decay/Release", "potard", "Chute du son.", 23, params=["amp.decay"]),
            ctl("mfxsend", "MFX Send", "bouton", "Envoi vers l'effet master.", 23, params=["mfx.send"]),
            ctl("ampeg", "Amp EG", "bouton", "Active l'enveloppe de volume.", 23, params=["amp.eg"])]},
        {"id": "insertfx", "nom": "Insert Fx", "controles": [
            ctl("ifxtype", "Insert Fx", "potard", "Type d'effet d'insertion.", 23, params=["ifx.type"]),
            ctl("ifxedit", "Edit", "potard", "Intensité de l'effet.", 23, params=["ifx.edit"]),
            ctl("ifxon", "IFX On", "bouton", "Active / coupe l'effet d'insertion.", 24, params=["ifx.on"])]}]},
    {"num": 9, "id": "steps", "nom": "Boutons Step (1-4)", "source": src("OM", 24), "controles": [
        ctl("step", "Step 1-4", "bouton", "Montrent / changent le bloc de 16 pas édité, ou l'octave en mode Keyboard. En Pattern Set : choisissent le groupe.", 24,
            params=["pat.length", "step.number"])]},
    {"num": 10, "id": "partedit", "nom": "Édition de partie", "source": src("OM", 24), "controles": [
        ctl("partsel", "<Part, Part>", "bouton", "Choisit la partie (1 à 16) ; son pad s'allume en bleu.", 24),
        ctl("partmute", "Part Mute", "bouton", "Allumé : un pad coupe / rétablit sa partie.", 24,
            shift=[sh("Shift + Part Mute", "Rétablit toutes les parties coupées.", "PG", 10, C)]),
        ctl("parterase", "Part Erase", "bouton", "Pendant la lecture, tenir le pad d'une partie efface ses notes.", 24)]},
    {"num": 11, "id": "padmode", "nom": "Mode des pads", "source": src("OM", 24), "controles": [
        ctl("trigger", "Trigger", "bouton", "Les pads jouent les parties (mode réglé par TRIGGER MODE).", 24, params=["glob.triggermode"]),
        ctl("sequencer", "Sequencer", "bouton", "Les pads = les 16 pas : appui = pas allumé / éteint.", 24),
        ctl("keyboard", "Keyboard", "bouton", "Les pads = un clavier dans la gamme du motif.", 24, params=["pat.key", "pat.scale"]),
        ctl("chord", "Chord", "bouton", "Les pads jouent des accords.", 24, params=["pat.chordset"],
            shift=[sh("Shift + Chord", "Ouvre la page Chord Set.", "PG", 10, C)]),
        ctl("stepjump", "Step Jump", "bouton", "En lecture, un pad saute au pas 1-16 correspondant ; plusieurs pads = pas joués dans l'ordre d'appui.", 24),
        ctl("patternset", "Pattern Set", "bouton", "Un pad lance le motif qui lui est attribué. Tenir Pattern Set + pad = attribuer le motif courant.", 24)]},
    {"num": 12, "id": "pads", "nom": "Pads de déclenchement (16)", "source": src("OM", 24), "controles": [
        ctl("pads", "Pads 1-16", "pad", "Fonction définie par la section Mode des pads.", 24,
            shift=[sh(f"Shift + Pad {i+1}", f"Ouvre la page {name}.", "PG", 10, C) for i, name in enumerate(PAD_SHIFT)],
            notes=["Le guide indique GROOVE TYPE pour les pads 8 et 9 : sans doute une coquille (GROOVE DEPTH ?), à vérifier sur la machine."])]},
    {"num": 13, "id": "led", "nom": "Diode arrière", "source": src("OM", 24), "controles": [
        ctl("led", "Diode", "voyant", "S'allume selon le motif en cours de lecture.", 24)]},
],
    "connecteurs": [
        ctl("audioout", "Audio Out L/R", "jack 6,35", "Sorties audio. Seulement L branché = sortie mono.", 25),
        ctl("audioin", "Audio In", "mini-jack stéréo", "Entrée audio externe ; mixable avec AUDIO IN THRU.", 25, params=["glob.audiointhru"]),
        ctl("syncout", "Sync Out", "mini-jack", "Impulsion 5 V / 15 ms à chaque pas, pour volca ou séquenceurs analogiques. Polarité réglable.", 25, params=["glob.syncpolarity", "glob.syncunit"]),
        ctl("syncin", "Sync In", "mini-jack", "Avance les pas au rythme d'impulsions externes si CLOCK MODE = Auto ou Ext. Sync.", 25, params=["glob.clockmode", "glob.syncpolarity"]),
        ctl("midi", "MIDI IN/OUT", "mini-jack + câbles de conversion fournis", "Connexion MIDI.", 25, params=["glob.midich"]),
        ctl("phones", "Casque", "mini-jack stéréo", "Sortie casque.", 25),
        ctl("dc", "DC 9V", "alimentation", "Adaptateur secteur fourni uniquement.", 25),
        ctl("usb", "USB", "micro-USB B", "Connexion ordinateur (MIDI USB).", 25),
        ctl("sd", "Carte SD", "fente", "Sauvegarde / chargement. SD 512 Mo–2 Go, SDHC ≤ 32 Go ; pas de SDXC.", 26),
    ]}
dump("panel.json", panel)

# --------------------------------------------------------------- oscillators
here = os.path.dirname(os.path.abspath(__file__))
synth_osc = json.load(open(os.path.join(here, "synth_osc_list.json"), encoding="utf-8"))
CAT_FR = {"Kick": "Grosse caisse", "Snare": "Caisse claire", "Clap": "Clap", "HiHat": "Charley", "Cymbal": "Cymbale",
          "Tom": "Tom", "Percussion": "Percussion", "Voice": "Voix", "Synth FX": "Effets synthé", "Synth Hit": "Hits synthé",
          "Inst.Hit": "Hits instrument", "Synth": "Synthé (formes d'onde)", "Instrument": "Instrument", "Audio In": "Entrée audio"}
cats = []
for o in synth_osc:
    if not cats or cats[-1]["categorie"] != o["categorie"]:
        cats.append({"categorie": o["categorie"], "nomFr": CAT_FR[o["categorie"]], "de": o["n"], "a": o["n"], "nombre": 0})
    cats[-1]["a"] = o["n"]; cats[-1]["nombre"] += 1
dump("oscillators.json", {
    "meta": meta("Les 409 oscillateurs de l'electribe Synth, par numéro et catégorie (guide p. 11-13)."),
    "source": src("PG", 11), "synth": C, "total": len(synth_osc),
    "ceQueDitLeManuel": [
        {"texte": "Formes d'onde citées : dent de scie, carré, bruit et PCM.", "source": src("OM", 23), "synth": C},
        {"texte": "Le potard Edit change le caractère du son ; son effet dépend de la forme d'onde choisie.", "source": src("OM", 23), "synth": C},
        {"texte": "Shift + Oscillator fait défiler les oscillateurs par catégorie.", "source": src("PG", 10), "synth": C},
    ],
    "absentDuManuel": [
        "Le rôle exact du potard Edit pour chaque oscillateur.",
        "Le sens des préfixes de la catégorie Synth (DUAL, OCT, UNI, SYNC, CHIP, RING, X, VPM, SYN) : seuls les noms sont donnés.",
        "La distinction officielle « modélisation analogique » / « PCM » oscillateur par oscillateur : le guide ne donne que des catégories."],
    "categories": cats,
    "oscillateurs": [dict(o, nomCategorieFr=CAT_FR[o["categorie"]]) for o in synth_osc],
})

# ------------------------------------------------------------------- effects
IFX = ["Punch", "Overdrive", "Distortion", "Decimator", "Bit Crusher", "Ring Modulator", "Sustainer", "Limiter", "Low EQ", "Mid EQ",
       "High EQ", "Radio EQ", "Exciter", "Low Pass Filter", "High Pass Filter", "Band Plus Filter", "Talk Filter", "Delay 1/4",
       "Delay 3/16", "Delay 1/8", "Delay 1/16", "Roller 1/32", "One Delay", "Short Delay", "Ring Delay 1", "Ring Delay 2", "Chorus",
       "Flanger LFO", "Flanger +", "Flanger -", "Phaser LFO 1", "Phaser LFO 2", "Phaser Manual", "Tremolo", "Off Beater", "Pumper",
       "Repeater", "Slicer"]
MFX = ["Mod Delay", "Tape Delay", "High Pass Delay", "Hall Reverb", "Room Reverb", "Wet Reverb", "Looper", "Pitch Looper",
       "Step Shifter", "Slicer", "Jag Filter", "Grain Shifter", "Vinyl Break", "Seq Reverse", "Seq Doubler", "Odd Stepper",
       "Even Stepper", "Low Pass Filter", "High Pass Filter", "Band Plus Filter", "Touch Wah", "Tube EQ", "Decimator", "Distortion",
       "Compressor", "Limiter", "Chorus", "XY Flanger", "LFO Flanger", "XY Phaser", "LFO Phaser", "Auto Pan"]
NO_MOTION = {"Seq Reverse", "Seq Doubler", "Odd Stepper", "Even Stepper"}
SEQ_MFX = NO_MOTION
DEST = ["Filter", "Pitch", "OSC", "Level", "Pan", "IFX"]
DEST_FR = {"Filter": "Coupure du filtre", "Pitch": "Hauteur de l'oscillateur", "OSC": "OSC Edit", "Level": "Volume (Amp Level)", "Pan": "Pan", "IFX": "IFX Edit"}
SOURCES = [  # (préfixe, source, bpmSync, keySync)
    ("EG+", "Enveloppe AD positive", False, False), ("EG+ BPM", "Enveloppe AD positive", True, False),
    ("EG-", "Enveloppe AD négative", False, False), ("EG- BPM", "Enveloppe AD négative", True, False),
    ("LFOTri", "LFO triangle", False, False), ("LFOTriB", "LFO triangle", True, True),
    ("SawUpB", "LFO dent de scie montante", True, True), ("SawDwnB", "LFO dent de scie descendante", True, True),
    ("SquUpB", "LFO carré (montant)", True, True), ("SquDwnB", "LFO carré (descendant)", True, True),
    ("S&HBPM", "LFO sample & hold (aléatoire par paliers)", True, False), ("Random", "LFO aléatoire", False, False)]
mods = []
n = 1
for pre, source, bpm, key in SOURCES:
    for d in DEST:
        mods.append({"n": n, "nom": f"{pre} {d}", "source": source, "destination": DEST_FR[d], "bpmSync": bpm, "keySync": key})
        n += 1
dump("effects.json", {
    "meta": meta("Effets d'insertion (IFX, un par partie), effets master (MFX, un par motif), types de modulation et filtres. Listes du guide des paramètres Synth p. 14-16."),
    "ifx": {"description": "Effet d'insertion : un par partie. Choisi avec le potard Insert Fx, dosé avec Edit, activé avec IFX On.",
            "descriptionSource": src("OM", 23), "source": src("PG", 16), "synth": C,
            "types": [{"n": i + 1, "nom": t} for i, t in enumerate(IFX)]},
    "mfx": {"description": "Effet master : un par motif. Chaque partie y est envoyée ou non (MFX Send) ; il se joue avec le pad tactile (X/Y) quand Master Fx est allumé.",
            "descriptionSource": src("OM", 29), "source": src("PG", 16), "synth": C,
            "types": [{"n": i + 1, "nom": t, "motionSeq": t not in NO_MOTION, **({"pilotesLeSequenceur": True} if t in SEQ_MFX else {})}
                      for i, t in enumerate(MFX)],
            "notes": ["Les types marqués motionSeq=false ne peuvent pas être enregistrés en Motion Sequence (PG p. 18).",
                      "Ces 4 types pilotent le séquenceur et peuvent influencer SWING (PG p. 3)."]},
    "modulation": {"description": "Le potard Modulation choisit une paire source → destination ; Depth = intensité, Speed = vitesse.",
                   "descriptionSource": src("OM", 23), "source": src("PG", 14), "synth": C,
                   "notesColonnes": {"bpmSync": "La vitesse suit le tempo.", "keySync": "Le LFO repart à zéro à chaque note."},
                   "types": mods},
    "filtres": {"description": "Trois boutons LPF / HPF / BPF ; des appuis successifs changent de type de filtre.",
                "descriptionSource": src("OM", 23), "source": src("PG", 15), "synth": C,
                "types": {"LPF": ["OFF", "electribe LPF", "MS20 LPF", "MG LPF", "P5 LPF", "OB LPF", "Acid LPF"],
                          "HPF": ["OFF", "electribe HPF", "MS20 HPF", "P5 HPF", "OB HPF", "Acid HPF"],
                          "BPF": ["OFF", "electribe BPF", "MS20 BPF", "P5 BPF", "OB BPF", "Acid BPF"]},
                "manque": "Le guide ne décrit pas le caractère sonore de chaque type de filtre (seulement les noms)."},
})

# ----------------------------------------------------------------- sequencer
SCALES = [("Chromatic", "C D♭ D E♭ E F G♭ G A♭ A B♭ B"), ("Ionian", "C D E F G A B"), ("Dorian", "C D E♭ F G A B♭"),
          ("Phrygian", "C D♭ E♭ F G A♭ B♭"), ("Lydian", "C D E F♯ G A B"), ("Mixolydian", "C D E F G A B♭"),
          ("Aeolian", "C D E♭ F G A♭ B♭"), ("Locrian", "C D♭ E♭ F G♭ A♭ B♭"), ("Harm minor", "C D E♭ F G A♭ B"),
          ("Melo minor", "C D E♭ F G A B"), ("Major Blues", "C D E♭ E G A"), ("minor Blues", "C E♭ F G♭ G B♭"),
          ("Diminished", "C D E♭ F F♯ G♯ A B"), ("Com.Dim", "C D♭ E♭ E F♯ G A B♭"), ("Major Penta", "C D E G A"),
          ("minor Penta", "C E♭ F G B♭"), ("Raga 1 (Bhairav)", "C D♭ E F G A♭ B"), ("Raga 2 (Gamanasrama)", "C D♭ E F♯ G A B"),
          ("Raga 3 (Todi)", "C D♭ E♭ F♯ G A♭ B"), ("Arabic", "C D E F G♭ A♭ B♭"), ("Spanish", "C D♭ E♭ E F G A♭ B♭"),
          ("Gypsy", "C D E♭ F♯ G A♭ B"), ("Egyptian", "C D F G B♭"), ("Hawaiian", "C D E♭ G A"), ("Pelog", "C D♭ E♭ G A♭"),
          ("Japanese", "C D♭ F G A♭"), ("Ryuku", "C E F G B"), ("Chinese", "C E F♯ G B"), ("Bass Line", "C G B♭"),
          ("Whole Tone", "C D E G♭ A♭ B♭"), ("minor 3rd", "C E♭ G♭ A"), ("Major 3rd", "C E A♭"), ("4th Interval", "C F B♭"),
          ("5th Interval", "C G"), ("Octave", "C")]
GROOVES = ["Conga 1", "Conga 2", "Conga 3", "Bongo 1", "Bongo 2", "Bongo 3", "Cabasa 1", "Cabasa 2", "Claves 1", "Claves 2",
           "Cowbell 1", "Agogo 1", "Agogo 2", "Tambourine", "Off Beat", "On Beat", "Push 5&13", "Pull 5&13", "Oval Groove",
           "Laidback", "Rushbeat", "The One", "Synchopation", "Crescendo", "Decrescendo"]

def item(id, nom, desc, sources, synth, params=None, **kw):
    d = {"id": id, "nom": nom, "description": desc, "sources": sources, "synth": synth}
    if params: d["parametres"] = params
    d.update(kw)
    return d

seq = {"meta": meta("Séquenceur : structure motif / partie / pas et fonctions de jeu."),
       "chiffresCles": [
           item("patterns", "250 motifs", "La machine stocke jusqu'à 250 motifs.", [src("OM", 27)], C),
           item("parts", "16 parties par motif", "Un motif = 16 parties + 1 effet master.", [src("OM", 27)], C),
           item("voices", "24 voix / 4 par partie", "Jusqu'à 24 voix pour tout le motif (selon oscillateurs, filtres, IFX) et 4 par partie.", [src("OM", 38)], C),
           item("motionmax", "24 Motion Sequences", "Jusqu'à 24 séquences de mouvements par motif (message « Motion Seq Full »).", [src("OM", 37)], C),
       ],
       "fonctions": [
           item("steps", "Pas et longueur", "Un motif se compose de blocs de 16 pas. LENGTH (1-4) fixe le nombre de blocs : jusqu'à 4 × 16 = 64 pas. Les boutons Step 1-4 montrent et choisissent le bloc édité. En pas à pas, les pads allument / éteignent chaque pas ; une note C4 est posée par défaut.",
                [src("OM", 24), src("OM", 30), src("OM", 32), src("PG", 3), src("PG", 5)], C, ["pat.length", "step.number"],
                schema={"blocs": 4, "pasParBloc": 16, "maxPas": 64, "notation": "bloc.pas (1.01 … 4.16)"}),
           item("laststep", "Last Step", "Raccourcit une partie (1-16 pas) pour des mesures impaires et des décalages entre parties.", [src("PG", 4)], C, ["part.laststep"]),
           item("beat", "Beat", "Résolution : 16, 32, 8Tri ou 16Tri (triolets : 12 pas par bloc).", [src("OM", 32), src("PG", 3)], C, ["pat.beat"]),
           item("stepedit", "Step Edit", "Édition détaillée de chaque pas : note (4 max), gate time, vélocité, valeur de motion.", [src("OM", 30), src("PG", 5)], C,
                ["step.number", "step.note", "step.gate", "step.velocity"]),
           item("realtime", "Enregistrement en temps réel", "Enregistre ce que tu joues sur les pads ou le pad tactile sans arrêter la lecture ; le métronome peut aider.", [src("OM", 30)], C, ["glob.metronome"]),
           item("motionseq", "Motion Sequence", "Enregistre les mouvements de potards / boutons d'une partie sur un cycle de motif. Modes Smooth ou Trigger Hold. Contrôles enregistrables : OSC Edit, Pitch, Cutoff, Resonance, EG Int, Speed, Depth, Level, Pan, Attack, Decay/Release, IFX Edit, IFX On, MFX Send, Master Fx On/X/Y.",
                [src("OM", 30), src("OM", 31), src("PG", 4)], C, ["part.motionseq", "pat.clearmfxmotion"]),
           item("stepjump", "Step Jump", "Pendant la lecture, un pad saute directement au pas 1-16. Plusieurs pads tenus = pas joués dans l'ordre d'appui. Avec Last Step ou en triolets, les pads au-delà enchaînent sur la mesure suivante.",
                [src("OM", 24), src("PG", 3), src("PG", 4)], C),
           item("keyboard", "Mode Keyboard", "Les pads deviennent un clavier dans la gamme KEY/SCALE. Step 1 = octave en dessous, Step 4 = octave au-dessus.", [src("OM", 28)], C, ["pat.key", "pat.scale"]),
           item("chord", "Mode Chord", "Les pads jouent des accords ; régler VOICE ASSIGN sur Poly1 ou Poly2. CHORD SET change la richesse.", [src("OM", 28), src("PG", 3)], C, ["pat.chordset", "part.voiceassign"]),
           item("touchscale", "Touch Scale", "Jouer en frottant / tapotant le pad tactile dans la gamme du motif ; étendue réglée par TOUCH SCALE RANGE.", [src("OM", 29), src("PG", 7)], C, ["pat.scale", "pat.key", "glob.touchrange"]),
           item("gatearp", "Gate Arpeggiator", "Répète automatiquement la note au tempo. Pad tactile : X = vitesse, Y = longueur. 50 motifs (GATE ARP).", [src("OM", 29), src("PG", 3)], C, ["pat.gatearp"]),
           item("groove", "Groove", "Décale le timing des notes pour « humaniser ». 25 types, intensité 0-127.", [src("OM", 32), src("PG", 4), src("PG", 16)], C,
                ["part.groovetype", "part.groovedepth"], types=[{"n": i + 1, "nom": g} for i, g in enumerate(GROOVES)], typesSource=src("PG", 16), typesSynth=C),
           item("swing", "Swing", "Décale les pas pairs (-50 à +50 %).", [src("OM", 32), src("PG", 3)], C, ["pat.swing"]),
           item("patternset", "Pattern Set", "Range un motif sous chaque pad pour en changer en direct. 4 groupes (boutons Step 1-4) × 16 pads = 64 emplacements.", [src("OM", 24), src("OM", 30), src("PG", 9)], C),
           item("chain", "Chaînage", "CHAIN TO + CHAIN REPEAT enchaînent les motifs pour faire un morceau ; nécessite CHAIN MODE = On.", [src("PG", 3), src("PG", 8)], C, ["pat.chainto", "pat.chainrepeat", "glob.chainmode"]),
           item("mute", "Part Mute", "Couper / rétablir une partie en direct avec son pad.", [src("OM", 24), src("OM", 32)], C),
           item("erase", "Part Erase", "Effacer en direct les notes d'une partie en tenant son pad.", [src("OM", 24), src("OM", 30), src("OM", 32)], C),
           item("alternate", "Alternate 13-14 / 15-16", "Empêche deux parties de sonner ensemble (charley ouvert / fermé).", [src("PG", 3)], C, ["pat.alt1314", "pat.alt1516"]),
           item("eventrec", "Event Recorder", "Enregistre une performance live (changements de motifs, potards, pads) sur carte SD, sans toucher aux motifs. CLOCK MODE doit être Internal.", [src("OM", 33), src("OM", 34), src("PG", 9)], C),
       ],
       "motifsUsine": {"source": src("PG", 17), "synth": C,
                       "note": "Les 250 motifs d'usine (nom, auteur, BPM). Ceux entre 160 et 175 BPM sont proches de ton tempo.",
                       "liste": json.load(open(os.path.join(here, "synth_pattern_list.json"), encoding="utf-8"))},
       "gammes": {"source": src("PG", 15), "synth": C, "note": "Notes données pour KEY = C.",
                  "liste": [{"n": i + 1, "nom": s, "notesEnDo": notes.split()} for i, (s, notes) in enumerate(SCALES)]},
       }
dump("sequencer.json", seq)

# ---------------------------------------------------------------- procedures
def proc(id, titre, but, etapes, sources, synth=C, attention=None, astuces=None, niveau=None):
    d = {"id": id, "titre": titre, "but": but, "etapes": etapes, "sources": sources, "synth": synth}
    if attention: d["attention"] = attention
    if astuces: d["astuces"] = astuces
    if niveau: d["niveau"] = niveau
    return d

procs = [
    proc("power", "Allumer / éteindre", "Démarrer la machine sans risque.",
         ["Maintiens le bouton d'alimentation jusqu'à l'écran de démarrage.", "Pour éteindre, maintiens-le jusqu'à ce que l'écran s'éteigne."],
         [src("OM", 27)], attention=["Ne touche ni pad ni bouton pendant l'allumage.", "Extinction auto après 4 h sans manipulation (AUTO POWER OFF)."], niveau=1),
    proc("playpattern", "Choisir et lancer un motif", "Écouter un motif.",
         ["Exit deux fois pour revenir à l'écran de sélection de motif.", "Tourne la molette pour choisir le motif.", "Lecture/Pause pour lancer, Stop pour arrêter."],
         [src("OM", 27)], astuces=["On peut changer de motif pendant la lecture."], niveau=1),
    proc("selectpart", "Choisir et écouter une partie", "Savoir quelle partie on édite.",
         ["Allume Trigger.", "Appuie sur un pad pour écouter sa partie.", "Ou utilise <Part, Part> : le pad de la partie s'allume en bleu."],
         [src("OM", 27)], niveau=1),
    proc("menu", "Naviguer dans les menus", "Trouver un paramètre.",
         ["Depuis l'écran motif, Menu/Enter ouvre le menu d'édition.", "< / > choisissent le paramètre.", "La molette change la valeur.", "Exit deux fois pour revenir."],
         [src("OM", 27)], niveau=1),
    proc("menuglobal", "Ouvrir Global, Data Utility, Part Utility", "Accéder aux réglages de la machine.",
         ["Menu/Enter depuis l'écran motif.", "< / > jusqu'à GLOBAL PARAMETER, DATA UTILITY ou PART UTILITY.", "Menu/Enter pour entrer.", "Write pour sauvegarder les réglages."],
         [src("OM", 32)], attention=["Sans Write, les réglages reviennent à leur état d'avant à l'extinction."], niveau=1),
    proc("savepattern", "Sauvegarder un motif (remplacer)", "Ne rien perdre.",
         ["Appuie sur Write.", "Choisis l'emplacement avec la molette.", "Appuie encore sur Write (« Working... » puis Write s'éteint)."],
         [src("OM", 31)], attention=["Changer de motif sans sauvegarder = toutes les modifications perdues.", "N'éteins pas tant que Write est allumé."], niveau=1),
    proc("savepatternas", "Sauvegarder sous un autre nom / numéro", "Copier un motif ou le renommer.",
         ["Shift + Write : « enter NAME » s'affiche.", "< / > pour choisir le caractère, molette pour le changer.", "Choisis le numéro de destination avec la molette.", "Write pour sauvegarder (Exit pour annuler)."],
         [src("OM", 31)], niveau=1),
    proc("bpm", "Régler le tempo", "Caler la machine à 165-170 BPM.",
         ["Tape plusieurs fois sur Tap au tempo voulu.", "Ou : menu d'édition > BPM, puis la molette (Shift + molette = pas de 0,1)."],
         [src("OM", 30), src("PG", 3)], niveau=1),
    proc("keyboardplay", "Jouer des notes avec les pads", "Jouer une mélodie dans la gamme.",
         ["Appuie sur Keyboard.", "Choisis la partie avec <Part, Part>.", "Joue sur les pads.", "Step 1 / Step 4 : octave en dessous / au-dessus."],
         [src("OM", 28)], astuces=["KEY et SCALE (menu d'édition) choisissent les notes des pads."], niveau=1),
    proc("stepedit", "Programmer une partie pas à pas", "Écrire un rythme sur la grille.",
         ["Choisis la partie.", "Allume Sequencer.", "Règle la longueur avec les boutons Step (LED rouges).", "Appuie sur les pads pour allumer / éteindre les pas."],
         [src("OM", 30)], astuces=["Note par défaut : C4.", "Step Edit dans le menu pour régler note, durée, vélocité de chaque pas."], niveau=1),
    proc("realtimerec", "Enregistrer en temps réel", "Enregistrer une phrase en jouant.",
         ["Lance la lecture.", "Choisis la partie.", "Rec (s'allume).", "Joue : le motif boucle et l'enregistrement continue.", "Rec à nouveau pour arrêter."],
         [src("OM", 30)], astuces=["Part Erase + pad tenu efface les notes ratées en direct.", "Métronome : Global > METRONOME."], niveau=2),
    proc("motionrec", "Enregistrer une Motion Sequence", "Automatiser un potard (ex. ouverture de filtre).",
         ["Choisis la partie.", "Menu d'édition > MOTION SEQ : Smooth ou Trigger Hold.", "Rec, puis Lecture/Pause.", "Tourne le potard pendant un cycle (Rec clignote).", "Après un cycle, la lecture de la motion commence. Rec pour continuer d'enregistrer."],
         [src("OM", 31)], niveau=3),
    proc("motionclear", "Effacer une Motion Sequence", "Repartir de zéro.",
         ["Partie : PART UTILITY > CLEAR MOTION, puis exécuter.", "Effet master : CLEAR MFX MOTION."],
         [src("OM", 31), src("PG", 6)], niveau=3),
    proc("mfx", "Jouer l'effet master", "Faire des montées / breaks au pad tactile.",
         ["Appuie sur Master Fx.", "Choisis une partie et allume MFX Send (répète pour chaque partie à envoyer).", "Touche le pad tactile."],
         [src("OM", 29)], astuces=["Type d'effet : menu d'édition > MFX TYPE (ou Shift + Master Fx).", "MFX Hold garde l'effet après avoir levé le doigt."], niveau=3),
    proc("gatearp", "Utiliser le Gate Arpeggiator", "Faire des roulements rythmiques.",
         ["Allume Gate Arp.", "Trigger allumé, tiens le pad de la partie et joue sur le pad tactile (X = vitesse, Y = longueur)."],
         [src("OM", 29)], astuces=["Avec Keyboard ou Chord, les pads donnent la hauteur."], niveau=3),
    proc("partmute", "Couper / rétablir une partie", "Construire un morceau en direct.",
         ["Allume Part Mute.", "Appuie sur le pad de la partie (il s'éteint).", "Rappuie dessus pour la rétablir."],
         [src("OM", 32)], astuces=["Shift + Part Mute rétablit toutes les parties (guide p. 10)."], niveau=5),
    proc("parterase", "Effacer les notes d'une partie", "Nettoyer une partie.",
         ["Allume Part Erase.", "Pendant la lecture, tiens le pad de la partie."],
         [src("OM", 32)], astuces=["Tout effacer : PART UTILITY > CLEAR SEQUENCE."], niveau=2),
    proc("partcopy", "Copier une partie", "Dupliquer un son et sa séquence.",
         ["Choisis la partie source avec <Part, Part>.", "PART UTILITY > PART COPY.", "Menu/Enter, puis le pad de la partie de destination."],
         [src("OM", 32)], astuces=["COPY PART SOUND copie seulement le son, sans les pas (guide p. 6)."], niveau=2),
    proc("patternset", "Ranger des motifs dans Pattern Set", "Changer de motif d'un seul pad en live.",
         ["Allume Pattern Set.", "Choisis le groupe avec Step 1-4.", "Choisis le motif avec la molette.", "Tiens Pattern Set et appuie sur le pad de destination."],
         [src("OM", 30)], niveau=5),
    proc("patternsetplay", "Jouer avec Pattern Set", "Enchaîner les motifs en live.",
         ["Allume Pattern Set.", "Choisis le groupe avec Step 1-4.", "Appuie sur un pad pour lancer son motif."],
         [src("OM", 30)], niveau=5),
    proc("chain", "Enchaîner des motifs (Chain)", "Faire un morceau qui se joue seul.",
         ["Global > CHAIN MODE = On.", "Dans le motif 1 : CHAIN TO = 2, CHAIN REPEAT = nombre de répétitions.", "Dans le dernier motif : CHAIN TO = Off (s'arrête de chaîner) ou = 1 (boucle)."],
         [src("PG", 3), src("PG", 8)], niveau=4),
    proc("sync", "Synchroniser avec un autre appareil", "Caler deux E2, une TD-3 ou un DAW.",
         ["Global > CLOCK MODE.", "Maître : Internal. Esclave : Auto, ou Ext.USB / Ext.MIDI / Ext.Sync selon la prise utilisée.", "Sync analogique : Sync Out envoie une impulsion par pas ; régler SYNC POLARITY et SYNC UNIT si besoin."],
         [src("OM", 25), src("OM", 33), src("PG", 6)], attention=["Last Step (mesures impaires) n'est pas synchronisé avec un séquenceur externe (guide p. 4)."], niveau=5),
    proc("midich", "Régler le canal MIDI", "Piloter / être piloté en MIDI.",
         ["Global > MIDI GLOBAL CH.", "Molette pour choisir le canal."], [src("OM", 33)], niveau=5),
    proc("metronome", "Régler le métronome", "Enregistrer en rythme.",
         ["Global > METRONOME.", "Off, Rec 0 / Rec 1 / Rec 2 (seulement en enregistrement) ou On."], [src("OM", 32), src("PG", 7)], niveau=2),
    proc("sdformat", "Formater une carte SD", "Préparer une carte.",
         ["DATA UTILITY > FORMAT SD CARD.", "Menu/Enter ; « OK » quand c'est fini."], [src("OM", 33)],
         attention=["Efface tout le contenu de la carte.", "Ne pas éteindre ni retirer la carte pendant le formatage.", "Insérer / retirer la carte seulement machine éteinte (p. 26)."], niveau=1),
    proc("exportpattern", "Sauvegarder un motif sur carte SD", "Faire une copie de sécurité.",
         ["DATA UTILITY > EXPORT PATTERN.", "Menu/Enter."], [src("OM", 33)], niveau=1),
    proc("importpattern", "Charger un motif depuis la carte SD", "Récupérer une sauvegarde.",
         ["DATA UTILITY > IMPORT PATTERN.", "Choisis le fichier (Menu/Enter ouvre un dossier, « Upper Folder » remonte).", "Menu/Enter pour confirmer."], [src("OM", 33)], niveau=1),
    proc("exportaudio", "Exporter un motif en WAV", "Récupérer l'audio dans FL Studio.",
         ["DATA UTILITY > EXPORT AUDIO.", "Format : WAV seul ou Ableton Live Set.", "Menu/Enter."], [src("OM", 33)], niveau=4),
    proc("exportpsetaudio", "Exporter un Pattern Set en WAV", "Exporter plusieurs motifs.",
         ["DATA UTILITY > EXPORT P.SET AUDIO.", "Choisis le format.", "Choisis la plage (1-64).", "Menu/Enter."], [src("OM", 33), src("PG", 9)], niveau=4),
    proc("eventrec", "Enregistrer une performance (Event Recorder)", "Garder une trace d'un live.",
         ["Menu d'édition > EVENT REC/PLAY, Menu/Enter.", "Menu/Enter encore : prêt à enregistrer.", "Lecture/Pause pour démarrer.", "Exit plusieurs fois et joue en changeant de motifs.", "Stop à la fin : le nom du fichier s'affiche.", "Exit pour terminer."],
         [src("OM", 33), src("OM", 34)], attention=["Carte SD obligatoire.", "CLOCK MODE doit être Internal (guide p. 9)."], niveau=5),
    proc("factoryreset", "Revenir aux réglages d'usine", "Tout remettre à zéro.",
         ["Utility > Factory Reset.", "Menu/Enter."], [src("OM", 34)], attention=["Efface tous les motifs utilisateur : sauvegarde d'abord sur carte SD."], niveau=1),
]
dump("procedures.json", {"meta": meta("Procédures pas à pas, reformulées, avec niveau de parcours suggéré (1-5)."), "procedures": procs})
print("ok", len(params), "paramètres,", len(procs), "procédures")
