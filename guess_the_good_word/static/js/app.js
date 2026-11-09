const stateRank = { absent: 1, present: 2, correct: 3 };
const stateLabels = { absent: 'not in the word', present: 'wrong position', correct: 'correct position' };
const stateSymbols = { absent: '×', present: '↔', correct: '✓' };
const byId = id => document.getElementById(id);

const el = {
  levelList: byId('level-list'),
  heading: byId('game-heading'),
  levelCaption: byId('level-caption'),
  levelDescription: byId('level-description'),
  dictionaryNote: byId('dictionary-note'),
  board: byId('game-board'),
  keyboard: byId('keyboard'),
  attempt: byId('attempt-label'),
  status: byId('status-message'),
  hintButton: byId('hint-button'),
  hintPanel: byId('hint-panel'),
  hintText: byId('hint-text'),
  hintRules: byId('hint-rules'),
  hintRuleText: byId('hint-rule-text'),
  newGameButton: byId('new-game-button'),
  shareButton: byId('share-button'),
  helpButton: byId('help-button'),
  helpDialog: byId('help-dialog'),
  helpLevelNote: byId('help-level-note'),
  symbolMode: byId('symbol-mode'),
  statsButton: byId('stats-button'),
  statsDialog: byId('stats-dialog'),
  statsSidebar: byId('stats-sidebar'),
  statsContent: byId('stats-content'),
  statsDialogContent: byId('stats-dialog-content'),
  statsLevel: byId('stats-level'),
  resetStatsButton: byId('reset-stats-button'),
  guessTrail: byId('guess-trail'),
  trailEmpty: byId('trail-empty'),
  played: byId('stat-played'),
  winRate: byId('stat-win-rate'),
  streak: byId('stat-streak'),
  bestStreak: byId('stat-best-streak'),
  dialog: byId('result-dialog'),
  resultTitle: byId('result-title'),
  resultKicker: byId('result-kicker'),
  resultEmblem: byId('result-emblem'),
  resultAnswer: byId('result-answer'),
  resultBody: byId('result-body'),
  resultGrid: byId('result-grid'),
  resultSummary: byId('result-summary'),
  shareOutput: byId('share-output'),
  shareDetails: byId('share-details'),
  copyButton: byId('copy-result-button'),
  copyStatus: byId('copy-status'),
  playAgainButton: byId('play-again-button'),
};

let levels = [];
let currentLevel = null;
let currentGameId = null;
let hint = '';
let hintAvailable = false;
let hintUsed = false;
let boardState = [];
let boardTiles = [];
let submitted = [];
let keyStates = {};
let currentRow = 0;
let currentCol = 0;
let acceptingInput = false;
let busy = false;
let finished = false;
let gameVersion = 0;
let resultTimer;
let lastShareText = '';
let finalAnswer = '';
let finalWon = false;
const keyButtons = new Map();
const statsCache = new Map();
const compactStats = window.matchMedia('(max-width: 1100px)');

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = response.status;
    throw error;
  }
  return data;
}

function setStatus(text, kind = '') {
  el.status.textContent = text;
  el.status.classList.toggle('is-error', kind === 'error');
  el.status.classList.toggle('is-success', kind === 'success');
}

function setBusy(value) {
  busy = value;
  el.board.setAttribute('aria-busy', String(value));
  el.newGameButton.disabled = value;
  el.hintButton.disabled = value || finished;
  el.hintButton.hidden = !hintAvailable || finished;
  el.shareButton.hidden = !lastShareText;
  el.shareButton.disabled = value;
  for (const button of el.levelList.children) button.disabled = value;
  for (const button of keyButtons.values()) button.disabled = value || !acceptingInput;
}

function statsKey() {
  return `guess-good-word-stats-${currentLevel?.id || 'none'}`;
}

function defaultStats() {
  return { played: 0, wins: 0, streak: 0, bestStreak: 0 };
}

