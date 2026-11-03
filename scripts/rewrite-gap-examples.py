#!/usr/bin/env python3
"""
DEPRECATED: template/gtx gap DE is no longer the source of truth.

Use scripts/build-gap-from-corpus.py (Tatoeba + graded readers) instead.
This file is kept only for historical blanking/audit experiments.
"""
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src/data/verb-gap-catalog.json"
VOCAB = ROOT / "public/data/vocabulary.json"
REPORT = ROOT / "scripts/gap-audit-report.json"
REWRITES = ROOT / "scripts/gap-rewrites.json"

PERSONS = ("ich", "du", "er", "wir", "ihr", "sie")

SUBJECT = {
    "ich": "Ich",
    "du": "Du",
    "er": "Er",
    "wir": "Wir",
    "ihr": "Ihr",
    "sie": "Sie",
}

# Complements by governing preposition / bare case
COMP_AN_AKK = [
    "den Lehrer",
    "meine Freundin",
    "den Chef",
    "das Fenster",
    "den Tisch",
    "die Tür",
]
COMP_AN_DAT = [
    "dem Bahnhof",
    "dem Tisch",
    "dem Strand",
    "dem Computer",
    "dem Projekt",
]
COMP_AUF_AKK = [
    "den Bus",
    "meine Hilfe",
    "das Ergebnis",
    "die Prüfung",
    "den Anruf",
    "gute Nachrichten",
]
COMP_AUF_DAT = [
    "der Arbeit",
    "dem Markt",
    "dem Platz",
    "der Party",
]
COMP_AUS_DAT = [
    "dem Haus",
    "der Stadt",
    "dem Zug",
    "dem Büro",
]
COMP_BEI_DAT = [
    "meiner Familie",
    "dem Arzt",
    "der Arbeit",
    "Freunden",
    "uns",
]
COMP_FUER_AKK = [
    "dich",
    "meine Eltern",
    "das Projekt",
    "den Kurs",
    "die Prüfung",
    "uns alle",
]
COMP_IN_AKK = [
    "die Stadt",
    "den Park",
    "das Kino",
    "die Küche",
    "den Urlaub",
]
COMP_IN_DAT = [
    "der Stadt",
    "dem Büro",
    "der Schule",
    "dem Supermarkt",
    "Berlin",
]
COMP_MIT_DAT = [
    "meinen Freunden",
    "dem Zug",
    "der Bahn",
    "meiner Schwester",
    "dem Auto",
    "Kollegen",
]
COMP_NACH_DAT = [
    "Hause",
    "Berlin",
    "dem Essen",
    "der Arbeit",
    "München",
]
COMP_UEBER_AKK = [
    "das Wetter",
    "den Film",
    "die Arbeit",
    "das Problem",
    "den Urlaub",
]
COMP_UM_AKK = [
    "einen Job",
    "Hilfe",
    "einen Termin",
    "die Ecke",
]
COMP_VON_DAT = [
    "der Arbeit",
    "zu Hause",
    "meinen Eltern",
    "dem Treffen",
    "der Reise",
]
COMP_ZU_DAT = [
    "Hause",
    "meiner Freundin",
    "dem Arzt",
    "meiner Mutter",
    "dir",
]
COMP_DURCH_AKK = [
    "den Park",
    "die Stadt",
    "den Tunnel",
]
COMP_UNTER_DAT = [
    "dem Tisch",
    "den Gästen",
    "Stress",
]
COMP_ALS_NOM = [
    "Lehrer",
    "Student",
    "Arzt",
    "Ingenieur",
]
COMP_DAT = [
    "mir",
    "dir",
    "ihm",
    "uns",
    "meiner Schwester",
    "dem Nachbarn",
]
COMP_AKK = [
    "einen Kaffee",
    "das Buch",
    "die Rechnung",
    "meine Hausaufgaben",
    "einen Termin",
    "das Formular",
    "eine E-Mail",
    "den Bericht",
    "Hilfe",
    "Brot",
]

TIME_BITS = [
    "heute",
    "morgen",
    "am Wochenende",
    "jeden Morgen",
    "später",
    "gleich",
    "oft",
    "manchmal",
    "jetzt",
    "bald",
]

