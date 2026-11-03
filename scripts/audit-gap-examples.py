#!/usr/bin/env python3
"""Flag gap-fill German examples that reuse stock complements or look broken."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src/data/verb-gap-catalog.json"
REPORT = ROOT / "scripts/gap-audit-report.json"
PERSONS = ("ich", "du", "er", "wir", "ihr", "sie")
SHARED_VERB_THRESHOLD = 5
TRAILING_PARTICLES = {
    "an",
    "auf",
    "aus",
    "ein",
    "mit",
    "nach",
    "vor",
    "zu",
    "ab",
    "bei",
    "fern",
    "los",
    "weiter",
    "zurück",
    "zusammen",
    "statt",
    "teil",
}

FUSED_SEPARABLE = re.compile(
    r"\b(fernsehe|fernsehst|fernseht|einkaufe|einkaufst|einkauft|"
    r"aufstehe|aufstehst|aufsteht|anrufe|anrufst|anruft)\b",
    re.I,
)


def complement_key(prompt_de: str) -> str:
    rest = prompt_de.replace("_______", "", 1).strip(" .?!")
    rest = re.sub(
        r"^(Ich|Du|Er|Sie|Es|Wir|Ihr|Man)\s+",
        "",
        rest,
        flags=re.I,
    ).strip()
    toks = rest.split()
    # Separable particle at end made stock NPs look unique — strip it.
    if toks and toks[-1].lower().rstrip(".?!") in TRAILING_PARTICLES:
        toks = toks[:-1]
    return re.sub(r"\s+", " ", " ".join(toks).lower())


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    verb_to_comps: dict[str, set[str]] = defaultdict(set)
    rows: list[dict] = []

    for verb in catalog:
        lemma = verb["lemma"]
        for person in PERSONS:
            form = verb.get("forms", {}).get(person)
            if not form or not form.get("de"):
                continue
            key = complement_key(form["promptDe"])
            rows.append(
                {
                    "id": verb["id"],
                    "lemma": lemma,
                    "level": verb.get("level"),
                    "rektion": verb.get("rektion"),
                    "person": person,
                    "de": form["de"],
                    "promptDe": form["promptDe"],
                    "finite": form.get("finite"),
                    "fullForm": form.get("fullForm"),
                    "complementKey": key,
                }
            )
            if len(key) > 8:
                verb_to_comps[key].add(lemma)

    shared_keys = {
        k for k, lemmas in verb_to_comps.items() if len(lemmas) >= SHARED_VERB_THRESHOLD
    }

    flagged: list[dict] = []
    for row in rows:
        reasons: list[str] = []
        if row["complementKey"] in shared_keys:
            reasons.append(
                f"shared_complement:{len(verb_to_comps[row['complementKey']])}_verbs"
            )
        if FUSED_SEPARABLE.search(row["de"] or ""):
            reasons.append("fused_separable_finite")
        if reasons:
            flagged.append({**row, "reasons": reasons})

    report = {
        "totalForms": len(rows),
        "flaggedForms": len(flagged),
        "sharedComplementKeys": len(shared_keys),
        "thresholdVerbs": SHARED_VERB_THRESHOLD,
        "items": flagged,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "totalForms": report["totalForms"],
                "flaggedForms": report["flaggedForms"],
                "sharedComplementKeys": report["sharedComplementKeys"],
                "out": str(REPORT),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