function loadStats() {
  const key = statsKey();
  if (statsCache.has(key)) return statsCache.get(key);
  let stored;
  try { stored = JSON.parse(localStorage.getItem(key)); } catch { /* Storage can be unavailable. */ }
  const stats = defaultStats();
  for (const field of Object.keys(stats)) {
    if (Number.isInteger(stored?.[field]) && stored[field] >= 0) stats[field] = stored[field];
  }
  statsCache.set(key, stats);
  return stats;
}

function saveStats(stats) {
  statsCache.set(statsKey(), stats);
  try { localStorage.setItem(statsKey(), JSON.stringify(stats)); } catch { /* Keep session stats in memory. */ }
}

function renderStats() {
  const stats = loadStats();
  el.played.textContent = stats.played;
  el.winRate.textContent = stats.played ? `${Math.round((stats.wins / stats.played) * 100)}%` : '0%';
  el.streak.textContent = stats.streak;
  el.bestStreak.textContent = stats.bestStreak;
  el.statsLevel.textContent = currentLevel?.subtitle || 'Your games';
}

function recordStats(won) {
  const stats = loadStats();
  stats.played += 1;
  if (won) {
    stats.wins += 1;
    stats.streak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
  } else {
    stats.streak = 0;
  }
  saveStats(stats);
  renderStats();
}

function renderLevels() {
  el.levelList.replaceChildren();
  for (const level of levels) {
    const button = document.createElement('button');
    const active = currentLevel?.id === level.id;
    const hasHints = ['direct', 'vague'].includes(level.hint_style);
    button.type = 'button';
    button.className = `level-card${active ? ' active' : ''}`;
    button.dataset.levelId = level.id;
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', `${level.word_length} letters, ${level.subtitle}, ${level.max_guesses} attempts, ${hasHints ? 'with hints' : 'no hints'}`);

    const number = document.createElement('span');
    number.className = 'level-number';
    number.textContent = level.word_length;
    const unit = document.createElement('span');
    unit.className = 'level-unit';
    unit.textContent = 'letters';
    number.appendChild(unit);

    const meta = document.createElement('span');
    meta.className = 'level-meta';
    const title = document.createElement('strong');
    title.textContent = level.subtitle;
    const detail = document.createElement('small');
    detail.textContent = `${level.max_guesses} attempts · ${hasHints ? 'Hints' : 'No hints'}`;
    meta.append(title, detail);
    button.append(number, meta);
    button.addEventListener('click', () => startGame(level.id));
    el.levelList.appendChild(button);
  }
}

function renderLevelInfo() {
  el.heading.textContent = currentLevel.subtitle;
  el.levelCaption.textContent = `${currentLevel.word_length} letters · ${currentLevel.max_guesses} attempts · ${hintAvailable ? 'Hints' : 'No hints'}`;
  el.levelDescription.textContent = currentLevel.description;
  el.dictionaryNote.textContent = `${currentLevel.word_count.toLocaleString()} accepted words, with a separate answer pool.`;
  el.hintRules.hidden = !hintAvailable;
  const hintRule = currentLevel.word_length === 3
    ? 'Need a nudge? Hint reveals the first and last letters, plus the number of vowels.'
    : 'Need a nudge? Hint tells you how the word starts and whether any letters repeat.';
  el.hintRuleText.textContent = hintAvailable ? hintRule : '';
  el.helpLevelNote.textContent = `${currentLevel.subtitle}: ${currentLevel.max_guesses} attempts to find a ${currentLevel.word_length}-letter word. ${hintAvailable ? hintRule : 'No hints here. Let the letter clues guide you.'}`;
}

function updateProgress() {
  if (!currentLevel) return;
  el.attempt.textContent = finished
    ? `${submitted.length} of ${currentLevel.max_guesses} attempts used`
    : `Attempt ${currentRow + 1} of ${currentLevel.max_guesses}`;
}

