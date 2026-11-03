#!/usr/bin/env bash
# Download Tatoeba per-language sentences + translation links (gitignored).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/scripts/data/tatoeba"
BASE="https://downloads.tatoeba.org/exports"
mkdir -p "$DIR"
cd "$DIR"

fetch() {
  local url="$1"
  local out="$2"
  if [[ -f "$out" ]]; then
    echo "exists: $out"
    return 0
  fi
  echo "fetch $url"
  curl -fL --retry 3 -o "$out.partial" "$url"
  mv "$out.partial" "$out"
}

fetch "$BASE/per_language/deu/deu_sentences.tsv.bz2" "deu_sentences.tsv.bz2"
fetch "$BASE/per_language/eng/eng_sentences.tsv.bz2" "eng_sentences.tsv.bz2"
fetch "$BASE/per_language/rus/rus_sentences.tsv.bz2" "rus_sentences.tsv.bz2"
fetch "$BASE/links.tar.bz2" "links.tar.bz2"

if [[ ! -f links.csv ]]; then
  echo "extract links.csv"
  tar -xjf links.tar.bz2 links.csv
fi

for lang in deu eng rus; do
  if [[ ! -f "${lang}_sentences.tsv" ]]; then
    echo "bunzip ${lang}_sentences.tsv.bz2"
    bunzip2 -k "${lang}_sentences.tsv.bz2"
  fi
done

echo "Tatoeba data ready in $DIR"
ls -lh "$DIR" | sed -n '1,20p'
