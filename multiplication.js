/* Multiplication Task
 *
 * Students solve single-digit multiplication problems, hold each answer they
 * give, then recall the answers in the order presented.
 */

/* ---------- protocol constants ---------- */

const PRACTICE_SECONDS = 120;
const TRIAL_SECONDS = 300;
const REVIEW_MS = 3600;
const PRACTICE_LESSON_MAX = 3;
const SPAN_START = 2;
const SPAN_STEP_UP_AFTER = 3;
const SPAN_STEP_DOWN_AFTER = 3;
const ACCURACY_FLAG = 0.5;
const ANSWER_ONLY_BLOCK = 4;
const OPTION_COUNT = 4;

/* Lessons 1-5 drill the facts up to 5, lessons 6-15 the full 1-9 range. */
function factorMax(lesson) {
  return lesson <= 5 ? 5 : 9;
}

/* ---------- elements ---------- */

const screens = {
  setup: document.getElementById("screen-setup"),
  bridge: document.getElementById("screen-bridge"),
  task: document.getElementById("screen-task"),
  summary: document.getElementById("screen-summary"),
};

const inputId = document.getElementById("student-id");
const inputLesson = document.getElementById("lesson");
const inputCondition = document.getElementById("condition");
const setupError = document.getElementById("setup-error");
const setupHint = document.getElementById("setup-hint");
const btnStart = document.getElementById("btn-start");

const bridgeTitle = document.getElementById("bridge-title");
const bridgeText = document.getElementById("bridge-text");
const btnBridge = document.getElementById("btn-bridge");

const taskPhaseLabel = document.getElementById("task-phase-label");
const taskSubtitle = document.getElementById("task-subtitle");
const timerValue = document.getElementById("timer-value");
const spanReadout = document.getElementById("span-readout");

const phaseSolve = document.getElementById("phase-solve");
const solveProgress = document.getElementById("solve-progress");
const solveProblem = document.getElementById("solve-problem");
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

const summaryAccuracy = document.getElementById("summary-accuracy");
const summarySpan = document.getElementById("summary-span");
const summaryTrials = document.getElementById("summary-trials");
const summaryMeta = document.getElementById("summary-meta");
const summaryFlag = document.getElementById("summary-flag");
const uploadStatus = document.getElementById("upload-status");
const pendingNote = document.getElementById("pending-note");
const btnCsv = document.getElementById("btn-csv");
const btnCsvAll = document.getElementById("btn-csv-all");
const btnRestart = document.getElementById("btn-restart");

/* ---------- deterministic item stream ---------- */
/* mulberry32 and shuffle live in common.js. */

function itemKey(item) {
  return item.a + "x" + item.b;
}

/* Distractors are the near misses students actually make: a factor off by one,
 * the product off by one or two, and adding instead of multiplying. */
function answerOptions(a, b, product, rng) {
  const candidates = [
    a * (b + 1),
    a * (b - 1),
    (a + 1) * b,
    (a - 1) * b,
    a + b,
    product + 1,
    product - 1,
    product + 2,
    product - 2,
  ];

  const seen = {};
  seen[product] = true;
  const distractors = [];
  shuffle(candidates, rng).forEach(function (value) {
    if (value > 0 && !seen[value]) {
      seen[value] = true;
      distractors.push(value);
    }
  });

  /* Small products (1 × 1) exhaust the near misses, so widen outwards until
   * there are always OPTION_COUNT choices. */
  for (let step = 3; distractors.length < OPTION_COUNT - 1 && step < 40; step += 1) {
    [product + step, product - step].forEach(function (value) {
      if (value > 0 && !seen[value] && distractors.length < OPTION_COUNT - 1) {
        seen[value] = true;
        distractors.push(value);
      }
    });
  }

  const options = [product].concat(distractors.slice(0, OPTION_COUNT - 1));
  return shuffle(options, rng);
}

/* Problems are seeded from the lesson number, so every student in a lesson
 * meets the same problems in the same order in both conditions. */
