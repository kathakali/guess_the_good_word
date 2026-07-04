const stateRank = { absent: 1, present: 2, correct: 3 };

const el = {
  levelList: document.querySelector('#level-list'),
  levelCaption: document.querySelector('#level-caption'),
  board: document.querySelector('#game-board'),
  keyboard: document.querySelector('#keyboard'),
  status: document.querySelector('#status-message'),
  hintButton: document.querySelector('#hint-button'),
  hintPanel: document.querySelector('#hint-panel'),
  hintText: document.querySelector('#hint-text'),
  newGameButton: document.querySelector('#new-game-button'),
  shareButton: document.querySelector('#share-button'),
  guessTrail: document.querySelector('#guess-trail'),
  dialog: document.querySelector('#result-dialog'),
  resultTitle: document.querySelector('#result-title'),
  resultBody: document.querySelector('#result-body'),
  shareOutput: document.querySelector('#share-output'),
  copyButton: document.querySelector('#copy-result-button'),
};

let levels = [];
let currentLevel = null;
let currentGameId = null;
let hint = '';
let hintAvailable = false;
let hintUsed = false;
let boardState = [];
let submitted = [];
let keyStates = {};
let currentRow = 0;
let currentCol = 0;
let acceptingInput = false;
let lastShareText = '';
let finalAnswer = '';
let finalWon = false;

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function emptyBoard(rows, cols) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
}

function setStatus(text, isError = false) {
  el.status.textContent = text;
  el.status.classList.toggle('is-error', isError);
}

function renderLevels() {
  el.levelList.innerHTML = '';
  for (const level of levels) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `level-card ${currentLevel?.id === level.id ? 'active' : ''}`;
    button.innerHTML = `
      <span class="level-icon" aria-hidden="true">${level.icon}</span>
      <span class="level-meta">
        <strong>${level.label}</strong>
        <span>${level.subtitle} · ${level.max_guesses} tries · ${level.word_count.toLocaleString()} words</span>
      </span>`;
    button.addEventListener('click', () => switchLevel(level.id));
    el.levelList.appendChild(button);
  }
}

function renderBoard() {
  if (!currentLevel) return;
  el.board.innerHTML = '';
  el.board.dataset.length = String(currentLevel.word_length);
  el.board.dataset.tries = String(currentLevel.max_guesses);
  el.board.classList.toggle('split-board', currentLevel.word_length === 3);

  for (let r = 0; r < currentLevel.max_guesses; r += 1) {
    const row = document.createElement('div');
    row.className = 'board-row';
    row.setAttribute('role', 'row');
    row.style.gridTemplateColumns = `repeat(${currentLevel.word_length}, var(--tile-size))`;

    for (let c = 0; c < currentLevel.word_length; c += 1) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('aria-label', `Attempt ${r + 1}, letter ${c + 1}`);
      tile.textContent = boardState[r]?.[c] || '';
      if (tile.textContent) tile.classList.add('filled');
      if (submitted[r]) {
        const score = submitted[r].score[c];
        tile.classList.add(score);
        tile.setAttribute('aria-label', `Attempt ${r + 1}, letter ${c + 1}, ${score}`);
      }
      row.appendChild(tile);
    }
    el.board.appendChild(row);
  }
}

function createKey(label, wide = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `key ${wide ? 'wide' : ''}`.trim();
  button.textContent = label;
  button.setAttribute('aria-label', label === '⌫' ? 'Backspace' : label);
  if (keyStates[label]) button.classList.add(keyStates[label]);
  button.addEventListener('click', () => handleInput(label));
  return button;
}

function renderKeyboard() {
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  el.keyboard.innerHTML = '';
  rows.forEach((letters, index) => {
    const row = document.createElement('div');
    row.className = `keyboard-row row-${index + 1}`;
    if (index === 2) row.appendChild(createKey('ENTER', true));
    for (const letter of letters) row.appendChild(createKey(letter));
    if (index === 2) row.appendChild(createKey('⌫', true));
    el.keyboard.appendChild(row);
  });
}

function renderGuessTrail() {
  el.guessTrail.innerHTML = '';
  if (!submitted.length) {
    const li = document.createElement('li');
    li.textContent = 'No guesses yet.';
    el.guessTrail.appendChild(li);
    return;
  }
  for (const item of submitted) {
    const li = document.createElement('li');
    const marks = item.score
      .map(score => (score === 'correct' ? 'correct' : score === 'present' ? 'present' : 'absent'))
      .join(', ');
    li.textContent = `${item.guess.toUpperCase()} — ${marks}`;
    el.guessTrail.appendChild(li);
  }
}

function updateKeyStates(guess, score) {
  [...guess.toUpperCase()].forEach((letter, index) => {
    const next = score[index];
    const old = keyStates[letter];
    if (!old || stateRank[next] > stateRank[old]) keyStates[letter] = next;
  });
}

function updateHintButton() {
  el.hintButton.hidden = !hintAvailable;
  el.hintButton.disabled = !hintAvailable;
}