# Lemma-specific frames: {person_index extras} — {finite} and {particle} filled later
LEMMA_FRAMES: dict[str, list[str]] = {
    "geben": [
        "{sub} {finite} dem Freund das Buch{particle}.",
        "{sub} {finite} der Frau den Schlüssel{particle}.",
        "{sub} {finite} dem Lehrer die Hausaufgaben{particle}.",
        "{sub} {finite} dem Kind einen Apfel{particle}.",
        "{sub} {finite} den Gästen einen Moment{particle}.",
        "{sub} {finite} Auskunft am Schalter{particle}.",
    ],
    "aufstehen": [
        "{sub} {finite} um sieben Uhr{particle}.",
        "{sub} {finite} früh am Morgen{particle}.",
        "{sub} {finite} sofort nach dem Alarm{particle}.",
        "{sub} {finite} spät am Wochenende{particle}.",
        "{sub} {finite} langsam vom Stuhl{particle}.",
        "{sub} {finite} erst gegen neun{particle}.",
    ],
    "fernsehen": [
        "{sub} {finite} am Abend gerne{particle}.",
        "{sub} {finite} oft Nachrichten{particle}.",
        "{sub} {finite} nach der Arbeit{particle}.",
        "{sub} {finite} eine Stunde lang{particle}.",
        "{sub} {finite} mit der Familie{particle}.",
        "{sub} {finite} nur am Wochenende{particle}.",
    ],
    "einkaufen": [
        "{sub} {finite} im Supermarkt{particle}.",
        "{sub} {finite} am Samstag frisches Obst{particle}.",
        "{sub} {finite} für das Wochenende{particle}.",
        "{sub} {finite} in der Stadtmitte{particle}.",
        "{sub} {finite} online und lokal{particle}.",
        "{sub} {finite} nach der Arbeit{particle}.",
    ],
    "anrufen": [
        "{sub} {finite} meine Eltern{particle}.",
        "{sub} {finite} den Arzt{particle}.",
        "{sub} {finite} dich später{particle}.",
        "{sub} {finite} die Hotline{particle}.",
        "{sub} {finite} einen Freund{particle}.",
        "{sub} {finite} das Büro{particle}.",
    ],
    "aufschreiben": [
        "{sub} {finite} die Adresse{particle}.",
        "{sub} {finite} den Termin im Kalender{particle}.",
        "{sub} {finite} neue Vokabeln{particle}.",
        "{sub} {finite} die Nummer{particle}.",
        "{sub} {finite} alles genau{particle}.",
        "{sub} {finite} die Idee schnell{particle}.",
    ],
    "abgeben": [
        "{sub} {finite} die Hausaufgaben{particle}.",
        "{sub} {finite} den Bericht heute{particle}.",
        "{sub} {finite} das Paket an der Post{particle}.",
        "{sub} {finite} die Schlüssel{particle}.",
        "{sub} {finite} die Formulare{particle}.",
        "{sub} {finite} alles bis Freitag{particle}.",
    ],
    "auffordern": [
        "{sub} {finite} die Gäste zum Essen{particle}.",
        "{sub} {finite} ihn zur Pause{particle}.",
        "{sub} {finite} die Klasse zur Ruhe{particle}.",
        "{sub} {finite} mich zum Mitkommen{particle}.",
        "{sub} {finite} uns zum Gespräch{particle}.",
        "{sub} {finite} dich zur Mitarbeit{particle}.",
    ],
    "kümmern": [
        "{sub} {finite} um die Kinder{particle}.",
        "{sub} {finite} um den Hund{particle}.",
        "{sub} {finite} um die Gäste{particle}.",
        "{sub} {finite} um das Projekt{particle}.",
        "{sub} {finite} um meine Eltern{particle}.",
        "{sub} {finite} um alle Details{particle}.",
    ],
    "ausschließen": [
        "{sub} {finite} das Problem{particle}.",
        "{sub} {finite} einen Fehler{particle}.",
        "{sub} {finite} diese Möglichkeit{particle}.",
        "{sub} {finite} niemanden{particle}.",
        "{sub} {finite} das Risiko nicht{particle}.",
        "{sub} {finite} Betrug sicher{particle}.",
    ],
    "erklären": [
        "{sub} {finite} die Regel noch einmal{particle}.",
        "{sub} {finite} mir den Weg{particle}.",
        "{sub} {finite} das Wort auf Deutsch{particle}.",
        "{sub} {finite} den Plan dem Team{particle}.",
        "{sub} {finite} alles ganz ruhig{particle}.",
        "{sub} {finite} die Aufgabe genau{particle}.",
    ],
    "enthalten": [
        "{sub} {finite} mit dem Kommentar{particle}.",
        "{sub} {finite} diesmal{particle}.",
        "{sub} {finite} bei der Diskussion{particle}.",
        "{sub} {finite} bewusst{particle}.",
        "{sub} {finite} aus dem Streit{particle}.",
        "{sub} {finite} lieber{particle}.",
    ],
    "gewinnen": [
        "{sub} {finite} das Spiel{particle}.",
        "{sub} {finite} den Preis{particle}.",
        "{sub} {finite} Zeit dadurch{particle}.",
        "{sub} {finite} klar mit 3:1{particle}.",
        "{sub} {finite} oft im Team{particle}.",
        "{sub} {finite} die Wette{particle}.",
    ],
    "steigern": [
        "{sub} {finite} die Leistung{particle}.",
        "{sub} {finite} den Umsatz{particle}.",
        "{sub} {finite} mein Tempo{particle}.",
        "{sub} {finite} die Qualität{particle}.",
        "{sub} {finite} den Druck nicht{particle}.",
        "{sub} {finite} die Zahl der Kunden{particle}.",
    ],
    "merken": [
        "{sub} {finite} den Namen{particle}.",
        "{sub} {finite} die Adresse{particle}.",
        "{sub} {finite} den Fehler sofort{particle}.",
        "{sub} {finite} alles Wichtige{particle}.",
        "{sub} {finite} die Nummer{particle}.",
        "{sub} {finite} den Weg{particle}.",
    ],
    "ansetzen": [
        "{sub} {finite} den Termin für Montag{particle}.",
        "{sub} {finite} die Besprechung neu{particle}.",
        "{sub} {finite} den Stift an das Papier{particle}.",
        "{sub} {finite} eine Pause{particle}.",
        "{sub} {finite} den Preis niedriger{particle}.",
        "{sub} {finite} das Treffen auf 10 Uhr{particle}.",
    ],
    "wissen": [
        "{sub} {finite} die Antwort{particle}.",
        "{sub} {finite} Bescheid{particle}.",
        "{sub} {finite} den Weg zum Bahnhof{particle}.",
        "{sub} {finite} noch nichts Genaues{particle}.",
        "{sub} {finite} von dem Treffen{particle}.",
        "{sub} {finite} das schon lange{particle}.",
    ],
    "trinken": [
        "{sub} {finite} gerne einen Tee{particle}.",
        "{sub} {finite} morgens Kaffee{particle}.",
        "{sub} {finite} Wasser nach dem Sport{particle}.",
        "{sub} {finite} einen Saft im Café{particle}.",
        "{sub} {finite} selten Cola{particle}.",
        "{sub} {finite} zusammen einen Kaffee{particle}.",
    ],
    "essen": [
        "{sub} {finite} heute Pasta{particle}.",
        "{sub} {finite} gerne Pizza{particle}.",
        "{sub} {finite} zu Mittag im Büro{particle}.",
        "{sub} {finite} Brot mit Käse{particle}.",
        "{sub} {finite} später zu Abend{particle}.",
        "{sub} {finite} gesund und regelmäßig{particle}.",
    ],
    "finden": [
        "{sub} {finite} den Film spannend{particle}.",
        "{sub} {finite} die Idee gut{particle}.",
        "{sub} {finite} den Weg zum Bahnhof{particle}.",
        "{sub} {finite} das Buch interessant{particle}.",
        "{sub} {finite} keine Lösung{particle}.",
        "{sub} {finite} die Prüfung fair{particle}.",
    ],
    "machen": [
        "{sub} {finite} die Hausaufgaben{particle}.",
        "{sub} {finite} einen Kaffee{particle}.",
        "{sub} {finite} Sport am Abend{particle}.",
        "{sub} {finite} einen Fehler{particle}.",
        "{sub} {finite} Pause um zwölf{particle}.",
        "{sub} {finite} das Bett jeden Morgen{particle}.",
    ],
    "fahren": [
        "{sub} {finite} mit dem Bus zur Arbeit{particle}.",
        "{sub} {finite} morgen nach Berlin{particle}.",
        "{sub} {finite} oft mit dem Rad{particle}.",
        "{sub} {finite} nach Hause{particle}.",
        "{sub} {finite} in den Urlaub{particle}.",
        "{sub} {finite} langsam durch die Stadt{particle}.",
    ],
    "gehen": [
        "{sub} {finite} zu Fuß zum Bahnhof{particle}.",
        "{sub} {finite} heute früh schlafen{particle}.",
        "{sub} {finite} gerne spazieren{particle}.",
        "{sub} {finite} in den Park{particle}.",
        "{sub} {finite} zur Arbeit{particle}.",
        "{sub} {finite} nach Hause{particle}.",
    ],
    "kommen": [
        "{sub} {finite} später zur Party{particle}.",
        "{sub} {finite} aus Berlin{particle}.",
        "{sub} {finite} gleich nach Hause{particle}.",
        "{sub} {finite} oft zu spät{particle}.",
        "{sub} {finite} mit dem Zug{particle}.",
        "{sub} {finite} morgen wieder{particle}.",
    ],
    "sehen": [
        "{sub} {finite} den Film im Kino{particle}.",
        "{sub} {finite} dich morgen{particle}.",
        "{sub} {finite} das Problem klar{particle}.",
        "{sub} {finite} viele Leute auf der Straße{particle}.",
        "{sub} {finite} den Bus nicht{particle}.",
        "{sub} {finite} das Meer von hier{particle}.",
    ],
    "hören": [
        "{sub} {finite} gerne Musik{particle}.",
        "{sub} {finite} den Alarm nicht{particle}.",
        "{sub} {finite} Radio am Morgen{particle}.",
        "{sub} {finite} Schritte auf dem Flur{particle}.",
        "{sub} {finite} die Nachricht klar{particle}.",
        "{sub} {finite} einen seltsamen Ton{particle}.",
    ],
    "lesen": [
        "{sub} {finite} jeden Abend ein Buch{particle}.",
        "{sub} {finite} die Zeitung am Morgen{particle}.",
        "{sub} {finite} die E-Mail noch einmal{particle}.",
        "{sub} {finite} gerne Romane{particle}.",
        "{sub} {finite} den Text langsam{particle}.",
        "{sub} {finite} die Anleitung genau{particle}.",
    ],
    "schreiben": [
        "{sub} {finite} eine E-Mail an den Chef{particle}.",
        "{sub} {finite} den Bericht heute{particle}.",
        "{sub} {finite} oft Postkarten{particle}.",
        "{sub} {finite} mit dem Laptop{particle}.",
        "{sub} {finite} den Namen auf die Liste{particle}.",
        "{sub} {finite} eine Nachricht{particle}.",
    ],
    "sprechen": [
        "{sub} {finite} Deutsch mit den Nachbarn{particle}.",
        "{sub} {finite} über das Projekt{particle}.",
        "{sub} {finite} laut und deutlich{particle}.",
        "{sub} {finite} mit dem Arzt{particle}.",
        "{sub} {finite} drei Sprachen{particle}.",
        "{sub} {finite} gerne vor Gruppen{particle}.",
    ],
    "sagen": [
        "{sub} {finite} die Wahrheit{particle}.",
        "{sub} {finite} ihm Bescheid{particle}.",
        "{sub} {finite} danke zur Verkäuferin{particle}.",
        "{sub} {finite} nichts dazu{particle}.",
        "{sub} {finite} den Satz noch einmal{particle}.",
        "{sub} {finite} hallo zu allen{particle}.",
    ],
    "wohnen": [
        "{sub} {finite} in Berlin{particle}.",
        "{sub} {finite} seit einem Jahr hier{particle}.",
        "{sub} {finite} mit Freunden zusammen{particle}.",
        "{sub} {finite} nahe am Bahnhof{particle}.",
        "{sub} {finite} in einer kleinen Wohnung{particle}.",
        "{sub} {finite} noch bei den Eltern{particle}.",
    ],
    "arbeiten": [
        "{sub} {finite} in einem Büro{particle}.",
        "{sub} {finite} von zu Hause{particle}.",
        "{sub} {finite} an dem Projekt{particle}.",
        "{sub} {finite} bis spät am Abend{particle}.",
        "{sub} {finite} als Lehrer{particle}.",
        "{sub} {finite} gerne im Team{particle}.",
    ],
    "lernen": [
        "{sub} {finite} jeden Tag Deutsch{particle}.",
        "{sub} {finite} für die Prüfung{particle}.",
        "{sub} {finite} neue Wörter{particle}.",
        "{sub} {finite} mit einer App{particle}.",
        "{sub} {finite} am Abend zwei Stunden{particle}.",
        "{sub} {finite} gerne in der Gruppe{particle}.",
    ],
    "kaufen": [
        "{sub} {finite} Brot beim Bäcker{particle}.",
        "{sub} {finite} ein neues Handy{particle}.",
        "{sub} {finite} Obst auf dem Markt{particle}.",
        "{sub} {finite} Tickets online{particle}.",
        "{sub} {finite} Milch und Butter{particle}.",
        "{sub} {finite} Geschenke für die Familie{particle}.",
    ],
    "öffnen": [
        "{sub} {finite} das Fenster{particle}.",
        "{sub} {finite} die Tür{particle}.",
        "{sub} {finite} den Brief vorsichtig{particle}.",
        "{sub} {finite} den Laden um neun{particle}.",
        "{sub} {finite} die App auf dem Handy{particle}.",
        "{sub} {finite} den Mund zum Sprechen{particle}.",
    ],
    "schließen": [
        "{sub} {finite} die Tür leise{particle}.",
        "{sub} {finite} das Fenster wegen der Kälte{particle}.",
        "{sub} {finite} den Laden um acht{particle}.",
        "{sub} {finite} die Augen einen Moment{particle}.",
        "{sub} {finite} den Laptop{particle}.",
        "{sub} {finite} die Flasche{particle}.",
    ],
    "liegen": [
        "{sub} {finite} auf dem Sofa{particle}.",
        "{sub} {finite} krank im Bett{particle}.",
        "{sub} {finite} noch im Bett{particle}.",
        "{sub} {finite} entspannt am Strand{particle}.",
        "{sub} {finite} oft lange wach{particle}.",
        "{sub} {finite} gerne in der Sonne{particle}.",
    ],
    "stehen": [
        "{sub} {finite} an der Haltestelle{particle}.",
        "{sub} {finite} vor dem Spiegel{particle}.",
        "{sub} {finite} im Stau{particle}.",
        "{sub} {finite} hinter der Tür{particle}.",
        "{sub} {finite} für die Idee{particle}.",
        "{sub} {finite} lange in der Schlange{particle}.",
    ],
    "sitzen": [
        "{sub} {finite} am Schreibtisch{particle}.",
        "{sub} {finite} im Café{particle}.",
        "{sub} {finite} neben dir{particle}.",
        "{sub} {finite} gerne am Fenster{particle}.",
        "{sub} {finite} in der ersten Reihe{particle}.",
        "{sub} {finite} schon seit einer Stunde hier{particle}.",
    ],
    "laufen": [
        "{sub} {finite} jeden Morgen im Park{particle}.",
        "{sub} {finite} zur Bushaltestelle{particle}.",
        "{sub} {finite} schnell nach Hause{particle}.",
        "{sub} {finite} trotz des Regens{particle}.",
        "{sub} {finite} fünf Kilometer{particle}.",
        "{sub} {finite} ohne Pause weiter{particle}.",
    ],
    "schwimmen": [
        "{sub} {finite} im See{particle}.",
        "{sub} {finite} gerne im Sommer{particle}.",
        "{sub} {finite} eine Stunde lang{particle}.",
        "{sub} {finite} im Hallenbad{particle}.",
        "{sub} {finite} mit Freunden{particle}.",
        "{sub} {finite} am Wochenende oft{particle}.",
    ],
    "schlafen": [
        "{sub} {finite} acht Stunden{particle}.",
        "{sub} {finite} tief und fest{particle}.",
        "{sub} {finite} oft schlecht{particle}.",
        "{sub} {finite} schon um zehn{particle}.",
        "{sub} {finite} bei offenem Fenster{particle}.",
        "{sub} {finite} nach der Reise lange{particle}.",
    ],
    "helfen": [
        "{sub} {finite} dir gerne{particle}.",
        "{sub} {finite} meiner Mutter in der Küche{particle}.",
        "{sub} {finite} dem Nachbarn{particle}.",
        "{sub} {finite} bei den Hausaufgaben{particle}.",
        "{sub} {finite} immer im Team{particle}.",
        "{sub} {finite} den Gästen mit dem Gepäck{particle}.",
    ],
    "brauchen": [
        "{sub} {finite} mehr Zeit{particle}.",
        "{sub} {finite} deine Hilfe{particle}.",
        "{sub} {finite} einen Termin{particle}.",
        "{sub} {finite} Ruhe zum Lernen{particle}.",
        "{sub} {finite} einen Stift{particle}.",
        "{sub} {finite} das Dokument noch heute{particle}.",
    ],
    "kennen": [
        "{sub} {finite} die Stadt gut{particle}.",
        "{sub} {finite} ihn seit Jahren{particle}.",
        "{sub} {finite} den Weg zum Museum{particle}.",
        "{sub} {finite} das Problem{particle}.",
        "{sub} {finite} viele Leute hier{particle}.",
        "{sub} {finite} die Regeln genau{particle}.",
    ],
    "verstehen": [
        "{sub} {finite} die Frage{particle}.",
        "{sub} {finite} dich gut{particle}.",
        "{sub} {finite} den Text nur teilweise{particle}.",
        "{sub} {finite} das System langsam{particle}.",
        "{sub} {finite} kein Wort{particle}.",
        "{sub} {finite} die Situation jetzt{particle}.",
    ],
    "erzählen": [
        "{sub} {finite} eine Geschichte{particle}.",
        "{sub} {finite} von der Reise{particle}.",
        "{sub} {finite} dir alles später{particle}.",
        "{sub} {finite} den Kindern ein Märchen{particle}.",
        "{sub} {finite} oft von der Arbeit{particle}.",
        "{sub} {finite} gerne Witze{particle}.",
    ],
    "spielen": [
        "{sub} {finite} Fußball im Park{particle}.",
        "{sub} {finite} Klavier seit der Kindheit{particle}.",
        "{sub} {finite} gerne Brettspiele{particle}.",
        "{sub} {finite} mit den Kindern{particle}.",
        "{sub} {finite} Tennis am Wochenende{particle}.",
        "{sub} {finite} eine Rolle im Theater{particle}.",
    ],
    "kochen": [
        "{sub} {finite} heute Pasta{particle}.",
        "{sub} {finite} gerne für Freunde{particle}.",
        "{sub} {finite} eine Suppe{particle}.",
        "{sub} {finite} mit frischen Zutaten{particle}.",
        "{sub} {finite} das Abendessen{particle}.",
        "{sub} {finite} selten Fleisch{particle}.",
    ],
    "feiern": [
        "{sub} {finite} meinen Geburtstag{particle}.",
        "{sub} {finite} mit Freunden{particle}.",
        "{sub} {finite} das neue Jahr{particle}.",
        "{sub} {finite} den Erfolg im Team{particle}.",
        "{sub} {finite} bis spät in die Nacht{particle}.",
        "{sub} {finite} gerne Feste{particle}.",
    ],
    "bestellen": [
        "{sub} {finite} eine Pizza{particle}.",
        "{sub} {finite} zwei Kaffee{particle}.",
        "{sub} {finite} das Menü für uns{particle}.",
        "{sub} {finite} online neue Bücher{particle}.",
        "{sub} {finite} das Essen zum Mitnehmen{particle}.",
        "{sub} {finite} noch ein Glas Wasser{particle}.",
    ],
    "bezahlen": [
        "{sub} {finite} die Rechnung{particle}.",
        "{sub} {finite} bar an der Kasse{particle}.",
        "{sub} {finite} mit der Karte{particle}.",
        "{sub} {finite} die Miete pünktlich{particle}.",
        "{sub} {finite} für alle{particle}.",
        "{sub} {finite} den Eintritt{particle}.",
    ],
    "suchen": [
        "{sub} {finite} meine Schlüssel{particle}.",
        "{sub} {finite} eine neue Wohnung{particle}.",
        "{sub} {finite} den Ausgang{particle}.",
        "{sub} {finite} Arbeit in der Stadt{particle}.",
        "{sub} {finite} eine Lösung{particle}.",
        "{sub} {finite} dich seit einer Stunde{particle}.",
    ],
    "warten": [
        "{sub} {finite} auf den Bus{particle}.",
        "{sub} {finite} vor dem Kino{particle}.",
        "{sub} {finite} geduldig auf dich{particle}.",
        "{sub} {finite} im Wartezimmer{particle}.",
        "{sub} {finite} schon seit zehn Minuten{particle}.",
        "{sub} {finite} auf eine Antwort{particle}.",
    ],
    "tun": [
        "{sub} {finite} mein Bestes{particle}.",
        "{sub} {finite} nichts Falsches{particle}.",
        "{sub} {finite} was nötig ist{particle}.",
        "{sub} {finite} das aus Prinzip{particle}.",
        "{sub} {finite} so etwas nie{particle}.",
        "{sub} {finite} alles für die Familie{particle}.",
    ],
    "leben": [
        "{sub} {finite} in Deutschland{particle}.",
        "{sub} {finite} gesund und ruhig{particle}.",
        "{sub} {finite} seit Jahren hier{particle}.",
        "{sub} {finite} allein in der Stadt{particle}.",
        "{sub} {finite} mit meiner Familie{particle}.",
        "{sub} {finite} gerne am Meer{particle}.",
    ],
}


