#!/usr/bin/env python3
"""Convert the natural-examples Excel workbook into verb-gap-catalog.json."""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
XLSX = Path(
    "/Users/vkhramov/Downloads/German_Verbs_Real_Natural_Examples (1).xlsx"
)
OUT = ROOT / "src/data/verb-gap-catalog.json"
VOCAB = ROOT / "public/data/vocabulary.json"

PERSON_COLS = {
    "ich": 6,
    "du": 7,
    "er": 8,  # er/sie/es
    "wir": 9,
    "ihr": 10,
    "sie": 11,  # sie/Sie
}

LEMMA_FIXES = {
    "kümmere": "kümmern",
}


def slug(lemma: str) -> str:
    s = unicodedata.normalize("NFD", lemma.lower().replace("ß", "ss"))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "verb"


def escape_re(s: str) -> str:
    return re.escape(s)


def fold(s: str) -> str:
    s = s.lower().replace("ß", "ss")
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return s


def find_token(hay: str, needle: str) -> int:
    """Find needle as a whole token; tolerate missing umlauts in the source text."""
    if not needle:
        return -1
    # Exact / case-insensitive first
    re_tok = re.compile(
        rf"(?<![\wÄÖÜäöüß]){escape_re(needle)}(?![\wÄÖÜäöüß])",
        re.IGNORECASE,
    )
    m = re_tok.search(hay)
    if m:
        return m.start()

    # Folded match (fängst ↔ Fangst)
    needle_f = fold(needle)
    for m in re.finditer(r"[\wÄÖÜäöüß]+", hay, re.IGNORECASE):
        if fold(m.group(0)) == needle_f:
            return m.start()
    return -1


def finite_and_rest(full: str) -> tuple[str, str]:
    parts = full.strip().split()
    return parts[0], " ".join(parts[1:])


def extract_with_conjugations(sentence: str, conj: dict, person: str) -> dict | None:
    full = conj.get(person)
    if not full:
        return None
    finite, _ = finite_and_rest(full)
    # try longer full form if present as contiguous tokens (rare for separable)
    idx_full = find_token(sentence, full) if " " not in full else -1
    if idx_full >= 0:
        return {
            "finite": full,
            "fullForm": full,
            "promptDe": blank(sentence, idx_full, len(full)),
            "expected": uniq([full]),
        }
    idx = find_token(sentence, finite)
    if idx < 0:
        # case variants for sentence-initial Du-forms etc.
        idx = find_token(sentence, finite.capitalize())
        if idx >= 0:
            finite_disp = sentence[idx : idx + len(finite)]
            return {
                "finite": finite_disp,
                "fullForm": full,
                "promptDe": blank(sentence, idx, len(finite)),
                "expected": uniq([finite, finite_disp, full]),
            }
        return None
    finite_disp = sentence[idx : idx + len(finite)]
    return {
        "finite": finite_disp,
        "fullForm": full,
        "promptDe": blank(sentence, idx, len(finite)),
        "expected": uniq([finite, finite_disp, full]),
    }


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


