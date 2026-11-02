#!/usr/bin/env python3
"""
Translate gap examples via Google in a few large marked chunks.

Packs:
  [[0001]] German sentence
  [[0002]] …

Translates each chunk DE→EN and DE→RU (POST gtx), then splits by markers.
Preserves existing en/ru in catalog/cache.
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src/data/verb-gap-catalog.json"
CACHE = ROOT / "scripts/.gap-translate-cache.json"
BACKUP = ROOT / "scripts/gap-translate-cache.backup.json"
PERSONS = ("ich", "du", "er", "wir", "ihr", "sie")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
CHUNK_CHARS = 4200
MARKER_RE = re.compile(r"\[\[(\d{4})\]\]\s*(.*?)(?=\n\[\[\d{4}\]\]|\Z)", re.S)


def load_json(path: Path, default):
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return default


def save_cache(cache: dict) -> None:
    text = json.dumps(cache, ensure_ascii=False, indent=2) + "\n"
    CACHE.write_text(text, encoding="utf-8")
    BACKUP.write_text(text, encoding="utf-8")


def google_gtx(text: str, target: str, retries: int = 8) -> str:
    body = urllib.parse.urlencode(
        {
            "client": "gtx",
            "sl": "de",
            "tl": target,
            "dt": "t",
            "q": text,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://translate.googleapis.com/translate_a/single",
        data=body,
        headers={
            "User-Agent": UA,
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        method="POST",
    )
    delay = 3.0
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return "".join(part[0] for part in data[0] if part and part[0])
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = min(120.0, delay * 3)
                print(f"  429 → sleep {wait:.0f}s", flush=True)
                time.sleep(wait)
                delay = min(delay * 2, 60.0)
            else:
                if attempt + 1 >= retries:
                    raise
                time.sleep(delay)
                delay *= 2
        except Exception:
            if attempt + 1 >= retries:
                raise
            time.sleep(delay)
            delay *= 2
    raise RuntimeError(f"Google translate failed for {target}")


def pack_chunks(sentences: list[str]) -> list[tuple[list[str], str]]:
    chunks: list[tuple[list[str], str]] = []
    batch: list[str] = []
    parts: list[str] = []
    size = 0
    next_id = 1

    def flush() -> None:
        nonlocal batch, parts, size, next_id
        if not batch:
            return
        chunks.append((batch[:], "\n".join(parts)))
        batch, parts, size, next_id = [], [], 0, 1

    for sent in sentences:
        marker = f"[[{next_id:04d}]]"
        line = f"{marker} {sent}"
        add = len(line) + 1
        if batch and size + add > CHUNK_CHARS:
            flush()
            marker = f"[[{next_id:04d}]]"
            line = f"{marker} {sent}"
            add = len(line) + 1
        batch.append(sent)
        parts.append(line)
        size += add
        next_id += 1

    flush()
    return chunks


def unpack(translated: str, expected_count: int) -> list[str]:
    text = translated.replace("\r\n", "\n")
    # Fix spaces Google sometimes inserts: [[ 0001 ]]
    text = re.sub(
        r"\[\[\s*(\d+)\s*\]\]",
        lambda m: f"[[{int(m.group(1)):04d}]]",
        text,
    )
    found = {int(m.group(1)): m.group(2).strip() for m in MARKER_RE.finditer(text)}
    if len(found) == expected_count:
        return [found[i] for i in range(1, expected_count + 1)]

    loose = [x.strip() for x in re.split(r"\[\[\d{4}\]\]", text)[1:] if x.strip()]
    if len(loose) == expected_count:
        return loose
    raise ValueError(
        f"marker mismatch: expected {expected_count}, got {len(found)} "
        f"(loose {len(loose)})"
    )


def seed_cache_from_catalog(catalog: list, cache: dict) -> None:
    for verb in catalog:
        for person in PERSONS:
            form = verb.get("forms", {}).get(person)
            if not form or not form.get("de"):
                continue
            de = form["de"]
            cur = cache.get(de, {})
            if form.get("en"):
                cur["en"] = form["en"]
            if form.get("ru"):
                cur["ru"] = form["ru"]
            if cur:
                cache[de] = cur


def apply_to_catalog(catalog: list, cache: dict) -> tuple[int, int]:
    ok = missing = 0
    for verb in catalog:
        for person in PERSONS:
            form = verb.get("forms", {}).get(person)
            if not form or not form.get("de"):
                continue
            tr = cache.get(form["de"], {})
            if tr.get("en") and tr.get("ru"):
                form["en"] = tr["en"]
                form["ru"] = tr["ru"]
                ok += 1
            else:
                missing += 1
    return ok, missing


def main() -> None:
    catalog = load_json(CATALOG, [])
    cache = load_json(CACHE, {})
    backup = load_json(BACKUP, {})
    for de, tr in backup.items():
        cur = cache.get(de, {})
        if tr.get("en"):
            cur["en"] = cur.get("en") or tr["en"]
        if tr.get("ru"):
            cur["ru"] = cur.get("ru") or tr["ru"]
        cache[de] = cur

    seed_cache_from_catalog(catalog, cache)

    pending: list[str] = []
    seen = set()
    for verb in catalog:
        for person in PERSONS:
            form = verb.get("forms", {}).get(person)
            if not form or not form.get("de"):
                continue
            de = form["de"]
            if de in seen:
                continue
            seen.add(de)
            tr = cache.get(de, {})
            if not tr.get("en") or not tr.get("ru"):
                pending.append(de)

    print(f"Unique pending sentences: {len(pending)}", flush=True)
    chunks = pack_chunks(pending)
    print(f"Chunks: {len(chunks)} (max ~{CHUNK_CHARS} chars)", flush=True)
    print(
        f"Approx Google requests: {len(chunks) * 2} (en+ru per chunk)",
        flush=True,
    )

    for i, (sents, packed) in enumerate(chunks, 1):
        print(
            f"[{i}/{len(chunks)}] {len(sents)} sentences, {len(packed)} chars",
            flush=True,
        )
        for lang in ("en", "ru"):
            if all(cache.get(s, {}).get(lang) for s in sents):
                print(f"  {lang}: already cached", flush=True)
                continue
            translated = google_gtx(packed, lang)
            try:
                parts = unpack(translated, len(sents))
            except ValueError as e:
                dump = ROOT / "scripts" / f".gap-chunk-{i:02d}-{lang}.txt"
                dump.write_text(translated, encoding="utf-8")
                print(f"  {lang} unpack failed: {e}; dumped {dump}", flush=True)
                raise
            for sent, out in zip(sents, parts):
                cur = cache.get(sent, {})
                cur[lang] = out
                cache[sent] = cur
            save_cache(cache)
            print(f"  {lang}: ok", flush=True)
            time.sleep(2.0)

    save_cache(cache)
    ok, missing = apply_to_catalog(catalog, cache)
    CATALOG.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Catalog updated: with en+ru={ok}, missing={missing}", flush=True)


if __name__ == "__main__":
    main()