def fold(s: str) -> str:
    s = s.lower().replace("ß", "ss")
    s = unicodedata.normalize("NFD", s)
    return "".join(ch for ch in s if unicodedata.category(ch) != "Mn")


def escape_re(s: str) -> str:
    return re.escape(s)


def find_token(hay: str, needle: str) -> int:
    if not needle:
        return -1
    re_tok = re.compile(
        rf"(?<![\wÄÖÜäöüß]){escape_re(needle)}(?![\wÄÖÜäöüß])",
        re.IGNORECASE,
    )
    m = re_tok.search(hay)
    if m:
        return m.start()
    needle_f = fold(needle)
    for m in re.finditer(r"[\wÄÖÜäöüß]+", hay, re.IGNORECASE):
        if fold(m.group(0)) == needle_f:
            return m.start()
    return -1


def blank(sentence: str, start: int, length: int) -> str:
    return f"{sentence[:start]}_______{sentence[start + length:]}"


def uniq(items: list[str]) -> list[str]:
    out, seen = [], set()
    for x in items:
        n = x.strip().lower()
        if not n or n in seen:
            continue
        seen.add(n)
        out.append(x.strip())
    return out


def pick(seed: str, options: list[str]) -> str:
    h = int(hashlib.md5(seed.encode("utf-8")).hexdigest(), 16)
    return options[h % len(options)]


