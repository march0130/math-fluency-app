/* Number line pre/post test.
 *
 * Twenty fixed items from test-bank.js: ten proper fractions on a 0–1 line,
 * then ten proper and improper fractions on a 0–2 line. Only the endpoints are
 * labelled. No feedback. Each estimate is scored as percent absolute error,
 * |estimate − value| / line length × 100.
 */

/* ---------- elements ---------- */

const screens = {
  setup: document.getElementById("screen-setup"),
  bridge: document.getElementById("screen-bridge"),
  item: document.getElementById("screen-item"),
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

const itemLabel = document.getElementById("item-label");
const itemProgress = document.getElementById("item-progress");
const nlFraction = document.getElementById("nl-fraction");
const nl = document.getElementById("nl");
const nlTrack = document.getElementById("nl-track");
const nlMark = document.getElementById("nl-mark");
const nlMax = document.getElementById("nl-max");
const btnNext = document.getElementById("btn-next");

const summaryPae01 = document.getElementById("summary-pae-01");
const summaryPae02 = document.getElementById("summary-pae-02");
const summaryPaeAll = document.getElementById("summary-pae-all");
const summaryMeta = document.getElementById("summary-meta");
const btnCsv = document.getElementById("btn-csv");
const btnRestart = document.getElementById("btn-restart");

const uploader = createUploader(
  "numberLineTest.pending",
  document.getElementById("upload-status"),
  pendingNote
);

/* ---------- state ---------- */

function parseFraction(text) {
  const parts = text.split("/");
  return { n: Number(parts[0]), d: Number(parts[1]) };
}

const BLOCKS = TEST_BANK.numberLine.map(function (block) {
  return {
    key: block.key,
    max: block.max,
    items: block.items.map(parseFraction),
  };
});

const run = {
  id: "",
  testPoint: "pre",
  startedAt: null,
  blockIndex: 0,
  itemIndex: 0,
  estimate: null,
  shownAt: 0,
  responses: [],
};

function block() {
  return BLOCKS[run.blockIndex];
}

function testLabel() {
  return run.testPoint === "post" ? "posttest" : "pretest";
}

function showScreen(name) {
  Object.keys(screens).forEach(function (key) {
    screens[key].classList.toggle("is-visible", key === name);
  });
}

function showBridge(title, text, buttonLabel, action) {
  bridgeTitle.textContent = title;
  bridgeText.textContent = text;
  btnBridge.textContent = buttonLabel;
  btnBridge.onclick = action;
  showScreen("bridge");
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
  run.responses = [];
  startBlock(0);
}

function startBlock(index) {
  run.blockIndex = index;
  run.itemIndex = 0;
  const b = block();
  showBridge(
    index === 0 ? "Number line" : "A longer line",
    index === 0
      ? "You will see a fraction and a line that goes from 0 to 1. Tap the line to show where the fraction goes. You can tap again to move your mark. Then press Next."
      : "Now the line goes from 0 to " + b.max + ". Some fractions are bigger than 1. Tap where each one goes.",
    "Start",
    showItem
  );
}

function showItem() {
  const b = block();
  const f = b.items[run.itemIndex];

  itemLabel.textContent = "0 to " + b.max;
  itemProgress.textContent = run.itemIndex + 1 + " of " + b.items.length;
  nlFraction.innerHTML = fracHtml(f);
  nlMax.textContent = String(b.max);
  nl.setAttribute("aria-valuemax", String(b.max));
  nl.removeAttribute("aria-valuenow");

  run.estimate = null;
  nlMark.hidden = true;
  btnNext.disabled = true;
  run.shownAt = Date.now();

  showScreen("item");
  nl.focus({ preventScroll: true });
}

/* ---------- placing the mark ---------- */

function placeAt(proportion) {
  const p = Math.min(1, Math.max(0, proportion));
  run.estimate = p * block().max;
  nlMark.style.left = p * 100 + "%";
  nlMark.hidden = false;
  nl.setAttribute("aria-valuenow", run.estimate.toFixed(3));
  btnNext.disabled = false;
}

function proportionFromEvent(event) {
  const rect = nlTrack.getBoundingClientRect();
  return (event.clientX - rect.left) / rect.width;
}

let dragging = false;

nl.addEventListener("pointerdown", function (event) {
  dragging = true;
  nl.setPointerCapture(event.pointerId);
  placeAt(proportionFromEvent(event));
});

nl.addEventListener("pointermove", function (event) {
  if (dragging) placeAt(proportionFromEvent(event));
});

nl.addEventListener("pointerup", function () {
  dragging = false;
});

nl.addEventListener("pointercancel", function () {
  dragging = false;
});

/* Arrow keys nudge the mark by 1% of the line (0.2% with Shift). */
nl.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !btnNext.disabled) {
    nextItem();
    return;
  }
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const step = event.shiftKey ? 0.002 : 0.01;
  const current = run.estimate === null ? 0.5 : run.estimate / block().max;
  placeAt(current + (event.key === "ArrowRight" ? step : -step));
});

