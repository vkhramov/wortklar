#!/usr/bin/env python3
"""
Rebuild verb-gap-catalog.json from Tatoeba (primary) + graded readers (fallback).

Keeps catalog metadata (lemma, level, rektion, order, ru gloss). Uses vocab
conjugations when present; otherwise falls back to existing form fullForms.
Does not keep old template/gtx German as a source of truth.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from extract_reader_sentences import LEVELS, load_all_reader_sentences  # noqa: E402


def escape_re(s: str) -> str:
    return re.escape(s)


def fold(s: str) -> str:
    s = s.lower().replace("ß", "ss")
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return s


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


def extract_with_conjugations(sentence: str, conj: dict, person: str) -> dict | None:
    full = conj.get(person)
    if not full:
        return None
    finite = full.strip().split()[0]
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

CATALOG = ROOT / "src/data/verb-gap-catalog.json"
VOCAB = ROOT / "public/data/vocabulary.json"
CONJ_FILE = ROOT / "scripts/verb-gap-conjugations.json"
TATOEBA = ROOT / "scripts/data/tatoeba"
COVERAGE = ROOT / "scripts/tatoeba-gap-coverage.json"
TRANSLATE_CACHE = ROOT / "scripts/.gap-corpus-translate-cache.json"

PERSONS = ("ich", "du", "er", "wir", "ihr", "sie")
PERSON_PRONOUNS = {
    "ich": {"ich"},
    "du": {"du"},
    "er": {"er", "sie", "es", "man"},
    "wir": {"wir"},
    "ihr": {"ihr"},
    "sie": {"sie"},
}
LEVEL_NEIGHBORS = {
    "A1": ["A1", "A2", "B1"],
    "A2": ["A2", "A1", "B1"],
    "B1": ["B1", "A2", "A1"],
}

_WORD = re.compile(r"[A-Za-zÄÖÜäöüß]+")
_MAX_PER_FORM = 400
_SEP_PREFIXES = tuple(
    sorted(
        {
            "zusammen",
            "zurück",
            "weiter",
            "nieder",
            "heran",
            "heran",
            "hinein",
            "heraus",
            "herauf",
            "herunter",
            "hinauf",
            "hinunter",
            "vorbei",
            "voraus",
            "entgegen",
            "entlang",
            "fest",
            "fern",
            "fort",
            "heim",
            "los",
            "mit",
            "nach",
            "nieder",
            "statt",
            "teil",
            "vor",
            "weg",
            "zu",
            "ab",
            "an",
            "auf",
            "aus",
            "bei",
            "dar",
            "ein",
            "her",
            "hin",
            "um",
            "über",
            "unter",
        },
        key=len,
        reverse=True,
    )
)
_AUX_LIKE = {
    "habe",
    "hast",
    "hat",
    "haben",
    "habt",
    "hatte",
    "hattest",
    "hatten",
    "bin",
    "bist",
    "ist",
    "sind",
    "seid",
    "war",
    "warst",
    "waren",
    "werde",
    "wirst",
    "wird",
    "werden",
    "werdet",
    "will",
    "willst",
    "wollt",
    "wollen",
    "muss",
    "musst",
    "müsst",
    "müssen",
    "kann",
    "kannst",
    "könnt",
    "können",
    "soll",
    "sollst",
    "sollt",
    "sollen",
    "darf",
    "darfst",
    "dürft",
    "dürfen",
    "mag",
    "magst",
    "mögt",
    "mögen",
}


def finite_and_particle(full: str) -> tuple[str, str | None]:
    parts = full.strip().split()
    if not parts:
        return "", None
    if len(parts) == 1:
        return parts[0], None
    finite = parts[0]
    rest = parts[1:]
    particle = rest[-1] if rest else None
    return finite, particle


def fused_separable(finite: str, particle: str | None) -> str | None:
    if not particle or particle.lower() in {
        "mich",
        "dich",
        "sich",
        "uns",
        "euch",
        "mir",
        "dir",
    }:
        return None
    return f"{particle}{finite}"


def lemma_sep_prefix(lemma: str) -> str | None:
    bare = lemma.lower().replace("sich ", "").strip()
    for pref in _SEP_PREFIXES:
        rest = bare[len(pref) :] if bare.startswith(pref) else ""
        if rest and len(rest) >= 3:
            return pref
    return None


def normalize_full_form(lemma: str, full: str, separable: bool) -> str:
    full = full.strip()
    if not full:
        return full
    # Fix catalog capitalization quirks (Beantragst)
    if full[0].isupper() and not full.startswith("Sie"):
        full = full[0].lower() + full[1:]
    if " " in full or not separable:
        return full
    pref = lemma_sep_prefix(lemma)
    if not pref:
        return full
    fl = full.lower()
    if fl.startswith(pref) and len(full) > len(pref):
        return f"{full[len(pref) :]} {pref}"
    return f"{full} {pref}"


def load_vocab() -> tuple[dict[str, dict], set[str], set[str]]:
    vocab = json.loads(VOCAB.read_text(encoding="utf-8"))
    conj: dict[str, dict] = {}
    words: set[str] = set()
    separable: set[str] = set()
    for e in vocab:
        for w in _WORD.findall(e.get("lemma", "")):
            words.add(fold(w))
        ex = e.get("example") or {}
        for w in _WORD.findall(ex.get("de") or ""):
            words.add(fold(w))
        if e.get("pos") != "verb":
            continue
        lemma = e["lemma"].lower()
        bare = lemma.replace("sich ", "").strip()
        if e.get("separable"):
            separable.add(lemma)
            separable.add(bare)
        if not e.get("conjugations"):
            continue
        conj[lemma] = e["conjugations"]
        conj[bare] = e["conjugations"]
        # Infer separable from spaced conjugations
        if any(" " in str(v) for v in e["conjugations"].values()):
            separable.add(lemma)
            separable.add(bare)
    return conj, words, separable


def load_conj_file() -> dict[str, dict[str, str]]:
    if not CONJ_FILE.exists():
        return {}
    data = json.loads(CONJ_FILE.read_text(encoding="utf-8"))
    return {vid: dict(row.get("conjugations") or {}) for vid, row in data.items()}


def conjugations_for(
    verb: dict,
    conj_map: dict[str, dict],
    conj_file: dict[str, dict[str, str]],
    separable_lemmas: set[str],
) -> dict[str, str]:
    lemma = verb["lemma"].lower()
    bare = lemma.replace("sich ", "").strip()
    raw: dict[str, str] = {}
    # Prefer frozen snapshot so rebuilds stay stable after catalog rewrite
    if verb["id"] in conj_file and conj_file[verb["id"]]:
        raw = dict(conj_file[verb["id"]])
    elif lemma in conj_map:
        raw = dict(conj_map[lemma])
    elif bare in conj_map:
        raw = dict(conj_map[bare])
    else:
        for p, form in (verb.get("forms") or {}).items():
            ff = (form.get("fullForm") or form.get("finite") or "").strip()
            if ff:
                raw[p] = ff
    # Vocab overrides snapshot when present (higher quality)
    if lemma in conj_map:
        raw = {**raw, **conj_map[lemma]}
    elif bare in conj_map:
        raw = {**raw, **conj_map[bare]}
    sep = lemma in separable_lemmas or bare in separable_lemmas
    if not sep and any(" " in v for v in raw.values()):
        sep = True
    return {p: normalize_full_form(lemma, ff, sep) for p, ff in raw.items() if ff}


def word_count(text: str) -> int:
    return len(_WORD.findall(text))


def tokens_folded(text: str) -> list[str]:
    return [fold(w) for w in _WORD.findall(text)]


def is_infinitive_like(full: str, lemma: str) -> bool:
    bare = lemma.lower().replace("sich ", "").strip()
    finite, _ = finite_and_particle(full)
    return fold(finite) == fold(bare)


def subjectish(text: str, tokens: list[str], person: str, finite: str) -> bool:
    """Prefer real subjects over object pronouns / imperatives."""
    f = fold(finite)
    if f not in tokens:
        return False
    fi = tokens.index(f)
    if person == "ich":
        return "ich" in tokens
    if person == "du":
        return "du" in tokens
    if person == "wir":
        return "wir" in tokens
    if person == "ihr":
        # Prefer real subject "ihr", not possessive "Ihr Name"
        if re.search(rf"\bihr\s+{re.escape(finite)}\b", text, re.I):
            return True
        if re.search(rf"\b{re.escape(finite)}\s+ihr\b", text, re.I):
            return True
        if re.search(r"\bIhr\s+[A-ZÄÖÜ]", text):
            return False
        return bool(re.search(r"\bihr\b", text))
    if person == "er":
        if {"er", "es", "man"} & set(tokens):
            return True
        # sie sieht (she) — pronoun before finite
        if "sie" in tokens and tokens.index("sie") < fi:
            return True
        return False
    if person == "sie":
        # Formal Sie + verb / verb + Sie
        if re.search(rf"\bSie\s+{re.escape(finite)}\b", text):
            return True
        if re.search(rf"\b{re.escape(finite)}\s+Sie\b", text):
            return True
        # Plural/informal sie as subject before finite
        if re.search(rf"\bsie\s+{re.escape(finite)}\b", text, re.I):
            return True
        if re.search(rf"\b{re.escape(finite)}\s+sie\b", text, re.I) and not re.search(
            rf"\b(habe|hast|hat|haben|habt|hatte|bin|bist|ist|sind|war)\b.+\b{re.escape(finite)}\b",
            text,
            re.I,
        ):
            return True
        return False
    return False


def looks_like_infinitive_complement(tokens: list[str], finite: str) -> bool:
    f = fold(finite)
    if f not in tokens:
        return False
    fi = tokens.index(f)
    # Perfect / modal: aux earlier, target form at (near) end
    earlier_aux = any(t in _AUX_LIKE for t in tokens[:fi])
    if earlier_aux and fi >= len(tokens) - 3:
        return True
    return False


def looks_like_imperative(text: str, tokens: list[str], finite: str) -> bool:
    f = fold(finite)
    if not tokens or tokens[0] != f:
        return False
    # Starts with finite and no subject pronoun in first three tokens
    head = set(tokens[:3])
    if head & {"ich", "du", "er", "sie", "es", "wir", "ihr", "man"}:
        return False
    # Capitalized start often imperative / question without pronoun yet
    return text[:1].isupper()


def score_candidate(
    text: str,
    tokens: list[str],
    person: str,
    finite: str,
    particle: str | None,
    vocab_words: set[str],
    has_en: bool,
    has_ru: bool,
    lemma: str,
) -> float:
    n = len(tokens)
    score = 0.0
    if 5 <= n <= 14:
        score += 8.0
    elif 4 <= n <= 16:
        score += 4.0
    else:
        score -= abs(n - 10) * 0.6

    subj = subjectish(text, tokens, person, finite)
    if subj:
        score += 10.0
    else:
        score -= 6.0

    f = fold(finite)
    if tokens.count(f) == 1:
        score += 3.0
    elif tokens.count(f) > 1:
        score -= 1.0

    if looks_like_infinitive_complement(tokens, finite):
        score -= 14.0
    if looks_like_imperative(text, tokens, finite) and person not in {"du", "ihr", "sie"}:
        score -= 8.0
    if looks_like_imperative(text, tokens, finite) and person in {"du", "ihr", "sie"}:
        score -= 3.0

    if is_infinitive_like(finite if " " not in finite else finite.split()[0], lemma):
        # full form handled below via lemma compare in pick
        pass
    if is_infinitive_like(
        f"{finite}" if not particle else f"{finite} {particle}", lemma
    ) or is_infinitive_like(finite, lemma):
        if not subj:
            score -= 12.0

    if particle:
        pf = fold(particle)
        if pf in tokens:
            score += 4.0
            if f in tokens and tokens.index(pf) > tokens.index(f):
                score += 1.5
        else:
            score -= 8.0

    content = [t for t in tokens if len(t) > 2]
    if content:
        hit = sum(1 for t in content if t in vocab_words)
        score += 4.0 * (hit / len(content))

    if has_en:
        score += 3.0
    if has_ru:
        score += 4.0

    if "," in text:
        score -= 0.5
    if text.count(" ") > 18:
        score -= 2.0
    # Prefer present-looking lines without quotes clutter
    if text.count('"') >= 2 or text.count("„") or text.count("«"):
        score -= 1.5
    return score


def index_tatoeba(
    target_forms: set[str],
    particles_by_finite: dict | None = None,
) -> dict:
    """form_folded -> list of {id, text, tokens}."""
    path = TATOEBA / "deu_sentences.tsv"
    if not path.exists():
        raise SystemExit(f"Missing {path}; run scripts/fetch-tatoeba.sh")
    targets = {fold(t) for t in target_forms if t}
    particles_by_finite = particles_by_finite or {}
    index: dict[str, list[dict]] = defaultdict(list)
    print(f"Indexing Tatoeba DE for {len(targets)} forms…", flush=True)
    with path.open(encoding="utf-8", errors="replace") as f:
        for i, line in enumerate(f, 1):
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3:
                continue
            sid, _lang, text = parts[0], parts[1], parts[2]
            toks = tokens_folded(text)
            n = len(toks)
            if n < 3 or n > 20:
                continue
            hit = targets.intersection(toks)
            if not hit:
                continue
            row = {"id": int(sid), "text": text.strip(), "tokens": toks}
            tokset = set(toks)
            for h in hit:
                bucket = index[h]
                parts_needed = particles_by_finite.get(h) or set()
                has_part = bool(parts_needed & tokset) if parts_needed else False
                if len(bucket) >= _MAX_PER_FORM:
                    # Prefer particle hits: replace a non-particle entry if needed
                    if has_part:
                        for j, old in enumerate(bucket):
                            old_parts = particles_by_finite.get(h) or set()
                            if not (old_parts & set(old["tokens"])):
                                bucket[j] = row
                                break
                    continue
                if has_part:
                    bucket.insert(0, row)
                else:
                    bucket.append(row)
            if i % 200_000 == 0:
                print(f"  …scanned {i:,} DE lines", flush=True)
    print(
        f"  indexed forms with hits: {sum(1 for v in index.values() if v)}",
        flush=True,
    )
    return index


def load_sentences_for_ids(path: Path, wanted: set[int]) -> dict[int, str]:
    out: dict[int, str] = {}
    if not wanted:
        return out
    with path.open(encoding="utf-8", errors="replace") as f:
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3:
                continue
            sid = int(parts[0])
            if sid in wanted:
                out[sid] = parts[2].strip()
    return out


def resolve_links(de_ids: set[int]) -> dict[int, dict]:
    """de_id -> {en, ru, en_id, ru_id}."""
    path = TATOEBA / "links.csv"
    if not path.exists():
        raise SystemExit(f"Missing {path}")
    neighbors: dict[int, list[int]] = defaultdict(list)
    print(f"Resolving links for {len(de_ids)} DE sentences…", flush=True)
    with path.open(encoding="utf-8", errors="replace") as f:
        for i, line in enumerate(f, 1):
            a_s, b_s = line.rstrip("\n").split("\t")
            a, b = int(a_s), int(b_s)
            if a in de_ids:
                neighbors[a].append(b)
            if b in de_ids:
                neighbors[b].append(a)
            if i % 5_000_000 == 0:
                print(f"  …links {i:,}", flush=True)

    linked_ids: set[int] = set()
    for ids in neighbors.values():
        linked_ids.update(ids)
    print(f"  loading EN/RU for {len(linked_ids):,} linked ids…", flush=True)
    eng = load_sentences_for_ids(TATOEBA / "eng_sentences.tsv", linked_ids)
    rus = load_sentences_for_ids(TATOEBA / "rus_sentences.tsv", linked_ids)

    out: dict[int, dict] = {}
    for de_id, others in neighbors.items():
        row: dict = {}
        for oid in others:
            if "en" not in row and oid in eng:
                row["en"] = eng[oid]
                row["en_id"] = oid
            if "ru" not in row and oid in rus:
                row["ru"] = rus[oid]
                row["ru_id"] = oid
            if "en" in row and "ru" in row:
                break
        if row:
            out[de_id] = row
    print(f"  DE with EN/RU link: {len(out)}", flush=True)
    return out


def blank_form(sentence: str, conj: dict, person: str, full: str) -> dict | None:
    extracted = extract_with_conjugations(sentence, conj, person)
    if extracted and "_______" in extracted["promptDe"]:
        finite, particle = finite_and_particle(full)
        expected = list(extracted["expected"])
        if particle:
            fused = fused_separable(extracted["finite"], particle)
            if fused:
                expected.append(fused)
            expected.append(full)
        return {
            "de": sentence,
            "promptDe": extracted["promptDe"],
            "finite": extracted["finite"],
            "fullForm": full,
            "expected": uniq(expected),
        }
    # Manual blank on finite token
    finite, particle = finite_and_particle(full)
    idx = find_token(sentence, finite)
    if idx < 0:
        return None
    if particle and fold(particle) not in tokens_folded(sentence):
        # Allow reflexive particle elsewhere; for true sep particle require it
        if particle.lower() not in {"mich", "dich", "sich", "uns", "euch", "mir", "dir"}:
            return None
    finite_disp = sentence[idx : idx + len(finite)]
    # Handle length mismatch when folded match used different spelling
    m = re.match(r"[\wÄÖÜäöüß]+", sentence[idx:], re.I)
    if m:
        finite_disp = m.group(0)
        length = len(finite_disp)
    else:
        length = len(finite)
    expected = uniq([finite, finite_disp, full])
    fused = fused_separable(finite_disp, particle)
    if fused:
        expected = uniq(expected + [fused])
    return {
        "de": sentence,
        "promptDe": blank(sentence, idx, length),
        "finite": finite_disp,
        "fullForm": full,
        "expected": expected,
    }


def mt_translate(texts: list[str], dest: str, cache: dict) -> list[str]:
    """Batch-translate with deep_translator Google; cache by text+dest."""
    if not texts:
        return []
    try:
        from deep_translator import GoogleTranslator
    except ImportError:
        print("Installing deep_translator…", flush=True)
        import site
        import subprocess

        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "--user", "deep-translator"],
        )
        # Ensure freshly installed --user site is importable
        user_site = site.getusersitepackages()
        if user_site not in sys.path:
            sys.path.insert(0, user_site)
        from deep_translator import GoogleTranslator

    # Prefer DeepL if key present
    deepl_key = os.environ.get("DEEPL_API_KEY")
    translator = None
    use_deepl = False
    if deepl_key:
        try:
            from deep_translator import DeeplTranslator

            translator = DeeplTranslator(api_key=deepl_key, source="de", target=dest)
            use_deepl = True
        except Exception:
            use_deepl = False
    if not use_deepl:
        translator = GoogleTranslator(source="de", target=dest)

    out: list[str] = []
    for i, text in enumerate(texts):
        key = f"{dest}::{text}"
        if key in cache:
            out.append(cache[key])
            continue
        tr = ""
        for attempt in range(3):
            try:
                tr = translator.translate(text) or ""
                break
            except Exception as e:
                msg = str(e).lower()
                wait = 3.0 * (attempt + 1)
                print(f"  MT fail ({dest}) try {attempt + 1}: {e}", flush=True)
                if "too many requests" in msg or "rate" in msg:
                    time.sleep(wait)
                    continue
                break
        cache[key] = tr
        out.append(tr)
        time.sleep(0.8)
        if (i + 1) % 5 == 0:
            print(f"  MT {dest} {i + 1}/{len(texts)}", flush=True)
            TRANSLATE_CACHE.write_text(
                json.dumps(cache, ensure_ascii=False), encoding="utf-8"
            )
    return out


def load_reader_tr() -> dict[str, tuple[str, str]]:
    out: dict[str, tuple[str, str]] = {}
    path = ROOT / "scripts/reader-gap-translations.json"
    if path.exists():
        raw = json.loads(path.read_text(encoding="utf-8"))
        for k, v in raw.items():
            if isinstance(v, (list, tuple)) and len(v) >= 2:
                out[k] = (v[0], v[1])
    return out


# Hand EN/RU for classroom seed lines (avoid flaky online MT for tiny set).
READER_TR: dict[str, tuple[str, str]] = {
    "Du kostest das Essen vor dem Servieren.": (
        "You taste the food before serving.",
        "Ты пробуешь еду перед подачей.",
    ),
    "Du dauerst mir zu lange.": (
        "You are taking too long for me.",
        "Ты слишком долго возишься.",
    ),
    "Du passierst die Grenze ohne Probleme.": (
        "You cross the border without problems.",
        "Ты пересекаешь границу без проблем.",
    ),
    "Du regnest nicht, das Wetter macht das.": (
        "You don't rain — the weather does that.",
        "Ты не идёшь дождём — это делает погода.",
    ),
    "Du brennst vor Neugier.": (
        "You are burning with curiosity.",
        "Ты горишь от любопытства.",
    ),
    "Du gratulierst ihm zum Geburtstag.": (
        "You congratulate him on his birthday.",
        "Ты поздравляешь его с днём рождения.",
    ),
    "Du giltst als zuverlässig.": (
        "You are considered reliable.",
        "Ты считаешься надёжным.",
    ),
    "Ihr geltet als Teamplayer.": (
        "You are considered team players.",
        "Вы считаетесь командными игроками.",
    ),
    "Ich erhöhe die Lautstärke.": (
        "I turn up the volume.",
        "Я прибавляю громкость.",
    ),
    "Du beantragst einen neuen Pass.": (
        "You apply for a new passport.",
        "Ты подаёшь заявление на новый паспорт.",
    ),
    "Du berücksichtigst alle Argumente.": (
        "You take all arguments into account.",
        "Ты учитываешь все аргументы.",
    ),
    "Du beruhigst das Kind.": (
        "You calm the child down.",
        "Ты успокаиваешь ребёнка.",
    ),
    "Ich stelle die Lage klar dar.": (
        "I present the situation clearly.",
        "Я ясно излагаю ситуацию.",
    ),
    "Du stellst die Zahlen im Bericht dar.": (
        "You present the figures in the report.",
        "Ты представляешь цифры в отчёте.",
    ),
    "Du eignest dich für diese Aufgabe.": (
        "You are suited for this task.",
        "Ты подходишь для этой задачи.",
    ),
    "Er eignet sich hervorragend dafür.": (
        "He is excellently suited for that.",
        "Он отлично для этого подходит.",
    ),
    "Ihr eignet euch als Partner.": (
        "You are suited as partners.",
        "Вы подходите как партнёры.",
    ),
    "Du enthältst dich der Stimme.": (
        "You abstain from voting.",
        "Ты воздерживаешься от голосования.",
    ),
    "Er enthält wichtige Informationen.": (
        "It contains important information.",
        "Он содержит важную информацию.",
    ),
    "Ihr enthält euch bitte eines Kommentars.": (
        "Please refrain from commenting.",
        "Пожалуйста, воздержитесь от комментариев.",
    ),
    "Ich entstehe nicht aus dem Nichts.": (
        "I don't arise out of nothing.",
        "Я не возникаю из ничего.",
    ),
    "Du entstehst aus einer Idee.": (
        "You arise from an idea.",
        "Ты возникаешь из идеи.",
    ),
    "Du ermöglichst uns den Start.": (
        "You make the start possible for us.",
        "Ты даёшь нам возможность начать.",
    ),
    "Ich ersetze das defekte Teil.": (
        "I replace the defective part.",
        "Я заменяю неисправную деталь.",
    ),
    "Du erstellst eine Liste.": (
        "You create a list.",
        "Ты составляешь список.",
    ),
    "Du erziehst die Kinder mit Geduld.": (
        "You raise the children with patience.",
        "Ты воспитываешь детей с терпением.",
    ),
    "Ich stelle den Fehler schnell fest.": (
        "I quickly notice the mistake.",
        "Я быстро замечаю ошибку.",
    ),
    "Du gelingst selten — dem Plan gelingt es.": (
        "You rarely succeed — the plan does.",
        "У тебя редко получается — у плана получается.",
    ),
    "Du geschehst nicht, aber es geschieht oft.": (
        "You don't happen, but it often does.",
        "Ты не случаешься, но это часто случается.",
    ),
    "Es geschieht jeden Tag.": (
        "It happens every day.",
        "Это происходит каждый день.",
    ),
    "Ihr geschieht nichts.": (
        "Nothing happens to you.",
        "С вами ничего не случится.",
    ),
    "Du steigerst dein Tempo.": (
        "You increase your pace.",
        "Ты увеличиваешь свой темп.",
    ),
    "Du überprüfst die Rechnung.": (
        "You check the bill.",
        "Ты проверяешь счёт.",
    ),
    "Du untersuchst die Ursache.": (
        "You investigate the cause.",
        "Ты исследуешь причину.",
    ),
    "Ich verursache das Problem nicht.": (
        "I don't cause the problem.",
        "Я не вызываю проблему.",
    ),
    "Du brennst das Essen nicht an.": (
        "You don't burn the food.",
        "Ты не прижигаешь еду.",
    ),
    "Du breitest die Decke auf dem Bett aus.": (
        "You spread the blanket on the bed.",
        "Ты расстилаешь одеяло на кровати.",
    ),
    "Ich raube niemanden aus.": (
        "I don't rob anyone.",
        "Я никого не граблю.",
    ),
    "Du raubst niemandem den Mut.": (
        "You don't rob anyone of courage.",
        "Ты ни у кого не отнимаешь мужество.",
    ),
}
READER_TR.update(load_reader_tr())


def pick_best(
    person: str,
    full: str,
    lemma: str,
    index: dict[str, list[dict]],
    links: dict[int, dict],
    vocab_words: set[str],
    reader_by_level: dict[str, list[dict]],
    verb_level: str,
) -> tuple[dict | None, str]:
    """Return (candidate dict with text/en/ru/source meta, source tag)."""
    finite, particle = finite_and_particle(full)
    if not finite:
        return None, "missing"

    inf_like = is_infinitive_like(full, lemma)
    candidates: list[tuple[float, dict, str]] = []

    def consider(text: str, tokens: list[str], payload: dict, source: str, extra: float = 0.0) -> None:
        # Reject noun-like capitalized mid-sentence hits (Stelle vs stelle)
        idx = find_token(text, finite)
        if idx < 0:
            return
        if idx > 0 and text[idx].isupper():
            return
        if particle and particle.lower() not in {
            "mich",
            "dich",
            "sich",
            "uns",
            "euch",
            "mir",
            "dir",
        }:
            if fold(particle) not in tokens:
                return
        tr_en = bool(payload.get("en"))
        tr_ru = bool(payload.get("ru"))
        sc = score_candidate(
            text,
            tokens,
            person,
            finite,
            particle,
            vocab_words,
            tr_en,
            tr_ru,
            lemma,
        ) + extra
        if looks_like_infinitive_complement(tokens, finite):
            return
        if inf_like and not subjectish(text, tokens, person, finite):
            return
        candidates.append((sc, payload, source))

    # Tatoeba
    for row in index.get(fold(finite), []):
        tr = links.get(row["id"], {})
        consider(
            row["text"],
            row["tokens"],
            {
                "text": row["text"],
                "en": tr.get("en", ""),
                "ru": tr.get("ru", ""),
                "tatoebaId": row["id"],
                "enId": tr.get("en_id"),
                "ruId": tr.get("ru_id"),
            },
            "tatoeba",
        )

    # Prefer a solid Tatoeba hit before scanning readers
    if candidates:
        candidates.sort(key=lambda x: -x[0])
        if candidates[0][0] >= 8.0:
            return candidates[0][1], candidates[0][2]

    # Graded readers: prefer verb level then neighbors
    for lv in LEVEL_NEIGHBORS.get(verb_level, list(LEVELS)):
        for row in reader_by_level.get(lv, []):
            text = row["text"]
            toks = tokens_folded(text)
            if fold(finite) not in toks:
                continue
            if particle and fold(particle) not in toks:
                if particle.lower() not in {
                    "mich",
                    "dich",
                    "sich",
                    "uns",
                    "euch",
                    "mir",
                    "dir",
                }:
                    continue
            consider(
                text,
                toks,
                {
                    "text": text,
                    "en": "",
                    "ru": "",
                    "readerPath": row["path"],
                    "readerLevel": lv,
                },
                "reader",
                extra=1.0 if lv == verb_level else 0.0,
            )

    if not candidates:
        return None, "missing"

    candidates.sort(key=lambda x: -x[0])
    best_sc, best, src = candidates[0]
    if best_sc < -2:
        return None, "missing"
    return best, src


def main() -> None:
    if not CATALOG.exists():
        raise SystemExit(f"Missing {CATALOG}")

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    conj_map, vocab_words, separable_lemmas = load_vocab()
    conj_file = load_conj_file()
    reader_by_level = load_all_reader_sentences()
    print(
        "Readers:",
        {k: len(v) for k, v in reader_by_level.items()},
        flush=True,
    )

    # Collect target finite forms
    targets: set[str] = set()
    particles_by_finite: dict[str, set[str]] = defaultdict(set)
    verb_conj: dict[str, dict[str, str]] = {}
    for verb in catalog:
        c = conjugations_for(verb, conj_map, conj_file, separable_lemmas)
        verb_conj[verb["id"]] = c
        for full in c.values():
            finite, particle = finite_and_particle(full)
            if finite:
                targets.add(finite)
            if particle:
                targets.add(particle)
                particles_by_finite[fold(finite)].add(fold(particle))

    index = index_tatoeba(targets, particles_by_finite)

    # Gather candidate DE ids for link resolution (all indexed)
    de_ids: set[int] = set()
    for rows in index.values():
        for r in rows:
            de_ids.add(r["id"])
    print(f"Unique DE candidate ids: {len(de_ids):,}", flush=True)
    links = resolve_links(de_ids)

    cache: dict = {}
    if TRANSLATE_CACHE.exists():
        cache = json.loads(TRANSLATE_CACHE.read_text(encoding="utf-8"))

    coverage = {
        "tatoeba": 0,
        "reader": 0,
        "missing": 0,
        "mtEn": 0,
        "mtRu": 0,
        "details": [],
    }
    need_mt: list[tuple[str, str, str]] = []  # (verbId, person, text)

    new_catalog = []
    for verb in catalog:
        conj = verb_conj[verb["id"]]
        forms: dict = {}
        for person in PERSONS:
            full = conj.get(person)
            if not full:
                coverage["missing"] += 1
                coverage["details"].append(
                    {
                        "id": verb["id"],
                        "lemma": verb["lemma"],
                        "person": person,
                        "source": "missing",
                        "reason": "no conjugation",
                    }
                )
                continue
            picked, source = pick_best(
                person,
                full,
                verb["lemma"],
                index,
                links,
                vocab_words,
                reader_by_level,
                verb["level"],
            )
            if not picked:
                coverage["missing"] += 1
                coverage["details"].append(
                    {
                        "id": verb["id"],
                        "lemma": verb["lemma"],
                        "person": person,
                        "source": "missing",
                        "finite": finite_and_particle(full)[0],
                    }
                )
                continue
            built = blank_form(picked["text"], conj, person, full)
            if not built:
                coverage["missing"] += 1
                coverage["details"].append(
                    {
                        "id": verb["id"],
                        "lemma": verb["lemma"],
                        "person": person,
                        "source": "missing",
                        "reason": "blank failed",
                        "text": picked["text"],
                    }
                )
                continue

            en = (picked.get("en") or "").strip()
            ru = (picked.get("ru") or "").strip()
            meta = {"source": source}
            if source == "tatoeba":
                meta["tatoebaId"] = picked.get("tatoebaId")
                coverage["tatoeba"] += 1
            else:
                meta["readerPath"] = picked.get("readerPath")
                meta["readerLevel"] = picked.get("readerLevel")
                coverage["reader"] += 1
                if not en or not ru:
                    need_mt.append((verb["id"], person, built["de"]))

            built["en"] = en
            built["ru"] = ru
            built["meta"] = meta
            forms[person] = built
            coverage["details"].append(
                {
                    "id": verb["id"],
                    "lemma": verb["lemma"],
                    "person": person,
                    "source": source,
                    "de": built["de"],
                    "hasEn": bool(en),
                    "hasRu": bool(ru),
                }
            )

        new_catalog.append(
            {
                "id": verb["id"],
                "lemma": verb["lemma"],
                "level": verb["level"],
                "ru": verb["ru"],
                "rektion": verb.get("rektion"),
                "order": verb.get("order", 0),
                "forms": forms,
            }
        )

    # Translations for reader gaps: hand map first, then optional online MT
    if need_mt:
        print(f"Translate {len(need_mt)} reader sentences…", flush=True)
        texts = [t for _, _, t in need_mt]
        uniq_texts: list[str] = []
        seen: set[str] = set()
        for t in texts:
            if t not in seen:
                seen.add(t)
                uniq_texts.append(t)

        tr_map: dict[str, dict[str, str]] = {}
        pending: list[str] = []
        for t in uniq_texts:
            if t in READER_TR:
                en, ru = READER_TR[t]
                tr_map[t] = {"en": en, "ru": ru}
            else:
                pending.append(t)

        if pending and os.environ.get("GAP_SKIP_MT") != "1":
            print(f"  online MT for {len(pending)} remaining…", flush=True)
            en_list = mt_translate(pending, "en", cache)
            ru_list = mt_translate(pending, "ru", cache)
            for i, t in enumerate(pending):
                tr_map[t] = {"en": en_list[i], "ru": ru_list[i]}
            TRANSLATE_CACHE.write_text(
                json.dumps(cache, ensure_ascii=False), encoding="utf-8"
            )
        elif pending:
            print(f"  GAP_SKIP_MT=1; leaving {len(pending)} without MT", flush=True)

        by_id = {v["id"]: v for v in new_catalog}
        for vid, person, text in need_mt:
            form = by_id[vid]["forms"].get(person)
            if not form:
                continue
            tr = tr_map.get(text, {})
            if not form.get("en") and tr.get("en"):
                form["en"] = tr["en"]
                form["meta"]["mtEn"] = True
                coverage["mtEn"] += 1
            if not form.get("ru") and tr.get("ru"):
                form["ru"] = tr["ru"]
                form["meta"]["mtRu"] = True
                coverage["mtRu"] += 1

    # Also MT Tatoeba rows that lack RU/EN? Prefer human only for Tatoeba;
    # leave empty so UI can fall back EN→ when RU missing.

    CATALOG.write_text(
        json.dumps(new_catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    summary = {
        "verbs": len(new_catalog),
        "forms": sum(len(v["forms"]) for v in new_catalog),
        "tatoeba": coverage["tatoeba"],
        "reader": coverage["reader"],
        "missing": coverage["missing"],
        "mtEn": coverage["mtEn"],
        "mtRu": coverage["mtRu"],
    }
    COVERAGE.write_text(
        json.dumps({"summary": summary, "details": coverage["details"]}, ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps(summary, indent=2), flush=True)
    print(f"Wrote {CATALOG}", flush=True)
    print(f"Wrote {COVERAGE}", flush=True)


if __name__ == "__main__":
    main()