SEP_PREFIXES = (
    "zurück",
    "zusammen",
    "weiter",
    "fern",
    "statt",
    "teil",
    "auf",
    "aus",
    "ein",
    "mit",
    "nach",
    "vor",
    "zu",
    "ab",
    "an",
    "bei",
    "los",
)


def split_fused_separable(lemma: str, finite: str) -> tuple[str, str] | None:
    """fernsehe + fernsehen → (sehe, fern)."""
    bare = lemma.lower().replace("sich ", "").strip()
    fin = finite.lower()
    for pref in SEP_PREFIXES:
        if bare.startswith(pref) and len(bare) > len(pref) and fin.startswith(pref):
            stem_lemma = bare[len(pref) :]
            stem_fin = fin[len(pref) :]
            if stem_lemma and stem_fin:
                return stem_fin, pref
    return None


def parse_full_form(full: str, lemma: str = "") -> tuple[str, str, str]:
    """Return (finite, reflexive_or_empty, particle_or_empty)."""
    parts = full.strip().split()
    if not parts:
        return full, "", ""
    finite = parts[0]
    refl = ""
    particle = ""
    rest = parts[1:]
    if rest and rest[0].lower() in {
        "mich",
        "dich",
        "sich",
        "uns",
        "euch",
        "mir",
        "dir",
    }:
        refl = rest[0]
        rest = rest[1:]
    if rest:
        particle = " ".join(rest)
    elif lemma and " " not in full:
        split = split_fused_separable(lemma, finite)
        if split:
            finite, particle = split
    return finite, refl, particle