function buildBoard() {
  el.board.replaceChildren();
  boardTiles = [];
  el.board.dataset.length = String(currentLevel.word_length);
  el.board.setAttribute('aria-label', `${currentLevel.subtitle}: ${currentLevel.max_guesses} guesses of ${currentLevel.word_length} letters`);
  el.board.setAttribute('aria-rowcount', currentLevel.max_guesses);
  el.board.setAttribute('aria-colcount', currentLevel.word_length);

  for (let r = 0; r < currentLevel.max_guesses; r += 1) {
    const row = document.createElement('div');
    row.className = 'board-row';
    row.dataset.attempt = r + 1;
    row.setAttribute('role', 'row');
    row.setAttribute('aria-rowindex', r + 1);
    row.addEventListener('animationend', event => {
      if (event.target === row) row.classList.remove('is-invalid');
    });
    const tiles = [];
    for (let c = 0; c < currentLevel.word_length; c += 1) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('aria-colindex', c + 1);
      const letter = document.createElement('span');
      letter.className = 'tile-letter';
      letter.setAttribute('aria-hidden', 'true');
      const symbol = document.createElement('span');
      symbol.className = 'state-symbol';
      symbol.setAttribute('aria-hidden', 'true');
      tile.append(letter, symbol);
      tile.addEventListener('animationend', event => {
        if (event.animationName === 'type-in') tile.classList.remove('is-entering');
        if (event.animationName === 'reveal') tile.classList.remove('is-revealing');
      });
      row.appendChild(tile);
      tiles.push({ tile, letter, symbol });
    }
    boardTiles.push(tiles);
    el.board.appendChild(row);
  }
  renderBoard();
}

// Keep tiles mounted while typing so earlier guesses never replay their reveals.
function renderBoard(revealRow = -1, enteredCol = -1) {
  boardTiles.forEach((tiles, r) => {
    const active = !finished && r === currentRow;
    el.board.children[r].classList.toggle('is-current', active);
    tiles.forEach(({ tile, letter, symbol }, c) => {
      const value = boardState[r][c];
      const score = submitted[r]?.score[c];
      if (letter.textContent !== value) letter.textContent = value;
      tile.classList.toggle('filled', Boolean(value));
      tile.classList.toggle('is-cursor', active && c === currentCol);
      for (const state of Object.keys(stateRank)) tile.classList.toggle(state, score === state);
      symbol.textContent = stateSymbols[score] || '';
      tile.setAttribute('aria-label', `Attempt ${r + 1}, letter ${c + 1}: ${value || 'empty'}${score ? `, ${stateLabels[score]}` : ''}`);
      if (score) tile.classList.remove('is-entering');
      if (r === revealRow) tile.classList.add('is-revealing');
      if (active && c === enteredCol) tile.classList.add('is-entering');
    });
  });
}

function renderKeyboard() {
  el.keyboard.replaceChildren();
  keyButtons.clear();
  ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].forEach((letters, index) => {
    const row = document.createElement('div');
    row.className = 'keyboard-row';
    const labels = [...letters];
    if (index === 2) labels.unshift('ENTER');
    if (index === 2) labels.push('⌫');
    for (const label of labels) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `key${label.length > 1 || label === '⌫' ? ' wide' : ''}`;
      button.dataset.key = label;
      button.textContent = label;
      const symbol = document.createElement('span');
      symbol.className = 'state-symbol';
      symbol.setAttribute('aria-hidden', 'true');
      button.appendChild(symbol);
      button.addEventListener('click', event => {
        handleInput(label);
        if (event.detail > 0) el.board.focus({ preventScroll: true });
      });
      row.appendChild(button);
      keyButtons.set(label, button);
    }
    el.keyboard.appendChild(row);
  });
  renderKeyStates();
}

function renderKeyStates() {
  for (const [letter, button] of keyButtons) {
    const score = keyStates[letter];
    for (const state of Object.keys(stateRank)) button.classList.toggle(state, score === state);
    button.querySelector('.state-symbol').textContent = stateSymbols[score] || '';
    const label = letter === '⌫' ? 'Backspace' : letter === 'ENTER' ? 'Enter guess' : letter;
    button.setAttribute('aria-label', `${label}${score ? `, ${stateLabels[score]}` : ''}`);
  }
}