function makeStream(lesson, seedOffset) {
  const rng = mulberry32(lesson * 6271 + 29 + (seedOffset || 0));
  const max = factorMax(lesson);
  const recent = [];

  function generate() {
    const a = 1 + Math.floor(rng() * max);
    const b = 1 + Math.floor(rng() * max);
    return { a: a, b: b, product: a * b };
  }

  return {
    next: function () {
      let item = generate();
      let guard = 0;
      while (recent.indexOf(itemKey(item)) !== -1 && guard < 24) {
        item = generate();
        guard += 1;
      }
      recent.push(itemKey(item));
      if (recent.length > 8) recent.shift();
      item.options = answerOptions(item.a, item.b, item.product, rng);
      return item;
    },
  };
}

/* ---------- rendering helpers ---------- */

function problemText(item) {
  return item.a + " × " + item.b;
}

function formatClock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}

function showScreen(name) {
  Object.keys(screens).forEach(function (key) {
    screens[key].classList.toggle("is-visible", key === name);
  });
}

function showPhase(name) {
  phaseSolve.classList.toggle("is-visible", name === "solve");
  phaseRecall.classList.toggle("is-visible", name === "recall");
  phaseReview.classList.toggle("is-visible", name === "review");
}

/* ---------- session state ---------- */

const session = {
  id: "",
  lesson: 1,
  condition: "wm",
  startedAt: null,
  stream: null,
  practice: false,
  span: SPAN_START,
  consecutiveCorrect: 0,
  consecutiveWrong: 0,
  highestSpan: 0,
  counts: {
    practice: { total: 0, correct: 0 },
    trial: { total: 0, correct: 0 },
  },
  trials: [],
  trial: null,
  recall: null,
  deadline: 0,
  ticker: null,
  reviewTimer: null,
};

function isWm() {
  return session.condition === "wm";
}

function phaseName() {
  return session.practice ? "practice" : "trial";
}

function phaseCounts() {
  return session.counts[phaseName()];
}

/* ---------- timing ---------- */

function startClock(seconds, onExpire) {
  stopClock();
  session.deadline = Date.now() + seconds * 1000;
  timerValue.textContent = formatClock(seconds);
  session.ticker = setInterval(function () {
    const remaining = (session.deadline - Date.now()) / 1000;
    timerValue.textContent = formatClock(remaining);
    if (remaining <= 0) {
      stopClock();
      onExpire();
    }
  }, 250);
}

function stopClock() {
  if (session.ticker) {
    clearInterval(session.ticker);
    session.ticker = null;
  }
}

function timeLeft() {
  return (session.deadline - Date.now()) / 1000;
}

function clearReviewTimer() {
  if (session.reviewTimer) {
    clearTimeout(session.reviewTimer);
    session.reviewTimer = null;
  }
}

/* ---------- setup ---------- */

function updateSetupHint() {
  const lesson = Number(inputLesson.value);
  const parts = [];
  parts.push(
    lesson >= 1 && lesson <= 15
      ? "Lesson " +
          lesson +
          ": multiplication facts from 1 to " +
          factorMax(lesson) +
          "."
      : "Lesson must be between 1 and 15."
  );
  parts.push(
    lesson <= PRACTICE_LESSON_MAX
      ? "A 2-minute practice trial with feedback runs first."
      : "No practice trial — the 5-minute trial starts immediately."
  );
  setupHint.textContent = parts.join(" ");
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
  session.condition = inputCondition.value;
  session.startedAt = new Date();
  session.stream = makeStream(lesson);
  session.span = SPAN_START;
  session.consecutiveCorrect = 0;
  session.consecutiveWrong = 0;
  session.highestSpan = 0;
  session.counts = {
    practice: { total: 0, correct: 0 },
    trial: { total: 0, correct: 0 },
  };
  session.trials = [];

  if (lesson <= PRACTICE_LESSON_MAX) {
    showBridge(
      "Practice first",
      isWm()
        ? "You will solve a multiplication problem and tap the answer. Keep each answer in your head. After the last problem, tap your answers back in the same order. This 2-minute practice tells you whether each answer and each order is right."
        : "You will solve a multiplication problem and tap the answer. This 2-minute practice tells you whether each answer is right.",
      "Start practice",
      startPractice
    );
  } else {
    startTrialBlock();
  }
}

