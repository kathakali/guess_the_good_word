"""Validate word-list files against docs/WORDLIST_MANIFEST.json."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "guess_the_good_word" / "data"
MANIFEST = ROOT / "docs" / "WORDLIST_MANIFEST.json"


def sha256_text(path: Path) -> str:
    """Return SHA-256 for a UTF-8 text file as stored on disk."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    for filename, expected in sorted(manifest.items()):
        path = DATA / filename
        words = [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
        expected_length = int(filename.split("_")[1].split(".")[0])

        assert len(words) == expected["lines"], (filename, len(words), expected["lines"])
        assert len(words) == len(set(words)), f"{filename} contains duplicate words"
        assert all(word.isalpha() and word.islower() and len(word) == expected_length for word in words), filename
        assert sha256_text(path) == expected["sha256"], f"{filename} SHA-256 mismatch"
        print(f"OK {filename}: {len(words)} words")

    print("All word-list files are valid.")


if __name__ == "__main__":
    main()
