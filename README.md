# Math Fluency + Working Memory Trainer

Browser-only web app.

## Pages

- **`index.html`** — home page at the site root: the two training tasks and the test entry.
- **`fraction.html`** / `fraction.js` — the Fraction Comparison training task.
- **`multiplication.html`** / `multiplication.js` — the Multiplication training task.
- **`test.html`** — pre/post test chooser: number line or memory.
- **`memory-test.html`** / `memory-test.js` — memory test: multiplication, then fractions.
- **`numberline.html`** / `numberline.js` — number line test.
- **`test-bank.js`** — the fixed test items; **`test-items.html`** renders them for review.
- **`common.js`** — shared helpers (recall pool, CSV, upload queue); **`task.css`** — shared
  task styles; **`config.js`** — the upload endpoint.

Students enter a **study ID only**. No names are collected anywhere, so no name ever leaves
the device or reaches the spreadsheet. Keep the name-to-ID key offline.

## Fraction Comparison task

Enter ID, lesson (1–15) and condition, then Start.

- **Items** are seeded from the lesson number, so every student in a lesson meets the same
  pairs in the same order in both conditions. Denominators are drawn from 2, 3, 4, 5, 6, 8,
  10 and 12. Lessons 1–4 use shared-denominator and shared-numerator pairs, the latter
  beginning with unit fractions; lessons 5–15 add a fraction greater than one half compared
  with one half.
- **Span** starts at 2, rises by one after two consecutive sequences recalled correctly and
  falls by one after two consecutive sequences recalled incorrectly, with a floor of 2.
- **Practice** — lessons 1–3 open with a 2-minute practice trial that marks each comparison
  right or wrong and shows the correct recall order. Practice is recorded but kept separate.
- **Trial** — 5 minutes. Nothing is marked right or wrong while a set runs. After the recall
  response is entered, that set's pairs are shown briefly as inequalities (`3/8 < 5/8`). No
  feedback is given on the recall sequence.
- **Fraction-only condition** — the same pairs in the same order, answered as they come, with
  no retain-or-recall step.

## Multiplication task

Same structure as the fraction task: ID, lesson (1–15) and condition.

- **Items** — lessons 1–5 use the facts from 1 to 5, lessons 6–15 the full 1–9 range. Problems
  are seeded from the lesson number, so every student in a lesson meets the same problems in
  the same order in both conditions. Each problem offers four answers to choose from: the correct product plus near misses (a factor off by one, the product off by one or two, and the sum).
- **Span** starts at 2, rises by one after three consecutive sequences recalled correctly and
  falls by one after three consecutive sequences recalled incorrectly, with a floor of 2.
- **Practice** — lessons 1–3 open with a 2-minute practice trial that marks each calculation
  right or wrong and shows the correct recall order.
- **Trial** — 5 minutes, no feedback. Recall is done by tapping the answers from a pool. After recall, every problem in that set is shown with its
  correct answer (`3 × 4 = 12`).
- **Multiplication-only condition** — the same problems in the same order, answered as they
  come, with no retain-or-recall step.

## How the span moves

In a scored trial the span rises and falls on the **recall sequence alone**. Recall is scored
against the answer the student gave, not the correct one: a student who computes 3 × 4 as 13
but recalls 13 in the right position has produced a correct sequence and still advances.
Calculation accuracy is recorded separately and never affects the span. In practice, where the
student is corrected on the spot, recall is scored against the correct answer.

| | Step up after | Step down after | Start | Floor |
|---|---|---|---|---|
| Multiplication | 3 correct recalls in a row | 3 incorrect in a row | 2 | 2 |
| Fraction comparison | 2 correct recalls in a row | 2 incorrect in a row | 2 | 2 |

A correct recall resets the run of errors and an error resets the run of correct recalls; both
runs reset whenever the span changes.

**Highest span passed** is the highest span the student stepped up *out of*. Reaching a span
does not count, nor does getting a sequence right there before falling back: a student who
passes 4, reaches 5, gets one span-5 sequence right and then drops back to 4 has a highest
span of 4. A student who never steps up out of span 2 has 0.

