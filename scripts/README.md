# Scripts

## Validate word lists

Run from the repository root:

```bash
python scripts/validate_wordlists.py
```

The script checks every file listed in `docs/WORDLIST_MANIFEST.json` for:

- expected line count
- expected SHA-256 hash
- lowercase alphabetic words only
- correct word length based on the file name
- duplicate entries
