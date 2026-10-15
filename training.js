/* Daily training.
 *
 * One session runs both tasks back to back — multiplication, then fraction
 * comparison — from a single entry of the student's ID and lesson. Every
 * student does the working-memory version: solve, hold, recall in order.
 * Each task opens with a 2-minute practice in lessons 1-3 (feedback on every
 * answer and on the recall order), then runs a full 5-minute training block
 * with no right/wrong marking; after each set the correct answers are shown.
 *
 * Span rules, counted at the current span (not in a row; both counts start
 * again whenever the span changes), with a floor of span 2:
 *
 *   multiplication       4 correct recalls → up one, 3 incorrect → down one
 *   fraction comparison  3 correct recalls → up one, 2 incorrect → down one
 *
 * As before, a recall is scored against the answers the student gave, so a
 * wrong calculation recalled faithfully is a correct sequence. The highest
 * span is the highest span the student moved up out of.
 *
 * At the end a progress screen charts each task's highest span and accuracy
 * over the student's sessions and compares today with the previous session.
 */

const PRACTICE_SECONDS = 120;
const TRIAL_SECONDS = 300;
const REVIEW_MS = 3600;
const HOLD_MS = 750;
const PRACTICE_LESSON_MAX = 3;
const SPAN_START = 2;
const HISTORY_KEY = "training.history";
const CHART_DAYS = 15;

/* ---------- elements ---------- */

const shell = document.getElementById("shell");
const screens = {
  setup: document.getElementById("screen-setup"),
  bridge: document.getElementById("screen-bridge"),
  task: document.getElementById("screen-task"),
  progress: document.getElementById("screen-progress"),
};

const inputId = document.getElementById("student-id");
const inputLesson = document.getElementById("lesson");
const setupError = document.getElementById("setup-error");
const setupHint = document.getElementById("setup-hint");
const btnStart = document.getElementById("btn-start");
const pendingNote = document.getElementById("pending-note");

const bridgeTitle = document.getElementById("bridge-title");
const bridgeText = document.getElementById("bridge-text");
const btnBridge = document.getElementById("btn-bridge");

const taskLabel = document.getElementById("task-label");
const taskSubtitle = document.getElementById("task-subtitle");
const spanReadout = document.getElementById("span-readout");
const timerValue = document.getElementById("timer-value");

const phaseSolve = document.getElementById("phase-solve");
const solveProgress = document.getElementById("solve-progress");
const solvePrompt = document.getElementById("solve-prompt");
const solveChoices = document.getElementById("solve-choices");
const solveFeedback = document.getElementById("solve-feedback");
const solveGuidance = document.getElementById("solve-guidance");
const btnSolveNext = document.getElementById("btn-solve-next");

const phaseRecall = document.getElementById("phase-recall");
const recallInstruction = document.getElementById("recall-instruction");
const recallSlots = document.getElementById("recall-slots");
const recallOptions = document.getElementById("recall-options");
const btnRecallUndo = document.getElementById("btn-recall-undo");
const recallGuidance = document.getElementById("recall-guidance");
const btnRecallNext = document.getElementById("btn-recall-next");

const phaseReview = document.getElementById("phase-review");
const reviewGrid = document.getElementById("review-grid");

const cheer = document.getElementById("cheer");
const confetti = document.getElementById("confetti");
const cheerEmoji = document.getElementById("cheer-emoji");
const cheerTitle = document.getElementById("cheer-title");
const cheerText = document.getElementById("cheer-text");
const progressCards = document.getElementById("progress-cards");
const summaryMeta = document.getElementById("summary-meta");
const btnRestart = document.getElementById("btn-restart");
const btnCsv = document.getElementById("btn-csv");

const uploaders = {
  multiplication: createUploader(
    "training.pending",
    document.getElementById("upload-status-mult"),
    pendingNote
  ),
  fraction: createUploader(
    "training.pending",
    document.getElementById("upload-status-frac"),
    pendingNote
  ),
};

/* ---------- the two tasks ---------- */

function comparisonHtml(pair) {
  const l = fracValue(pair.left);
  const r = fracValue(pair.right);
  const symbol = l > r ? ">" : l < r ? "<" : "=";
  return (
    fracHtml(pair.left) +
    ' <span class="review-symbol">' +
    symbol +
    "</span> " +
    fracHtml(pair.right)
  );
}

