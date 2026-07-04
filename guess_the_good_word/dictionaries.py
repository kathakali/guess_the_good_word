"""Word-list loading and validation helpers."""

from __future__ import annotations

from functools import lru_cache
from importlib import resources

from .config import LEVELS


class DictionaryError(RuntimeError):
    """Raised when a level dictionary file is missing or malformed."""


def _load_file(level_id: str, config_key: str) -> tuple[str, ...]:
    """Load a dictionary file configured for a level.

    The function keeps validation close to the data load so bad word-list edits
    fail early with a useful error message.
    """
    if level_id not in LEVELS:
        raise DictionaryError(f"Unknown level: {level_id}")

    filename = LEVELS[level_id][config_key]
    data_root = resources.files("guess_the_good_word") / "data"
    text = (data_root / filename).read_text(encoding="utf-8")
    words = tuple(
        line.strip().lower()
        for line in text.splitlines()
        if line.strip() and line.strip().isalpha()
    )

    expected_length = LEVELS[level_id]["word_length"]
    invalid = [word for word in words if len(word) != expected_length]
    if invalid:
        raise DictionaryError(f"{filename} contains invalid words: {invalid[:5]}")

    if len(words) != len(set(words)):
        raise DictionaryError(f"{filename} contains duplicate words")

    return words


@lru_cache(maxsize=None)
def load_words(level_id: str) -> tuple[str, ...]:
    """Return all accepted guess words for a level."""
    return _load_file(level_id, "dictionary")


@lru_cache(maxsize=None)
def load_answers(level_id: str) -> tuple[str, ...]:
    """Return the curated random-answer pool for a level."""
    answers = _load_file(level_id, "answer_dictionary")
    missing = set(answers) - set(load_words(level_id))
    if missing:
        sample = sorted(missing)[:5]
        raise DictionaryError(f"Answer words missing from guess dictionary: {sample}")
    return answers


@lru_cache(maxsize=None)
def word_set(level_id: str) -> frozenset[str]:
    """Return accepted guess words as a set for fast lookup."""
    return frozenset(load_words(level_id))


def dictionary_counts() -> dict[str, int]:
    """Return accepted-word counts for all configured levels."""
    return {level_id: len(load_words(level_id)) for level_id in LEVELS}


def answer_counts() -> dict[str, int]:
    """Return random-answer counts for all configured levels."""
    return {level_id: len(load_answers(level_id)) for level_id in LEVELS}