function miniTile(score, letter = '') {
  const tile = document.createElement('span');
  tile.className = `mini-tile ${score}`;
  tile.textContent = letter;
  const symbol = document.createElement('span');
  symbol.className = 'state-symbol';
  symbol.textContent = stateSymbols[score];
  tile.appendChild(symbol);
  return tile;
}

function renderGuessTrail() {
  el.guessTrail.replaceChildren();
  el.trailEmpty.hidden = submitted.length > 0;
  el.guessTrail.hidden = submitted.length === 0;
  submitted.forEach((item, index) => {
    const li = document.createElement('li');
    const descriptions = [...item.guess].map((letter, c) => `${letter.toUpperCase()}: ${stateLabels[item.score[c]]}`);
    li.setAttribute('aria-label', `Guess ${index + 1}, ${item.guess.toUpperCase()}. ${descriptions.join(', ')}`);
    const number = document.createElement('span');
    number.className = 'trail-number';
    number.textContent = index + 1;
    number.setAttribute('aria-hidden', 'true');
    li.appendChild(number);
    [...item.guess.toUpperCase()].forEach((letter, c) => {
      const tile = miniTile(item.score[c], letter);
      tile.setAttribute('aria-hidden', 'true');
      li.appendChild(tile);
    });
    el.guessTrail.appendChild(li);
  });
}

function updateKeyStates(guess, score) {
  [...guess.toUpperCase()].forEach((letter, index) => {
    const next = score[index];
    const old = keyStates[letter];
    if (!old || stateRank[next] > stateRank[old]) keyStates[letter] = next;
  });
  renderKeyStates();
}

async function startGame(levelId = currentLevel?.id) {
  if (busy) return;
  if (!levels.length) { await init(); return; }
  const next = levels.find(level => level.id === levelId);
  if (!next) return;
  const wasAccepting = acceptingInput;
  const version = ++gameVersion;
  clearTimeout(resultTimer);
  acceptingInput = false;
  setBusy(true);
  setStatus('Finding your next word…');

  try {
    const data = await api('/api/game', {
      method: 'POST',
      body: JSON.stringify({ level_id: next.id }),
    });
    if (version !== gameVersion) return;
    currentGameId = data.game_id;
    currentLevel = data.level;
    hint = data.hint || '';
    hintAvailable = Boolean(data.hint_available && hint);
    hintUsed = false;
    finished = false;
    lastShareText = '';
    finalAnswer = '';
    finalWon = false;
    boardState = Array.from({ length: currentLevel.max_guesses }, () => Array(currentLevel.word_length).fill(''));
    submitted = [];
    keyStates = {};
    currentRow = 0;
    currentCol = 0;
    acceptingInput = true;
    el.hintPanel.hidden = true;
    el.hintButton.setAttribute('aria-expanded', 'false');
    el.board.closest('.game-panel').classList.remove('has-hint');
    renderLevels();
    renderLevelInfo();
    buildBoard();
    renderKeyStates();
    renderGuessTrail();
    renderStats();
    updateProgress();
    setStatus(`Try a ${currentLevel.word_length}-letter word.`);
    if (!el.helpDialog.open && !el.statsDialog.open) el.board.focus({ preventScroll: true });
  } catch {
    if (version === gameVersion) {
      acceptingInput = wasAccepting;
      setStatus('Couldn’t start a game. Try New game again.', 'error');
    }
  } finally {
    if (version === gameVersion) setBusy(false);
  }
}

function addLetter(letter) {
  if (!acceptingInput || busy || currentCol >= currentLevel.word_length) return;
  boardState[currentRow][currentCol] = letter;
  const enteredCol = currentCol;
  currentCol += 1;
  renderBoard(-1, enteredCol);
  if (el.status.classList.contains('is-error')) setStatus('Make it a good guess.');
}

