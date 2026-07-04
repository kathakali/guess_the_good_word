// validate_words_3.js
// Run with: node validate_words_3.js
// Checks the updated words_3.txt and answers_3.txt files.

const fs = require('node:fs');
const path = require('node:path');

function readWords(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((w) => w.normalize('NFKC').trim().toLowerCase())
    .filter(Boolean);
}

function checkList(words, expectedLength) {
  const pattern = new RegExp(`^[a-z]{${expectedLength}}$`);
  const seen = new Set();
  const duplicates = new Set();
  const invalid = [];

  for (const word of words) {
    if (!pattern.test(word)) invalid.push(word);
    if (seen.has(word)) duplicates.add(word);
    seen.add(word);
  }

  return {
    totalLines: words.length,
    uniqueWords: seen.size,
    invalid,
    duplicates: [...duplicates].sort(),
    sorted: words.join('\n') === [...words].sort().join('\n'),
  };
}

const dataDir = process.argv[2] || path.join(__dirname, 'data');
const wordsPath = path.join(dataDir, 'words_3.txt');
const answersPath = path.join(dataDir, 'answers_3.txt');

const words = readWords(wordsPath);
const answers = readWords(answersPath);
const wordSet = new Set(words);
const missingAnswers = answers.filter((word) => !wordSet.has(word));

const result = {
  words_3: checkList(words, 3),
  answers_3: checkList(answers, 3),
  answersAreSubsetOfWords: missingAnswers.length === 0,
  answersMissingFromWords: missingAnswers,
};

console.log(JSON.stringify(result, null, 2));

if (
  result.words_3.invalid.length ||
  result.answers_3.invalid.length ||
  result.words_3.duplicates.length ||
  result.answers_3.duplicates.length ||
  missingAnswers.length
) {
  process.exitCode = 1;
}
