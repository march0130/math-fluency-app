/* Fraction Comparison Task
 *
 * Students compare pairs of fractions, identify the larger of each pair, hold
 * the identified fractions, then recall them in the order presented.
 */

/* ---------- protocol constants ---------- */

const PRACTICE_SECONDS = 120;
const TRIAL_SECONDS = 300;
const REVIEW_MS = 3600;
const PRACTICE_LESSON_MAX = 3;
const SPAN_START = 2;
const SPAN_STEP_UP_AFTER = 2;
const SPAN_STEP_DOWN_AFTER = 2;
const ACCURACY_FLAG = 0.5;
const FRACTION_ONLY_BLOCK = 4;

const DENOMS = [2, 3, 4, 5, 6, 8, 10, 12];
const SAME_DEN_DENOMS = DENOMS.filter((d) => d >= 3);

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

const phaseCompare = document.getElementById("phase-compare");
const compareProgress = document.getElementById("compare-progress");
const compareChoices = document.getElementById("compare-choices");
const compareFeedback = document.getElementById("compare-feedback");
const compareGuidance = document.getElementById("compare-guidance");
const btnCompareNext = document.getElementById("btn-compare-next");

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

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function fracValue(f) {
  return f.n / f.d;
}

function fracKey(f) {
  return f.n + "/" + f.d;
}

function pairKey(pair) {
  return fracKey(pair.left) + "|" + fracKey(pair.right);
}

function orient(rng, f1, f2, type) {
  const flip = rng() < 0.5;
  const left = flip ? f2 : f1;
  const right = flip ? f1 : f2;
  const largerSide = fracValue(left) > fracValue(right) ? "left" : "right";
  return { type, left, right, largerSide };
}

function genSameDenominator(rng) {
  const d = pick(rng, SAME_DEN_DENOMS);
  const a = 1 + Math.floor(rng() * (d - 1));
  let b = 1 + Math.floor(rng() * (d - 1));
  while (b === a) b = 1 + Math.floor(rng() * (d - 1));
  return orient(rng, { n: a, d: d }, { n: b, d: d }, "sameDen");
}

function genSameNumerator(rng, allowNonUnit) {
  const n = allowNonUnit && rng() < 0.45 ? 2 + Math.floor(rng() * 2) : 1;
  const pool = DENOMS.filter((d) => d > n);
  const d1 = pick(rng, pool);
  let d2 = pick(rng, pool);
  while (d2 === d1) d2 = pick(rng, pool);
  return orient(rng, { n: n, d: d1 }, { n: n, d: d2 }, "sameNum");
}

function genVersusHalf(rng) {
  const pool = [];
  for (const d of DENOMS) {
    if (d === 2) continue;
    for (let a = 1; a < d; a++) {
      if (a / d > 0.5) pool.push({ n: a, d: d });
    }
  }
  return orient(rng, pick(rng, pool), { n: 1, d: 2 }, "vsHalf");
}

/* Item types follow the order in which the content is taught: lessons 1-4 use
 * shared-denominator and shared-numerator pairs, lessons 5-15 add the
 * greater-than-one-half comparison. Shared-numerator pairs begin with unit
 * fractions. Pairs are seeded from the lesson number, so every student in a
 * lesson meets the same pairs in the same order in both conditions. */
function makeStream(lesson, seedOffset) {
  const rng = mulberry32(lesson * 7919 + 13 + (seedOffset || 0));
  const types =
    lesson <= 4 ? ["sameDen", "sameNum"] : ["sameDen", "sameNum", "vsHalf"];
  const recent = [];
  let produced = 0;
  let sameNumCount = 0;

  function generate() {
    const type = produced < types.length ? types[produced] : pick(rng, types);
    if (type === "sameDen") return genSameDenominator(rng);
    if (type === "vsHalf") return genVersusHalf(rng);
    const allowNonUnit = lesson >= 3 && sameNumCount > 0;
    return genSameNumerator(rng, allowNonUnit);
  }

  return {
    next: function () {
      let pair = generate();
      let guard = 0;
      while (recent.indexOf(pairKey(pair)) !== -1 && guard < 24) {
        pair = generate();
        guard += 1;
      }
      recent.push(pairKey(pair));
      if (recent.length > 8) recent.shift();
      if (pair.type === "sameNum") sameNumCount += 1;
      produced += 1;
      return pair;
    },
  };
}

