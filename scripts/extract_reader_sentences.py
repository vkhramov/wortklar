#!/usr/bin/env python3
"""Split graded-reader plain text into classroom-sized German sentences."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
READERS = ROOT / "scripts/data/graded-readers"
LEVELS = ("A1", "A2", "B1")

# Split on strong sentence boundaries; keep short dialogue lines.
_SENT_SPLIT = re.compile(r"(?<=[.!?…])\s+|\n+")
_WORD = re.compile(r"[A-Za-zÄÖÜäöüß]+")


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def split_sentences(text: str) -> list[str]:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Drop obvious Gutenberg boilerplate blocks
    lines = []
    skip = False
    for line in text.split("\n"):
        u = line.upper()
        if "START OF" in u and "PROJECT GUTENBERG" in u:
            skip = False
            continue
        if "END OF" in u and "PROJECT GUTENBERG" in u:
            skip = True
            continue
        if skip:
            continue
        if u.startswith("***"):
            continue
        lines.append(line)
    body = "\n".join(lines)
    out: list[str] = []
    for raw in _SENT_SPLIT.split(body):
        s = normalize_space(raw)
        if not s:
            continue
        # Prefer lines that look like German prose (letters + optional punct)
        if not _WORD.search(s):
            continue
        # Strip leading list markers / chapter numbers
        s = re.sub(r"^[\dIVXLC]+[.)]\s*", "", s)
        s = s.strip(" \"'«»")
        if len(s) < 8:
            continue
        words = _WORD.findall(s)
        if not (3 <= len(words) <= 22):
            continue
        # Skip all-caps titles
        if s.isupper() and len(words) <= 6:
            continue
        out.append(s if s[-1] in ".!?…" else s + ".")
    return out


def load_level_sentences(level: str) -> list[dict]:
    """Return [{text, path, level}] for .txt/.md under graded-readers/{level}/."""
    folder = READERS / level
    if not folder.is_dir():
        return []
    rows: list[dict] = []
    for path in sorted(folder.rglob("*")):
        if path.suffix.lower() not in {".txt", ".md"}:
            continue
        if path.name.upper() == "README.MD":
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = path.read_text(encoding="latin-1")
        rel = str(path.relative_to(READERS))
        for sent in split_sentences(text):
            rows.append({"text": sent, "path": rel, "level": level})
    return rows


def load_all_reader_sentences() -> dict[str, list[dict]]:
    return {lv: load_level_sentences(lv) for lv in LEVELS}


if __name__ == "__main__":
    data = load_all_reader_sentences()
    for lv, rows in data.items():
        print(f"{lv}: {len(rows)} sentences")
