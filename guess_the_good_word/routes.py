"""Flask routes and JSON API endpoints for the game."""

from __future__ import annotations

import secrets
import time

from flask import Blueprint, jsonify, render_template, request

from .config import DEFAULT_LEVEL, LEVELS
from .dictionaries import answer_counts, dictionary_counts, load_answers, word_set
from .game import GameSession, choose_answer, make_hint, score_guess

bp = Blueprint("main", __name__)

# In-memory active game store. Restarting Flask clears active games.
GAMES: dict[str, GameSession] = {}
MAX_GAME_AGE_SECONDS = 4 * 60 * 60


def cleanup_games() -> None:
    """Remove stale in-memory games."""
    now = time.time()
    old_ids = [
        game_id
        for game_id, game in GAMES.items()
        if now - game.created_at > MAX_GAME_AGE_SECONDS
    ]
    for game_id in old_ids:
        GAMES.pop(game_id, None)


def public_level(level_id: str) -> dict:
    """Return level settings safe for the browser."""
    level = dict(LEVELS[level_id])
    level.pop("dictionary", None)
    level.pop("answer_dictionary", None)
    level["word_count"] = dictionary_counts()[level_id]
    return level


@bp.get("/")
def index():
    """Render the one-page game UI."""
    return render_template("index.html", default_level=DEFAULT_LEVEL)


@bp.get("/api/levels")
def api_levels():
    """Return all public level definitions."""
    return jsonify(
        {
            "default_level": DEFAULT_LEVEL,
            "levels": [public_level(level_id) for level_id in LEVELS],
        }
    )


@bp.post("/api/game")
def api_new_game():
    """Start a new game for the selected level."""
    cleanup_games()
    payload = request.get_json(silent=True) or {}
    level_id = payload.get("level_id", DEFAULT_LEVEL)
    if level_id not in LEVELS:
        return jsonify({"error": "Unknown level."}), 400

    answers = load_answers(level_id)
    answer = choose_answer(answers)
    game_id = secrets.token_urlsafe(16)
    level = LEVELS[level_id]
    GAMES[game_id] = GameSession(
        game_id=game_id,
        level_id=level_id,
        answer=answer,
        max_guesses=level["max_guesses"],
    )

    return jsonify(
        {
            "game_id": game_id,
            "level": public_level(level_id),
            "hint": make_hint(answer, level["word_length"]),
            "hint_available": level.get("hint_style") in {"direct", "vague"},
            "message": f"New {level['label']} game started.",
        }
    )


@bp.post("/api/guess")
def api_guess():
    """Accept and score a guess for an active game."""
    payload = request.get_json(silent=True) or {}
    game_id = payload.get("game_id", "")
    guess = str(payload.get("guess", "")).strip().lower()

    game = GAMES.get(game_id)
    if not game:
        return jsonify({"error": "Game not found. Start a new game."}), 404
    if game.finished:
        return jsonify({"error": "This game is already complete."}), 400

    level = LEVELS[game.level_id]
    expected_length = level["word_length"]
    if len(guess) != expected_length or not guess.isalpha():
        return (
            jsonify(
                {
                    "accepted": False,
                    "message": f"Enter a {expected_length}-letter word.",
                }
            ),
            200,
        )

    if guess not in word_set(game.level_id):
        return (
            jsonify(
                {
                    "accepted": False,
                    "message": "That word is not in this level's dictionary.",
                }
            ),
            200,
        )

    game.guesses.append(guess)
    score = score_guess(guess, game.answer)
    solved = guess == game.answer
    over = solved or len(game.guesses) >= game.max_guesses
    game.finished = over

    if solved:
        message = "Excellent. You found the good word!"
    elif over:
        message = f"Game over. The word was {game.answer.upper()}."
    else:
        tries_left = game.max_guesses - len(game.guesses)
        message = f"{tries_left} {'try' if tries_left == 1 else 'tries'} left."

    return jsonify(
        {
            "accepted": True,
            "guess": guess,
            "score": score,
            "attempts_used": len(game.guesses),
            "max_guesses": game.max_guesses,
            "solved": solved,
            "over": over,
            "answer": game.answer if over else None,
            "message": message,
        }
    )


@bp.get("/health")
def health():
    """Return a small health-check payload."""
    return jsonify({"ok": True, "levels": dictionary_counts(), "answers": answer_counts()})
