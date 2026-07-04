"""Local development entry point for Guess the Good Word."""

from guess_the_good_word import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
