from guess_the_good_word.game import score_guess


def test_exact_match_scores_all_correct():
    assert score_guess("plant", "plant") == ["correct"] * 5


def test_duplicate_letters_are_not_overcounted():
    assert score_guess("sheep", "smile") == ["correct", "absent", "present", "absent", "absent"]


def test_present_letters():
    assert score_guess("train", "plant") == ["present", "absent", "correct", "absent", "present"]