function showBridge(title, text, buttonLabel, action) {
  bridgeTitle.textContent = title;
  bridgeText.textContent = text;
  btnBridge.textContent = buttonLabel;
  btnBridge.onclick = action;
  showScreen("bridge");
}

/* ---------- practice and trial ---------- */

function startPractice() {
  session.practice = true;
  /* Practice draws different problems of the same lesson's range, so it cannot
   * shift where the scored trial starts. */
  session.stream = makeStream(session.lesson, 500000);
  session.span = SPAN_START;
  session.consecutiveCorrect = 0;
  session.consecutiveWrong = 0;
  taskPhaseLabel.textContent = "Practice";
  taskSubtitle.textContent = "Practice. You are told whether each answer is right.";
  showScreen("task");
  startClock(PRACTICE_SECONDS, endPractice);
  nextTrial();
}

function endPractice() {
  clearReviewTimer();
  session.practice = false;
  showBridge(
    "Practice finished",
    isWm()
      ? "Now the real trial. It lasts 5 minutes. Answers are no longer marked right or wrong — every problem and its answer is shown after you recall each set."
      : "Now the real trial. It lasts 5 minutes. Answers are no longer marked right or wrong — every problem and its answer is shown after every few problems.",
    "Start the 5-minute trial",
    startTrialBlock
  );
}

function startTrialBlock() {
  session.practice = false;
  /* Reset the stream so the scored trial opens on the same problem, in the same
   * order, for every student in this lesson and in both conditions. */
  session.stream = makeStream(session.lesson);
  session.span = SPAN_START;
  session.consecutiveCorrect = 0;
  session.consecutiveWrong = 0;
  taskPhaseLabel.textContent = "Trial";
  taskSubtitle.textContent = isWm()
    ? "Solve, remember your answer, then recall the set in order."
    : "Solve each problem.";
  showScreen("task");
  startClock(TRIAL_SECONDS, finishSession);
  nextTrial();
}

function nextTrial() {
  if (timeLeft() <= 0) return;

  const size = isWm() ? session.span : ANSWER_ONLY_BLOCK;
  const items = [];
  for (let i = 0; i < size; i += 1) items.push(session.stream.next());

  session.trial = {
    items: items,
    responses: [],
    index: 0,
    correctAnswers: 0,
  };

  spanReadout.textContent = isWm()
    ? "Span " + session.span
    : String(size) + " problems";
  renderSolve();
}

function renderSolve() {
  const trial = session.trial;
  const item = trial.items[trial.index];

  showPhase("solve");
  solveFeedback.textContent = "";
  solveFeedback.className = "feedback";
  solveGuidance.innerHTML = "";
  solveGuidance.hidden = true;
  btnSolveNext.hidden = true;

  solveProgress.textContent =
    "Problem " + (trial.index + 1) + " of " + trial.items.length;
  solveProblem.textContent = problemText(item) + " = ?";

  solveChoices.innerHTML = "";
  item.options.forEach(function (value) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice is-number";
    button.textContent = String(value);
    button.onclick = function () {
      answerSolve(value);
    };
    solveChoices.appendChild(button);
  });
}

function answerSolve(response) {
  const trial = session.trial;
  if (!trial) return;

  const item = trial.items[trial.index];
  const correct = response === item.product;

  const counts = phaseCounts();
  counts.total += 1;
  if (correct) {
    counts.correct += 1;
    trial.correctAnswers += 1;
  }
  trial.responses.push({ item: item, response: response, correct: correct });

  solveChoices.querySelectorAll(".choice").forEach(function (button) {
    button.disabled = true;
    const value = Number(button.textContent);
    if (value === response) {
      /* Practice marks the answer right or wrong; a scored set only shows that
       * the tap registered. */
      button.classList.add(
        session.practice ? (correct ? "is-correct" : "is-wrong") : "is-picked"
      );
    }
    if (session.practice && !correct && value === item.product) {
      button.classList.add("is-answer");
    }
  });

  if (session.practice) {
    solveFeedback.textContent = correct ? "Yes." : "Not quite.";
    solveFeedback.className = "feedback " + (correct ? "is-ok" : "is-no");
    solveGuidance.innerHTML =
      problemText(item) +
      ' = <span class="eq-answer">' +
      item.product +
      "</span>" +
      (isWm()
        ? '<span class="hold-line">Remember ' + item.product + "</span>"
        : "");
    solveGuidance.hidden = false;
    btnSolveNext.hidden = false;
    btnSolveNext.onclick = advanceSolve;
    return;
  }

  if (isWm()) {
    solveFeedback.textContent = "Remember it.";
    solveFeedback.className = "feedback is-hold";
  }
  setTimeout(advanceSolve, 750);
}

