/* Helpers shared by the training tasks and the pre/post tests.
 * Load after config.js and before the page's own script.
 */

/* ---------- randomness ---------- */

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Fisher-Yates in place. Pass a seeded rng where the order has to be
 * reproducible; leave it out to use Math.random. */
function shuffle(list, rng) {
  const random = rng || Math.random;
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

/* ---------- fractions ---------- */

const ALLOWED_DENOMINATORS = [2, 3, 4, 5, 6, 8, 10, 12];

function fracValue(f) {
  return f.n / f.d;
}

function fracKey(f) {
  return f.n + "/" + f.d;
}

function fracHtml(f) {
  return (
    '<span class="frac"><span class="n">' +
    f.n +
    '</span><span class="d">' +
    f.d +
    "</span></span>"
  );
}

/* ---------- recall pool ----------
 *
 * The student taps their answers back from a pool that always holds exactly
 * span + 1 options: every distinct answer to be recalled, plus the closest
 * plausible distractors. "Closest" is the smallest distance in value to any of
 * the answers, so the extra option cannot be ruled out at a glance. If the
 * answers repeat (12, 12, 15) there are fewer distinct answers than the span,
 * and the pool takes extra distractors to stay at span + 1.
 */

function buildRecallPool(targets, candidates, keyOf, valueOf, rng) {
  const size = targets.length + 1;
  const seen = {};
  const pool = [];

  targets.forEach(function (target) {
    const key = keyOf(target);
    if (!seen[key]) {
      seen[key] = true;
      pool.push(target);
    }
  });

  const answerValues = pool.map(valueOf);
  const ranked = candidates
    .map(function (candidate, order) {
      const value = valueOf(candidate);
      let distance = Infinity;
      answerValues.forEach(function (answer) {
        distance = Math.min(distance, Math.abs(answer - value));
      });
      return { candidate: candidate, order: order, distance: distance };
    })
    /* An equal value is not a distractor: 2/4 beside 1/2 would be unfair. */
    .filter(function (entry) {
      return entry.distance > 1e-9 && !seen[keyOf(entry.candidate)];
    })
    .sort(function (x, y) {
      return x.distance - y.distance || x.order - y.order;
    });

  for (let i = 0; i < ranked.length && pool.length < size; i += 1) {
    const key = keyOf(ranked[i].candidate);
    if (!seen[key]) {
      seen[key] = true;
      pool.push(ranked[i].candidate);
    }
  }

  return shuffle(pool, rng);
}

/* Every value in the 1-9 times table. Distractors come from here so they look
 * like real products: 14 beside 12, never 13. */
const TIMES_TABLE_VALUES = (function () {
  const values = {};
  for (let a = 1; a <= 9; a += 1) {
    for (let b = 1; b <= 9; b += 1) values[a * b] = true;
  }
  return Object.keys(values)
    .map(Number)
    .sort(function (x, y) {
      return x - y;
    });
})();

function numberRecallPool(targets, rng) {
  return buildRecallPool(
    targets,
    TIMES_TABLE_VALUES,
    function (value) {
      return String(value);
    },
    function (value) {
      return value;
    },
    rng
  );
}

/* Fraction distractors are the fractions a student could plausibly mix up with
 * an answer: the other member of each pair they saw (listed first, so it wins a
 * tie), then same-denominator and same-numerator neighbours of each answer. */
function fractionRecallPool(targets, pairs, rng) {
  const candidates = [];

  pairs.forEach(function (pair) {
    candidates.push(pair.left, pair.right);
  });

  targets.forEach(function (f) {
    [f.n - 1, f.n + 1].forEach(function (n) {
      if (n >= 1 && n < f.d) candidates.push({ n: n, d: f.d });
    });
    const index = ALLOWED_DENOMINATORS.indexOf(f.d);
    [index - 1, index + 1].forEach(function (i) {
      const d = ALLOWED_DENOMINATORS[i];
      if (d && f.n < d) candidates.push({ n: f.n, d: d });
    });
  });

  return buildRecallPool(targets, candidates, fracKey, fracValue, rng);
}

/* ---------- CSV and files ---------- */

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function rowsToCsv(rows) {
  return rows
    .map(function (row) {
      return row.map(csvCell).join(",");
    })
    .join("\n");
}

function downloadText(filename, text) {
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

function fileStamp(date) {
  return date.toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

/* ---------- upload ---------- */

const UPLOAD_TIMEOUT_MS = 10000;

/* The pre/post tests sign with their own token. The first version of Code.gs
 * filed any task it did not recognise under the "fraction" sheet, so a server
 * still running it must refuse test data rather than misfile it. It does,
 * because it only knows UPLOAD_TOKEN; the current Code.gs accepts both. Refused
 * sessions are queued and go up once the script is redeployed. */
const TEST_UPLOAD_TOKEN = UPLOAD_TOKEN + "/tests";

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

/* One uploader per page. A failed upload is queued on the device and handed
 * over as a file at the same time, then retried whenever the page is opened
 * online: a duplicate row is recoverable, a lost session is not. */
function createUploader(pendingKey, statusEl, pendingEl) {
  function read() {
    try {
      return JSON.parse(localStorage.getItem(pendingKey) || "[]");
    } catch (err) {
      return [];
    }
  }

  function write(list) {
    try {
      localStorage.setItem(pendingKey, JSON.stringify(list));
    } catch (err) {
      /* storage unavailable; the downloaded CSV is the fallback */
    }
  }

  function setStatus(text, tone) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = "upload-status" + (tone ? " is-" + tone : "");
  }

  function showPending() {
    if (!pendingEl) return;
    const waiting = read().length;
    pendingEl.textContent = waiting
      ? waiting +
        (waiting === 1 ? " session is" : " sessions are") +
        " waiting to upload. Connect to the internet and reopen this page."
      : "";
    pendingEl.className = "upload-status" + (waiting ? " is-warn" : "");
  }

  function flush(onDone) {
    const list = read();
    if (!UPLOAD_URL || list.length === 0) {
      if (onDone) onDone();
      return;
    }
    let sent = 0;
    (function step() {
      if (sent >= list.length) {
        write([]);
        if (onDone) onDone();
        return;
      }
      postPayload(list[sent]).then(
        function () {
          sent += 1;
          step();
        },
        function () {
          write(list.slice(sent));
          if (onDone) onDone();
        }
      );
    })();
  }

  function send(payload, onFailure) {
    if (!UPLOAD_URL) {
      setStatus("Saved in this browser only. Download the CSV before closing.", "warn");
      return Promise.resolve(false);
    }
    setStatus("Uploading…");
    return postPayload(payload).then(
      function () {
        setStatus("✓ Uploaded to the research spreadsheet.", "ok");
        flush(showPending);
        return true;
      },
      function (err) {
        const list = read();
        list.push(payload);
        write(list);
        setStatus(
          "No connection (" +
            (err.name === "AbortError" ? "timed out" : err.message) +
            "). Saved on this device and downloaded as CSV — it will upload " +
            "next time this page is opened online.",
          "warn"
        );
        if (onFailure) onFailure();
        return false;
      }
    );
  }

  return { send: send, flush: flush, showPending: showPending };
}