/* ---------- rendering helpers ---------- */

function fracHtml(f) {
  return (
    '<span class="frac"><span class="n">' +
    f.n +
    '</span><span class="d">' +
    f.d +
    "</span></span>"
  );
}

function largerOf(pair) {
  return pair[pair.largerSide];
}

function smallerOf(pair) {
  return pair[pair.largerSide === "left" ? "right" : "left"];
}

function comparisonSymbol(pair) {
  const left = fracValue(pair.left);
  const right = fracValue(pair.right);
  if (left > right) return ">";
  if (left < right) return "<";
  return "=";
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
  phaseCompare.classList.toggle("is-visible", name === "compare");
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
    lesson <= 4
      ? "Lessons 1–4: shared denominator and shared numerator pairs."
      : "Lessons 5–15: adds a fraction greater than one half against one half."
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
        ? "You will compare two fractions and tap the larger one. Keep each answer in your head. After the last pair, tap your answers back in the same order. This 2-minute practice tells you whether each answer and each order is right."
        : "You will compare two fractions and tap the larger one. Say each answer as you go. This 2-minute practice tells you whether each answer is right.",
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
  /* Practice draws different items of the same lesson's types, so it cannot
   * shift where the scored trial starts and students do not meet the scored
   * pairs twice. The lesson stays the same so the item types stay correct. */
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
      ? "Now the real trial. It lasts 5 minutes. Answers are no longer marked right or wrong — the correct answers are shown after you recall each set."
      : "Now the real trial. It lasts 5 minutes. Answers are no longer marked right or wrong — the correct answers are shown after every few comparisons.",
    "Start the 5-minute trial",
    startTrialBlock
  );
}

function startTrialBlock() {
  session.practice = false;
  /* Reset the stream so the scored trial opens on the same pair, in the same
   * order, for every student in this lesson and in both conditions. */
  session.stream = makeStream(session.lesson);
  session.span = SPAN_START;
  session.consecutiveCorrect = 0;
  session.consecutiveWrong = 0;
  taskPhaseLabel.textContent = "Trial";
  taskSubtitle.textContent = isWm()
    ? "Tap the larger fraction, remember it, then recall the set in order."
    : "Tap the larger fraction of each pair.";
  showScreen("task");
  startClock(TRIAL_SECONDS, finishSession);
  nextTrial();
}

function nextTrial() {
  if (timeLeft() <= 0) return;

  const size = isWm() ? session.span : FRACTION_ONLY_BLOCK;
  const pairs = [];
  for (let i = 0; i < size; i += 1) pairs.push(session.stream.next());

  session.trial = {
    pairs: pairs,
    selections: [],
    index: 0,
    correctComparisons: 0,
  };

  spanReadout.textContent = isWm()
    ? "Span " + session.span
    : String(size) + " pairs";
  renderComparison();
}

function renderComparison() {
  const trial = session.trial;
  const pair = trial.pairs[trial.index];

  showPhase("compare");
  compareFeedback.textContent = "";
  compareFeedback.className = "feedback";
  compareGuidance.innerHTML = "";
  compareGuidance.hidden = true;
  btnCompareNext.hidden = true;

  compareProgress.textContent =
    "Pair " + (trial.index + 1) + " of " + trial.pairs.length;

  compareChoices.innerHTML = "";
  ["left", "right"].forEach(function (side) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.innerHTML = fracHtml(pair[side]);
    button.onclick = function () {
      answerComparison(side);
    };
    compareChoices.appendChild(button);
    if (side === "left") {
      const vs = document.createElement("span");
      vs.className = "choice-vs";
      vs.textContent = "or";
      compareChoices.appendChild(vs);
    }
  });
}