function removeLetter() {
  if (!acceptingInput || busy || currentCol <= 0) return;
  currentCol -= 1;
  boardState[currentRow][currentCol] = '';
  renderBoard();
  if (el.status.classList.contains('is-error')) setStatus('Make it a good guess.');
}

function shakeCurrentRow() {
  const row = el.board.children[currentRow];
  if (!row) return;
  row.classList.remove('is-invalid');
  void row.offsetWidth;
  row.classList.add('is-invalid');
}

async function submitGuess() {
  if (!acceptingInput || busy) return;
  if (currentCol < currentLevel.word_length) {
    setStatus(`Enter all ${currentLevel.word_length} letters first.`, 'error');
    shakeCurrentRow();
    return;
  }
  const version = gameVersion;
  const row = currentRow;
  const guess = boardState[row].join('').toLowerCase();
  acceptingInput = false;
  setBusy(true);
  setStatus('Checking your word…');

  try {
    const data = await api('/api/guess', {
      method: 'POST',
      body: JSON.stringify({ game_id: currentGameId, guess }),
    });
    if (version !== gameVersion) return;
    if (!data.accepted) {
      setStatus(data.message, 'error');
      shakeCurrentRow();
      return;
    }
    submitted.push({ guess: data.guess, score: data.score });
    boardState[row] = [...data.guess.toUpperCase()];
    updateKeyStates(data.guess, data.score);
    finished = data.over;
    currentRow += 1;
    currentCol = 0;
    renderBoard(row);
    renderGuessTrail();
    updateProgress();
    setStatus(data.message, data.solved ? 'success' : '');

    if (finished) {
      recordStats(data.solved);
      lastShareText = buildShareText(data.solved);
      finalAnswer = data.answer;
      finalWon = data.solved;
      resultTimer = setTimeout(() => {
        if (version === gameVersion && !el.helpDialog.open && !el.statsDialog.open) showResult();
      }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 650);
    }
  } catch (error) {
    if (version === gameVersion) {
      if (error.status === 404) currentGameId = null;
      setStatus(error.status ? error.message : 'Couldn’t check that word. Please try again.', 'error');
    }
  } finally {
    if (version === gameVersion) {
      acceptingInput = !finished && Boolean(currentGameId);
      setBusy(false);
      renderBoard();
    }
  }
}

function buildShareText(won) {
  const heading = `Guess the Good Word · ${currentLevel.subtitle} · ${currentLevel.label} · ${won ? submitted.length : 'X'}/${currentLevel.max_guesses}${hintUsed ? ' · hint used' : ''}`;
  const rows = submitted.map(item => item.score.map(s => s === 'correct' ? '🟦' : s === 'present' ? '🔷' : '🩷').join(''));
  return [heading, ...rows].join('\n');
}

function showResult() {
  if (!lastShareText) return;
  el.dialog.classList.toggle('is-win', finalWon);
  el.resultEmblem.textContent = finalWon ? '✦' : '↗';
  el.resultKicker.textContent = finalWon ? 'That’s a good word' : 'A little wiser, one word later';
  el.resultTitle.textContent = finalWon ? 'You found it!' : 'A good try.';
  el.resultAnswer.textContent = finalAnswer.toUpperCase();
  el.resultBody.textContent = finalWon
    ? `Solved in ${submitted.length} ${submitted.length === 1 ? 'guess' : 'guesses'}. Nicely done!`
    : 'That was the word. A fresh one is waiting for you.';
  el.resultSummary.textContent = `${currentLevel.subtitle} · ${submitted.length}/${currentLevel.max_guesses} attempts${hintUsed ? ' · Hint used' : ''}`;
  el.resultGrid.replaceChildren();
  for (const item of submitted) {
    const row = document.createElement('div');
    row.className = 'result-grid-row';
    for (const score of item.score) row.appendChild(miniTile(score));
    el.resultGrid.appendChild(row);
  }
  el.shareOutput.value = lastShareText;
  el.shareDetails.open = false;
  el.copyStatus.textContent = '';
  el.copyButton.textContent = 'Copy result';
  if (!el.dialog.open) el.dialog.showModal();
}