**Recall options.** The student taps their answers back from exactly **span + 1** options:
every distinct answer, plus the distractor closest in value to one of them. Multiplication
distractors are real times-table products (14 beside 12, never 13). Fraction distractors are
the other fraction from a pair the student saw, or a same-denominator / same-numerator
neighbour, never one equal in value to an answer. If answers repeat (12, 12, 15), extra
distractors keep the pool at span + 1.

## Pre / post tests

Reached from **Pre / Post Test** on the home page. Each test asks only for the student ID and
whether it is the pretest or the posttest. The items are fixed in `test-bank.js` and are the
same at pretest and posttest. Open `test-items.html` to review them.

### Memory test

Multiplication first, then fraction comparison. Each part starts with two practice sets at
span 2 that give the same feedback as training practice. Then comes an adaptive span test,
with no feedback and no correct-answer review, that looks for the **highest span the
student can pass**:

| | Up a span after | Stop after | Spans | Sets per span |
|---|---|---|---|---|
| Multiplication | 3 correct recalls in a row | 3 incorrect in a row | 2–6 | up to 8 |
| Fraction comparison | 2 correct recalls in a row | 2 incorrect in a row | 2–6 | up to 6 |

- Everyone starts at span 2.
- A correct recall resets the run of errors and an error resets the run of correct recalls;
  both reset when the span goes up.
- **Same level, same items.** Each span has its own ordered list of sets in `test-bank.js`.
  The m-th set a student meets at span k is always set k–m, so students at the same level
  see the same items. Different students reach different levels, so they do not all see
  every item.
- **Highest span passed** is the highest span the student moved up out of, as in training.
  A student who never moves up from span 2 scores 0.
- A part ends in one of three ways, recorded as `stop_reason`:
  - `discontinued` — the stop rule fired;
  - `out-of-sets` — every set at a span was used without passing or stopping. The span
    counts as not passed, the same outcome as stopping. With 8 sets per span this ends about
    a quarter of the parts of a student whose recall at that span is a coin flip; with 6 sets
    and a rule of 2 it is under 3%;
  - `ceiling` — the student passed span 6.

**Balance.** Within a span every set has the same difficulty mix, so a student who needs
more attempts at a span is not given harder or easier sets:

| Span | Multiplication (easy ≤ 20, medium 21–40, hard > 40) | Fractions |
|---|---|---|
| 2 | easy + medium | easy + medium, never against ½ |
| 3 | easy + medium + hard | easy + medium + hard |
| 4 | 1 hard + 3 easy/medium | 1 hard + 3 easy/medium |
| 5 | 2 easy + 2 medium + 1 hard | 2 easy + 2 medium + 1 hard |
| 6 | 2 easy + 2 medium + 2 hard | 2 easy + 2 medium + 2 hard |

No set opens on a hard item and no item appears twice within a span. Multiplication answers
in a set are at least 2 apart; the opening set is 2 × 2 and 3 × 7. Fractions: no set is more
than half comparisons with ½, no fraction appears twice in a set, and the larger fraction is
on the left in exactly half the pairs of every span; the opening set is ½ vs ⅓ and ⅞ vs 6/8.
A student who passes every span without a miss meets only 2 repeated multiplication facts
(the fewest the 2–9 table allows) and no repeated fraction pair.

### Number line test

Ten proper fractions on a 0–1 line, then ten fractions on a 0–2 line (four proper, six
improper). Only the endpoints are labelled. Students tap or drag to place a mark and can move
it before pressing Next; arrow keys nudge it. Each answer is scored as **percent absolute
error**, |estimate − value| ÷ line length × 100, and the summary reports the mean for each line
and overall. Response time is recorded too.

### Test data

Results go to two more sheets, created on first use: **`memory-test`** (one row per item, both
parts, with blank columns for the other part's fields) and **`number-line`** (one row per
item).

In `memory-test`, `set` counts the scored sets in order, `span` and `level_set` identify the
bank set (`span` 4, `level_set` 3 is set 4–3 in `test-items.html`), and each row also carries
the part's `stop_reason`, `stopped_at_span` and `highest_span_passed`. The score for a part
is `highest_span_passed`.

## Records

Both tasks record every item and every sequence, in practice as well as in the scored trial,
as **one row per item**: `phase` (practice/trial), `set`, `span`, `set_complete`, the item, the
correct answer, the student's response, `answer_correct`, and the set's `sequence_correct`.
Trial accuracy below 50% is flagged on the summary screen.

