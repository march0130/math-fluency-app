# Math Fluency + Working Memory Trainer

Browser-only web app.

## Pages

- **`index.html`** — home page at the site root: the two task entry points, nothing else.
- **`fraction.html`** / `fraction.js` — the Fraction Comparison task.
- **`multiplication.html`** / `multiplication.js` — the Multiplication task.
- **`task.css`** — shared task chrome; **`config.js`** — the upload endpoint.

Students enter a **study ID only**. No names are collected anywhere, so no name ever leaves
the device or reaches the spreadsheet. Keep the name-to-ID key offline.

## Fraction Comparison task

Enter name, ID, lesson (1–15) and condition, then Start.

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

Same structure as the fraction task: name, ID, lesson (1–15) and condition.

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

A `fraction` and a `multiplication` sheet are created on first use, each with a header row.
Leaving `UPLOAD_URL` empty keeps everything offline and local.

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
