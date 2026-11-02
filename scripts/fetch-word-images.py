#!/usr/bin/env python3
"""Fetch noun photos via Bing image search, save as small WebP files."""
from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
VOCAB = ROOT / "public" / "data" / "vocabulary.json"
OUT_DIR = ROOT.parent / "wortklar-images"
MANIFEST = OUT_DIR / "manifest.json"
MAX_SIDE = 512
WEBP_QUALITY = 72
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def slug(lemma: str) -> str:
    s = unicodedata.normalize("NFD", lemma.lower().replace("ß", "ss"))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "word"


def load_manifest() -> dict:
    if not MANIFEST.exists():
        return {}
    try:
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_manifest(manifest: dict) -> None:
    MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def pick_missing_nouns() -> list[dict]:
    vocab = json.loads(VOCAB.read_text(encoding="utf-8"))
    manifest = load_manifest()
    nouns = [
        e
        for e in vocab
        if e.get("pos") == "noun" and e.get("id") not in manifest
    ]
    nouns.sort(key=lambda e: e.get("frequency", 0), reverse=True)
    return nouns


def used_filenames(manifest: dict) -> set[str]:
    return {v.get("file") for v in manifest.values() if v.get("file")}


def unique_filename(lemma: str, entry_id: str, taken: set[str]) -> str:
    base = slug(lemma)
    name = f"{base}.webp"
    if name not in taken:
        return name
    # Collision: append stable id tail
    tail = entry_id.replace("noun-", "")[:24]
    name = f"{base}-{tail}.webp"
    return name


def bing_image_urls(query: str, count: int = 8) -> list[str]:
    q = urllib.parse.quote(query)
    url = (
        f"https://www.bing.com/images/async?q={q}&first=0&count={count}"
        f"&qft=+filterui:photo-photo"
    )
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=25) as resp:
        html = resp.read().decode("utf-8", "ignore")
    urls = re.findall(r"murl&quot;:&quot;(https?://[^&]+?)&quot;", html)
    if not urls:
        urls = re.findall(r'"murl":"(https?://[^"]+)"', html)
    cleaned = []
    for u in urls:
        u = u.replace("\\u0026", "&").replace("\\/", "/")
        if u.startswith("http") and not u.lower().endswith(".svg"):
            cleaned.append(u)
    return cleaned


def download_bytes(url: str) -> bytes | None:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Referer": "https://www.bing.com/",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            ctype = resp.headers.get("Content-Type", "")
            data = resp.read()
            if len(data) < 1000:
                return None
            if "html" in ctype.lower():
                return None
            return data
    except Exception:
        return None


def to_webp(data: bytes) -> bytes | None:
    try:
        im = Image.open(BytesIO(data))
        im = im.convert("RGB")
        w, h = im.size
        scale = min(1.0, MAX_SIDE / max(w, h))
        if scale < 1.0:
            im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        out = BytesIO()
        im.save(out, format="WEBP", quality=WEBP_QUALITY, method=4)
        webp = out.getvalue()
        if len(webp) > 180_000:
            im.thumbnail((384, 384), Image.Resampling.LANCZOS)
            buf = BytesIO()
            im.save(buf, format="WEBP", quality=65, method=4)
            webp = buf.getvalue()
        return webp if len(webp) >= 800 else None
    except Exception:
        return None


def search_query(entry: dict) -> str:
    en = (entry.get("en") or ["object"])[0]
    # Strip parenthetical sense notes for cleaner search
    en = re.sub(r"\s*\([^)]*\)\s*", " ", en).strip()
    return f"{en} {entry['lemma']} photo"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    words = pick_missing_nouns()
    limit = None
    if len(sys.argv) > 1:
        limit = int(sys.argv[1])
        words = words[:limit]

    manifest = load_manifest()
    taken = used_filenames(manifest)
    total = len(words)
    ok = fail = 0

    print(f"Fetching {total} missing nouns → {OUT_DIR}")
    for i, entry in enumerate(words, 1):
        entry_id = entry["id"]
        filename = unique_filename(entry["lemma"], entry_id, taken)
        dest = OUT_DIR / filename
        query = search_query(entry)
        print(f"[{i}/{total}] {entry['lemma']} ← {query}", flush=True)

        try:
            urls = bing_image_urls(query)
        except Exception as e:
            print(f"  search fail: {e}", flush=True)
            fail += 1
            time.sleep(1.2)
            continue

        saved = False
        for url in urls[:6]:
            raw = download_bytes(url)
            if not raw:
                continue
            webp = to_webp(raw)
            if not webp:
                continue
            dest.write_bytes(webp)
            manifest[entry_id] = {
                "file": filename,
                "lemma": entry["lemma"],
                "en": (entry.get("en") or [None])[0],
                "bytes": len(webp),
                "sourceQuery": query,
            }
            taken.add(filename)
            print(f"  saved {filename} ({len(webp)} bytes)", flush=True)
            saved = True
            ok += 1
            break

        if not saved:
            print("  no usable image", flush=True)
            fail += 1

        if i % 10 == 0:
            save_manifest(manifest)
            print(f"  …checkpoint manifest ({len(manifest)} entries)", flush=True)

        time.sleep(0.65)

    save_manifest(manifest)
    # slim map for the app
    slim = {eid: meta["file"] for eid, meta in manifest.items() if meta.get("file")}
    (ROOT / "src/data/word-images.json").write_text(
        json.dumps(slim, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    total_bytes = sum(p.stat().st_size for p in OUT_DIR.glob("*.webp"))
    print(
        f"\nDone: ok={ok} fail={fail} manifest={len(manifest)} "
        f"webp={len(list(OUT_DIR.glob('*.webp')))} size={total_bytes/1024/1024:.1f} MB",
        flush=True,
    )


if __name__ == "__main__":
    main()