def parse_rektion(rektion: str | None) -> list[tuple[str, str]]:
    """Return list of (prep_or_CASE, case) preferring first alternative."""
    if not rektion:
        return []
    text = rektion.replace("(sich)", "").strip()
    # take first branch before /
    branch = text.split("/")[0].strip()
    # also split "A / B" already done; handle "mit + Dat. / nach"
    branch = branch.split("/")[0].strip()
    out: list[tuple[str, str]] = []
    for piece in re.split(r"\s*/\s*", text):
        piece = piece.strip()
        if not piece:
            continue
        m = re.match(
            r"^(an|auf|aus|bei|durch|für|in|mit|nach|über|um|unter|von|zu|als|wie)\s*\+\s*(Akk|Dat|Nom)\.?",
            piece,
            re.I,
        )
        if m:
            out.append((m.group(1).lower(), m.group(2).capitalize()))
            break
        if re.match(r"^\+\s*Dat", piece, re.I):
            out.append(("DAT", "Dat"))
            break
        if re.match(r"^\+\s*Akk", piece, re.I):
            out.append(("AKK", "Akk"))
            break
    if not out and branch:
        m = re.match(
            r"^(an|auf|aus|bei|durch|für|in|mit|nach|über|um|unter|von|zu|als|wie)\s*\+\s*(Akk|Dat|Nom)\.?",
            branch,
            re.I,
        )
        if m:
            out.append((m.group(1).lower(), m.group(2).capitalize()))
    return out


