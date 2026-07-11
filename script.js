const rows = 6;
const cols = 7;

const board = document.getElementById("board");
const hoverRow = document.getElementById("hoverRow");
const statusText = document.getElementById("statusText");
const turnDot = document.getElementById("turnDot");
const message = document.getElementById("message");
const resetBtn = document.getElementById("resetBtn");
const redScoreEl = document.getElementById("redScore");
const yellowScoreEl = document.getElementById("yellowScore");
const tieScoreEl = document.getElementById("tieScore");
const difficultyEl = document.getElementById("difficulty");
const modeEl = document.getElementById("mode");
const soundToggle = document.getElementById("soundToggle");

let currentPlayer = "red";
let gameOver = false;
let boardState = [];
let scores = { red: 0, yellow: 0, ties: 0 };
let soundOn = true;
let audioCtx = null;

function createAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function tone(freq, duration = 0.12, type = "sine", gainVal = 0.08) {
  if (!soundOn) return;
  createAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainVal;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playDropSound() { tone(220, 0.08, "triangle", 0.06); }
function playWinSound() {
  tone(523, 0.12, "sine", 0.08);
  setTimeout(() => tone(659, 0.12, "sine", 0.08), 100);
  setTimeout(() => tone(784, 0.16, "sine", 0.08), 200);
}
function playTieSound() { tone(180, 0.18, "square", 0.05); }

function createEmptyBoard() {
  boardState = Array.from({ length: rows }, () => Array(cols).fill(null));
}

function createBoardUI() {
  board.innerHTML = "";
  hoverRow.innerHTML = "";

  for (let c = 0; c < cols; c++) {
    const slot = document.createElement("div");
    slot.className = `hover-slot ${currentPlayer}`;
    slot.dataset.col = c;
    hoverRow.appendChild(slot);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      board.appendChild(cell);
    }
  }
}

function getLowestAvailableRow(col, state = boardState) {
  for (let r = rows - 1; r >= 0; r--) {
    if (!state[r][col]) return r;
  }
  return -1;
}

function checkWin(player, state = boardState) {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols - 3; c++)
    if (state[r][c] === player && state[r][c+1] === player && state[r][c+2] === player && state[r][c+3] === player) return true;

  for (let c = 0; c < cols; c++) for (let r = 0; r < rows - 3; r++)
    if (state[r][c] === player && state[r+1][c] === player && state[r+2][c] === player && state[r+3][c] === player) return true;

  for (let r = 0; r < rows - 3; r++) for (let c = 0; c < cols - 3; c++)
    if (state[r][c] === player && state[r+1][c+1] === player && state[r+2][c+2] === player && state[r+3][c+3] === player) return true;

  for (let r = 3; r < rows; r++) for (let c = 0; c < cols - 3; c++)
    if (state[r][c] === player && state[r-1][c+1] === player && state[r-2][c+2] === player && state[r-3][c+3] === player) return true;

  return false;
}

