# Word-list notes

This repository includes separate **guess dictionaries** and **answer pools** for each level.

| File | Count | Purpose |
|---|---:|---|
| `words_3.txt` | 333 | Accepted 3-letter guesses |
| `answers_3.txt` | 283 | Random 3-letter answers |
| `words_4.txt` | 8,000 | Accepted 4-letter guesses |
| `answers_4.txt` | 1,000 | Random 4-letter answers |
| `words_5.txt` | 8,000 | Accepted 5-letter guesses |
| `answers_5.txt` | 1,800 | Random 5-letter answers |
| `words_6.txt` | 7,000 | Accepted 6-letter guesses |
| `answers_6.txt` | 1,400 | Random 6-letter answers |

The answer pools are intentionally smaller and friendlier than the validation dictionaries. That lets players guess a broad range of words while keeping the random answers more playable.

Very short English word inventories are naturally limited, so the 3-letter list is smaller than the 4-, 5-, and 6-letter lists. The included validation script checks count, word length, duplicate entries, lowercase alphabetic formatting, and SHA-256 values.

Run validation from the repository root:

```bash
python scripts/validate_wordlists.py
```

Before a public classroom release, manually review the answer pools and any newly added words for age-appropriateness.