function rowsWithSetNumbers(trials, build) {
  const rows = [];
  const setNumber = { practice: 0, trial: 0 };
  trials.forEach(function (trial) {
    setNumber[trial.phase] += 1;
    const sequence =
      trial.sequenceCorrect === null || trial.sequenceCorrect === undefined
        ? ""
        : trial.sequenceCorrect
        ? 1
        : 0;
    trial.entries.forEach(function (entry, i) {
      rows.push(build(trial, setNumber[trial.phase], sequence, entry, i));
    });
  });
  return rows;
}

/* Everything that differs between the two tasks lives in these two objects;
 * the engine below is shared. Their CSV layouts are the ones the
 * "multiplication" and "fraction" sheets already use. */
const TASKS = [
  {
    key: "multiplication",
    name: "Multiplication",
    part: "Part 1",
    tone: "tone-mult",
    upAfter: 4,
    downAfter: 3,
    itemNoun: "Problem",
    stream: TRAINING_ITEMS.multiplication.stream,
    intro:
      "Solve each multiplication problem and tap the answer. Keep each answer in your head. After the last problem, tap your answers back in the same order.",
    correctAnswer: function (item) {
      return item.product;
    },
    keyOf: function (value) {
      return String(value);
    },
    html: function (value) {
      return String(value);
    },
    render: function (item, onAnswer) {
      solvePrompt.textContent = item.a + " × " + item.b + " = ?";
      solveChoices.innerHTML = "";
      item.options.forEach(function (value) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "choice is-number";
        button.textContent = String(value);
        button.dataset.key = String(value);
        button.onclick = function () {
          onAnswer(value);
        };
        solveChoices.appendChild(button);
      });
    },
    solvedHtml: function (item) {
      return item.a + " × " + item.b + ' = <span class="eq-answer">' + item.product + "</span>";
    },
    reviewClass: "review-equation",
    pool: function (targets) {
      return numberRecallPool(targets);
    },
    entry: function (response) {
      return {
        a: response.item.a,
        b: response.item.b,
        product: response.item.product,
        response: response.response,
        correct: response.correct,
      };
    },
    /* kept as a column so the rows line up with the sheet's existing header */
    condition: "multiplication+wm",
    csvHeader: [
      "student_id",
      "lesson",
      "factor_max",
      "condition",
      "session_start",
      "phase",
      "set",
      "span",
      "set_complete",
      "item",
      "a",
      "b",
      "correct_answer",
      "response",
      "answer_correct",
      "sequence_correct",
      "trial_problems",
      "trial_problems_correct",
      "trial_accuracy",
      "highest_span",
    ],
    rows: function (r) {
      return rowsWithSetNumbers(r.trials, function (trial, set, sequence, e, i) {
        return [
          r.id,
          r.lesson,
          TRAINING_ITEMS.multiplication.factorMax(r.lesson),
          r.condition,
          r.startedAt,
          trial.phase,
          set,
          trial.span,
          trial.complete ? 1 : 0,
          i + 1,
          e.a,
          e.b,
          e.product,
          e.response,
          e.correct ? 1 : 0,
          sequence,
          r.total,
          r.correct,
          r.accuracy.toFixed(4),
          r.highestSpan === null ? "" : r.highestSpan,
        ];
      });
    },
  },
  {
    key: "fraction",
    name: "Fraction Comparison",
    part: "Part 2",
    tone: "",
    upAfter: 3,
    downAfter: 2,
    itemNoun: "Pair",
    stream: TRAINING_ITEMS.fraction.stream,
    intro:
      "Tap the larger fraction in each pair. Keep each fraction you chose in your head. After the last pair, tap them back in the same order.",
    correctAnswer: function (pair) {
      return pair[pair.largerSide];
    },
    keyOf: fracKey,
    html: fracHtml,
    render: function (pair, onAnswer) {
      solvePrompt.textContent = "Which is larger?";
      solveChoices.innerHTML = "";
      [pair.left, pair.right].forEach(function (f, i) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "choice";
        button.innerHTML = fracHtml(f);
        button.dataset.key = fracKey(f);
        button.onclick = function () {
          onAnswer(f);
        };
        solveChoices.appendChild(button);
        if (i === 0) {
          const or = document.createElement("span");
          or.className = "choice-vs";
          or.textContent = "or";
          solveChoices.appendChild(or);
        }
      });
    },
    solvedHtml: comparisonHtml,
    reviewClass: "review-pair",
    pool: function (targets, items) {
      return fractionRecallPool(targets, items);
    },
    entry: function (response) {
      const pair = response.item;
      return {
        type: pair.type,
        left: fracKey(pair.left),
        right: fracKey(pair.right),
        correctAnswer: fracKey(pair[pair.largerSide]),
        response: fracKey(response.response),
        correct: response.correct,
      };
    },
    /* kept as a column so the rows line up with the sheet's existing header */
    condition: "fraction+wm",
    csvHeader: [
      "student_id",
      "lesson",
      "condition",
      "session_start",
      "phase",
      "set",
      "span",
      "set_complete",
      "item",
      "pair_type",
      "left",
      "right",
      "correct_answer",
      "response",
      "comparison_correct",
      "sequence_correct",
      "trial_comparisons",
      "trial_comparisons_correct",
      "trial_accuracy",
      "highest_span",
    ],
    rows: function (r) {
      return rowsWithSetNumbers(r.trials, function (trial, set, sequence, e, i) {
        return [
          r.id,
          r.lesson,
          r.condition,
          r.startedAt,
          trial.phase,
          set,
          trial.span,
          trial.complete ? 1 : 0,
          i + 1,
          e.type,
          e.left,
          e.right,
          e.correctAnswer,
          e.response,
          e.correct ? 1 : 0,
          sequence,
          r.total,
          r.correct,
          r.accuracy.toFixed(4),
          r.highestSpan === null ? "" : r.highestSpan,
        ];
      });
    },
  },
];

