// dictionaryCheck.js
// Drop-in dictionary helpers for 3, 4, 5, 6 letter modes.
// Import WORDS_3 and ANSWERS_3 from ./wordLists3.js.
// Keep your existing WORDS_4 / WORDS_5 / WORDS_6 and ANSWERS_4 / ANSWERS_5 / ANSWERS_6.

import { WORDS_3, ANSWERS_3 } from './wordLists3.js';

// Example: replace these imports/variables with your existing lists.
// import { WORDS_4, ANSWERS_4, WORDS_5, ANSWERS_5, WORDS_6, ANSWERS_6 } from './wordLists.js';

export function normalizeWord(input) {
  return String(input ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .trim();
}

export function makeWordSet(words, expectedLength) {
  const pattern = new RegExp(`^[a-z]{${expectedLength}}$`);
  return new Set(
    words
      .map(normalizeWord)
      .filter((word) => pattern.test(word))
  );
}

const WORD_SETS = {
  3: makeWordSet(WORDS_3, 3),
  // 4: makeWordSet(WORDS_4, 4),
  // 5: makeWordSet(WORDS_5, 5),
  // 6: makeWordSet(WORDS_6, 6),
};

const ANSWER_LISTS = {
  3: ANSWERS_3,
  // 4: ANSWERS_4,
  // 5: ANSWERS_5,
  // 6: ANSWERS_6,
};

export function isValidWord(rawGuess, wordLength) {
  const guess = normalizeWord(rawGuess);
  const pattern = new RegExp(`^[a-z]{${wordLength}}$`);

  if (!pattern.test(guess)) return false;

  const wordSet = WORD_SETS[wordLength];
  if (!wordSet) {
    throw new Error(`No dictionary loaded for ${wordLength}-letter words.`);
  }

  return wordSet.has(guess);
}

export function pickAnswer(wordLength) {
  const answers = ANSWER_LISTS[wordLength];
  if (!answers || answers.length === 0) {
    throw new Error(`No answer list loaded for ${wordLength}-letter words.`);
  }
  return answers[Math.floor(Math.random() * answers.length)];
}

export function validateDictionary(words, expectedLength) {
  const pattern = new RegExp(`^[a-z]{${expectedLength}}$`);
  const seen = new Set();
  const duplicates = [];
  const invalid = [];

  for (const raw of words) {
    const word = normalizeWord(raw);
    if (!pattern.test(word)) {
      invalid.push(raw);
      continue;
    }
    if (seen.has(word)) duplicates.push(word);
    seen.add(word);
  }

  return {
    count: seen.size,
    duplicates: [...new Set(duplicates)].sort(),
    invalid: invalid.sort(),
  };
}

export function assertAnswerSubsetOfWords(words, answers) {
  const allowed = makeWordSet(words, 3);
  const missing = answers
    .map(normalizeWord)
    .filter((answer) => !allowed.has(answer))
    .sort();

  return {
    ok: missing.length === 0,
    missing,
  };
}