function advanceSolve() {
  const trial = session.trial;
  if (timeLeft() <= 0) return;

  trial.index += 1;
  if (trial.index < trial.items.length) {
    renderSolve();
    return;
  }
  if (isWm()) {
    renderRecall();
  } else {
    recordTrial(null);
    renderReview();
  }
}

/* ---------- recall ---------- */

/* In a scored set no feedback is given, so the student can only hold the answer
 * they gave: the sequence is scored against their own answers. A wrong product
 * recalled faithfully still counts as a correct sequence, and still moves the
 * span. In practice the student is corrected on the spot and told which answer
 * to hold, so there the target is the correct product. */
function recallTargets() {
  return session.trial.responses.map(function (entry) {
    return session.practice ? entry.item.product : entry.response;
  });
}

function renderRecall() {
  const targets = recallTargets();
  session.recall = {
    targets: targets,
    entered: [],
    options: numberRecallPool(targets),
  };

  showPhase("recall");
  recallInstruction.innerHTML =
    "Tap the " +
    targets.length +
    " answers you gave, in the same <strong>order</strong>.";
  recallGuidance.innerHTML = "";
  recallGuidance.hidden = true;
  btnRecallNext.hidden = true;
  renderRecallSlots();
  renderRecallOptions();
}

function renderRecallOptions() {
  const recall = session.recall;
  recallOptions.innerHTML = "";
  recall.options.forEach(function (value) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recall-option";
    button.textContent = String(value);
    button.onclick = function () {
      enterRecall(value);
    };
    recallOptions.appendChild(button);
  });
}

function renderRecallSlots() {
  const recall = session.recall;
  recallSlots.innerHTML = "";
  for (let i = 0; i < recall.targets.length; i += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";
    if (i < recall.entered.length) {
      slot.classList.add("is-filled");
      slot.textContent = String(recall.entered[i]);
    } else {
      slot.textContent = String(i + 1);
    }
    recallSlots.appendChild(slot);
  }
  btnRecallUndo.disabled = recall.entered.length === 0;
}

function enterRecall(value) {
  const recall = session.recall;
  if (!recall || recall.entered.length >= recall.targets.length) return;

  recall.entered.push(value);
  renderRecallSlots();

  if (recall.entered.length === recall.targets.length) submitRecall();
}

function undoRecall() {
  const recall = session.recall;
  if (!recall || recall.entered.length === 0) return;
  recall.entered.pop();
  renderRecallSlots();
}

function submitRecall() {
  const recall = session.recall;
  const correct = recall.targets.every(function (target, i) {
    return target === recall.entered[i];
  });

  btnRecallUndo.disabled = true;
  recallOptions.querySelectorAll(".recall-option").forEach(function (button) {
    button.disabled = true;
  });

  recordTrial(correct);

  if (session.practice) {
    recallGuidance.innerHTML = correct
      ? "That is the right order."
      : "The order was " + recall.targets.join(", ") + ".";
    recallGuidance.hidden = false;
    btnRecallNext.hidden = false;
    btnRecallNext.onclick = renderReview;
    return;
  }

  /* In a scored set the sequence is recorded but never fed back. */
  setTimeout(renderReview, 400);
}

/* ---------- span and records ---------- */

/* Every set is written down, in practice as well as in the scored trial, with
 * one entry per problem. `complete` is false for a set the clock cut short. */