/* ---------- state ---------- */

const session = {
  id: "",
  lesson: 1,
  startedAt: null,
  taskIndex: 0,
  phase: "idle", // "practice" | "trial"
  token: 0, // bumped at every phase change; stale timeouts check it
  deadline: 0,
  ticker: null,
  results: {},
};

function task() {
  return TASKS[session.taskIndex];
}

function state() {
  return session.results[task().key];
}

function freshState() {
  return {
    stream: null,
    span: SPAN_START,
    levelCorrect: 0,
    levelWrong: 0,
    highestPassed: 0,
    counts: { practice: { total: 0, correct: 0 }, trial: { total: 0, correct: 0 } },
    trials: [],
    set: null,
    recall: null,
    summary: null,
  };
}

/* ---------- screens and timing ---------- */

function showScreen(name) {
  Object.keys(screens).forEach(function (key) {
    screens[key].classList.toggle("is-visible", key === name);
  });
  shell.classList.toggle("is-wide", name === "progress");
}

function showPhase(name) {
  phaseSolve.classList.toggle("is-visible", name === "solve");
  phaseRecall.classList.toggle("is-visible", name === "recall");
  phaseReview.classList.toggle("is-visible", name === "review");
}

function showBridge(title, text, buttonLabel, action) {
  bridgeTitle.textContent = title;
  bridgeText.textContent = text;
  btnBridge.textContent = buttonLabel;
  btnBridge.onclick = action;
  showScreen("bridge");
}

function setTone(tone) {
  shell.classList.toggle("tone-mult", tone === "tone-mult");
}

function formatClock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

function timeLeft() {
  return (session.deadline - Date.now()) / 1000;
}

function stopClock() {
  if (session.ticker) clearInterval(session.ticker);
  session.ticker = null;
}

function startClock(seconds, onExpire) {
  stopClock();
  session.deadline = Date.now() + seconds * 1000;
  timerValue.textContent = formatClock(seconds);
  const token = session.token;
  session.ticker = setInterval(function () {
    const remaining = timeLeft();
    timerValue.textContent = formatClock(remaining);
    if (remaining <= 0 && token === session.token) {
      stopClock();
      onExpire();
    }
  }, 250);
}

/* Every delayed step belongs to the phase that scheduled it. When the clock
 * ends a phase, anything still pending from it is dropped. */
function later(fn, ms) {
  const token = session.token;
  setTimeout(function () {
    if (token === session.token) fn();
  }, ms);
}

function beginPhase(phase) {
  session.phase = phase;
  session.token += 1;
}

function endPhase() {
  session.token += 1;
  stopClock();
}

/* ---------- flow ---------- */