function answerComparison(side) {
  const trial = session.trial;
  const pair = trial.pairs[trial.index];
  const correct = side === pair.largerSide;

  const counts = phaseCounts();
  counts.total += 1;
  if (correct) {
    counts.correct += 1;
    trial.correctComparisons += 1;
  }
  trial.selections.push({ pair: pair, side: side, correct: correct });

  const buttons = compareChoices.querySelectorAll(".choice");
  buttons.forEach(function (button, i) {
    button.disabled = true;
    const buttonSide = i === 0 ? "left" : "right";
    if (buttonSide === side) {
      /* Practice marks the answer right or wrong; a scored set only shows that
       * the tap registered. */
      button.classList.add(
        session.practice ? (correct ? "is-correct" : "is-wrong") : "is-picked"
      );
    }
    if (session.practice && !correct && buttonSide === pair.largerSide) {
      button.classList.add("is-answer");
    }
  });

  if (session.practice) {
    compareFeedback.textContent = correct ? "Yes." : "Not quite.";
    compareFeedback.className = "feedback " + (correct ? "is-ok" : "is-no");
    compareGuidance.innerHTML =
      fracHtml(pair.left) +
      ' <span class="review-symbol">' +
      comparisonSymbol(pair) +
      "</span> " +
      fracHtml(pair.right) +
      (isWm()
        ? '<span class="hold-line">Remember ' + fracHtml(largerOf(pair)) + "</span>"
        : "");
    compareGuidance.hidden = false;
    btnCompareNext.hidden = false;
    btnCompareNext.onclick = advanceComparison;
    return;
  }

  if (isWm()) {
    compareFeedback.textContent = "Remember it.";
    compareFeedback.className = "feedback is-hold";
  }
  setTimeout(advanceComparison, 750);
}

function advanceComparison() {
  const trial = session.trial;
  if (timeLeft() <= 0) return;

  trial.index += 1;
  if (trial.index < trial.pairs.length) {
    renderComparison();
    return;
  }
  if (isWm()) {
    renderRecall();
  } else {
    /* No sequence to score, but the block still has to reach the records. */
    recordTrial(null);
    renderReview();
  }
}

/* ---------- recall ---------- */

/* In a scored set no feedback is given, so the student can only hold the
 * fraction they picked: the sequence is scored against their own choice. A
 * wrong comparison recalled faithfully still counts as a correct sequence, and
 * still moves the span. In practice the student is corrected on the spot and
 * told which fraction to hold, so there the target is the correct one. */
function recallTargets() {
  return session.trial.selections.map(function (entry) {
    return session.practice ? largerOf(entry.pair) : entry.pair[entry.side];
  });
}

function renderRecall() {
  const trial = session.trial;
  const targets = recallTargets();

  const seen = {};
  const options = [];
  trial.pairs.forEach(function (pair) {
    [pair.left, pair.right].forEach(function (f) {
      const key = fracKey(f);
      if (!seen[key]) {
        seen[key] = true;
        options.push(f);
      }
    });
  });
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = options[i];
    options[i] = options[j];
    options[j] = tmp;
  }

  session.recall = { targets: targets, entered: [], options: options };

  showPhase("recall");
  recallInstruction.innerHTML =
    "Tap the " +
    targets.length +
    " fractions you chose, in the same <strong>order</strong>.";
  recallGuidance.innerHTML = "";
  recallGuidance.hidden = true;
  btnRecallNext.hidden = true;
  renderRecallSlots();
  renderRecallOptions();
}

function renderRecallSlots() {
  const recall = session.recall;
  recallSlots.innerHTML = "";
  for (let i = 0; i < recall.targets.length; i += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";
    if (recall.entered[i]) {
      slot.classList.add("is-filled");
      slot.innerHTML = fracHtml(recall.entered[i]);
    } else {
      slot.textContent = String(i + 1);
    }
    recallSlots.appendChild(slot);
  }
  btnRecallUndo.disabled = recall.entered.length === 0;
}

function renderRecallOptions() {
  const recall = session.recall;
  recallOptions.innerHTML = "";
  recall.options.forEach(function (f) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recall-option";
    button.innerHTML = fracHtml(f);
    button.onclick = function () {
      enterRecall(f);
    };
    recallOptions.appendChild(button);
  });
}