def comps_for(prep: str, case: str) -> list[str]:
    key = (prep, case)
    mapping = {
        ("an", "Akk"): COMP_AN_AKK,
        ("an", "Dat"): COMP_AN_DAT,
        ("auf", "Akk"): COMP_AUF_AKK,
        ("auf", "Dat"): COMP_AUF_DAT,
        ("aus", "Dat"): COMP_AUS_DAT,
        ("bei", "Dat"): COMP_BEI_DAT,
        ("für", "Akk"): COMP_FUER_AKK,
        ("in", "Akk"): COMP_IN_AKK,
        ("in", "Dat"): COMP_IN_DAT,
        ("mit", "Dat"): COMP_MIT_DAT,
        ("nach", "Dat"): COMP_NACH_DAT,
        ("über", "Akk"): COMP_UEBER_AKK,
        ("um", "Akk"): COMP_UM_AKK,
        ("von", "Dat"): COMP_VON_DAT,
        ("zu", "Dat"): COMP_ZU_DAT,
        ("durch", "Akk"): COMP_DURCH_AKK,
        ("unter", "Dat"): COMP_UNTER_DAT,
        ("als", "Nom"): COMP_ALS_NOM,
        ("DAT", "Dat"): COMP_DAT,
        ("AKK", "Akk"): COMP_AKK,
    }
    return mapping.get(key, COMP_AKK)