function updateSetupHint() {
  const lesson = Number(inputLesson.value);
  if (!(lesson >= 1 && lesson <= 15)) {
    setupHint.textContent = "Lesson must be between 1 and 15.";
    return;
  }
  setupHint.textContent =
    "Lesson " +
    lesson +
    ": multiplication facts from 1 to " +
    TRAINING_ITEMS.multiplication.factorMax(lesson) +
    (lesson <= 4
      ? "; fraction pairs with the same denominator or the same numerator. "
      : "; fraction pairs also compare with ½. ") +
    (lesson <= PRACTICE_LESSON_MAX
      ? "Each part starts with a 2-minute practice, then 5 minutes of training (about 14 minutes in all)."
      : "Each part is 5 minutes of training (about 10 minutes in all).");
}

function beginSession() {
  const id = inputId.value.trim();
  const lesson = Number(inputLesson.value);
  if (!id) {
    setupError.textContent = "Please enter a student ID.";
    return;
  }
  if (!(lesson >= 1 && lesson <= 15)) {
    setupError.textContent = "Lesson must be between 1 and 15.";
    return;
  }
  setupError.textContent = "";

  session.id = id;
  session.lesson = lesson;
  session.startedAt = new Date();
  session.results = {};
  startTask(0);
}

function startTask(index) {
  session.taskIndex = index;
  const t = task();
  setTone(t.tone);
  session.results[t.key] = freshState();

  if (session.lesson <= PRACTICE_LESSON_MAX) {
    showBridge(
      t.part + " · " + t.name,
      t.intro + " First, a 2-minute practice that tells you whether you are right.",
      "Start practice",
      startPractice
    );
  } else {
    showBridge(t.part + " · " + t.name, t.intro + " You have 5 minutes.", "Start", startTrial);
  }
}

function startPractice() {
  const st = state();
  beginPhase("practice");
  /* Practice draws different items of the same lesson, so it cannot shift
   * where the training block starts. It stays at span 2. */
  st.stream = task().stream(session.lesson, 500000);
  st.span = SPAN_START;
  taskLabel.textContent = task().part + " · Practice";
  taskSubtitle.textContent = "Practice. You are told whether each answer is right.";
  showScreen("task");
  startClock(PRACTICE_SECONDS, endPractice);
  nextSet();
}

function endPractice() {
  endPhase();
  recordSet(null, false);
  showBridge(
    "Practice finished",
    "Now 5 minutes of training. Answers are no longer marked right or wrong — the correct answers are shown after you recall each set.",
    "Start",
    startTrial
  );
}

function startTrial() {
  const st = state();
  beginPhase("trial");
  /* The stream restarts so the training block opens on the same item, in the
   * same order, for every student in this lesson. */
  st.stream = task().stream(session.lesson);
  st.span = SPAN_START;
  st.levelCorrect = 0;
  st.levelWrong = 0;
  st.highestPassed = 0;
  taskLabel.textContent = task().part + " · " + task().name;
  taskSubtitle.textContent = "Solve, remember your answer, then recall the set in order.";
  showScreen("task");
  startClock(TRIAL_SECONDS, endTrial);
  nextSet();
}

function endTrial() {
  endPhase();
  recordSet(null, false);
  const t = task();
  const st = state();
  st.summary = summarise(t);
  saveHistory(st.summary);
  upload(t);

  if (session.taskIndex + 1 < TASKS.length) {
    showBridge(
      "Great work!",
      t.part + " is done. Next: " + TASKS[session.taskIndex + 1].name + ".",
      "Continue",
      function () {
        startTask(session.taskIndex + 1);
      }
    );
    return;
  }
  showProgress();
}

/* ---------- sets ---------- */

function nextSet() {
  if (timeLeft() <= 0) return;
  const st = state();
  const items = [];
  for (let i = 0; i < st.span; i += 1) items.push(st.stream.next());
  st.set = { items: items, responses: [], index: 0, correct: 0, recorded: false };
  spanReadout.textContent = "Span " + st.span;
  renderItem();
}

function renderItem() {
  const s = state().set;
  showPhase("solve");
  solveFeedback.textContent = "";
  solveFeedback.className = "feedback";
  solveGuidance.innerHTML = "";
  solveGuidance.hidden = true;
  btnSolveNext.hidden = true;
  solveProgress.textContent = task().itemNoun + " " + (s.index + 1) + " of " + s.items.length;
  task().render(s.items[s.index], answerItem);
}

