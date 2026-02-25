const screens = {
  welcome: document.getElementById("screen-welcome"),
  fluency: document.getElementById("screen-fluency"),
  memory: document.getElementById("screen-memory"),
  summary: document.getElementById("screen-summary")
};

const nameInput = document.getElementById("student-name");
const idInput = document.getElementById("student-id");
const startButton = document.getElementById("btn-start");
const restartButton = document.getElementById("btn-restart");
const summaryText = document.getElementById("summary-text");

const fluencyProblemEl = document.getElementById("fluency-problem");
const fluencyAnswerInput = document.getElementById("fluency-answer");
const fluencySubmit = document.getElementById("btn-fluency-submit");
const fluencyFeedback = document.getElementById("fluency-feedback");
const attentionFeedback = document.getElementById("attention-feedback");
const fluencyStats = document.getElementById("fluency-stats");
const fluencyTimerEl = document.getElementById("timer-fluency");

const memoryTimerEl = document.getElementById("timer-memory");
const memoryLevelNumber = document.getElementById("memory-level-number");
const memoryQuestionEl = document.getElementById("memory-question");
const memoryOptionsEl = document.getElementById("memory-options");
const memoryFeedback = document.getElementById("memory-feedback");
const memoryRecallPhase = document.getElementById("memory-recall-phase");
const memoryQuestionPhase = document.getElementById("memory-question-phase");
const memoryRecallInstruction = document.getElementById("memory-recall-instruction");
const memoryRecallOptionsEl = document.getElementById("memory-recall-options");
const memoryRecallFeedback = document.getElementById("memory-recall-feedback");

let fluencyTimerId = null;
let memoryTimerId = null;

let fluencyState = {
  a: 0,
  b: 0,
  correct: 0,
  total: 0,
  wrongStreak: 0,
  correctAnswer: 0
};

let memoryState = {
  level: 3,
  questionsInBlock: 0,
  currentIndex: 0,
  currentCorrectAnswer: null,
  sequence: [],
  recallIndex: 0,
  phase: "question",
  consecutiveFailures: 0,
  blockQuestions: []
};

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove("is-visible"));
  screens[name].classList.add("is-visible");
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMultiplication() {
  const a = randomInt(1, 9);
  const b = randomInt(1, 9);
  return { a, b, product: a * b };
}

function startFluency() {
  showScreen("fluency");

  fluencyState = {
    a: 0,
    b: 0,
    correct: 0,
    total: 0,
    wrongStreak: 0,
    correctAnswer: 0
  };

  fluencyFeedback.textContent = "";
  attentionFeedback.textContent = "";
  fluencyStats.textContent = "";
  fluencyAnswerInput.value = "";
  fluencyAnswerInput.focus();

  let remaining = 20; // 20 seconds for part 1
  fluencyTimerEl.textContent = formatTime(remaining);
  if (fluencyTimerId) window.clearInterval(fluencyTimerId);
  fluencyTimerId = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      fluencyTimerEl.textContent = "00:00";
      window.clearInterval(fluencyTimerId);
      startMemoryTask();
    } else {
      fluencyTimerEl.textContent = formatTime(remaining);
    }
  }, 1000);

  nextFluencyProblem();
}

function nextFluencyProblem() {
  const { a, b, product } = generateMultiplication();
  fluencyState.a = a;
  fluencyState.b = b;
  fluencyState.correctAnswer = product;
  fluencyProblemEl.textContent = `${a} × ${b} = ?`;
  fluencyAnswerInput.value = "";
  fluencyAnswerInput.focus();
}

function handleFluencySubmit() {
  const raw = fluencyAnswerInput.value.trim();
  if (!raw) return;
  const answer = Number(raw);
  const correct = fluencyState.correctAnswer;

  fluencyState.total += 1;

  fluencyFeedback.style.fontSize = "2.2rem";
  fluencyFeedback.style.fontWeight = "700";

  if (answer === correct) {
    fluencyState.correct += 1;
    fluencyState.wrongStreak = 0;
    fluencyFeedback.textContent = "✓";
    fluencyFeedback.style.color = "#16a34a";
    fluencyStats.textContent = `Problems answered: ${fluencyState.total}, correct: ${fluencyState.correct}.`;
    nextFluencyProblem();
  } else {
    fluencyState.wrongStreak += 1;
    fluencyFeedback.textContent = "✗";
    fluencyFeedback.style.color = "#dc2626";
    fluencyStats.textContent = `Problems answered: ${fluencyState.total}, correct: ${fluencyState.correct}.`;
    fluencyAnswerInput.value = "";
    fluencyAnswerInput.focus();
  }

  if (fluencyState.wrongStreak >= 3) {
    attentionFeedback.textContent =
      "Pause, take three deep breaths, then look carefully at each problem. Take a short focus break.";
    fluencyState.wrongStreak = 0;
  } else {
    attentionFeedback.textContent = "";
  }

}

function uniqueProductsForLevel(level) {
  const products = new Set();
  const questions = [];
  while (products.size < level) {
    const { a, b, product } = generateMultiplication();
    if (!products.has(product)) {
      products.add(product);
      questions.push({ a, b, product });
    }
  }
  return questions;
}

function startMemoryTask() {
  showScreen("memory");
  if (memoryTimerId) window.clearInterval(memoryTimerId);

  let remaining = 5 * 60;
  memoryTimerEl.textContent = formatTime(remaining);
  memoryTimerId = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      memoryTimerEl.textContent = "00:00";
      window.clearInterval(memoryTimerId);
      finishTraining();
    } else {
      memoryTimerEl.textContent = formatTime(remaining);
    }
  }, 1000);

  memoryState = {
    level: 3,
    questionsInBlock: 0,
    currentIndex: 0,
    currentCorrectAnswer: null,
    sequence: [],
    recallIndex: 0,
    phase: "question",
    consecutiveFailures: 0,
    blockQuestions: []
  };
  startMemoryBlock();
}

