/* Memory pre/post test.
 *
 * Runs the two span tasks back to back on the fixed bank in test-bank.js:
 * multiplication first, then fraction comparison. Each part opens with two
 * practice sets that give feedback, then an adaptive span test with no
 * feedback that looks for the highest span the student can pass:
 *
 *   - everyone starts at span 2 and does at most 6 sets at each span;
 *   - `passAt` correct recalls at a span (in any order, not necessarily in a
 *     row) pass it and move up one;
 *   - `failAt` incorrect recalls at a span end the part;
 *   - with 4 and 3 a span is always decided within its 6 sets;
 *   - the m-th set a student meets at a span is always the same bank set, so
 *     students at the same level see the same items;
 *   - passing the top span ends the part.
 *
 * As in training, a recall is scored against the answers the student gave, so
 * a wrong calculation recalled faithfully is a correct sequence.
 */

const PAUSE_MS = 900;
const HOLD_MS = 750;

/* ---------- elements ---------- */

const shell = document.getElementById("shell");
const screens = {
  setup: document.getElementById("screen-setup"),
  bridge: document.getElementById("screen-bridge"),
  task: document.getElementById("screen-task"),
  summary: document.getElementById("screen-summary"),
};

const inputId = document.getElementById("student-id");
const inputTestPoint = document.getElementById("test-point");
const setupError = document.getElementById("setup-error");
const btnStart = document.getElementById("btn-start");
const pendingNote = document.getElementById("pending-note");

const bridgeTitle = document.getElementById("bridge-title");
const bridgeText = document.getElementById("bridge-text");
const btnBridge = document.getElementById("btn-bridge");

const taskLabel = document.getElementById("task-label");
const taskSubtitle = document.getElementById("task-subtitle");
const spanReadout = document.getElementById("span-readout");

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

const phasePause = document.getElementById("phase-pause");

const summaryMultSpan = document.getElementById("summary-mult-span");
const summaryMultDetail = document.getElementById("summary-mult-detail");
const summaryFracSpan = document.getElementById("summary-frac-span");
const summaryFracDetail = document.getElementById("summary-frac-detail");
const summaryMeta = document.getElementById("summary-meta");
const btnCsv = document.getElementById("btn-csv");
const btnRestart = document.getElementById("btn-restart");

const uploaders = {
  multiplication: createUploader(
    "memoryTest.pending",
    document.getElementById("upload-status-mult"),
    pendingNote
  ),
  fraction: createUploader(
    "memoryTest.pending",
    document.getElementById("upload-status-frac"),
    pendingNote
  ),
};

/* ---------- the two tasks ---------- */

function parseFraction(text) {
  const parts = text.split("/");
  return { n: Number(parts[0]), d: Number(parts[1]) };
}

function toMultItem(raw) {
  return { a: raw[0], b: raw[1], product: raw[0] * raw[1], options: raw[2] };
}

function toFracItem(raw) {
  const left = parseFraction(raw[1]);
  const right = parseFraction(raw[2]);
  return {
    type: raw[0],
    left: left,
    right: right,
    larger: fracValue(left) > fracValue(right) ? left : right,
  };
}

function comparisonHtml(item) {
  const symbol =
    fracValue(item.left) > fracValue(item.right)
      ? ">"
      : fracValue(item.left) < fracValue(item.right)
      ? "<"
      : "=";
  return (
    fracHtml(item.left) +
    ' <span class="review-symbol">' +
    symbol +
    "</span> " +
    fracHtml(item.right)
  );
}

/* Everything that differs between the two parts lives in these two objects;
 * the engine below is shared. */
