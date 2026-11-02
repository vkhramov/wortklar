#!/usr/bin/env python3
"""Fetch ~100 noun photos via Bing image search, save as small WebP files."""
from __future__ import annotations

import json
import re
import time
import urllib.error
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
    import unicodedata

    s = unicodedata.normalize("NFD", lemma.lower().replace("ß", "ss"))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "word"


def pick_words(limit: int = 100) -> list[dict]:
    vocab = json.loads(VOCAB.read_text(encoding="utf-8"))
    catalog = json.loads((ROOT / "src/data/illustration-catalog.json").read_text(encoding="utf-8"))
    keys = set()
    for meta in catalog.values():
        for k in meta.get("keywords") or []:
            keys.add(k.lower())

    def norm(s: str) -> str:
        import unicodedata

        s = unicodedata.normalize("NFD", s.lower().replace("ß", "ss"))
        return "".join(ch for ch in s if unicodedata.category(ch) != "Mn")

    nouns = sorted(
        [e for e in vocab if e.get("pos") == "noun"],
        key=lambda e: e.get("frequency", 0),
        reverse=True,
    )
    picked = []
    for e in nouns:
        cand = [norm(e["lemma"]), *[norm(x) for x in e.get("en") or []]]
        concrete = any(
            any(k == c or k in c or c in k for k in keys) for c in cand if c
        )
        if not concrete and e.get("level") != "A1":
            continue
        if not concrete and len(picked) > 70:
            continue
        picked.append(e)
        if len(picked) >= limit:
            break
    return picked


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
    # Unescape
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
        return out.getvalue()
    except Exception:
        return None


def search_query(entry: dict) -> str:
    en = (entry.get("en") or ["object"])[0]
    # Prefer English gloss for Bing recall; add German lemma
    return f"{en} {entry['lemma']} photo"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    words = pick_words(100)
    manifest: dict[str, dict] = {}
    if MANIFEST.exists():
        try:
            manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            manifest = {}

    ok = 0
    fail = 0
    for i, entry in enumerate(words, 1):
        entry_id = entry["id"]
        file_slug = slug(entry["lemma"])
        filename = f"{file_slug}.webp"
        dest = OUT_DIR / filename

        if dest.exists() and entry_id in manifest:
            print(f"[{i}/100] skip {entry['lemma']} (exists)")
            ok += 1
            continue

        query = search_query(entry)
        print(f"[{i}/100] {entry['lemma']} ← {query}")
        try:
            urls = bing_image_urls(query)
        except Exception as e:
            print(f"  search fail: {e}")
            fail += 1
            time.sleep(1.0)
            continue

        saved = False
        for url in urls[:6]:
            raw = download_bytes(url)
            if not raw:
                continue
            webp = to_webp(raw)
            if not webp or len(webp) < 800:
                continue
            if len(webp) > 180_000:
                # retry smaller
                try:
                    im = Image.open(BytesIO(raw)).convert("RGB")
                    im.thumbnail((384, 384), Image.Resampling.LANCZOS)
                    buf = BytesIO()
                    im.save(buf, format="WEBP", quality=65, method=4)
                    webp = buf.getvalue()
                except Exception:
                    continue
            dest.write_bytes(webp)
            manifest[entry_id] = {
                "file": filename,
                "lemma": entry["lemma"],
                "en": (entry.get("en") or [None])[0],
                "bytes": len(webp),
                "sourceQuery": query,
            }
            print(f"  saved {filename} ({len(webp)} bytes)")
            saved = True
            ok += 1
            break

        if not saved:
            print("  no usable image")
            fail += 1
        time.sleep(0.7)

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    readme = OUT_DIR / "README.md"
    if not readme.exists():
        readme.write_text(
            "# wortklar-images\n\n"
            "Small WebP cues for Wortklar (personal use).\n\n"
            "Served via jsDelivr, e.g.\n"
            "`https://cdn.jsdelivr.net/gh/vkhramov/wortklar-images@main/person.webp`\n",
            encoding="utf-8",
        )
    total = sum(p.stat().st_size for p in OUT_DIR.glob("*.webp"))
    print(f"\nDone: ok={ok} fail={fail} files={len(list(OUT_DIR.glob('*.webp')))} total={total/1024:.0f} KB")


if __name__ == "__main__":
    main()