function answerItem(response) {
  const t = task();
  const st = state();
  const s = st.set;
  if (s.responses.length > s.index) return;

  const item = s.items[s.index];
  const correctKey = t.keyOf(t.correctAnswer(item));
  const responseKey = t.keyOf(response);
  const correct = responseKey === correctKey;
  const counts = st.counts[session.phase];
  counts.total += 1;
  if (correct) {
    counts.correct += 1;
    s.correct += 1;
  }
  s.responses.push({ item: item, response: response, correct: correct });

  const practice = session.phase === "practice";
  solveChoices.querySelectorAll(".choice").forEach(function (button) {
    button.disabled = true;
    if (button.dataset.key === responseKey) {
      /* practice marks right or wrong; training only shows the tap registered */
      button.classList.add(practice ? (correct ? "is-correct" : "is-wrong") : "is-picked");
    }
    if (practice && !correct && button.dataset.key === correctKey) {
      button.classList.add("is-answer");
    }
  });

  if (practice) {
    solveFeedback.textContent = correct ? "Yes." : "Not quite.";
    solveFeedback.className = "feedback " + (correct ? "is-ok" : "is-no");
    solveGuidance.innerHTML =
      t.solvedHtml(item) +
      '<span class="hold-line">Remember ' +
      t.html(t.correctAnswer(item)) +
      "</span>";
    solveGuidance.hidden = false;
    btnSolveNext.hidden = false;
    btnSolveNext.onclick = advanceItem;
    return;
  }

  solveFeedback.textContent = "Remember it.";
  solveFeedback.className = "feedback is-hold";
  later(advanceItem, HOLD_MS);
}

function advanceItem() {
  if (timeLeft() <= 0) return;
  const s = state().set;
  s.index += 1;
  if (s.index < s.items.length) {
    renderItem();
  } else {
    renderRecall();
  }
}

/* ---------- recall ---------- */

function renderRecall() {
  const t = task();
  const st = state();
  /* Practice corrects each answer on the spot, so the student holds the
   * correct one; in training they can only hold what they chose. */
  const targets = st.set.responses.map(function (r) {
    return session.phase === "practice" ? t.correctAnswer(r.item) : r.response;
  });
  st.recall = { targets: targets, entered: [], done: false, options: t.pool(targets, st.set.items) };

  showPhase("recall");
  recallInstruction.innerHTML =
    "Tap the " + targets.length + " answers you chose, in the same <strong>order</strong>.";
  recallGuidance.innerHTML = "";
  recallGuidance.hidden = true;
  btnRecallNext.hidden = true;
  renderRecallSlots();

  recallOptions.innerHTML = "";
  st.recall.options.forEach(function (value) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recall-option";
    button.innerHTML = t.html(value);
    button.onclick = function () {
      enterRecall(value);
    };
    recallOptions.appendChild(button);
  });
}

function renderRecallSlots() {
  const t = task();
  const r = state().recall;
  recallSlots.innerHTML = "";
  for (let i = 0; i < r.targets.length; i += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";
    if (i < r.entered.length) {
      slot.classList.add("is-filled");
      slot.innerHTML = t.html(r.entered[i]);
    } else {
      slot.textContent = String(i + 1);
    }
    recallSlots.appendChild(slot);
  }
  btnRecallUndo.disabled = r.done || r.entered.length === 0;
}

function enterRecall(value) {
  const r = state().recall;
  if (!r || r.done || r.entered.length >= r.targets.length) return;
  r.entered.push(value);
  renderRecallSlots();
  if (r.entered.length === r.targets.length) submitRecall();
}

function undoRecall() {
  const r = state().recall;
  if (!r || r.done || r.entered.length === 0) return;
  r.entered.pop();
  renderRecallSlots();
}

function submitRecall() {
  const t = task();
  const r = state().recall;
  r.done = true;
  btnRecallUndo.disabled = true;
  recallOptions.querySelectorAll(".recall-option").forEach(function (button) {
    button.disabled = true;
  });

  const correct = r.targets.every(function (target, i) {
    return t.keyOf(target) === t.keyOf(r.entered[i]);
  });
  recordSet(correct, true);

  if (session.phase === "practice") {
    recallGuidance.innerHTML = correct
      ? "That is the right order."
      : "The order was " + r.targets.map(t.html).join(", ") + ".";
    recallGuidance.hidden = false;
    btnRecallNext.hidden = false;
    btnRecallNext.onclick = renderReview;
    return;
  }

  applySpanRule(correct);
  later(renderReview, 400);
}

/* Right and wrong recalls are counted at the current span; both counts start
 * again whenever the span changes. */