function pushTrialRecord(sequenceCorrect, complete) {
  const trial = session.trial;
  if (!trial || trial.recorded || trial.responses.length === 0) return;
  trial.recorded = true;

  session.trials.push({
    phase: phaseName(),
    span: trial.items.length,
    complete: complete,
    correctAnswers: trial.correctAnswers,
    sequenceCorrect: sequenceCorrect,
    entries: trial.responses.map(function (entry) {
      return {
        a: entry.item.a,
        b: entry.item.b,
        product: entry.item.product,
        response: entry.response,
        correct: entry.correct,
      };
    }),
  });
}

function recordTrial(sequenceCorrect) {
  pushTrialRecord(sequenceCorrect, true);

  /* The span moves on the recall sequence alone. A student who calculated
   * wrongly but reproduced their own answers in order still advances. */
  if (session.practice || !isWm()) return;

  if (sequenceCorrect) {
    session.consecutiveCorrect += 1;
    session.consecutiveWrong = 0;
    if (session.consecutiveCorrect >= SPAN_STEP_UP_AFTER) {
      /* The highest span is the highest one passed, i.e. stepped up out of.
       * Reaching a span, or getting a sequence right there before falling
       * back, does not count. */
      session.highestSpan = Math.max(session.highestSpan, session.span);
      session.span += 1;
      session.consecutiveCorrect = 0;
    }
  } else {
    session.consecutiveWrong += 1;
    session.consecutiveCorrect = 0;
    if (session.consecutiveWrong >= SPAN_STEP_DOWN_AFTER) {
      session.span = Math.max(SPAN_START, session.span - 1);
      session.consecutiveWrong = 0;
    }
  }
}

/* ---------- end-of-set review ---------- */

function renderReview() {
  clearReviewTimer();
  showPhase("review");

  reviewGrid.innerHTML = "";
  session.trial.items.forEach(function (item) {
    const row = document.createElement("div");
    row.className = "review-equation";
    row.innerHTML =
      problemText(item) +
      ' = <span class="eq-answer">' +
      item.product +
      "</span>";
    reviewGrid.appendChild(row);
  });

  session.reviewTimer = setTimeout(function () {
    session.reviewTimer = null;
    if (timeLeft() <= 0) {
      if (!session.practice) finishSession();
      return;
    }
    nextTrial();
  }, REVIEW_MS);
}

/* ---------- summary and records ---------- */

function trialAccuracy() {
  const counts = session.counts.trial;
  return counts.total > 0 ? counts.correct / counts.total : 0;
}

function finishSession() {
  stopClock();
  clearReviewTimer();
  /* Keep a set the clock interrupted; its problems were already answered. */
  pushTrialRecord(null, false);

  const counts = session.counts.trial;
  const practice = session.counts.practice;
  const accuracy = trialAccuracy();
  const scored = session.trials.filter(function (t) {
    return t.phase === "trial";
  });

  summaryAccuracy.textContent =
    counts.total > 0 ? Math.round(accuracy * 100) + "%" : "—";
  summarySpan.textContent = isWm()
    ? session.highestSpan > 0
      ? String(session.highestSpan)
      : "—"
    : "n/a";
  summaryTrials.textContent = String(scored.length);
  summaryMeta.textContent =
    "ID " +
    session.id +
    " · Lesson " +
    session.lesson +
    " (×1–" +
    factorMax(session.lesson) +
    ") · " +
    (isWm() ? "Multiplication + working memory" : "Multiplication only") +
    " · " +
    counts.correct +
    " of " +
    counts.total +
    " problems correct" +
    (practice.total > 0
      ? " · practice " + practice.correct + " of " + practice.total
      : "");

  summaryFlag.hidden = !(counts.total > 0 && accuracy < ACCURACY_FLAG);

  saveSession(accuracy);
  uploadSession(accuracy);
  showScreen("summary");
}