function enterRecall(f) {
  const recall = session.recall;
  if (recall.entered.length >= recall.targets.length) return;
  recall.entered.push(f);
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
    return fracKey(target) === fracKey(recall.entered[i]);
  });

  recordTrial(correct);

  if (session.practice) {
    recallOptions.querySelectorAll(".recall-option").forEach(function (button) {
      button.disabled = true;
    });
    recallGuidance.innerHTML = correct
      ? "That is the right order."
      : "The order was " +
        recall.targets
          .map(function (f) {
            return fracHtml(f);
          })
          .join(", ") +
        ".";
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
 * one entry per comparison. `complete` is false for a set the clock cut short. */
function pushTrialRecord(sequenceCorrect, complete) {
  const trial = session.trial;
  if (!trial || trial.recorded || trial.selections.length === 0) return;
  trial.recorded = true;

  session.trials.push({
    phase: phaseName(),
    span: trial.pairs.length,
    complete: complete,
    correctComparisons: trial.correctComparisons,
    sequenceCorrect: sequenceCorrect,
    items: trial.selections.map(function (entry) {
      return {
        type: entry.pair.type,
        left: fracKey(entry.pair.left),
        right: fracKey(entry.pair.right),
        correctAnswer: fracKey(largerOf(entry.pair)),
        response: fracKey(entry.pair[entry.side]),
        correct: entry.correct,
      };
    }),
  });
}

function recordTrial(sequenceCorrect) {
  const trial = session.trial;
  pushTrialRecord(sequenceCorrect, true);

  /* The span moves on the recall sequence alone. A student who compared wrongly
   * but reproduced their own answers in order still advances. */
  if (session.practice || !isWm()) return;

  if (sequenceCorrect) {
    session.highestSpan = Math.max(session.highestSpan, trial.pairs.length);
    session.consecutiveCorrect += 1;
    session.consecutiveWrong = 0;
    if (session.consecutiveCorrect >= SPAN_STEP_UP_AFTER) {
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

/* ---------- end-of-trial review ---------- */

function renderReview() {
  clearReviewTimer();
  showPhase("review");

  reviewGrid.innerHTML = "";
  session.trial.pairs.forEach(function (pair) {
    const row = document.createElement("div");
    row.className = "review-pair";

    const left = document.createElement("span");
    left.className = "review-frac";
    left.innerHTML = fracHtml(pair.left);

    const symbol = document.createElement("span");
    symbol.className = "review-symbol";
    symbol.textContent = comparisonSymbol(pair);

    const right = document.createElement("span");
    right.className = "review-frac";
    right.innerHTML = fracHtml(pair.right);

    row.appendChild(left);
    row.appendChild(symbol);
    row.appendChild(right);
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
  /* Keep a set the clock interrupted; its comparisons already happened. */
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
    " · " +
    (isWm() ? "Fraction + working memory" : "Fraction only") +
    " · " +
    counts.correct +
    " of " +
    counts.total +
    " comparisons correct" +
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
    condition: isWm() ? "fraction+wm" : "fraction-only",
    startedAt: session.startedAt.toISOString(),
    comparisons: session.counts.trial.total,
    comparisonsCorrect: session.counts.trial.correct,
    practiceComparisons: session.counts.practice.total,
    practiceComparisonsCorrect: session.counts.practice.correct,
    accuracy: accuracy,
    highestSpan: isWm() ? session.highestSpan : null,
    trials: session.trials,
  };
}

function saveSession(accuracy) {
  try {
    const key = "fractionTask.sessions";
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    saved.push(sessionRecord(accuracy));
    localStorage.setItem(key, JSON.stringify(saved));
  } catch (err) {
    /* storage unavailable; the CSV download still works */
  }
}

/* ---------- upload ---------- */

const PENDING_KEY = "fractionTask.pending";
const UPLOAD_TIMEOUT_MS = 10000;

function sessionPayload(record) {
  return {
    token: UPLOAD_TOKEN,
    task: "fraction",
    id: record.id,
    lesson: record.lesson,
    condition: record.condition,
    startedAt: record.startedAt,
    header: CSV_HEADER,
    rows: recordToRows(record),
    csv: toCsv([record]),
  };
}

/* text/plain keeps this a simple request, so the browser skips the CORS
 * preflight that Apps Script cannot answer. The timeout matters more than it
 * looks: on a flaky school network a bare fetch can hang for a minute with a
 * child sitting in front of it. */
function postPayload(payload) {
  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, UPLOAD_TIMEOUT_MS);

  return fetch(UPLOAD_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (result) {
      if (!result || result.ok !== true) {
        throw new Error((result && result.error) || "rejected");
      }
      return result;
    })
    .finally(function () {
      clearTimeout(timer);
    });
}

function readPending() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  } catch (err) {
    return [];
  }
}

function writePending(list) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch (err) {
    /* storage unavailable; the downloaded CSV is the fallback */
  }
}

/* Sessions recorded offline wait here and go up the next time this page is
 * opened with a working connection. */
function flushPending(onDone) {
  const list = readPending();
  if (!UPLOAD_URL || list.length === 0) {
    if (onDone) onDone(0, list.length);
    return;
  }

  let sent = 0;
  function step() {
    if (sent >= list.length) {
      writePending([]);
      if (onDone) onDone(sent, 0);
      return;
    }
    postPayload(list[sent]).then(
      function () {
        sent += 1;
        step();
      },
      function () {
        writePending(list.slice(sent));
        if (onDone) onDone(sent, list.length - sent);
      }
    );
  }
  step();
}

function showPendingNote() {
  const waiting = readPending().length;
  if (!waiting) {
    pendingNote.textContent = "";
    pendingNote.className = "upload-status";
    return;
  }
  pendingNote.textContent =
    waiting +
    (waiting === 1 ? " session is" : " sessions are") +
    " waiting to upload. Connect to the internet and reopen this page.";
  pendingNote.className = "upload-status is-warn";
}

function uploadSession(accuracy) {
  const record = sessionRecord(accuracy);

  if (!UPLOAD_URL) {
    uploadStatus.textContent =
      "Saved in this browser only. Download the CSV before closing.";
    uploadStatus.className = "upload-status is-warn";
    return;
  }

  uploadStatus.textContent = "Uploading…";
  uploadStatus.className = "upload-status";

  postPayload(sessionPayload(record)).then(
    function () {
      uploadStatus.textContent = "✓ Uploaded to the research spreadsheet.";
      uploadStatus.className = "upload-status is-ok";
      flushPending();
    },
    function (err) {
      /* Queue for a later attempt and hand over a file now, so the session
       * survives both a dead network and a wiped browser profile. */
      const list = readPending();
      list.push(sessionPayload(record));
      writePending(list);
      uploadStatus.textContent =
        "No connection (" +
        (err.name === "AbortError" ? "timed out" : err.message) +
        "). Saved on this device and downloaded as CSV — it will upload next " +
        "time this page is opened online.";
      uploadStatus.className = "upload-status is-warn";
      downloadThisSession();
    }
  );
}

/* One row per comparison, practice included, so every item and every sequence
 * is in the record. `sequence_correct` repeats across the rows of a set. */
const CSV_HEADER = [
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
];

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

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

    trial.items.forEach(function (item, i) {
      rows.push([
        record.id,
        record.lesson,
        record.condition,
        record.startedAt,
        trial.phase,
        setNumber[trial.phase],
        trial.span,
        trial.complete ? 1 : 0,
        i + 1,
        item.type,
        item.left,
        item.right,
        item.correctAnswer,
        item.response,
        item.correct ? 1 : 0,
        sequence,
        record.comparisons,
        record.comparisonsCorrect,
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
  return rows
    .map(function (row) {
      return row.map(csvCell).join(",");
    })
    .join("\n");
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function stamp() {
  return session.startedAt.toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

function downloadThisSession() {
  const accuracy = trialAccuracy();
  download(
    "fraction-" + session.id + "-lesson" + session.lesson + "-" + stamp() + ".csv",
    toCsv([sessionRecord(accuracy)])
  );
}

function downloadAllSessions() {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem("fractionTask.sessions") || "[]");
  } catch (err) {
    saved = [];
  }
  if (saved.length === 0) {
    downloadThisSession();
    return;
  }
  download("fraction-all-sessions-" + stamp() + ".csv", toCsv(saved));
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
showPendingNote();
flushPending(showPendingNote);