function applySpanRule(correct) {
  const t = task();
  const st = state();
  if (correct) st.levelCorrect += 1;
  else st.levelWrong += 1;

  if (st.levelCorrect >= t.upAfter) {
    st.highestPassed = Math.max(st.highestPassed, st.span);
    st.span += 1;
    st.levelCorrect = 0;
    st.levelWrong = 0;
  } else if (st.levelWrong >= t.downAfter) {
    st.span = Math.max(SPAN_START, st.span - 1);
    st.levelCorrect = 0;
    st.levelWrong = 0;
  }
}

/* ---------- review ---------- */

function renderReview() {
  const t = task();
  showPhase("review");
  reviewGrid.innerHTML = "";
  state().set.items.forEach(function (item) {
    const cell = document.createElement("div");
    cell.className = t.reviewClass;
    cell.innerHTML = t.solvedHtml(item);
    reviewGrid.appendChild(cell);
  });
  later(nextSet, REVIEW_MS);
}

/* ---------- records ---------- */

/* Every set is written down, practice as well as training, one entry per item.
 * `complete` is false for a set the clock cut short. */
function recordSet(sequenceCorrect, complete) {
  const t = task();
  const st = state();
  const s = st.set;
  if (!s || s.recorded || s.responses.length === 0) return;
  s.recorded = true;
  st.trials.push({
    phase: session.phase,
    span: s.items.length,
    complete: complete,
    sequenceCorrect: sequenceCorrect,
    entries: s.responses.map(t.entry),
  });
}

function taskRecord(t) {
  const st = session.results[t.key];
  const counts = st.counts.trial;
  return {
    id: session.id,
    lesson: session.lesson,
    condition: t.condition,
    startedAt: session.startedAt.toISOString(),
    total: counts.total,
    correct: counts.correct,
    accuracy: counts.total ? counts.correct / counts.total : 0,
    highestSpan: st.highestPassed,
    trials: st.trials,
  };
}

/* One line per task per session — what the progress charts are drawn from. */
function summarise(t) {
  const r = taskRecord(t);
  return {
    id: r.id,
    sessionStart: r.startedAt,
    lesson: r.lesson,
    condition: "wm",
    task: t.key,
    highestSpan: r.highestSpan,
    accuracy: r.total ? r.correct / r.total : null,
    items: r.total,
    correct: r.correct,
  };
}

function csvFor(t) {
  return rowsToCsv([t.csvHeader].concat(t.rows(taskRecord(t))));
}

function csvName(t) {
  return t.key + "-" + session.id + "-lesson" + session.lesson + "-" + fileStamp(session.startedAt) + ".csv";
}

function upload(t) {
  const r = taskRecord(t);
  uploaders[t.key].send(
    {
      token: UPLOAD_TOKEN,
      task: t.key,
      id: r.id,
      lesson: r.lesson,
      condition: r.condition,
      startedAt: r.startedAt,
      header: t.csvHeader,
      rows: t.rows(r),
      csv: csvFor(t),
      summary: session.results[t.key].summary,
    },
    function () {
      downloadText(csvName(t), csvFor(t));
    }
  );
}

/* ---------- history ---------- */

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch (err) {
    return [];
  }
}

function historyKey(row) {
  return row.task + "|" + row.sessionStart;
}

function mergeHistory(a, b) {
  const seen = {};
  const out = [];
  a.concat(b).forEach(function (row) {
    if (!row || !row.sessionStart) return;
    const key = historyKey(row);
    if (seen[key]) return;
    seen[key] = true;
    out.push(row);
  });
  return out;
}

function saveHistory(summary) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(mergeHistory(readHistory(), [summary])));
  } catch (err) {
    /* storage unavailable; the server copy still feeds the charts */
  }
}

/* The device keeps its own history, but a student may not use the same device
 * every day, so the results sheet is asked too. A server that does not know
 * this request (an older Code.gs) simply leaves the charts on local data. */
function fetchServerHistory(id) {
  if (!UPLOAD_URL) return Promise.resolve([]);
  return postPayload({ token: UPLOAD_TOKEN, action: "history", id: id }).then(
    function (result) {
      return (result.rows || []).map(function (row) {
        return {
          id: String(row.id),
          sessionStart: String(row.sessionStart),
          lesson: Number(row.lesson),
          condition: String(row.condition),
          task: String(row.task),
          highestSpan: row.highestSpan === "" || row.highestSpan === null ? null : Number(row.highestSpan),
          accuracy: row.accuracy === "" || row.accuracy === null ? null : Number(row.accuracy),
          items: Number(row.items),
          correct: Number(row.correct),
        };
      });
    },
    function () {
      return [];
    }
  );
}