def build_object(seed: str, rektion: str | None) -> str:
    parsed = parse_rektion(rektion)
    if not parsed:
        obj = pick(seed + ":obj", COMP_AKK)
        return obj
    prep, case = parsed[0]
    options = comps_for(prep, case)
    chosen = pick(seed + ":obj", options)
    if prep in {"DAT", "AKK"}:
        return chosen
    if prep in {"als", "wie"}:
        return f"{prep} {chosen}"
    return f"{prep} {chosen}"


def normalize_finite_display(finite: str) -> str:
    # Catalog sometimes stores "Rufst" / "Stehst" capitalized mid-sentence
    if not finite:
        return finite
    return finite[:1].lower() + finite[1:]


INTRANSITIVE_MOTION = {
    "aufstehen",
    "ankommen",
    "aussteigen",
    "einsteigen",
    "mitkommen",
    "weitergehen",
    "spazieren",
}


def prefer_full_form(lemma: str, person: str, catalog_full: str, conj_map: dict) -> str:
    bare = lemma.lower().replace("sich ", "").strip()
    conj = conj_map.get(lemma.lower()) or conj_map.get(bare)
    if conj and conj.get(person):
        return conj[person]
    return catalog_full


def discover_particles(catalog: list) -> dict[str, str]:
    """Learn separable particles from pre-rewrite sentences (… auf. / … ein?)."""
    found: dict[str, str] = {}
    pat = re.compile(
        r"\b(" + "|".join(sorted(SEP_PREFIXES, key=len, reverse=True)) + r")\s*[.?!]?$",
        re.I,
    )
    for verb in catalog:
        lemma = verb["lemma"]
        if lemma in found:
            continue
        for form in verb.get("forms", {}).values():
            m = pat.search((form.get("de") or "").strip())
            if m:
                found[lemma] = m.group(1).lower()
                break
    return found


def with_particle(full_form: str, lemma: str, particle_map: dict[str, str]) -> str:
    finite, refl, particle = parse_full_form(full_form, lemma)
    if not particle:
        particle = particle_map.get(lemma, "")
    if not particle:
        return full_form
    bits = [normalize_finite_display(finite)]
    if refl:
        bits.append(refl)
    bits.append(particle)
    return " ".join(bits)


def build_sentence(
    lemma: str,
    person: str,
    full_form: str,
    rektion: str | None,
    level: str,
) -> str:
    bare = lemma.lower().replace("sich ", "").strip()
    finite_raw, refl_in_form, particle = parse_full_form(full_form, lemma)
    finite = normalize_finite_display(finite_raw)

    # Prefer reflexive pronoun from fullForm; else add for sich-lemmas /
    # verbs that need a reflexive object (enthalten ≈ sich enthalten).
    refl = refl_in_form
    needs_refl = lemma.lower().startswith("sich ") or bare in {
        "enthalten",
        "freuen",
        "ärgern",
        "interessieren",
        "entschuldigen",
        "erinnern",
        "anpassen",
        "bewerben",
        "erkundigen",
        "ausruhen",
        "entscheiden",
        "melden",
        "treffen",
        "unterhalten",
        "vorbereiten",
    }
    if not refl and needs_refl:
        refl = {
            "ich": "mich",
            "du": "dich",
            "er": "sich",
            "wir": "uns",
            "ihr": "euch",
            "sie": "sich",
        }[person]

    sub = SUBJECT[person]
    seed = f"{bare}|{person}|{level}"
    particle_tail = f" {particle}" if particle else ""
    refl_bit = f" {refl}" if refl else ""

    frames = LEMMA_FRAMES.get(bare)
    if frames:
        frame = pick(seed + ":frame", frames)
        finite_slot = f"{finite}{refl_bit}".strip()
        sent = frame.format(sub=sub, finite=finite_slot, particle=particle_tail)
        sent = re.sub(r"\s+", " ", sent).strip()
        sent = re.sub(r"\s+\.", ".", sent)
        return polish(sent, person)

    # Generic frame from rektion / verb class
    if bare in INTRANSITIVE_MOTION or (particle and not rektion):
        place_time = [
            "früh",
            "spät",
            "um sieben Uhr",
            "am Morgen",
            "nach der Arbeit",
            "zu Hause",
            "im Büro",
            "am Bahnhof",
            "gleich",
            "morgen früh",
        ]
        obj = pick(seed + ":pt", place_time)
    else:
        obj = build_object(seed, rektion)
    # Separable particle must not also appear as the object's preposition.
    if particle and re.match(rf"^{re.escape(particle)}\b", obj, re.I):
        obj = pick(
            seed + ":safe",
            [
                "das",
                "es",
                "den Plan",
                "die Idee",
                "einen Termin",
                "die Sache",
            ],
        )
    time = pick(seed + ":time", TIME_BITS)

    # Mix patterns
    pattern_id = int(hashlib.md5((seed + ":pat").encode()).hexdigest(), 16) % 4
    if person in {"du", "ihr"} and pattern_id == 0:
        if person == "du":
            core = f"{finite.capitalize()}{refl_bit} du {obj}{particle_tail}"
        else:
            core = f"{finite.capitalize()}{refl_bit} ihr {obj}{particle_tail}"
        sent = core.strip() + "?"
    elif pattern_id == 1:
        sent = f"{sub} {finite}{refl_bit} {time} {obj}{particle_tail}."
    elif pattern_id == 2:
        sent = f"{sub} {finite}{refl_bit} {obj} {time}{particle_tail}."
    else:
        sent = f"{sub} {finite}{refl_bit} {obj}{particle_tail}."

    return polish(sent, person)