Each finished session is written to three places:

1. **The Google Sheet**, via the Apps Script endpoint (see below).
2. **An email** with the session CSV attached.
3. **Browser `localStorage`**, as a local copy. This is *not* reliable — it is tied to one
   browser and one origin, and is lost when site data is cleared. Never treat it as the record.

## Running without a connection

The task itself never touches the network. Items, timing, scoring and the span rule are all
local, and the Google font is loaded with `display=swap`, so offline it falls back to a system
font immediately instead of blocking.

Only the upload at the end of a session needs a connection, and it is written to survive not
having one:

- The request **times out after 10 seconds**, so a half-open school network cannot leave a
  child staring at a spinner.
- A failed session is **queued on the device and downloaded as a CSV** at the same time.
- The queue is **retried automatically** whenever either task page is opened with a working
  connection, and the setup screen says how many sessions are still waiting.

So a session can be run entirely offline and still reach the spreadsheet later. A re-sent
session produces duplicate rows, which are easy to drop on `session_start`; a lost session is
not recoverable, which is why it errs toward sending twice.

The page itself still has to load. On GitHub Pages that needs a connection at the start of the
session (the browser caches it afterwards). To be independent of the network entirely, copy
this folder to the testing laptop and serve it locally with `.tools/serve.ps1`.

## Collecting results (Google Sheet + email)

Free — the quotas (20,000 script calls and 100 emails a day) are far above what this study
needs, and no card is required.

**Build this under the `utexas.edu` account, not a personal Gmail.** The sheet holds study
data, so it belongs in the university's managed Google Workspace, where institutional
retention and access controls apply. Some Workspace tenants block deploying a web app with
*Anyone* access; if UT does, see the fallback at the end of this section.

1. Create a Google Sheet. Copy its ID from the URL:
   `docs.google.com/spreadsheets/d/`**`<THIS PART>`**`/edit`
2. Go to [script.google.com](https://script.google.com) → **New project**, and paste the
   contents of [`apps-script/Code.gs`](apps-script/Code.gs).
3. Set `SHEET_ID` to the ID from step 1. Check `EMAIL_TO`.
4. **Deploy → New deployment → Web app**, with:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**

   Authorise when prompted. Google warns that the app is unverified — it is your own script,
   so continue through **Advanced → Go to (project name)**.
5. Copy the deployment URL (it ends in `/exec`) into `UPLOAD_URL` in `config.js`.
6. Open the `/exec` URL in a browser. It should print `{"ok":true,...}`.

A sheet per task — `fraction`, `multiplication`, `memory-test`, `number-line` — is created on
first use, each with a header row. Leaving `UPLOAD_URL` empty keeps everything offline and
local.

**Updating the script.** Editing `Code.gs` does not change a live deployment. After pasting a
new version, go to **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
The `/exec` URL stays the same, so `config.js` does not change. Opening the URL should then
show `"version": 2`.

The test pages sign their uploads with `UPLOAD_TOKEN + "/tests"`. The first version of the
script filed any unrecognised task under `fraction`; because it only accepts the plain token,
it refuses test data instead of misfiling it, and the pages keep those sessions queued until
the script is updated.

The per-session email can get noisy over 15 lessons. Set `EMAIL_EVERY_SESSION = false` and add
a daily trigger on `sendDailyDigest` instead; the sheet is written either way.

**If UT blocks *Anyone* access** on the web app deployment, the page cannot post to it — the
browser is not signed in as a UT user. Two ways round it:

- Deploy the script from a personal Google account and share the sheet with `chi.ma@utexas.edu`.
  The script, not the sheet, is what needs public access.
- Or leave `UPLOAD_URL` empty and collect the CSVs the summary screen downloads.


## Run locally

```bash
cd math-fluency-app
python3 -m http.server 4177
```

On Windows without Python, use the bundled PowerShell server instead:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File .tools/serve.ps1 -Port 4177
```

Open **http://localhost:4177/** in your browser.

## Host on GitHub Pages

1. `git init` → `git add .` → `git commit -m "Add math fluency app"`
2. Create repo on GitHub, then: `git remote add origin <url>` → `git push -u origin main`
3. Settings → Pages → Deploy from branch `main`, folder `/root`