def extract_heuristic(sentence: str, person: str) -> dict | None:
    s = sentence.strip()
    patterns: list[re.Pattern[str]] = []
    if person == "ich":
        patterns = [re.compile(r"^Ich\s+(\S+)", re.I)]
    elif person == "du":
        patterns = [
            re.compile(r"^(\S+)\s+du\b", re.I),
            re.compile(r"^Du\s+(\S+)", re.I),
        ]
    elif person == "er":
        patterns = [
            re.compile(r"^(Er|Sie|Es|Das|Der|Die|Man)\s+(\S+)", re.I),
            re.compile(r"^(\S+)\s+(er|sie|es)\b", re.I),
        ]
    elif person == "wir":
        patterns = [
            re.compile(r"^Wir\s+(\S+)", re.I),
            re.compile(r"^(\S+)\s+wir\b", re.I),
        ]
    elif person == "ihr":
        patterns = [
            re.compile(r"^Ihr\s+(\S+)", re.I),
            re.compile(r"^(\S+)\s+ihr\b", re.I),
        ]
    elif person == "sie":
        patterns = [
            re.compile(r"^Sie\s+(\S+)", re.I),
            re.compile(r"^(\S+)\s+Sie\b"),
        ]

    for pat in patterns:
        m = pat.search(s)
        if not m:
            continue
        # last group is the verb token
        finite = m.group(m.lastindex or 1)
        # skip if captured subject pronoun by mistake
        if finite.lower() in {
            "ich",
            "du",
            "er",
            "sie",
            "es",
            "wir",
            "ihr",
            "das",
            "der",
            "die",
            "man",
        }:
            continue
        start = m.start(m.lastindex or 1)
        return {
            "finite": finite,
            "fullForm": finite,
            "promptDe": blank(s, start, len(finite)),
            "expected": uniq([finite, finite.lower()]),
        }
    return None


def load_vocab_conjugations() -> dict[str, dict]:
    vocab = json.loads(VOCAB.read_text(encoding="utf-8"))
    out: dict[str, dict] = {}
    for e in vocab:
        if e.get("pos") != "verb" or not e.get("conjugations"):
            continue
        lemma = e["lemma"].lower()
        out[lemma] = e["conjugations"]
        bare = lemma.replace("sich ", "").strip()
        out[bare] = e["conjugations"]
    return out


def main() -> None:
    if not XLSX.exists():
        raise SystemExit(f"Missing workbook: {XLSX}")

    conj_map = load_vocab_conjugations()
    wb = load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    rows = list(ws.iter_rows(values_only=True))[1:]

    catalog = []
    skipped_forms = 0
    total_forms = 0

    for row in rows:
        raw_lemma = str(row[1] or "").strip()
        if not raw_lemma:
            continue
        lemma = LEMMA_FIXES.get(raw_lemma, raw_lemma)
        level = str(row[2] or "").strip()
        if level not in {"A1", "A2", "B1"}:
            continue
        ru = str(row[4] or "").strip()
        rektion = str(row[3] or "").strip()
        conj = conj_map.get(lemma.lower()) or conj_map.get(
            lemma.lower().replace("sich ", "")
        )

        forms = {}
        for person, col in PERSON_COLS.items():
            total_forms += 1
            sentence = str(row[col] or "").strip()
            if not sentence:
                skipped_forms += 1
                continue
            # Fix known typo in source
            sentence = sentence.replace("kümmeree", "kümmere")
            extracted = None
            if conj:
                extracted = extract_with_conjugations(sentence, conj, person)
            if not extracted:
                extracted = extract_heuristic(sentence, person)
            if not extracted or "_______" not in extracted["promptDe"]:
                skipped_forms += 1
                continue
            forms[person] = {
                "de": sentence,
                "promptDe": extracted["promptDe"],
                "finite": extracted["finite"],
                "fullForm": extracted["fullForm"],
                "expected": extracted["expected"],
            }

        if not forms:
            continue

        catalog.append(
            {
                "id": f"vg-{slug(lemma)}",
                "lemma": lemma,
                "level": level,
                "ru": ru,
                "rektion": rektion if rektion and rektion != "-" else None,
                "order": int(row[0] or 0),
                "forms": forms,
            }
        )

    wb.close()
    catalog.sort(key=lambda x: ({"A1": 0, "A2": 1, "B1": 2}[x["level"]], x["order"]))
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    form_count = sum(len(v["forms"]) for v in catalog)
    by_level = {}
    for v in catalog:
        by_level[v["level"]] = by_level.get(v["level"], 0) + 1
    print(
        json.dumps(
            {
                "verbs": len(catalog),
                "forms": form_count,
                "skippedForms": skipped_forms,
                "byLevel": by_level,
                "out": str(OUT),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