def polish(sent: str, person: str) -> str:
    sent = re.sub(r"\s+", " ", sent).strip()
    sent = sent.replace(" .", ".").replace(" ?", "?")
    # clean doubled particles / spaces before punctuation
    sent = re.sub(r"\s+([.?])", r"\1", sent)
    # Fix "Du kaufst du" style if any
    sent = re.sub(r"\bDu (\w+) du\b", r"Du \1", sent)
    sent = re.sub(r"\bIhr (\w+) ihr\b", r"Ihr \1", sent)
    return sent


def extract_blank(sentence: str, full_form: str, lemma: str, person: str) -> dict | None:
    finite, _, particle = parse_full_form(full_form, lemma)
    finite_norm = normalize_finite_display(finite)
    expected_base = [finite_norm, finite, full_form]
    if particle:
        expected_base.append(f"{finite_norm} {particle}")
        # also accept fused answers that may still be in old catalog expectations
        expected_base.append(f"{particle}{finite_norm}")
    for candidate in uniq(
        [
            finite,
            finite_norm,
            finite.capitalize(),
            finite_norm.capitalize(),
        ]
    ):
        idx = find_token(sentence, candidate)
        if idx >= 0:
            disp = sentence[idx : idx + len(candidate)]
            expected = uniq(expected_base + [disp])
            return {
                "finite": disp,
                "fullForm": (
                    f"{finite_norm} {particle}".strip()
                    if particle and " " not in full_form
                    else full_form
                ),
                "promptDe": blank(sentence, idx, len(disp)),
                "expected": expected,
            }
    return None


def load_vocab_conj() -> dict[str, dict]:
    if not VOCAB.exists():
        return {}
    vocab = json.loads(VOCAB.read_text(encoding="utf-8"))
    out: dict[str, dict] = {}
    for e in vocab:
        if e.get("pos") != "verb" or not e.get("conjugations"):
            continue
        lemma = e["lemma"].lower()
        out[lemma] = e["conjugations"]
        out[lemma.replace("sich ", "").strip()] = e["conjugations"]
    return out


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    flagged_keys = {(item["id"], item["person"]) for item in report["items"]}
    conj_map = load_vocab_conj()
    particle_map = discover_particles(catalog)

    rewrites: dict[str, str] = {}
    updated = 0
    failed: list[dict] = []

    for verb in catalog:
        for person in PERSONS:
            key = (verb["id"], person)
            if key not in flagged_keys:
                continue
            form = verb["forms"][person]
            catalog_full = form.get("fullForm") or form.get("finite") or ""
            full = prefer_full_form(verb["lemma"], person, catalog_full, conj_map)
            full = with_particle(full, verb["lemma"], particle_map)
            new_de = build_sentence(
                verb["lemma"],
                person,
                full,
                verb.get("rektion"),
                verb.get("level") or "A1",
            )
            extracted = extract_blank(new_de, full, verb["lemma"], person)
            if not extracted or "_______" not in extracted["promptDe"]:
                failed.append(
                    {
                        "id": verb["id"],
                        "person": person,
                        "de": new_de,
                        "fullForm": full,
                    }
                )
                continue

            form["de"] = new_de
            form["promptDe"] = extracted["promptDe"]
            form["finite"] = extracted["finite"]
            form["fullForm"] = extracted["fullForm"]
            form["expected"] = uniq(
                extracted["expected"] + list(form.get("expected") or [])
            )
            form.pop("en", None)
            form.pop("ru", None)
            rewrites[f"{verb['id']}|{person}"] = new_de
            updated += 1

    REWRITES.write_text(
        json.dumps(rewrites, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    CATALOG.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "flagged": len(flagged_keys),
                "updated": updated,
                "failed": len(failed),
                "failedSample": failed[:10],
                "rewrites": str(REWRITES),
                "catalog": str(CATALOG),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