function isBoardFull(state = boardState) {
  return state.every(row => row.every(cell => cell));
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function syncScores() {
  redScoreEl.textContent = scores.red;
  yellowScoreEl.textContent = scores.yellow;
  tieScoreEl.textContent = scores.ties;
}

function updateTurnUI() {
  const aiMode = modeEl.value === "ai";
  if (aiMode) {
    statusText.textContent = currentPlayer === "red" ? "Your turn" : "AI is thinking...";
  } else {
    statusText.textContent = `${capitalize(currentPlayer)}’s turn`;
  }
  turnDot.className = `dot ${currentPlayer}`;
  hoverRow.querySelectorAll(".hover-slot").forEach(el => el.className = `hover-slot ${currentPlayer}`);
}

function placeDisc(col, player) {
  const row = getLowestAvailableRow(col);
  if (row === -1) return false;
  boardState[row][col] = player;
  const cell = board.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  cell.classList.add(player);
  playDropSound();
  return true;
}

function endGame(text) {
  gameOver = true;
  message.textContent = text;
}

function afterMove(player) {
  if (checkWin(player)) {
    scores[player]++;
    syncScores();
    playWinSound();
    endGame(player === "red" ? "You win! Brilliant strategy." : "AI wins! Try a new approach.");
    return true;
  }
  if (isBoardFull()) {
    scores.ties++;
    syncScores();
    playTieSound();
    endGame("Tie game! The board is full.");
    return true;
  }
  return false;
}

function scoreWindow(window, player) {
  const opp = player === "red" ? "yellow" : "red";
  const playerCount = window.filter(v => v === player).length;
  const oppCount = window.filter(v => v === opp).length;
  const emptyCount = window.filter(v => v === null).length;
  let score = 0;
  if (playerCount === 4) score += 100000;
  else if (playerCount === 3 && emptyCount === 1) score += 80;
  else if (playerCount === 2 && emptyCount === 2) score += 15;
  if (oppCount === 3 && emptyCount === 1) score -= 90;
  if (oppCount === 4) score -= 100000;
  return score;
}

function evaluateBoard(state, player = "yellow") {
  let score = 0;
  const center = Math.floor(cols / 2);
  for (let r = 0; r < rows; r++) if (state[r][center] === player) score += 12;

  for (let r = 0; r < rows; r++) for (let c = 0; c < cols - 3; c++)
    score += scoreWindow([state[r][c], state[r][c+1], state[r][c+2], state[r][c+3]], player);

  for (let c = 0; c < cols; c++) for (let r = 0; r < rows - 3; r++)
    score += scoreWindow([state[r][c], state[r+1][c], state[r+2][c], state[r+3][c]], player);

  for (let r = 0; r < rows - 3; r++) for (let c = 0; c < cols - 3; c++)
    score += scoreWindow([state[r][c], state[r+1][c+1], state[r+2][c+2], state[r+3][c+3]], player);

  for (let r = 3; r < rows; r++) for (let c = 0; c < cols - 3; c++)
    score += scoreWindow([state[r][c], state[r-1][c+1], state[r-2][c+2], state[r-3][c+3]], player);

  return score;
}

function getValidColumns(state = boardState) {
  return [...Array(cols).keys()].filter(c => getLowestAvailableRow(c, state) !== -1);
}

function cloneBoard(state) {
  return state.map(row => [...row]);
}

function minimax(state, depth, alpha, beta, maximizingPlayer) {
  const validCols = getValidColumns(state);
  const terminal = checkWin("red", state) || checkWin("yellow", state) || validCols.length === 0;

  if (depth === 0 || terminal) {
    if (terminal) {
      if (checkWin("yellow", state)) return { score: 1000000 };
      if (checkWin("red", state)) return { score: -1000000 };
      return { score: 0 };
    }
    return { score: evaluateBoard(state, "yellow") };
  }

  if (maximizingPlayer) {
    let value = -Infinity;
    let bestCol = validCols[0];
    for (const col of validCols) {
      const row = getLowestAvailableRow(col, state);
      const temp = cloneBoard(state);
      temp[row][col] = "yellow";
      const score = minimax(temp, depth - 1, alpha, beta, false).score;
      if (score > value) { value = score; bestCol = col; }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return { col: bestCol, score: value };
  } else {
    let value = Infinity;
    let bestCol = validCols[0];
    for (const col of validCols) {
      const row = getLowestAvailableRow(col, state);
      const temp = cloneBoard(state);
      temp[row][col] = "red";
      const score = minimax(temp, depth - 1, alpha, beta, true).score;
      if (score < value) { value = score; bestCol = col; }
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return { col: bestCol, score: value };
  }
}

function aiMove() {
  if (gameOver || modeEl.value !== "ai") return;
  const depth = Number(difficultyEl.value);
  const best = minimax(boardState, depth, -Infinity, Infinity, true);
  if (typeof best.col !== "number") return;
  placeDisc(best.col, "yellow");
  if (afterMove("yellow")) return;
  currentPlayer = "red";
  updateTurnUI();
  message.textContent = "Your turn.";
}

function humanMove(col) {
  if (gameOver) return;
  if (modeEl.value === "ai" && currentPlayer !== "red") return;

  const player = currentPlayer;
  const moved = placeDisc(col, player);
  if (!moved) {
    message.textContent = "That column is full. Try another one!";
    return;
  }

  if (afterMove(player)) return;

  if (modeEl.value === "ai") {
    currentPlayer = "yellow";
    updateTurnUI();
    message.textContent = "AI is thinking...";
    setTimeout(aiMove, 350);
  } else {
    currentPlayer = currentPlayer === "red" ? "yellow" : "red";
    updateTurnUI();
    message.textContent = `${capitalize(currentPlayer)} to move.`;
  }
}

board.addEventListener("click", e => {
  const cell = e.target.closest(".cell");
  if (!cell) return;
  humanMove(Number(cell.dataset.col));
});

hoverRow.addEventListener("click", e => {
  const slot = e.target.closest(".hover-slot");
  if (!slot) return;
  humanMove(Number(slot.dataset.col));
});

resetBtn.addEventListener("click", () => {
  currentPlayer = "red";
  gameOver = false;
  createEmptyBoard();
  createBoardUI();
  updateTurnUI();
  message.textContent = modeEl.value === "ai"
    ? "You are Red. Try to beat the AI."
    : "New two-player match started.";
});

modeEl.addEventListener("change", () => {
  resetBtn.click();
});

difficultyEl.addEventListener("change", () => {
  if (modeEl.value === "ai") message.textContent = `Difficulty set to ${difficultyEl.options[difficultyEl.selectedIndex].text}.`;
});

soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  soundToggle.textContent = `Sound: ${soundOn ? "On" : "Off"}`;
});

createEmptyBoard();
createBoardUI();
updateTurnUI();
syncScores();
message.textContent = "Click a column to start the match.";