function sessionRecord(accuracy) {
  return {
    id: session.id,
    lesson: session.lesson,
    factorMax: factorMax(session.lesson),
    condition: isWm() ? "multiplication+wm" : "multiplication-only",
    startedAt: session.startedAt.toISOString(),
    problems: session.counts.trial.total,
    problemsCorrect: session.counts.trial.correct,
    practiceProblems: session.counts.practice.total,
    practiceProblemsCorrect: session.counts.practice.correct,
    accuracy: accuracy,
    highestSpan: isWm() ? session.highestSpan : null,
    trials: session.trials,
  };
}

function saveSession(accuracy) {
  try {
    const key = "multiplicationTask.sessions";
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    saved.push(sessionRecord(accuracy));
    localStorage.setItem(key, JSON.stringify(saved));
  } catch (err) {
    /* storage unavailable; the CSV download still works */
  }
}

/* ---------- upload ---------- */
/* postPayload and the retry queue live in common.js. */

const uploader = createUploader(
  "multiplicationTask.pending",
  uploadStatus,
  pendingNote
);

function sessionPayload(record) {
  return {
    token: UPLOAD_TOKEN,
    task: "multiplication",
    id: record.id,
    lesson: record.lesson,
    condition: record.condition,
    startedAt: record.startedAt,
    header: CSV_HEADER,
    rows: recordToRows(record),
    csv: toCsv([record]),
  };
}

function uploadSession(accuracy) {
  uploader.send(sessionPayload(sessionRecord(accuracy)), downloadThisSession);
}

/* One row per problem, practice included, so every item and every sequence is
 * in the record. `sequence_correct` repeats across the rows of a set. */
const CSV_HEADER = [
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
];

function recordToRows(record) {
  const rows = [];
  const setNumber = { practice: 0, trial: 0 };

  record.trials.forEach(function (trial) {
    setNumber[trial.phase] += 1;
    const sequence =
      trial.sequenceCorrect === null || trial.sequenceCorrect === undefined
        ? ""
        : trial.sequenceCorrect
        ? 1
        : 0;

    trial.entries.forEach(function (entry, i) {
      rows.push([
        record.id,
        record.lesson,
        record.factorMax,
        record.condition,
        record.startedAt,
        trial.phase,
        setNumber[trial.phase],
        trial.span,
        trial.complete ? 1 : 0,
        i + 1,
        entry.a,
        entry.b,
        entry.product,
        entry.response,
        entry.correct ? 1 : 0,
        sequence,
        record.problems,
        record.problemsCorrect,
        record.accuracy.toFixed(4),
        record.highestSpan === null ? "" : record.highestSpan,
      ]);
    });
  });

  return rows;
}

function toCsv(records) {
  const rows = [CSV_HEADER];
  records.forEach(function (record) {
    recordToRows(record).forEach(function (row) {
      rows.push(row);
    });
  });
  return rowsToCsv(rows);
}

function stamp() {
  return fileStamp(session.startedAt);
}

function downloadThisSession() {
  downloadText(
    "multiplication-" +
      session.id +
      "-lesson" +
      session.lesson +
      "-" +
      stamp() +
      ".csv",
    toCsv([sessionRecord(trialAccuracy())])
  );
}

function downloadAllSessions() {
  let saved = [];
  try {
    saved = JSON.parse(
      localStorage.getItem("multiplicationTask.sessions") || "[]"
    );
  } catch (err) {
    saved = [];
  }
  if (saved.length === 0) {
    downloadThisSession();
    return;
  }
  downloadText("multiplication-all-sessions-" + stamp() + ".csv", toCsv(saved));
}

/* ---------- wiring ---------- */

btnStart.addEventListener("click", beginSession);
inputLesson.addEventListener("input", updateSetupHint);
inputLesson.addEventListener("change", updateSetupHint);
btnRecallUndo.addEventListener("click", undoRecall);
btnCsv.addEventListener("click", downloadThisSession);
btnCsvAll.addEventListener("click", downloadAllSessions);
btnRestart.addEventListener("click", function () {
  window.location.reload();
});

[inputId].forEach(function (input) {
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") beginSession();
  });
});

updateSetupHint();
uploader.showPending();
uploader.flush(uploader.showPending);