/* ---------- recording ---------- */

function nextItem() {
  if (run.estimate === null) return;
  const b = block();
  const f = b.items[run.itemIndex];
  const target = fracValue(f);
  const absError = Math.abs(run.estimate - target);

  run.responses.push({
    line: b.key,
    max: b.max,
    item: run.itemIndex + 1,
    fraction: fracKey(f),
    target: target,
    estimate: run.estimate,
    absError: absError,
    pae: (absError / b.max) * 100,
    responseMs: Date.now() - run.shownAt,
  });

  run.itemIndex += 1;
  if (run.itemIndex < b.items.length) {
    showItem();
    return;
  }
  if (run.blockIndex + 1 < BLOCKS.length) {
    startBlock(run.blockIndex + 1);
    return;
  }
  finish();
}

function meanPae(lineKey) {
  const list = run.responses.filter(function (r) {
    return !lineKey || r.line === lineKey;
  });
  if (!list.length) return null;
  return (
    list.reduce(function (sum, r) {
      return sum + r.pae;
    }, 0) / list.length
  );
}

function formatPae(value) {
  return value === null ? "—" : value.toFixed(1) + "%";
}

const CSV_HEADER = [
  "student_id",
  "test_point",
  "session_start",
  "line",
  "item",
  "fraction",
  "target",
  "estimate",
  "abs_error",
  "pae",
  "response_ms",
  "line_mean_pae",
  "overall_mean_pae",
];

function rows() {
  const overall = meanPae(null);
  return run.responses.map(function (r) {
    return [
      run.id,
      testLabel(),
      run.startedAt.toISOString(),
      r.line,
      r.item,
      r.fraction,
      r.target.toFixed(4),
      r.estimate.toFixed(4),
      r.absError.toFixed(4),
      r.pae.toFixed(2),
      r.responseMs,
      meanPae(r.line).toFixed(2),
      overall.toFixed(2),
    ];
  });
}

function csvText() {
  return rowsToCsv([CSV_HEADER].concat(rows()));
}

function csvName() {
  return "numberline-" + testLabel() + "-" + run.id + "-" + fileStamp(run.startedAt) + ".csv";
}

function finish() {
  summaryPae01.textContent = formatPae(meanPae("0-1"));
  summaryPae02.textContent = formatPae(meanPae("0-2"));
  summaryPaeAll.textContent = formatPae(meanPae(null));
  summaryMeta.textContent =
    "ID " + run.id + " · " + (run.testPoint === "post" ? "Posttest" : "Pretest");

  try {
    const key = "numberLineTest.sessions";
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    saved.push({ id: run.id, testPoint: run.testPoint, startedAt: run.startedAt.toISOString(), rows: rows() });
    localStorage.setItem(key, JSON.stringify(saved));
  } catch (err) {
    /* storage unavailable; the upload and the CSV still work */
  }

  showScreen("summary");

  uploader.send(
    {
      token: TEST_UPLOAD_TOKEN,
      task: "number-line",
      label: testLabel(),
      id: run.id,
      lesson: testLabel(),
      condition: "number-line",
      startedAt: run.startedAt.toISOString(),
      header: CSV_HEADER,
      rows: rows(),
      csv: csvText(),
    },
    function () {
      downloadText(csvName(), csvText());
    }
  );
}

/* ---------- wiring ---------- */

btnStart.addEventListener("click", beginTest);
inputId.addEventListener("keydown", function (event) {
  if (event.key === "Enter") beginTest();
});
btnNext.addEventListener("click", nextItem);
btnCsv.addEventListener("click", function () {
  downloadText(csvName(), csvText());
});
btnRestart.addEventListener("click", function () {
  window.location.reload();
});

uploader.showPending();
uploader.flush(uploader.showPending);
