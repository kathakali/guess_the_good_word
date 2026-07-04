from guess_the_good_word.config import LEVELS
from guess_the_good_word.dictionaries import load_answers, load_words

EXPECTED_COUNTS = {
    "kids3": 333,
    "kids4": 8000,
    "core5": 8000,
    "challenge6": 7000,
}
MIN_ANSWER_COUNTS = {
    "kids3": 250,
    "kids4": 800,
    "core5": 1200,
    "challenge6": 1000,
}


def test_dictionary_counts_and_lengths():
    for level_id, expected_count in EXPECTED_COUNTS.items():
        words = load_words(level_id)
        assert len(words) == expected_count
        assert len(words) == len(set(words))
        assert all(word.isalpha() for word in words)
        assert all(word == word.lower() for word in words)
        assert all(len(word) == LEVELS[level_id]["word_length"] for word in words)


def test_answer_pools_are_valid_subsets():
    for level_id, min_count in MIN_ANSWER_COUNTS.items():
        words = set(load_words(level_id))
        answers = load_answers(level_id)
        assert len(answers) >= min_count
        assert set(answers).issubset(words)
        assert len(answers) == len(set(answers))
        assert all(len(answer) == LEVELS[level_id]["word_length"] for answer in answers)
