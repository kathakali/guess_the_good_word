from __future__ import annotations

LEVELS = {
    "kids3": {
        "id": "kids3",
        "label": "3 Letters",
        "subtitle": "Kids starter",
        "icon": "🧸",
        "word_length": 3,
        "max_guesses": 10,
        "dictionary": "words_3.txt",
        "answer_dictionary": "answers_3.txt",
        "description": "Short, friendly words with helpful hints.",
        "hint_style": "direct",
    },
    "kids4": {
        "id": "kids4",
        "label": "4 Letters",
        "subtitle": "Kids builder",
        "icon": "📚",
        "word_length": 4,
        "max_guesses": 8,
        "dictionary": "words_4.txt",
        "answer_dictionary": "answers_4.txt",
        "description": "Everyday words with gentler, vaguer hints.",
        "hint_style": "vague",
    },
    "core5": {
        "id": "core5",
        "label": "5 Letters",
        "subtitle": "Main game",
        "icon": "✨",
        "word_length": 5,
        "max_guesses": 6,
        "dictionary": "words_5.txt",
        "answer_dictionary": "answers_5.txt",
        "description": "The main level with an 8,000-word validation dictionary.",
        "hint_style": "none",
    },
    "challenge6": {
        "id": "challenge6",
        "label": "6 Letters",
        "subtitle": "Challenge",
        "icon": "🏔️",
        "word_length": 6,
        "max_guesses": 8,
        "dictionary": "words_6.txt",
        "answer_dictionary": "answers_6.txt",
        "description": "Longer words with more room to solve.",
        "hint_style": "none",
    },
}

DEFAULT_LEVEL = "core5"