const TASKS = [
  {
    key: "multiplication",
    name: "Multiplication",
    part: "Part 1",
    tone: "tone-mult",
    passAt: TEST_BANK.multiplication.passAt,
    failAt: TEST_BANK.multiplication.failAt,
    practice: TEST_BANK.multiplication.practice.map(function (items) {
      return { span: items.length, items: items.map(toMultItem) };
    }),
    levels: TEST_BANK.multiplication.levels.map(function (level) {
      return {
        span: level.span,
        sets: level.sets.map(function (items) {
          return items.map(toMultItem);
        }),
      };
    }),
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
      return (
        item.a + " × " + item.b + ' = <span class="eq-answer">' + item.product + "</span>"
      );
    },
    pool: function (targets, items, rng) {
      return numberRecallPool(targets, rng);
    },
    rowFields: function (item) {
      return { a: item.a, b: item.b };
    },
  },
  {
    key: "fraction",
    name: "Fraction Comparison",
    part: "Part 2",
    tone: "",
    passAt: TEST_BANK.fraction.passAt,
    failAt: TEST_BANK.fraction.failAt,
    practice: TEST_BANK.fraction.practice.map(function (items) {
      return { span: items.length, items: items.map(toFracItem) };
    }),
    levels: TEST_BANK.fraction.levels.map(function (level) {
      return {
        span: level.span,
        sets: level.sets.map(function (items) {
          return items.map(toFracItem);
        }),
      };
    }),
    intro:
      "Tap the larger fraction in each pair. Keep each fraction you chose in your head. After the last pair, tap them back in the same order.",
    correctAnswer: function (item) {
      return item.larger;
    },
    keyOf: fracKey,
    html: fracHtml,
    render: function (item, onAnswer) {
      solvePrompt.textContent = "Which is larger?";
      solveChoices.innerHTML = "";
      [item.left, item.right].forEach(function (f, i) {
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
    pool: function (targets, items, rng) {
      return fractionRecallPool(targets, items, rng);
    },
    rowFields: function (item) {
      return {
        pairType: item.type,
        left: fracKey(item.left),
        right: fracKey(item.right),
      };
    },
  },
];

/* ---------- state ---------- */

const run = {
  id: "",
  testPoint: "pre",
  startedAt: null,
  taskIndex: 0,
  practice: false,
  practiceIndex: 0,
  levelIndex: 0, // which span the student is on, as an index into task().levels
  levelSet: 0, // which set of that span comes next
  setNumber: 0, // scored sets so far in this part
  levelCorrect: 0,
  levelWrong: 0,
  highestPassed: 0,
  set: null,
  recall: null,
  results: {},
};

function level() {
  return task().levels[run.levelIndex];
}

function task() {
  return TASKS[run.taskIndex];
}

function testLabel() {
  return run.testPoint === "post" ? "posttest" : "pretest";
}

/* ---------- screens ---------- */

function showScreen(name) {
  Object.keys(screens).forEach(function (key) {
    screens[key].classList.toggle("is-visible", key === name);
  });
}

function showPhase(name) {
  phaseSolve.classList.toggle("is-visible", name === "solve");
  phaseRecall.classList.toggle("is-visible", name === "recall");
  phasePause.classList.toggle("is-visible", name === "pause");
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

/* ---------- flow ---------- */

function beginTest() {
  const id = inputId.value.trim();
  if (!id) {
    setupError.textContent = "Please enter a student ID.";
    return;
  }
  setupError.textContent = "";

  run.id = id;
  run.testPoint = inputTestPoint.value;
  run.startedAt = new Date();
  run.results = {};
  startTask(0);
}

function startTask(index) {
  run.taskIndex = index;
  const t = task();
  setTone(t.tone);
  run.results[t.key] = { sets: [], stopReason: "", highestSpanPassed: 0 };

  showBridge(
    t.part + " · " + t.name,
    t.intro + " First, two practice rounds that tell you whether you are right.",
    "Start practice",
    startPractice
  );
}

function startPractice() {
  run.practice = true;
  run.practiceIndex = 0;
  taskLabel.textContent = task().part + " · Practice";
  taskSubtitle.textContent = "You are told whether each answer is right.";
  showScreen("task");
  runSet();
}

function startScored() {
  run.practice = false;
  run.levelIndex = 0;
  run.levelSet = 0;
  run.setNumber = 0;
  run.levelCorrect = 0;
  run.levelWrong = 0;
  run.highestPassed = 0;
  taskLabel.textContent = task().part + " · " + task().name;
  taskSubtitle.textContent = "Do your best. Answers are not marked right or wrong.";
  showScreen("task");
  runSet();
}

function runSet() {
  const def = run.practice
    ? task().practice[run.practiceIndex]
    : { span: level().span, items: level().sets[run.levelSet] };
  run.set = { span: def.span, items: def.items, responses: [], index: 0 };
  spanReadout.textContent = "Span " + def.span;
  renderItem();
}

function pauseThen(next) {
  showPhase("pause");
  setTimeout(next, PAUSE_MS);
}

function renderItem() {
  const s = run.set;
  const item = s.items[s.index];

  showPhase("solve");
  solveFeedback.textContent = "";
  solveFeedback.className = "feedback";
  solveGuidance.innerHTML = "";
  solveGuidance.hidden = true;
  btnSolveNext.hidden = true;
  solveProgress.textContent = "Item " + (s.index + 1) + " of " + s.items.length;

  task().render(item, answerItem);
}

function answerItem(response) {
  const t = task();
  const s = run.set;
  const item = s.items[s.index];
  if (s.responses.length > s.index) return;

  const correctKey = t.keyOf(t.correctAnswer(item));
  const responseKey = t.keyOf(response);
  const correct = responseKey === correctKey;
  s.responses.push({ item: item, response: response, correct: correct });

  solveChoices.querySelectorAll(".choice").forEach(function (button) {
    button.disabled = true;
    if (button.dataset.key === responseKey) {
      button.classList.add(
        run.practice ? (correct ? "is-correct" : "is-wrong") : "is-picked"
      );
    }
    if (run.practice && !correct && button.dataset.key === correctKey) {
      button.classList.add("is-answer");
    }
  });

  if (run.practice) {
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
  setTimeout(advanceItem, HOLD_MS);
}

function advanceItem() {
  run.set.index += 1;
  if (run.set.index < run.set.items.length) {
    renderItem();
  } else {
    renderRecall();
  }
}

/* ---------- recall ---------- */

/* Seeded by the bank set, so the same answers at the same level always give
 * the same pool in the same order. */
function recallSeed() {
  return (
    (run.taskIndex + 1) * 1000 +
    (run.practice ? 500 + run.practiceIndex : run.set.span * 20 + run.levelSet)
  );
}

function renderRecall() {
  const t = task();
  const s = run.set;
  /* Practice corrects each answer on the spot, so the student holds the
   * correct one; in the test they can only hold what they chose. */
  const targets = s.responses.map(function (entry) {
    return run.practice ? t.correctAnswer(entry.item) : entry.response;
  });

  run.recall = {
    targets: targets,
    entered: [],
    options: t.pool(targets, s.items, mulberry32(recallSeed())),
  };

  showPhase("recall");
  recallInstruction.innerHTML =
    "Tap the " +
    targets.length +
    " answers you chose, in the same <strong>order</strong>.";
  recallGuidance.innerHTML = "";
  recallGuidance.hidden = true;
  btnRecallNext.hidden = true;
  renderRecallSlots();
  renderRecallOptions();
}

function renderRecallSlots() {
  const t = task();
  const r = run.recall;
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
  btnRecallUndo.disabled = r.entered.length === 0 || r.done;
}

function renderRecallOptions() {
  const t = task();
  recallOptions.innerHTML = "";
  run.recall.options.forEach(function (value) {
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

function enterRecall(value) {
  const r = run.recall;
  if (r.done || r.entered.length >= r.targets.length) return;
  r.entered.push(value);
  renderRecallSlots();
  if (r.entered.length === r.targets.length) submitRecall();
}

function undoRecall() {
  const r = run.recall;
  if (!r || r.done || r.entered.length === 0) return;
  r.entered.pop();
  renderRecallSlots();
}

function submitRecall() {
  const t = task();
  const r = run.recall;
  r.done = true;
  btnRecallUndo.disabled = true;
  recallOptions.querySelectorAll(".recall-option").forEach(function (button) {
    button.disabled = true;
  });

  const correct = r.targets.every(function (target, i) {
    return t.keyOf(target) === t.keyOf(r.entered[i]);
  });
  recordSet(correct);

  if (run.practice) {
    recallGuidance.innerHTML = correct
      ? "That is the right order."
      : "The order was " + r.targets.map(t.html).join(", ") + ".";
    recallGuidance.hidden = false;
    btnRecallNext.hidden = false;
    btnRecallNext.onclick = nextPracticeSet;
    return;
  }

  advance(correct);
}

function nextPracticeSet() {
  run.practiceIndex += 1;
  if (run.practiceIndex < task().practice.length) {
    pauseThen(runSet);
    return;
  }
  showBridge(
    "Practice finished",
    "Now the real test. Answers will not be marked right or wrong — just do your best.",
    "Start",
    startScored
  );
}

/* The span rules. Right and wrong recalls are counted at the current span,
 * not in a row, and both counts start again at each new span. */
function advance(correct) {
  const t = task();
  if (correct) run.levelCorrect += 1;
  else run.levelWrong += 1;

  if (run.levelWrong >= t.failAt) {
    finishTask("discontinued");
    return;
  }

  if (run.levelCorrect >= t.passAt) {
    run.highestPassed = level().span;
    if (run.levelIndex + 1 >= t.levels.length) {
      finishTask("ceiling");
      return;
    }
    run.levelIndex += 1;
    run.levelSet = 0;
    run.levelCorrect = 0;
    run.levelWrong = 0;
    pauseThen(runSet);
    return;
  }

  run.levelSet += 1;
  if (run.levelSet >= level().sets.length) {
    /* Unreachable while passAt + failAt - 1 <= sets per span (4 + 3 - 1 = 6),
     * kept so a shorter bank fails safe: the span counts as not passed. */
    finishTask("out-of-sets");
    return;
  }
  pauseThen(runSet);
}

/* ---------- scoring and records ---------- */

function recordSet(sequenceCorrect) {
  const t = task();
  const s = run.set;
  if (!run.practice) run.setNumber += 1;
  run.results[t.key].sets.push({
    phase: run.practice ? "practice" : "test",
    number: run.practice ? run.practiceIndex + 1 : run.setNumber,
    span: s.span,
    /* which bank set this was at its span, 1-based; "" for practice */
    levelSet: run.practice ? "" : run.levelSet + 1,
    sequenceCorrect: sequenceCorrect,
    entries: s.responses.map(function (entry) {
      return {
        fields: t.rowFields(entry.item),
        correctAnswer: t.keyOf(t.correctAnswer(entry.item)),
        response: t.keyOf(entry.response),
        correct: entry.correct,
      };
    }),
  });
}

function accuracyOf(taskKey) {
  let total = 0;
  let correct = 0;
  run.results[taskKey].sets.forEach(function (s) {
    if (s.phase !== "test") return;
    s.entries.forEach(function (e) {
      total += 1;
      if (e.correct) correct += 1;
    });
  });
  return { total: total, correct: correct };
}

function finishTask(reason) {
  const t = task();
  const result = run.results[t.key];
  result.stopReason = reason;
  result.highestSpanPassed = run.highestPassed;
  result.stoppedAtSpan = level().span;

  uploaders[t.key].send(
    {
      token: TEST_UPLOAD_TOKEN,
      task: "memory-test",
      label: testLabel() + " · " + t.key,
      id: run.id,
      lesson: testLabel(),
      condition: t.key,
      startedAt: run.startedAt.toISOString(),
      header: CSV_HEADER,
      rows: rowsFor(t.key),
      csv: rowsToCsv([CSV_HEADER].concat(rowsFor(t.key))),
    },
    function () {
      downloadText(csvName(t.key), rowsToCsv([CSV_HEADER].concat(rowsFor(t.key))));
    }
  );

  if (run.taskIndex + 1 < TASKS.length) {
    showBridge(
      "Great work!",
      "That part is finished. Next: " + TASKS[run.taskIndex + 1].name + ".",
      "Continue",
      function () {
        startTask(run.taskIndex + 1);
      }
    );
    return;
  }
  showSummary();
}

function describe(taskKey) {
  const t = TASKS.filter(function (x) {
    return x.key === taskKey;
  })[0];
  const result = run.results[taskKey];
  const acc = accuracyOf(taskKey);
  const testSets = result.sets.filter(function (s) {
    return s.phase === "test";
  }).length;
  const endings = {
    discontinued:
      "stopped at span " + result.stoppedAtSpan + " after " + t.failAt + " recall errors at that span",
    "out-of-sets": "used every set at span " + result.stoppedAtSpan + " without passing it",
    ceiling: "passed the top span",
  };
  return (
    (acc.total ? Math.round((100 * acc.correct) / acc.total) : 0) +
    "% answers correct · " +
    testSets +
    " sets · " +
    endings[result.stopReason]
  );
}

function showSummary() {
  setTone("tone-mult");
  summaryMultSpan.textContent = String(run.results.multiplication.highestSpanPassed);
  summaryMultDetail.textContent = describe("multiplication");
  summaryFracSpan.textContent = String(run.results.fraction.highestSpanPassed);
  summaryFracDetail.textContent = describe("fraction");
  summaryMeta.textContent =
    "ID " + run.id + " · " + (run.testPoint === "post" ? "Posttest" : "Pretest");
  saveLocally();
  showScreen("summary");
}

/* ---------- CSV ---------- */

/* One row per item, practice included, both parts in one layout. Columns that
 * belong to the other part are left blank. */
const CSV_HEADER = [
  "student_id",
  "test_point",
  "task",
  "session_start",
  "phase",
  "set",
  "span",
  "level_set",
  "item",
  "a",
  "b",
  "pair_type",
  "left",
  "right",
  "correct_answer",
  "response",
  "answer_correct",
  "sequence_correct",
  "stop_reason",
  "stopped_at_span",
  "highest_span_passed",
  "test_items",
  "test_items_correct",
  "test_accuracy",
];

function rowsFor(taskKey) {
  const result = run.results[taskKey];
  if (!result) return [];
  const acc = accuracyOf(taskKey);
  const rows = [];
  result.sets.forEach(function (s) {
    s.entries.forEach(function (e, i) {
      const f = e.fields;
      rows.push([
        run.id,
        testLabel(),
        taskKey,
        run.startedAt.toISOString(),
        s.phase,
        s.number,
        s.span,
        s.levelSet,
        i + 1,
        f.a === undefined ? "" : f.a,
        f.b === undefined ? "" : f.b,
        f.pairType || "",
        f.left || "",
        f.right || "",
        e.correctAnswer,
        e.response,
        e.correct ? 1 : 0,
        s.sequenceCorrect ? 1 : 0,
        result.stopReason,
        result.stoppedAtSpan,
        result.highestSpanPassed,
        acc.total,
        acc.correct,
        acc.total ? (acc.correct / acc.total).toFixed(4) : "",
      ]);
    });
  });
  return rows;
}

function csvName(suffix) {
  return "memory-" + testLabel() + "-" + run.id + "-" + suffix + "-" + fileStamp(run.startedAt) + ".csv";
}

function allRows() {
  return rowsFor("multiplication").concat(rowsFor("fraction"));
}

function saveLocally() {
  try {
    const key = "memoryTest.sessions";
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    saved.push({ id: run.id, testPoint: run.testPoint, startedAt: run.startedAt.toISOString(), rows: allRows() });
    localStorage.setItem(key, JSON.stringify(saved));
  } catch (err) {
    /* storage unavailable; the upload and the CSV still work */
  }
}

/* ---------- wiring ---------- */

btnStart.addEventListener("click", beginTest);
inputId.addEventListener("keydown", function (event) {
  if (event.key === "Enter") beginTest();
});
btnRecallUndo.addEventListener("click", undoRecall);
btnCsv.addEventListener("click", function () {
  downloadText(csvName("all"), rowsToCsv([CSV_HEADER].concat(allRows())));
});
btnRestart.addEventListener("click", function () {
  window.location.reload();
});

uploaders.multiplication.showPending();
uploaders.multiplication.flush(uploaders.multiplication.showPending);
