#!/usr/bin/env bash
# Ensure A1–B1 graded-reader folders have text (classroom seed if empty).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$ROOT/scripts/seed_classroom_corpus.py"
