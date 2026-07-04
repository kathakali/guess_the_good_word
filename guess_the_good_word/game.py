"""Core game-session, answer-picking, scoring, and hint logic."""

from __future__ import annotations

from dataclasses import dataclass, field
import random
import time
from typing import Literal

LetterState = Literal["absent", "present", "correct"]
VOWELS = set("aeiou")


@dataclass
class GameSession:
    """State for one active in-memory game."""

    game_id: str
    level_id: str
    answer: str
    max_guesses: int
    guesses: list[str] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    finished: bool = False

    @property
    def attempts_used(self) -> int:
        """Return how many accepted guesses have been submitted."""
        return len(self.guesses)


def choose_answer(words: tuple[str, ...]) -> str:
    """Pick one answer from a non-empty answer pool."""
    if not words:
        raise ValueError("Answer pool cannot be empty")
    return random.choice(words)


def score_guess(guess: str, answer: str) -> list[LetterState]:
    """Score a guess using Wordle-style duplicate-letter handling."""
    guess = guess.lower()
    answer = answer.lower()
    if len(guess) != len(answer):
        raise ValueError("Guess and answer must have the same length")

    result: list[LetterState] = ["absent"] * len(answer)
    consumed = [False] * len(answer)

    # Pass 1: exact-position matches.
    for index, letter in enumerate(guess):
        if letter == answer[index]:
            result[index] = "correct"
            consumed[index] = True

    # Pass 2: present elsewhere, without over-counting repeated letters.
    for index, letter in enumerate(guess):
        if result[index] == "correct":
            continue
        for answer_index, answer_letter in enumerate(answer):
            if consumed[answer_index]:
                continue
            if letter == answer_letter:
                result[index] = "present"
                consumed[answer_index] = True
                break

    return result


def _vowel_count(answer: str) -> int:
    """Count vowels in an answer."""
    return sum(1 for letter in answer if letter in VOWELS)


def make_hint(answer: str, word_length: int) -> str:
    """Return kids-level hints only.

    Three-letter hints are intentionally more direct. Four-letter hints are
    intentionally vaguer. Five- and six-letter modes do not expose hints.
    """
    answer = answer.lower()
    vowels = _vowel_count(answer)

    if word_length == 3:
        suffix = "s" if vowels != 1 else ""
        return (
            f"It starts with {answer[0].upper()}, ends with {answer[-1].upper()}, "
            f"and has {vowels} vowel{suffix}."
        )

    if word_length == 4:
        opening = "a vowel" if answer[0] in VOWELS else "a consonant"
        repeat_text = (
            "has a repeated letter"
            if len(set(answer)) < len(answer)
            else "has no repeated letters"
        )
        return f"It starts with {opening} and {repeat_text}."

    return ""