function handleInput(input) {
  if (el.dialog.open || el.helpDialog.open || el.statsDialog.open) return;
  if (input === 'ENTER') { submitGuess(); return; }
  if (input === 'BACKSPACE' || input === '⌫') { removeLetter(); return; }
  if (/^[A-Z]$/.test(input)) addLetter(input);
}

function showHint() {
  if (!currentGameId || !hintAvailable || busy || finished) return;
  const show = el.hintPanel.hidden;
  if (show) hintUsed = true;
  el.hintPanel.hidden = !show;
  el.hintText.textContent = hint;
  el.hintButton.setAttribute('aria-expanded', String(show));
  el.board.closest('.game-panel').classList.toggle('has-hint', show);
}

function resetStats() {
  saveStats(defaultStats());
  renderStats();
  setStatus('Stats reset for this level.');
}

async function copyResult() {
  el.copyButton.disabled = true;
  try {
    await navigator.clipboard.writeText(el.shareOutput.value);
    el.copyButton.textContent = 'Copied!';
    el.copyStatus.textContent = 'Your result is ready to share.';
  } catch {
    el.shareDetails.open = true;
    el.shareOutput.focus();
    el.shareOutput.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { /* Manual copy remains available. */ }
    el.copyButton.textContent = copied ? 'Copied!' : 'Copy result';
    el.copyStatus.textContent = copied ? 'Your result is ready to share.' : 'Copy the selected text below to share your result.';
  } finally {
    el.copyButton.disabled = false;
  }
}

function syncStatsLocation() {
  if (!compactStats.matches && el.statsDialog.open) el.statsDialog.close();
  // Reuse the same stats and listeners in the desktop sidebar and mobile dialog.
  const parent = compactStats.matches ? el.statsDialogContent : el.statsSidebar;
  parent.appendChild(el.statsContent);
}

function bindEvents() {
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (el.dialog.open || el.helpDialog.open || el.statsDialog.open) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const key = event.key.toUpperCase();
    if (key === 'ENTER' && event.target.closest('button, a, summary')) return;
    if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
      if (!acceptingInput || busy) return;
      event.preventDefault();
      el.board.focus({ preventScroll: true });
      handleInput(key);
    }
  });
  el.newGameButton.addEventListener('click', () => startGame());
  el.hintButton.addEventListener('click', showHint);
  el.shareButton.addEventListener('click', showResult);
  el.helpButton.addEventListener('click', () => el.helpDialog.showModal());
  el.statsButton.addEventListener('click', () => el.statsDialog.showModal());
  el.resetStatsButton.addEventListener('click', resetStats);
  el.copyButton.addEventListener('click', copyResult);
  el.playAgainButton.addEventListener('click', () => {
    el.dialog.close();
    startGame();
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => button.closest('dialog').close());
  });
  el.symbolMode.addEventListener('change', () => {
    document.body.classList.toggle('symbol-mode', el.symbolMode.checked);
    try { localStorage.setItem('guess-good-word-symbols', String(el.symbolMode.checked)); } catch { /* Optional preference. */ }
  });
  compactStats.addEventListener('change', syncStatsLocation);
}

async function init() {
  if (busy) return;
  setBusy(true);
  setStatus('Loading levels…');
  try {
    const data = await api('/api/levels');
    levels = data.levels;
    currentLevel = levels.find(level => level.id === data.default_level) || levels[0];
    renderLevels();
    renderStats();
    setBusy(false);
    await startGame();
  } catch {
    setStatus('Couldn’t load the game. Try New game again.', 'error');
    setBusy(false);
  }
}

bindEvents();
renderKeyboard();
syncStatsLocation();
try { el.symbolMode.checked = localStorage.getItem('guess-good-word-symbols') === 'true'; } catch { /* Default to color clues. */ }
document.body.classList.toggle('symbol-mode', el.symbolMode.checked);
init();