/* ---------- progress screen ---------- */

function shortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* "up", "same", "down", or "first" when there is nothing to compare with. */
function compare(previous, today) {
  if (previous === null || previous === undefined || today === null || today === undefined) {
    return "first";
  }
  if (today > previous) return "up";
  if (today === previous) return "same";
  return "down";
}

const BADGES = {
  span: {
    first: "Your first score — great start!",
    up: function (p, t) {
      return "New high! Up from " + p + " to " + t + ".";
    },
    same: function (p, t) {
      return "Same as last time (" + t + "). Keep going!";
    },
    down: function (p, t) {
      return "Last time " + p + ", today " + t + ". You can beat it next time!";
    },
  },
  accuracy: {
    first: "Your first score — great start!",
    up: function (p, t) {
      return "Better! Up from " + p + "% to " + t + "%.";
    },
    same: function (p, t) {
      return "Same as last time (" + t + "%). Keep going!";
    },
    down: function (p, t) {
      return "Last time " + p + "%, today " + t + "%. Let's try again next time!";
    },
  },
};

function badge(kind, verdict, previous, today) {
  const el = document.createElement("p");
  el.className = "badge is-" + (verdict === "up" || verdict === "first" ? "good" : "keep");
  const icon = document.createElement("span");
  icon.className = "badge-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = verdict === "up" ? "⬆" : verdict === "first" ? "★" : "💪";
  const text = document.createElement("span");
  const message = BADGES[kind][verdict];
  text.textContent = typeof message === "function" ? message(previous, today) : message;
  el.appendChild(icon);
  el.appendChild(text);
  return el;
}

function pct(accuracy) {
  return accuracy === null || accuracy === undefined ? null : Math.round(accuracy * 100);
}

function table(rows) {
  const details = document.createElement("details");
  details.className = "numbers";
  const summary = document.createElement("summary");
  summary.textContent = "See the numbers";
  details.appendChild(summary);

  const tbl = document.createElement("table");
  const head = document.createElement("tr");
  ["Day", "Date", "Lesson", "Highest span", "Correct"].forEach(function (h) {
    const th = document.createElement("th");
    th.textContent = h;
    head.appendChild(th);
  });
  tbl.appendChild(head);
  rows.forEach(function (row) {
    const tr = document.createElement("tr");
    [
      row.day,
      shortDate(row.sessionStart),
      String(row.lesson),
      row.highestSpan === null ? "—" : String(row.highestSpan),
      row.accuracy === null ? "—" : pct(row.accuracy) + "%",
    ].forEach(function (v) {
      const td = document.createElement("td");
      td.textContent = v;
      tr.appendChild(td);
    });
    tbl.appendChild(tr);
  });
  details.appendChild(tbl);
  return details;
}