function startMemoryBlock() {
  memoryState.questionsInBlock = memoryState.level;
  memoryState.currentIndex = 0;
  memoryState.sequence = [];
  memoryState.phase = "question";
  memoryFeedback.textContent = "";
  memoryRecallFeedback.textContent = "";
  memoryLevelNumber.textContent = String(memoryState.level);
  memoryQuestionPhase.style.display = "block";
  memoryRecallPhase.style.display = "none";

  memoryState.blockQuestions = uniqueProductsForLevel(memoryState.level);
  showCurrentMemoryQuestion();
}

function showCurrentMemoryQuestion() {
  const idx = memoryState.currentIndex;
  const question = memoryState.blockQuestions[idx];
  const { a, b, product } = question;
  memoryState.currentCorrectAnswer = product;

  memoryQuestionEl.textContent = `${a} × ${b} = ?`;
  memoryOptionsEl.innerHTML = "";

  let distractor;
  do {
    distractor = randomInt(1, 81);
  } while (distractor === product);

  const options = [product, distractor];
  options.sort(() => Math.random() - 0.5);

  options.forEach((value) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = String(value);
    btn.addEventListener("click", () => handleMemoryAnswer(value));
    memoryOptionsEl.appendChild(btn);
  });
}

function handleMemoryAnswer(chosen) {
  const correct = memoryState.currentCorrectAnswer;
  if (chosen === correct) {
    memoryFeedback.textContent = `✓ ${correct}`;
    memoryFeedback.style.color = "#16a34a";
    memoryState.sequence.push(correct);
    memoryState.currentIndex += 1;

    if (memoryState.currentIndex >= memoryState.questionsInBlock) {
      startRecallPhase();
    } else {
      showCurrentMemoryQuestion();
    }
  } else {
    memoryFeedback.textContent = `✗ ${chosen} → ${correct}`;
    memoryFeedback.style.color = "#dc2626";
  }

  memoryFeedback.style.fontSize = "1.6rem";
  memoryFeedback.style.fontWeight = "700";
}

function startRecallPhase() {
  memoryState.phase = "recall";
  memoryState.recallIndex = 0;
  memoryQuestionPhase.style.display = "none";
  memoryRecallPhase.style.display = "block";
  memoryRecallFeedback.textContent = "";

  memoryRecallInstruction.textContent = `Tap the answers in the same order as before (total ${memoryState.sequence.length}).`;

  memoryRecallOptionsEl.innerHTML = "";
  const answers = [...memoryState.sequence];
  answers.forEach((value) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = String(value);
    btn.addEventListener("click", () => handleRecallClick(value, btn));
    memoryRecallOptionsEl.appendChild(btn);
  });
}

function handleRecallClick(value, btn) {
  const expected = memoryState.sequence[memoryState.recallIndex];
  if (value === expected) {
    btn.classList.add("is-selected");
    memoryState.recallIndex += 1;
    if (memoryState.recallIndex >= memoryState.sequence.length) {
      memoryRecallFeedback.textContent = "✓";
      memoryRecallFeedback.style.color = "#16a34a";
      memoryRecallFeedback.style.fontSize = "2rem";
      memoryRecallFeedback.style.fontWeight = "700";
      memoryState.consecutiveFailures = 0;
      memoryState.level += 1;
      window.setTimeout(startMemoryBlock, 800);
    }
  } else {
    memoryRecallFeedback.textContent = "✗ 再试一次";
    memoryRecallFeedback.style.color = "#dc2626";
    memoryRecallFeedback.style.fontSize = "2rem";
    memoryRecallFeedback.style.fontWeight = "700";
  }
}

function finishTraining() {
  showScreen("summary");
  const name = nameInput.value.trim() || "Friend";
  summaryText.textContent = `${name}, you finished today’s practice: 20 seconds of multiplication fluency and 5 minutes of working-memory training. Well done!`;
}

// During tests, hide extra text so kids only see time + problems (plus feedback).
function simplifyTestUI() {
  const fluencySubtitle = document.querySelector("#screen-fluency .subtitle");
  if (fluencySubtitle) fluencySubtitle.style.display = "none";

  const memorySubtitle = document.querySelector("#screen-memory .subtitle");
  if (memorySubtitle) memorySubtitle.style.display = "none";

  if (fluencyStats) {
    fluencyStats.style.display = "none";
  }

  // hide instructional notes inside the memory cards
  const questionNote = document.querySelector("#memory-question-phase .note");
  if (questionNote) questionNote.style.display = "none";

  const recallNote = document.querySelector("#memory-recall-phase .note");
  if (recallNote) recallNote.style.display = "none";
}

startButton.addEventListener("click", () => {
  const name = nameInput.value.trim();
  const id = idInput.value.trim();
  if (!name || !id) {
    alert("Please enter both name and ID before starting.");
    return;
  }
  startFluency();
});

fluencySubmit.addEventListener("click", handleFluencySubmit);

fluencyAnswerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleFluencySubmit();
  }
});

restartButton.addEventListener("click", () => {
  if (fluencyTimerId) window.clearInterval(fluencyTimerId);
  if (memoryTimerId) window.clearInterval(memoryTimerId);
  nameInput.value = "";
  idInput.value = "";
  showScreen("welcome");
});

// Run once when the script loads
simplifyTestUI();
