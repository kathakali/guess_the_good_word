# validate_words_3.py
# Run with: python3 validate_words_3.py
# Checks the updated words_3.txt and answers_3.txt files.

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

WORD_RE = re.compile(r'^[a-z]{3}$')


def normalize_word(value: str) -> str:
    return unicodedata.normalize('NFKC', str(value or '')).strip().lower()


def read_words(path: Path) -> list[str]:
    return [normalize_word(line) for line in path.read_text(encoding='utf-8').splitlines() if normalize_word(line)]


def check_list(words: list[str]) -> dict:
    counts = Counter(words)
    invalid = sorted([word for word in words if not WORD_RE.fullmatch(word)])
    duplicates = sorted([word for word, count in counts.items() if count > 1])
    return {
        'total_lines': len(words),
        'unique_words': len(set(words)),
        'invalid': invalid,
        'duplicates': duplicates,
        'sorted': words == sorted(words),
    }


def main() -> int:
    data_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / 'data'
    words = read_words(data_dir / 'words_3.txt')
    answers = read_words(data_dir / 'answers_3.txt')
    word_set = set(words)
    missing_answers = sorted([word for word in answers if word not in word_set])

    result = {
        'words_3': check_list(words),
        'answers_3': check_list(answers),
        'answers_are_subset_of_words': not missing_answers,
        'answers_missing_from_words': missing_answers,
    }

    print(json.dumps(result, indent=2))

    has_error = (
        result['words_3']['invalid'] or
        result['answers_3']['invalid'] or
        result['words_3']['duplicates'] or
        result['answers_3']['duplicates'] or
        missing_answers
    )
    return 1 if has_error else 0


if __name__ == '__main__':
    raise SystemExit(main())
