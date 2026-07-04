from guess_the_good_word import create_app
from guess_the_good_word.dictionaries import load_words


def test_levels_endpoint():
    app = create_app()
    client = app.test_client()
    response = client.get("/api/levels")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data["levels"]) == 4
    assert data["default_level"] == "core5"
    tries_by_id = {level["id"]: level["max_guesses"] for level in data["levels"]}
    assert tries_by_id == {"kids3": 10, "kids4": 8, "core5": 6, "challenge6": 8}


def test_new_game_and_guess():
    app = create_app()
    client = app.test_client()
    new_game = client.post("/api/game", json={"level_id": "kids3"})
    assert new_game.status_code == 200
    game_id = new_game.get_json()["game_id"]
    guess = load_words("kids3")[0]
    guessed = client.post("/api/guess", json={"game_id": game_id, "guess": guess})
    assert guessed.status_code == 200
    assert guessed.get_json()["accepted"] is True


def test_invalid_short_guess_is_rejected_without_error():
    app = create_app()
    client = app.test_client()
    new_game = client.post("/api/game", json={"level_id": "core5"})
    game_id = new_game.get_json()["game_id"]
    response = client.post("/api/guess", json={"game_id": game_id, "guess": "cat"})
    assert response.status_code == 200
    assert response.get_json()["accepted"] is False


def test_hints_are_kids_only():
    app = create_app()
    client = app.test_client()

    kids3 = client.post("/api/game", json={"level_id": "kids3"}).get_json()
    kids4 = client.post("/api/game", json={"level_id": "kids4"}).get_json()
    core5 = client.post("/api/game", json={"level_id": "core5"}).get_json()

    assert kids3["hint_available"] is True
    assert "starts with" in kids3["hint"].lower()
    assert "ends with" in kids3["hint"].lower()
    assert kids4["hint_available"] is True
    assert "starts with a" in kids4["hint"].lower()
    assert core5["hint_available"] is False
    assert core5["hint"] == ""