async function startGame() {
  if (!currentLevel) return;
  acceptingInput = false;
  setStatus('Starting new game...');
  el.hintPanel.hidden = true;
  hintUsed = false;
  lastShareText = '';
  finalAnswer = '';
  finalWon = false;
  el.shareButton.disabled = true;

  const data = await api('/api/game', {
    method: 'POST',
    body: JSON.stringify({ level_id: currentLevel.id }),
  });

  currentGameId = data.game_id;
  currentLevel = data.level;
  hint = data.hint || '';
  hintAvailable = Boolean(data.hint_available && hint);
  boardState = emptyBoard(currentLevel.max_guesses, currentLevel.word_length);
  submitted = [];
  keyStates = {};
  currentRow = 0;
  currentCol = 0;
  acceptingInput = true;
  el.levelCaption.textContent = `${currentLevel.label} · ${currentLevel.max_guesses} tries · ${currentLevel.word_count.toLocaleString()} words`;
  updateHintButton();
  renderLevels();
  renderBoard();
  renderKeyboard();
  renderGuessTrail();
  setStatus(`Type a ${currentLevel.word_length}-letter word to begin.`);
}

async function switchLevel(levelId) {
  const next = levels.find(level => level.id === levelId);
  if (!next) return;
  currentLevel = next;
  renderLevels();
  await startGame();
}

function addLetter(letter) {
  if (!acceptingInput || currentCol >= currentLevel.word_length) return;
  boardState[currentRow][currentCol] = letter;
  currentCol += 1;
  renderBoard();
}

function removeLetter() {
  if (!acceptingInput || currentCol <= 0) return;
  currentCol -= 1;
  boardState[currentRow][currentCol] = '';
  renderBoard();
}

async function submitGuess() {
  if (!acceptingInput) return;
  if (currentCol < currentLevel.word_length) {
    setStatus(`Enter all ${currentLevel.word_length} letters first.`, true);
    return;
  }

  try {
    const guess = boardState[currentRow].join('').toLowerCase();
    const data = await api('/api/guess', {
      method: 'POST',
      body: JSON.stringify({ game_id: currentGameId, guess }),
    });

    if (!data.accepted) {
      setStatus(data.message, true);
      return;
    }

    submitted.push({ guess: data.guess, score: data.score });
    updateKeyStates(data.guess, data.score);
    renderBoard();
    renderKeyboard();
    renderGuessTrail();
    setStatus(data.message);

    if (data.over) {
      acceptingInput = false;
      lastShareText = buildShareText(data.solved);
      finalAnswer = data.answer;
      finalWon = data.solved;
      el.shareButton.disabled = false;
      setTimeout(() => showResult(data.solved, data.answer), 450);
      return;
    }

    currentRow += 1;
    currentCol = 0;
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Could not submit the guess.', true);
  }
}

function buildShareText(won) {
  const heading = `Guess the Good Word ${currentLevel.label} ${won ? submitted.length : 'X'}/${currentLevel.max_guesses}${hintUsed ? ' · hint used' : ''}`;
  const rows = submitted.map(item => item.score
    .map(score => (score === 'correct' ? '🟦' : score === 'present' ? '🔷' : '🩷'))
    .join(''));
  return [heading, ...rows].join('\n');
}

function showResult(won, answer) {
  el.resultTitle.textContent = won ? 'You found it!' : 'Game complete';
  el.resultBody.textContent = won
    ? `Great job. The word was ${answer.toUpperCase()}.`
    : `The word was ${answer.toUpperCase()}.`;
  el.shareOutput.value = lastShareText;
  if (!el.dialog.open) el.dialog.showModal();
}

function handleInput(input) {
  if (input === 'ENTER') {
    submitGuess();
    return;
  }
  if (input === 'BACKSPACE' || input === '⌫') {
    removeLetter();
    return;
  }
  if (/^[A-Z]$/.test(input)) addLetter(input);
}

function showHint() {
  if (!currentGameId || !hintAvailable) return;
  hintUsed = true;
  el.hintText.textContent = hint;
  el.hintPanel.hidden = false;
}

async function copyResult() {
  try {
    await navigator.clipboard.writeText(el.shareOutput.value);
    el.copyButton.textContent = 'Copied!';
  } catch {
    el.shareOutput.select();
    document.execCommand('copy');
    el.copyButton.textContent = 'Copied!';
  }
  setTimeout(() => { el.copyButton.textContent = 'Copy result'; }, 1200);
}

function bindEvents() {
  document.addEventListener('keydown', event => {
    const key = event.key.toUpperCase();
    if (key === 'ENTER') handleInput('ENTER');
    else if (key === 'BACKSPACE') handleInput('BACKSPACE');
    else if (/^[A-Z]$/.test(key)) handleInput(key);
  });
  el.newGameButton.addEventListener('click', startGame);
  el.hintButton.addEventListener('click', showHint);
  el.shareButton.addEventListener('click', () => {
    if (lastShareText) showResult(finalWon, finalAnswer);
  });
  el.copyButton.addEventListener('click', copyResult);
}

async function init() {
  bindEvents();
  renderKeyboard();
  setStatus('Loading levels...');
  try {
    const data = await api('/api/levels');
    levels = data.levels;
    currentLevel = levels.find(level => level.id === data.default_level) || levels[0];
    renderLevels();
    await startGame();
  } catch (error) {
    console.error(error);
    setStatus('Could not load the game. Check that Flask is running.', true);
  }
}

init();