function renderProgress(history) {
  const spanVerdicts = [];
  progressCards.innerHTML = "";

  TASKS.forEach(function (t) {
    const todayStart = session.startedAt.toISOString();
    const rows = history
      .filter(function (r) {
        return r.id === session.id && r.task === t.key && r.sessionStart <= todayStart;
      })
      .sort(function (a, b) {
        return a.sessionStart < b.sessionStart ? -1 : a.sessionStart > b.sessionStart ? 1 : 0;
      })
      .map(function (r, i) {
        return Object.assign({}, r, { day: "Day " + (i + 1) });
      });
    if (!rows.length) return;

    const today = rows[rows.length - 1];
    const previous = rows.length > 1 ? rows[rows.length - 2] : null;
    const shown = rows.slice(-CHART_DAYS);
    const point = function (r, value) {
      return { label: r.day, detail: "Lesson " + r.lesson + " · " + shortDate(r.sessionStart), value: value };
    };

    const card = document.createElement("article");
    card.className = "progress-card " + (t.key === "multiplication" ? "tone-mult" : "tone-frac");

    const head = document.createElement("header");
    const h = document.createElement("h3");
    h.textContent = t.name;
    const sub = document.createElement("p");
    sub.className = "progress-today";
    sub.textContent =
      "Today: highest span " +
      today.highestSpan +
      " · " +
      (today.accuracy === null ? "—" : pct(today.accuracy) + "%") +
      " correct";
    head.appendChild(h);
    head.appendChild(sub);
    card.appendChild(head);

    const charts = document.createElement("div");
    charts.className = "chart-row";

    const spans = shown.map(function (r) {
      return r.highestSpan || 0;
    });
    const top = Math.max(6, Math.max.apply(null, spans));
    const spanBox = document.createElement("div");
    spanBox.className = "chart-box";
    spanBox.appendChild(
      lineChart({
        title: "Highest span",
        points: shown.map(function (r) {
          return point(r, r.highestSpan || 0);
        }),
        yMax: top,
        yStep: top > 8 ? 2 : 1,
        format: function (v) {
          return String(Math.round(v));
        },
      })
    );
    const vs = compare(previous ? previous.highestSpan : null, today.highestSpan);
    spanVerdicts.push(vs);
    spanBox.appendChild(badge("span", vs, previous && previous.highestSpan, today.highestSpan));
    charts.appendChild(spanBox);

    const accBox = document.createElement("div");
    accBox.className = "chart-box";
    accBox.appendChild(
      lineChart({
        title: "Correct answers",
        points: shown.map(function (r) {
          return point(r, pct(r.accuracy) || 0);
        }),
        yMax: 100,
        yStep: 25,
        format: function (v) {
          return Math.round(v) + "%";
        },
      })
    );
    const va = compare(previous ? pct(previous.accuracy) : null, pct(today.accuracy));
    accBox.appendChild(badge("accuracy", va, previous && pct(previous.accuracy), pct(today.accuracy)));
    charts.appendChild(accBox);

    card.appendChild(charts);
    card.appendChild(table(rows));
    progressCards.appendChild(card);
  });

  /* The whole screen celebrates only when a highest span went up since the
   * last session, and encourages otherwise. Accuracy keeps its own badge under
   * its chart but does not set the mood. */
  let mood = "keep";
  if (spanVerdicts.length && spanVerdicts.every(function (v) { return v === "first"; })) mood = "first";
  else if (spanVerdicts.indexOf("up") !== -1) mood = "up";
  setMood(mood);
}

function setMood(mood) {
  const moods = {
    up: ["🎉", "You beat your last score!", "Your memory span went up. Great work today!"],
    first: ["🌟", "Great start!", "This is your first day. Come back next time and try to beat it!"],
    keep: ["💪", "Keep going!", "Every day of practice makes your brain stronger. You can beat it next time!"],
  };
  cheer.className = "cheer is-" + mood;
  cheerEmoji.textContent = moods[mood][0];
  cheerTitle.textContent = moods[mood][1];
  cheerText.textContent = moods[mood][2];

  confetti.innerHTML = "";
  if (mood === "keep") return;
  const colors = ["var(--mult)", "var(--frac)", "#f59e0b", "#22c55e", "#38bdf8"];
  for (let i = 0; i < 36; i += 1) {
    const piece = document.createElement("span");
    piece.style.left = Math.random() * 100 + "%";
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = Math.random() * 0.8 + "s";
    piece.style.animationDuration = 1.8 + Math.random() * 1.4 + "s";
    piece.style.transform = "rotate(" + Math.random() * 360 + "deg)";
    confetti.appendChild(piece);
  }
}

function showProgress() {
  summaryMeta.textContent = "ID " + session.id + " · Lesson " + session.lesson;
  showScreen("progress");

  /* draw from this device straight away, then fold in the server's history */
  const local = readHistory();
  renderProgress(local);
  progressCards.classList.add("is-refreshing");
  fetchServerHistory(session.id).then(function (remote) {
    progressCards.classList.remove("is-refreshing");
    if (!remote.length) return;
    const merged = mergeHistory(local, remote);
    if (merged.length > local.length) {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(mergeHistory(readHistory(), remote)));
      } catch (err) {
        /* ignore */
      }
      renderProgress(merged);
    }
  });
}

/* ---------- wiring ---------- */

btnStart.addEventListener("click", beginSession);
inputLesson.addEventListener("input", updateSetupHint);
inputLesson.addEventListener("change", updateSetupHint);
inputId.addEventListener("keydown", function (event) {
  if (event.key === "Enter") beginSession();
});
btnRecallUndo.addEventListener("click", undoRecall);
btnRestart.addEventListener("click", function () {
  window.location.reload();
});
btnCsv.addEventListener("click", function () {
  TASKS.forEach(function (t) {
    if (session.results[t.key]) downloadText(csvName(t), csvFor(t));
  });
});

updateSetupHint();
uploaders.multiplication.showPending();
uploaders.multiplication.flush(uploaders.multiplication.showPending);
